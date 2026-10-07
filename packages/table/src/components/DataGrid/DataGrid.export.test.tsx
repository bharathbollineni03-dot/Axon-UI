import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { header, renderGrid } from '../../testing/gridTestUtils';
import { people, personColumns } from '../../testing/sampleData';
import type { DataGridExportContext } from '../../types';
import type { Person } from '../../testing/sampleData';

const exportButton = () => screen.getByRole('button', { name: 'Export CSV' });
const lines = (csv: string) => csv.split('\r\n').filter(Boolean);

describe('DataGrid export', () => {
  const originals = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  afterEach(() => {
    URL.createObjectURL = originals.create;
    URL.revokeObjectURL = originals.revoke;
  });

  function capture() {
    const onExport = vi.fn<(context: DataGridExportContext<Person>) => void>();
    return { onExport, last: () => onExport.mock.lastCall?.[0] as DataGridExportContext<Person> };
  }

  it('is a toolbar button', () => {
    renderGrid({ toolbar: true });
    expect(exportButton()).toBeInTheDocument();
  });

  it('can be left out of the toolbar', () => {
    renderGrid({ toolbar: { export: false } });
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
  });

  it('hands over the CSV of every row, headed by the column titles', async () => {
    const user = userEvent.setup();
    const { onExport, last } = capture();
    renderGrid({ toolbar: true, onExport });
    await user.click(exportButton());
    expect(lines(last().csv)).toEqual([
      'Name,Age,Team,Joined,Active,Salary',
      'Ada Lovelace,36,Research,2019-03-04,true,120000',
      'Grace Hopper,45,Platform,2016-09-19,true,135000',
      'Alan Turing,41,Research,2020-01-13,false,',
      'Margaret Hamilton,36,Platform,2018-06-02,true,128000',
      'Linus Torvalds,29,Kernel,2021-11-30,true,99000',
      'Barbara Liskov,52,Research,2015-02-08,false,142000',
      'Dennis Ritchie,38,Kernel,2017-07-21,true,110000',
      'Radia Perlman,33,Platform,2022-04-11,true,105000',
    ]);
    expect(last().rows).toHaveLength(8);
    expect(last().columns.map((c) => c.header)).toEqual([
      'Name',
      'Age',
      'Team',
      'Joined',
      'Active',
      'Salary',
    ]);
  });

  it('exports what is on show: the sort, the filters and the search, across all pages', async () => {
    const user = userEvent.setup();
    const { onExport, last } = capture();
    renderGrid({
      toolbar: true,
      onExport,
      paginated: true,
      defaultPagination: { pageIndex: 0, pageSize: 2 },
    });
    await user.click(header('Age'));
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'research');
    await user.click(exportButton());
    expect(lines(last().csv).map((line) => line.split(',')[0])).toEqual([
      'Name',
      'Ada Lovelace',
      'Alan Turing',
      'Barbara Liskov',
    ]);
  });

  it('leaves out hidden columns and columns that opt out, and uses an exportValue', async () => {
    const user = userEvent.setup();
    const { onExport, last } = capture();
    renderGrid({
      toolbar: true,
      onExport,
      columns: [
        { accessor: 'name', header: 'Name' },
        { accessor: 'age', header: 'Age', defaultHidden: true },
        { accessor: 'team', header: 'Team', exportable: false },
        {
          accessor: 'salary',
          header: 'Pay',
          exportValue: (row) => (row.salary ? `$${row.salary}` : 'n/a'),
        },
        { id: 'actions', header: 'Actions', cell: () => 'x', exportable: false },
      ],
    });
    await user.click(exportButton());
    expect(lines(last().csv).slice(0, 4)).toEqual([
      'Name,Pay',
      'Ada Lovelace,$120000',
      'Grace Hopper,$135000',
      'Alan Turing,n/a',
    ]);
  });

  it('does not include the checkbox column', async () => {
    const user = userEvent.setup();
    const { onExport, last } = capture();
    renderGrid({ toolbar: true, selectable: true, onExport });
    await user.click(exportButton());
    expect(lines(last().csv)[0]).toBe('Name,Age,Team,Joined,Active,Salary');
  });

  it('only exports the rows it has, against a server', async () => {
    const user = userEvent.setup();
    const { onExport, last } = capture();
    renderGrid({
      toolbar: true,
      onExport,
      mode: 'server',
      data: people.slice(0, 2),
      totalRowCount: 900,
    });
    await user.click(exportButton());
    expect(last().rows).toHaveLength(2);
  });

  it('keeps a spreadsheet from running text that looks like a formula', async () => {
    const user = userEvent.setup();
    const { onExport, last } = capture();
    renderGrid({
      toolbar: true,
      onExport,
      data: [{ ...(people[0] as Person), name: '=HYPERLINK("http://evil.example")' }],
    });
    await user.click(exportButton());
    expect(lines(last().csv)[1]?.startsWith(`"'=HYPERLINK(`)).toBe(true);
  });

  it('announces how many rows it exported', async () => {
    const user = userEvent.setup();
    renderGrid({ toolbar: true, onExport: () => {} });
    await user.click(exportButton());
    expect(screen.getByRole('status')).toHaveTextContent('Exported 8 rows');
  });

  it('saves a file when nothing else is asked for', async () => {
    const user = userEvent.setup();
    let saved: Blob | undefined;
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      saved = blob as Blob;
      return 'blob:grid';
    };
    URL.revokeObjectURL = vi.fn();
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    renderGrid({ toolbar: true, exportFileName: 'people.csv' });
    await user.click(exportButton());
    expect(downloads).toEqual(['people.csv']);
    expect(saved?.type).toBe('text/csv;charset=utf-8');
  });

  it('names the file export.csv by default', async () => {
    const user = userEvent.setup();
    URL.createObjectURL = () => 'blob:grid';
    URL.revokeObjectURL = vi.fn();
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    renderGrid({ toolbar: true, columns: personColumns });
    await user.click(exportButton());
    expect(downloads).toEqual(['export.csv']);
  });
});
