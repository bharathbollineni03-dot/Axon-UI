export type PaginationItem = number | 'start-ellipsis' | 'end-ellipsis';

export interface PaginationRangeOptions {
  /** The current page, starting at 1. */
  page: number;
  /** The total number of pages. */
  count: number;
  /** Pages shown on each side of the current page. Defaults to 1. */
  siblingCount?: number;
  /** Pages always shown at the start and the end. Defaults to 1. */
  boundaryCount?: number;
}

const range = (start: number, end: number): number[] =>
  Array.from({ length: Math.max(end - start + 1, 0) }, (_, index) => start + index);

/**
 * The page numbers and gaps to show: the boundary pages, the current page with its siblings, and
 * an ellipsis wherever pages are skipped. The width is constant while paging (an ellipsis is
 * replaced by the one page it would hide), so the control does not jump around.
 *
 * `getPaginationRange({ page: 5, count: 10 })` →
 * `[1, 'start-ellipsis', 4, 5, 6, 'end-ellipsis', 10]`
 */
export function getPaginationRange({
  page,
  count,
  siblingCount = 1,
  boundaryCount = 1,
}: PaginationRangeOptions): PaginationItem[] {
  const startPages = range(1, Math.min(boundaryCount, count));
  const endPages = range(Math.max(count - boundaryCount + 1, boundaryCount + 1), count);

  const siblingsStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0]! - 2 : count - 1,
  );

  const items: PaginationItem[] = [...startPages];

  if (siblingsStart > boundaryCount + 2) items.push('start-ellipsis');
  else if (boundaryCount + 1 < count - boundaryCount) items.push(boundaryCount + 1);

  items.push(...range(siblingsStart, siblingsEnd));

  if (siblingsEnd < count - boundaryCount - 1) items.push('end-ellipsis');
  else if (count - boundaryCount > boundaryCount) items.push(count - boundaryCount);

  items.push(...endPages);
  return items;
}
