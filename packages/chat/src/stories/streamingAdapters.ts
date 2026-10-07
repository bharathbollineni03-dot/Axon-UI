/**
 * Example adapters from `useChat`'s `onSend` to a streaming HTTP API. They are not part of the
 * package: they exist to show how little glue a provider needs, and to copy from.
 *
 * Neither holds a key or imports a provider SDK. Point `url` at YOUR server, which adds the API
 * key and forwards the request; a key placed in browser code can be read by anyone who opens the
 * page. (Both providers can be called straight from a browser, but only do that with a key the
 * user typed in themselves.)
 */
import type { ChatSender } from '../hooks/useChat';
import { getMessageText, type Message } from '../types';

// ---------------------------------------------------------------------------------------------
// Server-sent events

export interface ServerSentEvent {
  /** The `event:` line, when there is one. */
  event?: string;
  /** The `data:` lines, joined with newlines. */
  data: string;
}

/** One block of an event stream (the text between blank lines), or null for a comment or ping. */
export function parseServerSentEvent(block: string): ServerSentEvent | null {
  let event: string | undefined;
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  return data.length ? { event, data: data.join('\n') } : null;
}

/** Reads a streaming response as server-sent events, however the network splits the bytes. */
export async function* readServerSentEvents(response: Response): AsyncGenerator<ServerSentEvent> {
  if (!response.body) throw new Error('The response has no body to stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const boundary = /\r?\n\r?\n/;
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      for (let match = boundary.exec(buffer); match; match = boundary.exec(buffer)) {
        const parsed = parseServerSentEvent(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index + match[0].length);
        if (parsed) yield parsed;
      }
    }
    buffer += decoder.decode();
    const last = parseServerSentEvent(buffer);
    if (last) yield last;
  } finally {
    // Stops the download if the caller stopped early, such as when the user pressed stop.
    await reader.cancel().catch(() => {});
  }
}

/** A readable message for a failed request, using the error the server sent when it has one. */
async function describeFailure(response: Response): Promise<string> {
  let detail = '';
  try {
    const body = (await response.json()) as { error?: { message?: string } | string };
    detail = typeof body.error === 'string' ? body.error : (body.error?.message ?? '');
  } catch {
    // The body was not JSON; the status is all there is to say.
  }
  return `The request failed (${response.status})${detail ? `: ${detail}` : '.'}`;
}

// ---------------------------------------------------------------------------------------------
// Messages

type TurnRole = 'user' | 'assistant';

/** The turns to send: user and assistant messages with text, in order. Failed replies are left out. */
export function toTurns(history: Message[]): { role: TurnRole; content: string }[] {
  return history
    .filter(
      (message): message is Message & { role: TurnRole } =>
        (message.role === 'user' || message.role === 'assistant') && message.status !== 'error',
    )
    .map((message) => ({ role: message.role, content: getMessageText(message) }))
    .filter((turn) => turn.content.trim() !== '');
}

// ---------------------------------------------------------------------------------------------
// OpenAI-compatible (chat completions)

export interface StreamingAdapterOptions {
  /** Your server's endpoint. It should add the API key and forward the request. */
  url: string;
  model: string;
  /** Extra headers, such as your own session token. Do not put a provider API key here. */
  headers?: Record<string, string>;
  /** Instructions for the model. */
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** For tests, or a fetch with retries. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

/**
 * For any server that speaks the chat completions format: `POST` with `messages`, streaming back
 * `data: {"choices":[{"delta":{"content":"…"}}]}` events and a final `data: [DONE]`.
 */
export function createOpenAICompatibleSender(options: StreamingAdapterOptions): ChatSender {
  return async function* send(history, { signal }) {
    const messages = [
      ...(options.system ? [{ role: 'system', content: options.system }] : []),
      ...toTurns(history),
    ];
    const response = await (options.fetch ?? fetch)(options.url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: JSON.stringify({
        model: options.model,
        stream: true,
        messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
      }),
    });
    if (!response.ok) throw new Error(await describeFailure(response));

    for await (const { data } of readServerSentEvents(response)) {
      if (data === '[DONE]') return;
      const chunk = JSON.parse(data) as {
        choices?: { delta?: { content?: string | null } }[];
        error?: { message?: string };
      };
      if (chunk.error) throw new Error(chunk.error.message ?? 'The provider reported an error.');
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) yield text;
    }
  };
}

