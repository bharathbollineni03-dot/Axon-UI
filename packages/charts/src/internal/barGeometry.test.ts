import { describe, expect, it } from 'vitest';
import { barRect, groupSlots, roundedBarPath } from './barGeometry';

describe('groupSlots', () => {
  it('gives a single bar the whole band', () => {
    const [slot] = groupSlots(['a'], 100);
    expect(slot!.offset).toBe(0);
    expect(slot!.size).toBeCloseTo(100, 5);
  });

  it('puts bars side by side, in order, without overlap, filling the band', () => {
    const slots = groupSlots(['a', 'b', 'c'], 300, { padding: 0 });
    expect(slots.map((slot) => slot.size)).toEqual([100, 100, 100]);
    expect(slots.map((slot) => slot.offset)).toEqual([0, 100, 200]);
  });

  it('leaves a gap between bars for padding, and none at the ends', () => {
    const [first, second] = groupSlots(['a', 'b'], 100, { padding: 0.5 });
    expect(first!.offset).toBe(0);
    const gap = second!.offset - (first!.offset + first!.size);
    // Padding is a share of each bar's slot, so half the slot is gap: as wide as the bar.
    expect(gap).toBeCloseTo(first!.size, 5);
    expect(second!.offset + second!.size).toBeCloseTo(100, 5);
  });

  it('keeps every bar inside the band', () => {
    for (const count of [1, 2, 3, 7]) {
      const slots = groupSlots(
        Array.from({ length: count }, (_, i) => `k${i}`),
        120,
      );
      const last = slots[slots.length - 1]!;
      expect(last.offset + last.size).toBeLessThanOrEqual(120 + 1e-9);
      expect(slots[0]!.offset).toBeGreaterThanOrEqual(0);
    }
  });

  it('holds a bar to a maximum thickness and centres it in its slot', () => {
    const [slot] = groupSlots(['a'], 100, { padding: 0, maxSize: 40 });
    expect(slot).toEqual({ key: 'a', offset: 30, size: 40 });
  });

  it('does not stretch a bar that is already thinner than the maximum', () => {
    const [slot] = groupSlots(['a'], 20, { padding: 0, maxSize: 40 });
    expect(slot!.size).toBe(20);
  });

  it('is empty for no series', () => {
    expect(groupSlots([], 100)).toEqual([]);
  });
});

describe('barRect', () => {
  it('stands a bar up from the baseline, with a positive height', () => {
    expect(barRect({ start: 10, size: 20, from: 100, to: 40, horizontal: false })).toEqual({
      x: 10,
      y: 40,
      width: 20,
      height: 60,
    });
  });

  it('hangs a negative bar down from the baseline', () => {
    expect(barRect({ start: 10, size: 20, from: 100, to: 130, horizontal: false })).toEqual({
      x: 10,
      y: 100,
      width: 20,
      height: 30,
    });
  });

  it('lays a horizontal bar along from the baseline', () => {
    expect(barRect({ start: 5, size: 12, from: 0, to: 80, horizontal: true })).toEqual({
      x: 0,
      y: 5,
      width: 80,
      height: 12,
    });
    expect(barRect({ start: 5, size: 12, from: 50, to: 20, horizontal: true })).toEqual({
      x: 20,
      y: 5,
      width: 30,
      height: 12,
    });
  });

  it('is flat for a value at the baseline', () => {
    expect(barRect({ start: 0, size: 10, from: 50, to: 50, horizontal: false }).height).toBe(0);
  });
});

describe('roundedBarPath', () => {
  const rect = { x: 10, y: 20, width: 30, height: 50 };

  it('is a plain rectangle with no radius', () => {
    expect(roundedBarPath(rect, 0, 'top')).toBe('M10,20h30v50h-30Z');
  });

  it('rounds only the free end', () => {
    expect(roundedBarPath(rect, 6, 'top')).toBe('M10,70V26Q10,20 16,20H34Q40,20 40,26V70Z');
    expect(roundedBarPath(rect, 6, 'bottom')).toBe('M10,20V64Q10,70 16,70H34Q40,70 40,64V20Z');
    expect(roundedBarPath(rect, 6, 'right')).toBe('M10,20H34Q40,20 40,26V64Q40,70 34,70H10Z');
    expect(roundedBarPath(rect, 6, 'left')).toBe('M40,20H16Q10,20 10,26V64Q10,70 16,70H40Z');
  });

  it('holds the radius to what fits: half the thickness, and the length', () => {
    expect(roundedBarPath({ x: 0, y: 0, width: 10, height: 50 }, 99, 'top')).toContain('Q0,0 5,0');
    const short = roundedBarPath({ x: 0, y: 0, width: 40, height: 3 }, 20, 'top');
    expect(short).toContain('V3Z');
    expect(short).toMatch(/^M0,3V3Q0,0 3,0/);
  });

  it('never has a negative radius', () => {
    expect(roundedBarPath(rect, -5, 'top')).toBe('M10,20h30v50h-30Z');
  });
});
