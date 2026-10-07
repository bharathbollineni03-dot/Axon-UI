import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  type TableProps,
  type TableSortDirection,
} from './Table';

const regions = [
  { region: 'North America', q1: 120400, q2: 138250, q3: 151900, q4: 172300 },
  { region: 'Europe', q1: 98100, q2: 104600, q3: 110250, q4: 129800 },
  { region: 'Asia Pacific', q1: 87250, q2: 99800, q3: 121400, q4: 140100 },
  { region: 'Latin America', q1: 31200, q2: 34650, q3: 39800, q4: 44200 },
  { region: 'Middle East & Africa', q1: 18900, q2: 22300, q3: 25100, q4: 29750 },
];

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const totals = (key: 'q1' | 'q2' | 'q3' | 'q4') => regions.reduce((sum, r) => sum + r[key], 0);

const meta: Meta<TableProps> = {
  title: 'Table/Table',
  component: Table,
  parameters: { layout: 'padded' },
  argTypes: {
    striped: { control: 'boolean' },
    bordered: { control: 'boolean' },
    dense: { control: 'boolean' },
    hoverable: { control: 'boolean' },
    stickyHeader: { control: 'boolean' },
    hideCaption: { control: 'boolean' },
    captionSide: { control: 'inline-radio', options: ['top', 'bottom'] },
    maxHeight: { control: { type: 'number', min: 120, max: 600, step: 20 } },
    children: { control: false },
  },
  args: { caption: 'Revenue by region, 2025' },
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Region</TableHeaderCell>
          <TableHeaderCell align="end">Q1</TableHeaderCell>
          <TableHeaderCell align="end">Q2</TableHeaderCell>
          <TableHeaderCell align="end">Q3</TableHeaderCell>
          <TableHeaderCell align="end">Q4</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {regions.map((r) => (
          <TableRow key={r.region}>
            <TableCell>{r.region}</TableCell>
            <TableCell numeric>{money.format(r.q1)}</TableCell>
            <TableCell numeric>{money.format(r.q2)}</TableCell>
            <TableCell numeric>{money.format(r.q3)}</TableCell>
            <TableCell numeric>{money.format(r.q4)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFoot>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell numeric>{money.format(totals('q1'))}</TableCell>
          <TableCell numeric>{money.format(totals('q2'))}</TableCell>
          <TableCell numeric>{money.format(totals('q3'))}</TableCell>
          <TableCell numeric>{money.format(totals('q4'))}</TableCell>
        </TableRow>
      </TableFoot>
    </Table>
  ),
};
export default meta;
type Story = StoryObj<TableProps>;

export const Playground: Story = {};

export const Striped: Story = { args: { striped: true } };

export const Bordered: Story = { args: { bordered: true } };

export const Dense: Story = { args: { dense: true, striped: true, hoverable: true } };

export const HiddenCaption: Story = {
  args: {
    hideCaption: true,
    caption: 'Revenue by region (the caption is only for screen readers)',
  },
};

export const StickyHeader: Story = {
  args: { stickyHeader: true, maxHeight: 220, striped: true },
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>#</TableHeaderCell>
          <TableHeaderCell>Item</TableHeaderCell>
          <TableHeaderCell align="end">Price</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: 30 }, (_, i) => (
          <TableRow key={i}>
            <TableCell numeric>{i + 1}</TableCell>
            <TableCell>Line item {i + 1}</TableCell>
            <TableCell numeric>{money.format(20 + ((i * 37) % 180))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

function SortableTable(args: TableProps) {
  const [sort, setSort] = useState<{ key: 'region' | 'q4'; dir: TableSortDirection }>({
    key: 'q4',
    dir: 'desc',
  });
  const rows = [...regions].sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    const order =
      typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
    return sort.dir === 'desc' ? -order : order;
  });
  const next = (key: 'region' | 'q4') =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));
  const dirOf = (key: 'region' | 'q4'): TableSortDirection =>
    sort.key === key ? sort.dir : 'none';

  return (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableHeaderCell sort={dirOf('region')} onSort={() => next('region')}>
            Region
          </TableHeaderCell>
          <TableHeaderCell align="end" sort={dirOf('q4')} onSort={() => next('q4')}>
            Q4
          </TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.region}>
            <TableCell>{r.region}</TableCell>
            <TableCell numeric>{money.format(r.q4)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export const SortableHeaders: Story = {
  name: 'Sortable headers (you own the sorting)',
  args: { hoverable: true },
  render: (args) => <SortableTable {...args} />,
};
