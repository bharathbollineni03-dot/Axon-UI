import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Avatar, Button, IconButton, TextArea } from '@axonui/core';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import {
  CheckIcon,
  CopyIcon,
  EditIcon,
  FileIcon,
  RefreshIcon,
  SparklesIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TrashIcon,
} from '../../internal/icons';
import { Toolbar } from '../../internal/Toolbar';
import {
  getMessageText,
  type FilePart,
  type Message,
  type MessagePart,
  type ReasoningPart,
  type SourcePart,
  type ToolCallPart,
  type ToolResultPart,
} from '../../types';
import { CodeBlock } from '../CodeBlock/CodeBlock';
import type { MarkdownProps } from '../Markdown/Markdown';
import { SourceList } from '../SourceList/SourceList';
import { StreamingText } from '../StreamingText/StreamingText';
import { ThinkingIndicator } from '../StreamingText/ThinkingIndicator';
import { TypingIndicator } from '../StreamingText/TypingIndicator';
import { ToolCallCard } from '../ToolCallCard/ToolCallCard';

export type MessageAction = 'copy' | 'edit' | 'regenerate' | 'feedback' | 'delete';
export type MessageFeedback = 'up' | 'down';

export interface MessageBubbleLabels {
  you: string;
  assistant: string;
  system: string;
  tool: string;
  /** The accessible name of the message, e.g. "Assistant, 3:42 PM". */
  messageFrom: (name: string, time: string | undefined) => string;
  actions: string;
  copy: string;
  copied: string;
  edit: string;
  regenerate: string;
  thumbsUp: string;
  thumbsDown: string;
  delete: string;
  editLabel: string;
  save: string;
  cancel: string;
  error: string;
  retry: string;
  typing: string;
  sources: string;
  attachments: string;
}

export const defaultMessageBubbleLabels: MessageBubbleLabels = {
  you: 'You',
  assistant: 'Assistant',
  system: 'System',
  tool: 'Tool',
  messageFrom: (name, time) => (time ? `${name}, ${time}` : name),
  actions: 'Message actions',
  copy: 'Copy message',
  copied: 'Copied',
  edit: 'Edit message',
  regenerate: 'Regenerate response',
  thumbsUp: 'Good response',
  thumbsDown: 'Bad response',
  delete: 'Delete message',
  editLabel: 'Edit your message',
  save: 'Save and resend',
  cancel: 'Cancel',
  error: 'The reply could not be completed.',
  retry: 'Try again',
  typing: 'Assistant is typing',
  sources: 'Sources',
  attachments: 'Attachments',
};

export interface MessageBubbleProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'id' | 'onCopy'
> {
  message: Message;
  /** Name for the user's messages. Defaults to "You". */
  userName?: string;
  /** Name for the assistant's messages. Defaults to "Assistant". */
  assistantName?: string;
  /** Replaces the default avatar of the user, or of the assistant. */
  userAvatar?: ReactNode;
  assistantAvatar?: ReactNode;
  /** Shows an avatar beside each message. Defaults to true. */
  showAvatar?: boolean;
  /** When to show the time: `hover` (default, and always on touch screens), `always` or `never`. */
  timestamp?: 'hover' | 'always' | 'never';
  locale?: string;
  /** Formats the time. Defaults to the locale's short time. */
  formatTimestamp?: (time: number) => string;
  /**
   * Which actions to offer. By default: copy, plus each one whose handler you pass. Pass a list
   * to offer fewer, or `false` for none.
   */
  actions?: MessageAction[] | false;
  /**
   * The feedback already given on this message, so the buttons show it. Defaults to
   * `message.metadata.feedback`, which `ChatWindow` fills in.
   */
  feedback?: MessageFeedback | null;
  onCopy?: (message: Message) => void;
  /** Receives the new text when the user saves an edit. Offers "Edit" on the user's messages. */
  onEdit?: (message: Message, content: string) => void;
  /** Offers "Regenerate" on the assistant's finished messages. */
  onRegenerate?: (message: Message) => void;
  /** Offers thumbs up and down on the assistant's messages. `null` means the user took it back. */
  onFeedback?: (message: Message, feedback: MessageFeedback | null) => void;
  onDelete?: (message: Message) => void;
  /** Shows a "Try again" button on a failed reply. */
  onRetry?: (message: Message) => void;
  /** Passed to the Markdown renderer for the assistant's text. */
  markdownProps?: Partial<
    Pick<MarkdownProps, 'headingOffset' | 'allowImages' | 'openLinksInNewTab' | 'components'>
  >;
  labels?: Partial<MessageBubbleLabels>;
}

