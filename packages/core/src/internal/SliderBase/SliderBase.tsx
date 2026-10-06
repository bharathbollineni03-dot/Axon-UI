import {
  forwardRef,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { useControllableState } from '../../hooks/useControllableState';

export interface SliderMark {
  value: number;
  label?: ReactNode;
}

/** Props shared by Slider and RangeSlider. */
export interface SliderCommonProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue' | 'color' | 'children'
> {
  min?: number;
  max?: number;
  step?: number;
  /** `true` shows a tick at every step; or pass specific marks, optionally labelled. */
  marks?: boolean | SliderMark[];
  /** When the value bubble above a thumb is shown. `auto` = on hover, focus and drag. */
  tooltip?: 'auto' | 'always' | 'never';
  /** Formats the value for the tooltip, `aria-valuetext` and the value readout. */
  formatValue?: (value: number) => string;
  /** Visible label above the slider; also names the control for assistive technology. */
  label?: ReactNode;
  /** Shows the current value(s) next to the label. */
  showValue?: boolean;
  /** Submitted with forms through hidden inputs. */
  name?: string;
  size?: AxonSize;
  color?: AxonColor;
  disabled?: boolean;
}

export interface SliderBaseProps extends SliderCommonProps {
  value?: number[];
  defaultValue: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  /** Accessible name of each thumb, when no visible `label` provides one. */
  thumbLabels?: (string | undefined)[];
  range: boolean;
}

const decimalPlaces = (n: number) => {
  const text = String(n);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) return Number(exponent[1]);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
};

const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));

const sameValues = (a: number[], b: number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export const SliderBase = forwardRef<HTMLDivElement, SliderBaseProps>(function SliderBase(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    onValueCommit,
    min = 0,
    max = 100,
    step = 1,
    marks,
    tooltip = 'auto',
    formatValue = String,
    label,
    showValue = false,
    name,
    size = 'md',
    color = 'primary',
    disabled = false,
    thumbLabels,
    range,
    className,
    ...rest
  },
  ref,
) {
  const labelId = `${useId()}-label`;
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeThumb, setActiveThumb] = useState<number | null>(null);

  const [values, setValues] = useControllableState<number[]>({
    value: valueProp,
    defaultValue,
    onChange: onValueChange,
  });
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const places = Math.max(decimalPlaces(step), decimalPlaces(min));
  const snap = (raw: number) =>
    clamp(Number((Math.round((raw - min) / step) * step + min).toFixed(places)), min, max);
  const percent = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);

  const lowerBound = (index: number) => (index > 0 ? values[index - 1]! : min);
  const upperBound = (index: number) => (index < values.length - 1 ? values[index + 1]! : max);

  const moveThumb = (index: number, raw: number) => {
    const current = valuesRef.current;
    const lower = index > 0 ? current[index - 1]! : min;
    const upper = index < current.length - 1 ? current[index + 1]! : max;
    const next = [...current];
    next[index] = clamp(snap(raw), lower, upper);
    if (sameValues(next, current)) return;
    valuesRef.current = next;
    setValues(next);
  };

  const commit = () => onValueCommit?.(valuesRef.current);

  const valueFromPointer = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return min + clamp((clientX - rect.left) / rect.width, 0, 1) * (max - min);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    const raw = valueFromPointer(event.clientX);
    if (raw === null) return;
    const current = valuesRef.current;
    // Pick the closest thumb; on a tie, the one that can still move toward the pointer.
    let index = 0;
    current.forEach((v, i) => {
      const distance = Math.abs(v - raw);
      const best = Math.abs(current[index]! - raw);
      if (distance < best || (distance === best && raw > v)) index = i;
    });
    event.preventDefault();
    setActiveThumb(index);
    thumbRefs.current[index]?.focus();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    moveThumb(index, raw);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activeThumb === null) return;
    const raw = valueFromPointer(event.clientX);
    if (raw !== null) moveThumb(activeThumb, raw);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (activeThumb === null) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setActiveThumb(null);
    commit();
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const current = valuesRef.current[index]!;
    const largeStep = step * Math.max(1, Math.round((max - min) / step / 10));
    let target: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        target = current + step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        target = current - step;
        break;
      case 'PageUp':
        target = current + largeStep;
        break;
      case 'PageDown':
        target = current - largeStep;
        break;
      case 'Home':
        target = lowerBound(index);
        break;
      case 'End':
        target = upperBound(index);
        break;
      default:
        return;
    }
    event.preventDefault();
    moveThumb(index, target);
    commit();
  };

  const markList: SliderMark[] =
    marks === true
      ? Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => ({
          value: Number((min + i * step).toFixed(places)),
        }))
      : marks || [];

  const fillStart = range ? percent(values[0]!) : 0;
  const fillEnd = percent(values[values.length - 1]!);

  const isActive = (value: number) =>
    range ? value >= values[0]! && value <= values[values.length - 1]! : value <= values[0]!;

  return (
    <div
      {...rest}
      ref={ref}
      role={range ? 'group' : undefined}
      aria-labelledby={range && label ? labelId : undefined}
      className={cx(
        'axon-slider',
        `axon-slider--${size}`,
        `axon-slider--${color}`,
        `axon-slider--tooltip-${tooltip}`,
        range && 'axon-slider--range',
        disabled && 'axon-slider--disabled',
        markList.length > 0 && 'axon-slider--has-marks',
        className,
      )}
    >
      {label || showValue ? (
        <div className="axon-slider__header">
          {label ? (
            <span id={labelId} className="axon-label axon-slider__label">
              {label}
            </span>
          ) : null}
          {showValue ? (
            <span className="axon-slider__value" aria-hidden="true">
              {values.map(formatValue).join(' – ')}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className="axon-slider__control"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div ref={trackRef} className="axon-slider__track">
          <div
            className="axon-slider__fill"
            style={{ left: `${fillStart}%`, width: `${fillEnd - fillStart}%` }}
          />
          {values.map((value, index) => (
            <div
              key={index}
              ref={(node) => {
                thumbRefs.current[index] = node;
              }}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-valuemin={range ? lowerBound(index) : min}
              aria-valuemax={range ? upperBound(index) : max}
              aria-valuenow={value}
              aria-valuetext={formatValue(value)}
              aria-orientation="horizontal"
              aria-disabled={disabled || undefined}
              aria-labelledby={!thumbLabels?.[index] && !range && label ? labelId : undefined}
              aria-label={thumbLabels?.[index]}
              className={cx(
                'axon-slider__thumb',
                activeThumb === index && 'axon-slider__thumb--active',
              )}
              style={{ left: `${percent(value)}%` }}
              onKeyDown={handleKeyDown(index)}
            >
              <span className="axon-slider__tooltip" aria-hidden="true">
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
        {markList.length > 0 ? (
          <div className="axon-slider__marks" aria-hidden="true">
            {markList.map((mark) => (
              <span
                key={mark.value}
                className={cx(
                  'axon-slider__mark',
                  isActive(mark.value) && 'axon-slider__mark--active',
                )}
                style={{ left: `${percent(mark.value)}%` }}
              >
                {mark.label !== undefined ? (
                  <span className="axon-slider__mark-label">{mark.label}</span>
                ) : null}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {name
        ? values.map((value, index) => (
            <input key={index} type="hidden" name={name} value={value} disabled={disabled} />
          ))
        : null}
    </div>
  );
});
