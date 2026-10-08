import { forwardRef, type HTMLAttributes } from 'react';
import { useId } from '@axonui/core';
import { ExternalLinkIcon } from '../../internal/icons';

export interface Source {
  /** Used for the element id, so a citation can point at it. Defaults to the position. */
  id?: string;
  title: string;
  url?: string;
  snippet?: string;
}

export interface SourceListProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  sources: Source[];
  /** The heading above the list. Defaults to "Sources". */
  title?: string;
  /** Where the id of each item comes from; default `<list id>-<n>`. A citation links to it. */
  getSourceId?: (source: Source, index: number) => string;
}

const hostname = (url: string | undefined) => {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
};

/**
 * The sources an answer is based on: a numbered list of links with their site and a snippet. The
 * numbers match `Citation` markers in the text. Links open in a new tab.
 */
export const SourceList = forwardRef<HTMLElement, SourceListProps>(function SourceList(
  { sources, title = 'Sources', getSourceId, id, className, ...rest },
  ref,
) {
  const baseId = useId(id, 'axon-sources');
  if (sources.length === 0) return null;

  return (
    <section
      {...rest}
      ref={ref}
      id={baseId}
      aria-labelledby={`${baseId}-title`}
      className={['axon-sources', className].filter(Boolean).join(' ')}
    >
      <h4 id={`${baseId}-title`} className="axon-sources__title">
        {title}
      </h4>
      <ol className="axon-sources__list">
        {sources.map((source, index) => {
          const site = hostname(source.url);
          const itemId = getSourceId?.(source, index) ?? source.id ?? `${baseId}-${index + 1}`;
          return (
            <li key={itemId} id={itemId} className="axon-sources__item">
              <span className="axon-sources__number" aria-hidden="true">
                {index + 1}
              </span>
              <div className="axon-sources__body">
                {source.url ? (
                  <a
                    className="axon-sources__link"
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    <span className="axon-sources__name">{source.title}</span>
                    <ExternalLinkIcon className="axon-sources__external" />
                    <span className="axon-visually-hidden"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="axon-sources__name">{source.title}</span>
                )}
                {site ? <span className="axon-sources__site">{site}</span> : null}
                {source.snippet ? <p className="axon-sources__snippet">{source.snippet}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
});

export interface CitationProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** The source's number, starting at 1. */
  index: number;
  /** The id of the source it points at (see `SourceList`). */
  sourceId: string;
  /** What screen readers announce. Defaults to "Source <index>". */
  label?: string;
}

/** A small superscript `[1]` that links to a source in a `SourceList`. */
export const Citation = forwardRef<HTMLElement, CitationProps>(function Citation(
  { index, sourceId, label, className, ...rest },
  ref,
) {
  return (
    <sup {...rest} ref={ref} className={['axon-citation', className].filter(Boolean).join(' ')}>
      <a href={`#${sourceId}`} aria-label={label ?? `Source ${index}`}>
        [{index}]
      </a>
    </sup>
  );
});
