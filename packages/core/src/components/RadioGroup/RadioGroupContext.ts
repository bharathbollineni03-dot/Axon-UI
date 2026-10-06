import { createContext } from 'react';
import type { AxonColor, AxonSize } from '../../types';

/** Shared state a RadioGroup hands to the Radio components inside it. */
export interface RadioGroupContextValue {
  /** The selected value, or `null` when nothing is selected. */
  value: string | null;
  select: (value: string) => void;
  name: string;
  size?: AxonSize;
  color?: AxonColor;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);
