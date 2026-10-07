import { describe, expect, it, vi } from 'vitest';
import type { Message } from '../types';
import {
  createAnthropicCompatibleSender,
  createFakeProviderFetch,
  createOpenAICompatibleSender,
  parseServerSentEvent,
  readServerSentEvents,
  toTurns,
  type ServerSentEvent,
} from './streamingAdapters';

const encoder = new TextEncoder();

/** A streaming response made of the given pieces, exactly as split. */
function streamOf(chunks: (string | Uint8Array)[], init: ResponseInit = { status: 200 }) {
  let index = 0;
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index++];
      if (chunk === undefined) return controller.close();
      controller.enqueue(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
    },
    cancel,
  });
  return { response: new Response(body, init), cancel };
}

const collect = async <T>(source: AsyncIterable<T>) => {
  const items: T[] = [];
  for await (const item of source) items.push(item);
  return items;
};

const msg = (role: Message['role'], content: string, extra: Partial<Message> = {}): Message => ({
  id: Math.random().toString(36),
  role,
  content,
  createdAt: 0,
  status: 'done',
  ...extra,
});

const signal = () => new AbortController().signal;

describe('parseServerSentEvent', () => {
  it('reads the event name and the data', () => {
    expect(parseServerSentEvent('event: ping\ndata: {"a":1}')).toEqual({
      event: 'ping',
      data: '{"a":1}',
    });
  });

  it('joins several data lines with newlines', () => {
    expect(parseServerSentEvent('data: one\ndata: two')).toEqual({
      event: undefined,
      data: 'one\ntwo',
    });
  });

  it('allows no space after the colon, and CRLF line endings', () => {
    expect(parseServerSentEvent('data:x\r\nevent:y')).toEqual({ event: 'y', data: 'x' });
  });

  it('keeps every space but the first in the data', () => {
    expect(parseServerSentEvent('data:   padded')?.data).toBe('  padded');
  });

  it('gives nothing for comments, keep-alives and blocks with no data', () => {
    expect(parseServerSentEvent(': keep-alive')).toBeNull();
    expect(parseServerSentEvent('event: ping')).toBeNull();
    expect(parseServerSentEvent('')).toBeNull();
  });
});

describe('readServerSentEvents', () => {
  const run = (chunks: (string | Uint8Array)[]) =>
    collect(readServerSentEvents(streamOf(chunks).response));

  it('yields each event', async () => {
    expect(await run(['data: a\n\ndata: b\n\n'])).toEqual<ServerSentEvent[]>([
      { event: undefined, data: 'a' },
      { event: undefined, data: 'b' },
    ]);
  });

  it('copes with events split anywhere across the network chunks', async () => {
    const text = 'event: x\ndata: {"n":1}\n\ndata: second\n\n';
    for (let cut = 1; cut < text.length; cut += 1) {
      const events = await run([text.slice(0, cut), text.slice(cut)]);
      expect(events.map((e) => e.data)).toEqual(['{"n":1}', 'second']);
    }
  });

  it('copes with CRLF between events', async () => {
    expect((await run(['data: a\r\n\r\ndata: b\r\n\r\n'])).map((e) => e.data)).toEqual(['a', 'b']);
  });

  it('copes with a character split between two chunks', async () => {
    const bytes = encoder.encode('data: café → 😀\n\n');
    for (let cut = 1; cut < bytes.length; cut += 1) {
      const events = await run([bytes.slice(0, cut), bytes.slice(cut)]);
      expect(events[0]?.data).toBe('café → 😀');
    }
  });

  it('yields a last event that has no blank line after it', async () => {
    expect((await run(['data: a\n\ndata: last'])).map((e) => e.data)).toEqual(['a', 'last']);
  });

  it('skips comments between events', async () => {
    expect((await run([': hi\n\ndata: a\n\n'])).map((e) => e.data)).toEqual(['a']);
  });

  it('stops the download when the reader stops early', async () => {
    const { response, cancel } = streamOf(['data: 1\n\n', 'data: 2\n\n', 'data: 3\n\n']);
    for await (const event of readServerSentEvents(response)) {
      expect(event.data).toBe('1');
      break;
    }
    expect(cancel).toHaveBeenCalled();
  });

  it('refuses a response with no body', async () => {
    await expect(collect(readServerSentEvents(new Response(null)))).rejects.toThrow(/no body/);
  });
});

