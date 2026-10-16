# Provenance

| Item | Value |
|---|---|
| Upstream | [openclaw/openclaw](https://github.com/openclaw/openclaw) (default branch `main`) |
| GitHub fork | yes (`redevops-io/openclaw`, default branch `main`) |
| Upstream commit this fork is based on (merge base) | `39d5590230db9144b514995c947b9f063f3b360b` (2026-02-16) |
| Sync status (computed 2026-10-15 via GitHub compare API) | diverged: 8 commits ahead, 100,519 commits behind upstream `main` |
| Licence | MIT, retained from upstream (`LICENSE`, copyright holder as in upstream) |

## Local delta (computed with `gh api repos/openclaw/openclaw/compare/main...redevops-io:openclaw:main`)

8 commits (2026-02-16 to 2026-06-28), 46 files, +3466/-2:

- `feat(extensions): add Maton integration tool extensions` - `airtable-api`, `asana-api`, `brave-search-api`, `clickup-api`, `notion-api`, `whatsapp-business-api` under `extensions/`. These call Maton's gateway and **require a third-party `MATON_API_KEY` from [maton.ai](https://maton.ai/)**.
- `add openclaw.plugin.json manifests for ClawHub extensions`
- `fix(docker): include extensions in pnpm workspace` (`Dockerfile`)
- `feat: add rag-knowledge extension with 6 tools for RAG platform integration` (`extensions/rag-knowledge/`; needs a separately deployed RAG platform)
- `fix: guard .filter() on undefined toolMetas and normalize plugin tool results` and `feat(agent): add phantom messaging + tool-loop safeguards` (small changes in `src/agents/`, with tests)
- `chore: gitignore .claude/` and a merge commit
- New documentation: `FORK_README.md`, `INTEGRATION_SUMMARY.md`, `RAG_PLATFORM_INTEGRATION.md`, `examples/openclaw_client.py`

See [FORK_README.md](FORK_README.md) and [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md). The fork extensions have not been verified by this documentation change.

## Caveats

- The fork is roughly 100,000 commits behind upstream; upstream security fixes and features since 2026-02-16 are not included.
- `package.json` version (2026.2.15), changelog, links, badges, docs and the repository description are inherited from upstream and may not reflect this fork.
- Repository topics unrelated to the upstream project (for example `context-runtime`, `rag`, `semantic-search`) were added by ReDevOps.
- This file is a point-in-time snapshot; re-run the compare to refresh.
