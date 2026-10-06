import type { PaletteName, Shade } from './colors';

/**
 * Mode-dependent colors. Values reference palette variables so overriding a palette flows
 * through to every semantic token.
 */
export interface SemanticColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  /** Tinted fill for filled inputs, hovered rows and similar quiet backgrounds. */
  surfaceMuted: string;
  /** Decorative dividers and card outlines. */
  border: string;
  /** Boundaries of interactive controls; meets 3:1 contrast against the surface. */
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  /** Placeholder text; meets 4.5:1 contrast against the surface. */
  textPlaceholder: string;
  focusRing: string;
  overlay: string;
}

export const semanticKeys: readonly (keyof SemanticColors)[] = [
  'background',
  'surface',
  'surfaceRaised',
  'surfaceMuted',
  'border',
  'borderStrong',
  'textPrimary',
  'textSecondary',
  'textDisabled',
  'textPlaceholder',
  'focusRing',
  'overlay',
];

const palette = (name: PaletteName, shade: Shade) => `var(--axon-color-${name}-${shade})`;

export const lightSemantic: SemanticColors = {
  background: palette('neutral', 50),
  surface: 'var(--axon-color-white)',
  surfaceRaised: 'var(--axon-color-white)',
  surfaceMuted: palette('neutral', 100),
  border: palette('neutral', 200),
  borderStrong: palette('neutral', 500),
  textPrimary: palette('neutral', 900),
  textSecondary: palette('neutral', 600),
  textDisabled: palette('neutral', 400),
  textPlaceholder: palette('neutral', 600),
  focusRing: palette('primary', 500),
  overlay: 'rgb(15 23 42 / 0.5)',
};

export const darkSemantic: SemanticColors = {
  background: palette('neutral', 950),
  surface: palette('neutral', 900),
  surfaceRaised: palette('neutral', 800),
  surfaceMuted: palette('neutral', 800),
  border: palette('neutral', 700),
  borderStrong: palette('neutral', 500),
  textPrimary: palette('neutral', 50),
  textSecondary: palette('neutral', 400),
  textDisabled: palette('neutral', 600),
  textPlaceholder: palette('neutral', 400),
  focusRing: palette('primary', 400),
  overlay: 'rgb(0 0 0 / 0.65)',
};
