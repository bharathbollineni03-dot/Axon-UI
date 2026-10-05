import type { PaletteName, Shade } from './colors';

/**
 * Mode-dependent colors. Values reference palette variables so overriding a palette flows
 * through to every semantic token.
 */
export interface SemanticColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  focusRing: string;
  overlay: string;
}

export const semanticKeys: readonly (keyof SemanticColors)[] = [
  'background',
  'surface',
  'surfaceRaised',
  'border',
  'textPrimary',
  'textSecondary',
  'textDisabled',
  'focusRing',
  'overlay',
];

const palette = (name: PaletteName, shade: Shade) => `var(--axon-color-${name}-${shade})`;

export const lightSemantic: SemanticColors = {
  background: palette('neutral', 50),
  surface: 'var(--axon-color-white)',
  surfaceRaised: 'var(--axon-color-white)',
  border: palette('neutral', 200),
  textPrimary: palette('neutral', 900),
  textSecondary: palette('neutral', 600),
  textDisabled: palette('neutral', 400),
  focusRing: palette('primary', 500),
  overlay: 'rgb(15 23 42 / 0.5)',
};

export const darkSemantic: SemanticColors = {
  background: palette('neutral', 950),
  surface: palette('neutral', 900),
  surfaceRaised: palette('neutral', 800),
  border: palette('neutral', 700),
  textPrimary: palette('neutral', 50),
  textSecondary: palette('neutral', 400),
  textDisabled: palette('neutral', 600),
  focusRing: palette('primary', 400),
  overlay: 'rgb(0 0 0 / 0.65)',
};
