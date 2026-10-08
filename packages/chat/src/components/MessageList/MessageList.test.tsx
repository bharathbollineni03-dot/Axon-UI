import { createRef } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '../../types';
import { MessageList, type MessageListProps } from './MessageList';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2025, 5, 15, 14, 0).getTime();

let counter = 0;
const msg = (overrides: Partial<Message> = {}): Message => ({
  id: `m${++counter}`,
  role: 'assistant',
  content: `Message ${counter}`,
  createdAt: NOW,
  status: 'done',
  ...overrides,
});

const list = (messages: Message[], props: Partial<MessageListProps> = {}) => (
  <MessageList messages={messages} now={() => NOW} locale="en-US" {...props} />
);

/** jsdom has no layout, so give scrolling elements metrics the test controls. */
function mockScrollMetrics(initial: {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
}) {
  const state = { ...initial, writes: [] as number[] };
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => state.scrollHeight);
  vi.spyOn(Element.prototype, 'clientHeight', 'get').mockImplementation(() => state.clientHeight);
  vi.spyOn(Element.prototype, 'scrollTop', 'get').mockImplementation(() => state.scrollTop);
  vi.spyOn(Element.prototype, 'scrollTop', 'set').mockImplementation((value: number) => {
    state.scrollTop = value;
    state.writes.push(value);
  });
  return state;
}

const scrollTo = (state: ReturnType<typeof mockScrollMetrics>, top: number) => {
  state.scrollTop = top;
  fireEvent.scroll(screen.getByRole('log'));
};

const originalScrollTo = Element.prototype.scrollTo;

beforeEach(() => {
  counter = 0;
});

afterEach(() => {
  Element.prototype.scrollTo = originalScrollTo;
});

