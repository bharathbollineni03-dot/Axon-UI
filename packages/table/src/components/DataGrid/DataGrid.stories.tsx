import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Button, Chip } from '@axonui/core';
import {
  departments,
  makeEmployees,
  statuses,
  type Employee,
  type EmployeeStatus,
} from '../../stories/data';
import { createMockServer } from '../../stories/mockServer';
import type { DataGridColumn, DataGridLayout, DataGridQueryState } from '../../types';
import { DataGrid } from './DataGrid';
import type { DataGridProps } from './props';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const statusColor: Record<EmployeeStatus, 'success' | 'warning' | 'primary' | 'neutral'> = {
  Active: 'success',
  'On leave': 'warning',
  Remote: 'primary',
  Contractor: 'neutral',
};

const columns: DataGridColumn<Employee>[] = [
  { accessor: 'name', header: 'Name', width: 190 },
  { accessor: 'department', header: 'Department', width: 150 },
  { accessor: 'role', header: 'Role', width: 190 },
  { accessor: 'location', header: 'Location', width: 130 },
  {
    accessor: 'status',
    header: 'Status',
    width: 130,
    cell: ({ value }) => (
      <Chip size="sm" color={statusColor[value as EmployeeStatus]} label={value as string} />
    ),
  },
  {
    accessor: 'salary',
    header: 'Salary',
    width: 130,
    align: 'end',
    cell: ({ value }) => money.format(value as number),
  },
  { accessor: 'startDate', header: 'Started', width: 130 },
];

type Args = DataGridProps<Employee>;

const meta: Meta<Args> = {
  title: 'Table/DataGrid',
  component: DataGrid,
  parameters: { layout: 'padded' },
  argTypes: {
    striped: { control: 'boolean' },
    bordered: { control: 'boolean' },
    hoverable: { control: 'boolean' },
    loading: { control: 'boolean' },
    multiSort: { control: 'boolean' },
    defaultDensity: { control: 'inline-radio', options: ['compact', 'standard', 'comfortable'] },
    virtualize: { control: 'inline-radio', options: ['auto', true, false] },
    height: { control: { type: 'number', min: 160, max: 800, step: 20 } },
    data: { control: false },
    columns: { control: false },
  },
  args: {
    columns,
    height: 420,
    'aria-label': 'Employees',
    locale: 'en-US',
  },
  render: function Render(args) {
    const data = useMemo(() => makeEmployees(args.data?.length ?? 60), [args.data?.length]);
    return <DataGrid {...args} data={args.data ?? data} />;
  },
};
export default meta;
type Story = StoryObj<Args>;

const employees = makeEmployees(60);

export const Playground: Story = { args: { data: employees } };

export const SortedByDefault: Story = {
  name: 'Sorting (click a header, Shift+click to add a column)',
  args: {
    data: employees,
    defaultSorting: [
      { id: 'department', desc: false },
      { id: 'salary', desc: true },
    ],
  },
};

export const StripedAndBordered: Story = {
  args: { data: employees, striped: true, bordered: true, defaultDensity: 'compact' },
};

export const PinnedColumns: Story = {
  name: 'Pinned columns (scroll sideways)',
  args: {
    data: employees,
    style: { maxWidth: 720 },
    columns: columns.map((column, index) =>
      index === 0
        ? { ...column, pinned: 'left' as const }
        : column.accessor === 'startDate'
          ? { ...column, pinned: 'right' as const }
          : column,
    ),
  },
};

export const TenThousandRows: Story = {
  name: '10,000 rows (virtualized)',
  args: {
    data: makeEmployees(10_000),
    height: 480,
    striped: true,
    'aria-label': 'Ten thousand employees',
  },
};

export const Loading: Story = { args: { data: [], loading: true } };

export const Reloading: Story = {
  name: 'Reloading (rows stay, a bar runs)',
  args: { data: employees.slice(0, 10), loading: true },
};

export const Empty: Story = { args: { data: [] } };

export const ErrorState: Story = {
  name: 'Error with retry',
  args: { data: [], error: 'The employee service did not respond.', onRetry: () => {} },
};

const optionsOf = (values: readonly string[]) => values.map((value) => ({ value, label: value }));

