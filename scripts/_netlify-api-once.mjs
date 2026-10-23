import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const payload = process.argv[2];
if (!payload) {
  console.error('Usage: node _netlify-api-once.mjs <json-payload>');
  process.exit(1);
}

const cacheRoot = path.join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
const cli = fs
  .readdirSync(cacheRoot)
  .map((d) => path.join(cacheRoot, d, 'node_modules', 'netlify-cli', 'bin', 'run.js'))
  .find((p) => fs.existsSync(p));

if (!cli) {
  console.error('netlify-cli not found; run: npx netlify-cli login');
  process.exit(1);
}

const result = spawnSync(process.execPath, [cli, 'api', process.argv[3], '--data', payload], {
  cwd: path.join(path.dirname(fileURLToPath(import.meta.url)), '..'),
  encoding: 'utf8',
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
