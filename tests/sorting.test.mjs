import assert from "node:assert/strict";
import test from "node:test";
import { sortRanks } from "../src/lib/sorting.mjs";

test("sorting groups by category/status and breaks ties by natural name order", () => {
  const plugins = [
    { id: "z", name: "Zebra", category: "Analysis", status: "Available" },
    { id: "b", name: "Beta", category: "Modeling", status: "Experimental" },
    { id: "a", name: "alpha", category: "Modeling", status: "Available" },
    { id: "d", name: "Delta", category: "Analysis", status: "Experimental" },
  ];
  const ranks = sortRanks(plugins);
  const order = (mode) =>
    [...plugins]
      .sort((a, b) => ranks[a.id][mode] - ranks[b.id][mode])
      .map((p) => p.id);
  assert.deepEqual(order("name"), ["a", "b", "d", "z"]);
  assert.deepEqual(order("category"), ["d", "z", "a", "b"]);
  assert.deepEqual(order("status"), ["a", "z", "b", "d"]);
  assert.equal(plugins[0].id, "z");
  const numbered = sortRanks([
    { id: "ten", name: "Plugin 10", category: "Tools", status: "Available" },
    { id: "two", name: "Plugin 2", category: "Tools", status: "Available" },
  ]);
  for (const mode of ["name", "category", "status"]) {
    assert.ok(numbered.two[mode] < numbered.ten[mode]);
  }
});

test("stars sort numerically highest first, then by name, with unknown counts last", () => {
  const plugins = [
    { id: "three", name: "Three", stars: 3 },
    { id: "unknown", name: "A missing count" },
    { id: "twenty-z", name: "Zebra", stars: 20 },
    { id: "zero", name: "Zero", stars: 0 },
    { id: "hundred", name: "Hundred", stars: 100 },
    { id: "twenty-a", name: "Alpha", stars: 20 },
  ].map((plugin) => ({ ...plugin, category: "Tools", status: "Available" }));
  const ranks = sortRanks(plugins);
  assert.deepEqual(
    [...plugins]
      .sort((a, b) => ranks[a.id].stars - ranks[b.id].stars)
      .map((p) => p.id),
    ["hundred", "twenty-a", "twenty-z", "three", "zero", "unknown"],
  );
});
