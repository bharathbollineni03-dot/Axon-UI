import { forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';
import { ChoiceText, useChoiceIds } from '../../internal/Choice/Choice';

/**
 * `className` and `style` apply to the root `<label>` and `ref` points at the `<input>`
 * (a native checkbox with `role="switch"`); every other prop goes to the `<input>`.
 */
export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'color' | 'type' | 'prefix'
> {
  label?: ReactNode;
  description?: ReactNode;
  /** Which side of the switch the label sits on. Defaults to `end` (right in LTR). */
  labelPosition?: 'start' | 'end';
  size?: AxonSize;
  color?: AxonColor;
  className?: string;
  style?: CSSProperties;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    label,
    description,
    labelPosition = 'end',
    size = 'md',
    color = 'primary',
    disabled = false,
    id: idProp,
    className,
    style,
    'aria-describedby': ariaDescribedBy,
    'aria-labelledby': ariaLabelledBy,
    ...inputProps
  },
  ref,
) {
  const { id, labelId, descriptionId } = useChoiceIds(idProp);

  return (
    <label
      className={cx(
        'axon-choice',
        'axon-switch',
        `axon-switch--${size}`,
        `axon-switch--${color}`,
        labelPosition === 'start' && 'axon-switch--label-start',
        disabled && 'axon-choice--disabled',
        className,
      )}
      style={style}
    >
      <input
        {...inputProps}
        ref={ref}
        id={id}
        type="checkbox"
        role="switch"
        disabled={disabled}
        aria-labelledby={ariaLabelledBy ?? (label ? labelId : undefined)}
        aria-describedby={joinIds(ariaDescribedBy, Boolean(description) && descriptionId)}
        className="axon-choice__input axon-switch__input"
      />
      <span className="axon-switch__track" aria-hidden="true">
        <span className="axon-switch__thumb" />
      </span>
      <ChoiceText
        block="axon-switch"
        label={label}
        description={description}
        labelId={labelId}
        descriptionId={descriptionId}
      />
    </label>
  );
});
