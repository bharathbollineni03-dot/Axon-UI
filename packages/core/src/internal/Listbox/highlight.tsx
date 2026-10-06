import type { ReactNode } from 'react';

/**
 * Wraps the first case-insensitive occurrence of `query` in a styled span. (Not `<mark>`, which
 * some screen readers announce as a "highlight".)
 */
export function highlightMatch(text: string, query: string): ReactNode {
  const needle = query.trim();
  if (!needle) return text;
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="axon-listbox__match">{text.slice(index, index + needle.length)}</span>
      {text.slice(index + needle.length)}
    </>
  );
}
