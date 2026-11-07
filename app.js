import { createItemLink, filterItems, getItemDescription, getItemStats, getItemSummary, getSourceCounts, normalizeSearchQuery, parseEntryMarkup, resolveItemLink, shouldShowItems } from "./item-filter.js";
import { getSourceLabel, getSourceName, matchesSourceSearch } from "./source-names.js";

const searchInput = document.querySelector("#search-input");
const grid = document.querySelector("#items-grid");
const resultCount = document.querySelector("#result-count");
const caption = document.querySelector("#list-caption");
const emptyState = document.querySelector("#empty-state");
const loadingState = document.querySelector("#loading-state");
const sourceToggle = document.querySelector("#source-toggle");
const sourceLabel = document.querySelector("#source-toggle-label");
const sourcePanel = document.querySelector("#source-options");
const sourceSearch = document.querySelector("#source-search");
const sourceList = document.querySelector("#source-list");
const sourceNoResults = document.querySelector("#source-no-results");
const clearSources = document.querySelector("#clear-sources");
const editionOptions = [...document.querySelectorAll(".edition-option")];
const itemDialog = document.querySelector("#item-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const dialogMeta = document.querySelector("#dialog-meta");
const dialogDescription = document.querySelector("#dialog-description");
const dialogClose = document.querySelector("#dialog-close");
let items = [];
const selectedSources = new Set();
let selectedEdition = "2014";
let editionSelected = false;

const icons = ["✳", "◇", "⌘", "✦", "◈", "✺"];
const rarityClass = (rarity = "common") => rarity.toLowerCase().replace(/[^a-z]/g, "");
const getItemKind = (item) => item.wondrous ? "Wondrous item" : item.weapon ? `${item.weaponCategory === "simple" ? "Simple" : item.weaponCategory === "martial" ? "Martial" : "Weapon"} weapon` : item.ac != null ? "Armor" : item.type && !/^[A-Z]+(?:\|[A-Z0-9]+)?$/.test(item.type) ? item.type : "Equipment";

function render() {
  const canBrowse = shouldShowItems(searchInput.value, selectedSources, editionSelected);
  const visibleItems = canBrowse ? filterItems(items, searchInput.value, selectedSources, selectedEdition) : [];
  resultCount.textContent = visibleItems.length.toLocaleString();
  caption.textContent = canBrowse ? "FILTERED ITEMS" : "ADD A FILTER TO BEGIN";
  grid.replaceChildren(...visibleItems.map((item, index) => {
    const card = document.createElement("a");
    card.className = "item-card";
    card.href = createItemLink(item, window.location.href);
    card.dataset.itemIndex = String(items.indexOf(item));
    card.setAttribute("aria-label", `View full description for ${item.name || "Unnamed item"}`);
    const top = document.createElement("div");
    top.className = "card-top";
    const icon = document.createElement("span");
    icon.className = "item-icon";
    icon.textContent = icons[index % icons.length];
    const rarity = document.createElement("span");
    rarity.className = `rarity ${rarityClass(item.rarity === "none" ? "common" : item.rarity)}`;
    rarity.textContent = item.rarity && item.rarity !== "none" ? item.rarity : getItemKind(item);
    top.append(icon, rarity);
    const title = document.createElement("h3");
    title.textContent = item.name || "Unnamed item";
    const summary = document.createElement("p");
    summary.className = "item-summary";
    summary.textContent = getItemSummary(item);
    const meta = document.createElement("div");
    meta.className = "card-meta";
    const source = document.createElement("span");
    source.textContent = item.source ? getSourceLabel(item.source) : "Unknown source";
    const type = document.createElement("span");
    type.textContent = getItemKind(item).toUpperCase();
    meta.append(source, type);
    card.append(top, title, summary, meta);
    return card;
  }));
  emptyState.hidden = visibleItems.length > 0;
  emptyState.querySelector("h3").textContent = canBrowse ? "No artifacts found" : "Your collection is ready";
  emptyState.querySelector("p").textContent = canBrowse
    ? "Try another name or a shorter search."
    : "Select a source or enter at least 3 characters to browse items.";
  updateSourceOptions();
}

function appendInlineText(parent, value) {
  for (const token of parseEntryMarkup(value)) {
    if (token.type === "text") {
      parent.append(document.createTextNode(token.value));
      continue;
    }
    const element = document.createElement(token.type === "bold" ? "strong" : token.type === "italic" ? "em" : "span");
    if (token.type === "tag") {
      element.className = "game-tag";
      element.dataset.tag = token.tag;
    }
    element.textContent = token.value;
    parent.append(element);
  }
}

function appendEntry(parent, entry) {
  if (typeof entry === "string") {
    const paragraph = document.createElement("p");
    appendInlineText(paragraph, entry);
    parent.append(paragraph);
    return;
  }
  if (!entry || typeof entry !== "object") return;

  if (entry.type === "table") {
    const wrap = document.createElement("div");
    wrap.className = "detail-table-wrap";
    const table = document.createElement("table");
    if (entry.caption) {
      const caption = document.createElement("caption");
      appendInlineText(caption, entry.caption);
      table.append(caption);
    }
    if (entry.colLabels?.length) {
      const head = document.createElement("thead");
      const row = document.createElement("tr");
      for (const label of entry.colLabels) {
        const cell = document.createElement("th");
        appendInlineText(cell, label);
        row.append(cell);
      }
      head.append(row);
      table.append(head);
    }
    const body = document.createElement("tbody");
    for (const values of entry.rows ?? []) {
      const row = document.createElement("tr");
      for (const value of values) {
        const cell = document.createElement("td");
        appendInlineText(cell, typeof value === "string" ? value : String(value ?? ""));
        row.append(cell);
      }
      body.append(row);
    }
    table.append(body);
    wrap.append(table);
    parent.append(wrap);
    return;
  }

  if (entry.type === "list") {
    const list = document.createElement(entry.style === "ordered" ? "ol" : "ul");
    for (const value of entry.items ?? []) {
      const item = document.createElement("li");
      appendEntry(item, value);
      list.append(item);
    }
    parent.append(list);
    return;
  }

  if (entry.type === "quote") {
    const quote = document.createElement("blockquote");
    for (const child of entry.entries ?? []) appendEntry(quote, child);
    parent.append(quote);
    return;
  }

  if (entry.name) {
    const heading = document.createElement(entry.type === "inset" ? "h4" : "h3");
    heading.className = "detail-entry-heading";
    appendInlineText(heading, entry.name);
    parent.append(heading);
  }
  if (Array.isArray(entry.entries)) {
    const content = entry.type === "inset" ? document.createElement("aside") : document.createElement("div");
    content.className = entry.type === "inset" ? "detail-inset" : "detail-entry-group";
    for (const child of entry.entries) appendEntry(content, child);
    parent.append(content);
  } else if (entry.entry) {
    appendEntry(parent, entry.entry);
  }
}

function openItem(item) {
  dialogTitle.textContent = item.name || "Unnamed item";
  dialogMeta.replaceChildren();
  for (const value of [item.rarity && item.rarity !== "none" ? item.rarity : null, item.source ? getSourceLabel(item.source) : null, getItemKind(item), item.weight ? `${item.weight} lb.` : null, item.reqAttune ? `Attunement: ${item.reqAttune === true ? "required" : item.reqAttune}` : null].filter(Boolean)) {
    const chip = document.createElement("span");
    chip.className = "detail-chip";
    chip.textContent = String(value).toUpperCase();
    dialogMeta.append(chip);
  }
  dialogDescription.replaceChildren();
  const stats = getItemStats(item);
  if (stats.length) {
    const list = document.createElement("dl");
    list.className = "detail-stats";
    for (const { label, value } of stats) {
      const term = document.createElement("dt");
      term.textContent = label;
      const description = document.createElement("dd");
      description.textContent = value;
      list.append(term, description);
    }
    dialogDescription.append(list);
  }
  const description = getItemDescription(item);
  if (description.length) {
    for (const entry of description) appendEntry(dialogDescription, entry);
  } else if (!stats.length) {
    const paragraph = document.createElement("p");
    paragraph.className = "detail-empty";
    paragraph.textContent = "No description available for this item.";
    dialogDescription.append(paragraph);
  }
  itemDialog.showModal();
}

function closeItemDialog() {
  if (!itemDialog.open) return;
  if (history.state?.itemDetail) {
    history.back();
    return;
  }
  const url = new URL(window.location.href);
  url.searchParams.delete("item");
  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  itemDialog.close();
}

searchInput.addEventListener("input", render);
grid.addEventListener("click", (event) => {
  const card = event.target.closest(".item-card");
  if (!card || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const item = items[Number(card.dataset.itemIndex)];
  history.pushState({ ...history.state, itemDetail: true }, "", card.href);
  openItem(item);
});
dialogClose.addEventListener("click", closeItemDialog);
itemDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeItemDialog();
});
itemDialog.addEventListener("click", (event) => {
  if (event.target === itemDialog) closeItemDialog();
});
window.addEventListener("popstate", () => {
  const item = resolveItemLink(items, window.location.href);
  if (item) openItem(item);
  else if (itemDialog.open) itemDialog.close();
});
sourceToggle.addEventListener("click", () => {
  const opening = sourcePanel.hidden;
  sourcePanel.hidden = !opening;
  sourceToggle.setAttribute("aria-expanded", String(opening));
  if (opening) sourceSearch.focus();
});
sourceSearch.addEventListener("input", updateSourceOptions);
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
  sourceSearch.value = "";
  updateSourceOptions();
  updateSourceLabel();
  render();
});
editionOptions.forEach((option) => option.addEventListener("click", () => {
  selectedEdition = option.dataset.edition;
  editionSelected = true;
  editionOptions.forEach((button) => button.setAttribute("aria-pressed", String(button === option)));
  render();
}));
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

