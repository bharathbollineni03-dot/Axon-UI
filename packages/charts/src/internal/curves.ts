import {
  curveBasis,
  curveCardinal,
  curveCatmullRom,
  curveLinear,
  curveMonotoneX,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  type CurveFactory,
} from 'd3-shape';

/**
 * How a line runs between points. `linear` joins them with straight lines, `monotone` and
 * `natural` smooth them without (monotone) or with (natural) overshoot, `step` shows values
 * that hold until the next point, and `basis`, `cardinal` and `catmullRom` are other splines.
 * Smoothing can draw a line past the real values, so `monotone` is the safe choice for data.
 */
export type CurveType =
  | 'linear'
  | 'monotone'
  | 'natural'
  | 'step'
  | 'stepBefore'
  | 'stepAfter'
  | 'basis'
  | 'cardinal'
  | 'catmullRom';

const curves: Record<CurveType, CurveFactory> = {
  linear: curveLinear,
  monotone: curveMonotoneX,
  natural: curveNatural,
  step: curveStep,
  stepBefore: curveStepBefore,
  stepAfter: curveStepAfter,
  basis: curveBasis,
  cardinal: curveCardinal,
  catmullRom: curveCatmullRom,
};

export function curveFactory(type: CurveType | undefined): CurveFactory {
  return curves[type ?? 'linear'] ?? curveLinear;
}
