// Builds an isolated app with the repository's real Next config; never touches a database.
// Run: node test/infra/deployment-skew.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';

const require = createRequire(import.meta.url);
const root = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const fixture = await mkdtemp(join(tmpdir(), 'life-os-deployment-skew-'));
const deployment = 'deployment-skew-current';
const marker = join(fixture, 'mutation.txt');
const env = { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', DEPLOYMENT_VERSION: deployment, MUTATION_MARKER: marker };
// Do not inherit local app credentials or database configuration into the fixture.
delete env.DATABASE_URL;
delete env.LIFE_OS_ACCESS_PASSWORD;
let server;
let serverOutput = '';
async function run(args) {
  await new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), ...args], { cwd: fixture, env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolveRun() : reject(new Error(`Next exited ${code}`)));
  });
}
try {
  await symlink(join(root, 'node_modules'), join(fixture, 'node_modules'));
  await copyFile(join(root, 'next.config.ts'), join(fixture, 'repository-config.ts'));
  await writeFile(join(fixture, 'next.config.ts'), `import config from './repository-config'; export default { ...config, output: undefined };`);
  await writeFile(join(fixture, 'package.json'), JSON.stringify({ private: true }));
  await mkdir(join(fixture, 'app'));
  await writeFile(join(fixture, 'app/layout.jsx'), `export default function Layout({children}) { return <html><body>{children}</body></html> }`);
  await writeFile(join(fixture, 'app/page.jsx'), `import { writeFile } from 'node:fs/promises';
async function mutate() { 'use server'; await writeFile(process.env.MUTATION_MARKER, 'executed'); return 'ok'; }
export default function Page() { return <form action={mutate}><button>Submit</button></form> }`);
  await run(['build', '--webpack']);
  const builtConfig = JSON.parse(await readFile(join(fixture, '.next/required-server-files.json'), 'utf8'));
  assert.equal(builtConfig.config.deploymentId, deployment, 'Deployment identity must be embedded in server configuration');
  const port = await new Promise((resolvePort, reject) => {
    const socket = createServer();
    socket.on('error', reject);
    socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => resolvePort(port)); });
  });
  const origin = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: fixture, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', data => { serverOutput += data; });
  server.stderr.on('data', data => { serverOutput += data; });
  let html;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { html = await (await fetch(origin)).text(); break; } catch { await new Promise(resolveWait => setTimeout(resolveWait, 100)); }
  }
  assert.ok(html, `Server did not start: ${serverOutput}`);
  assert.ok(html.includes(`data-dpl-id="${deployment}"`), 'HTML must identify the deployed build');
  assert.ok(html.includes(`?dpl=${deployment}`), 'Assets must identify the deployed build');
  const stale = await fetch(origin, { method: 'POST', headers: { 'Next-Action': '60f7bdc47db71ee33078f40871c9718902377def51', 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component', Origin: origin, 'x-deployment-id': 'deployment-skew-old' }, body: '[]' });
  assert.equal(stale.status, 404);
  assert.equal(stale.headers.get('x-nextjs-action-not-found'), '1');
  await assert.rejects(readFile(marker), { code: 'ENOENT' });
  const manifest = JSON.parse(await readFile(join(fixture, '.next/server/server-reference-manifest.json'), 'utf8'));
  const [actionId] = Object.keys(manifest.node);
  assert.ok(actionId, 'Fixture must contain a real Server Action');
  const current = await fetch(origin, { method: 'POST', headers: { 'Next-Action': actionId, 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component', Origin: origin, 'x-deployment-id': deployment }, body: '[]' });
  assert.equal(current.status, 200, await current.text());
  assert.equal(await readFile(marker, 'utf8'), 'executed');
  console.log('PASS: deployment identity is served; stale action is rejected without mutation; current action executes.');
} finally {
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await new Promise(resolveExit => server.once('exit', resolveExit)); }
  await rm(fixture, { recursive: true, force: true });
}
