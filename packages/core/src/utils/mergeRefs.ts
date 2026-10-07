import {
  useMemo,
  version,
  type MutableRefObject,
  type ReactElement,
  type Ref,
  type RefCallback,
} from 'react';

/** Combines several refs (callback or object) into one callback ref. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as MutableRefObject<T | null>).current = node;
    }
  };
}

/** Memoised `mergeRefs`, so React does not detach and re-attach the ref on every render. */
export function useMergedRef<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => mergeRefs(...refs), refs);
}

/**
 * The ref attached to an element, for components that clone their child and need to keep it.
 * React 19 moved it from `element.ref` to `element.props.ref`; reading the old one there warns.
 */
export function getElementRef<T = unknown>(element: ReactElement): Ref<T> | undefined {
  return Number.parseInt(version, 10) >= 19
    ? (element.props as { ref?: Ref<T> }).ref
    : (element as unknown as { ref?: Ref<T> }).ref;
}