describe('toTurns', () => {
  it('keeps user and assistant messages, in order, and their text', () => {
    expect(
      toTurns([
        msg('system', 'Be brief.'),
        msg('user', 'Hi'),
        msg('tool', 'result'),
        msg('assistant', 'ignored', { parts: [{ type: 'text', text: 'Hello' }] }),
      ]),
    ).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
    ]);
  });

  it('leaves out failed replies and empty messages', () => {
    expect(
      toTurns([
        msg('user', 'Q1'),
        msg('assistant', 'partial', { status: 'error' }),
        msg('assistant', '  ', { status: 'pending' }),
        msg('user', 'Q2'),
      ]),
    ).toEqual([
      { role: 'user', content: 'Q1' },
      { role: 'user', content: 'Q2' },
    ]);
  });
});

describe('createOpenAICompatibleSender', () => {
  const sse = (...payloads: unknown[]) =>
    payloads.map((p) => `data: ${typeof p === 'string' ? p : JSON.stringify(p)}\n\n`);
  const delta = (content: string | null) => ({ choices: [{ delta: { content } }] });

  it('sends the history to your server and yields the text as it streams', async () => {
    const fetchMock = vi.fn(
      async () =>
        streamOf(
          sse(
            { choices: [{ delta: { role: 'assistant' } }] },
            delta('Hel'),
            delta('lo'),
            delta(null),
            delta(''),
            '[DONE]',
            delta('never'),
          ),
        ).response,
    );
    const send = createOpenAICompatibleSender({
      url: '/api/chat',
      model: 'm1',
      system: 'Be brief.',
      temperature: 0.2,
      maxTokens: 50,
      headers: { 'X-Session': 'abc' },
      fetch: fetchMock as never,
    });
    const controller = new AbortController();
    const pieces = await collect(
      send([msg('user', 'Hi')], { signal: controller.signal }) as AsyncIterable<string>,
    );
    expect(pieces).toEqual(['Hel', 'lo']);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/chat');
    expect(init.method).toBe('POST');
    expect(init.signal).toBe(controller.signal);
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', 'X-Session': 'abc' });
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'm1',
      stream: true,
      messages: [
        { role: 'system', content: 'Be brief.' },
        { role: 'user', content: 'Hi' },
      ],
      temperature: 0.2,
      max_tokens: 50,
    });
  });

  it('sends no system message when there is no system prompt', async () => {
    const fetchMock = vi.fn(async () => streamOf(sse('[DONE]')).response);
    await collect(
      createOpenAICompatibleSender({ url: '/x', model: 'm', fetch: fetchMock as never })(
        [msg('user', 'Hi')],
        { signal: signal() },
      ) as AsyncIterable<string>,
    );
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
  });

  it("throws the provider's message when the request fails", async () => {
    const fetchMock = async () =>
      new Response(JSON.stringify({ error: { message: 'Invalid API key' } }), { status: 401 });
    const send = createOpenAICompatibleSender({ url: '/x', model: 'm', fetch: fetchMock as never });
    await expect(
      collect(send([msg('user', 'Hi')], { signal: signal() }) as AsyncIterable<string>),
    ).rejects.toThrow('The request failed (401): Invalid API key');
  });

  it('says what it can when the failure has no details', async () => {
    const fetchMock = async () => new Response('<html>Bad gateway</html>', { status: 502 });
    const send = createOpenAICompatibleSender({ url: '/x', model: 'm', fetch: fetchMock as never });
    await expect(
      collect(send([msg('user', 'Hi')], { signal: signal() }) as AsyncIterable<string>),
    ).rejects.toThrow('The request failed (502).');
  });

  it('throws an error that arrives in the stream', async () => {
    const fetchMock = async () =>
      streamOf(sse(delta('Hi'), { error: { message: 'Overloaded' } })).response;
    const send = createOpenAICompatibleSender({ url: '/x', model: 'm', fetch: fetchMock as never });
    const seen: string[] = [];
    await expect(
      (async () => {
        for await (const piece of send([msg('user', 'Hi')], {
          signal: signal(),
        }) as AsyncIterable<string>)
          seen.push(piece);
      })(),
    ).rejects.toThrow('Overloaded');
    expect(seen).toEqual(['Hi']);
  });
});

