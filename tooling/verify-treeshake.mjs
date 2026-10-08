/**
 * Proves the packages tree-shake: bundles a tiny app that imports ONE thing from a built package and
 * checks that the result holds that thing and not the rest of the library.
 *
 *   pnpm build && pnpm verify:treeshake
 *
 * Each case bundles with esbuild the way an app would (minified, React left external) against the
 * packages' `dist` output, then checks the size and that markers of components the app never
 * imported (their class names, which survive minification) are absent. It exits non-zero on a
 * failure, so it can run in CI.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packages = ['theme', 'core', 'forms', 'chat', 'charts', 'table'];

const alias = Object.fromEntries(
  packages.map((name) => [
    `@axonui/${name}`,
    path.join(root, 'packages', name, 'dist', 'index.mjs'),
  ]),
);
for (const file of Object.values(alias)) {
  if (!existsSync(file)) {
    console.error(`Missing ${path.relative(root, file)}. Run \`pnpm build\` first.`);
    process.exit(2);
  }
}

/** `maxKb` is minified, before gzip, and counts the package plus everything it bundles or imports. */
const cases = [
  {
    name: 'core: import { Button }',
    code: "import { Button } from '@axonui/core'; console.log(Button);",
    maxKb: 12,
    absent: [
      'axon-modal',
      'axon-tabs',
      'axon-date-picker',
      'axon-drawer',
      'axon-menu',
      'axon-toast',
    ],
  },
  {
    name: 'core: import { Modal }',
    code: "import { Modal } from '@axonui/core'; console.log(Modal);",
    maxKb: 40,
    absent: ['axon-tabs', 'axon-date-picker', 'axon-drawer__', 'axon-accordion', 'axon-slider'],
  },
  {
    name: 'core: import { Checkbox }',
    code: "import { Checkbox } from '@axonui/core'; console.log(Checkbox);",
    maxKb: 14,
    absent: ['axon-modal', 'axon-select', 'axon-menu', 'axon-date-picker'],
  },
  {
    name: 'theme: import { ThemeProvider }',
    code: "import { ThemeProvider } from '@axonui/theme'; console.log(ThemeProvider);",
    maxKb: 30,
    absent: ['axon-button', 'axon-modal'],
  },
  {
    name: 'charts: import { Sparkline }',
    code: "import { Sparkline } from '@axonui/charts'; console.log(Sparkline);",
    maxKb: 60,
    absent: ['axon-gauge', 'axon-heatmap', 'axon-radar', 'axon-pie', 'axon-scatter'],
  },
  {
    name: 'charts: import { Gauge }',
    code: "import { Gauge } from '@axonui/charts'; console.log(Gauge);",
    maxKb: 65,
    absent: ['axon-heatmap', 'axon-radar', 'axon-pie', 'axon-scatter', 'axon-stat-card'],
  },
  {
    name: 'table: import { Table }',
    code: "import { Table } from '@axonui/table'; console.log(Table);",
    maxKb: 8,
    absent: ['axon-datagrid', '@tanstack', 'useVirtualizer'],
  },
  {
    name: 'forms: import { FormSlider }',
    code: "import { FormSlider } from '@axonui/forms'; console.log(FormSlider);",
    maxKb: 520,
    absent: ['axon-wizard', 'axon-auth-card', 'axon-password-strength'],
  },
  {
    name: 'chat: import { StreamingText }',
    code: "import { StreamingText } from '@axonui/chat'; console.log(StreamingText);",
    // Markdown rendering and syntax highlighting (react-markdown, remark-gfm and 23 highlight.js
    // languages) are what a streamed reply is made of; the chat components themselves are not here.
    maxKb: 800,
    absent: [
      'axon-chat-window',
      'axon-conversation-sidebar',
      'axon-prompt-input',
      'axon-feedback-dialog',
    ],
  },
];

let failed = 0;
for (const testCase of cases) {
  const result = await build({
    stdin: { contents: testCase.code, resolveDir: root, loader: 'js' },
    bundle: true,
    write: false,
    format: 'esm',
    minify: true,
    treeShaking: true,
    platform: 'browser',
    target: 'es2020',
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    alias,
    logLevel: 'silent',
    // Styles are separate files and not what is being measured.
    loader: { '.css': 'empty' },
  });
  const output = result.outputFiles[0]?.text ?? '';
  const kb = Buffer.byteLength(output) / 1024;
  const present = testCase.absent.filter((marker) => output.includes(marker));
  const ok = present.length === 0 && kb <= testCase.maxKb;
  if (!ok) failed += 1;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${testCase.name.padEnd(36)} ${kb.toFixed(1).padStart(7)} KB (max ${testCase.maxKb})` +
      (present.length ? `  still contains: ${present.join(', ')}` : ''),
  );
}

if (failed > 0) {
  console.error(`\n${failed} tree-shaking check${failed === 1 ? '' : 's'} failed.`);
  process.exit(1);
}
console.log('\nAll tree-shaking checks passed.');
