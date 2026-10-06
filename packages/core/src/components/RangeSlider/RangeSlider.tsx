import { forwardRef } from 'react';
import { SliderBase, type SliderCommonProps } from '../../internal/SliderBase/SliderBase';

/**
 * `className`, `style` and other HTML attributes apply to the root element and `ref` points at it.
 */
export interface RangeSliderProps extends SliderCommonProps {
  /** `[low, high]`. The thumbs cannot cross each other. */
  value?: [number, number];
  defaultValue?: [number, number];
  onChange?: (value: [number, number]) => void;
  /** Called when the user finishes a drag or key press. */
  onChangeEnd?: (value: [number, number]) => void;
  /** Accessible names of the two thumbs. Defaults to "Minimum" and "Maximum". */
  thumbLabels?: [string, string];
}

/** A two-thumb slider selecting a range. Each thumb follows the WAI-ARIA slider pattern. */
export const RangeSlider = forwardRef<HTMLDivElement, RangeSliderProps>(function RangeSlider(
  {
    value,
    defaultValue,
    onChange,
    onChangeEnd,
    min = 0,
    max = 100,
    thumbLabels = ['Minimum', 'Maximum'],
    ...rest
  },
  ref,
) {
  return (
    <SliderBase
      {...rest}
      ref={ref}
      min={min}
      max={max}
      range
      value={value}
      defaultValue={defaultValue ?? [min, max]}
      onValueChange={onChange ? (next) => onChange(next as [number, number]) : undefined}
      onValueCommit={onChangeEnd ? (next) => onChangeEnd(next as [number, number]) : undefined}
      thumbLabels={thumbLabels}
    />
  );
});
