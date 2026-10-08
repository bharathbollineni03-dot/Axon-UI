import { readAccessor } from './buildColumns';
import { toDateInputValue } from './format';
import type { DataGridColumn } from '../types';

export interface CsvOptions {
  /** The line break between rows. Default `\r\n`, as RFC 4180 has it. */
  lineBreak?: string;
  /**
   * Starts a text that a spreadsheet would run as a formula (one that begins with `=`, `+`, `-` or
   * `@`) with an apostrophe, so that opening an exported file cannot execute anything. Default true.
   */
  protectFormulas?: boolean;
}

const PURE_NUMBER = /^[-+]?\d+(\.\d+)?$/;
const FORMULA_START = /^[=+\-@\t\r]/;

/** A value as a CSV field, quoted when it holds a comma, a quote or a line break. */
export function csvField(value: unknown, { protectFormulas = true }: CsvOptions = {}): string {
  let text: string;
  if (value === null || value === undefined) text = '';
  else if (value instanceof Date) text = formatDate(value);
  else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint')
    text = String(value);
  else if (Array.isArray(value))
    text = value.map((item) => csvField(item, { protectFormulas: false })).join('; ');
  else if (typeof value === 'object') text = JSON.stringify(value);
  else {
    text = String(value);
    // Numbers written as text ("-5") are left alone; anything else that looks like a formula is not.
    if (protectFormulas && FORMULA_START.test(text) && !PURE_NUMBER.test(text)) text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A date as `YYYY-MM-DD`, with the time of day only when it has one. Local time, like the grid. */
function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return '';
  const day = toDateInputValue(date);
  const hasTime =
    date.getHours() + date.getMinutes() + date.getSeconds() + date.getMilliseconds() > 0;
  if (!hasTime) return day;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** What a row contributes to a column of an export. */
export function exportValueOf<Row>(column: DataGridColumn<Row>, row: Row): unknown {
  return column.exportValue ? column.exportValue(row) : readAccessor(column, row);
}

/** The rows as CSV text, headed by the columns' titles. */
export function toCsv<Row>(
  columns: readonly DataGridColumn<Row>[],
  rows: readonly Row[],
  options: CsvOptions = {},
): string {
  const lineBreak = options.lineBreak ?? '\r\n';
  const lines = [
    columns.map((column) => csvField(column.header, { protectFormulas: false })).join(','),
    ...rows.map((row) =>
      columns.map((column) => csvField(exportValueOf(column, row), options)).join(','),
    ),
  ];
  return lines.join(lineBreak) + lineBreak;
}

/** Hands CSV text to the browser as a file to save. A byte order mark makes Excel read it as UTF-8. */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // The click starts the download asynchronously in some browsers; let it begin before releasing.
  setTimeout(() => {
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  }, 1000);
}
