# @axon/table

Tables for React: a plain, semantic `Table` for static data, and a `DataGrid` for everything else: sorting, filtering, search, pagination (in the browser or on a server), selection, resizable and movable columns, grouping with aggregates, detail panels, inline editing, CSV export, and tens of thousands of rows without slowing down. The grid's logic comes from [TanStack Table](https://tanstack.com/table) and [TanStack Virtual](https://tanstack.com/virtual); everything on the page is Axon UI, so it themes like the rest of the library, works in dark mode and follows the WAI-ARIA grid pattern.

```bash
pnpm add @axon/table @axon/core @axon/theme
```

```tsx
import { ThemeProvider } from '@axon/theme';
import { DataGrid, type DataGridColumn } from '@axon/table';
import '@axon/theme/styles.css';
import '@axon/core/styles.css';
import '@axon/table/styles.css';

type Person = { id: number; name: string; team: string; salary: number; joined: Date };

const columns: DataGridColumn<Person>[] = [
  { accessor: 'name', header: 'Name', width: 200 },
  { accessor: 'team', header: 'Team', filterable: true, filter: 'select' },
  {
    accessor: 'salary',
    header: 'Salary',
    align: 'end',
    cell: ({ value }) => `$${value.toLocaleString()}`,
  },
  { accessor: 'joined', header: 'Joined' },
];

export function People({ people }: { people: Person[] }) {
  return (
    <ThemeProvider>
      <DataGrid
        data={people}
        columns={columns}
        aria-label="People"
        height={420}
        toolbar
        paginated
      />
    </ThemeProvider>
  );
}
```

`@axon/table/styles.css` builds on `@axon/core/styles.css` and the theme tokens, so load those too. TanStack Table and Virtual are installed with the package.

Two rules keep the grid fast: pass **`data`** with a stable identity (state, `useMemo`, a query result), because a new array every render makes the grid sort and filter it again each time; and give it a **`height`** (or `maxHeight`) when it may hold many rows, so that it scrolls inside itself. `columns` may be written inline; the grid notices when they really change.

## Table

A static table is plain markup with good defaults, no state and no behaviour.

```tsx
<Table caption="Revenue by region" striped dense stickyHeader maxHeight={320}>
  <TableHead>
    <TableRow>
      <TableHeaderCell>Region</TableHeaderCell>
      <TableHeaderCell align="end">Revenue</TableHeaderCell>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>North</TableCell>
      <TableCell numeric>$1,200</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

`caption` names the table for screen readers (`hideCaption` keeps it from being drawn). When the table is wider or taller than its space its container scrolls, and only then does it become a keyboard tab stop, named by `scrollLabel` or the caption. `TableHeaderCell` takes `sort` and `onSort` to make a sortable header; you own the sorting.

## DataGrid

### Columns

A column is `{ accessor, header, … }`. The `accessor` is a key of the row or a function that reads a value; a column without one (an "actions" column) needs an `id`.

| Option                                                | What it does                                                                                                                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cell`, `renderHeader`                                | Draw the cell or the header's content. Without `cell`, the value is formatted for its type.                                                                                                  |
| `width`, `minWidth`, `maxWidth`, `align`, `pinned`    | Size, alignment, and pinning to the `'left'` or `'right'` edge.                                                                                                                              |
| `sortable`, `sort`                                    | Sorting is on for columns with an accessor. `sort` is `'auto'`, `'text'`, `'alphanumeric'`, `'number'`, `'datetime'` or a comparison function.                                               |
| `filterable`, `filter`, `filterOptions`, `searchable` | Add a filter (`'text'`, `'number-range'`, `'select'`, `'date-range'`); choose what the toolbar search reads.                                                                                 |
| `resizable`, `hideable`, `pinnable`, `reorderable`    | Turn a column tool off for one column. `defaultHidden` starts it hidden.                                                                                                                     |
| `groupable`, `aggregate`, `aggregatedCell`            | Group by this column; summarise it in group rows with `'sum'`, `'mean'`, `'median'`, `'min'`, `'max'`, `'extent'`, `'count'`, `'unique'`, `'uniqueCount'` or your own `(values, rows) => …`. |
| `editable`, `validate`                                | Edit the cell in place (see below).                                                                                                                                                          |
| `exportValue`, `exportable`                           | What a CSV export holds for the column, or leave it out.                                                                                                                                     |

`header` is plain text: it is the column's accessible name and appears in menus, announcements and exports. Use `renderHeader` for anything fancier.

### Sorting

Click a header (or press Enter or Space on it) to sort ascending, again for descending, again to remove the sort. Hold Shift to add a column to the sort; a number shows the order. Changes are announced ("Sorted by Team ascending, then Age descending"). Hold it yourself with `sorting` and `onSortingChange`, or start with `defaultSorting`.

### Filtering and search

