import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { manyPeople, people, personColumns, type Person } from '../../testing/sampleData';
import type { DataGridColumn } from '../../types';
import { DataGrid } from './DataGrid';
import type { DataGridProps } from './props';

function renderGrid(props: Partial<DataGridProps<Person>> = {}) {
  return render(<DataGrid data={people} columns={personColumns} aria-label="People" {...props} />);
}

const grid = () => screen.getByRole('grid');
const headers = () => screen.getAllByRole('columnheader');
const header = (name: string) => screen.getByRole('columnheader', { name });
const bodyRows = () => screen.getAllByRole('row').slice(1);
const cellsOf = (row: HTMLElement) => within(row).getAllByRole('gridcell');
/** The text of one column down the rendered rows. */
const column = (index: number) => bodyRows().map((row) => cellsOf(row)[index]?.textContent);
const names = () => column(0);

/** jsdom has no layout, so a virtualized grid has to be told how big its scroll area is. */
function mockViewport(width: number, height: number) {
  const offsetHeight = vi
    .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
    .mockReturnValue(height);
  const offsetWidth = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(width);
  return () => {
    offsetHeight.mockRestore();
    offsetWidth.mockRestore();
  };
}

describe('DataGrid', () => {
  describe('rendering', () => {
    it('is a grid named by aria-label, with every column and row counted', () => {
      renderGrid();
      expect(screen.getByRole('grid', { name: 'People' })).toBeInTheDocument();
      expect(grid()).toHaveAttribute('aria-colcount', '6');
      expect(grid()).toHaveAttribute('aria-rowcount', '9');
      expect(headers().map((h) => h.textContent)).toEqual([
        'Name',
        'Age',
        'Team',
        'Joined',
        'Active',
        'Salary',
      ]);
      expect(bodyRows()).toHaveLength(8);
    });

    it('can be named by another element instead', () => {
      render(
        <>
          <h2 id="title">Team roster</h2>
          <DataGrid data={people} columns={personColumns} aria-labelledby="title" />
        </>,
      );
      expect(screen.getByRole('grid', { name: 'Team roster' })).toBeInTheDocument();
    });

    it('falls back to a generic name', () => {
      render(<DataGrid data={people} columns={personColumns} />);
      expect(screen.getByRole('grid', { name: 'Data grid' })).toBeInTheDocument();
    });

    it('numbers rows and columns for assistive technology', () => {
      renderGrid();
      const rows = screen.getAllByRole('row');
      expect(rows.map((r) => r.getAttribute('aria-rowindex'))).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
      ]);
      expect(cellsOf(rows[1] as HTMLElement).map((c) => c.getAttribute('aria-colindex'))).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
      ]);
    });

    it('formats values by their type and shows nothing for a missing one', () => {
      renderGrid({ locale: 'en-US' });
      const first = cellsOf(bodyRows()[0] as HTMLElement).map((c) => c.textContent);
      expect(first).toEqual(['Ada Lovelace', '36', 'Research', '3/4/2019', 'Yes', '120,000']);
      const turing = cellsOf(bodyRows()[2] as HTMLElement);
      expect(turing[5]?.textContent).toBe('');
      expect(turing[4]?.textContent).toBe('No');
    });

    it('reads accessors that are functions and uses a column id', () => {
      const columns: DataGridColumn<Person>[] = [
        {
          id: 'initials',
          header: 'Initials',
          accessor: (p) =>
            p.name
              .split(' ')
              .map((w) => w[0])
              .join(''),
        },
        { id: 'actions', header: 'Actions', cell: ({ row }) => <button>Open {row.name}</button> },
      ];
      renderGrid({ columns });
      expect(column(0)[0]).toBe('AL');
      expect(screen.getByRole('button', { name: 'Open Ada Lovelace' })).toBeInTheDocument();
    });

    it('gives a custom cell the value, row, id and position', () => {
      const cell = vi.fn(() => 'x');
      renderGrid({ columns: [{ accessor: 'name', header: 'Name', cell }] });
      expect(cell).toHaveBeenCalledWith(
        expect.objectContaining({
          value: 'Ada Lovelace',
          row: people[0],
          rowId: '1',
          rowIndex: 0,
        }),
      );
    });

    it('can draw the header with its own content and keeps the text as its name', () => {
      renderGrid({
        columns: [
          {
            accessor: 'name',
            header: 'Name',
            renderHeader: () => <em data-testid="fancy">★ Name</em>,
          },
        ],
      });
      expect(screen.getByTestId('fancy')).toBeInTheDocument();
      expect(header('Name')).toBeInTheDocument();
    });

    it('throws a helpful error for a column that cannot be identified', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        expect(() => renderGrid({ columns: [{ header: 'Mystery', cell: () => null }] })).toThrow(
          /needs an `id`/,
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('identifies rows by their id property, or by a function', () => {
      const { unmount } = renderGrid();
      expect(bodyRows()[0]).toHaveAttribute('data-row-id', '1');
      unmount();
      renderGrid({ getRowId: (row) => `person-${row.id}` });
      expect(bodyRows()[0]).toHaveAttribute('data-row-id', 'person-1');
    });

    it('applies the options as classes and passes other props to the root', () => {
      const { container } = renderGrid({
        striped: true,
        bordered: true,
        className: 'mine',
        id: 'g1',
      });
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass(
        'axon-datagrid',
        'axon-datagrid--striped',
        'axon-datagrid--bordered',
        'mine',
      );
      expect(root).toHaveAttribute('id', 'g1');
    });

    it('sets the row height from the density and lets a number override it', () => {
      const { container, rerender } = renderGrid({ defaultDensity: 'compact' });
      const root = container.firstElementChild as HTMLElement;
      expect(root.style.getPropertyValue('--axon-datagrid-row-height')).toBe('32px');
      rerender(
        <DataGrid data={people} columns={personColumns} aria-label="People" rowHeight={70} />,
      );
      expect(root.style.getPropertyValue('--axon-datagrid-row-height')).toBe('70px');
    });

    it('sizes columns from their width and grows the last one to fill', () => {
      renderGrid();
      const name = header('Name');
      expect(name).toHaveStyle({ minWidth: '180px' });
      const salary = header('Salary');
      expect(salary.style.flex).toBe('1 0 150px');
    });

    it('calls onRowClick with the row', async () => {
      const onRowClick = vi.fn();
      renderGrid({ onRowClick });
      await userEvent.click(cellsOf(bodyRows()[1] as HTMLElement)[0] as HTMLElement);
      expect(onRowClick).toHaveBeenCalledWith(people[1], expect.anything());
    });

    it('adds the class names and styles a row asks for', () => {
      renderGrid({
        rowProps: (row) =>
          row.active ? undefined : { className: 'inactive', style: { opacity: 0.5 } },
      });
      expect(bodyRows()[2]).toHaveClass('inactive');
      expect(bodyRows()[2]).toHaveStyle({ opacity: '0.5' });
      expect(bodyRows()[0]).not.toHaveClass('inactive');
    });
  });

  describe('sorting', () => {
    it('sorts ascending, then descending, then back to the data order', async () => {
      renderGrid();
      const original = names();
      await userEvent.click(header('Name'));
      expect(names()).toEqual([...original].sort());
      expect(header('Name')).toHaveAttribute('aria-sort', 'ascending');

      await userEvent.click(header('Name'));
      expect(names()).toEqual([...original].sort().reverse());
      expect(header('Name')).toHaveAttribute('aria-sort', 'descending');

      await userEvent.click(header('Name'));
      expect(names()).toEqual(original);
      expect(header('Name')).toHaveAttribute('aria-sort', 'none');
    });

    it('sorts numbers by value, not as text', async () => {
      renderGrid();
      await userEvent.click(header('Age'));
      expect(column(1)).toEqual(['29', '33', '36', '36', '38', '41', '45', '52']);
    });

    it('sorts dates and keeps missing values last in both directions', async () => {
      renderGrid({ locale: 'en-US' });
      await userEvent.click(header('Salary'));
      expect(column(5)).toEqual([
        '99,000',
        '105,000',
        '110,000',
        '120,000',
        '128,000',
        '135,000',
        '142,000',
        '',
      ]);
      await userEvent.click(header('Salary'));
      expect(column(5)).toEqual([
        '142,000',
        '135,000',
        '128,000',
        '120,000',
        '110,000',
        '105,000',
        '99,000',
        '',
      ]);
    });

    it('sorts dates chronologically', async () => {
      renderGrid({ locale: 'en-US' });
      await userEvent.click(header('Joined'));
      expect(names()[0]).toBe('Barbara Liskov');
      expect(names()[7]).toBe('Radia Perlman');
    });

    it('adds a column to the sort with Shift, in the order clicked', async () => {
      renderGrid();
      // One instance, so that the held Shift key is still down when the click happens.
      const user = userEvent.setup();
      await user.click(header('Age'));
      await user.keyboard('{Shift>}');
      await user.click(header('Name'));
      await user.keyboard('{/Shift}');
      // Age ascending, ties broken by name ascending: the two 36-year-olds are Ada, then Margaret.
      expect(column(1)).toEqual(['29', '33', '36', '36', '38', '41', '45', '52']);
      expect(names().slice(2, 4)).toEqual(['Ada Lovelace', 'Margaret Hamilton']);
      expect(within(header('Age')).getByText('1')).toBeInTheDocument();
      expect(within(header('Name')).getByText('2')).toBeInTheDocument();
    });

    it('replaces the sort when a header is chosen without Shift', async () => {
      renderGrid();
      await userEvent.click(header('Age'));
      await userEvent.click(header('Name'));
      expect(header('Age')).toHaveAttribute('aria-sort', 'none');
      expect(header('Name')).toHaveAttribute('aria-sort', 'ascending');
    });

    it('can be switched off for a column, and for multiple columns', async () => {
      renderGrid({
        columns: [
          { accessor: 'name', header: 'Name', sortable: false },
          { accessor: 'age', header: 'Age' },
          { accessor: 'team', header: 'Team' },
        ],
        multiSort: false,
      });
      expect(header('Name')).not.toHaveAttribute('aria-sort');
      await userEvent.click(header('Name'));
      expect(names()).toEqual(people.map((p) => p.name));

      const user = userEvent.setup();
      await user.click(header('Age'));
      await user.keyboard('{Shift>}');
      await user.click(header('Team'));
      await user.keyboard('{/Shift}');
      expect(header('Age')).toHaveAttribute('aria-sort', 'none');
      expect(header('Team')).toHaveAttribute('aria-sort', 'ascending');
    });

    it('uses a custom comparison', async () => {
      renderGrid({
        columns: [
          {
            accessor: 'name',
            header: 'Name',
            sort: (a: string, b: string) => a.length - b.length,
          },
        ],
      });
      await userEvent.click(header('Name'));
      expect(names()[0]).toBe('Alan Turing');
      expect(names()[7]).toBe('Margaret Hamilton');
    });

    it('can sort numbers that are held as text', async () => {
      const rows = [{ v: '10' }, { v: '9' }, { v: '100' }];
      render(
        <DataGrid
          data={rows}
          columns={[{ accessor: 'v', header: 'V', sort: 'number' }]}
          aria-label="V"
        />,
      );
      await userEvent.click(screen.getByRole('columnheader', { name: 'V' }));
      expect(screen.getAllByRole('gridcell').map((c) => c.textContent)).toEqual(['9', '10', '100']);
    });

    it('sorts from the keyboard with Enter and Space, and Shift adds a column', async () => {
      renderGrid();
      header('Name').focus();
      await userEvent.keyboard('{Enter}');
      expect(header('Name')).toHaveAttribute('aria-sort', 'ascending');
      await userEvent.keyboard(' ');
      expect(header('Name')).toHaveAttribute('aria-sort', 'descending');

      await userEvent.keyboard('{ArrowRight}');
      await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
      expect(header('Name')).toHaveAttribute('aria-sort', 'descending');
      expect(header('Age')).toHaveAttribute('aria-sort', 'ascending');
    });

    it('announces each change to the sort', async () => {
      renderGrid();
      const status = screen.getByRole('status');
      await userEvent.click(header('Name'));
      expect(status).toHaveTextContent('Sorted by Name ascending');
      await userEvent.click(header('Name'));
      expect(status).toHaveTextContent('Sorted by Name descending');
      await userEvent.click(header('Name'));
      expect(status).toHaveTextContent('Sorting removed');
    });

    it('announces a multi-column sort in priority order', async () => {
      renderGrid();
      const user = userEvent.setup();
      await user.click(header('Team'));
      await user.keyboard('{Shift>}');
      await user.click(header('Age'));
      await user.keyboard('{/Shift}');
      expect(screen.getByRole('status')).toHaveTextContent(
        'Sorted by Team ascending, then Age ascending',
      );
    });

    it('starts with a default sort', () => {
      renderGrid({ defaultSorting: [{ id: 'age', desc: true }] });
      expect(column(1)[0]).toBe('52');
      expect(header('Age')).toHaveAttribute('aria-sort', 'descending');
    });

    it('reports changes and can be controlled', async () => {
      const onSortingChange = vi.fn();
      const { rerender } = renderGrid({ sorting: [], onSortingChange });
      await userEvent.click(header('Age'));
      expect(onSortingChange).toHaveBeenCalledWith([{ id: 'age', desc: false }]);
      // Controlled: the grid shows only what it is told.
      expect(header('Age')).toHaveAttribute('aria-sort', 'none');
      rerender(
        <DataGrid
          data={people}
          columns={personColumns}
          aria-label="People"
          sorting={[{ id: 'age', desc: false }]}
          onSortingChange={onSortingChange}
        />,
      );
      expect(header('Age')).toHaveAttribute('aria-sort', 'ascending');
      expect(column(1)[0]).toBe('29');
    });
  });

  describe('keyboard navigation', () => {
    it('has a single tab stop, starting at the first header cell', () => {
      renderGrid();
      const stops = [...headers(), ...bodyRows().flatMap(cellsOf)].filter(
        (cell) => cell.getAttribute('tabindex') === '0',
      );
      expect(stops).toEqual([header('Name')]);
    });

    it('moves with the arrow keys and keeps the tab stop with the focused cell', async () => {
      renderGrid();
      await userEvent.tab();
      expect(header('Name')).toHaveFocus();

      await userEvent.keyboard('{ArrowDown}');
      expect(cellsOf(bodyRows()[0] as HTMLElement)[0]).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      expect(cellsOf(bodyRows()[0] as HTMLElement)[2]).toHaveFocus();
      await userEvent.keyboard('{ArrowDown}');
      expect(cellsOf(bodyRows()[1] as HTMLElement)[2]).toHaveFocus();
      await userEvent.keyboard('{ArrowLeft}');
      expect(cellsOf(bodyRows()[1] as HTMLElement)[1]).toHaveFocus();
      await userEvent.keyboard('{ArrowUp}{ArrowUp}');
      expect(header('Age')).toHaveFocus();

      expect(header('Age')).toHaveAttribute('tabindex', '0');
      expect(header('Name')).toHaveAttribute('tabindex', '-1');
    });

    it('stops at the edges', async () => {
      renderGrid();
      header('Name').focus();
      await userEvent.keyboard('{ArrowUp}{ArrowLeft}');
      expect(header('Name')).toHaveFocus();
      await userEvent.keyboard('{Control>}{End}{/Control}');
      await userEvent.keyboard('{ArrowDown}{ArrowRight}');
      expect(cellsOf(bodyRows()[7] as HTMLElement)[5]).toHaveFocus();
    });

    it('jumps with Home, End, Ctrl+Home and Ctrl+End', async () => {
      renderGrid();
      await userEvent.tab();
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      await userEvent.keyboard('{End}');
      expect(cellsOf(bodyRows()[1] as HTMLElement)[5]).toHaveFocus();
      await userEvent.keyboard('{Home}');
      expect(cellsOf(bodyRows()[1] as HTMLElement)[0]).toHaveFocus();
      await userEvent.keyboard('{Control>}{End}{/Control}');
      expect(cellsOf(bodyRows()[7] as HTMLElement)[5]).toHaveFocus();
      await userEvent.keyboard('{Control>}{Home}{/Control}');
      expect(header('Name')).toHaveFocus();
    });

    it('moves a page at a time with PageDown and PageUp', async () => {
      renderGrid({ data: manyPeople(40), height: 300, virtualize: false });
      await userEvent.tab();
      await userEvent.keyboard('{PageDown}');
      const focused = document.activeElement as HTMLElement;
      expect(Number(focused.dataset.gridRow)).toBeGreaterThan(1);
      await userEvent.keyboard('{PageUp}');
      expect(Number((document.activeElement as HTMLElement).dataset.gridRow)).toBe(1);
    });

    it('lets Tab leave the grid', async () => {
      render(
        <>
          <DataGrid data={people} columns={personColumns} aria-label="People" />
          <button>After</button>
        </>,
      );
      await userEvent.tab();
      expect(header('Name')).toHaveFocus();
      // The controls inside the active header (its menu, its resize handle) come next ...
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'Name column menu' })).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole('separator', { name: 'Resize Name' })).toHaveFocus();
      // ... and then Tab leaves the grid rather than walking through every cell.
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('has no inner tab stops when columns have no menus or resize handles', async () => {
      render(
        <>
          <DataGrid
            data={people}
            columns={personColumns}
            aria-label="People"
            columnMenus={false}
            resizable={false}
          />
          <button>After</button>
        </>,
      );
      await userEvent.tab();
      expect(header('Name')).toHaveFocus();
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });

    it('does not take over the keys of a control inside a cell', async () => {
      const columns: DataGridColumn<Person>[] = [
        {
          accessor: 'name',
          header: 'Name',
          cell: ({ value }) => <input aria-label="edit" defaultValue={value} />,
        },
        { accessor: 'age', header: 'Age' },
      ];
      renderGrid({ columns });
      const input = screen.getAllByRole('textbox')[0] as HTMLInputElement;
      input.focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(input).toHaveFocus();
    });

    it('clamps the tab stop when rows disappear', async () => {
      const { rerender } = renderGrid();
      await userEvent.tab();
      await userEvent.keyboard('{Control>}{End}{/Control}');
      expect(cellsOf(bodyRows()[7] as HTMLElement)[5]).toHaveFocus();
      rerender(<DataGrid data={people.slice(0, 2)} columns={personColumns} aria-label="People" />);
      expect(cellsOf(bodyRows()[1] as HTMLElement)[5]).toHaveAttribute('tabindex', '0');
    });
  });

  describe('states', () => {
    it('shows placeholder rows while loading, and marks the grid busy', () => {
      const { container } = renderGrid({ data: [], loading: true, loadingRows: 5 });
      expect(grid()).toHaveAttribute('aria-busy', 'true');
      expect(
        container.querySelectorAll('.axon-datagrid__skeleton .axon-datagrid__row'),
      ).toHaveLength(5);
      expect(screen.queryByText('No rows to display')).not.toBeInTheDocument();
      // The headers are still there.
      expect(headers()).toHaveLength(6);
    });

    it('keeps showing rows while it reloads', () => {
      const { container } = renderGrid({ loading: true });
      expect(bodyRows()).toHaveLength(8);
      expect(grid()).toHaveAttribute('aria-busy', 'true');
      expect(container.querySelector('.axon-datagrid__progress')).toBeInTheDocument();
    });

    it('says when there are no rows, or shows what you give it', () => {
      const { unmount } = renderGrid({ data: [] });
      expect(screen.getByText('No rows to display')).toBeInTheDocument();
      unmount();
      renderGrid({ data: [], emptyState: <p>Nothing yet. Add a person.</p> });
      expect(screen.getByText('Nothing yet. Add a person.')).toBeInTheDocument();
    });

    it('shows an error with a way to try again', async () => {
      const onRetry = vi.fn();
      renderGrid({ error: new Error('Network down'), onRetry });
      expect(screen.getByRole('alert')).toHaveTextContent('Network down');
      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows a generic message when the error is just `true`', () => {
      renderGrid({ error: true });
      expect(screen.getByRole('alert')).toHaveTextContent('The data could not be loaded.');
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    });

    it('lets every word be replaced', () => {
      renderGrid({ data: [], labels: { noRows: 'Aucune ligne' } });
      expect(screen.getByText('Aucune ligne')).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('hides columns that start hidden', () => {
      renderGrid({
        columns: personColumns.map((c) =>
          c.accessor === 'team' ? { ...c, defaultHidden: true } : c,
        ),
      });
      expect(headers().map((h) => h.textContent)).not.toContain('Team');
      expect(grid()).toHaveAttribute('aria-colcount', '5');
    });

    it('pins columns to the edges and keeps them at the ends', () => {
      renderGrid({
        columns: personColumns.map((c) =>
          c.accessor === 'salary'
            ? { ...c, pinned: 'left' as const }
            : c.accessor === 'age'
              ? { ...c, pinned: 'right' as const }
              : c,
        ),
      });
      expect(headers().map((h) => h.textContent)).toEqual([
        'Salary',
        'Name',
        'Team',
        'Joined',
        'Active',
        'Age',
      ]);
      // The stylesheet makes pinned cells sticky; each one carries its distance from its edge.
      expect(header('Salary')).toHaveClass(
        'axon-datagrid__cell--pinned',
        'axon-datagrid__cell--pinned-start',
        'axon-datagrid__cell--pinned-edge',
      );
      expect(header('Salary').style.getPropertyValue('--axon-datagrid-pin-offset')).toBe('0px');
      expect(header('Age')).toHaveClass('axon-datagrid__cell--pinned-end');
      expect(header('Age').style.getPropertyValue('--axon-datagrid-pin-offset')).toBe('0px');
      expect(header('Name')).not.toHaveClass('axon-datagrid__cell--pinned');
    });

    it('offsets each pinned column by the width of the ones before it', () => {
      renderGrid({
        columns: personColumns.map((c) =>
          c.accessor === 'name' || c.accessor === 'age'
            ? { ...c, pinned: 'left' as const }
            : c.accessor === 'team' || c.accessor === 'joined'
              ? { ...c, pinned: 'right' as const }
              : c,
        ),
      });
      const offset = (name: string) =>
        header(name).style.getPropertyValue('--axon-datagrid-pin-offset');
      expect(offset('Name')).toBe('0px');
      expect(offset('Age')).toBe('180px');
      // Right-pinned columns count from the right edge: Joined is the last one, so Team sits 150 in.
      expect(offset('Joined')).toBe('0px');
      expect(offset('Team')).toBe('150px');
    });

    it('starts from a saved layout and ignores columns that no longer exist', () => {
      renderGrid({
        defaultLayout: {
          columnOrder: ['team', 'gone', 'name'],
          columnSizing: { name: 300, gone: 50 },
          columnVisibility: { age: false },
          density: 'comfortable',
        },
      });
      expect(
        headers()
          .map((h) => h.textContent)
          .slice(0, 2),
      ).toEqual(['Team', 'Name']);
      expect(header('Name')).toHaveStyle({ minWidth: '300px' });
      expect(headers().map((h) => h.textContent)).not.toContain('Age');
      expect(document.querySelector('.axon-datagrid--comfortable')).toBeInTheDocument();
    });

    it('does not report the layout until something changes it', () => {
      const onLayoutChange = vi.fn();
      renderGrid({ onLayoutChange });
      expect(onLayoutChange).not.toHaveBeenCalled();
    });

    it('keeps its table when the columns are rewritten inline with the same content', async () => {
      const { rerender } = renderGrid({ defaultSorting: [{ id: 'age', desc: false }] });
      const before = names();
      rerender(
        <DataGrid
          data={people}
          columns={personColumns.map((c) => ({ ...c }))}
          aria-label="People"
        />,
      );
      expect(names()).toEqual(before);
    });
  });

  describe('virtualization', () => {
    let restore: (() => void) | undefined;
    afterEach(() => restore?.());

    it('draws only the rows in view when there are many', () => {
      restore = mockViewport(800, 400);
      renderGrid({ data: manyPeople(5000), height: 400 });
      const drawn = bodyRows().length;
      expect(drawn).toBeGreaterThan(5);
      expect(drawn).toBeLessThan(60);
      expect(grid()).toHaveAttribute('aria-rowcount', '5001');
      expect(bodyRows()[0]).toHaveAttribute('aria-rowindex', '2');
    });

    it('draws everything when virtualization is off', () => {
      renderGrid({ data: manyPeople(300), virtualize: false });
      expect(bodyRows()).toHaveLength(300);
    });

    it('switches on above the threshold and stays off below it', () => {
      restore = mockViewport(800, 300);
      const { unmount } = renderGrid({ data: manyPeople(80), height: 300 });
      expect(bodyRows()).toHaveLength(80);
      unmount();
      renderGrid({ data: manyPeople(80), height: 300, virtualizeThreshold: 20 });
      expect(bodyRows().length).toBeLessThan(80);
    });

    it('can be forced on for a short list', () => {
      restore = mockViewport(800, 150);
      renderGrid({ data: manyPeople(60), height: 150, virtualize: true, overscan: 2 });
      expect(bodyRows().length).toBeLessThan(15);
    });

    it('sizes its rows for the whole data set', () => {
      restore = mockViewport(800, 400);
      const { container } = renderGrid({ data: manyPeople(1000), height: 400 });
      const body = container.querySelector('.axon-datagrid__body') as HTMLElement;
      expect(body).toHaveStyle({ height: `${1000 * 44}px` });
    });

    it('reaches a row that is far away from the keyboard', async () => {
      // jsdom does not scroll; make an element's scrollTo move its scrollTop and say so.
      const original = HTMLElement.prototype.scrollTo;
      HTMLElement.prototype.scrollTo = function scrollTo(this: HTMLElement, options?: unknown) {
        const top = typeof options === 'object' && options ? (options as ScrollToOptions).top : 0;
        Object.defineProperty(this, 'scrollTop', { value: top ?? 0, configurable: true });
        // Real scroll events arrive after the call that caused them, not inside it.
        setTimeout(() => this.dispatchEvent(new Event('scroll')), 0);
      } as typeof original;
      const restoreViewport = mockViewport(800, 400);
      restore = () => {
        HTMLElement.prototype.scrollTo = original;
        restoreViewport();
      };

      const { container } = renderGrid({ data: manyPeople(3000), height: 400 });
      // The virtualizer asks the element how far it can scroll.
      const viewport = container.querySelector('.axon-datagrid__viewport') as HTMLElement;
      Object.defineProperty(viewport, 'scrollHeight', { value: 3001 * 44, configurable: true });
      Object.defineProperty(viewport, 'clientHeight', { value: 400, configurable: true });
      await userEvent.tab();
      await userEvent.keyboard('{Control>}{End}{/Control}');
      await waitFor(() => expect(document.activeElement).toHaveAttribute('data-grid-row', '3000'));
      const focused = document.activeElement as HTMLElement;
      expect(focused.closest('[role="row"]')).toHaveAttribute('aria-rowindex', '3001');
      expect(bodyRows().length).toBeLessThan(60);
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderGrid({
      striped: true,
      bordered: true,
      defaultSorting: [{ id: 'name', desc: false }],
    });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations while loading, empty or failed', async () => {
    const { container, rerender } = renderGrid({ data: [], loading: true });
    expect(await axe(container)).toHaveNoViolations();
    rerender(<DataGrid data={[] as Person[]} columns={personColumns} aria-label="People" />);
    expect(await axe(container)).toHaveNoViolations();
    rerender(
      <DataGrid
        data={[] as Person[]}
        columns={personColumns}
        aria-label="People"
        error="Oops"
        onRetry={() => {}}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