describe('createAnthropicCompatibleSender', () => {
  const event = (name: string, payload: unknown) =>
    `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
  const text = (value: string) =>
    event('content_block_delta', {
      type: 'content_block_delta',
      delta: { type: 'text_delta', text: value },
    });

  it('sends the system prompt separately, asks for a length, and yields only the text', async () => {
    const fetchMock = vi.fn(
      async () =>
        streamOf([
          event('message_start', { type: 'message_start' }),
          event('content_block_start', { type: 'content_block_start' }),
          text('Hel'),
          event('ping', { type: 'ping' }),
          event('content_block_delta', {
            type: 'content_block_delta',
            delta: { type: 'input_json_delta' },
          }),
          text('lo'),
          event('message_stop', { type: 'message_stop' }),
          text('never'),
        ]).response,
    );
    const send = createAnthropicCompatibleSender({
      url: '/api/claude',
      model: 'm1',
      system: 'Be brief.',
      fetch: fetchMock as never,
    });
    const pieces = await collect(
      send([msg('user', 'Hi')], { signal: signal() }) as AsyncIterable<string>,
    );
    expect(pieces).toEqual(['Hel', 'lo']);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    });
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'm1',
      stream: true,
      max_tokens: 1024,
      system: 'Be brief.',
      messages: [{ role: 'user', content: 'Hi' }],
    });
  });

  it('takes a version, a length and your own headers', async () => {
    const fetchMock = vi.fn(
      async () => streamOf([event('message_stop', { type: 'message_stop' })]).response,
    );
    await collect(
      createAnthropicCompatibleSender({
        url: '/x',
        model: 'm',
        version: '2024-01-01',
        maxTokens: 200,
        headers: { Authorization: 'Bearer session' },
        fetch: fetchMock as never,
      })([msg('user', 'Hi')], { signal: signal() }) as AsyncIterable<string>,
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({
      'anthropic-version': '2024-01-01',
      Authorization: 'Bearer session',
    });
    expect(JSON.parse(String(init.body)).max_tokens).toBe(200);
  });

  it('throws an error event', async () => {
    const fetchMock = async () =>
      streamOf([text('Hi'), event('error', { type: 'error', error: { message: 'Overloaded' } })])
        .response;
    const send = createAnthropicCompatibleSender({
      url: '/x',
      model: 'm',
      fetch: fetchMock as never,
    });
    await expect(
      collect(send([msg('user', 'Hi')], { signal: signal() }) as AsyncIterable<string>),
    ).rejects.toThrow('Overloaded');
  });

  it("throws the provider's message when the request fails", async () => {
    const fetchMock = async () =>
      new Response(JSON.stringify({ error: { message: 'max_tokens required' } }), { status: 400 });
    const send = createAnthropicCompatibleSender({
      url: '/x',
      model: 'm',
      fetch: fetchMock as never,
    });
    await expect(
      collect(send([msg('user', 'Hi')], { signal: signal() }) as AsyncIterable<string>),
    ).rejects.toThrow('The request failed (400): max_tokens required');
  });
});

describe('createFakeProviderFetch', () => {
  const history = [msg('user', 'What is tree-shaking?')];

  it.each(['openai', 'anthropic'] as const)(
    'streams a reply that the %s adapter reads back in full',
    async (format) => {
      const options = {
        url: '/x',
        model: 'm',
        fetch: createFakeProviderFetch(format, { delay: 0 }),
      };
      const send =
        format === 'openai'
          ? createOpenAICompatibleSender(options)
          : createAnthropicCompatibleSender(options);
      const pieces = await collect(send(history, { signal: signal() }) as AsyncIterable<string>);
      expect(pieces.length).toBeGreaterThan(5);
      expect(pieces.join('')).toContain('You asked: "What is tree-shaking?"');
    },
  );

  it('can fail like a provider does', async () => {
    const fetchMock = createFakeProviderFetch('openai', {
      failWith: { status: 429, message: 'Rate limited' },
    });
    const send = createOpenAICompatibleSender({ url: '/x', model: 'm', fetch: fetchMock });
    await expect(
      collect(send(history, { signal: signal() }) as AsyncIterable<string>),
    ).rejects.toThrow('The request failed (429): Rate limited');
  });

  it('stops when the request is aborted', async () => {
    const controller = new AbortController();
    const send = createOpenAICompatibleSender({
      url: '/x',
      model: 'm',
      fetch: createFakeProviderFetch('openai', { delay: 5 }),
    });
    const seen: string[] = [];
    await expect(
      (async () => {
        for await (const piece of send(history, {
          signal: controller.signal,
        }) as AsyncIterable<string>) {
          seen.push(piece);
          if (seen.length === 2) controller.abort();
        }
      })(),
    ).rejects.toThrow();
    expect(seen.length).toBeLessThan(10);
  });
});
