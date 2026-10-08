/**
 * Checks the built output of every package for the things a consumer depends on:
 *
 *   pnpm build && node tooling/verify-dist.mjs
 *
 *  - the ESM and CommonJS files start with a "use client" directive (so a server component can
 *    import the package),
 *  - every file the `exports` map points at exists,
 *  - the stylesheet exists and is not empty.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const names = ['theme', 'core', 'forms', 'chat', 'charts', 'table'];

const problems = [];
const check = (condition, message) => {
  if (!condition) problems.push(message);
};

/** Every file an `exports` entry (a string, or nested conditions) points at. */
function targets(value) {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(targets);
  return [];
}

for (const name of names) {
  const dir = path.join(root, 'packages', name);
  const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'));

  for (const file of ['dist/index.mjs', 'dist/index.js']) {
    const full = path.join(dir, file);
    if (!existsSync(full)) {
      check(false, `${pkg.name}: ${file} is missing (run pnpm build)`);
      continue;
    }
    const start = readFileSync(full, 'utf8').slice(0, 40);
    check(
      start.startsWith('"use client";'),
      `${pkg.name}: ${file} does not start with "use client"`,
    );
  }

  for (const target of new Set(targets(pkg.exports))) {
    check(
      existsSync(path.join(dir, target)),
      `${pkg.name}: exports points at ${target}, which does not exist`,
    );
  }
  for (const field of ['main', 'module', 'types']) {
    if (pkg[field])
      check(
        existsSync(path.join(dir, pkg[field])),
        `${pkg.name}: ${field} -> ${pkg[field]} is missing`,
      );
  }

  const css = path.join(dir, 'dist/styles.css');
  check(
    existsSync(css) && statSync(css).size > 0,
    `${pkg.name}: dist/styles.css is missing or empty`,
  );
  check(
    pkg.publishConfig?.access === 'public',
    `${pkg.name}: publishConfig.access must be "public"`,
  );
  check(
    pkg.publishConfig?.provenance === true,
    `${pkg.name}: publishConfig.provenance must be true`,
  );
  check(
    pkg.repository?.url?.includes('github.com'),
    `${pkg.name}: repository.url is missing (provenance needs it)`,
  );
}

if (problems.length > 0) {
  console.error(problems.map((problem) => `FAIL ${problem}`).join('\n'));
  process.exit(1);
}
console.log(
  `ok   ${names.length} packages: "use client" banners, exports, styles and publish settings`,
);
