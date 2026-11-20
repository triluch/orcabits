import { expect, test } from "@playwright/test";
import {
  dataUpdatedAt,
  loadRegistry,
  repositoryKey,
  statusNames,
} from "../../scripts/registry.mjs";

const registry = loadRegistry();
const categoryName = (plugin) =>
  plugin.categories
    .map(
      (id) =>
        registry.catalog.categories.find((category) => category.id === id).name,
    )
    .sort((a, b) => a.localeCompare(b, "en"))[0];
const statusName = (plugin) =>
  statusNames[
    registry.github.repositories[repositoryKey(plugin.repository)]?.archived
      ? "archived"
      : plugin.status
  ];
const stars = (plugin) =>
  registry.github.repositories[repositoryKey(plugin.repository)]?.stars ?? -1;
function orderedNames(mode, categories = [], statuses = []) {
  return registry.plugins
    .filter(
      (plugin) =>
        (!categories.length ||
          categories.some((id) => plugin.categories.includes(id))) &&
        (!statuses.length || statuses.includes(statusName(plugin))),
    )
    .sort(
      (a, b) =>
        (mode === "stars"
          ? stars(b) - stars(a)
          : mode === "category"
            ? categoryName(a).localeCompare(categoryName(b), "en")
            : mode === "status"
              ? statusName(a).localeCompare(statusName(b), "en")
              : 0) || a.name.localeCompare(b.name, "en", { numeric: true }),
    )
    .map((plugin) => plugin.name);
}

async function expectResultOrder(page, expected) {
  const items = page.locator("pagefind-results .pf-results > li");
  await expect(items).toHaveCount(expected.length);
  await expect(page.locator("pagefind-results h2 a")).toHaveText(expected);
}

test("multi-select filters preserve the chosen sort and default to highest stars first", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".site-footer")).toContainText(
    "Plugins are not tested by this catalogue. Safety notice",
  );
  const sort = page.getByLabel("Sort by", { exact: true });
  await expect(sort).toHaveValue("stars");
  const category = page.locator('.filter-dropdown[data-filter="category"]');
  const status = page.locator('.filter-dropdown[data-filter="status"]');
  await expect(category.locator("summary")).toHaveText("Category");
  await expect(status.locator("summary")).toHaveText("Status");
  for (const [index, name] of orderedNames("stars").slice(0, 3).entries()) {
    await expect(page.locator("pagefind-results h2 a").nth(index)).toHaveText(
      name,
    );
  }
  await sort.selectOption("status");
  for (const [index, name] of orderedNames("status").slice(0, 3).entries()) {
    await expect(page.locator("pagefind-results h2 a").nth(index)).toHaveText(
      name,
    );
  }
  await sort.selectOption("stars");
  for (const [index, name] of orderedNames("stars").slice(0, 3).entries()) {
    await expect(page.locator("pagefind-results h2 a").nth(index)).toHaveText(
      name,
    );
  }
  const clearCategory = page.getByRole("button", {
    name: "Clear category",
    exact: true,
  });
  const clearStatus = page.getByRole("button", {
    name: "Clear status",
    exact: true,
  });
  await expect(clearCategory).toBeDisabled();
  await expect(clearCategory).toHaveAttribute("title", "Clear category");
  await expect(clearCategory).toHaveText("");
  await expect(clearStatus).toBeDisabled();
  await expect(clearStatus).toHaveAttribute("title", "Clear status");

  await category.locator("summary").click();
  await category.getByText("AI and automation", { exact: true }).click();
  await expect(sort).toHaveValue("stars");
  for (const item of registry.catalog.categories) {
    await expect(category.getByText(item.name, { exact: true })).toBeVisible();
  }
  await category.getByText("Analysis and costing", { exact: true }).click();
  await page.getByRole("heading", { level: 1 }).click();
  const selected = ["ai-and-automation", "analysis-and-costing"];
  await expectResultOrder(page, orderedNames("stars", selected));

  await status.locator("summary").click();
  await status.getByText("Experimental", { exact: true }).click();
  await expect(sort).toHaveValue("stars");
  await expect(status.getByText("Available", { exact: true })).toBeVisible();
  await status.getByText("Available", { exact: true }).click();
  await page.getByRole("heading", { level: 1 }).click();
  await expectResultOrder(page, orderedNames("stars", selected));

  await sort.selectOption("name");
  await expectResultOrder(page, orderedNames("name", selected));
  await sort.selectOption("category");
  await expectResultOrder(page, orderedNames("category", selected));
  await sort.selectOption("stars");
  await expectResultOrder(page, orderedNames("stars", selected));
  await clearStatus.click();
  await expect(sort).toHaveValue("stars");
  await expect(clearStatus).toBeDisabled();
  await expectResultOrder(page, orderedNames("stars", selected));
  await sort.selectOption("name");
  await clearCategory.click();
  await expect(sort).toHaveValue("name");
  await expect(clearCategory).toBeDisabled();
  await expect(page.locator("pagefind-results h2 a").first()).toHaveText(
    orderedNames("name")[0],
  );
  const search = page.locator("pagefind-input input");
  await search.fill('"PipSpool Slot Sync"');
  await sort.selectOption("category");
  await expect(search).toHaveValue('"PipSpool Slot Sync"');
  await expect(page.locator("pagefind-results h2 a")).toHaveText([
    "PipSpool Slot Sync",
  ]);
});

