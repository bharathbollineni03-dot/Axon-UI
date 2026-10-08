import type { ReactNode } from 'react';
import { Button } from '@axonui/core';
import type { DataGridLabels } from '../../labels';

export interface BulkBarProps {
  labels: DataGridLabels;
  count: number;
  /** How many rows "select all" would select, or `null` when it is not on offer. */
  selectAllCount: number | null;
  onSelectAll: () => void;
  onClear: () => void;
  /** The owner's buttons. */
  children?: ReactNode;
}

/** The bar that appears over the grid while rows are selected. */
export function BulkBar({
  labels,
  count,
  selectAllCount,
  onSelectAll,
  onClear,
  children,
}: BulkBarProps) {
  return (
    <div role="group" aria-label={labels.selectionActions} className="axon-datagrid__bulk">
      <span className="axon-datagrid__bulk-count">{labels.selectedCount(count)}</span>
      {selectAllCount !== null ? (
        <Button size="sm" variant="ghost" onClick={onSelectAll}>
          {labels.selectAllN(selectAllCount)}
        </Button>
      ) : null}
      <div className="axon-datagrid__bulk-actions">{children}</div>
      <Button size="sm" variant="ghost" color="neutral" onClick={onClear}>
        {labels.clearSelection}
      </Button>
    </div>
  );
}
