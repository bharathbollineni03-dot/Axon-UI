import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Message } from '../types';
import { useChat, type ChatSender, type UseChatOptions } from './useChat';

/** A promise you settle by hand. */
function deferred<T = string>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** An async iterable you feed by hand, and that records whether it was told to stop. */
function controlledStream() {
  const waiting: ((result: IteratorResult<string>) => void)[] = [];
  const failures: ((error: unknown) => void)[] = [];
  const buffer: IteratorResult<string>[] = [];
  const state = { returned: false };

  const settle = (result: IteratorResult<string>) => {
    const next = waiting.shift();
    failures.shift();
    if (next) next(result);
    else buffer.push(result);
  };

  const iterable: AsyncIterable<string> = {
    [Symbol.asyncIterator]() {
      return {
        next() {
          const buffered = buffer.shift();
          if (buffered) return Promise.resolve(buffered);
          return new Promise<IteratorResult<string>>((resolve, reject) => {
            waiting.push(resolve);
            failures.push(reject);
          });
        },
        return() {
          state.returned = true;
          return Promise.resolve({ done: true, value: undefined });
        },
      };
    },
  };

  return {
    iterable,
    state,
    push: (chunk: string) => settle({ done: false, value: chunk }),
    end: () => settle({ done: true, value: undefined }),
    fail: (error: unknown) => {
      const reject = failures.shift();
      waiting.shift();
      reject?.(error);
    },
  };
}

const roles = (messages: Message[]) => messages.map((message) => message.role);
const contents = (messages: Message[]) => messages.map((message) => message.content);

function setup(onSend: ChatSender, options: Partial<UseChatOptions> = {}) {
  let counter = 0;
  return renderHook((props: Partial<UseChatOptions> = {}) =>
    useChat({
      onSend,
      generateId: () => `id-${++counter}`,
      now: () => 1000 + counter,
      ...options,
      ...props,
    }),
  );
}

