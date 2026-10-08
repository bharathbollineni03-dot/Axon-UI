import { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  AppBar,
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  GridItem,
  Heading,
  Sidebar,
  SidebarItem,
  SidebarSection,
  SidebarToggle,
  Stack,
  Text,
} from '@axon/core';
import { useTheme } from '@axon/theme';
import { BarChart, DonutChart, LineChart, StatCard } from '@axon/charts';
import { DataGrid, type DataGridColumn } from '@axon/table';

const meta: Meta = {
  title: 'Examples/Admin dashboard',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A complete admin page built only from Axon components: an app bar and a collapsible sidebar from `@axon/core`, KPI cards and charts from `@axon/charts`, and a `DataGrid` of orders from `@axon/table`.',
      },
    },
  },
};
export default meta;
type Story = StoryObj;

// Data ------------------------------------------------------------------------------------------

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const revenue = months.map((month, index) => ({
  month,
  revenue: Math.round(82 + index * 7.5 + ((index * 37) % 11) * 2),
  costs: Math.round(60 + index * 3.2 + ((index * 53) % 9) * 1.5),
}));
const channels = [
  { name: 'Direct', value: 4120 },
  { name: 'Search', value: 3380 },
  { name: 'Partners', value: 1890 },
  { name: 'Social', value: 1240 },
];
const signups = [
  { week: 'W1', signups: 320 },
  { week: 'W2', signups: 410 },
  { week: 'W3', signups: 388 },
  { week: 'W4', signups: 502 },
  { week: 'W5', signups: 471 },
  { week: 'W6', signups: 560 },
];

type OrderStatus = 'Paid' | 'Pending' | 'Refunded' | 'Failed';
interface Order {
  id: string;
  customer: string;
  plan: 'Starter' | 'Team' | 'Business';
  amount: number;
  status: OrderStatus;
  placed: Date;
}

const customers = [
  'Acme Corp',
  'Globex',
  'Initech',
  'Umbrella',
  'Hooli',
  'Stark Industries',
  'Wayne Enterprises',
  'Soylent',
];
const plans: Order['plan'][] = ['Starter', 'Team', 'Business'];
const statuses: OrderStatus[] = ['Paid', 'Paid', 'Paid', 'Pending', 'Refunded', 'Failed'];

