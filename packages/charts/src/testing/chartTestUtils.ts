import { fireEvent, screen } from '@testing-library/react';

/** Helpers for reading what a chart drew. Test code only. */

export const tickLabels = (container: HTMLElement) =>
  [...container.querySelectorAll('.axon-chart__tick-label')].map((el) => el.textContent);

export const tooltipOf = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('.axon-chart-tooltip');

/** The polite live region a chart announces the row it is on in. */
export const liveRegion = () =>
  screen.getAllByRole('status').find((el) => el.getAttribute('aria-live') === 'polite')!;

/** The x and y of the plot's top left inside the svg, read from its translate. */
export function plotOrigin(container: HTMLElement) {
  const group = container.querySelector('svg > g')!;
  const match = /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(group.getAttribute('transform') ?? '')!;
  return { x: Number(match[1]), y: Number(match[2]) };
}

/** Moves the pointer over the plot at an x (or, for horizontal charts, a y) inside it. */
export function pointAt(container: HTMLElement, along: number, across = 40, horizontal = false) {
  const { x, y } = plotOrigin(container);
  const hit = container.querySelector('.axon-chart__hit')!;
  fireEvent.pointerMove(hit, {
    clientX: x + (horizontal ? across : along),
    clientY: y + (horizontal ? along : across),
  });
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The box of a bar drawn with no rounding: `M x,y h w v h h -w Z`. */
export function boxOf(path: Element): Box {
  const d = path.getAttribute('d')!;
  const match = /^M([-\d.e]+),([-\d.e]+)h([-\d.e]+)v([-\d.e]+)/.exec(d);
  if (!match) throw new Error(`Not a plain rectangle path: ${d}`);
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  };
}

export const bars = (container: HTMLElement) => [
  ...container.querySelectorAll('path.axon-chart__bar'),
];