describe('useChat', () => {
  describe('initial state', () => {
    it('starts empty and idle', () => {
      const { result } = setup(async () => 'x');
      expect(result.current.messages).toEqual([]);
      expect(result.current.input).toBe('');
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('starts from initialMessages', () => {
      const initial: Message[] = [
        { id: 'a', role: 'user', content: 'hi', createdAt: 1, status: 'done' },
      ];
      const { result } = setup(async () => 'x', { initialMessages: initial });
      expect(result.current.messages).toBe(initial);
    });
  });

  describe('send with a finished reply', () => {
    it('adds the user message, then the assistant reply', async () => {
      const { result } = setup(async () => 'Hello there');
      await act(async () => {
        await result.current.send('Hi');
      });
      expect(roles(result.current.messages)).toEqual(['user', 'assistant']);
      expect(contents(result.current.messages)).toEqual(['Hi', 'Hello there']);
      expect(result.current.messages.map((m) => m.status)).toEqual(['done', 'done']);
    });

    it('shows a pending assistant message while waiting, and is streaming', async () => {
      const reply = deferred();
      const { result } = setup(() => reply.promise);
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('Hi');
      });
      expect(result.current.isStreaming).toBe(true);
      expect(result.current.messages.at(-1)).toMatchObject({
        role: 'assistant',
        status: 'pending',
        content: '',
      });
      await act(async () => {
        reply.resolve('Done');
        await sending;
      });
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.messages.at(-1)).toMatchObject({ status: 'done', content: 'Done' });
    });

    it('passes the history, ending with the new user message, without the placeholder', async () => {
      const onSend = vi.fn<ChatSender>(async () => 'ok');
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.send('first');
      });
      await act(async () => {
        await result.current.send('second');
      });
      const history = onSend.mock.calls[1]![0] as Message[];
      expect(contents(history)).toEqual(['first', 'ok', 'second']);
      expect(history.at(-1)!.role).toBe('user');
    });

    it('gives the sender an abort signal', async () => {
      const onSend = vi.fn<ChatSender>(async () => 'ok');
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.send('Hi');
      });
      const context = onSend.mock.calls[0]![1] as { signal: AbortSignal };
      expect(context.signal).toBeInstanceOf(AbortSignal);
      expect(context.signal.aborted).toBe(false);
    });

    it('calls onFinish with the finished assistant message', async () => {
      const onFinish = vi.fn();
      const { result } = setup(async () => 'Done', { onFinish });
      await act(async () => {
        await result.current.send('Hi');
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish.mock.calls[0]![0]).toMatchObject({
        role: 'assistant',
        content: 'Done',
        status: 'done',
      });
    });

    it('stamps messages with the clock and generated ids', async () => {
      const { result } = setup(async () => 'ok');
      await act(async () => {
        await result.current.send('Hi');
      });
      const [user, assistant] = result.current.messages;
      expect(user!.id).toBe('id-1');
      expect(assistant!.id).toBe('id-2');
      expect(typeof user!.createdAt).toBe('number');
    });
  });

  describe('the input', () => {
    it('sends the composer text and clears it', async () => {
      const onSend = vi.fn<ChatSender>(async () => 'ok');
      const { result } = setup(onSend);
      act(() => result.current.setInput('  from the box  '));
      await act(async () => {
        await result.current.send();
      });
      expect(contents(result.current.messages)[0]).toBe('from the box');
      expect(result.current.input).toBe('');
    });

    it('leaves the composer text alone when content is passed in', async () => {
      const { result } = setup(async () => 'ok');
      act(() => result.current.setInput('draft'));
      await act(async () => {
        await result.current.send('explicit');
      });
      expect(result.current.input).toBe('draft');
    });

    it.each(['', '   ', '\n'])('ignores an empty message (%j)', async (text) => {
      const onSend = vi.fn<ChatSender>(async () => 'ok');
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.send(text);
      });
      expect(onSend).not.toHaveBeenCalled();
      expect(result.current.messages).toEqual([]);
    });

    it('can send parts with no text', async () => {
      const { result } = setup(async () => 'ok');
      await act(async () => {
        await result.current.send('', { parts: [{ type: 'file', name: 'a.pdf' }] });
      });
      expect(result.current.messages[0]!.parts).toEqual([{ type: 'file', name: 'a.pdf' }]);
    });

    it('puts text first, then the parts and metadata, on the user message', async () => {
      const { result } = setup(async () => 'ok');
      await act(async () => {
        await result.current.send('look', {
          parts: [{ type: 'image', url: 'blob:1' }],
          metadata: { files: [1] },
        });
      });
      expect(result.current.messages[0]).toMatchObject({
        content: 'look',
        parts: [
          { type: 'text', text: 'look' },
          { type: 'image', url: 'blob:1' },
        ],
        metadata: { files: [1] },
      });
    });

    it('ignores a send while a reply is in progress', async () => {
      const reply = deferred();
      const onSend = vi.fn(() => reply.promise);
      const { result } = setup(onSend);
      let first!: Promise<void>;
      act(() => {
        first = result.current.send('one');
      });
      await act(async () => {
        await result.current.send('two');
      });
      expect(onSend).toHaveBeenCalledTimes(1);
      expect(contents(result.current.messages)).toEqual(['one', '']);
      await act(async () => {
        reply.resolve('ok');
        await first;
      });
    });
  });

  describe('streaming', () => {
    it('fills the reply in as tokens arrive, then marks it done', async () => {
      const stream = controlledStream();
      const { result } = setup(() => stream.iterable);
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('Hi');
      });
      expect(result.current.messages.at(-1)!.status).toBe('pending');

      await act(async () => {
        stream.push('Hel');
      });
      expect(result.current.messages.at(-1)).toMatchObject({ content: 'Hel', status: 'streaming' });
      await act(async () => {
        stream.push('lo');
      });
      expect(result.current.messages.at(-1)!.content).toBe('Hello');
      expect(result.current.isStreaming).toBe(true);

      await act(async () => {
        stream.end();
        await sending;
      });
      expect(result.current.messages.at(-1)).toMatchObject({ content: 'Hello', status: 'done' });
      expect(result.current.isStreaming).toBe(false);
    });

    it('works with an async generator', async () => {
      async function* tokens() {
        yield 'a';
        yield 'b';
        yield 'c';
      }
      const { result } = setup(() => tokens());
      await act(async () => {
        await result.current.send('go');
      });
      expect(result.current.messages.at(-1)).toMatchObject({ content: 'abc', status: 'done' });
    });

    it('skips empty chunks', async () => {
      async function* tokens() {
        yield '';
        yield 'x';
      }
      const { result } = setup(() => tokens());
      await act(async () => {
        await result.current.send('go');
      });
      expect(result.current.messages.at(-1)!.content).toBe('x');
    });

    it('calls onFinish once, with the whole text', async () => {
      const onFinish = vi.fn();
      async function* tokens() {
        yield 'one ';
        yield 'two';
      }
      const { result } = setup(() => tokens(), { onFinish });
      await act(async () => {
        await result.current.send('go');
      });
      expect(onFinish).toHaveBeenCalledTimes(1);
      expect(onFinish.mock.calls[0]![0].content).toBe('one two');
    });
  });

  describe('stop', () => {
    it('aborts the signal, keeps what arrived and ends the reply', async () => {
      const stream = controlledStream();
      let signal!: AbortSignal;
      const { result } = setup((_history, context) => {
        signal = context.signal;
        return stream.iterable;
      });
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('Hi');
      });
      await act(async () => {
        stream.push('partial');
      });
      await act(async () => {
        result.current.stop();
        await sending;
      });
      expect(signal.aborted).toBe(true);
      expect(result.current.messages.at(-1)).toMatchObject({ content: 'partial', status: 'done' });
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('stops a stream whose producer ignores the signal, and tells it to stop', async () => {
      const stream = controlledStream();
      const { result } = setup(() => stream.iterable);
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('Hi');
      });
      await act(async () => {
        stream.push('a');
      });
      // The producer never yields again. Stop must not wait for it.
      await act(async () => {
        result.current.stop();
        await sending;
      });
      expect(result.current.isStreaming).toBe(false);
      expect(stream.state.returned).toBe(true);
    });

    it('stops a finished-reply request whose sender ignores the signal', async () => {
      const never = new Promise<string>(() => {});
      const { result } = setup(() => never);
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('Hi');
      });
      await act(async () => {
        result.current.stop();
        await sending;
      });
      expect(result.current.isStreaming).toBe(false);
    });

    it('drops the reply when nothing had arrived yet', async () => {
      const never = new Promise<string>(() => {});
      const { result } = setup(() => never);
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('Hi');
      });
      await act(async () => {
        result.current.stop();
        await sending;
      });
      expect(roles(result.current.messages)).toEqual(['user']);
    });

    it('does not call onFinish or onError', async () => {
      const onFinish = vi.fn();
      const onError = vi.fn();
      const stream = controlledStream();
      const { result } = setup(() => stream.iterable, { onFinish, onError });
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('Hi');
      });
      await act(async () => {
        stream.push('x');
        result.current.stop();
        await sending;
      });
      expect(onFinish).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it('treats an AbortError thrown by the sender as a stop, not a failure', async () => {
      const { result } = setup(async () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        throw error;
      });
      await act(async () => {
        await result.current.send('Hi');
      });
      expect(result.current.error).toBeNull();
    });

    it('is safe to call when nothing is running', () => {
      const { result } = setup(async () => 'ok');
      expect(() => act(() => result.current.stop())).not.toThrow();
    });

    it('lets the user send again after stopping', async () => {
      const stream = controlledStream();
      const onSend = vi
        .fn<ChatSender>()
        .mockReturnValueOnce(stream.iterable)
        .mockResolvedValueOnce('second answer');
      const { result } = setup(onSend);
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('one');
      });
      await act(async () => {
        stream.push('x');
        result.current.stop();
        await sending;
      });
      await act(async () => {
        await result.current.send('two');
      });
      expect(result.current.messages.at(-1)!.content).toBe('second answer');
    });
  });

  describe('errors', () => {
    it('marks the reply as failed and exposes the error', async () => {
      const onError = vi.fn();
      const { result } = setup(
        async () => {
          throw new Error('Rate limited');
        },
        { onError },
      );
      await act(async () => {
        await result.current.send('Hi');
      });
      expect(result.current.error?.message).toBe('Rate limited');
      expect(result.current.messages.at(-1)).toMatchObject({ role: 'assistant', status: 'error' });
      expect(result.current.isStreaming).toBe(false);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('keeps what streamed before a failure', async () => {
      async function* failing() {
        yield 'partial ';
        throw new Error('Connection lost');
      }
      const { result } = setup(() => failing());
      await act(async () => {
        await result.current.send('Hi');
      });
      expect(result.current.messages.at(-1)).toMatchObject({
        content: 'partial ',
        status: 'error',
      });
      expect(result.current.error?.message).toBe('Connection lost');
    });

    it('wraps a thrown non-Error', async () => {
      const { result } = setup(async () => {
        throw 'plain string';
      });
      await act(async () => {
        await result.current.send('Hi');
      });
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('plain string');
    });

    it('handles a sender that throws synchronously', async () => {
      const { result } = setup(() => {
        throw new Error('Bad config');
      });
      await act(async () => {
        await result.current.send('Hi');
      });
      expect(result.current.error?.message).toBe('Bad config');
    });

    it('clears the error on the next send, or on demand', async () => {
      const onSend = vi
        .fn<ChatSender>()
        .mockRejectedValueOnce(new Error('first failed'))
        .mockResolvedValue('ok');
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.send('one');
      });
      expect(result.current.error).not.toBeNull();
      act(() => result.current.clearError());
      expect(result.current.error).toBeNull();
      await act(async () => {
        await result.current.send('two');
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('regenerate', () => {
    it('replaces the last assistant message with a new reply', async () => {
      const onSend = vi
        .fn<ChatSender>()
        .mockResolvedValueOnce('first answer')
        .mockResolvedValueOnce('better answer');
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.send('Question');
      });
      await act(async () => {
        await result.current.regenerate();
      });
      expect(contents(result.current.messages)).toEqual(['Question', 'better answer']);
      const history = onSend.mock.calls[1]![0] as Message[];
      expect(contents(history)).toEqual(['Question']);
    });

    it('can regenerate from an earlier reply, dropping what came after', async () => {
      const onSend = vi.fn<ChatSender>().mockResolvedValue('answer');
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.send('q1');
      });
      await act(async () => {
        await result.current.send('q2');
      });
      const firstAnswer = result.current.messages[1]!;
      await act(async () => {
        await result.current.regenerate(firstAnswer.id);
      });
      expect(contents(result.current.messages)).toEqual(['q1', 'answer']);
    });

    it('does nothing for a user message, an unknown id or an empty chat', async () => {
      const onSend = vi.fn<ChatSender>().mockResolvedValue('ok');
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.regenerate();
      });
      await act(async () => {
        await result.current.send('q');
      });
      await act(async () => {
        await result.current.regenerate(result.current.messages[0]!.id);
        await result.current.regenerate('nope');
      });
      expect(onSend).toHaveBeenCalledTimes(1);
    });

    it('interrupts a reply in progress, and the old stream cannot write into the new one', async () => {
      const old = controlledStream();
      const fresh = controlledStream();
      const onSend = vi
        .fn<ChatSender>()
        .mockResolvedValueOnce('settled answer')
        .mockReturnValueOnce(old.iterable)
        .mockReturnValueOnce(fresh.iterable);
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.send('q1');
      });
      // Start a streaming regenerate, then regenerate again while it streams.
      let first!: Promise<void>;
      act(() => {
        first = result.current.regenerate();
      });
      await act(async () => {
        old.push('OLD ');
      });
      let second!: Promise<void>;
      act(() => {
        second = result.current.regenerate();
      });
      await act(async () => {
        old.push('STALE');
        fresh.push('fresh');
      });
      expect(result.current.messages.at(-1)!.content).toBe('fresh');
      await act(async () => {
        fresh.end();
        await Promise.all([first, second]);
      });
      expect(result.current.messages.at(-1)).toMatchObject({ content: 'fresh', status: 'done' });
      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe('editAndResend', () => {
    it('edits a user message, drops everything after it and replies again', async () => {
      const onSend = vi
        .fn<ChatSender>()
        .mockResolvedValueOnce('a1')
        .mockResolvedValueOnce('a2')
        .mockResolvedValueOnce('a1 again');
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.send('q1');
      });
      await act(async () => {
        await result.current.send('q2');
      });
      const first = result.current.messages[0]!;
      await act(async () => {
        await result.current.editAndResend(first.id, 'q1 edited');
      });
      expect(contents(result.current.messages)).toEqual(['q1 edited', 'a1 again']);
      expect(contents(onSend.mock.calls[2]![0] as Message[])).toEqual(['q1 edited']);
    });

    it('keeps attachments, and updates the text part', async () => {
      const { result } = setup(async () => 'ok');
      await act(async () => {
        await result.current.send('old', { parts: [{ type: 'file', name: 'a.pdf' }] });
      });
      await act(async () => {
        await result.current.editAndResend(result.current.messages[0]!.id, 'new');
      });
      expect(result.current.messages[0]!.parts).toEqual([
        { type: 'text', text: 'new' },
        { type: 'file', name: 'a.pdf' },
      ]);
    });

    it('ignores an assistant message, an unknown id and empty text', async () => {
      const onSend = vi.fn<ChatSender>().mockResolvedValue('ok');
      const { result } = setup(onSend);
      await act(async () => {
        await result.current.send('q');
      });
      await act(async () => {
        await result.current.editAndResend(result.current.messages[1]!.id, 'x');
        await result.current.editAndResend('nope', 'x');
        await result.current.editAndResend(result.current.messages[0]!.id, '   ');
      });
      expect(onSend).toHaveBeenCalledTimes(1);
      expect(contents(result.current.messages)).toEqual(['q', 'ok']);
    });
  });

  describe('deleteMessage', () => {
    it('removes a message', async () => {
      const { result } = setup(async () => 'ok');
      await act(async () => {
        await result.current.send('q');
      });
      act(() => result.current.deleteMessage(result.current.messages[0]!.id));
      expect(roles(result.current.messages)).toEqual(['assistant']);
    });

    it('stops the reply in progress when it is the one deleted', async () => {
      const stream = controlledStream();
      const { result } = setup(() => stream.iterable);
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('q');
      });
      await act(async () => {
        stream.push('x');
      });
      await act(async () => {
        result.current.deleteMessage(result.current.messages.at(-1)!.id);
        await sending;
      });
      expect(roles(result.current.messages)).toEqual(['user']);
      expect(result.current.isStreaming).toBe(false);
    });

    it('ignores an unknown id', async () => {
      const { result } = setup(async () => 'ok');
      await act(async () => {
        await result.current.send('q');
      });
      act(() => result.current.deleteMessage('nope'));
      expect(result.current.messages).toHaveLength(2);
    });
  });

  describe('editing state directly', () => {
    it('updates one message', async () => {
      const { result } = setup(async () => 'ok');
      await act(async () => {
        await result.current.send('q');
      });
      act(() =>
        result.current.updateMessage(result.current.messages[1]!.id, {
          metadata: { feedback: 'up' },
        }),
      );
      expect(result.current.messages[1]!.metadata).toEqual({ feedback: 'up' });
      expect(result.current.messages[1]!.content).toBe('ok');
    });

    it('takes an updater function in setMessages', () => {
      const { result } = setup(async () => 'ok', {
        initialMessages: [{ id: 'a', role: 'system', content: 's', createdAt: 1, status: 'done' }],
      });
      act(() =>
        result.current.setMessages((current) => [
          ...current,
          { id: 'b', role: 'user', content: 'u', createdAt: 2, status: 'done' },
        ]),
      );
      expect(contents(result.current.messages)).toEqual(['s', 'u']);
    });

    it('resets the conversation, the input and any error', async () => {
      const { result } = setup(async () => {
        throw new Error('x');
      });
      act(() => result.current.setInput('draft'));
      await act(async () => {
        await result.current.send('q');
      });
      act(() => result.current.reset());
      expect(result.current.messages).toEqual([]);
      expect(result.current.input).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.isStreaming).toBe(false);
    });

    it('can reset to a given set of messages, stopping a reply in progress', async () => {
      const stream = controlledStream();
      const { result } = setup(() => stream.iterable);
      let sending!: Promise<void>;
      act(() => {
        sending = result.current.send('q');
      });
      const loaded: Message[] = [
        { id: 'x', role: 'user', content: 'loaded', createdAt: 1, status: 'done' },
      ];
      await act(async () => {
        result.current.reset(loaded);
        stream.push('late');
        stream.end();
        await sending;
      });
      expect(result.current.messages).toEqual(loaded);
      expect(result.current.isStreaming).toBe(false);
    });
  });

  describe('lifecycle', () => {
    it('uses the latest onSend without re-creating its functions', async () => {
      const first = vi.fn(async () => 'first');
      const second = vi.fn(async () => 'second');
      const { result, rerender } = setup(first);
      const send = result.current.send;
      rerender({ onSend: second });
      expect(result.current.send).toBe(send);
      await act(async () => {
        await result.current.send('q');
      });
      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('aborts the reply when the component unmounts', async () => {
      let signal!: AbortSignal;
      const stream = controlledStream();
      const { result, unmount } = setup((_history, context) => {
        signal = context.signal;
        return stream.iterable;
      });
      act(() => {
        void result.current.send('q');
      });
      await waitFor(() => expect(signal).toBeDefined());
      unmount();
      expect(signal.aborted).toBe(true);
    });

    it('does not warn about state updates after unmounting', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      const reply = deferred();
      const { result, unmount } = setup(() => reply.promise);
      act(() => {
        void result.current.send('q');
      });
      unmount();
      reply.resolve('late');
      await Promise.resolve();
      await Promise.resolve();
      expect(error).not.toHaveBeenCalled();
    });
  });
});
