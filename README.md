# OrcaBits

A public, best-effort catalogue of GitHub-hosted OrcaSlicer plugins, with category/status filters, browser-side search, repository stars, and plugin detail pages. No account is needed to browse; installation still uses upstream downloads or Orca Cloud.

Browse **https://triluch.github.io/orcabits/**.

This is an independent project, not affiliated with OrcaSlicer, its developers, or Orca Cloud. Listings reflect authors' documentation, not testing or security review. Plugins execute code on your machine: review them and install at your own risk.

## Build and preview

Requires Node.js **24.22.1** (also recorded in `.node-version`), npm, and Make.

If your system Node is older, you can run a command with the pinned runtime without changing your global installation:

```sh
npm exec --yes --package=node@24.22.1 -- make build
```

```sh
make install
make build
make preview
```

Open the local address printed by preview. `dist/` is a self-contained static website: upload it to any static host. A local HTTP server is required for browser search; opening HTML through `file://` is not supported.

`make dev` runs Astro's development server. Pagefind search requires a completed build, so use build/preview to test the full catalogue.

### Hosting configuration

Root hosting is the default. For a GitHub Pages project subpath:

```sh
BASE_PATH=/orcabits/ make build
BASE_PATH=/orcabits/ make preview
```

Optional build-time variables:

| Variable         | Purpose                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `BASE_PATH`      | Hosting prefix, such as `/` or `/orcabits/`.                               |
| `SITE_URL`       | Public origin, such as `https://example.com`.                              |
| `REPOSITORY_URL` | This catalogue's GitHub repository; enables Source and issue-report links. |

For example:

```sh
REPOSITORY_URL=https://github.com/triluch/orcabits make build
```

GitHub Pages deploys automatically after pushes and merges to `main`, once validation, build, and browser tests pass. **Publish GitHub Pages** also supports manual runs from `main`. The workflow derives hosting paths and reporting links from the repository.

PR checks run with read-only repository access. Only the Pages deployment job gets Pages and OIDC write permissions; it does not run PR code. Pinned Actions are updated by Dependabot.

## Registry data

- `registry/plugins/*.yaml`: curated plugin entries.
- `registry/catalog.yaml`: categories.
- `registry/exclusions.yaml`: rejected discoveries and evidence, including security exclusions when substantiated.
- `registry/inclusions.yaml`: specific manually requested research seeds missed by normal discovery; seeds do not approve or publish entries.
- `registry/github.yaml`: code-maintained GitHub statistics, shared by plugins in the same repository.

Only actual installable OrcaSlicer plugins belong here; companion servers/helpers and experimental plugins are allowed. Standalone postprocessors, other applications' plugins, and scaffold-only projects are excluded.

See [the data format](docs/registry-format.md) and [the LLM update skill](skills/update-registry/SKILL.md).

### Refresh GitHub statistics

```sh
GITHUB_TOKEN=... make update-github
```

The token needs only read access to public repository metadata. Without a token, GitHub's unauthenticated rate limit may prevent a complete refresh. A failed refresh leaves the previous snapshot intact; ordinary builds never contact GitHub.

“Data updated” is derived from changes to curated registry information, exclusions/categories, or saved statistics—not website rebuilds. Source reviews and unchanged statistics checks have separate dates.

## Checks

```sh
make validate
make format
make check
make build
npx playwright install chromium
make test-browser
```

Browser tests exercise the built site. Pass the same `BASE_PATH` to build and tests when testing subpath hosting. CI checks both root and subpath builds.

## Licence

The catalogue's code and original content are available under the [MIT licence](LICENSE). Linked plugins and third-party material retain their own licences; listing a plugin does not relicense it.
