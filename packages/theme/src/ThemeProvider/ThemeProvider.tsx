import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
} from 'react';
import {
  buildThemeCss,
  diffThemeVars,
  isEmptyThemeVars,
  SCOPE_ATTRIBUTE,
  THEME_ATTRIBUTE,
  themeToVars,
} from '../css';
import { defaultTheme, type Theme } from '../theme';
import { isThemeMode, ThemeContext, type ThemeContextValue, type ThemeMode } from './ThemeContext';

export interface ThemeProviderProps extends HTMLAttributes<HTMLDivElement> {
  /** Theme tokens, usually created with `createTheme`. Defaults to the Axon theme. */
  theme?: Theme;
  /** Controlled color mode. Pair with `onModeChange`. */
  mode?: ThemeMode;
  /** Initial mode when uncontrolled. Defaults to `light`. */
  defaultMode?: ThemeMode;
  onModeChange?: (mode: ThemeMode) => void;
  /** localStorage key used to persist the mode (uncontrolled only). */
  storageKey?: string;
}

const defaultVars = /* @__PURE__ */ themeToVars(defaultTheme);
const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToSystemMode(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const getSystemPrefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(DARK_QUERY).matches;

const getServerPrefersDark = () => false;

function readStoredMode(key: string): ThemeMode | undefined {
  try {
    const stored = window.localStorage.getItem(key);
    return isThemeMode(stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredMode(key: string, mode: ThemeMode) {
  try {
    window.localStorage.setItem(key, mode);
  } catch {
    // Storage can be unavailable (private mode, quota); the mode still applies in memory.
  }
}

/**
 * Applies the color mode via `data-axon-theme` and any custom tokens, and exposes them
 * through `useTheme`. Renders a wrapper `div.axon-root`; wrap your app (or a subtree) in it.
 */
export const ThemeProvider = forwardRef<HTMLDivElement, ThemeProviderProps>(function ThemeProvider(
  {
    theme = defaultTheme,
    mode: modeProp,
    defaultMode = 'light',
    onModeChange,
    storageKey,
    className,
    children,
    ...rest
  },
  ref,
) {
  const scope = useId();
  const isControlled = modeProp !== undefined;
  const [internalMode, setInternalMode] = useState<ThemeMode>(defaultMode);
  const mode = isControlled ? modeProp : internalMode;

  // Read the persisted mode after mount so server and first client render agree.
  useEffect(() => {
    if (isControlled || !storageKey) return;
    const stored = readStoredMode(storageKey);
    if (stored) setInternalMode(stored);
  }, [isControlled, storageKey]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      if (!isControlled) {
        setInternalMode(next);
        if (storageKey) writeStoredMode(storageKey, next);
      }
      onModeChange?.(next);
    },
    [isControlled, storageKey, onModeChange],
  );

  const systemPrefersDark = useSyncExternalStore(
    subscribeToSystemMode,
    getSystemPrefersDark,
    getServerPrefersDark,
  );
  const resolvedMode = mode === 'system' ? (systemPrefersDark ? 'dark' : 'light') : mode;

  // Custom tokens are emitted as scoped CSS (not inline styles) so semantic overrides can
  // differ per mode, including `system` before JavaScript has run.
  const overrideCss = useMemo(() => {
    if (theme === defaultTheme) return null;
    const diff = diffThemeVars(defaultVars, themeToVars(theme));
    if (isEmptyThemeVars(diff)) return null;
    return buildThemeCss(diff, { scope }).replace(/<\/style/gi, '<\\/style');
  }, [theme, scope]);

  const value = useMemo<ThemeContextValue>(
    () => ({ tokens: theme, mode, resolvedMode, setMode }),
    [theme, mode, resolvedMode, setMode],
  );

  const dataAttributes = {
    [THEME_ATTRIBUTE]: mode,
    [SCOPE_ATTRIBUTE]: overrideCss ? scope : undefined,
  };

  return (
    <ThemeContext.Provider value={value}>
      <div
        ref={ref}
        {...rest}
        {...dataAttributes}
        className={className ? `axon-root ${className}` : 'axon-root'}
      >
        {overrideCss ? <style dangerouslySetInnerHTML={{ __html: overrideCss }} /> : null}
        {children}
      </div>
    </ThemeContext.Provider>
  );
});
