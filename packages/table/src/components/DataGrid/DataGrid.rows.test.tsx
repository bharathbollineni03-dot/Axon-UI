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
  renderGrid,
} from '../../testing/gridTestUtils';
import type { DataGridColumn, DataGridExportContext } from '../../types';
import type { Person } from '../../testing/sampleData';

const groupable: DataGridColumn<Person>[] = [
  { accessor: 'name', header: 'Name', width: 180 },
  { accessor: 'team', header: 'Team', groupable: true },
  { accessor: 'age', header: 'Age', aggregate: 'mean', align: 'end' },
  {
    accessor: 'salary',
    header: 'Salary',
    aggregate: 'sum',
    align: 'end',
    cell: ({ value }) => (value == null ? '—' : `$${(value as number).toLocaleString('en-US')}`),
  },
  { accessor: 'active', header: 'Active', groupable: true },
];

const rowOf = (name: string) =>
  bodyRows().find((row) => row.textContent?.includes(name)) as HTMLElement;
const groupRows = () =>
  bodyRows().filter((row) => row.classList.contains('axon-datagrid__row--group'));
const groupLabels = () => groupRows().map((row) => within(row).getByRole('button').textContent);

describe('DataGrid detail panels', () => {
  const detail = (row: Person) => <p>Details for {row.name}</p>;

  it('adds a column of buttons that open a panel under the row', async () => {
    const user = userEvent.setup();
    renderGrid({ renderDetailPanel: detail });
    expect(gridElement()).toHaveAttribute('aria-colcount', '7');
    expect(screen.queryByText('Details for Ada Lovelace')).not.toBeInTheDocument();
    const button = within(rowOf('Ada Lovelace')).getByRole('button', { name: 'Expand row' });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(screen.getByText('Details for Ada Lovelace')).toBeInTheDocument();
    expect(rowOf('Ada Lovelace')).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(rowOf('Ada Lovelace')).getByRole('button', { name: 'Collapse row' }),
    ).toHaveAttribute('aria-expanded', 'true');

    await user.click(within(rowOf('Ada Lovelace')).getByRole('button', { name: 'Collapse row' }));
    expect(screen.queryByText('Details for Ada Lovelace')).not.toBeInTheDocument();
  });

  it('keeps the panel in the row it belongs to, spanning the columns, and ties it to its button', async () => {
    const user = userEvent.setup();
    renderGrid({ renderDetailPanel: detail });
    await user.click(within(rowOf('Grace Hopper')).getByRole('button', { name: 'Expand row' }));
    const row = rowOf('Grace Hopper');
    const panel = within(row)
      .getByText('Details for Grace Hopper')
      .closest('[role="gridcell"]') as HTMLElement;
    expect(panel).toHaveAttribute('aria-colspan', '7');
    const button = within(row).getByRole('button', { name: 'Collapse row' });
    expect(button.getAttribute('aria-controls')).toBe(panel.id);
    expect(bodyRows()).toHaveLength(8);
  });

  it('opens several rows at once', async () => {
    const user = userEvent.setup();
    renderGrid({ renderDetailPanel: detail });
    await user.click(within(rowOf('Ada Lovelace')).getByRole('button', { name: 'Expand row' }));
    await user.click(within(rowOf('Alan Turing')).getByRole('button', { name: 'Expand row' }));
    expect(screen.getAllByText(/^Details for/)).toHaveLength(2);
  });

  it('opens and closes from the keyboard with Enter and Space on the button’s cell', async () => {
    const user = userEvent.setup();
    renderGrid({ renderDetailPanel: detail });
    (cellsOf(rowOf('Ada Lovelace'))[0] as HTMLElement).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Details for Ada Lovelace')).toBeInTheDocument();
    await user.keyboard(' ');
    expect(screen.queryByText('Details for Ada Lovelace')).not.toBeInTheDocument();
  });

  it('has no button on rows that cannot expand', () => {
    renderGrid({ renderDetailPanel: detail, getRowCanExpand: (row) => row.active });
    expect(within(rowOf('Alan Turing')).queryByRole('button')).not.toBeInTheDocument();
    expect(rowOf('Alan Turing')).not.toHaveAttribute('aria-expanded');
    expect(within(rowOf('Ada Lovelace')).getByRole('button')).toBeInTheDocument();
  });

  it('does not count a click on the button as a click on the row', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderGrid({ renderDetailPanel: detail, onRowClick });
    await user.click(within(rowOf('Ada Lovelace')).getByRole('button'));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('can start open, and be controlled', async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    const { unmount } = renderGrid({ renderDetailPanel: detail, defaultExpanded: true });
    expect(screen.getAllByText(/^Details for/)).toHaveLength(8);
    unmount();

    renderGrid({ renderDetailPanel: detail, expanded: { '2': true }, onExpandedChange });
    expect(screen.getAllByText(/^Details for/)).toHaveLength(1);
    await user.click(within(rowOf('Ada Lovelace')).getByRole('button'));
    expect(onExpandedChange).toHaveBeenCalledWith({ '2': true, '1': true });
    // Controlled: nothing opens until it is passed back in.
    expect(screen.getAllByText(/^Details for/)).toHaveLength(1);
  });

  it('stays open through sorting and through the data being replaced', async () => {
    const user = userEvent.setup();
    const { update } = renderGrid({ renderDetailPanel: detail });
    await user.click(within(rowOf('Ada Lovelace')).getByRole('button'));
    await user.click(header('Name'));
    expect(screen.getByText('Details for Ada Lovelace')).toBeInTheDocument();
    update({ data: [...(await import('../../testing/sampleData')).people] });
    expect(screen.getByText('Details for Ada Lovelace')).toBeInTheDocument();
  });

  it('leaves the keyboard’s rows alone: a panel is not a row to arrow into', async () => {
    const user = userEvent.setup();
    renderGrid({ renderDetailPanel: detail, defaultExpanded: true });
    (cellsOf(rowOf('Ada Lovelace'))[1] as HTMLElement).focus();
    await user.keyboard('{ArrowDown}');
    expect(cellsOf(rowOf('Grace Hopper'))[1]).toHaveFocus();
  });

  it('has no accessibility violations with a panel open', async () => {
    const user = userEvent.setup();
    const { container } = renderGrid({ renderDetailPanel: detail });
    await user.click(within(rowOf('Ada Lovelace')).getByRole('button'));
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('DataGrid grouping', () => {
  it('has no groups until asked, and the menu offers it on columns that can be grouped', async () => {
    const user = userEvent.setup();
    renderGrid({ columns: groupable });
    expect(groupRows()).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Name column menu' }));
    expect(screen.queryByRole('menuitem', { name: /Group by/ })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Team column menu' }));
    expect(screen.getByRole('menuitem', { name: 'Group by Team' })).toBeInTheDocument();
  });

  it('turns rows into collapsed groups, each with its size', async () => {
    const user = userEvent.setup();
    renderGrid({ columns: groupable });
    await user.click(screen.getByRole('button', { name: 'Team column menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Group by Team' }));
    expect(groupLabels()).toEqual(['Research (3)', 'Platform (3)', 'Kernel (2)']);
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByRole('group', { name: 'Grouped by' })).toHaveTextContent('Team');
    expect(groupRows()[0]).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a group to show its rows, and closes it again', async () => {
    const user = userEvent.setup();
    renderGrid({ columns: groupable, defaultGrouping: ['team'] });
    await user.click(within(groupRows()[2] as HTMLElement).getByRole('button'));
    expect(groupRows()[2]).toHaveAttribute('aria-expanded', 'true');
    expect(column(0).slice(3)).toEqual(['Linus Torvalds', 'Dennis Ritchie']);
    await user.click(within(groupRows()[2] as HTMLElement).getByRole('button'));
    expect(bodyRows()).toHaveLength(3);
  });

  it('opens and closes a group from the keyboard', async () => {
    const user = userEvent.setup();
    renderGrid({ columns: groupable, defaultGrouping: ['team'] });
    (cellsOf(groupRows()[0] as HTMLElement)[1] as HTMLElement).focus();
    await user.keyboard('{Enter}');
    expect(bodyRows()).toHaveLength(6);
    await user.keyboard(' ');
    expect(bodyRows()).toHaveLength(3);
  });

  it('starts with every group open', () => {
    renderGrid({ columns: groupable, defaultGrouping: ['team'], defaultExpanded: true });
    expect(bodyRows()).toHaveLength(11);
  });

  it('groups within groups, indenting the inner ones', () => {
    renderGrid({ columns: groupable, defaultGrouping: ['team', 'active'], defaultExpanded: true });
    expect(groupLabels()).toEqual([
      'Research (3)',
      'Yes (1)',
      'No (2)',
      'Platform (3)',
      'Yes (3)',
      'Kernel (2)',
      'Yes (2)',
    ]);
    const outer = within(groupRows()[0] as HTMLElement).getByRole('button');
    const inner = within(groupRows()[1] as HTMLElement).getByRole('button');
    expect(Number.parseInt(outer.style.marginInlineStart || '0', 10)).toBe(0);
    expect(Number.parseInt(inner.style.marginInlineStart, 10)).toBe(20);
  });

  it('shows what a group adds up to, in the columns that say how', () => {
    renderGrid({ columns: groupable, defaultGrouping: ['team'] });
    const research = cellsOf(groupRows()[0] as HTMLElement).map((cell) => cell.textContent);
    // Name has no aggregation, Team holds the label, Age is a mean, Salary a sum drawn by its cell
    // (a missing salary counts as nothing).
    expect(research).toEqual(['', 'Research (3)', '43', '$262,000', '']);
    const platform = cellsOf(groupRows()[1] as HTMLElement).map((cell) => cell.textContent);
    expect(platform).toEqual(['', 'Platform (3)', '38', '$368,000', '']);
  });

  it('can draw an aggregate its own way, and summarise with a function', () => {
    renderGrid({
      defaultGrouping: ['team'],
      columns: [
        { accessor: 'team', header: 'Team', groupable: true },
        {
          accessor: 'age',
          header: 'Ages',
          aggregate: (values: number[]) => values.join('/'),
        },
        {
          accessor: 'salary',
          header: 'Pay',
          aggregate: 'max',
          aggregatedCell: ({ value, rows }) => `top ${value} of ${rows.length}`,
        },
        { accessor: 'joined', header: 'Joined', aggregate: 'extent' },
        { accessor: 'name', header: 'Name', aggregate: 'count' },
      ],
    });
    const kernel = cellsOf(groupRows()[2] as HTMLElement).map((cell) => cell.textContent);
    expect(kernel[1]).toBe('29/38');
    expect(kernel[2]).toBe('top 110000 of 2');
    expect(kernel[4]).toBe('2');
  });

  it('shows a range for an extent', () => {
    renderGrid({
      defaultGrouping: ['team'],
      locale: 'en-US',
      columns: [
        { accessor: 'team', header: 'Team', groupable: true },
        { accessor: 'age', header: 'Age', aggregate: 'extent' },
      ],
    });
    expect(cellsOf(groupRows()[2] as HTMLElement)[1]?.textContent).toBe('29 – 38');
  });

  it('removes a grouping from its chip, or from the column menu', async () => {
    const user = userEvent.setup();
    renderGrid({ columns: groupable, defaultGrouping: ['team', 'active'] });
    await user.click(screen.getByRole('button', { name: 'Stop grouping by Team' }));
    expect(screen.getByRole('group', { name: 'Grouped by' })).not.toHaveTextContent('Team');
    expect(groupLabels()).toEqual(['Yes (6)', 'No (2)']);

    await user.click(screen.getByRole('button', { name: 'Active column menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Stop grouping by Active' }));
    expect(groupRows()).toHaveLength(0);
    expect(screen.queryByRole('group', { name: 'Grouped by' })).not.toBeInTheDocument();
  });

  it('can be controlled', async () => {
    const user = userEvent.setup();
    const onGroupingChange = vi.fn();
    renderGrid({ columns: groupable, grouping: [], onGroupingChange });
    await user.click(screen.getByRole('button', { name: 'Team column menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Group by Team' }));
    expect(onGroupingChange).toHaveBeenCalledWith(['team']);
    expect(groupRows()).toHaveLength(0);
  });

  it('names a group in the first column when its own column is hidden', () => {
    renderGrid({
      columns: groupable,
      defaultGrouping: ['team'],
      defaultLayout: { columnVisibility: { team: false } },
    });
    expect(groupLabels()).toEqual(['Research (3)', 'Platform (3)', 'Kernel (2)']);
    expect(
      within(groupRows()[0] as HTMLElement)
        .getByRole('button')
        .closest('[role="gridcell"]'),
    ).toHaveAttribute('data-column-id', 'name');
  });

  it('keeps sorting inside the groups, and filtering shrinks them', async () => {
    const user = userEvent.setup();
    renderGrid({
      columns: groupable,
      defaultGrouping: ['team'],
      defaultExpanded: true,
      toolbar: true,
    });
    await user.click(header('Name'));
    expect(column(0)).toEqual([
      '',
      'Ada Lovelace',
      'Alan Turing',
      'Barbara Liskov',
      '',
      'Grace Hopper',
      'Margaret Hamilton',
      'Radia Perlman',
      '',
      'Dennis Ritchie',
      'Linus Torvalds',
    ]);
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'research');
    expect(groupLabels()).toEqual(['Research (3)']);
  });

  it('does not offer a checkbox on a group, and selects the rows in it', async () => {
    const user = userEvent.setup();
    renderGrid({
      columns: groupable,
      selectable: true,
      defaultGrouping: ['team'],
      defaultExpanded: true,
    });
    expect(within(groupRows()[0] as HTMLElement).queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(
      within(screen.getByRole('group', { name: 'Selection actions' })).getByText('8 selected'),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select Ada Lovelace' })).toBeChecked();
  });

  it('exports the rows, not the group rows', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn<(context: DataGridExportContext<Person>) => void>();
    renderGrid({ columns: groupable, defaultGrouping: ['team'], toolbar: true, onExport });
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    expect(onExport.mock.lastCall?.[0].rows).toHaveLength(8);
    expect(onExport.mock.lastCall?.[0].csv.split('\r\n').filter(Boolean)).toHaveLength(9);
  });

  it('is not offered against a server, which has to do the grouping', async () => {
    const user = userEvent.setup();
    renderGrid({ columns: groupable, mode: 'server', totalRowCount: 100 });
    await user.click(screen.getByRole('button', { name: 'Team column menu' }));
    expect(screen.queryByRole('menuitem', { name: /Group by/ })).not.toBeInTheDocument();
  });

  it('numbers group rows like any others', () => {
    renderGrid({ columns: groupable, defaultGrouping: ['team'] });
    expect(groupRows().map((row) => row.getAttribute('aria-rowindex'))).toEqual(['2', '3', '4']);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderGrid({
      columns: groupable,
      defaultGrouping: ['team'],
      defaultExpanded: true,
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
