export function filterItems(items, query, source = "") {
  const normalizedQuery = String(query ?? "").trim().toLocaleLowerCase();
  const selectedSources = source instanceof Set ? source : new Set(Array.isArray(source) ? source : source ? [source] : []);
  if (!normalizedQuery && selectedSources.size === 0) return items;
  return items.filter((item) =>
    (!normalizedQuery || (typeof item.name === "string" && item.name.toLocaleLowerCase().includes(normalizedQuery))) &&
    (selectedSources.size === 0 || selectedSources.has(item.source)),
  );
}

export function getSources(items) {
  return [...new Set(items.map((item) => item.source).filter((source) => typeof source === "string" && source.trim()))]
    .sort((a, b) => a.localeCompare(b));
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