// ---------------------------------------------------------------------------------------------
// Anthropic-compatible (messages)

export interface AnthropicAdapterOptions extends StreamingAdapterOptions {
  /** The API version header. Defaults to `2023-06-01`. */
  version?: string;
}

/**
 * For servers that speak the Messages format: the system prompt is a separate field, `max_tokens`
 * is required, and the stream is `content_block_delta` events carrying `text_delta`s.
 */
export function createAnthropicCompatibleSender(options: AnthropicAdapterOptions): ChatSender {
  return async function* send(history, { signal }) {
    const response = await (options.fetch ?? fetch)(options.url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': options.version ?? '2023-06-01',
        ...options.headers,
      },
      body: JSON.stringify({
        model: options.model,
        stream: true,
        max_tokens: options.maxTokens ?? 1024,
        system: options.system,
        temperature: options.temperature,
        messages: toTurns(history),
      }),
    });
    if (!response.ok) throw new Error(await describeFailure(response));

    for await (const { event, data } of readServerSentEvents(response)) {
      const chunk = JSON.parse(data) as {
        type?: string;
        delta?: { type?: string; text?: string };
        error?: { message?: string };
      };
      if (event === 'error' || chunk.type === 'error') {
        throw new Error(chunk.error?.message ?? 'The provider reported an error.');
      }
      if (chunk.type === 'message_stop') return;
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        if (chunk.delta.text) yield chunk.delta.text;
      }
    }
  };
}

// ---------------------------------------------------------------------------------------------
// A pretend provider, so the stories run with no network

/** Splits `text` into pieces of a few characters, like the network might. */
function chunksOf(text: string, size: number) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += size)
    chunks.push(text.slice(index, index + size));
  return chunks;
}

/**
 * A `fetch` that answers like the real thing: `format` picks the OpenAI or Anthropic wire format.
 * The reply is a canned sentence that quotes the question, streamed in odd-sized pieces.
 */
export function createFakeProviderFetch(
  format: 'openai' | 'anthropic',
  { delay = 20, failWith }: { delay?: number; failWith?: { status: number; message: string } } = {},
): typeof fetch {
  const encoder = new TextEncoder();
  return async (_url, init) => {
    if (failWith) {
      return new Response(JSON.stringify({ error: { message: failWith.message } }), {
        status: failWith.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const body = JSON.parse(String(init?.body)) as {
      messages: { role: string; content: string }[];
    };
    const question = body.messages.filter((turn) => turn.role === 'user').at(-1)?.content ?? '';
    const reply = `You asked: "${question}". This answer was streamed over the ${
      format === 'openai' ? 'OpenAI' : 'Anthropic'
    } wire format, parsed from server-sent events, and handed to the chat one piece at a time.`;

    const events =
      format === 'openai'
        ? [
            ...chunksOf(reply, 7).map(
              (text) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`,
            ),
            'data: [DONE]\n\n',
          ]
        : [
            `event: message_start\ndata: ${JSON.stringify({ type: 'message_start' })}\n\n`,
            ...chunksOf(reply, 7).map(
              (text) =>
                `event: content_block_delta\ndata: ${JSON.stringify({
                  type: 'content_block_delta',
                  delta: { type: 'text_delta', text },
                })}\n\n`,
            ),
            `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
          ];

    const signal = init?.signal;
    let index = 0;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (signal?.aborted) return controller.error(new DOMException('Aborted', 'AbortError'));
        const next = events[index++];
        if (next === undefined) return controller.close();
        // Joining two events in one read, now and then, shows that boundaries can fall anywhere.
        controller.enqueue(encoder.encode(index % 5 === 0 ? next + (events[index++] ?? '') : next));
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
  };
}
