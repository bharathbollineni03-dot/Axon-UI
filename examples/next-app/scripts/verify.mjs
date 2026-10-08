/**
 * Starts the production build of this app and checks the HTML the server sends: every Axon
 * package must have rendered on the server (no client-only fallback, no missing "use client").
 * Run `pnpm build` first.
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = 3917;
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', String(port)],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
let log = '';
server.stdout.on('data', (chunk) => (log += chunk));
server.stderr.on('data', (chunk) => (log += chunk));

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/`);
      if (response.ok) return response.text();
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`The server did not start.\n${log}`);
}

const checks = [
  ['core: a button', /class="axon-button/],
  ['core: a labelled text field', /Email/],
  ['charts: a line chart as an image with a summary', /role="img"[^>]*aria-label="Line chart/],
  ['charts: a stat card', /axon-stat-card/],
  ['table: a static table with its caption', /<caption[^>]*>Quarterly revenue/],
  ['table: a data grid with its rows', /role="grid"[^>]*aria-label="People"/],
  ['table: grid cells', /Ada Lovelace/],
  ['forms: the sign-in form', /<form/],
  ['theme: the root with a colour mode', /data-axon-theme="system"/],
];

let failed = 0;
try {
  const html = await waitForServer();
  for (const [name, pattern] of checks) {
    const ok = pattern.test(html);
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
  }
} finally {
  server.kill();
  await once(server, 'exit').catch(() => undefined);
}

if (failed > 0) {
  console.error(`\n${failed} server-rendering check${failed === 1 ? '' : 's'} failed.`);
  process.exit(1);
}
console.log('\nEvery package rendered on the server.');
