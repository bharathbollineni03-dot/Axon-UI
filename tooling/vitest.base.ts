import path from 'node:path';
import { defineConfig, mergeConfig, type UserConfig } from 'vitest/config';
import { axonAliases } from './aliases';

const root = path.resolve(__dirname, '..');

/** Shared Vitest config: jsdom, Testing Library, jest-dom and jest-axe matchers. */
export function createVitestConfig(overrides: UserConfig = {}) {
  return mergeConfig(
    defineConfig({
      resolve: { alias: axonAliases(root) },
      test: {
        environment: 'jsdom',
        setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
        css: false,
        restoreMocks: true,
        include: ['src/**/*.test.{ts,tsx}'],
      },
    }),
    overrides,
  );
}
