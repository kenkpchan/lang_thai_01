import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function findCli() {
  const npxRoot = path.join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
  if (!fs.existsSync(npxRoot)) return null;
  for (const dir of fs.readdirSync(npxRoot)) {
    const cli = path.join(npxRoot, dir, 'node_modules', 'netlify-cli', 'bin', 'run.js');
    if (fs.existsSync(cli)) return cli;
  }
  return null;
}

const method = process.argv[2];
const payloadArg = process.argv[3];
if (!method || !payloadArg) {
  console.error('Usage: node scripts/netlify-api.mjs <apiMethod> <payload.json>');
  process.exit(1);
}

const payloadPath = path.isAbsolute(payloadArg) ? payloadArg : path.join(root, payloadArg);
const payload = fs.readFileSync(payloadPath, 'utf8');

const cli = findCli();
if (!cli) {
  console.error('netlify-cli not found; run once: npx netlify-cli login');
  process.exit(1);
}

const result = spawnSync(process.execPath, [cli, 'api', method, '--data', payload], {
  cwd: root,
  encoding: 'utf8',
  timeout: 60_000,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
