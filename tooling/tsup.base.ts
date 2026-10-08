import path from 'node:path';
import { defineConfig, type Options } from 'tsup';
import { annotatePure } from './annotate-pure.mjs';

/**
 * Shared tsup config. Each package emits:
 *  - dist/index.mjs (ESM) and dist/index.js (CJS) with source maps
 *  - dist/index.d.mts / dist/index.d.ts type declarations
 *  - dist/styles.css, bundled from src/styles.css (which @imports each component's CSS)
 * `dependencies` and `peerDependencies` are externalised automatically by tsup.
 *
 * Two things are there for the apps that consume the packages:
 *  - A `"use client"` banner, so Next.js (app router) and other server-component frameworks treat
 *    the whole package as client code and the packages can be imported from a server component.
 *  - Top-level `forwardRef`, `memo`, `createContext` and `lazy` calls get a pure-call annotation after
 *    the build, so a bundler can drop the components an app never imports even though they all live
 *    in one file. Without it, importing a Button would keep every component in the bundle.
 */
export function createTsupConfig(overrides: Options = {}) {
  return defineConfig({
    entry: { index: 'src/index.ts', styles: 'src/styles.css' },
    format: ['esm', 'cjs'],
    dts: { entry: { index: 'src/index.ts' } },
    sourcemap: true,
    clean: true,
    // Rollup's tree-shaking pass would drop the "use client" banner; esbuild removes unused code itself.
    treeshake: false,
    target: 'es2020',
    banner: { js: '"use client";' },
    onSuccess: async () => {
      await annotatePure(path.resolve(process.cwd(), 'dist'));
    },
    ...overrides,
  });
}
