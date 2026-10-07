import type { PaletteName, Shade } from './colors';

/**
 * Mode-aware tokens for each palette color, emitted as `--axon-color-<name>-<token>`
 * (for example `--axon-color-primary-solid`). Components use these instead of picking shades,
 * so a `color="danger"` control stays readable in both light and dark mode.
 */
export interface AccentColors {
  /** Fill for solid controls; `onSolid` text on it meets 4.5:1 contrast. */
  solid: string;
  solidHover: string;
  solidActive: string;
  /** Text and icons placed on a solid fill. */
  onSolid: string;
  /** Colored text and outlines on the page surface; meets 4.5:1 contrast. */
  text: string;
  textHover: string;
  /** Tinted background (chips, alerts, ghost-button hover). */
  subtle: string;
  subtleHover: string;
  subtleActive: string;
  /** Border for tinted surfaces. */
  border: string;
}

export type AccentMode = Record<PaletteName, AccentColors>;

const ref = (name: PaletteName, shade: Shade) => `var(--axon-color-${name}-${shade})`;
const WHITE = 'var(--axon-color-white)';

interface Shades {
  solid: [Shade, Shade, Shade];
  onSolid: string;
}

/** Solid fill shades (base, hover, active) chosen so white (or dark) text passes 4.5:1. */
const solidShades: Record<PaletteName, Shades> = {
  primary: { solid: [600, 700, 800], onSolid: WHITE },
  secondary: { solid: [600, 700, 800], onSolid: WHITE },
  success: { solid: [700, 800, 900], onSolid: WHITE },
  // Dark text on amber: hover/active go lighter so contrast never drops.
  warning: { solid: [500, 400, 300], onSolid: ref('neutral', 950) },
  danger: { solid: [600, 700, 800], onSolid: WHITE },
  info: { solid: [700, 800, 900], onSolid: WHITE },
  neutral: { solid: [700, 800, 900], onSolid: WHITE },
};

/** Light-mode text shade: dark enough for 4.5:1 on the page and on every subtle fill state. */
const lightText: Record<PaletteName, Shade> = {
  primary: 700,
  secondary: 700,
  success: 800,
  warning: 800,
  danger: 800,
  info: 800,
  neutral: 700,
};
const hoverText = (shade: Shade): Shade => (shade === 700 ? 800 : 900);

function buildAccent(name: PaletteName, mode: 'light' | 'dark'): AccentColors {
  const solidSet = solidShades[name];
  const invertNeutral = mode === 'dark' && name === 'neutral';
  const [solid, hover, active] = invertNeutral ? ([200, 300, 400] as const) : solidSet.solid;
  const light = mode === 'light';
  return {
    solid: ref(name, solid),
    solidHover: ref(name, hover),
    solidActive: ref(name, active),
    onSolid: invertNeutral ? ref('neutral', 900) : solidSet.onSolid,
    text: ref(name, light ? lightText[name] : 300),
    textHover: ref(name, light ? hoverText(lightText[name]) : 200),
    subtle: ref(name, light ? 50 : name === 'neutral' ? 800 : 950),
    subtleHover: ref(name, light ? 100 : name === 'neutral' ? 700 : 900),
    subtleActive: ref(name, light ? 200 : name === 'neutral' ? 600 : 800),
    border: ref(name, light ? 300 : name === 'neutral' ? 700 : 800),
  };
}

const names: PaletteName[] = [
  'primary',
  'secondary',
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
];

const build = (mode: 'light' | 'dark') =>
  Object.fromEntries(names.map((name) => [name, buildAccent(name, mode)])) as AccentMode;

export const lightAccent: AccentMode = /* @__PURE__ */ build('light');
export const darkAccent: AccentMode = /* @__PURE__ */ build('dark');
