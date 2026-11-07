import test from "node:test";
import assert from "node:assert/strict";
import { filterItems, getItemDescription, getItemSummary, getSources, normalizeSearchQuery, parseEntryMarkup, shouldShowItems } from "./item-filter.js";
import { getSourceLabel, getSourceName, matchesSourceSearch, sourceNames } from "./source-names.js";
import { belongsToEdition, EDITION_CUTOFF, edition2024Sources, getItemEditions, sourcePublishedDates } from "./item-editions.js";

const items = [
  { name: "+1 All-Purpose Tool", source: "TCE" },
  { name: "Amulet of the Devout", source: "DMG" },
  { name: "Arcane Grimoire", source: "TCE" },
  { name: "Arcane Grimoire", source: "BMT" },
];

test("returns all items for an empty or whitespace query", () => {
  const sortedNames = [...items].map(({ name }) => name).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
  assert.deepEqual(filterItems(items, "").map(({ name }) => name), sortedNames);
  assert.deepEqual(filterItems(items, "  ").map(({ name }) => name), sortedNames);
});

test("sorts filtered results by item name ascending regardless of source order", () => {
  assert.deepEqual(filterItems([{ name: "Zircon" }, { name: "amber" }, { name: "Mithral" }], "").map(({ name }) => name), ["amber", "Mithral", "Zircon"]);
});

test("matches names case-insensitively and ignores surrounding whitespace", () => {
  assert.deepEqual(filterItems(items, "  AMULET "), [items[1]]);
});

test("returns an empty list when no name matches", () => {
  assert.deepEqual(filterItems(items, "dragon"), []);
});

test("requires three non-space characters before a name search is applied", () => {
  assert.equal(normalizeSearchQuery("  "), "");
  assert.equal(normalizeSearchQuery("ab"), "");
  assert.equal(normalizeSearchQuery("a b"), "");
  assert.equal(normalizeSearchQuery("  arc "), "arc");
  assert.deepEqual(filterItems(items, "ab"), []);
  assert.deepEqual(filterItems(items, "ab", "DMG"), [items[1]]);
});

test("shows items only after a usable search, source selection, or explicit edition choice", () => {
  assert.equal(shouldShowItems("", new Set()), false);
  assert.equal(shouldShowItems("ab", new Set()), false);
  assert.equal(shouldShowItems("amu", new Set()), true);
  assert.equal(shouldShowItems("", new Set(["DMG"])), true);
  assert.equal(shouldShowItems("", new Set(), true), true);
});

test("filters by exact source and combines source with the name query", () => {
  assert.deepEqual(filterItems(items, "", "TCE"), [items[0], items[2]]);
  assert.deepEqual(filterItems(items, "arcane", "BMT"), [items[3]]);
});

test("classifies edition membership from primary, alternate, and reprint sources", () => {
  assert.equal(EDITION_CUTOFF, "2024-09-17");
  assert.ok(edition2024Sources.has("XPHB"));
  assert.ok(edition2024Sources.has("XDMG"));
  assert.equal(sourcePublishedDates.XPHB, EDITION_CUTOFF);
  assert.deepEqual([...getItemEditions({ source: "TCE" })], ["2014"]);
  assert.deepEqual([...getItemEditions({ source: "XDMG" })], ["2024"]);
  assert.deepEqual([...getItemEditions({ source: "DMG", reprintedAs: ["Alchemy Jug|XDMG"] })], ["2014", "2024"]);
  assert.deepEqual([...getItemEditions({ source: "DMG", reprintedAs: [{ uid: "Dwarven Plate|XDMG", tag: "item" }] })], ["2014", "2024"]);
  assert.deepEqual([...getItemEditions({ source: "DMG", otherSources: [{ source: "XPHB" }] })], ["2014", "2024"]);
  assert.equal(belongsToEdition({ source: "DMG", reprintedAs: ["Alchemy Jug|XDMG"] }, "2014"), true);
  assert.equal(belongsToEdition({ source: "DMG", reprintedAs: ["Alchemy Jug|XDMG"] }, "2024"), true);
});

test("filters results by selected edition", () => {
  const editionItems = [
    { name: "Ancient Item", source: "DMG" },
    { name: "Current Item", source: "XDMG" },
    { name: "Reprinted Item", source: "DMG", reprintedAs: ["Reprinted Item|XDMG"] },
  ];
  assert.deepEqual(filterItems(editionItems, "", "", "2014").map(({ name }) => name), ["Ancient Item", "Reprinted Item"]);
  assert.deepEqual(filterItems(editionItems, "", "", "2024").map(({ name }) => name), ["Current Item", "Reprinted Item"]);
});

test("matches any selected source in a multi-select filter", () => {
  assert.deepEqual(filterItems(items, "", ["DMG", "BMT"]), [items[1], items[3]]);
});

test("lists unique, sorted non-empty sources", () => {
  assert.deepEqual(getSources(items), ["BMT", "DMG", "TCE"]);
});

test("maps every archive source code to a full source name", async () => {
  const manifest = await import("node:fs/promises").then(({ readFile }) => readFile(new URL("./data/manifest.json", import.meta.url), "utf8")).then(JSON.parse);
  for (const { code } of manifest.sources) assert.ok(sourceNames[code], `Missing full name for ${code}`);
  assert.equal(getSourceName("TCE"), "Tasha's Cauldron of Everything");
  assert.equal(getSourceLabel("TCE"), "Tasha's Cauldron of Everything (TCE)");
  assert.equal(matchesSourceSearch("TCE", "tasha"), true);
  assert.equal(matchesSourceSearch("TCE", "tce"), true);
  assert.equal(matchesSourceSearch("TCE", "forgotten realms"), false);
});

test("summarizes entries and removes inline game markup", () => {
  assert.equal(getItemSummary({ entries: ["Cast {@spell Detect Thoughts|PHB} at will."] }), "Cast Detect Thoughts at will.");
  assert.equal(getItemSummary({}), "No description available.");
});

test("includes supplemental entries in the full item description", () => {
  const main = ["Main description."];
  const extra = [{ type: "entries", name: "Variant", entries: ["Additional detail."] }];
  assert.deepEqual(getItemDescription({ entries: main, additionalEntries: extra }), [...main, ...extra]);
  assert.deepEqual(getItemDescription({ entries: main }), main);
  assert.deepEqual(getItemDescription({}), []);
});

test("parses inline tags into readable safe text and emphasis tokens", () => {
  assert.deepEqual(parseEntryMarkup("Save {@dc 15} or take {@damage 2d6} damage."), [
    { type: "text", value: "Save " },
    { type: "tag", tag: "dc", value: "DC 15" },
    { type: "text", value: " or take " },
    { type: "tag", tag: "damage", value: "2d6" },
    { type: "text", value: " damage." },
  ]);
  assert.deepEqual(parseEntryMarkup("{@b Strong} and {@i subtle}."), [
    { type: "bold", value: "Strong" },
    { type: "text", value: " and " },
    { type: "italic", value: "subtle" },
    { type: "text", value: "." },
  ]);
});
