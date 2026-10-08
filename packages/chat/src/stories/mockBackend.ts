import type { ChatSender } from '../hooks/useChat';
import type { ConversationSummary } from '../components/ConversationSidebar/groupConversations';
import type { Message } from '../types';

/** Pauses for `ms`, or until the signal aborts. */
const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

/** Splits text into word-sized chunks, like tokens, keeping the whitespace. */
const tokens = (text: string) => text.match(/\s*\S+\s*/g) ?? [text];

export interface MockOptions {
  /** Milliseconds between tokens. Defaults to 25. */
  delay?: number;
  /** Milliseconds before the first token. Defaults to 600. */
  firstTokenDelay?: number;
  /** Fails after this many tokens, to show an error mid-stream. */
  failAfter?: number;
  /** Answers all at once instead of streaming. */
  instant?: boolean;
  /** Always answers with this text. */
  reply?: string;
}

export const replies = {
  greeting:
    "Hi! I'm a **mock assistant** running entirely in your browser. Ask me for `code`, a *table*, or a *list*, and I'll show how each renders as it streams in.",
  code: `Here's a small TypeScript helper:

\`\`\`ts
export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
\`\`\`

It delays calling \`fn\` until \`ms\` milliseconds pass without another call.`,
  table: `Here is a comparison:

| Library | Size | Tree-shakeable |
| --- | --- | --- |
| Axon UI | Small | Yes |
| Library B | Large | Partly |
| Library C | Medium | No |

> Sizes are illustrative.`,
  list: `A few things to try:

1. **Ask for code** — it will be highlighted, with a copy button.
2. **Ask for a table** — it scrolls on small screens.
3. **Press Stop** while this streams.

- Task lists work too
- [x] Streaming
- [ ] Your idea here`,
  long: Array.from(
    { length: 6 },
    (_, i) =>
      `Paragraph ${i + 1}. Streaming text arrives a few words at a time, so the view follows it down until you scroll up to read. Scroll up now and a "Jump to latest" button appears.`,
  ).join('\n\n'),
} as const;

/** Chooses a canned reply from what the user asked. */
export function chooseReply(history: Message[]): string {
  const last = history.at(-1)?.content.toLowerCase() ?? '';
  if (/code|function|typescript|snippet/.test(last)) return replies.code;
  if (/table|compare|comparison/.test(last)) return replies.table;
  if (/list|steps|ideas/.test(last)) return replies.list;
  if (/long|essay|story/.test(last)) return replies.long;
  return replies.greeting;
}

/**
 * A pretend AI backend for stories: it streams a canned reply token by token on a timer, honors
 * the abort signal, and can fail part-way. It makes no network requests.
 */
export function createMockSender({
  delay = 25,
  firstTokenDelay = 600,
  failAfter,
  instant = false,
  reply,
}: MockOptions = {}): ChatSender {
  return (history, { signal }) => {
    const text = reply ?? chooseReply(history);
    if (instant) {
      return sleep(firstTokenDelay, signal).then(() => {
        if (failAfter !== undefined) throw new Error('The mock backend failed.');
        return text;
      });
    }
    return (async function* () {
      await sleep(firstTokenDelay, signal);
      let count = 0;
      for (const token of tokens(text)) {
        if (signal.aborted) return;
        if (failAfter !== undefined && count >= failAfter) {
          throw new Error('The connection to the mock backend was lost.');
        }
        yield token;
        count += 1;
        await sleep(delay, signal);
      }
    })();
  };
}

const hour = 60 * 60 * 1000;
const day = 24 * hour;

/** A short conversation with a mix of content, dated from now. */
export function sampleMessages(now = Date.now()): Message[] {
  return [
    {
      id: 's1',
      role: 'user',
      content: 'Can you show me a debounce helper?',
      createdAt: now - 2 * day,
      status: 'done',
    },
    {
      id: 's2',
      role: 'assistant',
      content: replies.code,
      createdAt: now - 2 * day + 60_000,
      status: 'done',
    },
    {
      id: 's3',
      role: 'user',
      content: 'Thanks! And a comparison table?',
      createdAt: now - 3 * hour,
      status: 'done',
    },
    {
      id: 's4',
      role: 'assistant',
      content: replies.table,
      createdAt: now - 3 * hour + 60_000,
      status: 'done',
    },
  ];
}

/** `count` alternating messages, for a thread long enough to need virtualization. */
export function longThread(count: number, now = Date.now()): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `long-${i}`,
    role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
    content:
      i % 2 === 0
        ? `Question number ${i / 2 + 1}: how does this behave with a very long conversation?`
        : `Answer number ${(i + 1) / 2}. With virtualization only the messages near the viewport are in the page, so ${count} messages cost about as much as a handful.`,
    createdAt: now - (count - i) * 60 * 60 * 1000,
    status: 'done' as const,
  }));
}

/** A spread of past conversations for the sidebar: pinned, today, yesterday, last week and older. */
export function sampleConversations(now = Date.now()): ConversationSummary[] {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const item = (
    id: string,
    title: string,
    ago: number,
    extra: Partial<ConversationSummary> = {},
  ) => ({
    id,
    title,
    updatedAt: now - ago,
    ...extra,
  });
  return [
    item('pin-1', 'Launch checklist', 20 * day, {
      pinned: true,
      preview: 'Before we ship, check…',
    }),
    item('c-1', 'Plan a trip to Lisbon', 1 * hour, {
      preview: 'Day one: Alfama and the miradouros',
    }),
    item('c-2', 'Debounce in TypeScript', 3 * hour, { preview: 'export function debounce<T…' }),
    item('c-3', 'Compare chart libraries', 26 * hour, { preview: 'A table of bundle sizes' }),
    item('c-4', 'Recipe ideas for the week', 4 * day),
    item('c-5', 'Explain tree-shaking', 6 * day),
    item('c-6', 'Cover letter draft', 12 * day),
    item('c-7', 'Regex for ISO dates', 45 * day),
    item('c-8', 'Untitled conversation with a rather long title that has to be cut off', 60 * day),
  ];
}
