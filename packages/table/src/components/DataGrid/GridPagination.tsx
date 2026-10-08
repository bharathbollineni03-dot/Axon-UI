import { useMemo } from 'react';
import { Pagination, Select } from '@axon/core';
import type { DataGridLabels } from '../../labels';
import type { DataGridPaginationState } from '../../types';

export interface GridPaginationProps {
  labels: DataGridLabels;
  pagination: DataGridPaginationState;
  pageCount: number;
  /** All the rows across every page. */
  totalRows: number;
  pageSizeOptions: number[];
  onChange: (pagination: DataGridPaginationState) => void;
}

/** The bar under the grid: page size, which rows are shown, and the page buttons. */
export function GridPagination({
  labels,
  pagination,
  pageCount,
  totalRows,
  pageSizeOptions,
  onChange,
}: GridPaginationProps) {
  const { pageIndex, pageSize } = pagination;
  const first = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min(totalRows, (pageIndex + 1) * pageSize);

  // The current size is always on the list, even when it was given as a default that is not.
  const sizes = useMemo(
    () =>
      [...new Set([...pageSizeOptions, pageSize])]
        .sort((a, b) => a - b)
        .map((size) => ({ value: String(size), label: size.toLocaleString() })),
    [pageSizeOptions, pageSize],
  );

  return (
    <div className="axon-datagrid__footer">
      <div className="axon-datagrid__page-size">
        <span className="axon-datagrid__footer-text" aria-hidden="true">
          {labels.rowsPerPage}
        </span>
        <Select
          size="sm"
          aria-label={labels.rowsPerPage}
          options={sizes}
          value={String(pageSize)}
          onChange={(value) => onChange({ pageIndex: 0, pageSize: Number(value) })}
        />
      </div>
      <span className="axon-datagrid__footer-text axon-datagrid__page-range">
        {labels.pageRange(first, last, totalRows)}
      </span>
      <Pagination
        aria-label={labels.pagination}
        size="sm"
        count={Math.max(1, pageCount)}
        page={pageIndex + 1}
        showFirstLast
        onChange={(page) => onChange({ pageIndex: page - 1, pageSize })}
      />
    </div>
  );
}
