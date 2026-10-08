import { forwardRef, type HTMLAttributes } from 'react';

export interface TypingIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  /** What screen readers announce. Defaults to "Assistant is typing". */
  label?: string;
}

/** Three bouncing dots: someone, or something, is about to answer. A polite `status`. */
export const TypingIndicator = forwardRef<HTMLSpanElement, TypingIndicatorProps>(
  function TypingIndicator({ label = 'Assistant is typing', className, ...rest }, ref) {
    return (
      <span
        {...rest}
        ref={ref}
        role="status"
        className={['axon-typing', className].filter(Boolean).join(' ')}
      >
        <span className="axon-typing__dot" aria-hidden="true" />
        <span className="axon-typing__dot" aria-hidden="true" />
        <span className="axon-typing__dot" aria-hidden="true" />
        <span className="axon-visually-hidden">{label}</span>
      </span>
    );
  },
);
