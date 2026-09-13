import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const envProd = join(root, '.env.prod');
const envLocal = join(root, '.env');

if (!existsSync(envProd)) {
  console.error('Missing .env.prod — cannot build for production.');
  process.exit(1);
}

copyFileSync(envProd, envLocal);
console.log('Copied .env.prod → .env');

const required = ['IG_AUTH', 'IG_DOMAIN', 'IG_PARSE_URL', 'IG_ORIGIN'];
const envText = await import('node:fs').then((fs) => fs.readFileSync(envLocal, 'utf8'));
const present = [];
const missing = [];
for (const key of required) {
  const ok = new RegExp(`^${key}=.+`, 'm').test(envText);
  (ok ? present : missing).push(key);
}
console.log('IG env in .env:', present.join(', ') || '(none)');
if (missing.length) {
  console.warn('WARNING missing IG env keys:', missing.join(', '));
}

const tsc = spawnSync('npx', ['tsc', '-p', 'tsconfig.json'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (tsc.status !== 0) {
  process.exit(tsc.status ?? 1);
}

const distServer = join(root, 'dist', 'server.js');
const distWorker = join(root, 'dist', 'worker.js');
if (!existsSync(distServer) || !existsSync(distWorker)) {
  console.error('Build finished but dist/server.js or dist/worker.js is missing.');
  process.exit(1);
}

function countJs(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) n += countJs(p);
    else if (name.endsWith('.js')) n += 1;
  }
  return n;
}

console.log(`TypeScript build OK → dist/ (${countJs(join(root, 'dist'))} js files)`);
console.log('');
console.log('IMPORTANT: this does NOT deploy to api-auto.mastplayer.in.');
console.log('Upload/restart on the server with the new dist/ AND ensure the server .env has IG_AUTH / IG_* keys.');
console.log('Then restart both: npm start  and  npm run start:worker');
