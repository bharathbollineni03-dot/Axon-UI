import { createRef, useState } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat, type ChatSender } from '../../hooks/useChat';
import type { Message } from '../../types';
import { ChatWindow, type ChatWindowProps } from './ChatWindow';

/** A real `useChat` wired to a ChatWindow, so the tests cover the whole path. */
function Harness({
  onSend = async () => 'A reply',
  initialMessages,
  ...props
}: Partial<ChatWindowProps> & { onSend?: ChatSender; initialMessages?: Message[] }) {
  const chat = useChat({ onSend, initialMessages });
  return <ChatWindow chat={chat} title="Assistant" {...props} />;
}

const box = () => screen.getByRole('textbox', { name: 'Message' });
const send = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.type(box(), `${text}{Enter}`);
};

const history = (): Message[] => [
  { id: 'u1', role: 'user', content: 'What is 2+2?', createdAt: 1_700_000_000_000, status: 'done' },
  {
    id: 'a1',
    role: 'assistant',
    content: 'It is 4.',
    createdAt: 1_700_000_001_000,
    status: 'done',
  },
];

describe('ChatWindow', () => {
  describe('structure', () => {
    it('is a region named by its title, with a header, a conversation and a composer', () => {
      render(<Harness />);
      expect(screen.getByRole('region', { name: 'Assistant' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Assistant' })).toBeInTheDocument();
      expect(screen.getByRole('log', { name: 'Conversation' })).toBeInTheDocument();
      expect(box()).toBeInTheDocument();
    });

    it('falls back to "Chat" for its name without a title', () => {
      render(<Harness title={undefined} />);
      expect(screen.getByRole('region', { name: 'Chat' })).toBeInTheDocument();
    });

    it('applies the mode as a class, embedded by default', () => {
      const { rerender } = render(<Harness data-testid="w" />);
      expect(screen.getByTestId('w')).toHaveClass('axon-chat-window--embedded');
      rerender(<Harness data-testid="w" mode="page" />);
      expect(screen.getByTestId('w')).toHaveClass('axon-chat-window--page');
    });

    it('forwards the ref and merges className', () => {
      const ref = createRef<HTMLElement>();
      function Host() {
        const chat = useChat({ onSend: async () => 'x' });
        return <ChatWindow ref={ref} chat={chat} title="A" className="extra" />;
      }
      render(<Host />);
      expect(ref.current).toBe(screen.getByRole('region', { name: 'A' }));
      expect(ref.current).toHaveClass('axon-chat-window', 'extra');
    });

    it('shows a footer line under the composer', () => {
      render(<Harness footer="AI can make mistakes." />);
      expect(screen.getByText('AI can make mistakes.')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows a welcome with starter prompts, which send when chosen', async () => {
      const onSend = vi.fn<ChatSender>().mockResolvedValue('Sure.');
      const user = userEvent.setup();
      render(
        <Harness
          onSend={onSend}
          suggestedPrompts={[{ title: 'Write a haiku', prompt: 'Write a haiku about rain.' }]}
        />,
      );
      expect(
        screen.getByRole('heading', { name: 'How can I help you today?' }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Write a haiku' }));
      expect(await screen.findByText('Write a haiku about rain.')).toBeInTheDocument();
      expect(onSend).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole('heading', { name: 'How can I help you today?' }),
      ).not.toBeInTheDocument();
    });

    it('can be replaced or customised', () => {
      const { rerender } = render(<Harness emptyState={<p>Nothing yet</p>} />);
      expect(screen.getByText('Nothing yet')).toBeInTheDocument();
      rerender(<Harness emptyStateProps={{ title: 'Ask away' }} />);
      expect(screen.getByRole('heading', { name: 'Ask away' })).toBeInTheDocument();
    });

    it('is not shown once there are messages', () => {
      render(<Harness initialMessages={history()} />);
      expect(
        screen.queryByRole('heading', { name: 'How can I help you today?' }),
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole('article')).toHaveLength(2);
    });
  });

  describe('conversation', () => {
    it('sends what the user types and shows the reply', async () => {
      const user = userEvent.setup();
      render(<Harness onSend={async () => 'Four.'} />);
      await send(user, 'What is 2+2?');
      expect(await screen.findByText('Four.')).toBeInTheDocument();
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
      expect(box()).toHaveValue('');
    });

    it('gives the history to onSend', async () => {
      const onSend = vi.fn<ChatSender>().mockResolvedValue('ok');
      const user = userEvent.setup();
      render(<Harness onSend={onSend} initialMessages={history()} />);
      await send(user, 'And 3+3?');
      await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
      expect((onSend.mock.calls[0]![0] as Message[]).map((m) => m.content)).toEqual([
        'What is 2+2?',
        'It is 4.',
        'And 3+3?',
      ]);
    });

    it('streams a reply, with a stop button while it does', async () => {
      let push: (token: string) => void = () => {};
      let finish: () => void = () => {};
      const queue: string[] = [];
      let wake: (() => void) | null = null;
      let ended = false;
      push = (token) => {
        queue.push(token);
        wake?.();
      };
      finish = () => {
        ended = true;
        wake?.();
      };
      async function* stream() {
        for (;;) {
          if (queue.length > 0) yield queue.shift()!;
          else if (ended) return;
          else await new Promise<void>((resolve) => (wake = resolve));
        }
      }
      const user = userEvent.setup();
      render(<Harness onSend={() => stream()} />);
      await send(user, 'Tell me a story');
      expect(await screen.findByRole('button', { name: 'Stop generating' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
      await act(async () => {
        push('Once ');
        push('upon a time');
      });
      expect(await screen.findByText('Once upon a time')).toBeInTheDocument();
      await act(async () => {
        finish();
      });
      expect(await screen.findByRole('button', { name: 'Send message' })).toBeInTheDocument();
    });

    it('stops the reply when stop is pressed, keeping what arrived', async () => {
      let signal!: AbortSignal;
      async function* stream(_h: Message[], context: { signal: AbortSignal }) {
        signal = context.signal;
        yield 'Partial text';
        await new Promise(() => {});
      }
      const user = userEvent.setup();
      render(<Harness onSend={stream} />);
      await send(user, 'Go');
      expect(await screen.findByText('Partial text')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Stop generating' }));
      await waitFor(() => expect(signal.aborted).toBe(true));
      expect(await screen.findByRole('button', { name: 'Send message' })).toBeInTheDocument();
      expect(screen.getByText('Partial text')).toBeInTheDocument();
    });

    it('does not send an empty message', async () => {
      const onSend = vi.fn<ChatSender>().mockResolvedValue('x');
      const user = userEvent.setup();
      render(<Harness onSend={onSend} />);
      await send(user, '   ');
      expect(onSend).not.toHaveBeenCalled();
    });

    it('names the participants', async () => {
      const user = userEvent.setup();
      render(<Harness userName="Ada" assistantName="Claude" />);
      await send(user, 'Hi');
      expect(await screen.findByRole('article', { name: /^Claude/ })).toBeInTheDocument();
      expect(screen.getByRole('article', { name: /^Ada/ })).toBeInTheDocument();
    });
  });

  describe('message actions', () => {
    it('regenerates a reply', async () => {
      const onSend = vi
        .fn<ChatSender>()
        .mockResolvedValueOnce('First try')
        .mockResolvedValueOnce('Second try');
      const user = userEvent.setup();
      render(<Harness onSend={onSend} />);
      await send(user, 'Question');
      await screen.findByText('First try');
      await user.click(screen.getByRole('button', { name: 'Regenerate response' }));
      expect(await screen.findByText('Second try')).toBeInTheDocument();
      expect(screen.queryByText('First try')).not.toBeInTheDocument();
    });

    it('edits a user message and replies again', async () => {
      const onSend = vi
        .fn<ChatSender>()
        .mockResolvedValueOnce('About cats')
        .mockResolvedValueOnce('About dogs');
      const user = userEvent.setup();
      render(<Harness onSend={onSend} />);
      await send(user, 'Tell me about cats');
      await screen.findByText('About cats');
      await user.click(screen.getByRole('button', { name: 'Edit message' }));
      await user.clear(screen.getByRole('textbox', { name: 'Edit your message' }));
      await user.type(
        screen.getByRole('textbox', { name: 'Edit your message' }),
        'Tell me about dogs',
      );
      await user.click(screen.getByRole('button', { name: 'Save and resend' }));
      expect(await screen.findByText('About dogs')).toBeInTheDocument();
      expect(screen.getByText('Tell me about dogs')).toBeInTheDocument();
      expect(screen.queryByText('About cats')).not.toBeInTheDocument();
    });

    it('deletes a message', async () => {
      const user = userEvent.setup();
      render(<Harness initialMessages={history()} />);
      const reply = screen.getByRole('article', { name: /^Assistant/ });
      await user.click(within(reply).getByRole('button', { name: 'Delete message' }));
      expect(screen.queryByText('It is 4.')).not.toBeInTheDocument();
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    it('offers to try again when a reply fails', async () => {
      const onSend = vi
        .fn<ChatSender>()
        .mockRejectedValueOnce(new Error('Rate limited'))
        .mockResolvedValueOnce('Worked this time');
      const user = userEvent.setup();
      render(<Harness onSend={onSend} />);
      await send(user, 'Hello');
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The reply could not be completed.',
      );
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByText('Worked this time')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('records feedback on the message and reports it', async () => {
      const onFeedback = vi.fn();
      const user = userEvent.setup();
      render(<Harness initialMessages={history()} onFeedback={onFeedback} />);
      const up = screen.getByRole('button', { name: 'Good response' });
      expect(up).toHaveAttribute('aria-pressed', 'false');
      await user.click(up);
      expect(screen.getByRole('button', { name: 'Good response' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(onFeedback).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a1' }), 'up');
      await user.click(screen.getByRole('button', { name: 'Good response' }));
      expect(onFeedback).toHaveBeenLastCalledWith(expect.anything(), null);
      expect(screen.getByRole('button', { name: 'Good response' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    it('lets bubble props override the defaults', () => {
      render(<Harness initialMessages={history()} bubbleProps={{ actions: false }} />);
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });
  });

  describe('attachments', () => {
    beforeEach(() => {
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn(() => 'blob:image'),
        revokeObjectURL: vi.fn(),
      });
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const attach = (...files: File[]) =>
      userEvent
        .setup()
        .upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, files);

    it('sends files as parts of the user message, and hands the files to onSend', async () => {
      const onSend = vi.fn<ChatSender>().mockResolvedValue('Got them');
      const user = userEvent.setup();
      const photo = new File([new Uint8Array(5)], 'photo.png', { type: 'image/png' });
      const doc = new File([new Uint8Array(2048)], 'report.pdf', { type: 'application/pdf' });
      render(<Harness onSend={onSend} composerProps={{ allowAttachments: true }} />);
      await attach(photo, doc);
      await user.type(box(), 'Here you go{Enter}');
      expect(await screen.findByText('Got them')).toBeInTheDocument();
      const sent = (onSend.mock.calls[0]![0] as Message[]).at(-1)!;
      expect(sent.parts).toEqual([
        { type: 'text', text: 'Here you go' },
        { type: 'image', url: 'blob:image', alt: 'photo.png' },
        { type: 'file', name: 'report.pdf', size: 2048, mimeType: 'application/pdf' },
      ]);
      expect((sent.metadata as { files: File[] }).files).toEqual([photo, doc]);
      expect(screen.getByRole('img', { name: 'photo.png' })).toBeInTheDocument();
      // A file with no URL is shown by name, not as a link.
      expect(screen.getByText('report.pdf')).toBeInTheDocument();
    });

    it('can map attachments to parts itself', async () => {
      const onSend = vi.fn<ChatSender>().mockResolvedValue('ok');
      const user = userEvent.setup();
      render(
        <Harness
          onSend={onSend}
          composerProps={{ allowAttachments: true }}
          mapAttachments={(attachments) =>
            attachments.map((a) => ({ type: 'file', name: `uploaded-${a.name}` }))
          }
        />,
      );
      await attach(new File(['x'], 'a.txt', { type: 'text/plain' }));
      await user.type(box(), 'see{Enter}');
      await screen.findByText('ok');
      expect((onSend.mock.calls[0]![0] as Message[]).at(-1)!.parts).toContainEqual({
        type: 'file',
        name: 'uploaded-a.txt',
      });
    });
  });

  describe('header', () => {
    it('has buttons for the handlers you pass', async () => {
      const onSettings = vi.fn();
      const onClose = vi.fn();
      const user = userEvent.setup();
      render(<Harness onSettings={onSettings} onClose={onClose} onNewChat={() => {}} />);
      await user.click(screen.getByRole('button', { name: 'Chat settings' }));
      await user.click(screen.getByRole('button', { name: 'Close chat' }));
      expect(onSettings).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('can start a new chat by resetting', async () => {
      function Host() {
        const chat = useChat({ onSend: async () => 'reply', initialMessages: history() });
        return <ChatWindow chat={chat} title="A" onNewChat={() => chat.reset()} />;
      }
      const user = userEvent.setup();
      render(<Host />);
      expect(screen.getAllByRole('article')).toHaveLength(2);
      await user.click(screen.getByRole('button', { name: 'New chat' }));
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    it('shows the subtitle, avatar, model selector and extra actions', () => {
      render(
        <Harness
          subtitle="Online"
          avatar={<span data-testid="av" />}
          modelSelector={<button>Model</button>}
          headerActions={<button>Share</button>}
        />,
      );
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByTestId('av')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Model' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    });
  });

  describe('floating widget', () => {
    it('is a launcher button until opened', async () => {
      const user = userEvent.setup();
      render(<Harness mode="floating" />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      const launcher = screen.getByRole('button', { name: 'Open chat' });
      expect(launcher).toHaveAttribute('aria-expanded', 'false');
      await user.click(launcher);
      const dialog = screen.getByRole('dialog', { name: 'Assistant' });
      expect(dialog).toHaveAttribute('aria-modal', 'false');
      expect(dialog).toHaveClass('axon-chat-window--floating');
      expect(screen.queryByRole('button', { name: 'Open chat' })).not.toBeInTheDocument();
    });

    it('moves focus to the box when it opens, and back to the launcher when it closes', async () => {
      const user = userEvent.setup();
      render(<Harness mode="floating" />);
      await user.click(screen.getByRole('button', { name: 'Open chat' }));
      await waitFor(() => expect(box()).toHaveFocus());
      await user.click(screen.getByRole('button', { name: 'Close chat' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Open chat' })).toHaveFocus());
    });

    it('closes with Escape, and keeps the conversation', async () => {
      const user = userEvent.setup();
      render(<Harness mode="floating" defaultOpen />);
      await send(user, 'Hello');
      await screen.findByText('A reply');
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Open chat' }));
      expect(screen.getByText('A reply')).toBeInTheDocument();
    });

    it('can start open, and be controlled', async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(<Harness mode="floating" defaultOpen />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      rerender(<Harness mode="floating" open={false} onOpenChange={onOpenChange} />);
      await user.click(screen.getByRole('button', { name: 'Open chat' }));
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('can be translated', () => {
      render(<Harness mode="floating" labels={{ open: 'Abrir chat' }} />);
      expect(screen.getByRole('button', { name: 'Abrir chat' })).toBeInTheDocument();
    });

    it('does not use a launcher in other modes', () => {
      render(<Harness mode="page" />);
      expect(screen.queryByRole('button', { name: 'Open chat' })).not.toBeInTheDocument();
    });
  });

  it('keeps working when the chat state is held by a parent that re-renders a lot', async () => {
    function Parent() {
      const [ticks, setTicks] = useState(0);
      const chat = useChat({ onSend: async () => `reply ${ticks}` });
      return (
        <>
          <button onClick={() => setTicks((t) => t + 1)}>tick</button>
          <ChatWindow chat={chat} title="A" />
        </>
      );
    }
    const user = userEvent.setup();
    render(<Parent />);
    await user.click(screen.getByRole('button', { name: 'tick' }));
    await send(user, 'hi');
    expect(await screen.findByText('reply 1')).toBeInTheDocument();
  });

  it('has no accessibility violations: empty, with a conversation, and floating', async () => {
    const { container, rerender } = render(<Harness suggestedPrompts={[{ title: 'Try me' }]} />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<Harness initialMessages={history()} composerProps={{ allowAttachments: true }} />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(<Harness mode="floating" defaultOpen initialMessages={history()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
