import { describe, expect, it } from 'vitest';
import {
  buildMatrix,
  calendarLayout,
  daysBetween,
  levelFor,
  levelOpacity,
  matrixExtremes,
  toDay,
} from './heatmapLayout';

describe('levelFor', () => {
  it('splits the domain into equal ranges, 0 for the lowest', () => {
    const level = (v: number) => levelFor(v, [0, 100], 5);
    expect(level(0)).toBe(0);
    expect(level(19.9)).toBe(0);
    expect(level(20)).toBe(1);
    expect(level(50)).toBe(2);
    expect(level(99.9)).toBe(4);
  });

  it('puts the top of the domain in the highest level', () => {
    expect(levelFor(100, [0, 100], 5)).toBe(4);
  });

  it('holds values outside the domain to its ends', () => {
    expect(levelFor(-50, [0, 100], 5)).toBe(0);
    expect(levelFor(500, [0, 100], 5)).toBe(4);
  });

  it('is -1 for no value', () => {
    expect(levelFor(null, [0, 100], 5)).toBe(-1);
    expect(levelFor(undefined, [0, 100], 5)).toBe(-1);
    expect(levelFor(NaN, [0, 100], 5)).toBe(-1);
  });

  it('copes with a domain of one value, and with one level', () => {
    expect(levelFor(5, [5, 5], 5)).toBe(0);
    expect(levelFor(6, [5, 5], 5)).toBe(4);
    expect(levelFor(50, [0, 100], 1)).toBe(0);
  });
});

describe('levelOpacity', () => {
  it('is faint for the lowest level, solid for the highest, and rises in between', () => {
    expect(levelOpacity(0, 5)).toBeGreaterThan(0);
    expect(levelOpacity(0, 5)).toBeLessThan(0.3);
    expect(levelOpacity(4, 5)).toBe(1);
    expect(levelOpacity(2, 5)).toBeGreaterThan(levelOpacity(1, 5));
  });

  it('is 0 for no value, and solid for a single level', () => {
    expect(levelOpacity(-1, 5)).toBe(0);
    expect(levelOpacity(0, 1)).toBe(1);
  });
});

describe('buildMatrix', () => {
  const keys = { xKey: 'hour', yKey: 'day', valueKey: 'n' };
  const rows = [
    { day: 'Mon', hour: '9am', n: 3 },
    { day: 'Mon', hour: '11am', n: 5 },
    { day: 'Tue', hour: '9am', n: 1 },
  ];

  it('lays rows out in a grid, in the order the categories first appear', () => {
    const matrix = buildMatrix(rows, keys);
    expect(matrix.xs).toEqual(['9am', '11am']);
    expect(matrix.ys).toEqual(['Mon', 'Tue']);
    expect(matrix.cells[0]!.map((c) => c.value)).toEqual([3, 5]);
    expect(matrix.cells[1]!.map((c) => c.value)).toEqual([1, null]);
  });

  it('gives each cell its place and categories', () => {
    const cell = buildMatrix(rows, keys).cells[1]![0]!;
    expect(cell).toMatchObject({ row: 1, col: 0, x: '9am', y: 'Tue', value: 1 });
    expect(cell.datum).toBe(rows[2]);
  });

  it('can be given an order, which also adds categories that have no rows', () => {
    const matrix = buildMatrix(rows, {
      ...keys,
      yOrder: ['Mon', 'Tue', 'Wed'],
      xOrder: ['11am', '9am'],
    });
    expect(matrix.xs).toEqual(['11am', '9am']);
    expect(matrix.ys).toEqual(['Mon', 'Tue', 'Wed']);
    expect(matrix.cells[2]!.every((cell) => cell.value === null)).toBe(true);
    expect(matrix.cells[0]!.map((c) => c.value)).toEqual([5, 3]);
  });

  it('adds up rows that share a cell', () => {
    const matrix = buildMatrix([...rows, { day: 'Mon', hour: '9am', n: 10 }], keys);
    expect(matrix.cells[0]![0]!.value).toBe(13);
  });

  it('reads numbers given as text, and leaves a cell without a number empty', () => {
    const matrix = buildMatrix(
      [
        { day: 'A', hour: 'x', n: '4' },
        { day: 'A', hour: 'y', n: 'oops' },
      ],
      keys,
    );
    expect(matrix.cells[0]!.map((c) => c.value)).toEqual([4, null]);
  });

  it('is empty for no rows', () => {
    expect(buildMatrix([], keys)).toEqual({ xs: [], ys: [], cells: [] });
  });
});

describe('matrixExtremes', () => {
  it('finds the lowest and highest cell', () => {
    const matrix = buildMatrix(
      [
        { y: 'a', x: 'p', v: 5 },
        { y: 'a', x: 'q', v: 9 },
        { y: 'b', x: 'p', v: 2 },
      ],
      { xKey: 'x', yKey: 'y', valueKey: 'v' },
    );
    const extremes = matrixExtremes(matrix)!;
    expect(extremes.low).toMatchObject({ y: 'b', x: 'p', value: 2 });
    expect(extremes.high).toMatchObject({ y: 'a', x: 'q', value: 9 });
  });

  it('is null with no values', () => {
    expect(matrixExtremes(buildMatrix([], { xKey: 'x', yKey: 'y', valueKey: 'v' }))).toBeNull();
  });
});

