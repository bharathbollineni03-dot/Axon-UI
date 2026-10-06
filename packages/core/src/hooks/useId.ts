import { useId as useReactId } from 'react';

/**
 * A stable, SSR-safe id for linking labels and descriptions to controls (`htmlFor`,
 * `aria-describedby`). Wraps React's `useId`; pass `idProp` to let callers choose the id, and a
 * `prefix` to make it readable in the DOM.
 */
export function useId(idProp?: string, prefix = 'axon'): string {
  const generated = useReactId();
  // React ids look like ":r1:"; strip the colons so the id is safe in CSS selectors.
  return idProp ?? `${prefix}-${generated.replace(/:/g, '')}`;
}
