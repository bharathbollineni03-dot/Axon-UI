import type { Theme } from './theme';

export type CssVars = Record<string, string>;

/** Custom properties of a theme, split by whether they depend on the color mode. */
export interface ThemeVars {
  /** Mode-independent tokens (palettes, typography, spacing, ...). */
  base: CssVars;
  /** Semantic colors for the light mode. */
  light: CssVars;
  /** Semantic colors for the dark mode. */
  dark: CssVars;
}

export const THEME_ATTRIBUTE = 'data-axon-theme';
export const SCOPE_ATTRIBUTE = 'data-axon-scope';

const toKebab = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const toVarKey = (key: string) => key.replace(/\./g, '-');

function addGroup(vars: CssVars, prefix: string, group: object) {
  for (const [key, value] of Object.entries(group) as [string, string | number][]) {
    vars[`--axon-${prefix}-${toVarKey(toKebab(key))}`] = String(value);
  }
}

/** Flattens a theme into `--axon-*` custom properties. */
export function themeToVars(theme: Theme): ThemeVars {
  const base: CssVars = {};
  for (const [name, palette] of Object.entries(theme.palette)) {
    addGroup(base, `color-${name}`, palette);
  }
  addGroup(base, 'color', theme.common);
  base['--axon-font-sans'] = theme.typography.fontFamily.sans;
  base['--axon-font-mono'] = theme.typography.fontFamily.mono;
  addGroup(base, 'font-size', theme.typography.fontSize);
  addGroup(base, 'font-weight', theme.typography.fontWeight);
  addGroup(base, 'line-height', theme.typography.lineHeight);
  addGroup(base, 'letter-spacing', theme.typography.letterSpacing);
  addGroup(base, 'space', theme.spacing);
  addGroup(base, 'radius', theme.radius);
  addGroup(base, 'shadow', theme.shadows);
  addGroup(base, 'z', theme.zIndex);
  addGroup(base, 'duration', theme.motion.duration);
  addGroup(base, 'ease', theme.motion.easing);
  addGroup(base, 'breakpoint', theme.breakpoints);

  const light: CssVars = {};
  const dark: CssVars = {};
  addGroup(light, 'color', theme.semantic.light);
  addGroup(dark, 'color', theme.semantic.dark);
  for (const [name, accent] of Object.entries(theme.accent.light))
    addGroup(light, `color-${name}`, accent);
  for (const [name, accent] of Object.entries(theme.accent.dark))
    addGroup(dark, `color-${name}`, accent);
  return { base, light, dark };
}

function diffVars(base: CssVars, next: CssVars): CssVars {
  const changed: CssVars = {};
  for (const [key, value] of Object.entries(next)) {
    if (base[key] !== value) changed[key] = value;
  }
  return changed;
}

/** Returns only the custom properties in `next` that differ from `base`. */
export function diffThemeVars(base: ThemeVars, next: ThemeVars): ThemeVars {
  return {
    base: diffVars(base.base, next.base),
    light: diffVars(base.light, next.light),
    dark: diffVars(base.dark, next.dark),
  };
}

export function isEmptyThemeVars(vars: ThemeVars): boolean {
  return [vars.base, vars.light, vars.dark].every((group) => Object.keys(group).length === 0);
}

const declarations = (vars: CssVars, indent: string, extra: string[] = []) =>
  [...extra, ...Object.entries(vars).map(([name, value]) => `${name}: ${value};`)]
    .map((line) => `${indent}${line}`)
    .join('\n');

const rule = (selector: string, body: string) => (body ? `${selector} {\n${body}\n}` : '');

/** Wraps a rule in a media query; an empty rule stays empty. */
const media = (query: string, inner: string) =>
  inner ? `@media (${query}) {\n${inner.replace(/^/gm, '  ')}\n}` : '';

export interface BuildThemeCssOptions {
  /**
   * Scope id. When set, rules target `[data-axon-scope="<id>"]` elements (used for
   * `ThemeProvider` overrides) instead of the document root.
   */
  scope?: string;
}

/**
 * Renders theme variables as CSS:
 *  - mode-independent tokens on `:root`
 *  - light semantic tokens on `:root`, `[data-axon-theme="light"]` and `[data-axon-theme="system"]`
 *  - dark semantic tokens on `[data-axon-theme="dark"]`, and on `[data-axon-theme="system"]`
 *    inside `prefers-color-scheme: dark`
 *  - zeroed durations inside `prefers-reduced-motion: reduce`
 */
export function buildThemeCss(vars: ThemeVars, { scope }: BuildThemeCssOptions = {}): string {
  const s = scope ? `[${SCOPE_ATTRIBUTE}="${scope}"]` : '';
  const attr = (mode: string) => `${s}[${THEME_ATTRIBUTE}="${mode}"]`;
  const scheme = (mode: string) => (scope ? [] : [`color-scheme: ${mode};`]);
  const target = scope ? s : ':root';
  const blocks: string[] = [];

  blocks.push(rule(target, declarations(vars.base, '  ')));

  const lightSelectors = [attr('light'), attr('system')];
  if (!scope) lightSelectors.unshift(':root');
  blocks.push(rule(lightSelectors.join(',\n'), declarations(vars.light, '  ', scheme('light'))));
  blocks.push(rule(attr('dark'), declarations(vars.dark, '  ', scheme('dark'))));
  blocks.push(
    media(
      'prefers-color-scheme: dark',
      rule(attr('system'), declarations(vars.dark, '  ', scheme('dark'))),
    ),
  );

  const durations = Object.keys(vars.base).filter((name) => name.startsWith('--axon-duration-'));
  const zeroed = Object.fromEntries(durations.map((name) => [name, '0ms']));
  blocks.push(media('prefers-reduced-motion: reduce', rule(target, declarations(zeroed, '  '))));

  return blocks.filter(Boolean).join('\n\n') + '\n';
}
