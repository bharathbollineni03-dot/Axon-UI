import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { bodyRows, cellsOf, column, gridElement, renderGrid } from '../../testing/gridTestUtils';
import type { DataGridColumn, DataGridRowUpdate } from '../../types';
import type { Person } from '../../testing/sampleData';

const teams = ['Kernel', 'Platform', 'Research'].map((value) => ({ value, label: value }));

const columns: DataGridColumn<Person>[] = [
  { accessor: 'name', header: 'Name', width: 180, editable: true },
  {
    accessor: 'age',
    header: 'Age',
    editable: { type: 'number', min: 18, max: 99 },
    validate: (value) => (value === null ? 'Age is required' : undefined),
  },
  { accessor: 'team', header: 'Team', editable: { type: 'select', options: teams } },
  { accessor: 'joined', header: 'Joined', width: 160, editable: true },
  { accessor: 'active', header: 'Active', editable: true },
];

const cell = (row: number, col: number) =>
  cellsOf(bodyRows()[row] as HTMLElement)[col] as HTMLElement;
const editorOf = (name: string) => screen.getByLabelText(name);

function setup(props: Parameters<typeof renderGrid>[0] = {}) {
  const user = userEvent.setup();
  const onRowUpdate = vi.fn<(change: DataGridRowUpdate<Person>) => void | Promise<void>>();
  const view = renderGrid({ columns, onRowUpdate, locale: 'en-US', ...props });
  return { user, onRowUpdate, ...view };
}

