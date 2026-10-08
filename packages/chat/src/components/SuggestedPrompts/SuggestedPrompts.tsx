import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useId } from '@axonui/core';

export interface SuggestedPrompt {
  /** What the card says, e.g. "Summarize this article". */
  title: string;
  /** A second line. */
  description?: string;
  /** What is sent when it is chosen. Defaults to the title. */
  prompt?: string;
  icon?: ReactNode;
}

export interface SuggestedPromptsProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'title' | 'onSelect'
> {
  prompts: SuggestedPrompt[];
  /** Called with the text to send (the prompt's `prompt`, or its title). */
  onSelect: (prompt: string, suggestion: SuggestedPrompt) => void;
  /** A heading above the prompts. Without it, give the section an `aria-label`. */
  title?: ReactNode;
  /** `cards` (default) are boxes with a description; `chips` are compact pills. */
  layout?: 'cards' | 'chips';
  /** How many columns the cards use from the `sm` breakpoint up. Defaults to 2. */
  columns?: 1 | 2 | 3;
  disabled?: boolean;
}

/**
 * Starter prompts for an empty chat: cards or chips that send a message when pressed. A list of
 * buttons, reachable by Tab; nothing is sent until the user chooses one.
 */
export const SuggestedPrompts = forwardRef<HTMLElement, SuggestedPromptsProps>(
  function SuggestedPrompts(
    {
      prompts,
      onSelect,
      title,
      layout = 'cards',
      columns = 2,
      disabled = false,
      id,
      className,
      ...rest
    },
    ref,
  ) {
    const baseId = useId(id, 'axon-suggested');
    if (prompts.length === 0) return null;
    return (
      <section
        {...rest}
        ref={ref}
        id={baseId}
        aria-labelledby={title ? `${baseId}-title` : rest['aria-labelledby']}
        className={[
          'axon-suggested',
          `axon-suggested--${layout}`,
          `axon-suggested--cols-${columns}`,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {title ? (
          <h3 id={`${baseId}-title`} className="axon-suggested__title">
            {title}
          </h3>
        ) : null}
        <ul className="axon-suggested__list">
          {prompts.map((suggestion) => (
            <li key={suggestion.title} className="axon-suggested__item">
              <button
                type="button"
                className="axon-suggested__button"
                disabled={disabled}
                onClick={() => onSelect(suggestion.prompt ?? suggestion.title, suggestion)}
              >
                {suggestion.icon ? (
                  <span className="axon-suggested__icon" aria-hidden="true">
                    {suggestion.icon}
                  </span>
                ) : null}
                <span className="axon-suggested__text">
                  <span className="axon-suggested__name">{suggestion.title}</span>
                  {suggestion.description && layout === 'cards' ? (
                    <span className="axon-suggested__description">{suggestion.description}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  },
);
