import {
  Children,
  isValidElement,
  memo,
  useMemo,
  type AnchorHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock, type CodeBlockLabels } from '../CodeBlock/CodeBlock';

export interface MarkdownProps {
  /** The Markdown source. GitHub-flavoured: tables, task lists, strikethrough, autolinks. */
  children: string;
  /**
   * How far to push headings down so a message's `#` does not become a page-level `h1`: with the
   * default 2, `#` renders as an `h3`. Levels stop at 6.
   */
  headingOffset?: number;
  /** Open links to other sites in a new tab. Defaults to true. */
  openLinksInNewTab?: boolean;
  /** Render images. When false they show as their alt text. Defaults to true. */
  allowImages?: boolean;
  /** Labels for the code blocks' copy button. */
  codeBlockLabels?: Partial<CodeBlockLabels>;
  /** Accessible name of a scrollable table. Defaults to "Table". */
  tableLabel?: string;
  /** The names of a task list's checkboxes. Default "Done" and "Not done". */
  taskLabels?: { done: string; todo: string };
  /** Replace how any element renders. See react-markdown's `components`. */
  components?: Components;
  className?: string;
}

const DEFAULT_TASK_LABELS = { done: 'Done', todo: 'Not done' };

const isExternal = (href: string | undefined) => Boolean(href && /^(https?:)?\/\//i.test(href));

function text(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  if (isValidElement(node)) return text((node.props as { children?: ReactNode }).children);
  return '';
}

/**
 * Renders Markdown, such as an assistant's reply, with GFM tables and task lists, highlighted and
 * copyable code blocks, and safe links. Raw HTML in the source is not rendered, and
 * `javascript:` links are dropped. Headings are pushed down (see `headingOffset`).
 */
export const Markdown = memo(function Markdown({
  children,
  headingOffset = 2,
  openLinksInNewTab = true,
  allowImages = true,
  codeBlockLabels,
  tableLabel = 'Table',
  taskLabels = DEFAULT_TASK_LABELS,
  components,
  className,
}: MarkdownProps) {
  const merged = useMemo<Components>(() => {
    const heading = (level: number) => {
      const Tag = `h${Math.min(6, level + headingOffset)}` as 'h1';
      return function Heading({
        node: _node,
        ...props
      }: ComponentPropsWithoutRef<'h1'> & { node?: unknown }) {
        return <Tag {...props} className="axon-markdown__heading" />;
      };
    };

    return {
      h1: heading(1),
      h2: heading(2),
      h3: heading(3),
      h4: heading(4),
      h5: heading(5),
      h6: heading(6),
      // A fenced block arrives as <pre><code class="language-x">…</code></pre>.
      pre({ children: preChildren }) {
        const child = Children.toArray(preChildren)[0] as ReactElement<{
          className?: string;
          children?: ReactNode;
        }>;
        const language = /language-([\w+#-]+)/.exec(child?.props?.className ?? '')?.[1];
        const code = text(child?.props?.children).replace(/\n$/, '');
        return <CodeBlock code={code} language={language} labels={codeBlockLabels} />;
      },
      code({ node: _node, className: codeClass, children: codeChildren, ...props }) {
        return (
          <code {...props} className={['axon-markdown__code', codeClass].filter(Boolean).join(' ')}>
            {codeChildren}
          </code>
        );
      },
      a({
        node: _node,
        href,
        children: linkChildren,
        ...props
      }: AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) {
        const external = openLinksInNewTab && isExternal(href);
        return (
          <a
            {...props}
            href={href}
            className="axon-markdown__link"
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer nofollow' : undefined}
          >
            {linkChildren}
            {external ? <span className="axon-visually-hidden"> (opens in a new tab)</span> : null}
          </a>
        );
      },
      img({ node: _node, src, alt }) {
        if (!allowImages) return <span className="axon-markdown__alt">{alt}</span>;
        return (
          <img
            className="axon-markdown__image"
            src={typeof src === 'string' ? src : undefined}
            alt={alt ?? ''}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        );
      },
      // A task list item's checkbox is a read-only picture of its state, and says so.
      input({
        node: _node,
        type,
        checked,
        ...props
      }: ComponentPropsWithoutRef<'input'> & { node?: unknown }) {
        if (type !== 'checkbox') return <input {...props} type={type} checked={checked} />;
        return (
          <input
            type="checkbox"
            className="axon-markdown__task"
            checked={!!checked}
            readOnly
            disabled
            aria-label={checked ? taskLabels.done : taskLabels.todo}
          />
        );
      },
      // A wide table scrolls inside its own box, which therefore has to be focusable.
      table({ node: _node, children: tableChildren }) {
        return (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          <div className="axon-markdown__table" role="region" aria-label={tableLabel} tabIndex={0}>
            <table>{tableChildren}</table>
          </div>
        );
      },
      ...components,
    };
  }, [
    headingOffset,
    openLinksInNewTab,
    allowImages,
    codeBlockLabels,
    tableLabel,
    taskLabels,
    components,
  ]);

  return (
    <div className={['axon-markdown', className].filter(Boolean).join(' ')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={merged}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
