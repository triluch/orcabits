import { rename, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { stringify } from "yaml";
import {
  githubSchema,
  githubRepositorySchema,
  loadRegistry,
  repositoryKey,
  root,
} from "./registry.mjs";

export async function refreshSnapshot(
  plugins,
  previous,
  {
    request = fetch,
    token = process.env.GITHUB_TOKEN,
    today = new Date().toISOString().slice(0, 10),
  } = {},
) {
  const repositories = {};
  const keys = [
    ...new Set(plugins.map((p) => repositoryKey(p.repository))),
  ].sort();
  for (const repo of keys) {
    const response = await request(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(20_000),
      redirect: "error",
    });
    if (!response.ok) {
      throw new Error(
        `GitHub ${repo}: HTTP ${response.status}; snapshot not changed`,
      );
    }
    const data = await response.json();
    repositories[repo] = githubRepositorySchema.parse({
      stars: data.stargazers_count,
      archived: data.archived,
    });
  }
  return githubSchema.parse({
    updated_at: isDeepStrictEqual(previous.repositories, repositories)
      ? previous.updated_at
      : today,
    checked_at: today,
    repositories,
  });
}

export async function updateGithub(directory = root, options = {}) {
  const { plugins, github } = loadRegistry(directory);
  const snapshot = await refreshSnapshot(plugins, github, options);
  const path = join(directory, "registry/github.yaml");
  const temporary = `${path}.tmp`;
  await writeFile(temporary, stringify(snapshot), { flag: "w" });
  await rename(temporary, path);
  return snapshot;
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const snapshot = await updateGithub();
  console.log(
    `Saved statistics for ${Object.keys(snapshot.repositories).length} repositories`,
  );
}