test("renders the complete faceted catalogue, search, combined filters and no results", async ({
  page,
}) => {
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("./");
  const cards = page.locator("pagefind-results .plugin-card");
  await expect(cards.first()).toBeVisible();
  await expect(page.locator("pagefind-results .pf-results")).toHaveCSS(
    "display",
    "grid",
  );
  await expect(page.locator(".site-footer time")).toHaveAttribute(
    "datetime",
    dataUpdatedAt(
      registry.plugins,
      registry.catalog,
      registry.github,
      registry.exclusions,
    ),
  );
  const search = page.locator("pagefind-input input");
  await search.fill("PipSpool");
  await expect(
    cards.getByRole("link", { name: "PipSpool", exact: true }),
  ).toBeVisible();
  await expect(
    cards.getByRole("link", { name: "PipSpool Slot Sync", exact: true }),
  ).toBeVisible();
  await search.fill('"xyqwv987654321notacatalogueentry"');
  await expect(cards).toHaveCount(0);
  await expect(page.locator("pagefind-summary")).toContainText(/no|0/i);
  await search.fill("");
  const category = page.locator('.filter-dropdown[data-filter="category"]');
  await category.locator("summary").click();
  await category.getByText("AI and automation", { exact: true }).click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect(cards.first()).toContainText("AI and automation");
  const status = page.locator('.filter-dropdown[data-filter="status"]');
  await status.locator("summary").click();
  await status.getByText("Experimental", { exact: true }).click();
  await page.getByRole("heading", { level: 1 }).click();
  await expect.poll(async () => cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) {
    await expect(card).toContainText("Experimental");
    await expect(card).toContainText("AI and automation");
  }
  await cards.first().getByRole("link").click();
  await expect(
    page.getByRole("heading", { name: "Installation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Features and compatibility are based on the author's declarations",
      { exact: false },
    ),
  ).toBeVisible();
  expect(failures).toEqual([]);
});

test("all data entries have detail links and safety disclosure", async ({
  page,
}) => {
  await page.goto("./all/");
  await expect(page.locator(".plugin-card")).toHaveCount(
    registry.plugins.length,
  );
  await page.locator(".plugin-card a").first().click();
  await expect(
    page.getByRole("heading", { name: "What it does" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "About & safety" }).click();
  await expect(
    page.getByRole("heading", { name: "Listed does not mean tested or safe" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Is this page made with AI?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Yes.", { exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(
    /Confirmed exclusions|future updates|when the repository is chosen|will be added here/,
  );
});

test("the static list and details work without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}all/`);
  await expect(page.locator(".plugin-card")).toHaveCount(
    registry.plugins.length,
  );
  await page.locator(".plugin-card a").first().click();
  await expect(
    page.getByRole("heading", { name: "Installation", exact: true }),
  ).toBeVisible();
  await context.close();
});

test("catalogue controls fit on a phone and reporting links follow configuration", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(
    page.locator("pagefind-results .plugin-card").first(),
  ).toBeVisible();
  await expect(page.locator("pagefind-input input")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const [group, value] of [
    ["category", "AI and automation"],
    ["status", "Experimental"],
  ]) {
    const dropdown = page.locator(`.filter-dropdown[data-filter="${group}"]`);
    await dropdown.locator("summary").click();
    await dropdown.getByRole("checkbox", { name: value, exact: true }).check();
    await page.keyboard.press("Escape");
    await expect(dropdown.locator("summary")).toBeFocused();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "About & safety" }).click();
  const issueLink = page.getByRole("link", {
    name: "open an issue in the catalogue repository",
  });
  if (process.env.REPOSITORY_URL) {
    await expect(issueLink).toHaveAttribute(
      "href",
      `${process.env.REPOSITORY_URL.replace(/\/$/, "")}/issues`,
    );
    for (const name of [
      "Open an issue to suggest it",
      "open an issue to request removal",
    ]) {
      await expect(
        page.getByRole("link", { name, exact: true }),
      ).toHaveAttribute(
        "href",
        `${process.env.REPOSITORY_URL.replace(/\/$/, "")}/issues`,
      );
    }
  } else {
    await expect(issueLink).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Report suspicious or malicious plugins",
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Suggest a plugin", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Request removal", exact: true }),
    ).toHaveCount(0);
  }
});
