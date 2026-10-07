import { render, screen, within } from '@testing-library/react';
import { DataGrid } from '../components/DataGrid/DataGrid';
import type { DataGridProps } from '../components/DataGrid/props';
import { people, personColumns, type Person } from './sampleData';

/** Renders a grid of the sample people with filters that do not wait, unless a test says otherwise. */
export function renderGrid(props: Partial<DataGridProps<Person>> = {}) {
  const grid = (p: Partial<DataGridProps<Person>>) => (
    <DataGrid data={people} columns={personColumns} aria-label="People" filterDebounce={0} {...p} />
  );
  const result = render(grid(props));
  return {
    ...result,
    /** Renders again with different props, keeping the grid mounted. */
    update: (next: Partial<DataGridProps<Person>>) => result.rerender(grid({ ...props, ...next })),
  };
}

export const gridElement = () => screen.getByRole('grid');
export const headers = () => screen.getAllByRole('columnheader');
export const header = (name: string) => screen.getByRole('columnheader', { name });
export const bodyRows = () =>
  screen.queryAllByRole('row').filter((row) => row.hasAttribute('data-row-id'));
export const cellsOf = (row: HTMLElement) => within(row).getAllByRole('gridcell');
/** The text of one column down the rendered body rows. */
export const column = (index: number) => bodyRows().map((row) => cellsOf(row)[index]?.textContent);
export const names = () => column(0);
