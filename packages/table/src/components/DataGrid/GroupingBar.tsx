import { Chip } from '@axon/core';
import type { DataGridLabels } from '../../labels';
import type { DataGridColumn } from '../../types';

export interface GroupingBarProps<Row> {
  labels: DataGridLabels;
  /** The ids of the columns rows are grouped by, outermost first. */
  grouping: readonly string[];
  columnsById: ReadonlyMap<string, DataGridColumn<Row>>;
  onRemove: (columnId: string) => void;
}

/** The strip above the grid that says what the rows are grouped by, with a way to undo each. */
export function GroupingBar<Row>({
  labels,
  grouping,
  columnsById,
  onRemove,
}: GroupingBarProps<Row>) {
  return (
    <div role="group" aria-label={labels.groupedBy} className="axon-datagrid__grouping">
      <span className="axon-datagrid__grouping-label">{labels.groupedBy}</span>
      {grouping.map((id) => {
        const title = columnsById.get(id)?.header ?? id;
        return (
          <Chip
            key={id}
            size="sm"
            label={title}
            deleteLabel={labels.stopGroupingBy(title)}
            onDelete={() => onRemove(id)}
          />
        );
      })}
    </div>
  );
}
