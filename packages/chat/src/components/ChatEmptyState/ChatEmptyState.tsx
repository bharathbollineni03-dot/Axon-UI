import { forwardRef, type HTMLAttributes, type ElementType, type ReactNode } from 'react';
import { SparklesIcon } from '../../internal/icons';
import { SuggestedPrompts, type SuggestedPrompt } from '../SuggestedPrompts/SuggestedPrompts';

export interface ChatEmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The headline. Defaults to "How can I help you today?". */
  title?: ReactNode;
  description?: ReactNode;
  /** A logo or illustration. Defaults to a sparkle. */
  icon?: ReactNode;
  /** Starter prompts under the headline. */
  prompts?: SuggestedPrompt[];
  /** Called with the text of the prompt the user chose. */
  onPromptSelect?: (prompt: string, suggestion: SuggestedPrompt) => void;
  /** `cards` (default) or `chips`. */
  promptLayout?: 'cards' | 'chips';
  /** Heading element for the title. Defaults to `h2`. */
  titleAs?: ElementType;
  /** Heading above the prompts, such as "Try asking". */
  promptsTitle?: ReactNode;
  children?: ReactNode;
}

/**
 * What a chat shows before the first message: a headline, a line of help and, optionally, starter
 * prompts that send a message when chosen.
 */
export const ChatEmptyState = forwardRef<HTMLDivElement, ChatEmptyStateProps>(
  function ChatEmptyState(
    {
      title = 'How can I help you today?',
      description,
      icon,
      prompts,
      onPromptSelect,
      promptLayout = 'cards',
      titleAs = 'h2',
      promptsTitle,
      className,
      children,
      ...rest
    },
    ref,
  ) {
    const Title = titleAs;
    return (
      <div {...rest} ref={ref} className={['axon-chat-empty', className].filter(Boolean).join(' ')}>
        <div className="axon-chat-empty__icon" aria-hidden="true">
          {icon ?? <SparklesIcon />}
        </div>
        <Title className="axon-chat-empty__title">{title}</Title>
        {description ? <p className="axon-chat-empty__description">{description}</p> : null}
        {prompts && prompts.length > 0 && onPromptSelect ? (
          <SuggestedPrompts
            className="axon-chat-empty__prompts"
            prompts={prompts}
            onSelect={onPromptSelect}
            layout={promptLayout}
            title={promptsTitle}
            aria-label={promptsTitle ? undefined : 'Suggested prompts'}
          />
        ) : null}
        {children}
      </div>
    );
  },
);
