# Netlify troubleshooting (lang_thai)

**Main deployment note (repos, URLs, workflow):** [DEPLOYMENT.md](./DEPLOYMENT.md)

This file keeps symptom → fix items that came up on first deploy.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| **Repository not found** on `git push` | Wrong GitHub user in Credential Manager | `git credential-manager github login --username kenkpchan --web --force` |
| **Host key verification failed** on Netlify Git deploy | Missing GitHub App **`installation_id`** | https://app.netlify.com/projects/lang-thai-01/link |
| Netlify CLI **ETIMEDOUT** | Proxy; Node ignores proxy by default | `$env:NODE_USE_ENV_PROXY='1'` |
| **`netlify deploy --prod`** “No teams available” | Project not linked in folder | Use `--site 159929c5-0377-4a7f-88f4-cfb3214ed1d3` (see DEPLOYMENT.md) |
| **401** / **Netlify SSO Redirect** | Site/team SSO on | Disable SSO for **lang-thai-01** (Access control) |

Corporate / Git / sync context: `D:\_working\__hello_world\docs\local-dev-environment-risks-llm-reference.md`