describe('MessageList', () => {
  describe('structure', () => {
    it('is a focusable log named "Conversation", holding the messages in order', () => {
      render(list([msg({ content: 'First' }), msg({ role: 'user', content: 'Second' })]));
      const log = screen.getByRole('log', { name: 'Conversation' });
      expect(log).toHaveAttribute('tabindex', '0');
      const articles = within(log).getAllByRole('article');
      expect(articles).toHaveLength(2);
      expect(articles[0]).toHaveTextContent('First');
      expect(articles[1]).toHaveTextContent('Second');
    });

    it('does not announce its own content as it changes', () => {
      render(list([msg()]));
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'off');
    });

    it('shows an empty state instead of the list when there are no messages', () => {
      render(list([], { emptyState: <p>Ask me anything</p> }));
      expect(screen.getByText('Ask me anything')).toBeInTheDocument();
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    it('renders nothing in the log with no messages and no empty state', () => {
      render(list([]));
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    it('passes bubble props to every message', () => {
      render(list([msg({ role: 'user' })], { bubbleProps: { userName: 'Ada' } }));
      expect(screen.getByRole('article', { name: /^Ada/ })).toBeInTheDocument();
    });

    it('can render messages itself', () => {
      render(
        list([msg({ content: 'a' }), msg({ content: 'b' })], {
          renderMessage: (m) => <p>custom {m.content}</p>,
        }),
      );
      expect(screen.getByText('custom a')).toBeInTheDocument();
      expect(screen.queryByRole('article')).not.toBeInTheDocument();
    });

    it('forwards the ref to the scrolling element and merges className onto the wrapper', () => {
      const ref = createRef<HTMLDivElement>();
      const { container } = render(
        <MessageList
          ref={ref}
          messages={[msg()]}
          now={() => NOW}
          locale="en-US"
          className="extra"
        />,
      );
      expect(ref.current).toBe(screen.getByRole('log'));
      expect(container.firstChild).toHaveClass('axon-message-list-wrap', 'extra');
    });

    it('calls a scroll handler you pass', () => {
      const onScroll = vi.fn();
      render(list([msg()], { onScroll }));
      fireEvent.scroll(screen.getByRole('log'));
      expect(onScroll).toHaveBeenCalledTimes(1);
    });
  });

  describe('date separators', () => {
    it('separates days with Today, Yesterday and the date', () => {
      render(
        list([
          msg({ createdAt: NOW - 20 * DAY }),
          msg({ createdAt: NOW - DAY }),
          msg({ createdAt: NOW }),
        ]),
      );
      const separators = screen.getAllByRole('separator');
      expect(separators.map((s) => s.getAttribute('aria-label'))).toEqual([
        'Monday, May 26',
        'Yesterday',
        'Today',
      ]);
    });

    it('adds the year for another year', () => {
      render(list([msg({ createdAt: new Date(2023, 2, 4, 9, 0).getTime() })]));
      expect(screen.getByRole('separator')).toHaveAttribute(
        'aria-label',
        'Saturday, March 4, 2023',
      );
    });

    it('has one separator per day, however many messages', () => {
      render(list([msg(), msg(), msg({ createdAt: NOW - DAY }), msg({ createdAt: NOW - DAY })]));
      expect(screen.getAllByRole('separator')).toHaveLength(2);
    });

    it('can be turned off, and translated', () => {
      const { rerender } = render(list([msg()], { showDateSeparators: false }));
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
      rerender(list([msg()], { labels: { today: 'Hoy' } }));
      expect(screen.getByRole('separator')).toHaveAttribute('aria-label', 'Hoy');
    });

    it('keeps the visible text out of the accessibility tree twice', () => {
      render(list([msg()]));
      expect(screen.getByRole('separator').firstChild).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('following new messages', () => {
    it('starts at the bottom', () => {
      const state = mockScrollMetrics({ scrollHeight: 2000, clientHeight: 500, scrollTop: 0 });
      render(list([msg(), msg()]));
      expect(state.writes.at(-1)).toBe(2000);
    });

    it('scrolls down when a message arrives and the user is at the bottom', () => {
      const state = mockScrollMetrics({ scrollHeight: 1000, clientHeight: 500, scrollTop: 500 });
      const messages = [msg()];
      const { rerender } = render(list(messages));
      state.writes.length = 0;
      state.scrollHeight = 1200;
      rerender(list([...messages, msg()]));
      expect(state.writes.at(-1)).toBe(1200);
    });

    it('follows text as it streams into the last message', () => {
      const state = mockScrollMetrics({ scrollHeight: 1000, clientHeight: 500, scrollTop: 500 });
      const reply = msg({ status: 'streaming', content: 'Hel' });
      const { rerender } = render(list([reply]));
      state.writes.length = 0;
      state.scrollHeight = 1100;
      rerender(list([{ ...reply, content: 'Hello wor' }]));
      expect(state.writes.at(-1)).toBe(1100);
    });

    it('stops following once the user scrolls up, and does not yank them back', () => {
      const state = mockScrollMetrics({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
      const messages = [msg()];
      const { rerender } = render(list(messages));
      scrollTo(state, 400);
      state.writes.length = 0;
      state.scrollHeight = 2400;
      rerender(list([...messages, msg()]));
      expect(state.writes).toEqual([]);
      expect(state.scrollTop).toBe(400);
    });

    it('resumes following when the user scrolls back to the bottom', () => {
      const state = mockScrollMetrics({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
      const messages = [msg()];
      const { rerender } = render(list(messages));
      scrollTo(state, 400);
      scrollTo(state, 1480); // within the 48px threshold of the bottom
      state.writes.length = 0;
      state.scrollHeight = 2200;
      rerender(list([...messages, msg()]));
      expect(state.writes.at(-1)).toBe(2200);
    });

    it('never scrolls by itself with autoScroll off', () => {
      const state = mockScrollMetrics({ scrollHeight: 1000, clientHeight: 500, scrollTop: 500 });
      const messages = [msg()];
      const { rerender } = render(list(messages, { autoScroll: false }));
      rerender(list([...messages, msg()], { autoScroll: false }));
      expect(state.writes).toEqual([]);
    });
  });

  describe('jump to latest', () => {
    it('appears only when scrolled away from the bottom', () => {
      const state = mockScrollMetrics({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
      render(list([msg()]));
      expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();
      scrollTo(state, 300);
      expect(screen.getByRole('button', { name: 'Jump to latest' })).toBeInTheDocument();
      scrollTo(state, 1500);
      expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();
    });

    it('scrolls to the bottom, smoothly, and goes away', async () => {
      const state = mockScrollMetrics({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
      const scrollToSpy = vi.fn((options: ScrollToOptions) => {
        state.scrollTop = options.top ?? 0;
      });
      Element.prototype.scrollTo = scrollToSpy as never;
      render(list([msg()]));
      scrollTo(state, 300);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Jump to latest' }));
      expect(scrollToSpy).toHaveBeenCalledWith({ top: 2000, behavior: 'smooth' });
      expect(screen.queryByRole('button', { name: 'Jump to latest' })).not.toBeInTheDocument();
    });

    it('jumps without animation for people who prefer reduced motion', async () => {
      const state = mockScrollMetrics({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
      const scrollToSpy = vi.fn();
      Element.prototype.scrollTo = scrollToSpy as never;
      const original = window.matchMedia;
      window.matchMedia = (() => ({ matches: true })) as never;
      try {
        render(list([msg()]));
        scrollTo(state, 300);
        state.writes.length = 0;
        await userEvent.setup().click(screen.getByRole('button', { name: 'Jump to latest' }));
        expect(scrollToSpy).not.toHaveBeenCalled();
        expect(state.writes.at(-1)).toBe(2000);
      } finally {
        window.matchMedia = original;
      }
    });

    it('resumes following after a jump', async () => {
      const state = mockScrollMetrics({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
      Element.prototype.scrollTo = vi.fn() as never;
      const messages = [msg()];
      const { rerender } = render(list(messages));
      scrollTo(state, 300);
      await userEvent.setup().click(screen.getByRole('button', { name: 'Jump to latest' }));
      state.writes.length = 0;
      state.scrollHeight = 2300;
      rerender(list([...messages, msg()]));
      expect(state.writes.at(-1)).toBe(2300);
    });

    it('can be translated', () => {
      const state = mockScrollMetrics({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
      render(list([msg()], { labels: { jumpToLatest: 'Ir al final' } }));
      scrollTo(state, 100);
      expect(screen.getByRole('button', { name: 'Ir al final' })).toBeInTheDocument();
    });
  });

  describe('announcements', () => {
    const status = () => screen.getAllByRole('status').at(-1)!;

    it('says nothing for the messages already there', () => {
      render(list([msg({ content: 'Old answer' }), msg({ role: 'user' })]));
      expect(status()).toBeEmptyDOMElement();
    });

    it('says the assistant is responding when a reply starts', () => {
      const messages = [msg({ role: 'user' })];
      const { rerender } = render(list(messages));
      rerender(list([...messages, msg({ status: 'pending', content: '' })]));
      expect(status()).toHaveTextContent('The assistant is responding.');
    });

    it('reads out the reply once it is complete, not while it streams', () => {
      const reply = msg({ status: 'pending', content: '' });
      const { rerender } = render(list([reply]));
      rerender(list([{ ...reply, status: 'streaming', content: 'Par' }]));
      expect(status()).not.toHaveTextContent('Par');
      rerender(list([{ ...reply, status: 'streaming', content: 'Partial answ' }]));
      expect(status()).not.toHaveTextContent('Partial');
      rerender(list([{ ...reply, status: 'done', content: 'Partial answer, complete.' }]));
      expect(status()).toHaveTextContent('Assistant: Partial answer, complete.');
    });

    it('reads the plain text of a message that has parts', () => {
      const reply = msg({ status: 'pending', content: '' });
      const { rerender } = render(list([reply]));
      rerender(
        list([
          {
            ...reply,
            status: 'done',
            content: '',
            parts: [
              { type: 'text', text: 'The answer' },
              { type: 'code', code: 'ignored()' },
            ],
          },
        ]),
      );
      expect(status()).toHaveTextContent('Assistant: The answer');
    });

    it('announces a failure', () => {
      const reply = msg({ status: 'streaming', content: 'x' });
      const { rerender } = render(list([reply]));
      rerender(list([{ ...reply, status: 'error' }]));
      expect(status()).toHaveTextContent('The assistant could not finish its reply.');
    });

    it('announces a finished reply that was added whole', () => {
      const messages = [msg({ role: 'user' })];
      const { rerender } = render(list(messages));
      rerender(list([...messages, msg({ content: 'Arrived complete' })]));
      expect(status()).toHaveTextContent('Assistant: Arrived complete');
    });

    it('does not announce the user’s own messages', () => {
      const { rerender } = render(list([]));
      rerender(list([msg({ role: 'user', content: 'my words' })]));
      expect(status()).toBeEmptyDOMElement();
    });

    it('does not repeat itself on later renders', () => {
      const reply = msg({ status: 'pending', content: '' });
      const { rerender } = render(list([reply]));
      const done = { ...reply, status: 'done' as const, content: 'Finished' };
      rerender(list([done]));
      expect(status()).toHaveTextContent('Assistant: Finished');
      act(() => {
        const live = status();
        live.textContent = '';
      });
      rerender(list([done, msg({ role: 'user' })]));
      expect(status()).not.toHaveTextContent('Finished');
    });

    it('is a polite, atomic live region', () => {
      render(list([msg()]));
      expect(status()).toHaveAttribute('aria-live', 'polite');
      expect(status()).toHaveAttribute('aria-atomic', 'true');
    });

    it('can be translated', () => {
      const reply = msg({ status: 'pending', content: '' });
      const { rerender } = render(
        list([reply], { labels: { announce: (t) => `Asistente: ${t}` } }),
      );
      rerender(
        list([{ ...reply, status: 'done', content: 'Hola' }], {
          labels: { announce: (t) => `Asistente: ${t}` },
        }),
      );
      expect(status()).toHaveTextContent('Asistente: Hola');
    });
  });

  describe('virtualization', () => {
    const many = (count: number) =>
      Array.from({ length: count }, (_, i) => msg({ content: `Row ${i}` }));

    function mockLayout() {
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800);
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        width: 800,
        height: 100,
        top: 0,
        left: 0,
        right: 800,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
    }

    it('renders only the rows in view for a long thread', () => {
      mockLayout();
      render(list(many(500), { virtualize: true, estimateSize: 100 }));
      const rendered = screen.getAllByRole('article').length;
      expect(rendered).toBeGreaterThan(0);
      expect(rendered).toBeLessThan(40);
    });

    it('tells assistive technology the position and size of each rendered message', () => {
      mockLayout();
      render(list(many(500), { virtualize: true, estimateSize: 100, showDateSeparators: false }));
      const first = screen.getAllByRole('article')[0]!;
      expect(first).toHaveAttribute('aria-setsize', '500');
      expect(first).toHaveAttribute('aria-posinset');
    });

    it('turns on by itself past the threshold ("auto")', () => {
      mockLayout();
      const { rerender } = render(list(many(50), { virtualizeThreshold: 100, estimateSize: 100 }));
      expect(screen.getAllByRole('article')).toHaveLength(50);
      rerender(list(many(300), { virtualizeThreshold: 100, estimateSize: 100 }));
      expect(screen.getAllByRole('article').length).toBeLessThan(60);
    });

    it('can be turned off for a long thread', () => {
      mockLayout();
      render(list(many(150), { virtualize: false }));
      expect(screen.getAllByRole('article')).toHaveLength(150);
    });

    it('is not used for a short thread when forced off', () => {
      render(list(many(5), { virtualize: false }));
      expect(screen.getAllByRole('article')).toHaveLength(5);
    });
  });

  it('has no accessibility violations, including with a jump button and separators', async () => {
    const state = mockScrollMetrics({ scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
    const { container } = render(
      list([
        msg({ createdAt: NOW - DAY }),
        msg({ role: 'user' }),
        msg({ status: 'streaming', content: 'Typing' }),
      ]),
    );
    scrollTo(state, 100);
    expect(await axe(container)).toHaveNoViolations();
  });
});
