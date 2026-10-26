# lang_thai — Thai learning workshops

Static Thai alphabet / tone workshops plus an **AI translation vocabulary** page deployable on Netlify.

| Page | Purpose |
|------|---------|
| [integrated-tone-vocab.html](integrated-tone-vocab.html) | Tone + syllable workshop (main site) |
| [integrated-translation-vocab.html](integrated-translation-vocab.html) | English → Thai “Version 1 · Clean Essential” cards + history |

Production: https://lang-thai-01.netlify.app/ (see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Netlify/Git remotes).

---

## Translation vocabulary app

### Tech stack (recommended)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Plain HTML + CSS + JS | Matches existing repo; no build step |
| API | Netlify Functions (Node 18+) | Hides `OPENAI_API_KEY` from the browser |
| AI | OpenAI-compatible Chat Completions | Configurable base URL + model via env |
| Database | **Supabase** (Postgres) in production | Simple REST from functions; free tier |
| Local DB fallback | `data/translation-history.json` | No install; works with local API script |

### Environment variables

Set in Netlify (**Site configuration → Environment variables**) and in local `.env` (copy from [.env.example](.env.example)):

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (for translate) | DeepSeek or OpenAI API key |
| `OPENAI_BASE_URL` | No | Default `https://api.deepseek.com/v1` (see `.env.example`) |
| `OPENAI_MODEL` | No | Default `deepseek-chat` |
| `TAVILY_API_KEY` | Challenge web topics | Tavily search; DeepSeek still writes Thai + guides |
| `SUPABASE_URL` | Production | Project URL from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | **Server only** — never expose in frontend |

Without Supabase, functions use a JSON file (local dev only; Netlify filesystem is not durable for production).

### Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [db/supabase-schema.sql](db/supabase-schema.sql).
3. Copy **Project URL** and **service_role** key (Settings → API) into Netlify env vars.

### Local development (Windows, no new installs)

Prerequisites: **Node.js** (already used for `js/check-pages.js`).

1. Copy `.env.example` → `.env` and set `OPENAI_API_KEY`.
2. Copy proxy settings into `.env` if you are on the SCIG network (`HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `NODE_USE_ENV_PROXY=1` — see `.env.example`).

3. Start the local API (re-launches with `.env` applied so DeepSeek works through the proxy):

   ```powershell
   cd D:\_home\_private\_lang_thai
   node scripts/translation-api-local.mjs
   ```

4. Serve static files (separate terminal):

   ```powershell
   cd D:\_home\_private\_lang_thai
   npx serve -l 5180
   ```

5. Open http://localhost:5180/integrated-translation-vocab.html — **sign in** when prompted.

**Login:** Users live in the DB (`app_users` / local `data/app-users.json`). On first run, if the user table is empty, the API creates one account from `AUTH_BOOTSTRAP_USER` and `AUTH_BOOTSTRAP_PASSWORD` in `.env`. Or run:

```powershell
node scripts/seed-auth-user.mjs myname mypassword
```

All `/api/translate`, `/api/history`, and `/api/links` calls require a session (Bearer token or cookie after `POST /api/auth`).

On a corporate PC, set proxy env vars before Node calls the AI (see `D:\_working\__hello_world\docs\local-dev-environment-risks-llm-reference.md`).

Optional: `netlify dev` if Netlify CLI is already installed — it runs functions and static site together.

### GitHub repository

```powershell
cd D:\_home\_private\_lang_thai
git remote add kenkpchan https://github.com/kenkpchan/lang_thai_01.git
git push kenkpchan main
```

Repository: https://github.com/kenkpchan/lang_thai_01

### Netlify deployment

1. Link site **lang-thai-01** to `kenkpchan/lang_thai_01`, branch **main**.
2. Build settings (root [netlify.toml](netlify.toml)):
   - **Publish directory:** `.`
   - **Build command:** `node js/check-pages.js && node js/check-syllables.js`
3. Add environment variables (`OPENAI_*`, `SUPABASE_*`).
4. Deploy. API routes:
   - `POST /api/translate` — translate + save
   - `GET /api/history?q=` — list / search
   - `PATCH /api/history` — notes, status, batch update, re-translate
   - `DELETE /api/history?id=` — remove entry
   - `GET /api/review` — Today’s 10 queue
   - `POST /api/review` — recall self-rating (again / hard / good)
   - `POST /api/challenge` — Tavily web search (if `TAVILY_API_KEY`) → DeepSeek Thai sentences + guides

### Using the app

1. Enter English → **Translate**.
2. Read the **Version 1 · Clean Essential** card (Thai, romanization, 繁體, meaning, example).
3. Use **🔊 Pronounce on Google Translate** for audio via Google.
4. **History** stores past lookups; search, add notes, change status, re-translate, or delete.

### Folder structure (translation feature)

```
integrated-translation-vocab.html   # UI
css/translation-vocab.css
js/translation-vocab.js
netlify/functions/
  translate.mjs                     # AI translate + insert
  history.mjs                       # list / patch / delete
  _lib/ai.mjs, db.mjs, cors.mjs, schema.mjs
scripts/translation-api-local.mjs   # local dev server
db/supabase-schema.sql
data/translation-history.json       # local only (gitignored)
.env.example
```

### Security

- API keys and Supabase **service role** exist only in Netlify (or local `.env`).
- The browser calls same-origin `/api/*` only.
- Do not commit `.env`.

---

## Tone workshop (existing)

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Netlify URLs, remotes, and pre-deploy checks.

```powershell
node js/check-pages.js
node js/check-syllables.js
```
