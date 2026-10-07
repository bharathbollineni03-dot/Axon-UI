import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  bodyRows,
  cellsOf,
  column,
  gridElement,
  header,
  headers,
  renderGrid,
} from '../../testing/gridTestUtils';
import { people } from '../../testing/sampleData';

const rowCheckbox = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` });
const pageCheckbox = () => screen.getByRole('checkbox', { name: 'Select all rows on this page' });
const bulkBar = () => screen.queryByRole('group', { name: 'Selection actions' });

describe('DataGrid selection', () => {
  it('adds a checkbox column when asked, and is not selectable otherwise', () => {
    const { unmount } = renderGrid();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(gridElement()).not.toHaveAttribute('aria-multiselectable');
    unmount();

    renderGrid({ selectable: true });
    expect(gridElement()).toHaveAttribute('aria-multiselectable', 'true');
    expect(gridElement()).toHaveAttribute('aria-colcount', '7');
    expect(headers()[0]).toHaveAccessibleName('Select');
    expect(screen.getAllByRole('checkbox')).toHaveLength(9);
  });

  it('names each checkbox after the row’s first column', () => {
    renderGrid({ selectable: true });
    expect(rowCheckbox('Ada Lovelace')).not.toBeChecked();
    expect(rowCheckbox('Radia Perlman')).toBeInTheDocument();
  });

  it('selects a row, marks it, and shows the bulk bar', async () => {
    const user = userEvent.setup();
    renderGrid({ selectable: true });
    expect(bulkBar()).not.toBeInTheDocument();
    await user.click(rowCheckbox('Grace Hopper'));
    expect(rowCheckbox('Grace Hopper')).toBeChecked();
    expect(bodyRows()[1]).toHaveAttribute('aria-selected', 'true');
    expect(bodyRows()[1]).toHaveClass('axon-datagrid__row--selected');
    expect(bodyRows()[0]).toHaveAttribute('aria-selected', 'false');
    expect(within(bulkBar() as HTMLElement).getByText('1 selected')).toBeInTheDocument();

    await user.click(rowCheckbox('Grace Hopper'));
    expect(bulkBar()).not.toBeInTheDocument();
  });

  it('keeps the checkbox column first and out of the way', () => {
    renderGrid({ selectable: true });
    const first = cellsOf(bodyRows()[0] as HTMLElement)[0] as HTMLElement;
    expect(first).toHaveClass('axon-datagrid__cell--pinned-start');
    expect(first).toHaveAttribute('data-column-id', '__select');
  });

  it('does not count a click on a checkbox as a click on the row', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderGrid({ selectable: true, onRowClick });
    await user.click(rowCheckbox('Ada Lovelace'));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  describe('select all', () => {
    it('selects every row, then none, from the header checkbox', async () => {
      const user = userEvent.setup();
      renderGrid({ selectable: true });
      await user.click(pageCheckbox());
      expect(pageCheckbox()).toBeChecked();
      expect(screen.getAllByRole('checkbox', { checked: true })).toHaveLength(9);
      expect(within(bulkBar() as HTMLElement).getByText('8 selected')).toBeInTheDocument();
      await user.click(pageCheckbox());
      expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0);
    });

    it('shows a mixed state while some are selected', async () => {
      const user = userEvent.setup();
      renderGrid({ selectable: true });
      await user.click(rowCheckbox('Ada Lovelace'));
      expect(pageCheckbox()).toBePartiallyChecked();
      await user.click(pageCheckbox());
      expect(pageCheckbox()).toBeChecked();
    });

    it('covers only the page in view, and the bulk bar offers the rest', async () => {
      const user = userEvent.setup();
      renderGrid({
        selectable: true,
        paginated: true,
        defaultPagination: { pageIndex: 0, pageSize: 3 },
      });
      await user.click(pageCheckbox());
      expect(within(bulkBar() as HTMLElement).getByText('3 selected')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Select all 8 rows' }));
      expect(within(bulkBar() as HTMLElement).getByText('8 selected')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /^Select all \d+ rows/ }),
      ).not.toBeInTheDocument();
      // The rows on other pages are selected too.
      await user.click(screen.getByRole('button', { name: 'Last page' }));
      expect(rowCheckbox('Radia Perlman')).toBeChecked();
    });

    it('selects the rows that match a filter, not all of them', async () => {
      const user = userEvent.setup();
      renderGrid({
        selectable: true,
        toolbar: true,
        paginated: true,
        defaultPagination: { pageIndex: 0, pageSize: 2 },
      });
      await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'research');
      await user.click(pageCheckbox());
      expect(within(bulkBar() as HTMLElement).getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Select all 3 rows' })).toBeInTheDocument();
    });

    it('does not offer to select unloaded rows against a server', async () => {
      const user = userEvent.setup();
      renderGrid({
        selectable: true,
        mode: 'server',
        paginated: true,
        totalRowCount: 500,
        data: people.slice(0, 3),
      });
      await user.click(pageCheckbox());
      expect(within(bulkBar() as HTMLElement).getByText('3 selected')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Select all/ })).not.toBeInTheDocument();
    });
  });

  describe('keyboard', () => {
    it('toggles a row with Space on its checkbox cell', async () => {
      const user = userEvent.setup();
      renderGrid({ selectable: true });
      (cellsOf(bodyRows()[2] as HTMLElement)[0] as HTMLElement).focus();
      await user.keyboard(' ');
      expect(rowCheckbox('Alan Turing')).toBeChecked();
      await user.keyboard(' ');
      expect(rowCheckbox('Alan Turing')).not.toBeChecked();
    });

    it('toggles every row with Space on the header’s checkbox cell', async () => {
      const user = userEvent.setup();
      renderGrid({ selectable: true });
      headers()[0]?.focus();
      await user.keyboard(' ');
      expect(within(bulkBar() as HTMLElement).getByText('8 selected')).toBeInTheDocument();
    });

    it('gives the checkbox inside the active cell a tab stop, and the others none', async () => {
      const user = userEvent.setup();
      renderGrid({ selectable: true });
      await user.tab();
      expect(headers()[0]).toHaveFocus();
      expect(pageCheckbox()).toHaveAttribute('tabindex', '0');
      expect(rowCheckbox('Ada Lovelace')).toHaveAttribute('tabindex', '-1');
      await user.keyboard('{ArrowDown}');
      expect(rowCheckbox('Ada Lovelace')).toHaveAttribute('tabindex', '0');
      expect(pageCheckbox()).toHaveAttribute('tabindex', '-1');
    });
  });

  it('selects the rows between two clicks while Shift is held', async () => {
    const user = userEvent.setup();
    renderGrid({ selectable: true });
    await user.click(rowCheckbox('Grace Hopper'));
    await user.keyboard('{Shift>}');
    await user.click(rowCheckbox('Linus Torvalds'));
    await user.keyboard('{/Shift}');
    expect(
      screen.getAllByRole('checkbox', { checked: true }).map((c) => c.getAttribute('aria-label')),
    ).toEqual([
      'Select Grace Hopper',
      'Select Alan Turing',
      'Select Margaret Hamilton',
      'Select Linus Torvalds',
    ]);
  });

  it('cannot select rows that are not selectable', async () => {
    const user = userEvent.setup();
    renderGrid({ selectable: true, isRowSelectable: (row) => row.active });
    expect(rowCheckbox('Alan Turing')).toBeDisabled();
    await user.click(pageCheckbox());
    expect(within(bulkBar() as HTMLElement).getByText('6 selected')).toBeInTheDocument();
    expect(rowCheckbox('Alan Turing')).not.toBeChecked();
  });

  it('can start with rows selected, and reports changes', async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    renderGrid({ selectable: true, defaultRowSelection: { '2': true }, onRowSelectionChange });
    expect(rowCheckbox('Grace Hopper')).toBeChecked();
    await user.click(rowCheckbox('Ada Lovelace'));
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({ '2': true, '1': true });
  });

  it('can be controlled', async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    renderGrid({ selectable: true, rowSelection: { '3': true }, onRowSelectionChange });
    expect(rowCheckbox('Alan Turing')).toBeChecked();
    await user.click(rowCheckbox('Ada Lovelace'));
    expect(onRowSelectionChange).toHaveBeenCalled();
    expect(rowCheckbox('Ada Lovelace')).not.toBeChecked();
  });

  it('keeps rows selected through sorting and filtering, by their ids', async () => {
    const user = userEvent.setup();
    renderGrid({ selectable: true, toolbar: true });
    await user.click(rowCheckbox('Ada Lovelace'));
    await user.click(header('Age'));
    expect(rowCheckbox('Ada Lovelace')).toBeChecked();
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'kernel');
    expect(column(1)).toEqual(['Linus Torvalds', 'Dennis Ritchie']);
    expect(within(bulkBar() as HTMLElement).getByText('1 selected')).toBeInTheDocument();
  });

  describe('the bulk bar', () => {
    it('hands your actions the selected rows, and a way to clear', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      renderGrid({
        selectable: true,
        bulkActions: ({ rows, rowIds, clear }) => (
          <>
            <button
              onClick={() =>
                onDelete(
                  rows.map((r) => r.name),
                  rowIds,
                )
              }
            >
              Delete
            </button>
            <button onClick={clear}>Deselect</button>
          </>
        ),
      });
      await user.click(rowCheckbox('Alan Turing'));
      await user.click(rowCheckbox('Ada Lovelace'));
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      expect(onDelete).toHaveBeenCalledWith(['Ada Lovelace', 'Alan Turing'], ['1', '3']);

      await user.click(screen.getByRole('button', { name: 'Deselect' }));
      expect(bulkBar()).not.toBeInTheDocument();
    });

    it('has its own clear button', async () => {
      const user = userEvent.setup();
      renderGrid({ selectable: true });
      await user.click(pageCheckbox());
      await user.click(screen.getByRole('button', { name: 'Clear selection' }));
      expect(screen.queryAllByRole('checkbox', { checked: true })).toHaveLength(0);
    });

    it('announces how many rows are selected', async () => {
      const user = userEvent.setup();
      renderGrid({ selectable: true });
      await user.click(rowCheckbox('Ada Lovelace'));
      expect(screen.getByRole('status')).toHaveTextContent('1 selected');
      await user.click(rowCheckbox('Grace Hopper'));
      expect(screen.getByRole('status')).toHaveTextContent('2 selected');
    });
  });

  it('has no accessibility violations', async () => {
    const user = userEvent.setup();
    const { container } = renderGrid({ selectable: true });
    await user.click(rowCheckbox('Ada Lovelace'));
    expect(await axe(container)).toHaveNoViolations();
  });
});
