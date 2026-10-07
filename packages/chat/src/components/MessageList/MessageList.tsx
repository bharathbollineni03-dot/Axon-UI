import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import { ArrowDownIcon } from '../../internal/icons';
import { useMergedRef } from '../../internal/mergeRefs';
import { getMessageText, type Message, type MessageStatus } from '../../types';
import { MessageBubble, type MessageBubbleProps } from '../MessageBubble/MessageBubble';

export interface MessageListLabels {
  /** The accessible name of the conversation. */
  conversation: string;
  jumpToLatest: string;
  today: string;
  yesterday: string;
  /** Read out when the assistant starts a reply. */
  responding: string;
  /** Read out when a reply finishes, with its text. */
  announce: (text: string) => string;
  /** Read out when a reply fails. */
  failed: string;
}

export const defaultMessageListLabels: MessageListLabels = {
  conversation: 'Conversation',
  jumpToLatest: 'Jump to latest',
  today: 'Today',
  yesterday: 'Yesterday',
  responding: 'The assistant is responding.',
  announce: (text) => `Assistant: ${text}`,
  failed: 'The assistant could not finish its reply.',
};

export interface MessageListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  messages: Message[];
  /** Props for every bubble: names, avatars, handlers, labels. */
  bubbleProps?: Omit<MessageBubbleProps, 'message'>;
  /** Replaces how a message renders. Return a `MessageBubble`, or anything else. */
  renderMessage?: (message: Message, index: number) => ReactNode;
  /** Separates days with "Today", "Yesterday" or the date. Defaults to true. */
  showDateSeparators?: boolean;
  /** Keeps the view at the bottom as messages arrive, until the user scrolls up. Defaults to true. */
  autoScroll?: boolean;
  /**
   * Renders only the messages in view: `true`, `false`, or `'auto'` (default), which turns it on
   * once there are more than `virtualizeThreshold` rows.
   */
  virtualize?: boolean | 'auto';
  virtualizeThreshold?: number;
  /** The height guess for a row before it has been measured, in pixels. Defaults to 120. */
  estimateSize?: number;
  /** Shown instead of the list while there are no messages. */
  emptyState?: ReactNode;
  locale?: string;
  /** The current time in ms; for tests and for "Today" in a different time zone. */
  now?: () => number;
  labels?: Partial<MessageListLabels>;
}

type Row =
  | { type: 'date'; key: string; label: string }
  | { type: 'message'; key: string; message: Message; index: number };

const dayKey = (time: number) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

function dateLabel(
  time: number,
  now: number,
  locale: string | undefined,
  labels: MessageListLabels,
) {
  if (dayKey(time) === dayKey(now)) return labels.today;
  if (dayKey(time) === dayKey(now - 24 * 60 * 60 * 1000)) return labels.yesterday;
  const sameYear = new Date(time).getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  }).format(new Date(time));
}

/**
 * The scrolling list of messages in a conversation. It follows new messages and streaming text
 * until the user scrolls up (then shows a "Jump to latest" button), separates days, virtualizes
 * long threads, and announces each assistant reply once, when it is complete, in a polite live
 * region (so a streaming reply is not read token by token).
 */
