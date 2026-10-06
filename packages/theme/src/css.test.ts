import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildThemeCss, diffThemeVars, isEmptyThemeVars, themeToVars } from './css';
import { generateTokensCss } from './generate';
import { createTheme, defaultTheme } from './theme';

const vars = themeToVars(defaultTheme);

describe('themeToVars', () => {
  it('produces the documented variable names', () => {
    expect(vars.base).toMatchObject({
      '--axon-color-primary-500': defaultTheme.palette.primary[500],
      '--axon-color-white': '#ffffff',
      '--axon-space-4': '1rem',
      '--axon-space-0-5': '0.125rem',
      '--axon-radius-md': defaultTheme.radius.md,
      '--axon-font-sans': defaultTheme.typography.fontFamily.sans,
      '--axon-font-size-2xl': '1.5rem',
      '--axon-font-weight-semibold': '600',
      '--axon-line-height-normal': '1.5',
      '--axon-letter-spacing-wide': '0.025em',
      '--axon-shadow-lg': defaultTheme.shadows.lg,
      '--axon-z-modal': '1300',
      '--axon-duration-normal': '200ms',
      '--axon-ease-standard': defaultTheme.motion.easing.standard,
      '--axon-breakpoint-md': '768px',
    });
  });

  it('keeps mode-dependent semantic tokens out of the base set', () => {
    const semantic = Object.keys(vars.light).filter(
      (name) =>
        /^--axon-color-[a-z-]+$/.test(name) &&
        !/-(primary|secondary|success|warning|danger|info|neutral)-/.test(name),
    );
    expect(semantic).toEqual([
      '--axon-color-background',
      '--axon-color-surface',
      '--axon-color-surface-raised',
      '--axon-color-surface-muted',
      '--axon-color-border',
      '--axon-color-border-strong',
      '--axon-color-text-primary',
      '--axon-color-text-secondary',
      '--axon-color-text-disabled',
      '--axon-color-text-placeholder',
      '--axon-color-focus-ring',
      '--axon-color-overlay',
    ]);
    expect(Object.keys(vars.dark)).toEqual(Object.keys(vars.light));
    expect(vars.light).toMatchObject({
      '--axon-color-primary-solid': 'var(--axon-color-primary-600)',
      '--axon-color-primary-on-solid': 'var(--axon-color-white)',
      '--axon-color-danger-text-hover': 'var(--axon-color-danger-900)',
    });
    expect(vars.dark).toMatchObject({
      '--axon-color-primary-text': 'var(--axon-color-primary-300)',
    });
    expect(vars.base).not.toHaveProperty('--axon-color-background');
  });
});

describe('diffThemeVars', () => {
  it('is empty for identical themes', () => {
    expect(isEmptyThemeVars(diffThemeVars(vars, themeToVars(createTheme())))).toBe(true);
  });

  it('returns only changed variables', () => {
    const next = themeToVars(
      createTheme({
        palette: { primary: { 500: '#f00' } },
        semantic: { dark: { border: '#222' } },
      }),
    );
    expect(diffThemeVars(vars, next)).toEqual({
      base: { '--axon-color-primary-500': '#f00' },
      light: {},
      dark: { '--axon-color-border': '#222' },
    });
  });
});

describe('buildThemeCss', () => {
  const css = buildThemeCss(vars);

  it('puts light tokens on :root and light/system selectors, dark tokens on dark', () => {
    expect(css).toMatch(/:root \{\n {2}--axon-color-primary-50:/);
    expect(css).toMatch(
      /:root,\n\[data-axon-theme="light"\],\n\[data-axon-theme="system"\] \{\n {2}color-scheme: light;/,
    );
    expect(css).toMatch(/\[data-axon-theme="dark"\] \{\n {2}color-scheme: dark;/);
  });

  it('follows prefers-color-scheme for the system mode', () => {
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\) \{\n {2}\[data-axon-theme="system"\] \{/,
    );
  });

  it('zeroes motion durations when reduced motion is preferred', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\n {2}:root \{/);
    expect(css).toContain('--axon-duration-fast: 0ms;');
  });

  it('scopes rules to a scope id and skips empty blocks', () => {
    const scoped = buildThemeCss(
      diffThemeVars(vars, themeToVars(createTheme({ semantic: { dark: { border: '#222' } } }))),
      { scope: 'abc' },
    );
    expect(scoped).toContain('[data-axon-scope="abc"][data-axon-theme="dark"] {');
    expect(scoped).toContain('--axon-color-border: #222;');
    expect(scoped).not.toContain(':root');
    expect(scoped).not.toContain('[data-axon-theme="light"]');
    expect(scoped).not.toContain('prefers-reduced-motion');
  });
});

describe('tokens.generated.css', () => {
  it('is in sync with the tokens (run `pnpm --filter @axon/theme gen:css`)', () => {
    const file = readFileSync(path.resolve(__dirname, 'tokens.generated.css'), 'utf8');
    expect(file.replace(/\r\n/g, '\n')).toBe(generateTokensCss());
  });
});