describe('toDay', () => {
  it('reads dates, date text and times, at midnight', () => {
    const day = toDay(new Date(2024, 2, 15, 17, 30))!;
    expect([day.getFullYear(), day.getMonth(), day.getDate(), day.getHours()]).toEqual([
      2024, 2, 15, 0,
    ]);
    expect(toDay('2024-03-15T10:00:00')!.getDate()).toBe(15);
    // Date-only text is that day here, whatever the time zone.
    const plain = toDay('2024-03-15')!;
    expect([plain.getFullYear(), plain.getMonth(), plain.getDate()]).toEqual([2024, 2, 15]);
    expect(toDay(new Date(2024, 2, 15).getTime())!.getDate()).toBe(15);
  });

  it('is null for what is not a date', () => {
    expect(toDay('not a date')).toBeNull();
    expect(toDay(null)).toBeNull();
    expect(toDay({})).toBeNull();
    expect(toDay(new Date(NaN))).toBeNull();
  });
});

describe('daysBetween', () => {
  it('counts calendar days, even across a clock change', () => {
    expect(daysBetween(new Date(2024, 0, 1), new Date(2024, 0, 11))).toBe(10);
    expect(daysBetween(new Date(2024, 2, 9), new Date(2024, 2, 11))).toBe(2);
    expect(daysBetween(new Date(2024, 9, 30), new Date(2024, 10, 3))).toBe(4);
  });
});

describe('calendarLayout', () => {
  const key = { dateKey: 'date', valueKey: 'n' };
  // 2024-01-01 is a Monday.
  const days = (...entries: [number, number | null][]) =>
    entries.map(([day, n]) => ({ date: new Date(2024, 0, day), n }));

  it('has a cell for every day from the first to the last, filling the gaps', () => {
    const layout = calendarLayout(days([1, 5], [4, 2]), key);
    expect(layout.cells).toHaveLength(4);
    expect(layout.cells.map((c) => c.value)).toEqual([5, null, null, 2]);
    expect(layout.cells[0]!.date.getDate()).toBe(1);
  });

  /** The [column, row] of a day of January 2024. */
  const at = (layout: ReturnType<typeof calendarLayout>, day: number) => {
    const cell = layout.cells.find((c) => c.date.getDate() === day)!;
    return [cell.col, cell.row];
  };

  it('puts each week in a column and each weekday in a row, starting on Sunday', () => {
    const layout = calendarLayout(days([1, 1], [8, 1]), { ...key, weekStartsOn: 0 });
    // Monday 1 January is the second day of a week that starts on Sunday.
    expect(at(layout, 1)).toEqual([0, 1]);
    expect(at(layout, 6)).toEqual([0, 6]);
    // Sunday 7th starts the next week.
    expect(at(layout, 7)).toEqual([1, 0]);
    expect(at(layout, 8)).toEqual([1, 1]);
    expect(layout.weeks).toBe(2);
  });

  it('can start the week on Monday', () => {
    const layout = calendarLayout(days([1, 1], [8, 1]), { ...key, weekStartsOn: 1 });
    expect(at(layout, 1)).toEqual([0, 0]);
    expect(at(layout, 7)).toEqual([0, 6]);
    expect(at(layout, 8)).toEqual([1, 0]);
    expect(layout.weeks).toBe(2);
  });

  it('puts every cell in the grid, with nothing before the first day or after the last', () => {
    const layout = calendarLayout(days([3, 1], [10, 1]), { ...key, weekStartsOn: 0 });
    expect(layout.grid).toHaveLength(7);
    expect(layout.grid[0]![0]).toBeNull();
    expect(layout.grid[3]![0]!.date.getDate()).toBe(3);
    const filled = layout.grid.flat().filter(Boolean);
    expect(filled).toHaveLength(layout.cells.length);
  });

  it('adds up rows on the same day, and reads dates given as text', () => {
    const layout = calendarLayout(
      [
        { date: '2024-01-01', n: 3 },
        { date: new Date(2024, 0, 1, 15), n: 4 },
        { date: 'nope', n: 100 },
      ],
      key,
    );
    expect(layout.cells).toHaveLength(1);
    expect(layout.cells[0]!.value).toBe(7);
  });

  it('marks where each month starts, and labels the start of the range', () => {
    const rows = Array.from({ length: 70 }, (_, i) => ({ date: new Date(2024, 0, 1 + i), n: 1 }));
    const layout = calendarLayout(rows, { ...key, weekStartsOn: 0 });
    expect(layout.months.map((m) => m.date.getMonth())).toEqual([0, 1, 2]);
    expect(layout.months[0]!.col).toBe(0);
    expect(layout.months[1]!.col).toBeGreaterThan(layout.months[0]!.col);
  });

  it('does not crowd a label at the start when a month begins right after it', () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({ date: new Date(2024, 0, 29 + i), n: 1 }));
    const layout = calendarLayout(rows, { ...key, weekStartsOn: 0 });
    // The range starts on 29 Jan and February starts in column 0 or 1 of it: one label, not two on top of each other.
    const cols = layout.months.map((m) => m.col);
    expect(new Set(cols).size).toBe(cols.length);
  });

  it('is empty with no usable dates', () => {
    expect(calendarLayout([], key)).toEqual({ cells: [], weeks: 0, months: [], grid: [] });
    expect(calendarLayout([{ date: 'nope', n: 1 }], key).cells).toEqual([]);
  });
});
