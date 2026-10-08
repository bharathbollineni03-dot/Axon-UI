import { useEffect, type RefObject } from 'react';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';

interface Options {
  count: number;
  enabled: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  /** The height of one row. */
  rowHeight: number;
  /** Extra height for a row, such as an open detail panel. */
  extraHeight: (index: number) => number;
  /** The height of the sticky header above the rows. */
  headerHeight: number;
  overscan: number;
  /** The height to assume before the scroll area has been measured, so server rendering has rows. */
  initialHeight: number;
  getKey: (index: number) => string;
  /** Changes when rows may have changed height (panels opened or closed), so heights are measured again. */
  remeasureKey?: unknown;
}

export interface GridVirtualizer {
  virtualizer: Virtualizer<HTMLElement, Element>;
  /** The rows to draw, or `null` when virtualization is off and every row is drawn. */
  items: Array<{ index: number; start: number; key: string }> | null;
  totalSize: number;
}

/**
 * TanStack Virtual set up for the grid: fixed-height rows (plus a measured extra for rows with an
 * open detail panel), offset by the sticky header so that scrolling to a row puts it below it.
 */
export function useGridVirtualizer({
  count,
  enabled,
  scrollRef,
  rowHeight,
  extraHeight,
  headerHeight,
  overscan,
  initialHeight,
  getKey,
  remeasureKey,
}: Options): GridVirtualizer {
  const virtualizer = useVirtualizer<HTMLElement, Element>({
    count,
    enabled,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => rowHeight + extraHeight(index),
    overscan,
    scrollMargin: headerHeight,
    scrollPaddingStart: headerHeight,
    initialRect: { width: 0, height: initialHeight },
    getItemKey: getKey,
  });

  // Row heights are cached; a new density or header height means they must be measured again.
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, rowHeight, headerHeight, remeasureKey]);

  return {
    virtualizer,
    totalSize: virtualizer.getTotalSize(),
    items: enabled
      ? virtualizer.getVirtualItems().map((item) => ({
          index: item.index,
          start: item.start,
          key: String(item.key),
        }))
      : null,
  };
}
