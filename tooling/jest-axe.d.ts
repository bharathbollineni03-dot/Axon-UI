// Minimal typings for jest-axe so we do not depend on @types/jest-axe (which pulls in @types/jest
// and clashes with Vitest's globals).
declare module 'jest-axe' {
  import type { AxeResults, RunOptions } from 'axe-core';

  export function axe(html: Element | string, options?: RunOptions): Promise<AxeResults>;
  export function configureAxe(options?: Record<string, unknown>): typeof axe;
  export const toHaveNoViolations: {
    toHaveNoViolations(results: AxeResults): { pass: boolean; message(): string };
  };
}
