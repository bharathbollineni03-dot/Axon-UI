import { forwardRef, type HTMLAttributes } from 'react';
import { Markdown, type MarkdownProps } from '../Markdown/Markdown';

export interface StreamingTextProps
  extends
    Omit<HTMLAttributes<HTMLDivElement>, 'children'>,
    Pick<
      MarkdownProps,
      'headingOffset' | 'openLinksInNewTab' | 'allowImages' | 'codeBlockLabels' | 'components'
    > {
  /** The text so far, as Markdown. */
  text: string;
  /** Shows a blinking cursor after the last character while tokens are still arriving. */
  streaming?: boolean;
}

/**
 * Assistant text that is still arriving: Markdown with a blinking cursor at its end. The cursor
 * is drawn with CSS after the last block, so it adds nothing to what a screen reader reads, and
 * it stops blinking for people who prefer reduced motion.
 */
export const StreamingText = forwardRef<HTMLDivElement, StreamingTextProps>(function StreamingText(
  {
    text,
    streaming = false,
    className,
    headingOffset,
    openLinksInNewTab,
    allowImages,
    codeBlockLabels,
    components,
    ...rest
  },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      className={['axon-streaming-text', streaming && 'axon-streaming-text--active', className]
        .filter(Boolean)
        .join(' ')}
    >
      <Markdown
        headingOffset={headingOffset}
        openLinksInNewTab={openLinksInNewTab}
        allowImages={allowImages}
        codeBlockLabels={codeBlockLabels}
        components={components}
      >
        {text}
      </Markdown>
    </div>
  );
});
