import { defineConfig, type Options } from 'tsup';

/**
 * Shared tsup config. Each package emits:
 *  - dist/index.mjs (ESM) and dist/index.js (CJS) with source maps
 *  - dist/index.d.mts / dist/index.d.ts type declarations
 *  - dist/styles.css, bundled from src/styles.css (which @imports each component's CSS)
 * `dependencies` and `peerDependencies` are externalised automatically by tsup.
 */
export function createTsupConfig(overrides: Options = {}) {
  return defineConfig({
    entry: { index: 'src/index.ts', styles: 'src/styles.css' },
    format: ['esm', 'cjs'],
    dts: { entry: { index: 'src/index.ts' } },
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2020',
    ...overrides,
  });
}
