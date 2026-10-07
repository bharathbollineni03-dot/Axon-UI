import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import {
  Table,
  TableBody,
  TableCell,
  TableFoot,
  TableHead,
  TableHeaderCell,
  TableRow,
  type TableProps,
} from './Table';

function renderTable(props: Partial<TableProps> = {}) {
  return render(
    <Table caption="Quarterly revenue" {...props}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Region</TableHeaderCell>
          <TableHeaderCell align="end">Revenue</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>North</TableCell>
          <TableCell numeric>1,200</TableCell>
        </TableRow>
        <TableRow selected>
          <TableCell>South</TableCell>
          <TableCell numeric>980</TableCell>
        </TableRow>
      </TableBody>
      <TableFoot>
        <TableRow>
          <TableCell>Total</TableCell>
          <TableCell numeric>2,180</TableCell>
        </TableRow>
      </TableFoot>
    </Table>,
  );
}

describe('Table', () => {
  it('renders semantic table markup named by its caption', () => {
    renderTable();
    const table = screen.getByRole('table', { name: 'Quarterly revenue' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(2);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByRole('cell', { name: '980' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Region' })).toHaveAttribute('scope', 'col');
  });

  it('puts the caption below the table on request', () => {
    renderTable({ captionSide: 'bottom' });
    expect(document.querySelector('caption')).toHaveClass('axon-table__caption--bottom');
  });

  it('can hide the caption visually while keeping it as the name', () => {
    renderTable({ hideCaption: true });
    expect(document.querySelector('caption')).toHaveClass('axon-visually-hidden');
    expect(screen.getByRole('table', { name: 'Quarterly revenue' })).toBeInTheDocument();
  });

  it('turns the style options into modifier classes', () => {
    renderTable({
      striped: true,
      bordered: true,
      dense: true,
      hoverable: true,
      stickyHeader: true,
    });
    expect(screen.getByRole('table')).toHaveClass(
      'axon-table--striped',
      'axon-table--bordered',
      'axon-table--dense',
      'axon-table--hoverable',
      'axon-table--sticky',
    );
  });

  it('limits the height of its container', () => {
    const { container } = renderTable({ maxHeight: 240, stickyHeader: true });
    expect(container.firstElementChild).toHaveStyle({ maxHeight: '240px' });
  });

  it('aligns numbers to the end', () => {
    renderTable();
    expect(screen.getByRole('cell', { name: '1,200' })).toHaveClass(
      'axon-table__cell--end',
      'axon-table__cell--numeric',
    );
    expect(screen.getByRole('cell', { name: 'North' })).toHaveClass('axon-table__cell--start');
  });

  it('marks a selected row', () => {
    renderTable();
    const rows = screen.getAllByRole('row');
    expect(rows[2]).toHaveAttribute('aria-selected', 'true');
    expect(rows[1]).not.toHaveAttribute('aria-selected');
  });

  it('forwards props and the ref to the table element', () => {
    const ref = { current: null as HTMLTableElement | null };
    render(
      <Table ref={ref} data-testid="t" caption="x">
        <TableBody />
      </Table>,
    );
    expect(ref.current).toBe(screen.getByTestId('t'));
  });

  describe('sortable headers', () => {
    it('announces the sort and asks for the next one when pressed', async () => {
      const onSort = vi.fn();
      render(
        <Table caption="People">
          <TableHead>
            <TableRow>
              <TableHeaderCell sort="asc" onSort={onSort}>
                Name
              </TableHeaderCell>
              <TableHeaderCell sort="none">Age</TableHeaderCell>
            </TableRow>
          </TableHead>
        </Table>,
      );
      expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
        'aria-sort',
        'ascending',
      );
      expect(screen.getByRole('columnheader', { name: 'Age' })).toHaveAttribute(
        'aria-sort',
        'none',
      );

      await userEvent.click(screen.getByRole('button', { name: 'Name' }));
      expect(onSort).toHaveBeenCalledTimes(1);
    });

    it('omits aria-sort on a column that is not sortable', () => {
      renderTable();
      expect(screen.getByRole('columnheader', { name: 'Region' })).not.toHaveAttribute('aria-sort');
    });

    it('maps descending to aria-sort="descending"', () => {
      render(
        <Table caption="People">
          <TableHead>
            <TableRow>
              <TableHeaderCell sort="desc">Name</TableHeaderCell>
            </TableRow>
          </TableHead>
        </Table>,
      );
      expect(screen.getByRole('columnheader')).toHaveAttribute('aria-sort', 'descending');
    });
  });

  describe('scrolling region', () => {
    it('is not a tab stop when everything fits', () => {
      const { container } = renderTable();
      expect(container.firstElementChild).not.toHaveAttribute('tabindex');
    });

    it('becomes a focusable, named region when the content overflows', async () => {
      const scrollWidth = vi
        .spyOn(HTMLElement.prototype, 'scrollWidth', 'get')
        .mockReturnValue(900);
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
      try {
        renderTable();
        expect(await screen.findByRole('region', { name: 'Quarterly revenue' })).toHaveAttribute(
          'tabindex',
          '0',
        );
      } finally {
        scrollWidth.mockRestore();
      }
    });

    it('prefers an explicit scroll label', async () => {
      vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(900);
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
      renderTable({ scrollLabel: 'Revenue by region, scrollable' });
      expect(
        await screen.findByRole('region', { name: 'Revenue by region, scrollable' }),
      ).toBeInTheDocument();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderTable({ striped: true, bordered: true });
    expect(await axe(container)).toHaveNoViolations();
  });
});
