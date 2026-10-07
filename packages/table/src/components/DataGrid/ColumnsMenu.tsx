import {
  Button,
  DropdownMenu,
  MenuCheckboxItem,
  MenuGroup,
  MenuItem,
  MenuSeparator,
} from '@axon/core';
import type { RowData } from '@tanstack/react-table';
import { ColumnsIcon } from '../../internal/icons';
import type { DataGridLabels } from '../../labels';
import type { DataGridColumn } from '../../types';
import type { GridTable } from '../../internal/features';

export interface ColumnsMenuProps<Row extends RowData> {
  table: GridTable<Row>;
  labels: DataGridLabels;
  columnsById: ReadonlyMap<string, DataGridColumn<Row>>;
  onReset: () => void;
}

/** The toolbar menu that shows and hides columns, and puts the layout back as it started. */
export function ColumnsMenu<Row extends RowData>({
  table,
  labels,
  columnsById,
  onReset,
}: ColumnsMenuProps<Row>) {
  const hideable = table.getAllLeafColumns().filter((column) => column.getCanHide());
  const visibleCount = table.getVisibleLeafColumns().length;

  return (
    <DropdownMenu
      placement="bottom-end"
      trigger={
        <Button size="sm" variant="outline" color="neutral" startIcon={<ColumnsIcon />}>
          {labels.columnsMenu}
        </Button>
      }
    >
      <MenuGroup label={labels.columnsMenu}>
        {hideable.map((column) => {
          const visible = column.getIsVisible();
          return (
            <MenuCheckboxItem
              key={column.id}
              checked={visible}
              // A grid with no columns left would have nothing to show and no way to get one back.
              disabled={visible && visibleCount <= 1}
              onCheckedChange={(checked) => column.toggleVisibility(checked)}
            >
              {columnsById.get(column.id)?.header ?? column.id}
            </MenuCheckboxItem>
          );
        })}
      </MenuGroup>
      <MenuSeparator />
      <MenuItem onClick={onReset}>{labels.resetLayout}</MenuItem>
    </DropdownMenu>
  );
}
