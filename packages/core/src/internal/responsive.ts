import type { CSSProperties } from 'react';

export const breakpointNames = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
export type BreakpointName = (typeof breakpointNames)[number];

/**
 * A value that can change with the viewport width, mobile first: `base` applies everywhere and
 * each breakpoint key applies from that width up (`md: 3` means "3 from 768px upward").
 * Breakpoint widths match the `@axon/theme` defaults (640, 768, 1024, 1280, 1536 px).
 */
export type Responsive<T> = T | Partial<Record<'base' | BreakpointName, T>>;

const keys = /* @__PURE__ */ new Set<string>(['base', ...breakpointNames]);

function isResponsiveObject<T>(
  value: Responsive<T>,
): value is Partial<Record<'base' | BreakpointName, T>> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => keys.has(key))
  );
}

/**
 * Turns a responsive value into CSS custom properties: `--axon-<name>` for the base value and
 * `--axon-<name>-<bp>` per breakpoint. Component CSS reads them with a mobile-first fallback chain,
 * so nothing runs in JavaScript and server and client markup are identical.
 */
export function responsiveVars<T>(
  name: string,
  value: Responsive<T> | undefined,
  format: (value: T) => string,
): CSSProperties {
  const vars: Record<string, string> = {};
  if (value === undefined) return vars;
  if (!isResponsiveObject(value)) {
    vars[`--axon-${name}`] = format(value);
    return vars;
  }
  if (value.base !== undefined) vars[`--axon-${name}`] = format(value.base);
  for (const bp of breakpointNames) {
    const entry = value[bp];
    if (entry !== undefined) vars[`--axon-${name}-${bp}`] = format(entry);
  }
  return vars;
}

/** A value from the `@axon/theme` spacing scale (multiples of 0.25rem; `4` is `1rem`). */
export type Space = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 6 | 8 | 12 | 16;

/** The CSS for a spacing step, e.g. `4` -> `var(--axon-space-4)`. */
export const spaceVar = (space: Space) =>
  space === 0 ? '0' : `var(--axon-space-${String(space).replace('.', '-')})`;
