import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { bodyRows, gridElement, header, names, renderGrid } from '../../testing/gridTestUtils';
import { manyPeople, people, personColumns, type Person } from '../../testing/sampleData';
import type { DataGridColumn } from '../../types';

const pageButton = (name: string) => screen.getByRole('button', { name });
const range = () => document.querySelector('.axon-datagrid__page-range')?.textContent;

describe('DataGrid pagination', () => {
  describe('in the browser', () => {
    it('shows one page at a time, with the range and page buttons', () => {
      renderGrid({ paginated: true, defaultPagination: { pageIndex: 0, pageSize: 3 } });
      expect(names()).toEqual(['Ada Lovelace', 'Grace Hopper', 'Alan Turing']);
      expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
      expect(range()).toBe('1–3 of 8');
      expect(pageButton('Page 1')).toHaveAttribute('aria-current', 'page');
      expect(pageButton('Page 3')).toBeInTheDocument();
    });

    it('does not paginate unless asked to', () => {
      renderGrid();
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
      expect(bodyRows()).toHaveLength(8);
    });

    it('moves between pages and numbers the rows by their place in the data', async () => {
      const user = userEvent.setup();
      renderGrid({ paginated: true, defaultPagination: { pageIndex: 0, pageSize: 3 } });
      await user.click(pageButton('Next page'));
      expect(names()).toEqual(['Margaret Hamilton', 'Linus Torvalds', 'Barbara Liskov']);
      expect(range()).toBe('4–6 of 8');
      expect(bodyRows()[0]).toHaveAttribute('aria-rowindex', '5');
      expect(gridElement()).toHaveAttribute('aria-rowcount', '9');

      await user.click(pageButton('Last page'));
      expect(names()).toEqual(['Dennis Ritchie', 'Radia Perlman']);
      expect(range()).toBe('7–8 of 8');
      await user.click(pageButton('First page'));
      expect(names()[0]).toBe('Ada Lovelace');
      await user.click(pageButton('Page 2'));
      expect(names()[0]).toBe('Margaret Hamilton');
      await user.click(pageButton('Previous page'));
      expect(names()[0]).toBe('Ada Lovelace');
    });

    it('announces the page', async () => {
      const user = userEvent.setup();
      renderGrid({ paginated: true, defaultPagination: { pageIndex: 0, pageSize: 3 } });
      await user.click(pageButton('Next page'));
      expect(screen.getByRole('status')).toHaveTextContent('Page 2 of 3');
    });

    it('changes the page size and goes back to the first page', async () => {
      const user = userEvent.setup();
      renderGrid({
        paginated: true,
        defaultPagination: { pageIndex: 1, pageSize: 3 },
        pageSizeOptions: [3, 5, 10],
      });
      expect(names()[0]).toBe('Margaret Hamilton');
      await user.click(screen.getByRole('combobox', { name: 'Rows per page' }));
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['3', '5', '10']);
      await user.click(screen.getByRole('option', { name: '5' }));
      expect(bodyRows()).toHaveLength(5);
      expect(names()[0]).toBe('Ada Lovelace');
      expect(range()).toBe('1–5 of 8');
    });

    it('always lists the current page size', async () => {
      const user = userEvent.setup();
      renderGrid({
        paginated: true,
        defaultPagination: { pageIndex: 0, pageSize: 4 },
        pageSizeOptions: [10, 50],
      });
      await user.click(screen.getByRole('combobox', { name: 'Rows per page' }));
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['4', '10', '50']);
    });

    it('sorts the whole data set, not the page', async () => {
      const user = userEvent.setup();
      renderGrid({ paginated: true, defaultPagination: { pageIndex: 0, pageSize: 3 } });
      await user.click(header('Age'));
      expect(names()).toEqual(['Linus Torvalds', 'Radia Perlman', 'Ada Lovelace']);
    });

    it('filters the whole data set and returns to the first page', async () => {
      const user = userEvent.setup();
      renderGrid({
        paginated: true,
        toolbar: true,
        defaultPagination: { pageIndex: 0, pageSize: 3 },
      });
      await user.click(pageButton('Last page'));
      expect(range()).toBe('7–8 of 8');
      await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'research');
      expect(names()).toEqual(['Ada Lovelace', 'Alan Turing', 'Barbara Liskov']);
      expect(range()).toBe('1–3 of 3');
    });

    it('goes back to the first page when sorting changes', async () => {
      const user = userEvent.setup();
      renderGrid({ paginated: true, defaultPagination: { pageIndex: 1, pageSize: 3 } });
      await user.click(header('Name'));
      expect(range()).toBe('1–3 of 8');
    });

    it('moves back when the page it was on no longer exists', () => {
      const { update } = renderGrid({
        paginated: true,
        defaultPagination: { pageIndex: 2, pageSize: 3 },
      });
      expect(names()).toEqual(['Dennis Ritchie', 'Radia Perlman']);
      update({ data: people.slice(0, 4) });
      expect(names()).toEqual(['Margaret Hamilton']);
      expect(range()).toBe('4–4 of 4');
    });

    it('keeps the page when the data is replaced by an edit of the same size', () => {
      const { update } = renderGrid({
        paginated: true,
        defaultPagination: { pageIndex: 1, pageSize: 3 },
      });
      update({ data: people.map((p) => ({ ...p })) });
      expect(names()[0]).toBe('Margaret Hamilton');
    });

    it('can be controlled', async () => {
      const user = userEvent.setup();
      const onPaginationChange = vi.fn();
      renderGrid({
        paginated: true,
        pagination: { pageIndex: 0, pageSize: 3 },
        onPaginationChange,
      });
      await user.click(pageButton('Next page'));
      expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 3 });
      expect(names()[0]).toBe('Ada Lovelace');
    });

    it('shows placeholder rows for one page while loading, at most ten', () => {
      const { container } = renderGrid({
        data: [],
        loading: true,
        paginated: true,
        defaultPagination: { pageIndex: 0, pageSize: 100 },
      });
      expect(
        container.querySelectorAll('.axon-datagrid__skeleton .axon-datagrid__row'),
      ).toHaveLength(10);
    });

    it('has a sensible footer with no rows at all', () => {
      renderGrid({ data: [], paginated: true });
      expect(range()).toBe('0–0 of 0');
      expect(pageButton('Page 1')).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
      const { container } = renderGrid({
        paginated: true,
        defaultPagination: { pageIndex: 0, pageSize: 3 },
      });
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('against a server', () => {
    // The server's answer: this page of rows, already sorted and filtered.
    const page = people.slice(3, 6);
    const serverColumns: DataGridColumn<Person>[] = personColumns.map((column) =>
      column.accessor === 'team'
        ? {
            ...column,
            filterable: true,
            filter: 'select' as const,
            // A server cannot offer the values it has not sent, so it says what to choose from.
            filterOptions: [
              { value: 'Platform', label: 'Platform' },
              { value: 'Kernel', label: 'Kernel' },
            ],
          }
        : column,
    );

    it('shows the rows it is given as they are, and counts pages from the total', () => {
      renderGrid({
        mode: 'server',
        paginated: true,
        data: page,
        totalRowCount: 1204,
        defaultPagination: { pageIndex: 1, pageSize: 3 },
      });
      expect(names()).toEqual(['Margaret Hamilton', 'Linus Torvalds', 'Barbara Liskov']);
      expect(range()).toBe('4–6 of 1,204');
      expect(pageButton('Page 402')).toBeInTheDocument();
      expect(gridElement()).toHaveAttribute('aria-rowcount', '1205');
      expect(bodyRows()[0]).toHaveAttribute('aria-rowindex', '5');
    });

    it('does not sort or filter what it was given', async () => {
      const user = userEvent.setup();
      renderGrid({
        mode: 'server',
        data: page,
        columns: serverColumns,
        toolbar: true,
        totalRowCount: 100,
      });
      await user.click(header('Age'));
      await user.click(header('Name'));
      expect(names()).toEqual(['Margaret Hamilton', 'Linus Torvalds', 'Barbara Liskov']);
      await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'zzz');
      expect(names()).toEqual(['Margaret Hamilton', 'Linus Torvalds', 'Barbara Liskov']);
    });

    it('reports the query when the page, sort or search change, and not on first render', async () => {
      const user = userEvent.setup();
      const onStateChange = vi.fn();
      renderGrid({
        mode: 'server',
        paginated: true,
        data: page,
        columns: serverColumns,
        toolbar: true,
        totalRowCount: 100,
        defaultPagination: { pageIndex: 0, pageSize: 3 },
        onStateChange,
      });
      expect(onStateChange).not.toHaveBeenCalled();

      await user.click(pageButton('Next page'));
      expect(onStateChange).toHaveBeenLastCalledWith({
        pagination: { pageIndex: 1, pageSize: 3 },
        sorting: [],
        filters: [],
        globalFilter: '',
      });

      await user.click(header('Salary'));
      expect(onStateChange).toHaveBeenLastCalledWith({
        pagination: { pageIndex: 0, pageSize: 3 },
        sorting: [{ id: 'salary', desc: false }],
        filters: [],
        globalFilter: '',
      });

      await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'ab');
      expect(onStateChange).toHaveBeenLastCalledWith({
        pagination: { pageIndex: 0, pageSize: 3 },
        sorting: [{ id: 'salary', desc: false }],
        filters: [],
        globalFilter: 'ab',
      });
    });

    it('reports a column filter, and a new page size', async () => {
      const user = userEvent.setup();
      const onStateChange = vi.fn();
      renderGrid({
        mode: 'server',
        paginated: true,
        data: page,
        columns: serverColumns,
        defaultShowFilters: true,
        totalRowCount: 100,
        defaultPagination: { pageIndex: 2, pageSize: 3 },
        pageSizeOptions: [3, 25],
        onStateChange,
      });
      await user.click(screen.getByRole('combobox', { name: 'Filter Team' }));
      expect(onStateChange).not.toHaveBeenCalled();
      await user.click(screen.getByRole('option', { name: 'Platform' }));
      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: { pageIndex: 0, pageSize: 3 },
          filters: [{ id: 'team', value: 'Platform' }],
        }),
      );

      await user.click(screen.getByRole('combobox', { name: 'Rows per page' }));
      await user.click(screen.getByRole('option', { name: '25' }));
      expect(onStateChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ pagination: { pageIndex: 0, pageSize: 25 } }),
      );
    });

    it('lets the owner hold the page and fetch with it', async () => {
      const user = userEvent.setup();
      const onPaginationChange = vi.fn();
      renderGrid({
        mode: 'server',
        paginated: true,
        data: page,
        totalRowCount: 30,
        pagination: { pageIndex: 0, pageSize: 10 },
        onPaginationChange,
      });
      await user.click(pageButton('Next page'));
      expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
    });

    it('keeps rows on show, marked busy, while the next page loads', () => {
      const { container } = renderGrid({
        mode: 'server',
        paginated: true,
        data: page,
        totalRowCount: 30,
        loading: true,
      });
      expect(names()).toHaveLength(3);
      expect(gridElement()).toHaveAttribute('aria-busy', 'true');
      expect(container.querySelector('.axon-datagrid__progress')).toBeInTheDocument();
    });

    it('does not move back a page just because the data on it is short', () => {
      renderGrid({
        mode: 'server',
        paginated: true,
        data: manyPeople(2),
        totalRowCount: 100,
        defaultPagination: { pageIndex: 3, pageSize: 25 },
      });
      expect(range()).toBe('76–100 of 100');
    });
  });
});
