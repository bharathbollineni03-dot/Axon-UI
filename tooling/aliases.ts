import path from 'node:path';

/**
 * Resolves `@axon/<pkg>` and `@axon/<pkg>/styles.css` to package *sources* so Storybook and
 * Vitest never need a prior build. `root` is the monorepo root directory.
 */
export function axonAliases(root: string) {
  const packages = path.resolve(root, 'packages').replace(/\\/g, '/');
  return [
    { find: /^@axon\/([^/]+)\/styles\.css$/, replacement: `${packages}/$1/src/styles.css` },
    { find: /^@axon\/([^/]+)$/, replacement: `${packages}/$1/src/index.ts` },
  ];
}
