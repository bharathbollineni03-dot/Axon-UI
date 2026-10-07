import { forwardRef, useState, type ImgHTMLAttributes, type ReactNode, type Ref } from 'react';
import { cx } from '../../utils/cx';
import { useMergedRef } from '../../utils/mergeRefs';
import { useImageStatus } from '../../internal/useImageStatus';

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  /** Required. Use `""` only for purely decorative images. */
  alt: string;
  /**
   * Shown when the image fails to load: a node, or the URL of another image to try. By default a
   * neutral placeholder is shown.
   */
  fallback?: ReactNode | string;
  /** CSS aspect ratio such as `16 / 9`, reserving the space before the image loads. */
  aspectRatio?: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const PlaceholderIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="axon-image__placeholder-icon"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5Z" />
  </svg>
);

/** An image with lazy loading, an optional aspect ratio and a graceful fallback when it fails. */
export const Image = forwardRef<HTMLImageElement | HTMLSpanElement, ImageProps>(function Image(
  {
    src,
    alt,
    fallback,
    aspectRatio,
    fit = 'cover',
    radius = 'none',
    className,
    style,
    loading = 'lazy',
    ...rest
  },
  ref,
) {
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const fallbackIsUrl = typeof fallback === 'string';
  const activeSrc = src;
  const { failed, imgProps } = useImageStatus(activeSrc);
  const fallbackStatus = useImageStatus(fallbackIsUrl && failed ? fallback : undefined);
  const mergedRef = useMergedRef(ref as Ref<HTMLImageElement>, imgProps.ref);
  const mergedFallbackRef = useMergedRef(ref as Ref<HTMLImageElement>, fallbackStatus.imgProps.ref);

  const classes = cx(
    'axon-image',
    `axon-image--fit-${fit}`,
    radius !== 'none' && `axon-image--radius-${radius}`,
    className,
  );
  const sizing = aspectRatio ? { aspectRatio, ...style } : style;

  if (!failed) {
    return (
      <img
        {...rest}
        {...imgProps}
        ref={mergedRef}
        src={src}
        alt={alt}
        loading={loading}
        className={classes}
        style={sizing}
      />
    );
  }

  // The original failed: try a fallback image URL, then a node, then the neutral placeholder.
  if (fallbackIsUrl && !fallbackFailed && !fallbackStatus.failed) {
    return (
      <img
        {...rest}
        ref={mergedFallbackRef}
        src={fallback}
        alt={alt}
        loading={loading}
        className={classes}
        style={sizing}
        onError={() => {
          setFallbackFailed(true);
          fallbackStatus.imgProps.onError();
        }}
      />
    );
  }

  return (
    <span
      ref={ref as Ref<HTMLSpanElement>}
      role="img"
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cx(classes, 'axon-image--fallback')}
      style={sizing}
    >
      {fallbackIsUrl || fallback === undefined ? <PlaceholderIcon /> : fallback}
    </span>
  );
});
