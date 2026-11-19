---
name: update-registry
description: Research GitHub and update the structured OrcaSlicer plugin catalogue with verified inclusion, status, compatibility, and exclusion evidence.
---

# Update the OrcaSlicer registry

## Scope

Use this procedure to add, review, correct, or remove catalogue entries. Edit curated YAML, not generated pages, search indexes, counts, or GitHub star snapshots.

Read `docs/registry-format.md`, `registry/catalog.yaml`, and **`registry/exclusions.yaml` before searching**. Then check `registry/inclusions.yaml` for specifically requested additions that normal discovery missed. Existing plugin filenames are stable IDs.

## Discover and verify

1. Search GitHub for native OrcaSlicer plugins and follow links from established plugin repositories. If GitHub MCP is available, use it for repository research.
2. Check existing entries and exclusions before investigating a candidate. Compare canonical repository URLs case-insensitively. Respect plugin-scoped exclusions without excluding unrelated plugins in the same repository.
3. Read the upstream README, manifest/source, installation instructions, and relevant releases. Repository descriptions and screenshots alone are insufficient.
4. Confirm the project implements a plugin installed into OrcaSlicer and has an available artifact or an actual documented source-build/install path. Do not run untrusted code to confirm it.
5. Exclude standalone postprocessors, plugins installed into other applications, and scaffolds. A native Orca plugin with a separate MCP server, helper, Blender, or other companion application is allowed.
6. Experimental plugins are allowed if installable. Custom-host plugins need a documented plugin install/build path and `requires_custom_build: true`; ordinary supported nightlies are not custom hosts.
7. Distinguish supported platforms from platforms actually tested by the author. Never imply that the catalogue tested or audited a plugin.

## Edit curated data

- Add one `registry/plugins/<stable-id>.yaml` per independently installed plugin.
- Use the exact schema in `docs/registry-format.md`: a one-sentence summary, a factual 4–6-sentence description, categories, status/rationale, installation, compatibility, evidence, and dates.
- Prefer concrete capabilities, workflow, requirements, and limitations over promotional claims. Avoid padding the description with repeated disclaimers.
- Public copy must help visitors discover, assess, or install plugins. Keep exclusion bookkeeping, generation details, and future setup notes in maintainer documentation, not plugin descriptions or the About page.
- Cite primary-source evidence, preferably pinned to a source revision. A moving release/download URL is fine for installation; evidence should identify what was reviewed.
- `available` means documented usable installation, not guaranteed stability or active maintenance. Use `experimental` for installable development-stage or materially uncertain integrations. Require explicit evidence for `deprecated` or `archived`.
- If details change, set `updated_at` and `reviewed_at` to the review date. If checking unchanged facts, change only `reviewed_at`. Do not advance dates during a website build.
- Do not invent stars. `make update-github` owns `registry/github.yaml`.
- Independently packaged plugins in one repository need separate records, but a relocation or renamed copy is not automatically another plugin.

## Exclusions and security reports

Record excluded discoveries in `registry/exclusions.yaml` so future research does not rediscover them. Include the canonical repository, scope (`repository` or `plugin`), plugin ID for plugin scope, reason, concise note, primary evidence, and review date. Update the exclusion file's `updated_at` when its content changes. Keep confirmed author opt-outs there with reason `author-request`; this is distinct from a security exclusion and prevents rediscovery.

`registry/inclusions.yaml` is only a provenance/research seed list for specific manually requested additions that normal search missed. Check exclusions first, then research requested seeds separately under the normal eligibility rules. Retain accepted manual additions as provenance; a seed never approves or publishes a plugin and cannot bypass exclusions. Do not populate it with already discovered inventory or suggestions nobody supplied. Update its `updated_at` when its contents change; seeds do not advance the displayed data date.

Use `security` only for a substantiated security exclusion, not merely low popularity, broad permissions, or AI-generated code. For reports, inspect public evidence without executing the plugin or sharing private data. A catalogue listing is not a security endorsement.

Validation rejects an entry conflicting with an exclusion. Reconsidering an exclusion requires explicit evidence and a deliberate YAML change, not bypassing validation.

## Verify

```sh
make validate
make update-github   # optional metadata refresh; GITHUB_TOKEN avoids public API rate limits
make format
make check
make build
make test-browser
```

Review the YAML diff and generated plugin pages. Confirm exclusions, installability, sentence counts, compatibility caveats, unknown statistics, and data dates. Use `BASE_PATH=/catalogue/ make build` and the same environment for preview/browser tests when changing hosting or navigation.

Do not add a development diary to README. Do not commit, push, publish, or post reports without the repository owner's authorization.
