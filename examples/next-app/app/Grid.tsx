'use client';

import { DataGrid, type DataGridColumn } from '@axon/table';

interface Person {
  id: number;
  name: string;
  team: string;
  salary: number;
}

const people: Person[] = [
  { id: 1, name: 'Ada Lovelace', team: 'Research', salary: 120000 },
  { id: 2, name: 'Grace Hopper', team: 'Platform', salary: 135000 },
  { id: 3, name: 'Alan Turing', team: 'Research', salary: 128000 },
];

// Column definitions hold functions, so the grid is used from a client component: a server
// component cannot pass functions to a client component.
const columns: DataGridColumn<Person>[] = [
  { accessor: 'name', header: 'Name' },
  { accessor: 'team', header: 'Team', filterable: true, filter: 'select' },
  {
    accessor: 'salary',
    header: 'Salary',
    align: 'end',
    cell: ({ value }) => `$${value.toLocaleString('en-US')}`,
  },
];

export function People() {
  return <DataGrid data={people} columns={columns} aria-label="People" toolbar locale="en-US" />;
}
