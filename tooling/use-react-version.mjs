/**
 * Points the workspace at React 18 or React 19, so the whole test suite can run against either.
 *
 *   node tooling/use-react-version.mjs 19
 *   pnpm install --no-frozen-lockfile
 *   pnpm test
 *
 * It rewrites the four React lines of the pnpm catalog in pnpm-workspace.yaml (every package takes
 * its React from the catalog). CI runs it in a matrix; locally, `git checkout pnpm-workspace.yaml
 * pnpm-lock.yaml` and `pnpm install` put things back.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const versions = {
  18: { react: '^18.3.1', types: '^18.3.20', typesDom: '^18.3.6' },
  19: { react: '^19.1.0', types: '^19.1.2', typesDom: '^19.1.2' },
};

const major = process.argv[2];
const chosen = versions[major];
if (!chosen) {
  console.error('Usage: node tooling/use-react-version.mjs <18|19>');
  process.exit(2);
}

const file = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'pnpm-workspace.yaml',
);
let text = await readFile(file, 'utf8');

const replacements = [
  [/^(\s+react:) .*$/m, `$1 ${chosen.react}`],
  [/^(\s+react-dom:) .*$/m, `$1 ${chosen.react}`],
  [/^(\s+'@types\/react':) .*$/m, `$1 ${chosen.types}`],
  [/^(\s+'@types\/react-dom':) .*$/m, `$1 ${chosen.typesDom}`],
];
for (const [pattern, replacement] of replacements) {
  if (!pattern.test(text)) {
    console.error(`pnpm-workspace.yaml has no catalog line matching ${pattern}`);
    process.exit(1);
  }
  text = text.replace(pattern, replacement);
}

await writeFile(file, text);
console.log(
  `The catalog now uses React ${major} (${chosen.react}). Run \`pnpm install --no-frozen-lockfile\`.`,
);
