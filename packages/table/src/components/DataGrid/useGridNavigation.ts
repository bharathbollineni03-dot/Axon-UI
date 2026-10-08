import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';

/**
 * A cell by position. Row 0 is the header; row 1 is the first body row. Columns count from 0 over
 * the visible columns, including the checkbox and expander columns.
 */
export interface GridPosition {
  row: number;
  col: number;
}

interface Options {
  /** The number of body rows. */
  rowCount: number;
  colCount: number;
  gridRef: RefObject<HTMLElement | null>;
  /** Brings a body row (counting from 0) into view and renders it, when rows are virtualized. */
  scrollToRow: (index: number) => void;
  /** How far PageUp and PageDown move. */
  pageSize: number;
}

/** How long a requested focus move may wait for its cell to be rendered before it is dropped. */
const FOCUS_WAIT_MS = 1000;

/**
 * The grid's keyboard model (the WAI-ARIA data grid pattern): one cell is the tab stop, and the
 * arrow keys, Home, End and Page keys move it. `onKeyDown` only acts when a cell itself has focus,
 * so a text field or button inside a cell keeps its own keys.
 */
export function useGridNavigation({ rowCount, colCount, gridRef, scrollToRow, pageSize }: Options) {
  const [active, setActive] = useState<GridPosition>({ row: 0, col: 0 });
  const pending = useRef<{ position: GridPosition; at: number } | null>(null);

  const lastCol = Math.max(colCount - 1, 0);
  // The data or the columns can shrink under the active cell.
  const position = useMemo<GridPosition>(
    () => ({ row: Math.min(active.row, rowCount), col: Math.min(active.col, lastCol) }),
    [active.row, active.col, rowCount, lastCol],
  );

  const focusCell = useCallback(
    (row: number, col: number) => {
      const target = {
        row: Math.max(0, Math.min(row, rowCount)),
        col: Math.max(0, Math.min(col, lastCol)),
      };
      setActive(target);
      pending.current = { position: target, at: Date.now() };
      if (target.row > 0) scrollToRow(target.row - 1);
    },
    [lastCol, rowCount, scrollToRow],
  );

  // Runs after every render until the cell that was asked for exists, then moves focus to it.
  useLayoutEffect(() => {
    const request = pending.current;
    if (!request) return;
    if (Date.now() - request.at > FOCUS_WAIT_MS) {
      pending.current = null;
      return;
    }
    const { row, col } = request.position;
    const cell = gridRef.current?.querySelector<HTMLElement>(
      `[data-grid-cell][data-grid-row="${row}"][data-grid-col="${col}"]`,
    );
    if (cell) {
      pending.current = null;
      // Browsers do not scroll a partly visible cell fully into view, so do it, once, ourselves.
      cell.focus({ preventScroll: true });
      cell.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  });

  /** Keeps the tab stop under the pointer or focus, however focus got there. */
  const onCellFocus = useCallback((row: number, col: number) => {
    pending.current = null;
    setActive((previous) =>
      previous.row === row && previous.col === col ? previous : { row, col },
    );
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const target = event.target as HTMLElement;
      if (!target.hasAttribute('data-grid-cell') || event.altKey) return;

      const { row, col } = position;
      const page = Math.max(1, pageSize);
      let next: GridPosition | null = null;

      switch (event.key) {
        case 'ArrowRight':
          next = { row, col: col + 1 };
          break;
        case 'ArrowLeft':
          next = { row, col: col - 1 };
          break;
        case 'ArrowDown':
          next = { row: row + 1, col };
          break;
        case 'ArrowUp':
          next = { row: row - 1, col };
          break;
        case 'Home':
          next = event.ctrlKey || event.metaKey ? { row: 0, col: 0 } : { row, col: 0 };
          break;
        case 'End':
          next =
            event.ctrlKey || event.metaKey
              ? { row: rowCount, col: lastCol }
              : { row, col: lastCol };
          break;
        case 'PageDown':
          next = { row: Math.max(row, 0) + page, col };
          break;
        case 'PageUp':
          next = { row: Math.max(row - page, row === 0 ? 0 : 1), col };
          break;
        default:
          return;
      }
      event.preventDefault();
      focusCell(next.row, next.col);
    },
    [focusCell, lastCol, pageSize, position, rowCount],
  );

  return { active: position, focusCell, onCellFocus, onKeyDown };
}
