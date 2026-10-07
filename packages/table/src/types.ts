/* eslint-disable @typescript-eslint/no-explicit-any -- a column's value type defaults to `any`, so a
   column can be written without spelling out the type of each of the row's fields. */
import type { CSSProperties, ReactNode } from 'react';

export type DataGridAlign = 'start' | 'center' | 'end';
export type DataGridDensity = 'compact' | 'standard' | 'comfortable';

/** The sides a column can be pinned to. In right-to-left layouts they are the start and end sides. */
export type DataGridPinSide = 'left' | 'right';

export type DataGridFilterType = 'text' | 'number-range' | 'select' | 'date-range';

/** How a column's values are compared when it is sorted. `'auto'` picks by the type of the values. */
export type DataGridSortType = 'auto' | 'text' | 'alphanumeric' | 'number' | 'datetime';

export type DataGridAggregationName =
  'sum' | 'mean' | 'median' | 'min' | 'max' | 'extent' | 'count' | 'unique' | 'uniqueCount';

export interface DataGridOption {
  value: string;
  label: string;
}

/** What `cell` and `aggregatedCell` renderers receive. */
export interface DataGridCellContext<Row, Value = unknown> {
  /** The column's value for this row, from `accessor`. */
  value: Value;
  /** The row's data. For a group's summary row this is the first row of the group. */
  row: Row;
  rowId: string;
  /** Position among the rows shown (on this page), counting from 0. */
  rowIndex: number;
  column: DataGridColumn<Row, Value>;
}

/** The value of a group's summary row for a column that has `aggregate`. */
export interface DataGridGroupContext<Row, Value = unknown> {
  /** The aggregated value (a sum, an average, ...). */
  value: Value;
  /** The group's rows. */
  rows: Row[];
  column: DataGridColumn<Row, Value>;
}

export interface DataGridNumberEditor {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  /** Fixed decimal places. */
  precision?: number;
}

export interface DataGridTextEditor {
  type: 'text';
  placeholder?: string;
  maxLength?: number;
}

export interface DataGridSelectEditor {
  type: 'select';
  options: DataGridOption[];
}

export interface DataGridDateEditor {
  type: 'date';
}

/** The input an editable cell shows. */
export type DataGridEditorConfig =
  DataGridTextEditor | DataGridNumberEditor | DataGridSelectEditor | DataGridDateEditor;

/**
 * A column of a `DataGrid`. Columns with an `accessor` read a value from each row; a column without
 * one (an "actions" column, say) is display-only and must set `id`.
 */
export interface DataGridColumn<Row, Value = any> {
  /** A stable identifier. Defaults to the `accessor` when that is a key. */
  id?: string;
  /** The column title, shown in the header and used in menus, announcements and CSV exports. */
  header: string;
  /** A key of the row, or a function that reads a value from it. */
  accessor?: (keyof Row & string) | ((row: Row) => Value);
  /** Draws the cell. Without it the value is formatted for display. */
  cell?: (context: DataGridCellContext<Row, Value>) => ReactNode;
  /** Draws the header's content in place of `header` (the text is still its accessible name). */
  renderHeader?: (column: DataGridColumn<Row, Value>) => ReactNode;

  /** Starting width in pixels. Default 150. */
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: DataGridAlign;
  /** Pins the column to the left or right edge while the rest scrolls. */
  pinned?: DataGridPinSide;

  /** Whether the header sorts. Default: true when the column has an `accessor`. */
  sortable?: boolean;
  sort?: DataGridSortType | ((a: Value, b: Value, rowA: Row, rowB: Row) => number);

  /** Whether the column gets a filter in the filter row. Default false. */
  filterable?: boolean;
  /** The filter's kind. Default `'text'`. */
  filter?: DataGridFilterType;
  /** The choices of a `'select'` filter. Default: the column's distinct values. */
  filterOptions?: DataGridOption[];
  /** Whether the toolbar's search looks in this column. Default: true when it has an `accessor`. */
  searchable?: boolean;

  /** Whether the user can resize, hide, pin or drag the column. All default to true. */
  resizable?: boolean;
  hideable?: boolean;
  pinnable?: boolean;
  reorderable?: boolean;
  /** Starts hidden. */
  defaultHidden?: boolean;

  /** Lets the user group rows by this column. */
  groupable?: boolean;
  /** How a group's summary row summarises this column. */
  aggregate?: DataGridAggregationName | ((values: any[], rows: Row[]) => unknown);
  /** Draws an aggregated value in a group's summary row. Default: the value, formatted. */
  aggregatedCell?: (context: DataGridGroupContext<Row, any>) => ReactNode;

  /** Makes the cell editable, with the input to edit it with. `true` picks one from the value. */
  editable?: boolean | DataGridEditorConfig;
  /** Return a message to reject an edit. */
  validate?: (value: Value, row: Row) => string | null | undefined;
  /** What an exported CSV holds for this column. Default: the value. */
  exportValue?: (row: Row) => string | number | boolean | Date | null | undefined;
  /** Leave the column out of CSV exports. */
  exportable?: boolean;
}

export interface DataGridSortingEntry {
  /** A column id. */
  id: string;
  desc: boolean;
}

export type DataGridSortingState = DataGridSortingEntry[];

export interface DataGridColumnFilter {
  /** A column id. */
  id: string;
  /**
   * Text filters hold a string, select filters the chosen option's value, and number and date
   * ranges a `[from, to]` pair (dates as `YYYY-MM-DD`), either end of which may be undefined.
   */
  value: unknown;
}

export type DataGridColumnFilters = DataGridColumnFilter[];

export interface DataGridPaginationState {
  /** The page, counting from 0. */
  pageIndex: number;
  pageSize: number;
}

/** The `{ pagination, sorting, filters }` a server needs to answer with the right rows. */
export interface DataGridQueryState {
  pagination: DataGridPaginationState;
  sorting: DataGridSortingState;
  filters: DataGridColumnFilters;
  /** The toolbar search, `''` when empty. */
  globalFilter: string;
}

/** The arrangement of the columns, the part of the grid's state worth saving between visits. */
export interface DataGridLayout {
  /** Ids of the columns in the order they are shown (pinned columns keep their own order). */
  columnOrder: string[];
  /** Widths in pixels by column id. */
  columnSizing: Record<string, number>;
  /** `false` hides a column; a column that is absent is shown. */
  columnVisibility: Record<string, boolean>;
  columnPinning: { left: string[]; right: string[] };
  density: DataGridDensity;
}

/** What the bulk-action bar can use. */
export interface DataGridSelectionContext<Row> {
  /** The rows that are selected and loaded. */
  rows: Row[];
  /** Every selected row id, including rows on other pages that are no longer loaded. */
  rowIds: string[];
  /** Deselects everything. */
  clear: () => void;
}

/** Return `style` and `className` for a row, say to flag overdue invoices. */
export interface DataGridRowProps {
  className?: string;
  style?: CSSProperties;
}

export interface DataGridRowUpdate<Row> {
  rowId: string;
  /** The row as it was. */
  row: Row;
  columnId: string;
  value: unknown;
  previousValue: unknown;
}
