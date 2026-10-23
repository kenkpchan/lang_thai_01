import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const payloadFile = process.argv[3] ?? '.netlify-create-site.json';
const payloadPath = path.join(root, payloadFile);
const payload = fs.readFileSync(payloadPath, 'utf8');

const cliCandidates = [
  path.join(
    process.env.APPDATA ?? '',
    '..',
    'Local',
    'npm-cache',
    '_npx',
    'da5c1b6ea715e8b4',
    'node_modules',
    'netlify-cli',
    'bin',
    'run.js',
  ),
  path.join(
    process.env.APPDATA ?? '',
    '..',
    'Local',
    'npm-cache',
    '_npx',
    'b3ca12a867cd0704',
    'node_modules',
    'netlify-cli',
    'bin',
    'run.js',
  ),
];

const cli = cliCandidates.find((p) => fs.existsSync(p));
if (!cli) {
  console.error('netlify-cli not found in npx cache; run: npx netlify-cli login');
  process.exit(1);
}

const apiMethod = process.argv[2] ?? 'createSiteInTeam';
// Optional 4th arg: site_id for getSiteDeploy (payload file holds deploy_id)
const result = spawnSync(process.execPath, [cli, 'api', apiMethod, '--data', payload], {
  cwd: root,
  encoding: 'utf8',
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
