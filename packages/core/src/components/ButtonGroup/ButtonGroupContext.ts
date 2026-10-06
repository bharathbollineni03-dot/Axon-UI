import { createContext } from 'react';
import type { AxonColor, AxonSize } from '../../types';

export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'link';

/** Defaults a ButtonGroup shares with the buttons inside it; a button's own props win. */
export interface ButtonGroupContextValue {
  size?: AxonSize;
  variant?: ButtonVariant;
  color?: AxonColor;
  disabled?: boolean;
}

export const ButtonGroupContext = createContext<ButtonGroupContextValue | null>(null);
