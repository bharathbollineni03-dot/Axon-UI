import { forwardRef, type MouseEvent } from 'react';
import {
  DropdownMenu,
  IconButton,
  MenuItem,
  MenuSeparator,
  type IconButtonProps,
} from '@axon/core';
import type { RowData } from '@tanstack/react-table';
import { MoreIcon } from '../../internal/icons';
import type { GridColumn } from './cellStyle';
import { useGridContext } from './gridContext';

/**
 * The button that opens a column's menu. A press on it must not reach the header cell, where it
 * would also sort the column.
 */
const MenuButton = forwardRef<HTMLButtonElement, IconButtonProps>(function MenuButton(
  { onClick, ...props },
  ref,
) {
  return (
    <IconButton
      {...props}
      ref={ref}
      onClick={(event: MouseEvent<HTMLButtonElement & HTMLAnchorElement>) => {
        event.stopPropagation();
        onClick?.(event);
      }}
    />
  );
});

interface ColumnMenuProps<Row extends RowData> {
  column: GridColumn<Row>;
  /** Whether the header cell holding the button is the grid's tab stop. */
  active: boolean;
}

/** The "⋯" menu of a column header: sort, pin, move and hide. */
export function ColumnMenu<Row extends RowData>({ column, active }: ColumnMenuProps<Row>) {
  const { labels, columnsById, canReorder, moveColumn, table } = useGridContext<Row>();
  const title = columnsById.get(column.id)?.header ?? column.id;
  const canSort = column.getCanSort();
  const canPin = column.getCanPin();
  const pinned = column.getIsPinned();
  const canHide = column.getCanHide() && table.getVisibleLeafColumns().length > 1;
  const canMove = canReorder(column.id);

  if (!canSort && !canPin && !canHide && !canMove) return null;

  return (
    <DropdownMenu
      placement="bottom-end"
      // The menu is drawn elsewhere but still belongs to the header in React's tree, so a click on
      // an item would otherwise reach the header and sort the column as well.
      onClick={(event) => event.stopPropagation()}
      trigger={
        <MenuButton
          size="sm"
          className="axon-datagrid__menu-button"
          aria-label={labels.columnMenu(title)}
          tabIndex={active ? 0 : -1}
        >
          <MoreIcon />
        </MenuButton>
      }
    >
      {canSort ? (
        <>
          <MenuItem onClick={() => column.toggleSorting(false)}>{labels.sortAscending}</MenuItem>
          <MenuItem onClick={() => column.toggleSorting(true)}>{labels.sortDescending}</MenuItem>
          <MenuItem disabled={!column.getIsSorted()} onClick={() => column.clearSorting()}>
            {labels.clearSort}
          </MenuItem>
        </>
      ) : null}
      {canSort && (canPin || canMove || canHide) ? <MenuSeparator /> : null}
      {canPin ? (
        <>
          <MenuItem disabled={pinned === 'start'} onClick={() => column.pin('start')}>
            {labels.pinLeft}
          </MenuItem>
          <MenuItem disabled={pinned === 'end'} onClick={() => column.pin('end')}>
            {labels.pinRight}
          </MenuItem>
          <MenuItem disabled={!pinned} onClick={() => column.pin(false)}>
            {labels.unpin}
          </MenuItem>
        </>
      ) : null}
      {canPin && (canMove || canHide) ? <MenuSeparator /> : null}
      {canMove ? (
        <>
          <MenuItem onClick={() => moveColumn(column.id, -1)}>{labels.moveLeft}</MenuItem>
          <MenuItem onClick={() => moveColumn(column.id, 1)}>{labels.moveRight}</MenuItem>
        </>
      ) : null}
      {canMove && canHide ? <MenuSeparator /> : null}
      {canHide ? (
        <MenuItem onClick={() => column.toggleVisibility(false)}>{labels.hideColumn}</MenuItem>
      ) : null}
    </DropdownMenu>
  );
}
