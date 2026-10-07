import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { IconButton } from '@axon/core';
import { CloseIcon, PlusIcon, SettingsIcon } from '../../internal/icons';

export interface ChatHeaderLabels {
  newChat: string;
  settings: string;
  close: string;
}

export const defaultChatHeaderLabels: ChatHeaderLabels = {
  newChat: 'New chat',
  settings: 'Chat settings',
  close: 'Close chat',
};

export interface ChatHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  /** A second line under the title, such as the model name or "Online". */
  subtitle?: ReactNode;
  /** An avatar or logo before the title. */
  avatar?: ReactNode;
  /** Where a model selector goes. */
  modelSelector?: ReactNode;
  /** Shows a "New chat" button. */
  onNewChat?: () => void;
  /** Shows a settings button. */
  onSettings?: () => void;
  /** Shows a close button, for a window you can dismiss. */
  onClose?: () => void;
  /** Extra buttons, placed before the built-in ones. */
  actions?: ReactNode;
  /** The title's heading level. Defaults to 2. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  labels?: Partial<ChatHeaderLabels>;
}

/**
 * The top of a chat window: a title, an optional model selector slot, and buttons for a new chat,
 * settings and closing. Every button appears only when you pass its handler.
 */
export const ChatHeader = forwardRef<HTMLElement, ChatHeaderProps>(function ChatHeader(
  {
    title,
    subtitle,
    avatar,
    modelSelector,
    onNewChat,
    onSettings,
    onClose,
    actions,
    headingLevel = 2,
    labels: labelsProp,
    className,
    ...rest
  },
  ref,
) {
  const labels = { ...defaultChatHeaderLabels, ...labelsProp };
  const Heading = `h${headingLevel}` as ElementType;
  const hasButtons = Boolean(onNewChat || onSettings || onClose || actions);

  return (
    <header
      {...rest}
      ref={ref}
      className={['axon-chat-header', className].filter(Boolean).join(' ')}
    >
      {avatar ? <div className="axon-chat-header__avatar">{avatar}</div> : null}
      <div className="axon-chat-header__titles">
        {title ? <Heading className="axon-chat-header__title">{title}</Heading> : null}
        {subtitle ? <p className="axon-chat-header__subtitle">{subtitle}</p> : null}
      </div>
      {modelSelector ? <div className="axon-chat-header__model">{modelSelector}</div> : null}
      {hasButtons ? (
        <div className="axon-chat-header__actions">
          {actions}
          {onNewChat ? (
            <IconButton aria-label={labels.newChat} title={labels.newChat} onClick={onNewChat}>
              <PlusIcon />
            </IconButton>
          ) : null}
          {onSettings ? (
            <IconButton aria-label={labels.settings} title={labels.settings} onClick={onSettings}>
              <SettingsIcon />
            </IconButton>
          ) : null}
          {onClose ? (
            <IconButton aria-label={labels.close} title={labels.close} onClick={onClose}>
              <CloseIcon />
            </IconButton>
          ) : null}
        </div>
      ) : null}
    </header>
  );
});
