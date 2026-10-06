import { forwardRef, useCallback, useId, useMemo, type ReactNode } from 'react';
import type { AxonColor, AxonSize } from '../../types';
import { useControllableState } from '../../hooks/useControllableState';
import { OptionGroup, type OptionGroupProps } from '../../internal/OptionGroup/OptionGroup';
import { Checkbox } from '../Checkbox';
import { CheckboxGroupContext } from './CheckboxGroupContext';

export interface CheckboxOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export interface CheckboxGroupProps extends Omit<
  OptionGroupProps,
  'block' | 'color' | 'onChange' | 'role'
> {
  /** Renders one Checkbox per option. Alternatively pass `<Checkbox value=...>` children. */
  options?: CheckboxOption[];
  /** Values of the checked boxes. */
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  /** Shared `name` for form submission. */
  name?: string;
  size?: AxonSize;
  color?: AxonColor;
}

const EMPTY: string[] = [];

export const CheckboxGroup = forwardRef<HTMLFieldSetElement, CheckboxGroupProps>(
  function CheckboxGroup(
    {
      options,
      value: valueProp,
      defaultValue = EMPTY,
      onChange,
      name,
      size,
      color,
      disabled,
      error,
      children,
      ...groupProps
    },
    ref,
  ) {
    const generatedName = useId();
    const [value, setValue] = useControllableState<string[]>({
      value: valueProp,
      defaultValue,
      onChange,
    });

    const toggle = useCallback(
      (item: string, checked: boolean) => {
        setValue((current) =>
          checked
            ? current.includes(item)
              ? current
              : [...current, item]
            : current.filter((v) => v !== item),
        );
      },
      [setValue],
    );

    const context = useMemo(
      () => ({ value, toggle, name: name ?? generatedName, size, color, disabled, error }),
      [value, toggle, name, generatedName, size, color, disabled, error],
    );

    return (
      <CheckboxGroupContext.Provider value={context}>
        <OptionGroup
          {...groupProps}
          ref={ref}
          block="axon-checkbox-group"
          disabled={disabled}
          error={error}
        >
          {options
            ? options.map((option) => (
                <Checkbox
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  description={option.description}
                  disabled={option.disabled}
                />
              ))
            : children}
        </OptionGroup>
      </CheckboxGroupContext.Provider>
    );
  },
);
