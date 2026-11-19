import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDocument } from "yaml";
import { z } from "zod";

export const root = fileURLToPath(new URL("../", import.meta.url));
const text = z.string().trim().min(1);
const date = z.iso.date();
const url = z.url().refine((value) => new URL(value).protocol === "https:", {
  message: "Use an HTTPS URL",
});
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const evidence = z.strictObject({ label: text, url });

export const statusNames = {
  available: "Available",
  experimental: "Experimental",
  deprecated: "Deprecated",
  archived: "Archived",
};

export const pluginSchema = z.strictObject({
  name: text,
  summary: text,
  description: text,
  repository: z
    .url()
    .regex(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  categories: z.array(id).min(1).refine(unique, "Duplicate category"),
  status: z.enum(["available", "experimental", "deprecated", "archived"]),
  status_note: text,
  installation: z.strictObject({
    method: z.enum(["python", "wheel", "source", "native"]),
    url,
    notes: text.optional(),
  }),
  compatibility: z.strictObject({
    orca_slicer: text,
    platforms: z
      .array(z.enum(["windows", "macos", "linux"]))
      .refine(unique, "Duplicate platform"),
    requires_custom_build: z.boolean(),
    notes: text.optional(),
  }),
  evidence: z.array(evidence).min(1),
  updated_at: date,
  reviewed_at: date,
});

const catalogSchema = z.strictObject({
  updated_at: date,
  categories: z
    .array(z.strictObject({ id, name: text, description: text }))
    .min(1),
});

export const exclusionsSchema = z.strictObject({
  updated_at: date,
  exclusions: z.array(
    z
      .strictObject({
        repository: pluginSchema.shape.repository,
        scope: z.enum(["repository", "plugin"]),
        plugin_id: id.optional(),
        reason: z.enum([
          "out-of-scope",
          "not-installable",
          "duplicate",
          "security",
          "author-request",
        ]),
        note: text,
        evidence: z.array(evidence).min(1),
        reviewed_at: date,
      })
      .refine(
        (entry) => (entry.scope === "plugin") === Boolean(entry.plugin_id),
        "Only plugin-scoped exclusions must have plugin_id",
      ),
  ),
});

export const inclusionsSchema = z.strictObject({
  updated_at: date,
  inclusions: z.array(
    z.strictObject({
      repository: pluginSchema.shape.repository,
      plugin_id: id.optional(),
      note: text,
      added_at: date,
    }),
  ),
});

export const githubRepositorySchema = z.strictObject({
  stars: z.number().int().nonnegative(),
  archived: z.boolean(),
});

export const githubSchema = z.strictObject({
  updated_at: date.nullable(),
  checked_at: date.nullable(),
  repositories: z.record(
    z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    githubRepositorySchema,
  ),
});

function unique(values) {
  return new Set(values).size === values.length;
}

export function readYaml(path) {
  const document = parseDocument(readFileSync(path, "utf8"), {
    uniqueKeys: true,
  });
  if (document.errors.length) {
    throw new Error(
      `${path}: ${document.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return document.toJS({ maxAliasCount: 0 });
}

export function sentenceCount(value) {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  return [...segmenter.segment(value)].filter((part) => part.segment.trim())
    .length;
}

export function repositoryKey(repository) {
  return new URL(repository).pathname.slice(1).toLowerCase();
}

export function loadMetadata(directory = root) {
  return {
    catalog: catalogSchema.parse(
      readYaml(join(directory, "registry/catalog.yaml")),
    ),
    github: githubSchema.parse(
      readYaml(join(directory, "registry/github.yaml")),
    ),
    exclusions: exclusionsSchema.parse(
      readYaml(join(directory, "registry/exclusions.yaml")),
    ),
    inclusions: inclusionsSchema.parse(
      readYaml(join(directory, "registry/inclusions.yaml")),
    ),
  };
}

export function validateRegistry(
  plugins,
  catalog,
  github,
  exclusions,
  inclusions = { updated_at: "1970-01-01", inclusions: [] },
) {
  const categories = catalog.categories.map((category) => category.id);
  inclusions = inclusionsSchema.parse(inclusions);
  const inclusionKeys = inclusions.inclusions.map(
    ({ repository, plugin_id }) =>
      `${repositoryKey(repository)}#${plugin_id?.toLowerCase() ?? ""}`,
  );
  if (!unique(inclusionKeys)) throw new Error("Duplicate inclusion seed");
  for (const inclusion of inclusions.inclusions) {
    if (
      exclusions.exclusions.some(
        (entry) =>
          repositoryKey(entry.repository) ===
            repositoryKey(inclusion.repository) &&
          (entry.scope === "repository" ||
            (inclusion.plugin_id &&
              entry.plugin_id?.toLowerCase() ===
                inclusion.plugin_id.toLowerCase())),
      )
    ) {
      throw new Error(
        `Inclusion seed ${inclusion.repository} conflicts with the exclusions list`,
      );
    }
  }
  if (!unique(categories)) throw new Error("Duplicate category ID");
  if (!unique(plugins.map((plugin) => plugin.id))) {
    throw new Error("Duplicate plugin ID");
  }
  for (const { id: pluginId, ...input } of plugins) {
    id.parse(pluginId);
    const plugin = pluginSchema.parse(input);
    const fail = (message) => {
      throw new Error(`${pluginId}: ${message}`);
    };
    if (plugin.categories.some((category) => !categories.includes(category))) {
      fail("Unknown category");
    }
    if (sentenceCount(plugin.summary) !== 1) {
      fail("Summary must contain one sentence");
    }
    const sentences = sentenceCount(plugin.description);
    if (sentences < 4 || sentences > 6) {
      fail(`Description must contain 4–6 sentences (found ${sentences})`);
    }
    if (plugin.updated_at > plugin.reviewed_at) {
      fail("updated_at cannot be later than reviewed_at");
    }
    if (
      exclusions.exclusions.some(
        (entry) =>
          entry.repository.toLowerCase() === plugin.repository.toLowerCase() &&
          (entry.scope === "repository" || entry.plugin_id === pluginId),
      )
    ) {
      fail(
        "Plugin is on the exclusions list; resolve the exclusion explicitly",
      );
    }
  }
  if (Object.keys(github.repositories).length && !github.updated_at) {
    throw new Error("GitHub statistics need an updated_at date");
  }
  if (
    github.updated_at &&
    (!github.checked_at || github.updated_at > github.checked_at)
  ) {
    throw new Error("GitHub statistics updated_at cannot follow checked_at");
  }
}

export function loadRegistry(directory = root) {
  const metadata = loadMetadata(directory);
  const plugins = readdirSync(join(directory, "registry/plugins"))
    .filter((name) => name.endsWith(".yaml"))
    .sort()
    .map((filename) => {
      const data = pluginSchema.parse(
        readYaml(join(directory, "registry/plugins", filename)),
      );
      return { id: basename(filename, ".yaml"), ...data };
    });
  if (!plugins.length) throw new Error("Registry has no plugins");
  validateRegistry(
    plugins,
    metadata.catalog,
    metadata.github,
    metadata.exclusions,
    metadata.inclusions,
  );
  return { ...metadata, plugins };
}

export function dataUpdatedAt(plugins, catalog, github, exclusions) {
  return [
    catalog.updated_at,
    github.updated_at,
    exclusions.updated_at,
    ...plugins.map((p) => p.updated_at),
  ]
    .filter(Boolean)
    .sort()
    .at(-1);
}

export function normalizeBase(base) {
  if (
    !base.startsWith("/") ||
    base.includes("..") ||
    base.includes("//") ||
    /[?#\\\s]/.test(base)
  ) {
    throw new Error(
      "BASE_PATH must be / or an absolute URL path such as /plugins/",
    );
  }
  return base.endsWith("/") ? base : `${base}/`;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  if (process.argv[2] !== "validate") {
    throw new Error("Usage: node scripts/registry.mjs validate");
  }
  const registry = loadRegistry();
  console.log(
    `Validated ${registry.plugins.length} plugins in ${registry.catalog.categories.length} categories`,
  );
}
