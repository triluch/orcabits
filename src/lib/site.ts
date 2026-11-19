import { getCollection } from "astro:content";
import { sortRanks } from "./sorting.mjs";
import {
  dataUpdatedAt,
  loadMetadata,
  normalizeBase,
  repositoryKey,
  statusNames,
} from "../../scripts/registry.mjs";

export { statusNames };
export const base = normalizeBase(import.meta.env.BASE_URL);
export const href = (path = "") => `${base}${path}`;
export const { catalog, github, exclusions } = loadMetadata(process.cwd());
export const categoryNames = Object.fromEntries(
  catalog.categories.map((category) => [category.id, category.name]),
);

export const plugins = (await getCollection("plugins")).sort((a, b) =>
  a.data.name.localeCompare(b.data.name, "en", { numeric: true }),
);
export const updatedAt = dataUpdatedAt(
  plugins.map((plugin) => plugin.data),
  catalog,
  github,
  exclusions,
);
export const statistics = (repository: string) =>
  github.repositories[repositoryKey(repository)];
export const pluginStatus = (data: {
  repository: string;
  status: keyof typeof statusNames;
}) => (statistics(data.repository)?.archived ? "archived" : data.status);
export const pluginSortRanks = sortRanks(
  plugins.map(({ id, data }) => ({
    id,
    name: data.name,
    category: data.categories
      .map((category: string) => categoryNames[category])
      .sort((a: string, b: string) => a.localeCompare(b, "en"))[0],
    status: statusNames[pluginStatus(data)],
    stars: statistics(data.repository)?.stars,
  })),
);
export const displayDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));

const repository = process.env.REPOSITORY_URL || "";
if (
  repository &&
  !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(repository)
) {
  throw new Error("REPOSITORY_URL must be a GitHub repository URL or unset");
}
export const repositoryUrl = repository.replace(/\/$/, "");
export const issuesUrl = repositoryUrl ? `${repositoryUrl}/issues` : "";
