import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { Message, MessagePart } from '../types';

/** What a reply function receives besides the history. */
export interface SendContext {
  /** Aborted when the user presses stop. Pass it to `fetch` so the request is cancelled too. */
  signal: AbortSignal;
}

/**
 * Produces the assistant's reply for a conversation. Return a `Promise<string>` for a reply that
 * arrives at once, or an `AsyncIterable<string>` (an async generator, say) to stream it token by
 * token. `history` ends with the user message to answer.
 */
export type ChatSender = (
  history: Message[],
  context: SendContext,
) => Promise<string> | AsyncIterable<string>;

export interface UseChatOptions {
  /** Produces the assistant's reply. The library calls no provider: this is where you do. */
  onSend: ChatSender;
  initialMessages?: Message[];
  /** Called when an assistant reply finishes, with the finished message. Not called when stopped. */
  onFinish?: (message: Message) => void;
  /** Called when producing a reply fails. */
  onError?: (error: Error) => void;
  /** Makes message ids. Defaults to `crypto.randomUUID()`. */
  generateId?: () => string;
  /** The current time in ms. Defaults to `Date.now`. */
  now?: () => number;
}

export interface SendOptions {
  /** Rich parts to put on the user message (attachments, for instance). */
  parts?: MessagePart[];
  metadata?: Record<string, unknown>;
}

export interface UseChatReturn {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  /** The text in the composer. */
  input: string;
  setInput: (value: string) => void;
  /**
   * Sends a user message and starts the reply. Uses `input` when `content` is omitted, and clears
   * it. Does nothing while a reply is in progress, or when there is nothing to send.
   */
  send: (content?: string, options?: SendOptions) => Promise<void>;
  /** Stops the reply in progress. What has arrived is kept. */
  stop: () => void;
  /** Replies again from the last assistant message, or from the one with this id. */
  regenerate: (id?: string) => Promise<void>;
  /** Replaces a user message's text, drops everything after it and replies again. */
  editAndResend: (id: string, content: string) => Promise<void>;
  /** Removes a message. Deleting the reply in progress stops it first. */
  deleteMessage: (id: string) => void;
  /** Changes one message. */
  updateMessage: (id: string, patch: Partial<Omit<Message, 'id'>>) => void;
  /** True from sending until the reply has finished or been stopped. */
  isStreaming: boolean;
  /** The error of the last reply that failed, until the next send. */
  error: Error | null;
  clearError: () => void;
  /** Empties the conversation and the input. */
  reset: (messages?: Message[]) => void;
}

const isAsyncIterable = (value: unknown): value is AsyncIterable<string> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as AsyncIterable<string>)[Symbol.asyncIterator] === 'function';

const isAbortError = (error: unknown) =>
  error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError');

