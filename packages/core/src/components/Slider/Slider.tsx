import { forwardRef } from 'react';
import { SliderBase, type SliderCommonProps } from '../../internal/SliderBase/SliderBase';

export type { SliderMark } from '../../internal/SliderBase/SliderBase';

/**
 * `className`, `style` and other HTML attributes apply to the root element and `ref` points at it.
 */
export interface SliderProps extends SliderCommonProps {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  /** Called when the user finishes a drag or key press. */
  onChangeEnd?: (value: number) => void;
  /** Accessible name when there is no visible `label`. Applied to the thumb. */
  'aria-label'?: string;
}

/**
 * A single-thumb slider following the WAI-ARIA slider pattern: arrow keys step, Page keys move
 * by about 10% and Home/End jump to the ends. Pressing or dragging on the track moves the thumb.
 */
export const Slider = forwardRef<HTMLDivElement, SliderProps>(function Slider(
  { value, defaultValue, onChange, onChangeEnd, min = 0, 'aria-label': ariaLabel, ...rest },
  ref,
) {
  return (
    <SliderBase
      {...rest}
      ref={ref}
      min={min}
      range={false}
      value={value === undefined ? undefined : [value]}
      defaultValue={[defaultValue ?? min]}
      onValueChange={onChange ? ([next]) => onChange(next!) : undefined}
      onValueCommit={onChangeEnd ? ([next]) => onChangeEnd(next!) : undefined}
      thumbLabels={[ariaLabel]}
    />
  );
});
