import { filterItems, getItemSummary } from "./item-filter.js";

const searchInput = document.querySelector("#search-input");
const grid = document.querySelector("#items-grid");
const resultCount = document.querySelector("#result-count");
const caption = document.querySelector("#list-caption");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const sourceToggle = document.querySelector("#source-toggle");
const sourceLabel = document.querySelector("#source-toggle-label");
const sourcePanel = document.querySelector("#source-options");
const clearSources = document.querySelector("#clear-sources");
let items = [];
const selectedSources = new Set();

const icons = ["✳", "◇", "⌘", "✦", "◈", "✺"];
const rarityClass = (rarity = "common") => rarity.toLowerCase().replace(/[^a-z]/g, "");

function render() {
  const visibleItems = filterItems(items, searchInput.value, selectedSources);
  resultCount.textContent = visibleItems.length.toLocaleString();
  caption.textContent = searchInput.value.trim() || selectedSources.size ? "FILTERED ITEMS" : "ALL ITEMS";
  grid.replaceChildren(...visibleItems.map((item, index) => {
    const card = document.createElement("article");
    card.className = "item-card";
    const top = document.createElement("div");
    top.className = "card-top";
    const icon = document.createElement("span");
    icon.className = "item-icon";
    icon.textContent = icons[index % icons.length];
    const rarity = document.createElement("span");
    rarity.className = `rarity ${rarityClass(item.rarity)}`;
    rarity.textContent = item.rarity || "Uncommon";
    top.append(icon, rarity);
    const title = document.createElement("h3");
    title.textContent = item.name || "Unnamed item";
    const summary = document.createElement("p");
    summary.className = "item-summary";
    summary.textContent = getItemSummary(item);
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const source = document.createElement("span");
    source.textContent = item.source || "Unknown source";
    const type = document.createElement("span");
    type.textContent = item.wondrous ? "WONDROUS ITEM" : (item.type || "MAGIC ITEM").toUpperCase();
    meta.append(source, type);
    card.append(top, title, summary, meta);
    return card;
  }));
  emptyState.hidden = visibleItems.length > 0;
}

searchInput.addEventListener("input", render);
sourceToggle.addEventListener("click", () => {
  const opening = sourcePanel.hidden;
  sourcePanel.hidden = !opening;
  sourceToggle.setAttribute("aria-expanded", String(opening));
});
sourcePanel.addEventListener("change", (event) => {
  const checkbox = event.target.closest("input[type='checkbox']");
  if (!checkbox) return;
  if (checkbox.checked) selectedSources.add(checkbox.value);
  else selectedSources.delete(checkbox.value);
  updateSourceLabel();
  render();
});
clearSources.addEventListener("click", () => {
  selectedSources.clear();
  sourcePanel.querySelectorAll("input[type='checkbox']").forEach((checkbox) => { checkbox.checked = false; });
  updateSourceLabel();
  render();
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".source-picker")) {
    sourcePanel.hidden = true;
    sourceToggle.setAttribute("aria-expanded", "false");
  }
});

function updateSourceLabel() {
  const count = selectedSources.size;
  sourceLabel.textContent = count ? `${count} source${count === 1 ? "" : "s"} selected` : "All sources";
}

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    render();
    searchInput.blur();
  }
});

try {
  const manifestResponse = await fetch("/data/manifest.json");
  if (!manifestResponse.ok) throw new Error("Could not load the item archive manifest.");
  const manifest = await manifestResponse.json();
  const groups = await Promise.all(manifest.sources.map(async ({ code, file }) => {
    const response = await fetch(`/data/${file}`);
    if (!response.ok) throw new Error(`Could not load the ${code} item dataset.`);
    return response.json();
  }));
  items = groups.flat();
  sourcePanel.replaceChildren(...manifest.sources.map(({ code, count }) => {
    const label = document.createElement("label");
    label.className = "source-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = code;
    const name = document.createElement("span");
    name.textContent = code;
    const itemCount = document.createElement("small");
    itemCount.className = "source-count";
    itemCount.textContent = count.toLocaleString();
    label.append(checkbox, name, itemCount);
    return label;
  }));
  loadingState.remove();
  render();
} catch (error) {
  loadingState.textContent = "The archive could not be opened. Please refresh to try again.";
  console.error(error);
}
