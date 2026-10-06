import { createContext } from 'react';
import type { AxonColor, AxonSize } from '../../types';

/** Shared state a CheckboxGroup hands to the Checkbox components inside it. */
export interface CheckboxGroupContextValue {
  value: string[];
  toggle: (value: string, checked: boolean) => void;
  name?: string;
  size?: AxonSize;
  color?: AxonColor;
  disabled?: boolean;
  error?: boolean;
}

export const CheckboxGroupContext = createContext<CheckboxGroupContextValue | null>(null);
