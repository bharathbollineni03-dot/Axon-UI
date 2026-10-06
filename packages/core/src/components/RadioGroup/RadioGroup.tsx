import { forwardRef, useCallback, useId, useMemo, type ReactNode } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { useControllableState } from '../../hooks/useControllableState';
import { OptionGroup, type OptionGroupProps } from '../../internal/OptionGroup/OptionGroup';
import { Radio } from '../Radio';
import { RadioGroupContext } from './RadioGroupContext';

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps extends Omit<
  OptionGroupProps,
  'block' | 'color' | 'onChange' | 'role'
> {
  /** Renders one Radio per option. Alternatively pass `<Radio value=...>` children. */
  options?: RadioOption[];
  /** The selected value; `null` means nothing is selected (controlled). */
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  /** Shared `name`. Generated when omitted. */
  name?: string;
  size?: AxonSize;
  color?: AxonColor;
}

/**
 * A `radiogroup`. Arrow keys move and select, and only the selected radio (or the first one,
 * when none is selected) is in the tab order: the native behavior of radios sharing a `name`.
 */
export const RadioGroup = forwardRef<HTMLFieldSetElement, RadioGroupProps>(function RadioGroup(
  {
    options,
    value: valueProp,
    defaultValue = null,
    onChange,
    name,
    size,
    color,
    disabled,
    error,
    required,
    children,
    ...groupProps
  },
  ref,
) {
  const generatedName = useId();
  const [value, setValue] = useControllableState<string | null>({
    value: valueProp,
    defaultValue,
    onChange: (next) => {
      if (next !== null) onChange?.(next);
    },
  });

  const select = useCallback((next: string) => setValue(next), [setValue]);

  const context = useMemo(
    () => ({
      value,
      select,
      name: name ?? generatedName,
      size,
      color,
      disabled,
      error,
      required,
    }),
    [value, select, name, generatedName, size, color, disabled, error, required],
  );

  return (
    <RadioGroupContext.Provider value={context}>
      <OptionGroup
        {...groupProps}
        ref={ref}
        role="radiogroup"
        block="axon-radio-group"
        disabled={disabled}
        error={error}
        required={required}
      >
        {options
          ? options.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                disabled={option.disabled}
              />
            ))
          : children}
      </OptionGroup>
    </RadioGroupContext.Provider>
  );
});