describe('DataGrid editing', () => {
  describe('starting and finishing', () => {
    it('opens a text editor on double click, holding the value', async () => {
      const { user } = setup();
      await user.dblClick(cell(0, 0));
      const input = editorOf('Edit Name');
      expect(input).toHaveValue('Ada Lovelace');
      expect(input).toHaveFocus();
    });

    it('opens on Enter and on F2', async () => {
      const { user } = setup();
      cell(1, 0).focus();
      await user.keyboard('{Enter}');
      expect(editorOf('Edit Name')).toHaveValue('Grace Hopper');
      await user.keyboard('{Escape}');
      expect(screen.queryByLabelText('Edit Name')).not.toBeInTheDocument();
      await user.keyboard('{F2}');
      expect(editorOf('Edit Name')).toBeInTheDocument();
    });

    it('saves on Enter, telling the owner what changed, and gives focus back to the cell', async () => {
      const { user, onRowUpdate } = setup();
      await user.dblClick(cell(0, 0));
      await user.clear(editorOf('Edit Name'));
      await user.type(editorOf('Edit Name'), 'Ada King{Enter}');
      await waitFor(() => expect(screen.queryByLabelText('Edit Name')).not.toBeInTheDocument());
      expect(onRowUpdate).toHaveBeenCalledTimes(1);
      expect(onRowUpdate).toHaveBeenCalledWith({
        rowId: '1',
        row: expect.objectContaining({ name: 'Ada Lovelace' }),
        columnId: 'name',
        value: 'Ada King',
        previousValue: 'Ada Lovelace',
      });
      expect(cell(0, 0)).toHaveFocus();
    });

    it('keeps navigating from the cell after an edit', async () => {
      const { user } = setup();
      await user.dblClick(cell(0, 0));
      await user.type(editorOf('Edit Name'), '!{Enter}');
      await waitFor(() => expect(cell(0, 0)).toHaveFocus());
      await user.keyboard('{ArrowDown}');
      expect(cell(1, 0)).toHaveFocus();
    });

    it('saves when focus leaves a text field', async () => {
      const { user, onRowUpdate } = setup();
      await user.dblClick(cell(0, 0));
      await user.type(editorOf('Edit Name'), '!');
      await user.click(document.body);
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalled());
      expect(onRowUpdate.mock.lastCall?.[0].value).toBe('Ada Lovelace!');
    });

    it('puts the old value back on Escape', async () => {
      const { user, onRowUpdate } = setup();
      await user.dblClick(cell(0, 0));
      await user.type(editorOf('Edit Name'), 'xyz{Escape}');
      expect(screen.queryByLabelText('Edit Name')).not.toBeInTheDocument();
      expect(onRowUpdate).not.toHaveBeenCalled();
      expect(cell(0, 0)).toHaveTextContent('Ada Lovelace');
      expect(cell(0, 0)).toHaveFocus();
    });

    it('does not report an edit that changed nothing', async () => {
      const { user, onRowUpdate } = setup();
      await user.dblClick(cell(0, 0));
      await user.keyboard('{Enter}');
      expect(onRowUpdate).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('Edit Name')).not.toBeInTheDocument();
    });

    it('edits one cell at a time', async () => {
      const { user } = setup();
      await user.dblClick(cell(0, 0));
      await user.dblClick(cell(1, 0));
      expect(screen.getAllByLabelText('Edit Name')).toHaveLength(1);
      expect(editorOf('Edit Name')).toHaveValue('Grace Hopper');
    });

    it('does not open an editor on a cell that is not editable', async () => {
      const { user } = setup();
      await user.dblClick(cell(0, 4));
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      cell(0, 4).focus();
      await user.keyboard('{Enter}');
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('is off without onRowUpdate: there would be nowhere to put the change', async () => {
      const user = userEvent.setup();
      renderGrid({ columns });
      await user.dblClick(cell(0, 0));
      expect(screen.queryByLabelText('Edit Name')).not.toBeInTheDocument();
      expect(cell(0, 0)).not.toHaveAttribute('aria-readonly');
    });

    it('marks the cells that can be edited', () => {
      setup();
      expect(cell(0, 0)).toHaveAttribute('aria-readonly', 'false');
      expect(cell(0, 0)).toHaveClass('axon-datagrid__cell--editable');
    });
  });

  describe('number editor', () => {
    it('saves a number, within its limits', async () => {
      const { user, onRowUpdate } = setup();
      await user.dblClick(cell(0, 1));
      const input = editorOf('Edit Age');
      expect(input).toHaveValue('36');
      await user.clear(input);
      await user.type(input, '50{Enter}');
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalled());
      expect(onRowUpdate.mock.lastCall?.[0].value).toBe(50);
    });

    it('settles a value beyond the limits before saving it', async () => {
      const { user, onRowUpdate } = setup();
      await user.dblClick(cell(0, 1));
      await user.clear(editorOf('Edit Age'));
      await user.type(editorOf('Edit Age'), '150{Enter}');
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalled());
      expect(onRowUpdate.mock.lastCall?.[0].value).toBe(99);
    });
  });

  describe('validation', () => {
    it('says why an edit is refused, and keeps the editor open', async () => {
      const { user, onRowUpdate } = setup();
      await user.dblClick(cell(0, 1));
      await user.clear(editorOf('Edit Age'));
      await user.keyboard('{Enter}');
      expect(await screen.findByRole('alert')).toHaveTextContent('Age is required');
      expect(editorOf('Edit Age')).toHaveAttribute('aria-invalid', 'true');
      expect(onRowUpdate).not.toHaveBeenCalled();

      await user.type(editorOf('Edit Age'), '41{Enter}');
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalled());
      expect(onRowUpdate.mock.lastCall?.[0].value).toBe(41);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('can be cancelled even when the value is invalid', async () => {
      const { user } = setup();
      await user.dblClick(cell(0, 1));
      await user.clear(editorOf('Edit Age'));
      await user.keyboard('{Enter}');
      await screen.findByRole('alert');
      await user.keyboard('{Escape}');
      expect(screen.queryByLabelText('Edit Age')).not.toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('keeps the editor open and busy while a promise is pending, then closes it', async () => {
      let finish: () => void = () => {};
      const { user, onRowUpdate } = setup();
      onRowUpdate.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      );
      await user.dblClick(cell(0, 0));
      await user.type(editorOf('Edit Name'), '!{Enter}');
      await waitFor(() => expect(editorOf('Edit Name')).toBeDisabled());
      expect(editorOf('Edit Name').closest('[aria-busy="true"]')).not.toBeNull();
      // A second Enter while it saves does not save twice.
      await user.keyboard('{Enter}');
      expect(onRowUpdate).toHaveBeenCalledTimes(1);

      finish();
      await waitFor(() => expect(screen.queryByLabelText('Edit Name')).not.toBeInTheDocument());
    });

    it('shows why a save failed and lets the user try again', async () => {
      const { user, onRowUpdate } = setup();
      onRowUpdate.mockRejectedValueOnce(new Error('Name already taken'));
      await user.dblClick(cell(0, 0));
      await user.type(editorOf('Edit Name'), '2{Enter}');
      expect(await screen.findByRole('alert')).toHaveTextContent('Name already taken');
      expect(editorOf('Edit Name')).not.toBeDisabled();
      expect(editorOf('Edit Name')).toHaveFocus();

      onRowUpdate.mockResolvedValueOnce(undefined);
      await user.keyboard('{Enter}');
      await waitFor(() => expect(screen.queryByLabelText('Edit Name')).not.toBeInTheDocument());
      expect(onRowUpdate).toHaveBeenCalledTimes(2);
    });

    it('has a message of its own when a failure gives none', async () => {
      const { user, onRowUpdate } = setup();
      onRowUpdate.mockRejectedValueOnce('nope');
      await user.dblClick(cell(0, 0));
      await user.type(editorOf('Edit Name'), '2{Enter}');
      expect(await screen.findByRole('alert')).toHaveTextContent('The change could not be saved.');
    });

    it('shows what the data says once the owner updates it', async () => {
      const user = userEvent.setup();
      const { update } = renderGrid({ columns, onRowUpdate: () => {} });
      await user.dblClick(cell(0, 0));
      await user.type(editorOf('Edit Name'), '!{Enter}');
      await waitFor(() => expect(screen.queryByLabelText('Edit Name')).not.toBeInTheDocument());
      // The grid does not change the data itself.
      expect(cell(0, 0)).toHaveTextContent('Ada Lovelace');
      const { people } = await import('../../testing/sampleData');
      update({ data: people.map((p) => (p.id === 1 ? { ...p, name: 'Ada Lovelace!' } : p)) });
      expect(cell(0, 0)).toHaveTextContent('Ada Lovelace!');
    });
  });

  describe('select editor', () => {
    it('offers the options and saves the chosen one with Enter', async () => {
      const { user, onRowUpdate } = setup();
      await user.dblClick(cell(0, 2));
      const select = editorOf('Edit Team') as HTMLSelectElement;
      expect(select).toHaveValue('Research');
      expect(
        within(select)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['Kernel', 'Platform', 'Research']);
      await user.selectOptions(select, 'Kernel');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalled());
      expect(onRowUpdate.mock.lastCall?.[0]).toMatchObject({
        columnId: 'team',
        value: 'Kernel',
        previousValue: 'Research',
      });
    });
  });

  describe('date editor', () => {
    it('saves a date typed in the field, as a date', async () => {
      const { user, onRowUpdate } = setup();
      await user.dblClick(cell(0, 3));
      const input = editorOf('Edit Joined');
      expect(input).toHaveValue('03/04/2019');
      await user.clear(input);
      await user.type(input, '05/06/2020{Enter}');
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalled());
      const { value } = onRowUpdate.mock.lastCall?.[0] ?? {};
      expect(value).toBeInstanceOf(Date);
      expect((value as Date).getFullYear()).toBe(2020);
      expect((value as Date).getMonth()).toBe(4);
      expect((value as Date).getDate()).toBe(6);
    });

    it('gives a date back as text when the cell held text', async () => {
      const { user, onRowUpdate } = setup({
        // A string is edited as text unless the column says it is a date.
        columns: [{ accessor: 'joined', header: 'Joined', width: 160, editable: { type: 'date' } }],
        data: [
          {
            id: 1,
            name: 'A',
            age: 30,
            team: 'Kernel',
            joined: '2019-03-04' as never,
            active: true,
            salary: 1,
          },
        ],
      });
      await user.dblClick(cell(0, 0));
      await user.clear(editorOf('Edit Joined'));
      await user.type(editorOf('Edit Joined'), '05/06/2020{Enter}');
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalled());
      expect(onRowUpdate.mock.lastCall?.[0].value).toBe('2020-05-06');
    });
  });

  describe('checkbox editor', () => {
    it('is a checkbox in the cell, and saves as soon as it is pressed', async () => {
      const { user, onRowUpdate } = setup();
      const box = within(cell(2, 4)).getByRole('checkbox', { name: 'Edit Active' });
      expect(box).not.toBeChecked();
      await user.click(box);
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalled());
      expect(onRowUpdate.mock.lastCall?.[0]).toMatchObject({
        columnId: 'active',
        value: true,
        previousValue: false,
      });
    });

    it('toggles with Space or Enter on the cell', async () => {
      const { user, onRowUpdate } = setup();
      cell(0, 4).focus();
      await user.keyboard(' ');
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalledTimes(1));
      expect(onRowUpdate.mock.lastCall?.[0].value).toBe(false);
      await user.keyboard('{Enter}');
      await waitFor(() => expect(onRowUpdate).toHaveBeenCalledTimes(2));
    });

    it('shows a refusal in the cell', async () => {
      const { user, onRowUpdate } = setup();
      onRowUpdate.mockRejectedValueOnce(new Error('Locked'));
      await user.click(within(cell(0, 4)).getByRole('checkbox'));
      expect(await screen.findByRole('alert')).toHaveTextContent('Locked');
    });
  });

  it('does not edit group rows', async () => {
    const user = userEvent.setup();
    renderGrid({
      onRowUpdate: () => {},
      columns: [
        { accessor: 'team', header: 'Team', groupable: true, editable: true },
        { accessor: 'name', header: 'Name', editable: true },
      ],
      defaultGrouping: ['team'],
    });
    await user.dblClick(cell(0, 0));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(gridElement()).toBeInTheDocument();
    expect(column(0)[0]).toContain('Research');
  });

  it('has no accessibility violations while editing', async () => {
    const { user, container } = setup();
    await user.dblClick(cell(0, 0));
    expect(await axe(container)).toHaveNoViolations();
  });
});
