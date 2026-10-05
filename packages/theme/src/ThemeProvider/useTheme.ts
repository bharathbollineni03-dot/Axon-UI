import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from './ThemeContext';

/** Returns the active theme tokens, color mode and `setMode`. Must be used inside `ThemeProvider`. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within an Axon <ThemeProvider>.');
  }
  return context;
}
