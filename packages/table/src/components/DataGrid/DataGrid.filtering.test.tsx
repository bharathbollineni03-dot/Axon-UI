import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bodyRows,
  column,
  gridElement,
  header,
  names,
  renderGrid,
} from '../../testing/gridTestUtils';
import { people, personColumns } from '../../testing/sampleData';
import type { DataGridColumn } from '../../types';
import type { Person } from '../../testing/sampleData';

const filterable: DataGridColumn<Person>[] = [
  { accessor: 'name', header: 'Name', width: 180, filterable: true },
  { accessor: 'age', header: 'Age', width: 120, filterable: true, filter: 'number-range' },
  { accessor: 'team', header: 'Team', filterable: true, filter: 'select' },
  { accessor: 'joined', header: 'Joined', width: 200, filterable: true, filter: 'date-range' },
  { accessor: 'salary', header: 'Salary', searchable: false },
];

const search = () => screen.getByRole('searchbox', { name: 'Search' });
const filtersButton = () => screen.getByRole('button', { name: /^Filters/ });

describe('DataGrid filtering and search', () => {
  afterEach(() => vi.useRealTimers());

  describe('toolbar', () => {
    it('is not there unless asked for', () => {
      renderGrid({ columns: filterable });
      expect(screen.queryByRole('group', { name: 'Data grid tools' })).not.toBeInTheDocument();
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    });

    it('offers search, filters and density', () => {
      renderGrid({ columns: filterable, toolbar: true });
      expect(screen.getByRole('group', { name: 'Data grid tools' })).toBeInTheDocument();
      expect(search()).toBeInTheDocument();
      expect(filtersButton()).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: 'Density' })).toBeInTheDocument();
    });

    it('leaves out the Filters button when no column can be filtered', () => {
      renderGrid({ toolbar: true });
      expect(screen.queryByRole('button', { name: /^Filters/ })).not.toBeInTheDocument();
    });

    it('lets you choose the tools', () => {
      renderGrid({ columns: filterable, toolbar: { search: false, density: false } });
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Density' })).not.toBeInTheDocument();
      expect(filtersButton()).toBeInTheDocument();
    });

    it('shows your own content at the start and end', () => {
      renderGrid({
        toolbar: { search: false, density: false },
        toolbarStart: <h2>Team</h2>,
        toolbarEnd: <button>Add person</button>,
      });
      expect(screen.getByRole('heading', { name: 'Team' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Add person' })).toBeInTheDocument();
    });

    it('changes the density from its menu', async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      const { container } = renderGrid({ toolbar: true, onLayoutChange });
      await user.click(screen.getByRole('button', { name: 'Density' }));
      await user.click(screen.getByRole('menuitemradio', { name: 'Compact' }));
      expect(container.querySelector('.axon-datagrid--compact')).toBeInTheDocument();
      expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining({ density: 'compact' }));
    });
  });

  describe('search', () => {
    it('keeps the rows that contain the text, ignoring case', async () => {
      const user = userEvent.setup();
      renderGrid({ toolbar: true });
      await user.type(search(), 'LOVELACE');
      expect(names()).toEqual(['Ada Lovelace']);
    });

    it('looks in every searchable column, including numbers and dates', async () => {
      const user = userEvent.setup();
      renderGrid({ toolbar: true, locale: 'en-US' });
      await user.type(search(), 'platform');
      expect(names()).toEqual(['Grace Hopper', 'Margaret Hamilton', 'Radia Perlman']);
      await user.clear(search());
      await user.type(search(), '142000');
      expect(names()).toEqual(['Barbara Liskov']);
      await user.clear(search());
      await user.type(search(), '2022');
      expect(names()).toEqual(['Radia Perlman']);
    });

    it('skips columns that opt out', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, toolbar: true });
      await user.type(search(), '142000');
      expect(bodyRows()).toHaveLength(0);
    });

    it('says when nothing matches and offers to start over', async () => {
      const user = userEvent.setup();
      renderGrid({ toolbar: true });
      await user.type(search(), 'zzz');
      expect(screen.getByText('No rows match your filters')).toBeInTheDocument();
      await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[1] as HTMLElement);
      expect(bodyRows()).toHaveLength(8);
      expect(search()).toHaveValue('');
    });

    it('can be cleared with the Clear filters button, and with the field’s own button', async () => {
      const user = userEvent.setup();
      renderGrid({ toolbar: true });
      await user.type(search(), 'ada');
      expect(bodyRows()).toHaveLength(1);
      await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(bodyRows()).toHaveLength(8);
      expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();

      await user.type(search(), 'ada');
      await user.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(bodyRows()).toHaveLength(8);
    });

    it('announces how many rows are left', async () => {
      const user = userEvent.setup();
      renderGrid({ toolbar: true });
      await user.type(search(), 'platform');
      expect(screen.getByRole('status')).toHaveTextContent('3 rows');
      await user.clear(search());
      await user.type(search(), 'ada');
      expect(screen.getByRole('status')).toHaveTextContent('1 row');
    });

    it('waits for a pause in typing before filtering', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderGrid({ toolbar: true, filterDebounce: 300 });
      await user.type(search(), 'ada');
      expect(bodyRows()).toHaveLength(8);
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(bodyRows()).toHaveLength(1);
    });

    it('can be controlled', async () => {
      const user = userEvent.setup();
      const onGlobalFilterChange = vi.fn();
      renderGrid({ toolbar: true, globalFilter: 'hopper', onGlobalFilterChange });
      expect(names()).toEqual(['Grace Hopper']);
      expect(search()).toHaveValue('hopper');
      await user.type(search(), 'x');
      expect(onGlobalFilterChange).toHaveBeenLastCalledWith('hopperx');
      // The grid shows only what it is given.
      expect(names()).toEqual(['Grace Hopper']);
    });

    it('starts from a default', () => {
      renderGrid({ toolbar: true, defaultGlobalFilter: 'kernel' });
      expect(names()).toEqual(['Linus Torvalds', 'Dennis Ritchie']);
      expect(search()).toHaveValue('kernel');
    });
  });

  describe('filter row', () => {
    it('opens from the Filters button, with a control for each filterable column', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, toolbar: true });
      expect(screen.queryByRole('textbox', { name: 'Filter Name' })).not.toBeInTheDocument();
      await user.click(filtersButton());
      expect(filtersButton()).toHaveAttribute('aria-pressed', 'true');
      const row = screen.getByRole('row', { name: 'Column filters' });
      expect(within(row).getByRole('textbox', { name: 'Filter Name' })).toBeInTheDocument();
      expect(within(row).getByRole('spinbutton', { name: 'Age, minimum' })).toBeInTheDocument();
      expect(within(row).getByRole('spinbutton', { name: 'Age, maximum' })).toBeInTheDocument();
      expect(within(row).getByRole('combobox', { name: 'Filter Team' })).toBeInTheDocument();
      expect(within(row).getByRole('textbox', { name: 'Joined, from' })).toBeInTheDocument();
      expect(within(row).getByRole('textbox', { name: 'Joined, to' })).toBeInTheDocument();
      // Salary has no filter.
      expect(within(row).getAllByRole('gridcell')).toHaveLength(5);
      await user.click(filtersButton());
      expect(screen.queryByRole('row', { name: 'Column filters' })).not.toBeInTheDocument();
    });

    it('numbers the rows after it', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, toolbar: true });
      expect(bodyRows()[0]).toHaveAttribute('aria-rowindex', '2');
      await user.click(filtersButton());
      expect(gridElement()).toHaveAttribute('aria-rowcount', '10');
      expect(bodyRows()[0]).toHaveAttribute('aria-rowindex', '3');
    });

    it('can start open', () => {
      renderGrid({ columns: filterable, defaultShowFilters: true });
      expect(screen.getByRole('textbox', { name: 'Filter Name' })).toBeInTheDocument();
    });

    it('filters text, keeping rows that contain it', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, defaultShowFilters: true });
      await user.type(screen.getByRole('textbox', { name: 'Filter Name' }), 'love');
      expect(names()).toEqual(['Ada Lovelace']);
    });

    it('filters a number range, and either end can be left open', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, defaultShowFilters: true });
      await user.type(screen.getByRole('spinbutton', { name: 'Age, minimum' }), '36');
      expect(column(1)).toEqual(['36', '45', '41', '36', '52', '38']);
      await user.type(screen.getByRole('spinbutton', { name: 'Age, maximum' }), '41');
      expect(column(1)).toEqual(['36', '41', '36', '38']);
      await user.clear(screen.getByRole('spinbutton', { name: 'Age, minimum' }));
      expect(column(1)).toEqual(['36', '41', '36', '29', '38', '33']);
    });

    it('offers the distinct values of a column as a select filter', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, defaultShowFilters: true });
      await user.click(screen.getByRole('combobox', { name: 'Filter Team' }));
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
        'All',
        'Kernel',
        'Platform',
        'Research',
      ]);
      await user.click(screen.getByRole('option', { name: 'Platform' }));
      expect(names()).toEqual(['Grace Hopper', 'Margaret Hamilton', 'Radia Perlman']);
      await user.click(screen.getByRole('combobox', { name: 'Filter Team' }));
      await user.click(screen.getByRole('option', { name: 'All' }));
      expect(bodyRows()).toHaveLength(8);
    });

    it('uses the options a column gives', async () => {
      const user = userEvent.setup();
      renderGrid({
        columns: [
          {
            accessor: 'team',
            header: 'Team',
            filterable: true,
            filter: 'select',
            filterOptions: [
              { value: 'Kernel', label: 'The kernel team' },
              { value: 'Research', label: 'Research' },
            ],
          },
        ],
        defaultShowFilters: true,
      });
      await user.click(screen.getByRole('combobox', { name: 'Filter Team' }));
      expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
        'All',
        'The kernel team',
        'Research',
      ]);
    });

    it('filters a date range by calendar day, both ends included', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, defaultShowFilters: true });
      const from = screen.getByRole('textbox', { name: 'Joined, from' });
      await user.type(from, '01/01/2018{Enter}');
      expect(names()).toEqual([
        'Ada Lovelace',
        'Alan Turing',
        'Margaret Hamilton',
        'Linus Torvalds',
        'Radia Perlman',
      ]);
      const to = screen.getByRole('textbox', { name: 'Joined, to' });
      await user.type(to, '03/04/2019{Enter}');
      expect(names()).toEqual(['Ada Lovelace', 'Margaret Hamilton']);
    });

    it('combines filters from several columns', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, defaultShowFilters: true });
      await user.type(screen.getByRole('spinbutton', { name: 'Age, minimum' }), '36');
      await user.click(screen.getByRole('combobox', { name: 'Filter Team' }));
      await user.click(screen.getByRole('option', { name: 'Research' }));
      expect(names()).toEqual(['Ada Lovelace', 'Alan Turing', 'Barbara Liskov']);
    });

    it('counts the filters that are on, and clears them all', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, toolbar: true, defaultShowFilters: true });
      await user.type(screen.getByRole('textbox', { name: 'Filter Name' }), 'a');
      await user.type(screen.getByRole('spinbutton', { name: 'Age, minimum' }), '40');
      expect(screen.getByRole('button', { name: 'Filters (2)' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Clear filters' }));
      expect(bodyRows()).toHaveLength(8);
      expect(screen.getByRole('textbox', { name: 'Filter Name' })).toHaveValue('');
      expect(screen.getByRole('spinbutton', { name: 'Age, minimum' })).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
    });

    it('treats a filter of only spaces as no filter', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, defaultShowFilters: true });
      await user.type(screen.getByRole('textbox', { name: 'Filter Name' }), '   ');
      expect(bodyRows()).toHaveLength(8);
      expect(screen.getByRole('textbox', { name: 'Filter Name' })).toHaveValue('   ');
    });

    it('starts from, and reports, the filters you give it', async () => {
      const user = userEvent.setup();
      const onColumnFiltersChange = vi.fn();
      renderGrid({
        columns: filterable,
        defaultColumnFilters: [{ id: 'team', value: 'Kernel' }],
        onColumnFiltersChange,
      });
      // Filters that are on show their row.
      expect(names()).toEqual(['Linus Torvalds', 'Dennis Ritchie']);
      await user.type(screen.getByRole('textbox', { name: 'Filter Name' }), 'l');
      expect(onColumnFiltersChange).toHaveBeenLastCalledWith([
        { id: 'team', value: 'Kernel' },
        { id: 'name', value: 'l' },
      ]);
    });

    it('can be controlled', async () => {
      const user = userEvent.setup();
      const onColumnFiltersChange = vi.fn();
      renderGrid({
        columns: filterable,
        columnFilters: [{ id: 'name', value: 'grace' }],
        onColumnFiltersChange,
      });
      expect(names()).toEqual(['Grace Hopper']);
      await user.clear(screen.getByRole('textbox', { name: 'Filter Name' }));
      expect(onColumnFiltersChange).toHaveBeenLastCalledWith([]);
      expect(names()).toEqual(['Grace Hopper']);
    });

    it('waits for a pause in typing', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderGrid({ columns: filterable, defaultShowFilters: true, filterDebounce: 250 });
      await user.type(screen.getByRole('textbox', { name: 'Filter Name' }), 'grace');
      expect(bodyRows()).toHaveLength(8);
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(names()).toEqual(['Grace Hopper']);
    });

    it('sorts and filters together', async () => {
      const user = userEvent.setup();
      renderGrid({ columns: filterable, defaultShowFilters: true });
      await user.click(header('Name'));
      await user.click(header('Name'));
      await user.type(screen.getByRole('textbox', { name: 'Filter Name' }), 'r');
      expect(names()).toEqual([
        'Radia Perlman',
        'Margaret Hamilton',
        'Linus Torvalds',
        'Grace Hopper',
        'Dennis Ritchie',
        'Barbara Liskov',
        'Alan Turing',
      ]);
    });

    it('has no accessibility violations with the filter row open', async () => {
      const { container } = renderGrid({
        columns: filterable,
        toolbar: true,
        defaultShowFilters: true,
      });
      await waitFor(async () => expect(await axe(container)).toHaveNoViolations());
    });
  });

  it('shows the grid’s own empty message, not the filter one, when there was never any data', () => {
    renderGrid({ data: [], columns: personColumns, toolbar: true });
    expect(screen.getByText('No rows to display')).toBeInTheDocument();
    expect(people.length).toBeGreaterThan(0);
  });
});
