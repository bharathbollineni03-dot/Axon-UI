import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from '@axon/core';
import { makeEmployees, type Employee, type EmployeeStatus } from '../../stories/data';
import type { DataGridColumn } from '../../types';
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
