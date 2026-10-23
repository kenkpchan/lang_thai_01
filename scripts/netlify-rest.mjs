import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const configPath = path.join(os.homedir(), 'AppData', 'Roaming', 'netlify', 'Config', 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const userId = config.userId;
const token = config.users?.[userId]?.auth?.token;
if (!token) {
  console.error('No Netlify token in config; run: npx netlify-cli login');
  process.exit(1);
}

const siteId = '159929c5-0377-4a7f-88f4-cfb3214ed1d3';

async function api(pathname, options = {}) {
  const res = await fetch(`https://api.netlify.com${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    console.error(res.status, res.statusText);
    console.error(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
    process.exit(1);
  }
  return body;
}

const action = process.argv[2] ?? 'status';

if (action === 'status') {
  const site = await api(`/api/v1/sites/${siteId}`);
  const deploys = await api(`/api/v1/sites/${siteId}/deploys?per_page=3`);
  console.log(
    JSON.stringify(
      {
        name: site.name,
        url: site.ssl_url ?? site.url,
        repo: site.build_settings?.repo_url,
        branch: site.build_settings?.repo_branch,
        installation_id: site.build_settings?.installation_id,
        latest: deploys.map((d) => ({
          id: d.id,
          state: d.state,
          error_message: d.error_message,
          deploy_url: d.deploy_ssl_url ?? d.deploy_url,
          created_at: d.created_at,
        })),
      },
      null,
      2,
    ),
  );
} else if (action === 'repos') {
  const repos = await api('/api/v1/repos?filter=authorized&sort=updated_at&direction=desc&per_page=100');
  const match = repos.filter((r) => r.full_name?.includes('lang_thai') || r.name?.includes('lang'));
  console.log(JSON.stringify(match.length ? match : repos.slice(0, 20), null, 2));
} else if (action === 'build') {
  const build = await api(`/api/v1/sites/${siteId}/builds`, { method: 'POST', body: '{}' });
  console.log(JSON.stringify(build, null, 2));
} else if (action === 'link') {
  const installationId = process.argv[3];
  const repoId = process.argv[4];
  if (!installationId || !repoId) {
    console.error('Usage: node scripts/netlify-rest.mjs link <installation_id> <repo_id>');
    process.exit(1);
  }
  const site = await api(`/api/v1/sites/${siteId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      build_settings: {
        repo_url: 'https://github.com/kenkpchan/lang_thai_01',
        repo_branch: 'main',
        provider: 'github',
        installation_id: Number(installationId),
        repo_id: Number(repoId),
        cmd: 'node js/check-pages.js && node js/check-syllables.js',
        dir: '.',
      },
    }),
  });
  console.log(JSON.stringify({ installation_id: site.build_settings?.installation_id, repo: site.build_settings?.repo_url }, null, 2));
} else {
  console.error('Usage: node scripts/netlify-rest.mjs [status|repos|build|link]');
  process.exit(1);
}
