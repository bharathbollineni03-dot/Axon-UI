import {
  forwardRef,
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import { useIsomorphicLayoutEffect } from '../../internal/useIsomorphicLayoutEffect';

export interface ChartSize {
  width: number;
  height: number;
}

export interface ResponsiveContainerProps {
  /** Height in pixels. */
  height: number;
  /**
   * A fixed width in pixels. Without it the container fills its parent and follows it as it
   * resizes.
   */
  width?: number;
  /**
   * The width used until the container has been measured, and wherever it cannot be: on the
   * server, and in a browser without `ResizeObserver`. Defaults to 600.
   */
  fallbackWidth?: number;
  /** The narrowest the chart may get. Defaults to 0. */
  minWidth?: number;
  /** Called when the size changes. */
  onResize?: (size: ChartSize) => void;
  className?: string;
  style?: CSSProperties;
  /** What to draw, or a function that is given the size. */
  children: ReactNode | ((size: ChartSize) => ReactNode);
}

/**
 * Gives a chart the width of its parent. It measures with `ResizeObserver`; before that, and
 * where it does not exist, it uses `fallbackWidth`, so the first render is the same on the server
 * and in the browser.
 */
export const ResponsiveContainer = forwardRef<HTMLDivElement, ResponsiveContainerProps>(
  function ResponsiveContainer(
    {
      height,
      width: fixedWidth,
      fallbackWidth = 600,
      minWidth = 0,
      onResize,
      className,
      style,
      children,
    },
    ref,
  ) {
    const element = useRef<HTMLDivElement | null>(null);
    const [measured, setMeasured] = useState<number | null>(null);
    const onResizeRef = useRef(onResize);
    onResizeRef.current = onResize;

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        element.current = node;
        if (typeof ref === 'function') (ref as (node: HTMLDivElement | null) => void)(node);
        else if (ref) (ref as { current: HTMLDivElement | null }).current = node;
      },
      [ref],
    );

    useIsomorphicLayoutEffect(() => {
      const node = element.current;
      if (!node || fixedWidth !== undefined) return undefined;
      const update = (next: number) => {
        // A container that is not laid out (hidden, or no layout engine) reports 0: keep the fallback.
        if (next > 0) setMeasured((current) => (current === next ? current : next));
      };
      update(Math.floor(node.getBoundingClientRect().width));
      if (typeof ResizeObserver === 'undefined') return undefined;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (entry) update(Math.floor(entry.contentRect.width));
      });
      observer.observe(node);
      return () => observer.disconnect();
    }, [fixedWidth]);

    const width = Math.max(minWidth, fixedWidth ?? measured ?? fallbackWidth);
    const size: ChartSize = { width, height };

    useIsomorphicLayoutEffect(() => {
      onResizeRef.current?.({ width, height });
    }, [width, height]);

    return (
      <div
        ref={setRefs as Ref<HTMLDivElement>}
        className={className}
        style={{
          width: fixedWidth ?? '100%',
          minWidth,
          height,
          ...style,
        }}
      >
        {typeof children === 'function' ? children(size) : children}
      </div>
    );
  },
);
