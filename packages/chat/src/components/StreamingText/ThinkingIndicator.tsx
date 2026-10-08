import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { useControllableState, useId } from '@axon/core';
import { ChevronRightIcon, SparklesIcon } from '../../internal/icons';

export interface ThinkingIndicatorLabels {
  /** While the model is still thinking. */
  thinking: string;
  /** After it finished and there is no duration. */
  thought: string;
  /** After it finished, with how long it took in whole seconds. */
  thoughtFor: (seconds: number) => string;
}

export const defaultThinkingLabels: ThinkingIndicatorLabels = {
  thinking: 'Thinking…',
  thought: 'Thought process',
  thoughtFor: (seconds) => `Thought for ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`,
};

export interface ThinkingIndicatorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** The model's reasoning. Without it the indicator is just a "Thinking…" label. */
  children?: ReactNode;
  /** Whether the model is still thinking. */
  thinking?: boolean;
  /** How long it thought, in seconds. */
  duration?: number;
  /** Whether the reasoning is shown. Controlled; pair with `onOpenChange`. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  labels?: Partial<ThinkingIndicatorLabels>;
}

/**
 * A model's reasoning, collapsed by default: a button that says "Thinking…" or "Thought for 8
 * seconds" and reveals the text. Without any reasoning text it is a plain status label.
 */
export const ThinkingIndicator = forwardRef<HTMLDivElement, ThinkingIndicatorProps>(
  function ThinkingIndicator(
    {
      children,
      thinking = false,
      duration,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      labels: labelsProp,
      id,
      className,
      ...rest
    },
    ref,
  ) {
    const labels = { ...defaultThinkingLabels, ...labelsProp };
    const [open, setOpen] = useControllableState<boolean>({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    });
    const baseId = useId(id, 'axon-thinking');
    const label = thinking
      ? labels.thinking
      : duration !== undefined
        ? labels.thoughtFor(Math.max(0, Math.round(duration)))
        : labels.thought;
    const hasContent = children !== undefined && children !== null && children !== false;

    return (
      <div
        {...rest}
        ref={ref}
        id={baseId}
        className={[
          'axon-thinking',
          thinking && 'axon-thinking--active',
          open && 'axon-thinking--open',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {hasContent ? (
          <button
            type="button"
            className="axon-thinking__toggle"
            aria-expanded={open}
            aria-controls={`${baseId}-content`}
            onClick={() => setOpen(!open)}
          >
            <SparklesIcon className="axon-thinking__icon" />
            <span className="axon-thinking__label">{label}</span>
            <ChevronRightIcon className="axon-thinking__chevron" />
          </button>
        ) : (
          <div className="axon-thinking__toggle axon-thinking__toggle--static" role="status">
            <SparklesIcon className="axon-thinking__icon" />
            <span className="axon-thinking__label">{label}</span>
            {thinking ? (
              <span className="axon-typing" aria-hidden="true">
                <span className="axon-typing__dot" />
                <span className="axon-typing__dot" />
                <span className="axon-typing__dot" />
              </span>
            ) : null}
          </div>
        )}
        {hasContent ? (
          <div
            id={`${baseId}-content`}
            className="axon-thinking__content"
            role="region"
            aria-label={labels.thought}
            hidden={!open}
          >
            {children}
          </div>
        ) : null}
      </div>
    );
  },
);
