import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { IconButton, useControllableState, useId } from '@axon/core';
import type { UseChatReturn } from '../../hooks/useChat';
import { MessageIcon } from '../../internal/icons';
import { useMergedRef } from '../../internal/mergeRefs';
import type { Message, MessagePart } from '../../types';
import type { Attachment } from '../Attachments/files';
import { ChatEmptyState, type ChatEmptyStateProps } from '../ChatEmptyState/ChatEmptyState';
import { ChatHeader, type ChatHeaderProps } from '../ChatHeader/ChatHeader';
import type { MessageBubbleProps, MessageFeedback } from '../MessageBubble/MessageBubble';
import { MessageList, type MessageListProps } from '../MessageList/MessageList';
import { PromptInput, type PromptInputProps } from '../PromptInput/PromptInput';
import type { SuggestedPrompt } from '../SuggestedPrompts/SuggestedPrompts';

export interface ChatWindowLabels {
  /** The window's accessible name when there is no `title`. */
  chat: string;
  /** The launcher button of the floating widget, when closed. */
  open: string;
}

export const defaultChatWindowLabels: ChatWindowLabels = {
  chat: 'Chat',
  open: 'Open chat',
};

export interface ChatWindowProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** The chat state, from `useChat`. */
  chat: UseChatReturn;
  /**
   * `page` fills the viewport, `embedded` fills its container (give the parent a height), and
   * `floating` is a launcher button that opens a panel in the corner. Defaults to `embedded`.
   */
  mode?: 'page' | 'embedded' | 'floating';

  // Header
  title?: ReactNode;
  subtitle?: ReactNode;
  avatar?: ReactNode;
  /** Where a `ModelSelector` goes. */
  modelSelector?: ReactNode;
  /** Shows a "New chat" button. Pass `chat.reset` for the simple case. */
  onNewChat?: () => void;
  onSettings?: () => void;
  /** Shows a close button. In `floating` mode closing is handled for you. */
  onClose?: () => void;
  headerActions?: ReactNode;
  headerProps?: Partial<ChatHeaderProps>;

  // Conversation
  userName?: string;
  assistantName?: string;
  userAvatar?: ReactNode;
  assistantAvatar?: ReactNode;
  /** Props for every message bubble. */
  bubbleProps?: Omit<MessageBubbleProps, 'message'>;
  /** Called after the user rates a reply (the rating is also stored in `metadata.feedback`). */
  onFeedback?: (message: Message, feedback: MessageFeedback | null) => void;
  messageListProps?: Partial<MessageListProps>;
  /** Replaces the empty state. */
  emptyState?: ReactNode;
  emptyStateProps?: Partial<ChatEmptyStateProps>;
  /** Starter prompts for the empty state. Choosing one sends it. */
  suggestedPrompts?: SuggestedPrompt[];

  // Composer
  composerProps?: Partial<PromptInputProps>;
  /**
   * Turns the attachments of a sent message into message parts. By default images become `image`
   * parts (with a temporary blob URL) and other files `file` parts; the `File`s themselves are on
   * `metadata.files`. Replace blob URLs with uploaded ones if you store the conversation.
   */
  mapAttachments?: (attachments: Attachment[]) => MessagePart[];
  /** A line under the composer, such as "AI can make mistakes." */
  footer?: ReactNode;

  // Floating mode
  /** Whether the floating panel is open. Controlled; pair with `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The launcher's icon. */
  launcherIcon?: ReactNode;

  labels?: Partial<ChatWindowLabels>;
}

const defaultMapAttachments = (attachments: Attachment[]): MessagePart[] =>
  attachments.map<MessagePart>((attachment) =>
    attachment.type.startsWith('image/') &&
    typeof URL !== 'undefined' &&
    typeof URL.createObjectURL === 'function'
      ? { type: 'image', url: URL.createObjectURL(attachment.file), alt: attachment.name }
      : {
          type: 'file',
          name: attachment.name,
          size: attachment.size,
          mimeType: attachment.type,
        },
  );

/**
 * A complete chat: header, conversation, composer. Hand it the result of `useChat` and it wires
 * sending, stopping, regenerating, editing, deleting and rating. It works full-page, embedded in
 * a layout, or as a floating widget with a launcher button.
 */
