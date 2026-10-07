import { forwardRef, useMemo, type HTMLAttributes } from 'react';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { highlightCode } from '../../internal/highlight';
import { CheckIcon, CopyIcon } from '../../internal/icons';

export interface CodeBlockLabels {
  /** The copy button. */
  copy: string;
  /** The copy button for a moment after a successful copy. */
  copied: string;
  /** The accessible name of the scrollable code, given the language. */
  code: (language: string) => string;
}

export const defaultCodeBlockLabels: CodeBlockLabels = {
  copy: 'Copy code',
  copied: 'Copied',
  code: (language) => `${language} code`,
};

export interface CodeBlockProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'onCopy'
> {
  code: string;
  /** A language name (`ts`, `python`, `json`, ...). Unknown or missing shows plain text. */
  language?: string;
  /** Shown in the header instead of the language, for example `src/app.ts`. */
  filename?: string;
  /** Number each line. */
  showLineNumbers?: boolean;
  /** Wraps long lines instead of scrolling sideways. */
  wrap?: boolean;
  labels?: Partial<CodeBlockLabels>;
  /** Called after the code was copied. */
  onCopy?: (code: string) => void;
}

/**
 * A block of code with syntax highlighting, a language label and a copy button. The highlighter
 * escapes every character, so the markup is safe to render. The code area is keyboard-scrollable.
 */
export const CodeBlock = forwardRef<HTMLDivElement, CodeBlockProps>(function CodeBlock(
  {
    code,
    language,
    filename,
    showLineNumbers = false,
    wrap = false,
    labels: labelsProp,
    onCopy,
    className,
    ...rest
  },
  ref,
) {
  const labels = { ...defaultCodeBlockLabels, ...labelsProp };
  const { copy, copied } = useCopyToClipboard();
  const highlighted = useMemo(() => highlightCode(code, language), [code, language]);
  const shownLanguage = highlighted.language ?? language?.trim().toLowerCase() ?? 'text';
  const lineCount = code.split('\n').length;

  const handleCopy = async () => {
    if (await copy(code)) onCopy?.(code);
  };

  return (
    <div
      {...rest}
      ref={ref}
      className={['axon-code-block', wrap && 'axon-code-block--wrap', className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="axon-code-block__header">
        <span className="axon-code-block__title">{filename ?? shownLanguage}</span>
        <button type="button" className="axon-code-block__copy" onClick={handleCopy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span>{copied ? labels.copied : labels.copy}</span>
        </button>
        {/* Announces the copy for screen readers; the button label alone is not live. */}
        <span className="axon-visually-hidden" role="status">
          {copied ? labels.copied : ''}
        </span>
      </div>
      {/* The area scrolls, so it must be reachable by keyboard. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <pre className="axon-code-block__pre" tabIndex={0} aria-label={labels.code(shownLanguage)}>
        {showLineNumbers ? (
          <span className="axon-code-block__lines" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, index) => (
              <span key={index}>{index + 1}</span>
            ))}
          </span>
        ) : null}
        <code
          className={`axon-code-block__code hljs language-${shownLanguage}`}
          // Safe: `highlightCode` escapes the whole input, and only adds `hljs-*` spans.
          dangerouslySetInnerHTML={{ __html: highlighted.html }}
        />
      </pre>
    </div>
  );
});
