import { belongsToEdition, edition2024Sources } from "./item-editions.js";

export function filterItems(items, query, source = "", edition = "") {
  const normalizedQuery = normalizeSearchQuery(query);
  const selectedSources = source instanceof Set ? source : new Set(Array.isArray(source) ? source : source ? [source] : []);
  if (String(query ?? "").trim() && !normalizedQuery && selectedSources.size === 0) return [];
  const matches = items.filter((item) =>
    (!normalizedQuery || (typeof item.name === "string" && item.name.toLocaleLowerCase().includes(normalizedQuery))) &&
    (selectedSources.size === 0 || selectedSources.has(item.source)) &&
    (!edition || belongsToEdition(item, edition)),
  );
  const currentEditionNames = new Set(
    matches.filter((item) => edition2024Sources.has(item.source)).map((item) => String(item.name ?? "").toLocaleLowerCase()),
  );
  return matches.filter((item) => {
    if (edition !== "2024" || selectedSources.size || edition2024Sources.has(item.source)) return true;
    return !(item.reprintedAs ?? []).some((reprint) => {
      const uid = typeof reprint === "string" ? reprint : reprint?.uid;
      const [name, source] = String(uid ?? "").split("|");
      return edition2024Sources.has(source) && name?.toLocaleLowerCase() === String(item.name ?? "").toLocaleLowerCase() && currentEditionNames.has(name.toLocaleLowerCase());
    });
  }).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base", numeric: true }));
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

export function getSourceCounts(items) {
  const counts = new Map();
  for (const item of items) {
    if (typeof item.source === "string" && item.source.trim()) {
      counts.set(item.source, (counts.get(item.source) ?? 0) + 1);
    }
  }
  return counts;
}

export function createItemLink(item, baseUrl) {
  const url = new URL(baseUrl);
  const itemKey = `${item.source}|${encodeURIComponent(item.name ?? "")}|${item.page ?? ""}`;
  url.searchParams.set("item", itemKey);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveItemLink(items, location) {
  const url = new URL(location, "http://localhost");
  const itemKey = url.searchParams.get("item");
  if (!itemKey) return null;
  const [source, encodedName, ...pageParts] = itemKey.split("|");
  let name;
  try {
    name = decodeURIComponent(encodedName ?? "");
  } catch {
    return null;
  }
  const page = pageParts.join("|");
  return items.find((item) => item.source === source && item.name === name && String(item.page ?? "") === page) ?? null;
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
  const value = [...(item.entries ?? []), ...(item.additionalEntries ?? [])].find((entry) => typeof entry === "string");
  if (!value) return getItemStats(item).map((stat) => stat.value).join(" · ") || "No description available.";
  return value
    .replace(/\{@\w+\s+([^}|]+)(?:\|[^}]+)?\}/g, "$1")
    .replace(/\{@\w+\s*([^}]*)\}/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const damageTypeNames = { B: "bludgeoning", P: "piercing", S: "slashing", A: "acid", C: "cold", F: "fire", Force: "force", L: "lightning", N: "necrotic", Poison: "poison", Psychic: "psychic", Radiant: "radiant", Thunder: "thunder" };
const weaponPropertyNames = { A: "Ammunition", F: "Finesse", H: "Heavy", L: "Light", R: "Reach", S: "Special", T: "Thrown", V: "Versatile", "2H": "Two-Handed", AF: "Ammunition (Firearm)", BF: "Burst Fire", RLD: "Reload" };

function displayTag(tag, names = {}) {
  return names[tag] ?? tag;
}

function formatPrice(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value >= 100 && value % 100 === 0) return `${value / 100} gp`;
  if (value >= 10 && value % 10 === 0) return `${value / 10} sp`;
  return `${value} cp`;
}

export function getItemStats(item) {
  const stats = [];
  if (item.weaponCategory) stats.push({ label: "Weapon", value: `${item.weaponCategory === "simple" ? "Simple" : "Martial"} weapon` });
  if (item.ac != null) stats.push({ label: "Armor Class", value: String(item.ac) });
  if (item.dmg1) {
    const damageType = damageTypeNames[item.dmgType] ?? item.dmgType ?? "damage";
    stats.push({ label: "Damage", value: `${item.dmg1}${item.dmg2 ? ` / ${item.dmg2}` : ""} ${damageType}` });
  }
  if (item.range) stats.push({ label: "Range", value: `${item.range} ft.` });
  if (Array.isArray(item.property) && item.property.length) {
    const properties = item.property.map((property) => displayTag(String(property).split("|")[0], weaponPropertyNames));
    stats.push({ label: "Properties", value: properties.join(", ") });
  }
  if (Array.isArray(item.mastery) && item.mastery.length) {
    stats.push({ label: "Mastery", value: item.mastery.map((mastery) => String(mastery).split("|")[0]).join(", ") });
  }
  if (item.strength) stats.push({ label: "Strength", value: String(item.strength) });
  if (item.stealth) stats.push({ label: "Stealth", value: item.stealth === "disadvantage" ? "Disadvantage" : String(item.stealth) });
  const price = formatPrice(item.value);
  if (price) stats.push({ label: "Price", value: price });
  return stats;
}

export function getItemDescription(item) {
  return [...(Array.isArray(item?.entries) ? item.entries : []), ...(Array.isArray(item?.additionalEntries) ? item.additionalEntries : [])];
}
