import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  dataUpdatedAt,
  exclusionsSchema,
  inclusionsSchema,
  normalizeBase,
  pluginSchema,
  readYaml,
  sentenceCount,
  validateRegistry,
} from "../scripts/registry.mjs";
import { stringify } from "yaml";
import { refreshSnapshot, updateGithub } from "../scripts/update-github.mjs";

const plugin = {
  id: "example",
  name: "Example",
  summary: "Adds useful features.",
  description:
    "It adds a panel. It reads presets. It exports a file. It requires a local helper. It supports Windows.",
  repository: "https://github.com/owner/example",
  categories: ["tools"],
  status: "experimental",
  status_note: "Author labels it beta.",
  installation: {
    method: "python",
    url: "https://github.com/owner/example#install",
  },
  compatibility: {
    orca_slicer: "2.5+",
    platforms: ["windows"],
    requires_custom_build: false,
  },
  evidence: [{ label: "README", url: "https://github.com/owner/example" }],
  updated_at: "2026-11-18",
  reviewed_at: "2026-11-19",
};
const catalog = {
  updated_at: "2026-11-17",
  categories: [{ id: "tools", name: "Tools", description: "Tools." }],
};
const github = { updated_at: null, checked_at: null, repositories: {} };
const exclusions = { updated_at: "2026-11-17", exclusions: [] };
const inclusions = { updated_at: "2026-11-17", inclusions: [] };

test("validates plugin requirements, sentences, category references and exclusion conflicts", () => {
  validateRegistry([plugin], catalog, github, exclusions, inclusions);
  assert.throws(
    () =>
      validateRegistry(
        [{ ...plugin, categories: ["missing"] }],
        catalog,
        github,
        exclusions,
      ),
    /Unknown category/,
  );
  assert.throws(
    () =>
      validateRegistry(
        [{ ...plugin, summary: "First sentence. Second sentence." }],
        catalog,
        github,
        exclusions,
      ),
    /one sentence/,
  );
  assert.throws(
    () =>
      validateRegistry(
        [{ ...plugin, description: "Too short." }],
        catalog,
        github,
        exclusions,
      ),
    /4–6/,
  );
  assert.throws(
    () => validateRegistry([plugin, plugin], catalog, github, exclusions),
    /Duplicate plugin/,
  );
  assert.throws(
    () =>
      validateRegistry([plugin], catalog, github, {
        ...exclusions,
        exclusions: [
          { repository: plugin.repository.toUpperCase(), scope: "repository" },
        ],
      }),
    /exclusions list/,
  );
  validateRegistry([plugin], catalog, github, {
    ...exclusions,
    exclusions: [
      {
        repository: plugin.repository,
        scope: "plugin",
        plugin_id: "other-plugin",
      },
    ],
  });
  assert.throws(() =>
    pluginSchema.parse({ ...plugin, installation: undefined }),
  );
  assert.equal(
    sentenceCount("Requires OrcaSlicer 2.5 or later. Uses a wheel."),
    2,
  );
});

test("validates manual inclusion seeds, duplicate IDs and exclusion conflicts", () => {
  const seed = {
    repository: "https://github.com/Owner/Example",
    plugin_id: "example",
    note: "Manually requested after normal discovery missed it.",
    added_at: "2026-11-19",
  };
  validateRegistry([plugin], catalog, github, exclusions, {
    ...inclusions,
    inclusions: [seed],
  });
  assert.throws(
    () =>
      validateRegistry([plugin], catalog, github, exclusions, {
        ...inclusions,
        inclusions: [
          seed,
          { ...seed, repository: "https://github.com/owner/example" },
        ],
      }),
    /Duplicate inclusion seed/,
  );
  assert.throws(
    () =>
      validateRegistry(
        [plugin],
        catalog,
        github,
        {
          ...exclusions,
          exclusions: [
            {
              repository: "https://github.com/OWNER/EXAMPLE",
              scope: "plugin",
              plugin_id: "example",
            },
          ],
        },
        { ...inclusions, inclusions: [seed] },
      ),
    /conflicts with the exclusions list/,
  );
  assert.equal(
    exclusionsSchema.safeParse({
      ...exclusions,
      exclusions: [
        {
          repository: plugin.repository,
          scope: "repository",
          reason: "author-request",
          note: "Author asked for removal.",
          evidence: [{ label: "Author request", url: plugin.repository }],
          reviewed_at: "2026-11-19",
        },
      ],
    }).success,
    true,
  );
  assert.equal(
    inclusionsSchema.safeParse({
      ...inclusions,
      inclusions: [{ ...seed, note: " " }],
    }).success,
    false,
  );
});

