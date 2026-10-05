import { createContext } from 'react';
import type { Theme } from '../theme';

/** `system` follows the OS `prefers-color-scheme` setting. */
export type ThemeMode = 'light' | 'dark' | 'system';

export const themeModes: readonly ThemeMode[] = ['light', 'dark', 'system'];

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (themeModes as readonly string[]).includes(value);
}

export interface ThemeContextValue {
  /** The active theme tokens. */
  tokens: Theme;
  /** The selected mode, which may be `system`. */
  mode: ThemeMode;
  /** The mode actually displayed: `system` resolved to `light` or `dark`. */
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
