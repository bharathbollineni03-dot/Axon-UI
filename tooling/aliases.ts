import path from 'node:path';

/**
 * Resolves `@axonui/<pkg>` and `@axonui/<pkg>/styles.css` to package *sources* so Storybook and
 * Vitest never need a prior build. `root` is the monorepo root directory.
 */
export function axonAliases(root: string) {
  const packages = path.resolve(root, 'packages').replace(/\\/g, '/');
  return [
    { find: /^@axonui\/([^/]+)\/styles\.css$/, replacement: `${packages}/$1/src/styles.css` },
    { find: /^@axonui\/([^/]+)$/, replacement: `${packages}/$1/src/index.ts` },
  ];
}
