await customElements.whenDefined("pagefind-input");

const instance =
  window.PagefindComponents.getInstanceManager().getInstance("default");
const catalogue = document.querySelector(".catalogue");
const sort = catalogue.querySelector("#sort-order");
const groups = ["category", "status"];
const searchTerm = () =>
  catalogue.querySelector("pagefind-input input")?.value ?? instance.searchTerm;
const selection = (group) =>
  [...catalogue.querySelectorAll(`input[name="${group}"]:checked`)].map(
    (input) => input.value,
  );

function updateFilters() {
  const selected = Object.fromEntries(
    groups.map((group) => [group, selection(group)]),
  );
  for (const group of groups) {
    const count = selected[group].length;
    catalogue.querySelector(`.clear-filter[data-filter="${group}"]`).disabled =
      count === 0;
    catalogue.querySelector(
      `.filter-dropdown[data-filter="${group}"] [data-filter-count]`,
    ).textContent = count ? ` (${count})` : "";
  }
  instance.triggerSearchWithFilters(
    searchTerm(),
    Object.fromEntries(
      groups
        .filter((group) => selected[group].length)
        .map((group) => [group, { any: selected[group] }]),
    ),
  );
}

for (const group of groups) {
  const dropdown = catalogue.querySelector(
    `.filter-dropdown[data-filter="${group}"]`,
  );
  dropdown.querySelector("fieldset").disabled = false;
  dropdown.addEventListener("change", updateFilters);
  catalogue
    .querySelector(`.clear-filter[data-filter="${group}"]`)
    .addEventListener("click", () => {
      for (const input of dropdown.querySelectorAll("input"))
        input.checked = false;
      updateFilters();
    });
}
sort.disabled = false;
sort.addEventListener("change", () => {
  // Dynamic sorting uses the exposed searchSort property in pinned Pagefind 1.6.
  instance.searchSort = { [sort.value]: "asc" };
  instance.triggerSearch(searchTerm());
});

document.addEventListener("click", (event) => {
  for (const dropdown of catalogue.querySelectorAll(".filter-dropdown[open]")) {
    if (!dropdown.parentElement.contains(event.target)) dropdown.open = false;
  }
});
catalogue.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const dropdown = catalogue.querySelector(".filter-dropdown[open]");
  if (dropdown) {
    dropdown.open = false;
    dropdown.querySelector("summary").focus();
  }
});
