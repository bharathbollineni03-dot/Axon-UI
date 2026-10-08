import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * esbuild bundles every component into one file and writes each component as a top-level
 * `var Button = forwardRef(...)`. A bundler can only drop a component the app never imports if it
 * knows that call has no side effects, and it cannot tell by itself. Marking the call with
 * `/* @__PURE__ *\/` says so. (esbuild's own `pure` option does not help here: it matches names as
 * written in the source, and by the time the bundle is written the same import has been renamed
 * `forwardRef55`.)
 *
 * Only top-level declarations of this exact shape are touched, in the ESM output (the CommonJS file
 * cannot be shaken by a bundler anyway).
 */
const PURE_CALLS = /^(var|let|const) ([\w$]+) = (forwardRef|memo|createContext|lazy)(\d*)\(/gm;

export async function annotatePure(distDir) {
  const file = path.join(distDir, 'index.mjs');
  const source = await readFile(file, 'utf8');
  let count = 0;
  const output = source.replace(PURE_CALLS, (_match, keyword, name, call, suffix) => {
    count += 1;
    return `${keyword} ${name} = /* @__PURE__ */ ${call}${suffix}(`;
  });
  if (output !== source) await writeFile(file, output);
  return count;
}
