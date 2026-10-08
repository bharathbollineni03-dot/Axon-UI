import { useRef, useState, type ReactNode } from 'react';
import { useIsomorphicLayoutEffect } from '../../internal/useIsomorphicLayoutEffect';

export interface TooltipProps {
  /** The point it points at, in pixels from the top left of the chart. */
  x: number;
  y: number;
  /** The size of the chart, so the tooltip can stay inside it by moving to the other side of the point. */
  containerWidth: number;
  containerHeight: number;
  /** The gap between the point and the tooltip. Defaults to 12. */
  offset?: number;
  id?: string;
  children: ReactNode;
}

/**
 * A box that sits next to a point and follows it. It is for sighted users: it is hidden from
 * screen readers, because a chart announces the point it is on in a live region instead.
 */
export function Tooltip({
  x,
  y,
  containerWidth,
  containerHeight,
  offset = 12,
  id,
  children,
}: TooltipProps) {
  const element = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useIsomorphicLayoutEffect(() => {
    const node = element.current;
    if (!node) return;
    const next = { width: node.offsetWidth, height: node.offsetHeight };
    setSize((current) =>
      current.width === next.width && current.height === next.height ? current : next,
    );
  });

  const left = x + offset + size.width > containerWidth ? x - offset - size.width : x + offset;
  const top = y + offset + size.height > containerHeight ? y - offset - size.height : y + offset;

  return (
    <div
      ref={element}
      id={id}
      className="axon-chart-tooltip"
      aria-hidden="true"
      style={{ transform: `translate(${Math.max(0, left)}px, ${Math.max(0, top)}px)` }}
    >
      {children}
    </div>
  );
}

export interface TooltipRow {
  key: string;
  /** The series' color, shown as a swatch. */
  color?: string;
  name: string;
  /** The value, already formatted. */
  value: string;
}

export interface TooltipContentProps {
  /** A heading, such as the x value. */
  title?: ReactNode;
  rows: readonly TooltipRow[];
}

/** The usual inside of a tooltip: a heading and a row for each series. */
export function TooltipContent({ title, rows }: TooltipContentProps) {
  return (
    <>
      {title ? <div className="axon-chart-tooltip__title">{title}</div> : null}
      <ul className="axon-chart-tooltip__rows">
        {rows.map((row) => (
          <li key={row.key} className="axon-chart-tooltip__row">
            {row.color ? (
              <span
                className="axon-chart-tooltip__swatch"
                style={{ background: row.color }}
                aria-hidden="true"
              />
            ) : null}
            <span className="axon-chart-tooltip__name">{row.name}</span>
            <span className="axon-chart-tooltip__value">{row.value}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