const formatSize = (bytes: number | undefined) => {
  if (bytes === undefined) return undefined;
  if (bytes >= 1024 * 1024) return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;
  if (bytes >= 1024) return `${Number((bytes / 1024).toFixed(1))} KB`;
  return `${bytes} B`;
};

/** Pairs each tool call with its result, and lists the sources separately. */
function organise(parts: MessagePart[]) {
  const results = new Map<string, ToolResultPart>();
  for (const part of parts) {
    if (part.type === 'tool-result') results.set(part.callId, part);
  }
  const called = new Set(
    parts.filter((part): part is ToolCallPart => part.type === 'tool-call').map((part) => part.id),
  );
  const body: MessagePart[] = [];
  const sources: SourcePart[] = [];
  const files: FilePart[] = [];
  for (const part of parts) {
    if (part.type === 'source') sources.push(part);
    else if (part.type === 'file') files.push(part);
    else if (part.type === 'tool-result' && called.has(part.callId)) continue;
    else body.push(part);
  }
  return { body, sources, files, results };
}

interface ContentProps {
  message: Message;
  labels: MessageBubbleLabels;
  markdownProps: MessageBubbleProps['markdownProps'];
}

function MessageContent({ message, labels, markdownProps }: ContentProps) {
  const isUser = message.role === 'user';
  const streaming = message.status === 'streaming';

  if (message.status === 'pending' && !message.content && !message.parts?.length) {
    return <TypingIndicator label={labels.typing} />;
  }

  const parts: MessagePart[] = message.parts?.length
    ? message.parts
    : message.content
      ? [{ type: 'text', text: message.content }]
      : [];
  const { body, sources, files, results } = organise(parts);
  const lastTextIndex = body.map((part) => part.type).lastIndexOf('text');

  return (
    <>
      {body.map((part, index) => {
        switch (part.type) {
          case 'text':
            return isUser ? (
              <p key={index} className="axon-message__text">
                {part.text}
              </p>
            ) : (
              <StreamingText
                key={index}
                text={part.text}
                streaming={streaming && index === lastTextIndex}
                {...markdownProps}
              />
            );
          case 'code':
            return (
              <CodeBlock
                key={index}
                code={part.code}
                language={part.language}
                filename={part.filename}
              />
            );
          case 'image':
            return (
              <img
                key={index}
                className="axon-message__image"
                src={part.url}
                alt={part.alt ?? ''}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            );
          case 'reasoning': {
            const reasoning = part as ReasoningPart;
            return (
              <ThinkingIndicator
                key={index}
                thinking={streaming && index === body.length - 1}
                duration={reasoning.duration}
              >
                {reasoning.text}
              </ThinkingIndicator>
            );
          }
          case 'tool-call': {
            const result = results.get(part.id);
            return (
              <ToolCallCard
                key={index}
                name={part.name}
                arguments={part.arguments}
                result={result?.result}
                isError={result?.isError}
                status={part.status}
              />
            );
          }
          case 'tool-result':
            return (
              <ToolCallCard
                key={index}
                name={part.name ?? 'tool'}
                result={part.result}
                isError={part.isError}
              />
            );
          default:
            return null;
        }
      })}
      {files.length > 0 ? (
        <ul className="axon-message__files" aria-label={labels.attachments}>
          {files.map((file, index) => (
            <li key={index} className="axon-message__file">
              <FileIcon />
              {file.url ? (
                <a href={file.url} target="_blank" rel="noopener noreferrer">
                  {file.name}
                </a>
              ) : (
                <span>{file.name}</span>
              )}
              {file.size !== undefined ? (
                <span className="axon-message__file-size">{formatSize(file.size)}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {sources.length > 0 ? <SourceList sources={sources} title={labels.sources} /> : null}
    </>
  );
}

/**
 * One message in a conversation: an avatar, the content (Markdown, code, images, tool calls,
 * reasoning, sources) and a toolbar of actions. A user message can be edited in place; a failed
 * reply shows an error with a retry button. The root is an `article` named by who it is from.
 */
export const MessageBubble = forwardRef<HTMLElement, MessageBubbleProps>(function MessageBubble(
  {
    message,
    userName,
    assistantName,
    userAvatar,
    assistantAvatar,
    showAvatar = true,
    timestamp = 'hover',
    locale,
    formatTimestamp,
    actions,
    feedback: feedbackProp,
    onCopy,
    onEdit,
    onRegenerate,
    onFeedback,
    onDelete,
    onRetry,
    markdownProps,
    labels: labelsProp,
    className,
    ...rest
  },
  ref,
) {
  const labels = { ...defaultMessageBubbleLabels, ...labelsProp };
  const { copy, copied } = useCopyToClipboard();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const name = isUser
    ? (userName ?? labels.you)
    : isAssistant
      ? (assistantName ?? labels.assistant)
      : message.role === 'system'
        ? labels.system
        : labels.tool;
  const timeText =
    message.createdAt === undefined
      ? undefined
      : (formatTimestamp?.(message.createdAt) ??
        new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
          new Date(message.createdAt),
        ));
  const settled = message.status === 'done';
  const stored = (message.metadata as { feedback?: unknown } | undefined)?.feedback;
  const feedback: MessageFeedback | null =
    feedbackProp !== undefined
      ? feedbackProp
      : stored === 'up' || stored === 'down'
        ? stored
        : null;
  const text = getMessageText(message);

  const offered = (action: MessageAction): boolean => {
    if (actions === false || message.role === 'system') return false;
    if (actions && !actions.includes(action)) return false;
    switch (action) {
      case 'copy':
        return Boolean(text) && settled;
      case 'edit':
        return isUser && Boolean(onEdit);
      case 'regenerate':
        return isAssistant && settled && Boolean(onRegenerate);
      case 'feedback':
        return isAssistant && settled && Boolean(onFeedback);
      case 'delete':
        return Boolean(onDelete);
    }
  };
  const showActions =
    !editing && (['copy', 'edit', 'regenerate', 'feedback', 'delete'] as const).some(offered);

  const startEditing = () => {
    setDraft(text);
    setEditing(true);
  };

  const saveEdit = () => {
    const next = draft.trim();
    if (next && next !== text) onEdit?.(message, next);
    setEditing(false);
  };

  const handleEditKeys = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setEditing(false);
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      saveEdit();
    }
  };

  const avatar = isUser
    ? (userAvatar ?? <Avatar name={name} size="sm" color="neutral" />)
    : isAssistant
      ? (assistantAvatar ?? (
          <Avatar name={name} size="sm" color="primary" fallback={<SparklesIcon />} />
        ))
      : null;

  if (message.role === 'system') {
    return (
      <article
        {...rest}
        ref={ref}
        aria-label={labels.messageFrom(name, timeText)}
        className={['axon-message', 'axon-message--system', className].filter(Boolean).join(' ')}
      >
        <p className="axon-message__system-text">{text}</p>
      </article>
    );
  }

  return (
    <article
      {...rest}
      ref={ref}
      aria-label={labels.messageFrom(name, timeText)}
      aria-busy={message.status === 'pending' || message.status === 'streaming' || undefined}
      data-message-id={message.id}
      className={[
        'axon-message',
        `axon-message--${message.role}`,
        `axon-message--${message.status}`,
        editing && 'axon-message--editing',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showAvatar && avatar ? <div className="axon-message__avatar">{avatar}</div> : null}
      <div className="axon-message__main">
        <div className="axon-message__bubble">
          {editing ? (
            <div className="axon-message__edit">
              <TextArea
                label={labels.editLabel}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleEditKeys}
                autoResize
                minRows={2}
                maxRows={10}
                fullWidth
                // Opening the editor is the user's request, so moving focus into it is expected.
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <div className="axon-message__edit-actions">
                <Button size="sm" variant="ghost" color="neutral" onClick={() => setEditing(false)}>
                  {labels.cancel}
                </Button>
                <Button size="sm" onClick={saveEdit} disabled={!draft.trim()}>
                  {labels.save}
                </Button>
              </div>
            </div>
          ) : (
            <MessageContent message={message} labels={labels} markdownProps={markdownProps} />
          )}
          {message.status === 'error' ? (
            <div className="axon-message__error" role="alert">
              <span>{labels.error}</span>
              {onRetry ? (
                <Button size="sm" variant="outline" color="danger" onClick={() => onRetry(message)}>
                  {labels.retry}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {showActions || (timestamp !== 'never' && timeText) ? (
          <div className="axon-message__meta">
            {timestamp !== 'never' && timeText ? (
              <time
                className={[
                  'axon-message__time',
                  timestamp === 'always' && 'axon-message__time--always',
                ]
                  .filter(Boolean)
                  .join(' ')}
                dateTime={new Date(message.createdAt).toISOString()}
                suppressHydrationWarning
              >
                {timeText}
              </time>
            ) : null}
            {showActions ? (
              <Toolbar className="axon-message__actions" aria-label={labels.actions}>
                {offered('copy') ? (
                  <IconButton
                    size="sm"
                    aria-label={copied ? labels.copied : labels.copy}
                    title={copied ? labels.copied : labels.copy}
                    onClick={async () => {
                      if (await copy(text)) onCopy?.(message);
                    }}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </IconButton>
                ) : null}
                {offered('edit') ? (
                  <IconButton
                    size="sm"
                    aria-label={labels.edit}
                    title={labels.edit}
                    onClick={startEditing}
                  >
                    <EditIcon />
                  </IconButton>
                ) : null}
                {offered('regenerate') ? (
                  <IconButton
                    size="sm"
                    aria-label={labels.regenerate}
                    title={labels.regenerate}
                    onClick={() => onRegenerate?.(message)}
                  >
                    <RefreshIcon />
                  </IconButton>
                ) : null}
                {offered('feedback') ? (
                  <>
                    <IconButton
                      size="sm"
                      aria-label={labels.thumbsUp}
                      title={labels.thumbsUp}
                      aria-pressed={feedback === 'up'}
                      className={feedback === 'up' ? 'axon-message__action--on' : undefined}
                      onClick={() => onFeedback?.(message, feedback === 'up' ? null : 'up')}
                    >
                      <ThumbsUpIcon />
                    </IconButton>
                    <IconButton
                      size="sm"
                      aria-label={labels.thumbsDown}
                      title={labels.thumbsDown}
                      aria-pressed={feedback === 'down'}
                      className={feedback === 'down' ? 'axon-message__action--on' : undefined}
                      onClick={() => onFeedback?.(message, feedback === 'down' ? null : 'down')}
                    >
                      <ThumbsDownIcon />
                    </IconButton>
                  </>
                ) : null}
                {offered('delete') ? (
                  <IconButton
                    size="sm"
                    color="danger"
                    aria-label={labels.delete}
                    title={labels.delete}
                    onClick={() => onDelete?.(message)}
                  >
                    <TrashIcon />
                  </IconButton>
                ) : null}
              </Toolbar>
            ) : null}
            {/* The copy button's label is not live, so confirm the copy here. */}
            <span className="axon-visually-hidden" role="status">
              {copied ? labels.copied : ''}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
});
