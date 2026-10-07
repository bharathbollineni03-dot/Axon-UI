import { useCallback, useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '../hooks/useIsomorphicLayoutEffect';

/**
 * Tracks whether an `<img>` failed to load. Spread `imgProps` onto the image.
 *
 * An error can fire before React hydrates (so no `onError` is seen); on mount the hook also checks
 * for an image that already finished loading with no pixels. The failed flag resets when `src` changes.
 */
export function useImageStatus(src: string | undefined) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>();
  const ref = useRef<HTMLImageElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    const image = ref.current;
    if (src && image && image.complete && image.naturalWidth === 0) setFailedSrc(src);
  }, [src]);

  const onError = useCallback(() => setFailedSrc(src), [src]);

  return {
    /** True when the current `src` is missing or has failed to load. */
    failed: !src || failedSrc === src,
    imgProps: { ref, onError },
  };
}