`toolbar` shows a search box and a Filters button; `columns[].filterable` puts a filter for each column in a row under the headers. Text and search are debounced (`filterDebounce`, 200 ms). A select filter offers the column's distinct values unless you give `filterOptions`. Filter and sort changes return to the first page. After a filter the number of rows left is announced.

```tsx
<DataGrid toolbar defaultColumnFilters={[{ id: 'team', value: 'Platform' }]} … />
```

State is `columnFilters` (`[{ id, value }]`) and `globalFilter` (the search text), each with `default…` and `on…Change`. A number range holds `[min, max]` and a date range `['YYYY-MM-DD', 'YYYY-MM-DD']`, either end optional.

### Pagination, in the browser or on a server

```tsx
<DataGrid paginated defaultPagination={{ pageIndex: 0, pageSize: 25 }} pageSizeOptions={[10, 25, 50]} … />
```

With `mode="server"` the grid sorts, filters and pages nothing: `data` is the current page, and `onStateChange` tells you what to fetch.

```tsx
const [query, setQuery] = useState<DataGridQueryState>({
  pagination: { pageIndex: 0, pageSize: 25 },
  sorting: [],
  filters: [],
  globalFilter: '',
});
const { data, isFetching } = useQuery({ queryKey: ['people', query], queryFn: () => fetchPeople(query) });

<DataGrid
  mode="server"
  paginated
  data={data?.rows ?? []}
  totalRowCount={data?.total}
  loading={isFetching}
  onStateChange={setQuery}
  …
/>
```

`onStateChange({ pagination, sorting, filters, globalFilter })` is called when any of them changes, never on first render. While `loading` the rows stay on show with a progress bar; with no rows yet, placeholder rows appear. Give the grid a `getRowId` that is stable across pages (an `id` property is used by default). Server mode does not group, and "select all rows" can only reach the page you have.

### Infinite scroll

Use `onLoadMore` instead of `paginated`. It is called when the reader gets within `loadMoreThreshold` rows of the end (or the rows do not fill the grid) and `hasMore` is true, once for each number of rows; append the next rows to `data`.

```tsx
<DataGrid data={rows} onLoadMore={fetchNext} hasMore={hasNext} loadingMore={isFetchingNext} … />
```

### Virtualization

Above `virtualizeThreshold` rows (100) only the rows in view are drawn, so ten thousand rows scroll as smoothly as ten. Set `virtualize` to force it on or off. A virtualized grid scrolls inside its `height` (600 px if you give neither `height` nor `maxHeight`). Rows have a fixed height set by the density (32, 44 or 56 px) or `rowHeight`; a row with an open detail panel is measured. Everything keyboard-driven still works: Ctrl+End jumps to the last of ten thousand rows.

### Selection

```tsx
<DataGrid
  selectable
  isRowSelectable={(row) => row.status !== 'locked'}
  bulkActions={({ rows, rowIds, clear }) => (
    <Button onClick={() => remove(rowIds).then(clear)}>Delete</Button>
  )}
/>
```

A checkbox column (Shift-click selects a range) and a bar that appears while rows are selected, with your `bulkActions`, "Clear selection", and, in the browser, "Select all N rows" for the rows beyond the page. The header checkbox selects the page. Selection is by row id and survives sorting, filtering and paging; hold it yourself with `rowSelection` and `onRowSelectionChange`.

### Columns: resize, move, pin, hide

Drag the edge of a header to resize it (or focus the handle and use ←/→, Shift for bigger steps; double-click resets). Drag a header, or press Alt+←/→ on it, to move it. Each header has a "⋯" menu to sort, pin left or right, group, move and hide the column; the toolbar's Columns menu shows and hides columns and puts everything back. Turn the tools off with `resizable`, `reorderable` and `columnMenus`, or per column.

**Saving the layout.** The arrangement of the columns is the part of the state worth keeping between visits:

```tsx
const [saved] = useState(() => JSON.parse(localStorage.getItem('people-grid') ?? 'null'));
<DataGrid defaultLayout={saved ?? undefined} onLayoutChange={(layout) => localStorage.setItem('people-grid', JSON.stringify(layout))} … />
```

`layout` is `{ columnOrder, columnSizing, columnVisibility, columnPinning: { left, right }, density }`. `onLayoutChange` is not called on first render, and while a column edge is being dragged it waits for the pointer to let go. Columns a saved layout mentions that no longer exist are ignored. Pass `layout` to hold it yourself.

### Detail panels and grouping

```tsx
<DataGrid renderDetailPanel={(row) => <OrderLines order={row} />} getRowCanExpand={(row) => row.lines > 0} />
<DataGrid columns={[{ accessor: 'team', header: 'Team', groupable: true }, { accessor: 'salary', header: 'Salary', aggregate: 'mean', cell: money }]} defaultGrouping={['team']} />
```