function updateSourceOptions() {
  const nameQuery = normalizeSearchQuery(searchInput.value);
  const relevantItems = filterItems(items, nameQuery, "", selectedEdition);
  const sourceCounts = getSourceCounts(relevantItems);
  const labels = [...sourceList.querySelectorAll(".source-option")];
  let visibleCount = 0;
  for (const label of labels) {
    const count = sourceCounts.get(label.dataset.code) ?? 0;
    label.querySelector(".source-count").textContent = count.toLocaleString();
    const visible = count > 0 && matchesSourceSearch(label.dataset.code, sourceSearch.value);
    label.hidden = !visible;
    if (visible) visibleCount++;
  }
  sourceNoResults.textContent = sourceSearch.value.trim()
    ? "No matching sources for these filters."
    : "No sources available for these filters.";
  sourceNoResults.hidden = visibleCount > 0;
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
  sourceList.replaceChildren(...[...manifest.sources].sort((a, b) => getSourceName(a.code).localeCompare(getSourceName(b.code))).map(({ code, count }) => {
    const label = document.createElement("label");
    label.className = "source-option";
    label.dataset.code = code;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = code;
    const name = document.createElement("span");
    name.className = "source-name";
    name.textContent = getSourceName(code);
    name.title = code;
    const abbreviation = document.createElement("small");
    abbreviation.className = "source-abbreviation";
    abbreviation.textContent = code;
    const itemCount = document.createElement("small");
    itemCount.className = "source-count";
    itemCount.textContent = count.toLocaleString();
    label.append(checkbox, name, abbreviation, itemCount);
    return label;
  }));
  updateSourceOptions();
  loadingState.remove();
  render();
  const linkedItem = resolveItemLink(items, window.location.href);
  if (linkedItem) openItem(linkedItem);
} catch (error) {
  loadingState.textContent = "The archive could not be opened. Please refresh to try again.";
  console.error(error);
}
