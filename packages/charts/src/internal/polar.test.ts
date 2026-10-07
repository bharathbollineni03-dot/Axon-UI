import { describe, expect, it } from 'vitest';
import {
  angleOf,
  arcPath,
  layoutPie,
  leaderLine,
  polarToCartesian,
  spreadLabels,
  TAU,
  toRadians,
} from './polar';

const close = (point: { x: number; y: number }, x: number, y: number) => {
  expect(point.x).toBeCloseTo(x, 6);
  expect(point.y).toBeCloseTo(y, 6);
};

describe('polarToCartesian', () => {
  it("measures angles clockwise from 12 o'clock", () => {
    close(polarToCartesian(0, 0, 10, 0), 0, -10);
    close(polarToCartesian(0, 0, 10, Math.PI / 2), 10, 0);
    close(polarToCartesian(0, 0, 10, Math.PI), 0, 10);
    close(polarToCartesian(0, 0, 10, (3 * Math.PI) / 2), -10, 0);
  });

  it('is relative to a centre', () => {
    close(polarToCartesian(50, 60, 10, Math.PI / 2), 60, 60);
  });

  it('puts a radius of 0 on the centre', () => {
    close(polarToCartesian(5, 5, 0, 1.234), 5, 5);
  });
});

describe('angleOf', () => {
  it('is the inverse of polarToCartesian', () => {
    for (const angle of [0, 0.5, 1.5, 3, 4.5, 6]) {
      const point = polarToCartesian(10, 20, 30, angle);
      expect(angleOf(10, 20, point.x, point.y)).toBeCloseTo(angle, 6);
    }
  });

  it('stays within a turn', () => {
    expect(angleOf(0, 0, -1, -1)).toBeGreaterThan(Math.PI);
    expect(angleOf(0, 0, -1, -1)).toBeLessThan(TAU);
  });
});

describe('toRadians', () => {
  it('converts degrees', () => {
    expect(toRadians(180)).toBeCloseTo(Math.PI, 10);
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 10);
  });
});

describe('layoutPie', () => {
  it('gives each value a slice in proportion, in order, round the whole circle', () => {
    const slices = layoutPie([1, 1, 2]);
    expect(slices.map((s) => s.share)).toEqual([0.25, 0.25, 0.5]);
    expect(slices[0]!.startAngle).toBe(0);
    expect(slices[2]!.endAngle).toBeCloseTo(TAU, 10);
    expect(slices[1]!.startAngle).toBeCloseTo(slices[0]!.endAngle, 10);
    expect(slices[0]!.endAngle - slices[0]!.startAngle).toBeCloseTo(TAU / 4, 10);
  });

  it("knows each slice's middle and its place in the list", () => {
    const [first, second] = layoutPie([3, 1]);
    expect(first!.midAngle).toBeCloseTo(first!.endAngle / 2, 10);
    expect(second!.index).toBe(1);
  });

  it('counts negative and non-finite values as 0', () => {
    const slices = layoutPie([2, -5, NaN, Infinity, 2]);
    expect(slices.map((s) => s.value)).toEqual([2, 0, 0, 0, 2]);
    expect(slices[0]!.share).toBe(0.5);
    expect(slices[1]!.endAngle - slices[1]!.startAngle).toBe(0);
  });

  it('gives every slice a share of 0 when the total is 0, and none for no values', () => {
    expect(layoutPie([0, 0]).map((s) => s.share)).toEqual([0, 0]);
    expect(layoutPie([])).toEqual([]);
  });

  it('can cover part of a circle, starting where asked', () => {
    const half = layoutPie([1, 1], { startAngle: -Math.PI / 2, endAngle: Math.PI / 2 });
    expect(half[0]!.startAngle).toBeCloseTo(-Math.PI / 2, 10);
    expect(half[1]!.endAngle).toBeCloseTo(Math.PI / 2, 10);
  });

  it('leaves a gap between slices for padding without changing their order', () => {
    const slices = layoutPie([1, 1], { padAngle: 0.1 });
    expect(slices).toHaveLength(2);
    expect(slices[1]!.startAngle).toBeGreaterThan(slices[0]!.endAngle - 1e-9);
  });
});

describe('arcPath', () => {
  it('draws a ring segment as a path', () => {
    const d = arcPath({ innerRadius: 40, outerRadius: 50, startAngle: 0, endAngle: Math.PI / 2 });
    expect(d).toMatch(/^M/);
    expect(d).toMatch(/A50,50/);
    expect(d).toMatch(/A40,40/);
  });

  it('draws a pie slice from the centre when there is no inner radius', () => {
    const d = arcPath({ innerRadius: 0, outerRadius: 50, startAngle: 0, endAngle: Math.PI });
    expect(d).toMatch(/A50,50/);
    expect(d).not.toMatch(/A0,0/);
  });
});

describe('leaderLine', () => {
  it('runs straight out from the slice, then across', () => {
    const line = leaderLine(Math.PI / 2, 100, { reach: 10, run: 15 });
    close(line.start, 100, 0);
    close(line.elbow, 110, 0);
    close(line.end, 125, 0);
    expect(line.side).toBe('right');
  });

  it('goes left for slices on the left', () => {
    const line = leaderLine((3 * Math.PI) / 2, 100, { reach: 10, run: 15 });
    close(line.end, -125, 0);
    expect(line.side).toBe('left');
  });

  it('is relative to the centre', () => {
    const line = leaderLine(0, 50, { cx: 200, cy: 100, reach: 10, run: 5 });
    close(line.start, 200, 50);
    close(line.elbow, 200, 40);
    expect(line.side).toBe('right');
  });
});

describe('spreadLabels', () => {
  it('leaves labels that are far enough apart where they are', () => {
    expect(spreadLabels([10, 50, 90], 20, 0, 100)).toEqual([10, 50, 90]);
  });

  it('pushes close labels apart, keeping their order', () => {
    const result = spreadLabels([50, 52, 54], 20, 0, 200);
    expect(result[1]! - result[0]!).toBeGreaterThanOrEqual(20);
    expect(result[2]! - result[1]!).toBeGreaterThanOrEqual(20);
    expect(result[0]!).toBeLessThanOrEqual(result[1]!);
  });

  it('returns positions in the order they were given', () => {
    const result = spreadLabels([90, 10, 12], 20, 0, 200);
    expect(result[0]).toBe(90);
    expect(result[2]! - result[1]!).toBeGreaterThanOrEqual(20);
    expect(result[1]!).toBeLessThan(result[2]!);
  });

  it('keeps labels inside the limits, even when they were outside', () => {
    const result = spreadLabels([-30, 500], 20, 0, 100);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(100);
  });

  it('squeezes back from the end when a pile reaches it', () => {
    const result = spreadLabels([95, 96, 97], 20, 0, 100);
    expect(result[2]).toBe(100);
    expect(result[1]).toBe(80);
    expect(result[0]).toBe(60);
  });

  it('copes with nothing', () => {
    expect(spreadLabels([], 20, 0, 100)).toEqual([]);
  });
});
