import { forwardRef, type HTMLAttributes, type Ref } from 'react';
import { cx } from '../../utils/cx';

export interface CodeProps extends HTMLAttributes<HTMLElement> {
  /**
   * Renders a preformatted block (`<pre><code>`) that keeps whitespace and scrolls sideways,
   * instead of inline code.
   */
  block?: boolean;
  /** Programming language, exposed as `data-language` for syntax highlighters. */
  language?: string;
}

/** Inline code, or a code block with `block`. Content is shown as plain text. */
export const Code = forwardRef<HTMLElement, CodeProps>(function Code(
  { block = false, language, className, children, ...rest },
  ref,
) {
  if (block) {
    return (
      <pre
        // Code blocks scroll sideways, so keyboard users need to be able to focus (and scroll) them.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        {...rest}
        ref={ref as Ref<HTMLPreElement>}
        className={cx('axon-code-block', className)}
      >
        <code data-language={language}>{children}</code>
      </pre>
    );
  }
  return (
    <code {...rest} ref={ref} data-language={language} className={cx('axon-code', className)}>
      {children}
    </code>
  );
});