let counter = 0;
const defaultGenerateId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `msg-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** Waits for `promise`, or rejects with an `AbortError` as soon as `signal` aborts. */
function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

function abortError() {
  const error = new Error('The reply was stopped.');
  error.name = 'AbortError';
  return error;
}

/**
 * The state behind a chat: the messages, the composer text and the functions to send, stop,
 * regenerate, edit and delete. It calls `onSend` for each reply and handles both a finished
 * string and a stream of tokens, and `stop()` cancels either one immediately, even if your
 * function ignores the abort signal.
 */
export function useChat({
  onSend,
  initialMessages,
  onFinish,
  onError,
  generateId = defaultGenerateId,
  now = Date.now,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessagesState] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // The latest values, readable from inside the async loops without going stale.
  const messagesRef = useRef(messages);
  const optionsRef = useRef({ onSend, onFinish, onError, generateId, now });
  optionsRef.current = { onSend, onFinish, onError, generateId, now };
  const inputRef = useRef(input);
  inputRef.current = input;
  const controllerRef = useRef<AbortController | null>(null);
  const runRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const setMessages = useCallback<Dispatch<SetStateAction<Message[]>>>((update) => {
    const next = typeof update === 'function' ? update(messagesRef.current) : update;
    messagesRef.current = next;
    if (mountedRef.current) setMessagesState(next);
  }, []);

  const updateMessage = useCallback<UseChatReturn['updateMessage']>(
    (id, patch) =>
      setMessages((current) =>
        current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
      ),
    [setMessages],
  );

  const stop = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  /** Answers `history`, adding an assistant message that fills in as the reply arrives. */
  const reply = useCallback(
    async (history: Message[]) => {
      const { generateId: makeId, now: clock } = optionsRef.current;
      const run = ++runRef.current;
      const controller = new AbortController();
      controllerRef.current = controller;
      const { signal } = controller;
      const isCurrent = () => runRef.current === run;

      const assistantId = makeId();
      setMessages([
        ...history,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          createdAt: clock(),
          status: 'pending',
        },
      ]);
      if (mountedRef.current) {
        setIsStreaming(true);
        setError(null);
      }

      const patch = (changes: Partial<Message>) => {
        if (isCurrent()) updateMessage(assistantId, changes);
      };
      const currentContent = () =>
        messagesRef.current.find((message) => message.id === assistantId)?.content ?? '';

      try {
        const result = optionsRef.current.onSend(history, { signal });
        if (isAsyncIterable(result)) {
          const iterator = result[Symbol.asyncIterator]();
          try {
            for (;;) {
              const step = await raceAbort(iterator.next(), signal);
              if (step.done) break;
              if (!isCurrent()) return;
              if (step.value) {
                patch({ content: currentContent() + step.value, status: 'streaming' });
              }
            }
          } finally {
            // Tell the producer to stop, if it has not finished (it may be mid-request).
            void Promise.resolve(iterator.return?.()).catch(() => {});
          }
        } else {
          const text = await raceAbort(Promise.resolve(result), signal);
          if (!isCurrent()) return;
          patch({ content: text });
        }
        if (!isCurrent()) return;
        patch({ status: 'done' });
        const finished = messagesRef.current.find((message) => message.id === assistantId);
        if (finished) optionsRef.current.onFinish?.(finished);
      } catch (caught) {
        if (!isCurrent()) return;
        if (signal.aborted || isAbortError(caught)) {
          // Stopped by the user: keep what arrived, or drop an empty reply.
          if (currentContent() === '') {
            setMessages((current) => current.filter((message) => message.id !== assistantId));
          } else {
            patch({ status: 'done' });
          }
        } else {
          const failure = caught instanceof Error ? caught : new Error(String(caught));
          patch({ status: 'error' });
          if (mountedRef.current) setError(failure);
          optionsRef.current.onError?.(failure);
        }
      } finally {
        if (isCurrent()) {
          controllerRef.current = null;
          if (mountedRef.current) setIsStreaming(false);
        }
      }
    },
    [setMessages, updateMessage],
  );

  const send = useCallback<UseChatReturn['send']>(
    async (content, options) => {
      if (controllerRef.current) return;
      const text = (content ?? inputRef.current).trim();
      if (!text && !options?.parts?.length) return;

      const { generateId: makeId, now: clock } = optionsRef.current;
      const userMessage: Message = {
        id: makeId(),
        role: 'user',
        content: text,
        parts: options?.parts
          ? [...(text ? [{ type: 'text' as const, text }] : []), ...options.parts]
          : undefined,
        createdAt: clock(),
        status: 'done',
        metadata: options?.metadata,
      };
      if (content === undefined) setInput('');
      await reply([...messagesRef.current, userMessage]);
    },
    [reply],
  );

  const regenerate = useCallback<UseChatReturn['regenerate']>(
    async (id) => {
      const list = messagesRef.current;
      const index = id
        ? list.findIndex((message) => message.id === id)
        : list.map((message) => message.role).lastIndexOf('assistant');
      if (index < 0 || list[index]!.role !== 'assistant') return;
      controllerRef.current?.abort();
      await reply(list.slice(0, index));
    },
    [reply],
  );

  const editAndResend = useCallback<UseChatReturn['editAndResend']>(
    async (id, content) => {
      const list = messagesRef.current;
      const index = list.findIndex((message) => message.id === id);
      const original = list[index];
      if (!original || original.role !== 'user') return;
      const text = content.trim();
      if (!text) return;
      controllerRef.current?.abort();
      const others = original.parts?.filter((part) => part.type !== 'text') ?? [];
      const edited: Message = {
        ...original,
        content: text,
        parts: original.parts ? [{ type: 'text', text }, ...others] : undefined,
      };
      await reply([...list.slice(0, index), edited]);
    },
    [reply],
  );

  const deleteMessage = useCallback<UseChatReturn['deleteMessage']>(
    (id) => {
      const target = messagesRef.current.find((message) => message.id === id);
      if (!target) return;
      if (target.status === 'pending' || target.status === 'streaming') {
        controllerRef.current?.abort();
      }
      setMessages((current) => current.filter((message) => message.id !== id));
    },
    [setMessages],
  );

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback<UseChatReturn['reset']>(
    (next = []) => {
      controllerRef.current?.abort();
      runRef.current += 1;
      controllerRef.current = null;
      setMessages(next);
      setInput('');
      setError(null);
      setIsStreaming(false);
    },
    [setMessages],
  );

  return {
    messages,
    setMessages,
    input,
    setInput,
    send,
    stop,
    regenerate,
    editAndResend,
    deleteMessage,
    updateMessage,
    isStreaming,
    error,
    clearError,
    reset,
  };
}
