import type { CSSProperties } from 'react';
import type { Column, RowData } from '@tanstack/react-table';
import type { GridFeatures } from '../../internal/features';

export type GridColumn<Row extends RowData> = Column<GridFeatures, Row, unknown>;

type LayoutStyle = CSSProperties & { '--axon-datagrid-pin-offset'?: string };

/**
 * A column's place in a row: its width, and for a pinned column the offset that keeps it stuck to an
 * edge while the rest of the row scrolls. The widths here are the table's own, so the sticky
 * offsets, which add them up, always agree with what is drawn.
 */
export function cellLayoutStyle<Row extends RowData>(
  column: GridColumn<Row>,
  grow: boolean,
): CSSProperties {
  const size = column.getSize();
  const pinned = column.getIsPinned();
  const style: LayoutStyle = {
    flex: `${grow ? 1 : 0} 0 ${size}px`,
    minWidth: size,
    ...(grow ? null : { maxWidth: size }),
  };
  // The stylesheet turns the offset into `inset-inline-start` or `-end`, so pinning follows the
  // direction of the text.
  if (pinned === 'start') style['--axon-datagrid-pin-offset'] = `${column.getStart('start')}px`;
  else if (pinned === 'end') style['--axon-datagrid-pin-offset'] = `${column.getAfter('end')}px`;
  return style;
}

/** Class names for a pinned column's cells, so CSS can stick them and give the inner edge a divider. */
export function pinnedClasses<Row extends RowData>(column: GridColumn<Row>): string[] {
  const pinned = column.getIsPinned();
  if (!pinned) return [];
  const classes = ['axon-datagrid__cell--pinned', `axon-datagrid__cell--pinned-${pinned}`];
  if (pinned === 'start' && column.getIsLastColumn('start'))
    classes.push('axon-datagrid__cell--pinned-edge');
  if (pinned === 'end' && column.getIsFirstColumn('end'))
    classes.push('axon-datagrid__cell--pinned-edge');
  return classes;
}