A detail panel opens under its row from a button in a column of its own (Enter or Space on that cell works too). Group a column from its "⋯" menu, or start grouped with `defaultGrouping`; groups nest, are collapsed to begin with (`defaultExpanded` opens them) and show a count. The group rows summarise columns that have `aggregate`: a numeric aggregate is drawn with the column's own `cell`, so money stays money. A chip bar above the grid undoes each grouping. Group rows count towards the page size when paginated. While rows can open, the grid is a `treegrid`, the ARIA role for that.

### Editing

Give columns `editable` and the grid `onRowUpdate`; without the latter there is nowhere for a change to go, and nothing is editable.

```tsx
<DataGrid
  columns={[
    { accessor: 'name', header: 'Name', editable: true },
    {
      accessor: 'age',
      header: 'Age',
      editable: { type: 'number', min: 18 },
      validate: (age) => (age < 18 ? 'Too young' : undefined),
    },
    { accessor: 'team', header: 'Team', editable: { type: 'select', options } },
    { accessor: 'active', header: 'Active', editable: { type: 'checkbox' } },
  ]}
  onRowUpdate={async ({ rowId, columnId, value }) => {
    await api.patch(rowId, { [columnId]: value }); // throw to refuse
    setRows((rows) => rows.map((row) => (row.id === rowId ? { ...row, [columnId]: value } : row)));
  }}
/>
```

Double-click a cell, or press Enter or F2 on it, to edit. Enter (or leaving a text or number field) saves, Escape puts the old value back, and focus returns to the cell. `editable: true` picks an editor from the value (text, number, date, checkbox); `{ type: 'select' }` and `{ type: 'date' }` are explicit. A message from `validate`, or a rejected `onRowUpdate`, is shown in the cell and the editor stays open; while a promise is pending the editor is busy. Checkboxes save as soon as they are pressed. The grid shows what `data` says, so update `data` in `onRowUpdate`.

### Export

The toolbar's Export CSV button saves the visible columns of every row (filtered and sorted, across all pages) as `export.csv` (`exportFileName`). Text that a spreadsheet would run as a formula (starting with `=`, `+`, `-`, `@`) is written with a leading apostrophe. Pass `onExport({ rows, columns, csv })` to do something else with it, such as asking a server for all rows. The helpers are exported: `toCsv(columns, rows)`, `csvField`, `downloadCsv`.

### States

`loading` shows placeholder rows (or a progress bar if there are rows), `error` shows a message with a retry button when `onRetry` is given, and `emptyState` replaces "No rows to display". When filters leave nothing, the grid says so and offers to clear them.

### Look

`striped`, `bordered`, `hoverable`, `defaultDensity` (`'compact' | 'standard' | 'comfortable'`, also in the toolbar), `rowHeight`, `rowProps(row, id)` for per-row `className` and `style`, `onRowClick`.

## Accessibility

The grid follows the WAI-ARIA data grid pattern, so people who use a keyboard or a screen reader get the same grid.

- **One tab stop.** The grid has a single place in the tab order, the active cell. Arrow keys move between cells, Home and End to the ends of a row, Ctrl+Home and Ctrl+End to the first and last cell, Page Up and Page Down by a screenful. Tab leaves the grid, after any controls inside the active cell (a header's menu and resize handle, a checkbox, an editor).
- **Roles that say what things are.** `grid` (or `treegrid` when rows can open), `row`, `columnheader`, `gridcell`, with `aria-rowcount`, `aria-colcount`, `aria-rowindex` and `aria-colindex` so the position is right even when only some rows are drawn, `aria-sort` on sortable headers, `aria-selected` on selected rows and `aria-expanded` on rows that open. When the total is not known (infinite scroll) `aria-rowcount` is `-1`.
- **Changes are announced** in a polite live region: sorting, how many rows a filter leaves, the page, how many rows are selected, a column that was moved, an export, more rows loading.
- **Every pointer action has a keyboard one**: Enter and Space sort, Shift adds a column, Space selects, Enter opens a row or edits a cell, Alt+arrows move a column, the arrow keys resize a focused handle, and the column menu does the rest.
- **Colour is never the only signal**: sort direction is an icon and `aria-sort`, selection is a checkbox, a refused edit is a message.
- **Reduced motion** turns the loading bar's motion off.

Name the grid with `aria-label` or `aria-labelledby`. Every word it says can be changed (and translated) with `labels`.

## Right-to-left

Pinned columns and the sticky offsets use logical properties (`inset-inline-start`), so `'left'` and `'right'` mean the start and end side in right-to-left layouts, and the group chevrons flip. Arrow-key movement is not mirrored yet.

## Notes

- A grid with more than a few thousand rows should be paged or virtualized (it is, above 100) and, when sorting or filtering matters, run in server mode.
- `data` row types are plain objects; `getRowId` should return something stable (the default uses an `id` property, then the row's position).
- Dates are compared and filtered by calendar day in the local time zone, and `YYYY-MM-DD` strings are read as local days, not UTC midnight.
- `DataGrid` is generic: `DataGrid<Person>` is inferred from `data` and `columns`.
