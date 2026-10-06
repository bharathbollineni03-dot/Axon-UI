import {
  breakpoints,
  darkAccent,
  lightAccent,
  common,
  darkSemantic,
  lightSemantic,
  motion,
  palettes,
  radius,
  shadows,
  spacing,
  typography,
  zIndex,
  type AccentMode,
  type Breakpoints,
  type CommonColors,
  type Motion,
  type Palette,
  type PaletteName,
  type Radius,
  type SemanticColors,
  type Shadows,
  type Spacing,
  type Typography,
  type ZIndex,
} from './tokens';

export interface Theme {
  palette: Record<PaletteName, Palette>;
  common: CommonColors;
  semantic: { light: SemanticColors; dark: SemanticColors };
  accent: { light: AccentMode; dark: AccentMode };
  typography: Typography;
  spacing: Spacing;
  radius: Radius;
  shadows: Shadows;
  zIndex: ZIndex;
  motion: Motion;
  breakpoints: Breakpoints;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export type ThemeOverrides = DeepPartial<Theme>;

export const defaultTheme: Theme = {
  palette: palettes,
  common,
  semantic: { light: lightSemantic, dark: darkSemantic },
  accent: { light: lightAccent, dark: darkAccent },
  typography,
  spacing,
  radius,
  shadows,
  zIndex,
  motion,
  breakpoints,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, overrides: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(overrides)) return base;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(base)) {
    const baseValue = base[key];
    const override = overrides[key];
    result[key] =
      override === undefined
        ? isPlainObject(baseValue)
          ? deepMerge(baseValue, {})
          : baseValue
        : isPlainObject(baseValue)
          ? deepMerge(baseValue, override)
          : override;
  }
  return result as T;
}

/**
 * Deep-merges `overrides` onto `base` (the default theme unless given) and returns a new theme.
 * Neither argument is mutated; unknown keys in `overrides` are ignored.
 */
export function createTheme(overrides: ThemeOverrides = {}, base: Theme = defaultTheme): Theme {
  return deepMerge(base, overrides);
}
