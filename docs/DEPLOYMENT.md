# Deployment note — Thai alphabet / workshop (lang_thai)

Use this when you change HTML, JS, CSS, or data and need to ship updates to production.

---

## Live production (Netlify)

| What | URL |
| --- | --- |
| **Combined workshop** (tones + vocab) | https://lang-thai-01.netlify.app/integrated-tone-vocab.html |
| Same page (no `.html`) | https://lang-thai-01.netlify.app/integrated-tone-vocab |
| **Design index** (seven prototypes) | https://lang-thai-01.netlify.app/ |
| Netlify project admin | https://app.netlify.com/projects/lang-thai-01 |
| Deploy history / logs | https://app.netlify.com/projects/lang-thai-01/deploys |

**Stack:** static files only — no `npm install`, no bundler. Netlify **publish directory** is the repo root (`.`).

**Build on Netlify** (from `netlify.toml`):

- **Build command:** `node js/check-pages.js && node js/check-syllables.js`
- **Publish directory:** `.`

Those checks must pass before a deploy is considered good (same commands you can run locally).

---

## GitHub (source of truth)

| Item | Value |
| --- | --- |
| Repository | **kenkpchan/lang_thai_01** |
| URL | https://github.com/kenkpchan/lang_thai_01 |
| Production branch | **main** |
| GitHub account | **kenkpchan** (email: ken.kp.chan@gmail.com) |

**Local clone (this PC):** `D:\_home\_private\_lang_thai`

**Remotes:**

| Remote | Use |
| --- | --- |
| **kenkpchan** | `https://github.com/kenkpchan/lang_thai_01.git` — **push here** for this site |
| **origin** | Older `ckpopak/lang-thai-01` — not tied to this Netlify site; prefer **kenkpchan** |

```powershell
cd D:\_home\_private\_lang_thai
git push kenkpchan main
```

If push fails with “Repository not found” or wrong user:

```powershell
git credential-manager github login --username kenkpchan --web --force
```

---

## Netlify (hosting)

| Item | Value |
| --- | --- |
| Netlify login | ken.kp.chan@gmail.com |
| Team slug | **ken-kp-chan** (dashboard may show team name **cupnoodle**) |
| Site name | **lang-thai-01** |
| Site ID | `159929c5-0377-4a7f-88f4-cfb3214ed1d3` |
| Intended Git repo | **kenkpchan/lang_thai_01**, branch **main** |

**Continuous deploy:** push to `kenkpchan` `main` → Netlify builds and publishes (GitHub App linked; `installation_id` set in site build settings).

**If Git deploy fails** (“Unable to access repository”, “Host key verification failed”): complete **Link repository** in the UI — https://app.netlify.com/projects/lang-thai-01/link — choose GitHub → **lang_thai_01** → **main**, and confirm settings match `netlify.toml`.

### Netlify environment variables (production)

Set in **Project configuration → Environment variables** (or run `node scripts/netlify-sync-env.mjs` from a machine with `.env` and Netlify CLI login):

| Variable | Purpose |
| --- | --- |
| `AUTH_BOOTSTRAP_USER` / `AUTH_BOOTSTRAP_PASSWORD` | Translation app login when Supabase is not used |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` | DeepSeek / OpenAI translate |
| `TAVILY_API_KEY` | Challenge topics web search |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | **Recommended** — durable history, users, sessions |
| `SITE_URL` | `https://lang-thai-01.netlify.app` (CORS helper) |

Without Supabase, functions store JSON under `/tmp` on Netlify (works for demos; not durable across cold starts). Run [db/supabase-schema.sql](../db/supabase-schema.sql) in Supabase, then add the two `SUPABASE_*` vars and redeploy.

**Public access:** the site must not require Netlify SSO for learners. If visitors see **401** / **Netlify SSO Redirect**, turn off SSO for this site under **Project configuration → Access control** (or set site `sso_login` off).

---

## Routine workflow (program changes → production)

1. **Edit locally** — main workshop file: `integrated-tone-vocab.html`; shared logic/styles under `js/`, `css/`, etc.; prototype pages `01-…` through `07-…`, hub `index.html`.
2. **Smoke-test in browser** — open the changed pages from disk or a simple static server.
3. **Run the same checks Netlify runs:**

   ```powershell
   node js/check-pages.js
   node js/check-syllables.js
   ```

4. **Commit** on `main` (when ready).
5. **Push** to GitHub: `git push kenkpchan main`.
6. **Verify** on Netlify **Deploys** → latest deploy **Published**, then open the workshop URL above.

---

## Manual deploy (when Git link or push is blocked)

On a corporate PC, set proxy for Node/Netlify CLI:

```powershell
$env:NODE_USE_ENV_PROXY='1'
```

From project root, production deploy by site ID (no `netlify link` required):

```powershell
cd D:\_home\_private\_lang_thai
node "$env:LOCALAPPDATA\npm-cache\_npx\b3ca12a867cd0704\node_modules\netlify-cli\bin\run.js" deploy --prod --dir . --site 159929c5-0377-4a7f-88f4-cfb3214ed1d3
```

(Path to `netlify-cli` … `run.js` can change after `npx netlify-cli`; find under `%LOCALAPPDATA%\npm-cache\_npx\`.)

**Deploy status via API** (token from Netlify CLI login on this machine):

```powershell
$env:NODE_USE_ENV_PROXY='1'
node scripts/netlify-rest.mjs status
```

---

## Troubleshooting references (this PC)

| Topic | Location |
| --- | --- |
| Proxy, Git HTTPS/PAT, `NO_PROXY`, credential manager | `D:\_working\__hello_world\docs\local-dev-environment-risks-llm-reference.md` |
| Netlify import / build settings (adapt publish dir to `.`) | `D:\_working\_note\DEPLOY-NETLIFY.md` |
| Push fails but browser GitHub works | `D:\_working\_note\SYNC-LOCAL-TO-GITHUB.md` |
| Extra Netlify-specific fixes | `docs/DEPLOY-NETLIFY.md` |

---

## Files to know

| File | Role |
| --- | --- |
| `netlify.toml` | Netlify build command and publish directory |
| `integrated-tone-vocab.html` | Primary deployed workshop |
| `index.html` | Hub linking prototype pages |
| `js/check-pages.js` | Pre-deploy page check (Netlify build) |
| `js/check-syllables.js` | Syllable/tone data check (Netlify build) |
| `scripts/netlify-rest.mjs` | Quick site/deploy status (needs CLI login + proxy env) |

---

*Last aligned with production workshop URL: https://lang-thai-01.netlify.app/integrated-tone-vocab*
