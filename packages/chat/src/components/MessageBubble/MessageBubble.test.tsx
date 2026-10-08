import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import type { Message, MessagePart } from '../../types';
import { MessageBubble, type MessageBubbleProps } from './MessageBubble';

const NOON = new Date(2025, 0, 15, 12, 30).getTime();

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    role: 'assistant',
    content: 'Hello there',
    createdAt: NOON,
    status: 'done',
    ...overrides,
  };
}

const fakeBubble = (props: Partial<MessageBubbleProps> & { message?: Message } = {}) => (
  <MessageBubble
    formatTimestamp={() => '12:30 PM'}
    {...props}
    message={props.message ?? message()}
  />
);

describe('MessageBubble', () => {
  describe('structure', () => {
    it('is an article named by who it is from and when', () => {
      render(fakeBubble());
      expect(screen.getByRole('article', { name: 'Assistant, 12:30 PM' })).toBeInTheDocument();
    });

    it('names the user "You", and takes other names', () => {
      const { rerender } = render(fakeBubble({ message: message({ role: 'user' }) }));
      expect(screen.getByRole('article', { name: 'You, 12:30 PM' })).toBeInTheDocument();
      rerender(fakeBubble({ message: message({ role: 'user' }), userName: 'Ada' }));
      expect(screen.getByRole('article', { name: 'Ada, 12:30 PM' })).toBeInTheDocument();
      rerender(fakeBubble({ assistantName: 'Claude' }));
      expect(screen.getByRole('article', { name: 'Claude, 12:30 PM' })).toBeInTheDocument();
    });

    it('formats the time with Intl by default, in the locale', () => {
      render(<MessageBubble message={message()} locale="en-US" />);
      expect(screen.getByRole('article', { name: /Assistant, 12:30/ })).toBeInTheDocument();
    });

    it('has a <time> element with the date for machines', () => {
      const { container } = render(fakeBubble({ timestamp: 'always' }));
      expect(container.querySelector('time')).toHaveAttribute(
        'datetime',
        new Date(NOON).toISOString(),
      );
      expect(container.querySelector('time')).toHaveTextContent('12:30 PM');
    });

    it('can hide the time, or show it always', () => {
      const { container, rerender } = render(fakeBubble({ timestamp: 'never' }));
      expect(container.querySelector('time')).toBeNull();
      rerender(fakeBubble({ timestamp: 'always' }));
      expect(container.querySelector('time')).toHaveClass('axon-message__time--always');
    });

    it('shows an avatar, and can hide it or replace it', () => {
      const { container, rerender } = render(fakeBubble());
      expect(container.querySelector('.axon-avatar')).toBeInTheDocument();
      rerender(fakeBubble({ showAvatar: false }));
      expect(container.querySelector('.axon-avatar')).toBeNull();
      rerender(fakeBubble({ assistantAvatar: <span data-testid="mine" /> }));
      expect(screen.getByTestId('mine')).toBeInTheDocument();
    });

    it('puts role and status modifiers on the root', () => {
      const { rerender } = render(fakeBubble({ message: message({ role: 'user' }) }));
      expect(screen.getByRole('article')).toHaveClass('axon-message--user', 'axon-message--done');
      rerender(fakeBubble({ message: message({ status: 'streaming' }) }));
      expect(screen.getByRole('article')).toHaveClass(
        'axon-message--assistant',
        'axon-message--streaming',
      );
    });

    it('is busy while the reply is on its way', () => {
      const { rerender } = render(
        fakeBubble({ message: message({ status: 'pending', content: '' }) }),
      );
      expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true');
      rerender(fakeBubble({ message: message({ status: 'streaming' }) }));
      expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true');
      rerender(fakeBubble());
      expect(screen.getByRole('article')).not.toHaveAttribute('aria-busy');
    });

    it('forwards the ref and spreads props', () => {
      const ref = createRef<HTMLElement>();
      render(fakeBubble({ ref, className: 'extra', 'data-testid': 'b' } as never));
      expect(ref.current).toBe(screen.getByTestId('b'));
      expect(ref.current).toHaveClass('axon-message', 'extra');
      expect(ref.current).toHaveAttribute('data-message-id', 'm1');
    });
  });

  describe('content', () => {
    it('renders an assistant message as Markdown', () => {
      const { container } = render(
        fakeBubble({ message: message({ content: 'Some **bold** text' }) }),
      );
      expect(container.querySelector('strong')).toHaveTextContent('bold');
    });

    it('renders a user message as plain text, never as Markdown or HTML', () => {
      const { container } = render(
        fakeBubble({ message: message({ role: 'user', content: '**not bold** <b>nor this</b>' }) }),
      );
      expect(container.querySelector('strong')).toBeNull();
      expect(container.querySelector('b')).toBeNull();
      expect(screen.getByText('**not bold** <b>nor this</b>')).toBeInTheDocument();
    });

    it('shows a typing indicator for a reply that has not started', () => {
      render(fakeBubble({ message: message({ status: 'pending', content: '' }) }));
      expect(screen.getByText('Assistant is typing').closest('[role="status"]')).toHaveClass(
        'axon-typing',
      );
    });

    it('shows the cursor state while text streams in', () => {
      const { container } = render(
        fakeBubble({ message: message({ status: 'streaming', content: 'Partial' }) }),
      );
      expect(container.querySelector('.axon-streaming-text--active')).toBeInTheDocument();
      expect(screen.queryByText('Assistant is typing')).not.toBeInTheDocument();
    });

    it('shows no cursor once done', () => {
      const { container } = render(fakeBubble());
      expect(container.querySelector('.axon-streaming-text--active')).toBeNull();
    });

    it('renders a system message as a small centered note', () => {
      render(fakeBubble({ message: message({ role: 'system', content: 'Chat started' }) }));
      expect(screen.getByRole('article', { name: /System/ })).toHaveTextContent('Chat started');
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });
  });

  describe('parts', () => {
    const withParts = (parts: MessagePart[], extra: Partial<Message> = {}) =>
      fakeBubble({ message: message({ parts, ...extra }) });

    it('renders text, code and images in order', () => {
      const { container } = render(
        withParts([
          { type: 'text', text: 'Intro' },
          { type: 'code', code: 'const a = 1', language: 'ts', filename: 'a.ts' },
          { type: 'image', url: 'https://example.com/i.png', alt: 'A chart' },
        ]),
      );
      const bubble = container.querySelector('.axon-message__bubble')!;
      expect(bubble.children[0]).toHaveTextContent('Intro');
      expect(within(bubble as HTMLElement).getByText('a.ts')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: 'A chart' })).toHaveAttribute(
        'referrerpolicy',
        'no-referrer',
      );
    });

    it('shows reasoning as a collapsed thinking block', () => {
      render(
        withParts([
          { type: 'reasoning', text: 'Step one…', duration: 5 },
          { type: 'text', text: 'Answer' },
        ]),
      );
      expect(screen.getByRole('button', { name: 'Thought for 5 seconds' })).toBeInTheDocument();
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });

    it('pairs a tool call with its result into one card', () => {
      render(
        withParts([
          { type: 'tool-call', id: 'c1', name: 'get_weather', arguments: { city: 'Paris' } },
          { type: 'tool-result', callId: 'c1', result: { temp: 21 } },
        ]),
      );
      expect(screen.getAllByText('get_weather')).toHaveLength(1);
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('marks a card as failed when its result is an error', () => {
      render(
        withParts([
          { type: 'tool-call', id: 'c1', name: 'run' },
          { type: 'tool-result', callId: 'c1', result: 'boom', isError: true },
        ]),
      );
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('shows a result with no matching call on its own', () => {
      render(withParts([{ type: 'tool-result', callId: 'orphan', name: 'lookup', result: 'x' }]));
      expect(screen.getByText('lookup')).toBeInTheDocument();
    });

    it('lists attachments, with links and sizes', () => {
      render(
        withParts([
          { type: 'file', name: 'report.pdf', url: 'https://example.com/r.pdf', size: 2048 },
          { type: 'file', name: 'notes.txt', size: 12 },
        ]),
      );
      const list = screen.getByRole('list', { name: 'Attachments' });
      expect(within(list).getByRole('link', { name: 'report.pdf' })).toHaveAttribute(
        'href',
        'https://example.com/r.pdf',
      );
      expect(within(list).getByText('2 KB')).toBeInTheDocument();
      expect(within(list).getByText('12 B')).toBeInTheDocument();
      expect(within(list).queryByRole('link', { name: 'notes.txt' })).not.toBeInTheDocument();
    });

    it('gathers sources into a list at the end', () => {
      render(
        withParts([
          { type: 'text', text: 'Answer' },
          { type: 'source', title: 'Docs', url: 'https://example.com/docs' },
          { type: 'source', title: 'Blog' },
        ]),
      );
      const region = screen.getByRole('region', { name: 'Sources' });
      expect(within(region).getAllByRole('listitem')).toHaveLength(2);
    });

    it('streams only the last text part', () => {
      const { container } = render(
        withParts(
          [
            { type: 'text', text: 'First' },
            { type: 'code', code: 'x' },
            { type: 'text', text: 'Last' },
          ],
          { status: 'streaming' },
        ),
      );
      expect(container.querySelectorAll('.axon-streaming-text--active')).toHaveLength(1);
      expect(container.querySelectorAll('.axon-streaming-text')[1]).toHaveClass(
        'axon-streaming-text--active',
      );
    });

    it('uses the user message parts as plain text', () => {
      const { container } = render(
        fakeBubble({
          message: message({
            role: 'user',
            content: '**x**',
            parts: [{ type: 'text', text: '**x**' }],
          }),
        }),
      );
      expect(container.querySelector('strong')).toBeNull();
    });
  });

  describe('errors', () => {
    it('shows an alert for a failed reply, keeping any partial text', () => {
      render(fakeBubble({ message: message({ status: 'error', content: 'Partial answer' }) }));
      expect(screen.getByRole('alert')).toHaveTextContent('The reply could not be completed.');
      expect(screen.getByText('Partial answer')).toBeInTheDocument();
    });

    it('offers to try again when a handler is given', async () => {
      const onRetry = vi.fn();
      const failed = message({ status: 'error', content: '' });
      render(fakeBubble({ message: failed, onRetry }));
      await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
      expect(onRetry).toHaveBeenCalledWith(failed);
    });

    it('has no retry button without a handler', () => {
      render(fakeBubble({ message: message({ status: 'error', content: '' }) }));
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });
  });

  describe('actions', () => {
    it('offers copy on a finished message, and nothing else by default', () => {
      render(fakeBubble());
      const toolbar = screen.getByRole('toolbar', { name: 'Message actions' });
      expect(within(toolbar).getAllByRole('button')).toHaveLength(1);
      expect(within(toolbar).getByRole('button', { name: 'Copy message' })).toBeInTheDocument();
    });

    it('offers the actions whose handlers you pass', () => {
      render(
        fakeBubble({
          onRegenerate: () => {},
          onFeedback: () => {},
          onDelete: () => {},
        }),
      );
      const names = within(screen.getByRole('toolbar'))
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label'));
      expect(names).toEqual([
        'Copy message',
        'Regenerate response',
        'Good response',
        'Bad response',
        'Delete message',
      ]);
    });

    it('offers edit on the user, never regenerate or feedback', () => {
      render(
        fakeBubble({
          message: message({ role: 'user' }),
          onEdit: () => {},
          onRegenerate: () => {},
          onFeedback: () => {},
        }),
      );
      expect(screen.getByRole('button', { name: 'Edit message' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Regenerate response' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Good response' })).not.toBeInTheDocument();
    });

    it('offers nothing while a reply is still arriving', () => {
      render(
        fakeBubble({
          message: message({ status: 'streaming' }),
          onRegenerate: () => {},
          onFeedback: () => {},
        }),
      );
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    it('can be limited to some actions, or turned off', () => {
      const { rerender } = render(fakeBubble({ onDelete: () => {}, actions: ['delete'] }));
      expect(screen.getAllByRole('button')).toHaveLength(1);
      expect(screen.getByRole('button', { name: 'Delete message' })).toBeInTheDocument();
      rerender(fakeBubble({ onDelete: () => {}, actions: false }));
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    it('calls the handlers with the message', async () => {
      const onRegenerate = vi.fn();
      const onDelete = vi.fn();
      const m = message();
      const user = userEvent.setup();
      render(fakeBubble({ message: m, onRegenerate, onDelete }));
      await user.click(screen.getByRole('button', { name: 'Regenerate response' }));
      await user.click(screen.getByRole('button', { name: 'Delete message' }));
      expect(onRegenerate).toHaveBeenCalledWith(m);
      expect(onDelete).toHaveBeenCalledWith(m);
    });

    describe('copy', () => {
      it('copies the message text and confirms', async () => {
        const onCopy = vi.fn();
        const user = userEvent.setup();
        const m = message({ content: 'copy me' });
        render(fakeBubble({ message: m, onCopy }));
        await user.click(screen.getByRole('button', { name: 'Copy message' }));
        expect(await navigator.clipboard.readText()).toBe('copy me');
        expect(onCopy).toHaveBeenCalledWith(m);
        expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Copied');
      });

      it('copies the text of the parts, not the code', async () => {
        const user = userEvent.setup();
        render(
          fakeBubble({
            message: message({
              content: 'Intro',
              parts: [
                { type: 'text', text: 'Intro' },
                { type: 'code', code: 'x = 1' },
              ],
            }),
          }),
        );
        await user.click(screen.getByRole('button', { name: 'Copy message' }));
        expect(await navigator.clipboard.readText()).toBe('Intro');
      });
    });

    describe('feedback', () => {
      it('shows thumbs as toggle buttons that reflect the feedback', () => {
        render(fakeBubble({ onFeedback: () => {}, feedback: 'up' }));
        expect(screen.getByRole('button', { name: 'Good response' })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        expect(screen.getByRole('button', { name: 'Bad response' })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      });

      it('reports a choice, and taking it back', async () => {
        const onFeedback = vi.fn();
        const user = userEvent.setup();
        const m = message();
        const { rerender } = render(fakeBubble({ message: m, onFeedback, feedback: null }));
        await user.click(screen.getByRole('button', { name: 'Bad response' }));
        expect(onFeedback).toHaveBeenLastCalledWith(m, 'down');
        rerender(fakeBubble({ message: m, onFeedback, feedback: 'down' }));
        await user.click(screen.getByRole('button', { name: 'Bad response' }));
        expect(onFeedback).toHaveBeenLastCalledWith(m, null);
      });
    });

    describe('toolbar keyboard', () => {
      const bubble = () =>
        fakeBubble({ onRegenerate: () => {}, onFeedback: () => {}, onDelete: () => {} });

      it('is one tab stop for the whole group', async () => {
        const user = userEvent.setup();
        render(
          <>
            <button>Before</button>
            {bubble()}
            <button>After</button>
          </>,
        );
        await user.tab();
        await user.tab();
        expect(screen.getByRole('button', { name: 'Copy message' })).toHaveFocus();
        await user.tab();
        expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      });

      it('moves between the buttons with the arrow keys, Home and End', async () => {
        const user = userEvent.setup();
        render(bubble());
        screen.getByRole('button', { name: 'Copy message' }).focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('button', { name: 'Regenerate response' })).toHaveFocus();
        await user.keyboard('{End}');
        expect(screen.getByRole('button', { name: 'Delete message' })).toHaveFocus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByRole('button', { name: 'Copy message' })).toHaveFocus();
        await user.keyboard('{ArrowLeft}');
        expect(screen.getByRole('button', { name: 'Delete message' })).toHaveFocus();
        await user.keyboard('{Home}');
        expect(screen.getByRole('button', { name: 'Copy message' })).toHaveFocus();
      });

      it('remembers the last button as the tab stop', async () => {
        const user = userEvent.setup();
        render(
          <>
            {bubble()}
            <button>After</button>
          </>,
        );
        screen.getByRole('button', { name: 'Copy message' }).focus();
        await user.keyboard('{ArrowRight}{ArrowRight}');
        await user.tab();
        expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
        await user.tab({ shift: true });
        expect(screen.getByRole('button', { name: 'Good response' })).toHaveFocus();
      });
    });
  });

  describe('editing', () => {
    const user = (props: Partial<MessageBubbleProps> = {}) =>
      fakeBubble({
        message: message({ role: 'user', content: 'Original question' }),
        onEdit: props.onEdit ?? (() => {}),
        ...props,
      });

    it('opens an editor with the text, focused', async () => {
      const u = userEvent.setup();
      render(user());
      await u.click(screen.getByRole('button', { name: 'Edit message' }));
      const box = screen.getByRole('textbox', { name: 'Edit your message' });
      expect(box).toHaveValue('Original question');
      expect(box).toHaveFocus();
      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
    });

    it('saves the new text', async () => {
      const onEdit = vi.fn();
      const u = userEvent.setup();
      const m = message({ role: 'user', content: 'Original question' });
      render(user({ message: m, onEdit }));
      await u.click(screen.getByRole('button', { name: 'Edit message' }));
      await u.clear(screen.getByRole('textbox'));
      await u.type(screen.getByRole('textbox'), 'Better question');
      await u.click(screen.getByRole('button', { name: 'Save and resend' }));
      expect(onEdit).toHaveBeenCalledWith(m, 'Better question');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('saves with Ctrl+Enter', async () => {
      const onEdit = vi.fn();
      const u = userEvent.setup();
      render(user({ onEdit }));
      await u.click(screen.getByRole('button', { name: 'Edit message' }));
      await u.type(screen.getByRole('textbox'), ' more{Control>}{Enter}{/Control}');
      expect(onEdit).toHaveBeenCalledWith(expect.anything(), 'Original question more');
    });

    it('cancels with the button or Escape, without calling onEdit', async () => {
      const onEdit = vi.fn();
      const u = userEvent.setup();
      render(user({ onEdit }));
      await u.click(screen.getByRole('button', { name: 'Edit message' }));
      await u.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      await u.click(screen.getByRole('button', { name: 'Edit message' }));
      await u.keyboard('{Escape}');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(onEdit).not.toHaveBeenCalled();
    });

    it('does not save empty or unchanged text', async () => {
      const onEdit = vi.fn();
      const u = userEvent.setup();
      render(user({ onEdit }));
      await u.click(screen.getByRole('button', { name: 'Edit message' }));
      await u.click(screen.getByRole('button', { name: 'Save and resend' }));
      expect(onEdit).not.toHaveBeenCalled();
      await u.click(screen.getByRole('button', { name: 'Edit message' }));
      await u.clear(screen.getByRole('textbox'));
      expect(screen.getByRole('button', { name: 'Save and resend' })).toBeDisabled();
    });
  });

  it('translates its labels', () => {
    render(
      fakeBubble({
        onDelete: () => {},
        labels: {
          assistant: 'Asistente',
          delete: 'Eliminar',
          messageFrom: (n, t) => `De ${n} a las ${t}`,
        },
      }),
    );
    expect(
      screen.getByRole('article', { name: 'De Asistente a las 12:30 PM' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
  });

  it('has no accessibility violations across roles and states', async () => {
    const { container } = render(
      <div>
        {fakeBubble({ onRegenerate: () => {}, onFeedback: () => {}, onDelete: () => {} })}
        {fakeBubble({ message: message({ id: 'u', role: 'user' }), onEdit: () => {} })}
        {fakeBubble({ message: message({ id: 'p', status: 'pending', content: '' }) })}
        {fakeBubble({
          message: message({ id: 'e', status: 'error', content: 'x' }),
          onRetry: () => {},
        })}
        {fakeBubble({ message: message({ id: 's', role: 'system', content: 'Note' }) })}
        {fakeBubble({
          message: message({
            id: 'r',
            parts: [
              { type: 'text', text: 'Answer' },
              { type: 'code', code: 'x', language: 'js' },
              { type: 'tool-call', id: 'c', name: 'tool', arguments: { a: 1 } },
              { type: 'source', title: 'Docs', url: 'https://example.com' },
            ],
          }),
        })}
      </div>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
