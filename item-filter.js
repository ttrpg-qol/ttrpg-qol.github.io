import { belongsToEdition } from "./item-editions.js";

export function filterItems(items, query, source = "", edition = "") {
  const normalizedQuery = normalizeSearchQuery(query);
  const selectedSources = source instanceof Set ? source : new Set(Array.isArray(source) ? source : source ? [source] : []);
  if (String(query ?? "").trim() && !normalizedQuery && selectedSources.size === 0) return [];
  return items.filter((item) =>
    (!normalizedQuery || (typeof item.name === "string" && item.name.toLocaleLowerCase().includes(normalizedQuery))) &&
    (selectedSources.size === 0 || selectedSources.has(item.source)) &&
    (!edition || belongsToEdition(item, edition)),
  ).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base", numeric: true }));
}

export function normalizeSearchQuery(query) {
  const trimmedQuery = String(query ?? "").trim();
  return trimmedQuery.replace(/\s/g, "").length >= 3 ? trimmedQuery.toLocaleLowerCase() : "";
}

export function shouldShowItems(query, sources, editionSelected = false) {
  return Boolean(normalizeSearchQuery(query) || sources?.size || editionSelected);
}

export function getSources(items) {
  return [...new Set(items.map((item) => item.source).filter((source) => typeof source === "string" && source.trim()))]
    .sort((a, b) => a.localeCompare(b));
}

export function parseEntryMarkup(text) {
  const source = String(text ?? "");
  const tokens = [];
  const pattern = /\{@([\w-]+)\s+([^}]*)\}/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > cursor) tokens.push({ type: "text", value: source.slice(cursor, match.index) });
    const [, tag, rawValue] = match;
    const parts = rawValue.split("|");
    const value = (parts.length > 2 ? parts.at(-1) : parts[0]).trim();
    if (["b", "bold", "strong"].includes(tag)) tokens.push({ type: "bold", value });
    else if (["i", "italic", "em"].includes(tag)) tokens.push({ type: "italic", value });
    else if (tag === "dc") tokens.push({ type: "tag", tag, value: `DC ${value}` });
    else if (tag === "hit") tokens.push({ type: "tag", tag, value: `${value} to hit` });
    else if (tag === "recharge") tokens.push({ type: "tag", tag, value: `Recharge ${value === "6" ? "6" : "5–6"}` });
    else if (tag === "chance") tokens.push({ type: "tag", tag, value: `${value}% chance` });
    else tokens.push({ type: "tag", tag, value });
    cursor = pattern.lastIndex;
  }

  if (cursor < source.length) tokens.push({ type: "text", value: source.slice(cursor) });
  return tokens;
}

export function getItemSummary(item) {
  const value = item.entries?.find((entry) => typeof entry === "string");
  if (!value) return "No description available.";
  return value
    .replace(/\{@\w+\s+([^}|]+)(?:\|[^}]+)?\}/g, "$1")
    .replace(/\{@\w+\s*([^}]*)\}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function getItemDescription(item) {
  return [...(Array.isArray(item?.entries) ? item.entries : []), ...(Array.isArray(item?.additionalEntries) ? item.additionalEntries : [])];
}
