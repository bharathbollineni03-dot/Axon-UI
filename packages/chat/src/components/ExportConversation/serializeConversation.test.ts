import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '../../types';
import { formatFileSize } from '../Attachments/files';
import {
  downloadFile,
  exportConversation,
  slugify,
  type ExportSource,
} from './serializeConversation';

const STAMP = Date.UTC(2025, 5, 15, 14, 0);
const NOW = Date.UTC(2025, 5, 16, 9, 30);

let counter = 0;
const msg = (overrides: Partial<Message> = {}): Message => ({
  id: `m${++counter}`,
  role: 'assistant',
  content: 'Hello',
  createdAt: STAMP,
  status: 'done',
  ...overrides,
});

const source = (messages: Message[], title = 'Trip planning'): ExportSource => ({
  id: 'c1',
  title,
  messages,
});

const run = (
  messages: Message[],
  format: 'markdown' | 'json' | 'text' = 'markdown',
  options = {},
) => exportConversation(source(messages), format, { now: () => NOW, ...options });

describe('slugify', () => {
  it('makes a file-safe name', () => {
    expect(slugify('Hello, World! Café')).toBe('hello-world-cafe');
    expect(slugify('  --Trip / to: Lisbon?  ')).toBe('trip-to-lisbon');
  });

  it('is empty when nothing usable is left', () => {
    expect(slugify('???')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('stops at a length and never ends with a dash', () => {
    const slug = slugify('word '.repeat(40), 20);
    expect(slug.length).toBeLessThanOrEqual(20);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('exportConversation: files', () => {
  it('names the file after the title, with the right extension and type', () => {
    expect(run([msg()], 'markdown')).toMatchObject({
      filename: 'trip-planning.md',
      mimeType: 'text/markdown',
      format: 'markdown',
    });
    expect(run([msg()], 'json')).toMatchObject({
      filename: 'trip-planning.json',
      mimeType: 'application/json',
    });
    expect(run([msg()], 'text')).toMatchObject({
      filename: 'trip-planning.txt',
      mimeType: 'text/plain',
    });
  });

  it('falls back to "conversation" with no title, and lets options override the title', () => {
    expect(exportConversation({ messages: [msg()] }, 'markdown').filename).toBe('conversation.md');
    expect(run([msg()], 'markdown', { title: 'Other name' }).filename).toBe('other-name.md');
  });
});

describe('exportConversation: Markdown', () => {
  it('has the title, then each message under its role', () => {
    const { content } = run([
      msg({ role: 'user', content: 'Plan a trip' }),
      msg({ content: 'Sure, **where to?**' }),
    ]);
    expect(content.startsWith('# Trip planning\n\n')).toBe(true);
    expect(content).toContain('## You');
    expect(content).toContain('Plan a trip');
    expect(content).toContain('## Assistant');
    expect(content).toContain('Sure, **where to?**');
    expect(content.indexOf('## You')).toBeLessThan(content.indexOf('## Assistant'));
    expect(content.endsWith('\n')).toBe(true);
  });

  it('shows when each message was sent, the same in every time zone', () => {
    expect(run([msg()]).content).toContain('_2025-06-15 14:00 UTC_');
    expect(run([msg()], 'markdown', { includeTimestamps: false }).content).not.toContain('UTC');
  });

  it('can rename the roles', () => {
    const { content } = run([msg({ role: 'user' })], 'markdown', {
      roleLabels: { user: 'Ada' },
    });
    expect(content).toContain('## Ada');
  });

  it('leaves out system messages unless asked, and always leaves out empty ones', () => {
    const messages = [
      msg({ role: 'system', content: 'Be brief.' }),
      msg({ content: '', status: 'pending' }),
      msg({ content: 'Answer' }),
    ];
    const plain = run(messages).content;
    expect(plain).not.toContain('Be brief.');
    expect(plain.match(/## /g)).toHaveLength(1);
    expect(run(messages, 'markdown', { includeSystem: true }).content).toContain('## System');
  });

  it('writes code parts as fenced blocks with their language and file name', () => {
    const { content } = run([
      msg({
        parts: [
          { type: 'text', text: 'Here you go:' },
          { type: 'code', code: 'const a = 1;\n', language: 'ts', filename: 'a.ts' },
        ],
      }),
    ]);
    expect(content).toContain('**a.ts**');
    expect(content).toContain('```ts\nconst a = 1;\n```');
  });

  it('uses a longer fence when the code contains one', () => {
    const code = 'Use ```js blocks``` like so';
    const { content } = run([msg({ parts: [{ type: 'code', code, language: 'md' }] })]);
    expect(content).toContain('````md\n' + code + '\n````');
  });

  it('describes tool calls and results', () => {
    const { content } = run([
      msg({
        parts: [
          { type: 'tool-call', id: 'c1', name: 'get_weather', arguments: { city: 'Paris' } },
          { type: 'tool-result', callId: 'c1', result: { temperature: 21 } },
          { type: 'tool-result', callId: 'c2', result: 'City not found', isError: true },
        ],
      }),
    ]);
    expect(content).toContain('**Tool call:** `get_weather`');
    expect(content).toContain('"city": "Paris"');
    expect(content).toContain('**Tool result:**');
    expect(content).toContain('"temperature": 21');
    expect(content).toContain('**Tool result (error):**');
    expect(content).toContain('City not found');
  });

  it('keeps the model reasoning out unless asked', () => {
    const parts = [
      { type: 'reasoning', text: 'First idea\nSecond idea' },
      { type: 'text', text: 'Answer' },
    ] as Message['parts'];
    expect(run([msg({ parts })]).content).not.toContain('First idea');
    const withReasoning = run([msg({ parts })], 'markdown', { includeReasoning: true }).content;
    expect(withReasoning).toContain('> **Reasoning**');
    expect(withReasoning).toContain('> First idea\n> Second idea');
  });

  it('lists the sources at the end of the message', () => {
    const { content } = run([
      msg({
        parts: [
          { type: 'text', text: 'Answer [1]' },
          { type: 'source', title: 'MDN', url: 'https://mdn.dev', snippet: 'The docs' },
          { type: 'source', title: 'A book' },
        ],
      }),
    ]);
    expect(content).toContain('**Sources**');
    expect(content).toContain('1. [MDN](https://mdn.dev): The docs');
    expect(content).toContain('2. A book');
    expect(content.indexOf('Answer [1]')).toBeLessThan(content.indexOf('**Sources**'));
  });

  it('mentions attachments and images', () => {
    const { content } = run([
      msg({
        role: 'user',
        parts: [
          { type: 'file', name: 'report.pdf', size: 1536, url: 'https://x.test/report.pdf' },
          { type: 'file', name: 'notes.txt' },
          { type: 'image', url: 'https://x.test/cat.png', alt: 'A cat' },
        ],
      }),
    ]);
    expect(content).toContain(
      `Attachment: [report.pdf](https://x.test/report.pdf) (${formatFileSize(1536)})`,
    );
    expect(content).toContain('Attachment: notes.txt');
    expect(content).toContain('![A cat](https://x.test/cat.png)');
  });

  it('has no title line without a title', () => {
    const { content } = exportConversation({ messages: [msg()] }, 'markdown');
    expect(content.startsWith('## ')).toBe(true);
  });
});

describe('exportConversation: plain text', () => {
  it('has an underlined title and each message under its role', () => {
    const { content } = run(
      [msg({ role: 'user', content: 'Hi' }), msg({ content: 'Hello!' })],
      'text',
      { includeTimestamps: false },
    );
    expect(content).toBe('Trip planning\n=============\n\nYou:\nHi\n\nAssistant:\nHello!\n');
  });

  it('includes the time, and marks what text cannot show', () => {
    const { content } = run(
      [
        msg({
          parts: [
            { type: 'text', text: 'Look' },
            { type: 'file', name: 'a.pdf' },
            { type: 'tool-call', id: 't', name: 'search' },
          ],
        }),
      ],
      'text',
    );
    expect(content).toContain('Assistant (2025-06-15 14:00 UTC):');
    expect(content).toContain('[Attachment: a.pdf]');
    expect(content).toContain('[Tool call: search]');
  });
});

describe('exportConversation: JSON', () => {
  it('keeps every message, part and field, so it can be read back', () => {
    const messages = [
      msg({ role: 'system', content: 'Be brief.' }),
      msg({
        role: 'user',
        content: 'Hi',
        metadata: { model: 'm1' },
        parts: [{ type: 'text', text: 'Hi' }],
      }),
      msg({ parts: [{ type: 'reasoning', text: 'Thinking' }], content: 'Hello' }),
    ];
    const parsed = JSON.parse(run(messages, 'json').content);
    expect(parsed).toMatchObject({ id: 'c1', title: 'Trip planning' });
    expect(parsed.exportedAt).toBe(new Date(NOW).toISOString());
    expect(parsed.messages).toEqual(JSON.parse(JSON.stringify(messages)));
  });

  it('still leaves out empty placeholders', () => {
    const parsed = JSON.parse(
      run([msg({ content: '', status: 'pending' }), msg()], 'json').content,
    );
    expect(parsed.messages).toHaveLength(1);
  });
});

describe('downloadFile', () => {
  const original = {
    create: URL.createObjectURL,
    revoke: URL.revokeObjectURL,
  };

  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
    vi.useRealTimers();
  });

  it('saves the file through a temporary link, then frees the URL', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:fake');
    const revoke = vi.fn();
    URL.createObjectURL = create;
    URL.revokeObjectURL = revoke;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const file = run([msg()]);
    expect(downloadFile(file)).toBe(true);

    expect(create).toHaveBeenCalledTimes(1);
    const blob = (create.mock.calls[0] as unknown as [Blob])[0];
    expect(blob.type).toContain('text/markdown');
    expect(click).toHaveBeenCalledTimes(1);
    const clicked = click.mock.contexts[0] as HTMLAnchorElement;
    expect(clicked.download).toBe('trip-planning.md');
    expect(clicked.getAttribute('href')).toBe('blob:fake');
    expect(document.querySelector('a[download]')).toBeNull();

    expect(revoke).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:fake');
  });

  it('returns false where files cannot be created', () => {
    // jsdom has no createObjectURL.
    URL.createObjectURL = undefined as never;
    expect(downloadFile(run([msg()]))).toBe(false);
  });
});