export const ChatWindow = forwardRef<HTMLElement, ChatWindowProps>(function ChatWindow(
  {
    chat,
    mode = 'embedded',
    title,
    subtitle,
    avatar,
    modelSelector,
    onNewChat,
    onSettings,
    onClose,
    headerActions,
    headerProps,
    userName,
    assistantName,
    userAvatar,
    assistantAvatar,
    bubbleProps,
    onFeedback,
    messageListProps,
    emptyState,
    emptyStateProps,
    suggestedPrompts,
    composerProps,
    mapAttachments = defaultMapAttachments,
    footer,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    launcherIcon,
    labels: labelsProp,
    id,
    className,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const labels = { ...defaultChatWindowLabels, ...labelsProp };
  const baseId = useId(id, 'axon-chat');
  const floating = mode === 'floating';
  const [open, setOpen] = useControllableState<boolean>({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const rootRef = useRef<HTMLElement>(null);
  const mergedRef = useMergedRef<HTMLElement>(ref, rootRef);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const wasOpen = useRef(open);

  // In a floating widget, opening moves focus to the box, and closing returns it to the launcher.
  useEffect(() => {
    if (!floating) return;
    if (open && !wasOpen.current) composerRef.current?.focus();
    if (!open && wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [floating, open]);

  const send = useCallback(
    (text: string, attachments: Attachment[]) => {
      void chat.send(text, {
        parts: attachments.length > 0 ? mapAttachments(attachments) : undefined,
        metadata: attachments.length > 0 ? { files: attachments.map((a) => a.file) } : undefined,
      });
    },
    [chat, mapAttachments],
  );

  const handleFeedback = useCallback(
    (message: Message, feedback: MessageFeedback | null) => {
      chat.updateMessage(message.id, { metadata: { ...message.metadata, feedback } });
      onFeedback?.(message, feedback);
    },
    [chat, onFeedback],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (floating && open && event.key === 'Escape' && !event.defaultPrevented) {
      event.stopPropagation();
      setOpen(false);
    }
  };

  const heading = title ?? labels.chat;
  const showEmpty = chat.messages.length === 0;
  const resolvedEmpty = emptyState ?? (
    <ChatEmptyState
      prompts={suggestedPrompts}
      onPromptSelect={(prompt) => void chat.send(prompt)}
      {...emptyStateProps}
    />
  );

  const panel = (
    // Escape arrives from the focused controls inside the panel; the panel only listens for it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      {...rest}
      ref={mergedRef}
      id={baseId}
      role={floating ? 'dialog' : 'region'}
      aria-modal={floating ? false : undefined}
      aria-label={typeof heading === 'string' ? heading : labels.chat}
      className={['axon-chat-window', `axon-chat-window--${mode}`, className]
        .filter(Boolean)
        .join(' ')}
      onKeyDown={handleKeyDown}
    >
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatar={avatar}
        modelSelector={modelSelector}
        onNewChat={onNewChat}
        onSettings={onSettings}
        onClose={floating ? () => setOpen(false) : onClose}
        actions={headerActions}
        {...headerProps}
      />
      <MessageList
        messages={chat.messages}
        emptyState={showEmpty ? resolvedEmpty : undefined}
        bubbleProps={{
          userName,
          assistantName,
          userAvatar,
          assistantAvatar,
          onRegenerate: (message) => void chat.regenerate(message.id),
          onRetry: (message) => void chat.regenerate(message.id),
          onEdit: (message, content) => void chat.editAndResend(message.id, content),
          onDelete: (message) => chat.deleteMessage(message.id),
          onFeedback: handleFeedback,
          ...bubbleProps,
        }}
        {...messageListProps}
      />
      <div className="axon-chat-window__composer">
        <PromptInput
          ref={composerRef}
          value={chat.input}
          onChange={chat.setInput}
          onSubmit={send}
          streaming={chat.isStreaming}
          onStop={chat.stop}
          {...composerProps}
        />
        {footer ? <div className="axon-chat-window__footer">{footer}</div> : null}
      </div>
    </section>
  );

  if (!floating) return panel;

  return (
    <>
      {open ? panel : null}
      {open ? null : (
        <IconButton
          ref={launcherRef}
          className="axon-chat-launcher"
          variant="solid"
          color="primary"
          size="lg"
          aria-label={labels.open}
          aria-expanded={false}
          aria-controls={baseId}
          title={labels.open}
          onClick={() => setOpen(true)}
        >
          {launcherIcon ?? <MessageIcon />}
        </IconButton>
      )}
    </>
  );
});