test("rejects malformed dates, URLs, unknown fields and duplicate YAML keys", () => {
  const { id, ...data } = plugin;
  assert.equal(pluginSchema.safeParse(data).success, true);
  for (const changed of [
    { ...data, repository: "https://evil.example/owner/repo" },
    { ...data, updated_at: "2026-02-30" },
    { ...data, arbitrary: "field" },
    { ...data, installation: { method: "python", url: "javascript:alert(1)" } },
  ])
    assert.equal(pluginSchema.safeParse(changed).success, false);
  const directory = mkdtempSync(join(tmpdir(), "orca-registry-test-"));
  const path = join(directory, "duplicate.yaml");
  writeFileSync(path, "name: first\nname: second\n");
  assert.throws(() => readYaml(path), /unique/i);
});

test("data date ignores rebuilds, source reviews and unchanged statistics checks", () => {
  assert.equal(
    dataUpdatedAt([plugin], catalog, github, exclusions),
    "2026-11-18",
  );
  assert.equal(
    dataUpdatedAt(
      [{ ...plugin, reviewed_at: "2026-12-01" }],
      catalog,
      { ...github, checked_at: "2026-12-01" },
      exclusions,
    ),
    "2026-11-18",
  );
  assert.equal(
    dataUpdatedAt(
      [plugin],
      catalog,
      { ...github, updated_at: "2026-11-20" },
      exclusions,
    ),
    "2026-11-20",
  );
});

test("GitHub refresh deduplicates repositories and preserves unchanged-data date", async () => {
  const calls = [];
  const request = async (url) => {
    calls.push(url);
    return {
      ok: true,
      json: async () => ({ stargazers_count: 0, archived: false }),
    };
  };
  const first = await refreshSnapshot(
    [plugin, { ...plugin, repository: "https://github.com/Owner/Example" }],
    github,
    { request, token: "", today: "2026-11-19" },
  );
  assert.equal(calls.length, 1);
  assert.equal(first.repositories["owner/example"].stars, 0);
  assert.equal(first.updated_at, "2026-11-19");
  const second = await refreshSnapshot([plugin], first, {
    request,
    token: "",
    today: "2026-11-20",
  });
  assert.equal(second.updated_at, "2026-11-19");
  assert.equal(second.checked_at, "2026-11-20");
  const changed = await refreshSnapshot([plugin], first, {
    token: "",
    today: "2026-11-20",
    request: async () => ({
      ok: true,
      json: async () => ({ stargazers_count: 12, archived: true }),
    }),
  });
  assert.equal(changed.updated_at, "2026-11-20");
  assert.equal(changed.repositories["owner/example"].archived, true);
});

test("failed/invalid GitHub responses fail the whole refresh without changing its input", async () => {
  const original = structuredClone(github);
  await assert.rejects(
    refreshSnapshot([plugin], github, {
      token: "",
      request: async () => ({ ok: false, status: 403 }),
    }),
    /snapshot not changed/,
  );
  await assert.rejects(
    refreshSnapshot([plugin], github, {
      token: "",
      request: async () => ({
        ok: true,
        json: async () => ({ stargazers_count: -1, archived: false }),
      }),
    }),
  );
  assert.deepEqual(github, original);
});

test("failed refresh preserves the on-disk snapshot and does not expose the token", async () => {
  const directory = mkdtempSync(join(tmpdir(), "orca-refresh-test-"));
  mkdirSync(join(directory, "registry/plugins"), { recursive: true });
  const { id, ...data } = plugin;
  for (const [filename, value] of Object.entries({
    "catalog.yaml": catalog,
    "github.yaml": github,
    "exclusions.yaml": exclusions,
    "inclusions.yaml": inclusions,
    "plugins/example.yaml": data,
  }))
    writeFileSync(join(directory, "registry", filename), stringify(value));
  const path = join(directory, "registry/github.yaml");
  const previous = readFileSync(path, "utf8");
  const token = "secret-test-token";
  await assert.rejects(
    updateGithub(directory, {
      token,
      request: async (_url, options) => {
        assert.equal(options.headers.Authorization, `Bearer ${token}`);
        return { ok: false, status: 403 };
      },
    }),
    (error) =>
      error.message.includes("snapshot not changed") &&
      !error.message.includes(token),
  );
  assert.equal(readFileSync(path, "utf8"), previous);
});

test("normalizes hosting base paths and rejects unsafe paths", () => {
  assert.equal(normalizeBase("/"), "/");
  assert.equal(normalizeBase("/orcaslicer-plugins"), "/orcaslicer-plugins/");
  for (const value of [
    "https://example.com",
    "//host",
    "/../path",
    "/a?b",
    "/a\\b",
  ]) {
    assert.throws(() => normalizeBase(value), /BASE_PATH/);
  }
});
