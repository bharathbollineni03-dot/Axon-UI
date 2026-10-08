import { createEvent, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bodyRows, cellsOf, header, headers, renderGrid } from '../../testing/gridTestUtils';
import type { DataGridLayout } from '../../types';

const titles = () => headers().map((h) => h.getAttribute('aria-label'));
const menuButton = (name: string) => screen.getByRole('button', { name: `${name} column menu` });
const resizer = (name: string) => screen.getByRole('separator', { name: `Resize ${name}` });
const width = (name: string) => Number.parseInt(header(name).style.minWidth, 10);
/** jsdom has no DragEvent, so the pointer's position has to be put on the event by hand. */
function dragOver(element: HTMLElement, clientX: number) {
  const event = createEvent.dragOver(element);
  Object.defineProperty(event, 'clientX', { value: clientX });
  fireEvent(element, event);
}
const lastLayout = (spy: ReturnType<typeof vi.fn>) => spy.mock.lastCall?.[0] as DataGridLayout;

describe('DataGrid columns', () => {
  afterEach(() => vi.useRealTimers());

  describe('the column menu', () => {
    it('has a button in each header that does not sort the column', async () => {
      const user = userEvent.setup();
      renderGrid();
      await user.click(menuButton('Name'));
      expect(header('Name')).toHaveAttribute('aria-sort', 'none');
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('can be left out', () => {
      renderGrid({ columnMenus: false });
      expect(screen.queryByRole('button', { name: /column menu/ })).not.toBeInTheDocument();
    });

    it('sorts either way, and clears the sort', async () => {
      const user = userEvent.setup();
      renderGrid();
      await user.click(menuButton('Age'));
      await user.click(screen.getByRole('menuitem', { name: 'Sort descending' }));
      expect(header('Age')).toHaveAttribute('aria-sort', 'descending');
      await user.click(menuButton('Age'));
      await user.click(screen.getByRole('menuitem', { name: 'Sort ascending' }));
      expect(header('Age')).toHaveAttribute('aria-sort', 'ascending');
      await user.click(menuButton('Age'));
      await user.click(screen.getByRole('menuitem', { name: 'Clear sort' }));
      expect(header('Age')).toHaveAttribute('aria-sort', 'none');
    });

    it('pins a column to the left or right, and unpins it', async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      renderGrid({ onLayoutChange });
      await user.click(menuButton('Team'));
      await user.click(screen.getByRole('menuitem', { name: 'Pin left' }));
      expect(titles()[0]).toBe('Team');
      expect(header('Team')).toHaveClass('axon-datagrid__cell--pinned-start');
      expect(lastLayout(onLayoutChange).columnPinning).toEqual({ left: ['team'], right: [] });

      await user.click(menuButton('Team'));
      expect(screen.getByRole('menuitem', { name: 'Pin left' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      await user.click(screen.getByRole('menuitem', { name: 'Pin right' }));
      expect(titles().at(-1)).toBe('Team');
      expect(lastLayout(onLayoutChange).columnPinning).toEqual({ left: [], right: ['team'] });

      await user.click(menuButton('Team'));
      await user.click(screen.getByRole('menuitem', { name: 'Unpin' }));
      expect(header('Team')).not.toHaveClass('axon-datagrid__cell--pinned');
      expect(titles()).toEqual(['Name', 'Age', 'Team', 'Joined', 'Active', 'Salary']);
    });

    it('does not offer to pin a column that opts out', async () => {
      const user = userEvent.setup();
      renderGrid({
        columns: [
          { accessor: 'name', header: 'Name', pinnable: false },
          { accessor: 'age', header: 'Age' },
        ],
      });
      await user.click(menuButton('Name'));
      expect(screen.queryByRole('menuitem', { name: 'Pin left' })).not.toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Hide column' })).toBeInTheDocument();
    });

    it('hides a column, but never the last one', async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      renderGrid({
        columns: [
          { accessor: 'name', header: 'Name' },
          { accessor: 'age', header: 'Age' },
        ],
        onLayoutChange,
      });
      await user.click(menuButton('Age'));
      await user.click(screen.getByRole('menuitem', { name: 'Hide column' }));
      expect(titles()).toEqual(['Name']);
      expect(lastLayout(onLayoutChange).columnVisibility).toEqual({ age: false });
      await user.click(menuButton('Name'));
      expect(screen.queryByRole('menuitem', { name: 'Hide column' })).not.toBeInTheDocument();
    });

    it('moves a column left and right', async () => {
      const user = userEvent.setup();
      renderGrid();
      await user.click(menuButton('Team'));
      await user.click(screen.getByRole('menuitem', { name: 'Move left' }));
      expect(titles().slice(0, 3)).toEqual(['Name', 'Team', 'Age']);
      await user.click(menuButton('Team'));
      await user.click(screen.getByRole('menuitem', { name: 'Move right' }));
      expect(titles().slice(0, 3)).toEqual(['Name', 'Age', 'Team']);
    });
  });

  describe('the columns menu', () => {
    it('shows and hides columns', async () => {
      const user = userEvent.setup();
      renderGrid({ toolbar: true });
      await user.click(screen.getByRole('button', { name: 'Columns' }));
      expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(6);
      await user.click(screen.getByRole('menuitemcheckbox', { name: 'Team' }));
      expect(titles()).not.toContain('Team');
      expect(screen.getByRole('menuitemcheckbox', { name: 'Team' })).toHaveAttribute(
        'aria-checked',
        'false',
      );
      await user.click(screen.getByRole('menuitemcheckbox', { name: 'Team' }));
      expect(titles()).toContain('Team');
    });

    it('keeps the last column from being hidden', async () => {
      const user = userEvent.setup();
      renderGrid({
        toolbar: true,
        columns: [
          { accessor: 'name', header: 'Name' },
          { accessor: 'age', header: 'Age' },
        ],
      });
      await user.click(screen.getByRole('button', { name: 'Columns' }));
      await user.click(screen.getByRole('menuitemcheckbox', { name: 'Age' }));
      expect(screen.getByRole('menuitemcheckbox', { name: 'Name' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });

    it('leaves out columns that cannot be hidden', async () => {
      const user = userEvent.setup();
      renderGrid({
        toolbar: true,
        columns: [
          { accessor: 'name', header: 'Name', hideable: false },
          { accessor: 'age', header: 'Age' },
        ],
      });
      await user.click(screen.getByRole('button', { name: 'Columns' }));
      expect(screen.queryByRole('menuitemcheckbox', { name: 'Name' })).not.toBeInTheDocument();
    });

    it('puts the layout back to how it started', async () => {
      const user = userEvent.setup();
      renderGrid({
        toolbar: true,
        columns: [
          { accessor: 'name', header: 'Name', width: 200 },
          { accessor: 'age', header: 'Age', defaultHidden: true },
          { accessor: 'team', header: 'Team', pinned: 'left' },
        ],
      });
      expect(titles()).toEqual(['Team', 'Name']);
      await user.click(screen.getByRole('button', { name: 'Columns' }));
      await user.click(screen.getByRole('menuitemcheckbox', { name: 'Age' }));
      expect(titles()).toEqual(['Team', 'Name', 'Age']);
      await user.click(screen.getByRole('menuitem', { name: 'Reset columns' }));
      expect(titles()).toEqual(['Team', 'Name']);
    });
  });

  describe('reordering', () => {
    it('moves a header with Alt and the arrow keys, announcing the move', async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      renderGrid({ onLayoutChange });
      header('Age').focus();
      await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
      expect(titles().slice(0, 3)).toEqual(['Name', 'Team', 'Age']);
      expect(screen.getByRole('status')).toHaveTextContent('Age moved to position 3 of 6');
      expect(lastLayout(onLayoutChange).columnOrder.slice(-6)).toEqual([
        'name',
        'team',
        'age',
        'joined',
        'active',
        'salary',
      ]);
      // Focus stays on the moved header, and the next arrow moves from there.
      expect(header('Age')).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(header('Joined')).toHaveFocus();
    });

    it('does not move past either end', async () => {
      const user = userEvent.setup();
      renderGrid();
      header('Name').focus();
      await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
      expect(titles()[0]).toBe('Name');
      header('Salary').focus();
      await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
      expect(titles().at(-1)).toBe('Salary');
    });

    it('moves a dragged header to the edge of the one it is dropped on', () => {
      renderGrid();
      const dataTransfer = { setData: vi.fn(), effectAllowed: 'none' };
      fireEvent.dragStart(header('Salary'), { dataTransfer });
      expect(header('Salary')).toHaveClass('axon-datagrid__header-cell--dragging');
      dragOver(header('Age'), -1);
      expect(header('Age')).toHaveClass('axon-datagrid__header-cell--drop-before');
      fireEvent.drop(header('Age'));
      expect(titles()).toEqual(['Name', 'Salary', 'Age', 'Team', 'Joined', 'Active']);
      expect(header('Salary')).not.toHaveClass('axon-datagrid__header-cell--dragging');
    });

    it('can drop after a header', () => {
      renderGrid();
      fireEvent.dragStart(header('Name'), { dataTransfer: { setData: vi.fn() } });
      dragOver(header('Team'), 10);
      expect(header('Team')).toHaveClass('axon-datagrid__header-cell--drop-after');
      fireEvent.drop(header('Team'));
      expect(titles()).toEqual(['Age', 'Team', 'Name', 'Joined', 'Active', 'Salary']);
    });

    it('lets go without moving anything when the drag is cancelled', () => {
      renderGrid();
      fireEvent.dragStart(header('Name'), { dataTransfer: { setData: vi.fn() } });
      dragOver(header('Team'), 10);
      fireEvent.dragEnd(header('Name'));
      expect(titles()).toEqual(['Name', 'Age', 'Team', 'Joined', 'Active', 'Salary']);
      expect(header('Team')).not.toHaveClass('axon-datagrid__header-cell--drop-after');
    });

    it('does not move pinned columns, the checkbox column, or columns that opt out', () => {
      renderGrid({
        selectable: true,
        columns: [
          { accessor: 'name', header: 'Name', pinned: 'left' },
          { accessor: 'age', header: 'Age', reorderable: false },
          { accessor: 'team', header: 'Team' },
        ],
      });
      expect(header('Name')).not.toHaveAttribute('draggable');
      expect(header('Age')).not.toHaveAttribute('draggable');
      expect(header('Team')).toHaveAttribute('draggable', 'true');
      expect(screen.getByRole('columnheader', { name: 'Select' })).not.toHaveAttribute('draggable');
    });

    it('can be switched off', () => {
      renderGrid({ reorderable: false });
      expect(header('Name')).not.toHaveAttribute('draggable');
    });

    it('keeps the checkbox column first through a move', async () => {
      const user = userEvent.setup();
      renderGrid({ selectable: true });
      header('Age').focus();
      await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
      expect(titles()).toEqual(['Select', 'Age', 'Name', 'Team', 'Joined', 'Active', 'Salary']);
    });

    it('keeps a hidden column in its place when it is shown again', async () => {
      const user = userEvent.setup();
      renderGrid({ toolbar: true, defaultLayout: { columnVisibility: { age: false } } });
      header('Team').focus();
      await user.keyboard('{Alt>}{ArrowLeft}{/Alt}');
      expect(titles().slice(0, 2)).toEqual(['Team', 'Name']);
      await user.click(screen.getByRole('button', { name: 'Columns' }));
      await user.click(screen.getByRole('menuitemcheckbox', { name: 'Age' }));
      expect(titles().slice(0, 3)).toEqual(['Team', 'Name', 'Age']);
    });
  });

  describe('resizing', () => {
    it('widens and narrows from the keyboard, more with Shift', async () => {
      const user = userEvent.setup();
      renderGrid();
      resizer('Name').focus();
      expect(resizer('Name')).toHaveAttribute('aria-valuenow', '180');
      await user.keyboard('{ArrowRight}');
      expect(width('Name')).toBe(190);
      await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
      expect(width('Name')).toBe(240);
      await user.keyboard('{ArrowLeft}{ArrowLeft}');
      expect(width('Name')).toBe(220);
      expect(resizer('Name')).toHaveAttribute('aria-valuenow', '220');
    });

    it('stops at the column’s limits', async () => {
      const user = userEvent.setup();
      renderGrid({
        columns: [
          { accessor: 'name', header: 'Name', width: 100, minWidth: 90, maxWidth: 120 },
          { accessor: 'age', header: 'Age' },
        ],
      });
      resizer('Name').focus();
      await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
      expect(width('Name')).toBe(120);
      await user.keyboard('{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}');
      expect(width('Name')).toBe(90);
      expect(resizer('Name')).toHaveAttribute('aria-valuemin', '90');
      expect(resizer('Name')).toHaveAttribute('aria-valuemax', '120');
    });

    it('does not sort the column when its handle is pressed', async () => {
      const user = userEvent.setup();
      renderGrid();
      await user.click(resizer('Name'));
      expect(header('Name')).toHaveAttribute('aria-sort', 'none');
    });

    it('follows the pointer while it is dragged, and reports the layout once it lets go', async () => {
      const onLayoutChange = vi.fn();
      renderGrid({ onLayoutChange });
      fireEvent.mouseDown(resizer('Name'), { clientX: 200 });
      fireEvent.mouseMove(document, { clientX: 230 });
      expect(width('Name')).toBe(210);
      // Further moves within a frame are applied on the next one.
      fireEvent.mouseMove(document, { clientX: 260 });
      await waitFor(() => expect(width('Name')).toBe(240));
      // Nothing is saved while the edge is still moving.
      expect(onLayoutChange).not.toHaveBeenCalled();
      fireEvent.mouseUp(document, { clientX: 260 });
      expect(onLayoutChange).toHaveBeenCalledTimes(1);
      expect(lastLayout(onLayoutChange).columnSizing).toEqual({ name: 240 });
    });

    it('goes back to the starting width on a double click', async () => {
      const user = userEvent.setup();
      renderGrid({ defaultLayout: { columnSizing: { name: 300 } } });
      expect(width('Name')).toBe(300);
      await user.dblClick(resizer('Name'));
      expect(width('Name')).toBe(180);
    });

    it('is left out of columns that opt out, and of the whole grid', () => {
      const { unmount } = renderGrid({
        columns: [
          { accessor: 'name', header: 'Name', resizable: false },
          { accessor: 'age', header: 'Age' },
        ],
      });
      expect(screen.queryByRole('separator', { name: 'Resize Name' })).not.toBeInTheDocument();
      expect(resizer('Age')).toBeInTheDocument();
      unmount();
      renderGrid({ resizable: false });
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    });

    it('moves the pinned columns after it by the same amount', async () => {
      const user = userEvent.setup();
      renderGrid({
        columns: [
          { accessor: 'name', header: 'Name', width: 100, pinned: 'left' },
          { accessor: 'age', header: 'Age', width: 100, pinned: 'left' },
          { accessor: 'team', header: 'Team' },
        ],
      });
      const offset = () => header('Age').style.getPropertyValue('--axon-datagrid-pin-offset');
      expect(offset()).toBe('100px');
      resizer('Name').focus();
      await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
      expect(offset()).toBe('150px');
    });
  });

  describe('the layout', () => {
    it('is reported whole whenever a part of it changes', async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      renderGrid({ toolbar: true, onLayoutChange });
      await user.click(screen.getByRole('button', { name: 'Density' }));
      await user.click(screen.getByRole('menuitemradio', { name: 'Comfortable' }));
      expect(lastLayout(onLayoutChange)).toEqual({
        columnOrder: [],
        columnSizing: {},
        columnVisibility: {},
        columnPinning: { left: [], right: [] },
        density: 'comfortable',
      });
    });

    it('can be saved and restored', async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      const first = renderGrid({ onLayoutChange });
      header('Age').focus();
      await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
      await user.click(menuButton('Salary'));
      await user.click(screen.getByRole('menuitem', { name: 'Hide column' }));
      const saved = lastLayout(onLayoutChange);
      first.unmount();

      renderGrid({ defaultLayout: saved });
      expect(titles()).toEqual(['Name', 'Team', 'Age', 'Joined', 'Active']);
    });

    it('can be held by the owner', async () => {
      const user = userEvent.setup();
      const onLayoutChange = vi.fn();
      const layout: DataGridLayout = {
        columnOrder: [],
        columnSizing: {},
        columnVisibility: {},
        columnPinning: { left: [], right: [] },
        density: 'standard',
      };
      renderGrid({ layout, onLayoutChange });
      await user.click(menuButton('Team'));
      await user.click(screen.getByRole('menuitem', { name: 'Hide column' }));
      expect(lastLayout(onLayoutChange).columnVisibility).toEqual({ team: false });
      // Nothing changes until the owner passes the new layout back in.
      expect(titles()).toContain('Team');
    });
  });

  it('has no accessibility violations with menus and handles', async () => {
    const { container } = renderGrid({ toolbar: true, selectable: true });
    expect(await axe(container)).toHaveNoViolations();
    expect(bodyRows()).toHaveLength(8);
    // The checkbox column cannot be resized, so there is a handle for each of the six others.
    expect(within(container).getAllByRole('separator')).toHaveLength(6);
    expect(cellsOf(bodyRows()[0] as HTMLElement)).toHaveLength(7);
  });
});
