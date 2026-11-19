# Project instructions

- Curated plugin data lives in `registry/plugins/*.yaml`; categories and exclusions live alongside it.
- `registry/inclusions.yaml` contains only manual additions missed by discovery, not the full inventory. Seeds still require normal eligibility checks; confirmed author opt-outs use exclusion reason `author-request`.
- Follow [the update skill](skills/update-registry/SKILL.md) for all plugin discovery and registry edits. Read exclusions before searching.
- `registry/github.yaml` is code-maintained. Do not manually edit stars.
- Do not edit generated files in `dist/` or `.astro/`.
- Keep builds offline with respect to registry metadata. GitHub refresh is an explicit separate command.
- Run `make check`, `make build`, and relevant browser tests after code changes.
- README explains use, not development history. Product rules belong in `docs/specification.md`.