/** The same columns, with a filter on most of them. */
const filterableColumns: DataGridColumn<Employee>[] = columns.map((column) => {
  switch (column.accessor) {
    case 'name':
      return { ...column, filterable: true };
    case 'department':
      return {
        ...column,
        filterable: true,
        filter: 'select',
        filterOptions: optionsOf(departments),
      };
    case 'status':
      return { ...column, filterable: true, filter: 'select', filterOptions: optionsOf(statuses) };
    case 'salary':
      return { ...column, filterable: true, filter: 'number-range' };
    case 'startDate':
      return { ...column, width: 230, filterable: true, filter: 'date-range' };
    default:
      return column;
  }
});

export const ToolbarAndFilters: Story = {
  name: 'Toolbar, search and column filters',
  args: {
    data: makeEmployees(300),
    columns: filterableColumns,
    toolbar: true,
    toolbarStart: <strong>Employees</strong>,
    paginated: true,
    defaultPagination: { pageIndex: 0, pageSize: 10 },
    height: undefined,
    defaultShowFilters: true,
  },
};

export const Paginated: Story = {
  args: {
    data: makeEmployees(237),
    paginated: true,
    defaultPagination: { pageIndex: 0, pageSize: 25 },
    height: undefined,
    striped: true,
  },
};

function ServerSideGrid(args: Args) {
  const fetchPage = useMemo(() => createMockServer(makeEmployees(5000)), []);
  const [query, setQuery] = useState<DataGridQueryState>({
    pagination: { pageIndex: 0, pageSize: 10 },
    sorting: [],
    filters: [],
    globalFilter: '',
  });
  const [result, setResult] = useState<{ rows: Employee[]; total: number }>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const signal = { cancelled: false };
    setLoading(true);
    fetchPage(query, signal)
      .then((page) => {
        if (signal.cancelled) return;
        setResult(page);
        setFailure(null);
      })
      .catch((error: Error) => !signal.cancelled && setFailure(error.message))
      .finally(() => !signal.cancelled && setLoading(false));
    return () => {
      signal.cancelled = true;
    };
  }, [fetchPage, query, attempt]);

  return (
    <DataGrid
      {...args}
      mode="server"
      paginated
      data={result.rows}
      totalRowCount={result.total}
      loading={loading}
      error={failure ?? undefined}
      onRetry={() => setAttempt((n) => n + 1)}
      defaultPagination={query.pagination}
      onStateChange={setQuery}
    />
  );
}

export const ServerSide: Story = {
  name: 'Server mode (5,000 rows on a pretend server)',
  args: { columns: filterableColumns, toolbar: true, height: undefined, striped: true },
  render: (args) => <ServerSideGrid {...args} />,
};

function SelectableGrid(args: Args) {
  const [rows, setRows] = useState(() => makeEmployees(80));
  return (
    <DataGrid
      {...args}
      data={rows}
      bulkActions={({ rows: selected, rowIds, clear }) => (
        <>
          <Button
            size="sm"
            variant="outline"
            color="danger"
            onClick={() => {
              setRows((current) => current.filter((row) => !rowIds.includes(row.id)));
              clear();
            }}
          >
            Delete {selected.length > 1 ? `${selected.length} people` : 'person'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            color="neutral"
            onClick={() => alert(selected.map((row) => row.email).join('\n'))}
          >
            Show emails
          </Button>
        </>
      )}
    />
  );
}

export const SelectableWithBulkActions: Story = {
  name: 'Selection with bulk actions (Shift+click selects a range)',
  args: {
    selectable: true,
    toolbar: true,
    paginated: true,
    defaultPagination: { pageIndex: 0, pageSize: 10 },
    columns: filterableColumns,
    height: undefined,
    isRowSelectable: (row) => row.status !== 'On leave',
  },
  render: (args) => <SelectableGrid {...args} />,
};

function SavedLayoutGrid(args: Args) {
  const key = 'axon-table-story-layout';
  const [saved, setSaved] = useState<DataGridLayout | undefined>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as DataGridLayout) : undefined;
    } catch {
      return undefined;
    }
  });
  const [version, setVersion] = useState(0);
  const save = (layout: DataGridLayout) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(layout));
    } catch {
      // Storage can be unavailable; the layout then just is not remembered.
    }
    setSaved(layout);
  };
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            try {
              window.localStorage.removeItem(key);
            } catch {
              // Nothing to forget.
            }
            setSaved(undefined);
            setVersion((v) => v + 1);
          }}
        >
          Forget the saved layout
        </Button>
        <span style={{ fontSize: 13 }}>
          Resize, reorder, pin or hide columns, then reload the page: the layout is kept.
        </span>
      </div>
      <DataGrid key={version} {...args} defaultLayout={saved} onLayoutChange={save} />
    </div>
  );
}

