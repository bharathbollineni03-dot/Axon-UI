export interface DataTableProps {
  caption: string;
  /** Column headings. The first is the heading of the row labels. */
  headers: readonly string[];
  /** One array per row; the first cell labels the row. */
  rows: readonly (readonly string[])[];
}

/**
 * The numbers behind a chart, as a real table that only assistive technology sees. A chart is an
 * image to a screen reader, and this is what it can read instead.
 */
export function DataTable({ caption, headers, rows }: DataTableProps) {
  return (
    <div className="axon-visually-hidden">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`${header}-${index}`} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) =>
                cellIndex === 0 ? (
                  <th key={cellIndex} scope="row">
                    {cell}
                  </th>
                ) : (
                  <td key={cellIndex}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Whether to include the table: always, never, or `auto` for charts of 50 rows or fewer. */
export function wantsDataTable(option: boolean | 'auto' | undefined, rowCount: number): boolean {
  if (option === undefined || option === 'auto') return rowCount <= 50;
  return option;
}
