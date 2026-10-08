/**
 * Renames the npm scope of every package, for when `@axon` is not available on npm:
 *
 *   node tooling/rename-scope.mjs @your-scope          # shows what would change
 *   node tooling/rename-scope.mjs @your-scope --write  # makes the change
 *
 * It replaces `@axon/` with `@your-scope/` in every text file git tracks (package names,
 * dependencies, imports, aliases, workflows, docs), then you run `pnpm install` to refresh the
 * lockfile and `pnpm build && pnpm test` to check. CSS class names and `--axon-*` variables are not
 * touched: they are the library's own vocabulary, not its npm name.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [scope, ...flags] = process.argv.slice(2);
const write = flags.includes('--write');

if (!scope || !/^@[a-z0-9][a-z0-9-]*$/.test(scope)) {
  console.error('Usage: node tooling/rename-scope.mjs @your-scope [--write]');
  console.error('The scope must be lower case letters, digits and hyphens, starting with @.');
  process.exit(2);
}
if (scope === '@axon') {
  console.error('That is already the scope.');
  process.exit(2);
}

const textFile = /\.(json|jsonc|md|mdx|mjs|cjs|js|ts|tsx|css|yml|yaml|html|txt)$/;
const skip = /(^|\/)(pnpm-lock\.yaml|node_modules|dist|storybook-static|\.next|CHANGELOG\.md)/;

const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((file) => file && textFile.test(file) && !skip.test(file));

let changedFiles = 0;
let replacements = 0;
for (const file of files) {
  const full = path.join(root, file);
  const before = readFileSync(full, 'utf8');
  const matches = before.match(/@axon\//g);
  if (!matches) continue;
  changedFiles += 1;
  replacements += matches.length;
  if (write) writeFileSync(full, before.replaceAll('@axon/', `${scope}/`));
  else console.log(`${String(matches.length).padStart(4)}  ${file}`);
}

console.log(
  `${write ? 'Changed' : 'Would change'} ${replacements} occurrences in ${changedFiles} files.`,
);
if (write) {
  console.log('Now run: pnpm install && pnpm build && pnpm test');
  console.log('Also set the repository URLs in each package.json if the repository moves.');
} else {
  console.log('Run again with --write to make the change.');
}
