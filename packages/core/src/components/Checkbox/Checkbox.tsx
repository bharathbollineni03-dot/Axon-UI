import {
  forwardRef,
  useContext,
  useEffect,
  useRef,
  type ChangeEvent,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { cx } from '../../utils/cx';
import { joinIds } from '../../utils/dom';
import { useMergedRef } from '../../utils/mergeRefs';
import { ChoiceText, useChoiceIds } from '../../internal/Choice/Choice';
import { CheckboxGroupContext } from '../CheckboxGroup/CheckboxGroupContext';

/**
 * `className` and `style` apply to the root `<label>` and `ref` points at the `<input>`;
 * every other prop goes to the `<input>`.
 */
export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'color' | 'type' | 'prefix'
> {
  label?: ReactNode;
  /** Secondary text under the label; announced as the checkbox's description. */
  description?: ReactNode;
  /** Shows a "mixed" state. Driven entirely by this prop, not by clicks. */
  indeterminate?: boolean;
  size?: AxonSize;
  color?: AxonColor;
  error?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    indeterminate = false,
    size: sizeProp,
    color: colorProp,
    error: errorProp,
    disabled: disabledProp,
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
  const group = useContext(CheckboxGroupContext);
  const inGroup = group !== null && value !== undefined;
  const { id, labelId, descriptionId } = useChoiceIds(idProp);
  const inputRef = useRef<HTMLInputElement>(null);
  const mergedRef = useMergedRef(ref, inputRef);

  // `indeterminate` is a DOM property, and the browser clears it on click, so re-apply every render.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  });

  const size = sizeProp ?? group?.size ?? 'md';
  const color = colorProp ?? group?.color ?? 'primary';
  const disabled = disabledProp ?? group?.disabled ?? false;
  const error = errorProp ?? group?.error ?? false;
  const checked = inGroup ? group.value.includes(String(value)) : checkedProp;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (inGroup) group.toggle(String(value), event.target.checked);
    onChangeProp?.(event);
  };

  return (
    <label
      className={cx(
        'axon-choice',
        'axon-checkbox',
        `axon-checkbox--${size}`,
        `axon-checkbox--${color}`,
        error && 'axon-checkbox--error axon-choice--error',
        disabled && 'axon-choice--disabled',
        className,
      )}
      style={style}
    >
      <input
        {...inputProps}
        ref={mergedRef}
        id={id}
        type="checkbox"
        name={nameProp ?? group?.name}
        value={value}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        aria-invalid={error || undefined}
        aria-labelledby={ariaLabelledBy ?? (label ? labelId : undefined)}
        aria-describedby={joinIds(ariaDescribedBy, Boolean(description) && descriptionId)}
        className="axon-choice__input axon-checkbox__input"
      />
      <span className="axon-choice__control axon-checkbox__box" aria-hidden="true">
        <svg className="axon-checkbox__icon axon-checkbox__icon--check" viewBox="0 0 16 16">
          <path d="M3.5 8.5 6.5 11.5 12.5 5" />
        </svg>
        <svg className="axon-checkbox__icon axon-checkbox__icon--dash" viewBox="0 0 16 16">
          <path d="M4 8h8" />
        </svg>
      </span>
      <ChoiceText
        block="axon-checkbox"
        label={label}
        description={description}
        labelId={labelId}
        descriptionId={descriptionId}
      />
    </label>
  );
});
