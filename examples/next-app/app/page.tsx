import { Button, Card, CardContent, CardHeader, Heading, Stack, TextField } from '@axonui/core';
import { LineChart, StatCard } from '@axonui/charts';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@axonui/table';
import { Login } from './Login';
import { People } from './Grid';

const revenue = [
  { month: 'Jan', revenue: 120 },
  { month: 'Feb', revenue: 145 },
  { month: 'Mar', revenue: 165 },
];

// A server component: it renders on the server, and the Axon components inside it are client
// components that are rendered to HTML on the server too, then hydrated in the browser.
export default function Page() {
  return (
    <main style={{ display: 'grid', gap: 24, padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <Heading level={1}>Axon UI in Next.js</Heading>

      <Stack direction="row" gap={2} align="end">
        <TextField label="Email" type="email" />
        <Button>Subscribe</Button>
      </Stack>

      <StatCard
        title="Revenue"
        value={128430}
        valueFormat="$,.0f"
        delta={0.124}
        deltaLabel="vs last month"
      />

      <Card variant="outlined">
        <CardHeader title="Revenue" titleAs="h2" />
        <CardContent>
          <LineChart
            data={revenue}
            xKey="month"
            series={[{ key: 'revenue', name: 'Revenue' }]}
            height={220}
          />
        </CardContent>
      </Card>

      <Table caption="Quarterly revenue" striped>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Quarter</TableHeaderCell>
            <TableHeaderCell align="end">Revenue</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Q1</TableCell>
            <TableCell numeric>$430</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <People />

      <Login />
    </main>
  );
}