export const SavedLayout: Story = {
  name: 'Saving and restoring the layout',
  args: { data: employees, toolbar: true, height: 360 },
  render: (args) => <SavedLayoutGrid {...args} />,
};

export const EverythingAtOnce: Story = {
  name: 'Everything at once',
  args: {
    data: makeEmployees(1200),
    columns: filterableColumns.map((column, index) =>
      index === 0 ? { ...column, pinned: 'left' as const } : column,
    ),
    toolbar: true,
    selectable: true,
    paginated: true,
    defaultPagination: { pageIndex: 0, pageSize: 25 },
    striped: true,
    height: 460,
    defaultShowFilters: true,
  },
};

export const DetailPanels: Story = {
  name: 'Expandable rows with a detail panel',
  args: {
    data: employees.slice(0, 25),
    height: undefined,
    renderDetailPanel: (row) => (
      <div style={{ display: 'grid', gap: 4 }}>
        <strong>{row.name}</strong>
        <span>{row.email}</span>
        <span>
          {row.role} in {row.department}, based in {row.location}. Reports to{' '}
          {row.manager ?? 'nobody'}.
        </span>
      </div>
    ),
    getRowCanExpand: (row) => row.status !== 'Contractor',
  },
};

const groupColumns: DataGridColumn<Employee>[] = columns.map((column) => {
  switch (column.accessor) {
    case 'department':
    case 'status':
    case 'location':
      return { ...column, groupable: true };
    case 'salary':
      return { ...column, aggregate: 'mean' as const };
    case 'startDate':
      return { ...column, aggregate: 'extent' as const };
    case 'role':
      return { ...column, aggregate: 'uniqueCount' as const };
    default:
      return column;
  }
});

export const GroupedWithAggregates: Story = {
  name: 'Grouping with aggregates (group from a column’s ⋯ menu)',
  args: {
    data: makeEmployees(150),
    columns: groupColumns,
    defaultGrouping: ['department'],
    toolbar: true,
    height: 520,
  },
};

function EditableGrid(args: Args) {
  const [rows, setRows] = useState(() => makeEmployees(40));
  const editable: DataGridColumn<Employee>[] = [
    { ...columns[0]!, editable: true },
    {
      ...columns[1]!,
      editable: { type: 'select', options: optionsOf(departments) },
    },
    {
      accessor: 'role',
      header: 'Role',
      width: 190,
      editable: true,
      validate: (value: string) => (value.trim() === '' ? 'A role cannot be empty' : undefined),
    },
    {
      ...columns[5]!,
      editable: { type: 'number', min: 20_000, max: 400_000, step: 1000 },
    },
    {
      ...columns[6]!,
      width: 160,
      editable: { type: 'date' },
    },
  ];
  return (
    <DataGrid
      {...args}
      columns={editable}
      data={rows}
      onRowUpdate={async ({ rowId, columnId, value }) => {
        // A pretend server: it takes a moment, and refuses anything about Hedy.
        await new Promise((resolve) => setTimeout(resolve, 500));
        const row = rows.find((candidate) => candidate.id === rowId);
        if (row?.name.startsWith('Hedy')) throw new Error('Hedy’s record is locked');
        setRows((current) =>
          current.map((candidate) =>
            candidate.id === rowId ? { ...candidate, [columnId]: value } : candidate,
          ),
        );
      }}
    />
  );
}

export const Editable: Story = {
  name: 'Inline editing (double-click or press Enter on a cell)',
  args: { height: 440, striped: true },
  render: (args) => <EditableGrid {...args} />,
};

function InfiniteGrid(args: Args) {
  const all = useMemo(() => makeEmployees(5000), []);
  const [count, setCount] = useState(40);
  const [loading, setLoading] = useState(false);
  const rows = useMemo(() => all.slice(0, count), [all, count]);
  const loadMore = useCallback(() => {
    setLoading(true);
    // A pretend fetch: forty more rows after a short wait.
    setTimeout(() => {
      setCount((current) => Math.min(all.length, current + 40));
      setLoading(false);
    }, 700);
  }, [all.length]);
  return (
    <DataGrid
      {...args}
      data={rows}
      onLoadMore={loadMore}
      hasMore={count < all.length}
      loadingMore={loading}
    />
  );
}

export const InfiniteScroll: Story = {
  name: 'Infinite scroll (forty more rows as you reach the end)',
  args: { height: 420, striped: true, 'aria-label': 'Employees, loaded as you scroll' },
  render: (args) => <InfiniteGrid {...args} />,
};
