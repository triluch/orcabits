const names = new Intl.Collator("en", { numeric: true });

/** @returns {Record<string, Record<string, number>>} */
export function sortRanks(plugins) {
  const ranks = Object.fromEntries(plugins.map(({ id }) => [id, {}]));
  const byName = (a, b) =>
    names.compare(a.name, b.name) || a.id.localeCompare(b.id, "en");
  for (const mode of ["name", "category", "status", "stars"]) {
    [...plugins]
      .sort(
        (a, b) =>
          (mode === "stars"
            ? (b.stars ?? -1) - (a.stars ?? -1)
            : mode === "name"
              ? 0
              : a[mode].localeCompare(b[mode], "en")) || byName(a, b),
      )
      .forEach(({ id }, index) => {
        ranks[id][mode] = index;
      });
  }
  return ranks;
}
