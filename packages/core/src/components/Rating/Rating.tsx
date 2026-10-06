import {
  forwardRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { useControllableState } from '../../hooks/useControllableState';

/**
 * `className`, `style` and other HTML attributes apply to the root element and `ref` points at it.
 */
export interface RatingProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'color' | 'children'
> {
  /** The rating, from 0 (none) to `max`. */
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Number of icons. Defaults to 5. */
  max?: number;
  /** `0.5` allows half ratings. Defaults to `1`. */
  precision?: 0.5 | 1;
  /** Displays the rating without interaction (an image with a text alternative). */
  readOnly?: boolean;
  disabled?: boolean;
  /** Clicking the current rating again clears it. Defaults to `true`. */
  allowClear?: boolean;
  size?: AxonSize;
  color?: AxonColor;
  /** Replaces the filled icon. */
  icon?: ReactNode;
  /** Replaces the empty icon. */
  emptyIcon?: ReactNode;
  /** Submitted with forms through a hidden input. */
  name?: string;
  /** Text alternative for a value, e.g. for translation. */
  getValueText?: (value: number, max: number) => string;
}

const StarIcon = () => (
  <svg viewBox="0 0 24 24" className="axon-rating__star" aria-hidden="true" focusable="false">
    <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z" />
  </svg>
);

const defaultValueText = (value: number, max: number) =>
  value === 0 ? 'No rating' : `${value} out of ${max} stars`;

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

export const Rating = forwardRef<HTMLDivElement, RatingProps>(function Rating(
  {
    value: valueProp,
    defaultValue = 0,
    onChange,
    max = 5,
    precision = 1,
    readOnly = false,
    disabled = false,
    allowClear = true,
    size = 'md',
    color = 'warning',
    icon,
    emptyIcon,
    name,
    getValueText = defaultValueText,
    className,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const [value, setValue] = useControllableState<number>({
    value: valueProp,
    defaultValue,
    onChange,
  });
  const [hover, setHover] = useState<number | null>(null);

  const interactive = !readOnly && !disabled;
  const shown = interactive && hover !== null ? hover : value;
  const text = getValueText(value, max);

  const valueAt = (event: PointerEvent<HTMLElement> | MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return null;
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    return clamp(Math.ceil((ratio * max) / precision) * precision, precision, max);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const next = valueAt(event);
    if (next !== null) setHover(next);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const next = valueAt(event);
    if (next === null) return;
    setValue(allowClear && next === value ? 0 : next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = value + precision;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        next = value - precision;
        break;
      case 'Home':
        next = allowClear ? 0 : precision;
        break;
      case 'End':
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    setValue(clamp(next, allowClear ? 0 : precision, max));
  };

  const semantics = readOnly
    ? { role: 'img', 'aria-label': ariaLabel ? `${ariaLabel}: ${text}` : text }
    : {
        role: 'slider',
        tabIndex: disabled ? -1 : 0,
        'aria-label': ariaLabel ?? 'Rating',
        'aria-valuemin': 0,
        'aria-valuemax': max,
        'aria-valuenow': value,
        'aria-valuetext': text,
        'aria-disabled': disabled || undefined,
      };

  return (
    // The root is a slider (interactive) or an image (read-only); handlers apply only to the slider.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      {...rest}
      {...semantics}
      ref={ref}
      className={cx(
        'axon-rating',
        `axon-rating--${size}`,
        `axon-rating--${color}`,
        readOnly && 'axon-rating--readonly',
        disabled && 'axon-rating--disabled',
        className,
      )}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHover(null)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {Array.from({ length: max }, (_, index) => {
        const fill = clamp(shown - index, 0, 1);
        return (
          <span key={index} className="axon-rating__item" aria-hidden="true">
            <span className="axon-rating__empty">{emptyIcon ?? <StarIcon />}</span>
            <span className="axon-rating__filled" style={{ width: `${fill * 100}%` }}>
              {icon ?? <StarIcon />}
            </span>
          </span>
        );
      })}
      {name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null}
    </div>
  );
});
