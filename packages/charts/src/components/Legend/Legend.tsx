import { type CSSProperties } from 'react';

export interface LegendItem {
  key: string;
  name: string;
  color: string;
  /** The series is switched off. */
  hidden?: boolean;
}

export interface LegendProps {
  items: readonly LegendItem[];
  /**
   * Called with the key of an item that is pressed. With it, each item is a toggle button
   * (`aria-pressed`); without it the legend is a plain list.
   */
  onToggle?: (key: string) => void;
  /** Called with the key of the item the pointer or focus is on, and `null` when it leaves. */
  onHighlight?: (key: string | null) => void;
  /** The name of the list. Defaults to "Legend". */
  label?: string;
  /** How items line up: `start` (default), `center` or `end`. */
  align?: 'start' | 'center' | 'end';
  className?: string;
  style?: CSSProperties;
}

const justify = { start: 'flex-start', center: 'center', end: 'flex-end' } as const;

/**
 * A key to the series of a chart. Give it `onToggle` and each entry becomes a button that
 * switches its series on and off, pressed while the series is showing.
 */
export function Legend({
  items,
  onToggle,
  onHighlight,
  label = 'Legend',
  align = 'start',
  className,
  style,
}: LegendProps) {
  return (
    <ul
      aria-label={label}
      className={['axon-chart-legend', className].filter(Boolean).join(' ')}
      style={{ justifyContent: justify[align], ...style }}
    >
      {items.map((item) => {
        const content = (
          <>
            <span
              className="axon-chart-legend__swatch"
              style={{ background: item.color }}
              aria-hidden="true"
            />
            <span className="axon-chart-legend__name">{item.name}</span>
          </>
        );
        return (
          <li
            key={item.key}
            className="axon-chart-legend__item"
            data-hidden={item.hidden || undefined}
          >
            {onToggle ? (
              <button
                type="button"
                className="axon-chart-legend__button"
                aria-pressed={!item.hidden}
                onClick={() => onToggle(item.key)}
                onPointerEnter={() => onHighlight?.(item.key)}
                onPointerLeave={() => onHighlight?.(null)}
                onFocus={() => onHighlight?.(item.key)}
                onBlur={() => onHighlight?.(null)}
              >
                {content}
              </button>
            ) : (
              <span className="axon-chart-legend__button">{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