export const MessageList = forwardRef<HTMLDivElement, MessageListProps>(function MessageList(
  {
    messages,
    bubbleProps,
    renderMessage,
    showDateSeparators = true,
    autoScroll = true,
    virtualize = 'auto',
    virtualizeThreshold = 100,
    estimateSize = 120,
    emptyState,
    locale,
    now = Date.now,
    labels: labelsProp,
    className,
    onScroll: onScrollProp,
    ...rest
  },
  ref,
) {
  const labels = { ...defaultMessageListLabels, ...labelsProp };
  const scroller = useAutoScroll<HTMLDivElement>();
  const mergedRef = useMergedRef<HTMLDivElement>(ref, scroller.ref);
  const inner = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');

  // One flat list of rows, so a date separator is virtualized like any message.
  const rows = useMemo<Row[]>(() => {
    const list: Row[] = [];
    const clock = now();
    let lastDay = '';
    messages.forEach((message, index) => {
      if (showDateSeparators && message.createdAt !== undefined) {
        const day = dayKey(message.createdAt);
        if (day !== lastDay) {
          lastDay = day;
          list.push({
            type: 'date',
            key: `date-${day}`,
            label: dateLabel(message.createdAt, clock, locale, labels),
          });
        }
      }
      list.push({ type: 'message', key: message.id, message, index });
    });
    return list;
    // `labels` is rebuilt every render, so depend on the pieces that matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, showDateSeparators, locale, labels.today, labels.yesterday]);

  const virtualized =
    virtualize === true || (virtualize === 'auto' && rows.length > virtualizeThreshold);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller.ref.current,
    estimateSize: () => estimateSize,
    overscan: 6,
    getItemKey: (index) => rows[index]!.key,
    enabled: virtualized,
  });
  const totalSize = virtualized ? virtualizer.getTotalSize() : 0;

  // Follow new content: when messages change, and when the content grows without them changing.
  const { follow } = scroller;
  useLayoutEffect(() => {
    if (autoScroll) follow();
  }, [autoScroll, follow, messages, totalSize]);

  useEffect(() => {
    const element = inner.current;
    if (!autoScroll || !element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => follow());
    observer.observe(element);
    return () => observer.disconnect();
  }, [autoScroll, follow]);

  // Announce assistant replies as they finish, once. The first render only records what is there.
  const seen = useRef<Map<string, MessageStatus> | null>(null);
  useEffect(() => {
    const previous = seen.current;
    const next = new Map<string, MessageStatus>();
    let say = '';
    for (const message of messages) {
      next.set(message.id, message.status);
      if (!previous || message.role !== 'assistant') continue;
      const before = previous.get(message.id);
      if (message.status === 'pending' && before === undefined) say = labels.responding;
      if (message.status === 'done' && before !== 'done')
        say = labels.announce(getMessageText(message));
      if (message.status === 'error' && before !== 'error') say = labels.failed;
    }
    seen.current = next;
    if (say) setAnnouncement(say);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const renderRow = (row: Row) => {
    if (row.type === 'date') {
      return (
        <div role="separator" aria-label={row.label} className="axon-message-list__date">
          <span aria-hidden="true">{row.label}</span>
        </div>
      );
    }
    if (renderMessage) return renderMessage(row.message, row.index);
    return (
      <MessageBubble
        {...(virtualized
          ? { 'aria-posinset': row.index + 1, 'aria-setsize': messages.length }
          : null)}
        {...bubbleProps}
        message={row.message}
        locale={locale ?? bubbleProps?.locale}
      />
    );
  };

  const empty = messages.length === 0 && emptyState;

  return (
    <div className={['axon-message-list-wrap', className].filter(Boolean).join(' ')}>
      <div
        {...rest}
        ref={mergedRef}
        role="log"
        aria-label={labels.conversation}
        // The reply is announced by the status region below, once it is whole.
        aria-live="off"
        // The list scrolls, so keyboard users must be able to focus it to scroll.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="axon-message-list"
        onScroll={(event) => {
          scroller.onScroll();
          onScrollProp?.(event);
        }}
      >
        {empty ? (
          emptyState
        ) : virtualized ? (
          <div
            ref={inner}
            className="axon-message-list__inner axon-message-list__inner--virtual"
            style={{ height: totalSize }}
          >
            {virtualizer.getVirtualItems().map((item) => {
              const row = rows[item.index]!;
              return (
                <div
                  key={item.key}
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                  className="axon-message-list__row axon-message-list__row--virtual"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  {renderRow(row)}
                </div>
              );
            })}
          </div>
        ) : (
          <div ref={inner} className="axon-message-list__inner">
            {rows.map((row) => (
              <div key={row.key} className="axon-message-list__row">
                {renderRow(row)}
              </div>
            ))}
          </div>
        )}
      </div>

      {!scroller.atBottom && messages.length > 0 ? (
        <button
          type="button"
          className="axon-message-list__jump"
          onClick={() => scroller.scrollToBottom('smooth')}
        >
          <ArrowDownIcon />
          <span>{labels.jumpToLatest}</span>
        </button>
      ) : null}

      <div className="axon-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
});
