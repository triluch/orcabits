# Registry behavior

## Confirmed requirements

- YAML is the source of truth for plugin information. Website pages, navigation, filters, search indexes and counts are generated.
- Include installable OrcaSlicer plugins, including plugins with companion servers or helpers. Exclude standalone postprocessors, plugins for other applications and scaffolds without an Orca installation path.
- Experimental plugins are allowed. A custom-host requirement must be explicit; a documented plugin/source-build installation path is required.
- Each plugin has a one-sentence summary, a 4–6-sentence description, categories, status and rationale, repository, installation instructions, compatibility notes and research evidence.
- The public, no-login website is a best-effort GitHub catalogue, not an installer or an official OrcaSlicer registry. Installation uses upstream downloads or an Orca Cloud account.
- Explain non-affiliation, author-declared information, absence of testing/security certification, and installation risks on the About page and in a short footer. Configure issue-report links once the repository is chosen.
- Public copy excludes maintenance bookkeeping and setup placeholders. Show reporting instructions only when a working issue URL is configured; keep exclusion mechanics in maintainer documentation.
- Keep evidence-backed exclusions in YAML and reject conflicting additions during validation. Security reports must not silently reappear in later discovery passes.
- Keep manually supplied additions missed by search in a separate inclusions list, not a duplicate inventory. These are research seeds, not automatic approvals. Keep author-requested removals distinct from security exclusions.
- When an issue URL is configured, About offers links for missing-plugin suggestions, suspected malicious plugins, and plugin-author removal requests.
- Search and category/status filters run in the browser. Plugin detail pages and an unfiltered HTML listing remain usable without JavaScript.
- Keep every category/status option available for multi-selection. Selections within one filter are ORed; category and status filters combine with AND. Clear controls are X icons with accessible names and titles.
- Default sorting is Stars: numeric, highest first, with names breaking ties. Unknown counts follow known counts, including zero.
- Visitors choose sorting independently of filters. Selecting, changing, or clearing category/status filters never changes the chosen sort.
- Name sorting uses natural name order. Category and status sorting group alphabetically by that label and sort by name within each group. A plugin with several categories uses its first alphabetically named category for ordering.
- Astro generates static pages. Pagefind provides search and faceted browsing. No server or external search service is required.
- Builds use checked-in YAML and never fetch GitHub metadata. A separate command refreshes repository statistics; unavailable statistics are unknown, not zero.
- The website's data-update date is the latest curated `updated_at` or GitHub snapshot `updated_at`. Rebuilding and checking unchanged statistics do not advance it.
- Make targets are shared by local usage and GitHub Actions. Support both root hosting and GitHub Pages project subpaths.
- Public identity is OrcaBits at `https://triluch.github.io/orcabits/`. Main-branch pushes deploy Pages after validation and browser tests; PR workflows have read-only access and cannot deploy.
- README covers setup and use. The repository-local update skill documents LLM research and editing.

## Data boundaries

`registry/plugins/<id>.yaml` contains curated descriptions and evidence. File names are stable plugin IDs; multiple plugins may share one repository.

`registry/catalog.yaml` defines categories and their update date. `registry/github.yaml` is a code-maintained, repository-deduplicated statistics snapshot, with separate changed-data and observation timestamps.

All required data is validated before generating pages. Unknown categories, duplicate IDs, invalid URLs/dates, invalid statuses and incomplete installation/evidence information fail validation.

`available` means the author documents usable installation, not independently tested or guaranteed stable. `experimental` covers preview releases and material compatibility/testing uncertainty. `deprecated` and `archived` require explicit upstream evidence. Development-stage plugins with an actual installation path are experimental, not automatically excluded.

## Must-pass checks

- Every curated entry produces a detail page and an unfiltered listing link.
- Search, category and status filters combine correctly and show an empty-result state.
- Local root and project-subpath builds have working navigation and search assets.
- Invalid registry data fails before build; unknown stars render without inventing a count.
- Unchanged GitHub statistics preserve the data-update date; failed refreshes preserve the previous snapshot.
- A normal rebuild leaves registry YAML untouched.
