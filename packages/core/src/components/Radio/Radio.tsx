import {
  forwardRef,
  useContext,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';
import { ChoiceText, useChoiceIds } from '../../internal/Choice/Choice';
import { RadioGroupContext } from '../RadioGroup/RadioGroupContext';

/**
 * `className` and `style` apply to the root `<label>` and `ref` points at the `<input>`;
 * every other prop goes to the `<input>`. Radios sharing a `name` (or a RadioGroup) get native
 * arrow-key navigation and a single tab stop.
 */
export interface RadioProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'color' | 'type' | 'prefix' | 'value'
> {
  /** The value this radio represents. Required. */
  value: string;
  label?: ReactNode;
  description?: ReactNode;
  size?: AxonSize;
  color?: AxonColor;
  error?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  {
    label,
    description,
    size: sizeProp,
    color: colorProp,
    error: errorProp,
    disabled: disabledProp,
    required: requiredProp,
    name: nameProp,
    value,
    checked: checkedProp,
    onChange: onChangeProp,
    id: idProp,
    className,
    style,
    'aria-describedby': ariaDescribedBy,
    'aria-labelledby': ariaLabelledBy,
    ...inputProps
  },
  ref,
) {
  const group = useContext(RadioGroupContext);
  const { id, labelId, descriptionId } = useChoiceIds(idProp);

  const size = sizeProp ?? group?.size ?? 'md';
  const color = colorProp ?? group?.color ?? 'primary';
  const disabled = disabledProp ?? group?.disabled ?? false;
  const error = errorProp ?? group?.error ?? false;
  const checked = group ? group.value === value : checkedProp;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (group && event.target.checked) group.select(value);
    onChangeProp?.(event);
  };

  return (
    <label
      className={cx(
        'axon-choice',
        'axon-radio',
        `axon-radio--${size}`,
        `axon-radio--${color}`,
        error && 'axon-radio--error axon-choice--error',
        disabled && 'axon-choice--disabled',
        className,
      )}
      style={style}
    >
      <input
        {...inputProps}
        ref={ref}
        id={id}
        type="radio"
        name={nameProp ?? group?.name}
        value={value}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        required={requiredProp ?? group?.required}
        aria-labelledby={ariaLabelledBy ?? (label ? labelId : undefined)}
        aria-describedby={joinIds(ariaDescribedBy, Boolean(description) && descriptionId)}
        className="axon-choice__input axon-radio__input"
      />
      <span className="axon-choice__control axon-radio__circle" aria-hidden="true" />
      <ChoiceText
        block="axon-radio"
        label={label}
        description={description}
        labelId={labelId}
        descriptionId={descriptionId}
      />
    </label>
  );
});
