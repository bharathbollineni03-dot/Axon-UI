import { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from '@axon/core';
import {
  departments,
  makeEmployees,
  statuses,
  type Employee,
  type EmployeeStatus,
} from '../../stories/data';
import { createMockServer } from '../../stories/mockServer';
import type { DataGridColumn, DataGridQueryState } from '../../types';
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