function makeOrders(count: number): Order[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ORD-${String(1000 + i)}`,
    customer: customers[(i * 5) % customers.length] as string,
    plan: plans[(i * 7) % plans.length] as Order['plan'],
    amount: 49 + ((i * 131) % 900),
    status: statuses[(i * 11) % statuses.length] as OrderStatus,
    placed: new Date(2025, 9, 28 - (i % 28), 9 + (i % 9), (i * 7) % 60),
  }));
}

const statusColor = {
  Paid: 'success',
  Pending: 'warning',
  Refunded: 'neutral',
  Failed: 'danger',
} as const;
const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const orderColumns: DataGridColumn<Order>[] = [
  { accessor: 'id', header: 'Order', width: 120 },
  { accessor: 'customer', header: 'Customer', width: 180, filterable: true },
  {
    accessor: 'plan',
    header: 'Plan',
    width: 120,
    filterable: true,
    filter: 'select',
    groupable: true,
  },
  {
    accessor: 'status',
    header: 'Status',
    width: 130,
    filterable: true,
    filter: 'select',
    cell: ({ value }) => (
      <Chip size="sm" color={statusColor[value as OrderStatus]} label={value as string} />
    ),
  },
  {
    accessor: 'amount',
    header: 'Amount',
    width: 120,
    align: 'end',
    aggregate: 'sum',
    cell: ({ value }) => money.format(value as number),
  },
  { accessor: 'placed', header: 'Placed', width: 150 },
];

// Icons: the example uses its own so it depends on nothing but Axon ----------------------------------

const Glyph = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);
const icons = {
  home: <Glyph d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  orders: <Glyph d="M6 3h12l2 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8zM4 8h16M9 12h6" />,
  people: (
    <Glyph d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  ),
  chart: <Glyph d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
  gear: (
    <Glyph d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  ),
  dollar: <Glyph d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  users: <Glyph d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
};

// The page -------------------------------------------------------------------------------------------

function ModeButton() {
  const { resolvedMode, setMode } = useTheme();
  return (
    <Button
      size="sm"
      variant="ghost"
      color="neutral"
      onClick={() => setMode(resolvedMode === 'dark' ? 'light' : 'dark')}
    >
      {resolvedMode === 'dark' ? 'Light mode' : 'Dark mode'}
    </Button>
  );
}

function Dashboard() {
  const orders = useMemo(() => makeOrders(120), []);
  const [range, setRange] = useState<'12m' | '6m'>('12m');
  const shown = range === '12m' ? revenue : revenue.slice(-6);

  return (
    <div
      style={{ display: 'flex', minHeight: '100vh', background: 'var(--axon-color-background)' }}
    >
      <div style={{ position: 'sticky', top: 0, alignSelf: 'flex-start', height: '100vh' }}>
        <Sidebar aria-label="Main" header={<strong>Axon Admin</strong>} footer={<SidebarToggle />}>
          <SidebarSection title="Overview">
            <SidebarItem href="#" icon={icons.home} label="Dashboard" active />
            <SidebarItem href="#" icon={icons.orders} label="Orders" badge="12" />
            <SidebarItem href="#" icon={icons.people} label="Customers" />
            <SidebarItem href="#" icon={icons.chart} label="Reports" />
          </SidebarSection>
          <SidebarSection title="Account">
            <SidebarItem href="#" icon={icons.gear} label="Settings" />
          </SidebarSection>
        </Sidebar>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          trailing={
            <Stack direction="row" align="center" gap={2}>
              <ModeButton />
              <Avatar name="Ada Lovelace" size="sm" />
            </Stack>
          }
        >
          <Heading level={1} size="lg">
            Dashboard
          </Heading>
        </AppBar>

        <main
          style={{ padding: 'var(--axon-space-6)', display: 'grid', gap: 'var(--axon-space-6)' }}
        >
          <Grid columns={12} gap={4} role="list" aria-label="Key figures">
            <GridItem span={{ base: 12, sm: 6, lg: 3 }} role="listitem">
              <StatCard
                title="Revenue"
                value={128430}
                valueFormat="$,.0f"
                delta={0.124}
                deltaLabel="vs last month"
                icon={icons.dollar}
                sparkline={revenue.map((r) => r.revenue)}
              />
            </GridItem>
            <GridItem span={{ base: 12, sm: 6, lg: 3 }} role="listitem">
              <StatCard
                title="Active users"
                value={8412}
                valueFormat=",.0f"
                delta={0.058}
                deltaLabel="vs last month"
                icon={icons.users}
                sparkline={signups.map((s) => s.signups)}
              />
            </GridItem>
            <GridItem span={{ base: 12, sm: 6, lg: 3 }} role="listitem">
              <StatCard
                title="Churn"
                value={0.021}
                valueFormat=".1%"
                delta={-0.004}
                deltaFormat="+.1%"
                deltaLabel="vs last month"
                positiveIsGood={false}
              />
            </GridItem>
            <GridItem span={{ base: 12, sm: 6, lg: 3 }} role="listitem">
              <StatCard
                title="Avg. order"
                value={212}
                valueFormat="$,.0f"
                delta={0.031}
                deltaLabel="vs last month"
              />
            </GridItem>
          </Grid>

          <Grid columns={12} gap={4}>
            <GridItem span={{ base: 12, lg: 8 }}>
              <Card variant="outlined">
                <CardHeader
                  title="Revenue and costs"
                  titleAs="h2"
                  subtitle="In thousands of dollars"
                  action={
                    <Stack direction="row" gap={1}>
                      <Chip
                        size="sm"
                        label="12 months"
                        selected={range === '12m'}
                        onClick={() => setRange('12m')}
                      />
                      <Chip
                        size="sm"
                        label="6 months"
                        selected={range === '6m'}
                        onClick={() => setRange('6m')}
                      />
                    </Stack>
                  }
                />
                <CardContent>
                  <LineChart
                    data={shown}
                    xKey="month"
                    series={[
                      { key: 'revenue', name: 'Revenue' },
                      { key: 'costs', name: 'Costs' },
                    ]}
                    valueFormat="$,.0f"
                    yAxis={{ tickFormat: '$~s' }}
                    height={300}
                  />
                </CardContent>
              </Card>
            </GridItem>
            <GridItem span={{ base: 12, lg: 4 }}>
              <Card variant="outlined" style={{ height: '100%' }}>
                <CardHeader title="Sales by channel" titleAs="h2" />
                <CardContent>
                  <DonutChart
                    data={channels}
                    valueFormat=",.0f"
                    centerLabel="Orders"
                    height={300}
                  />
                </CardContent>
              </Card>
            </GridItem>
            <GridItem span={{ base: 12, lg: 4 }}>
              <Card variant="outlined">
                <CardHeader title="Weekly signups" titleAs="h2" />
                <CardContent>
                  <BarChart
                    data={signups}
                    xKey="week"
                    series={[{ key: 'signups', name: 'Signups' }]}
                    title="Signups by week"
                    height={240}
                    legend={false}
                  />
                </CardContent>
              </Card>
            </GridItem>
            <GridItem span={{ base: 12, lg: 8 }}>
              <Card variant="outlined">
                <CardHeader
                  title="Recent orders"
                  titleAs="h2"
                  subtitle="Sort, filter, group by plan, select rows or export them"
                />
                <CardContent>
                  <DataGrid
                    data={orders}
                    columns={orderColumns}
                    aria-label="Recent orders"
                    toolbar
                    selectable
                    paginated
                    defaultPagination={{ pageIndex: 0, pageSize: 8 }}
                    pageSizeOptions={[8, 16, 32]}
                    locale="en-US"
                    exportFileName="orders.csv"
                    bulkActions={({ rowIds }) => (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => alert(`Refund ${rowIds.length} orders?`)}
                      >
                        Refund
                      </Button>
                    )}
                  />
                </CardContent>
              </Card>
            </GridItem>
          </Grid>
          <Text size="sm" color="secondary">
            Every part of this page is an Axon component. Use the Theme menu in the Storybook
            toolbar to try dark mode.
          </Text>
        </main>
      </div>
    </div>
  );
}

export const Page: Story = { name: 'Dashboard', render: () => <Dashboard /> };
