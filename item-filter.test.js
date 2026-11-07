import test from "node:test";
import assert from "node:assert/strict";
import { filterItems, getItemSummary, getSources } from "./item-filter.js";

const items = [
  { name: "+1 All-Purpose Tool", source: "TCE" },
  { name: "Amulet of the Devout", source: "DMG" },
  { name: "Arcane Grimoire", source: "TCE" },
  { name: "Arcane Grimoire", source: "BMT" },
];

test("returns all items for an empty or whitespace query", () => {
  assert.equal(filterItems(items, ""), items);
  assert.equal(filterItems(items, "  "), items);
});

test("matches names case-insensitively and ignores surrounding whitespace", () => {
  assert.deepEqual(filterItems(items, "  AMULET "), [items[1]]);
});

test("returns an empty list when no name matches", () => {
  assert.deepEqual(filterItems(items, "dragon"), []);
});

test("filters by exact source and combines source with the name query", () => {
  assert.deepEqual(filterItems(items, "", "TCE"), [items[0], items[2]]);
  assert.deepEqual(filterItems(items, "arcane", "BMT"), [items[3]]);
});

test("matches any selected source in a multi-select filter", () => {
  assert.deepEqual(filterItems(items, "", ["DMG", "BMT"]), [items[1], items[3]]);
});

test("lists unique, sorted non-empty sources", () => {
  assert.deepEqual(getSources(items), ["BMT", "DMG", "TCE"]);
});

test("summarizes entries and removes inline game markup", () => {
  assert.equal(getItemSummary({ entries: ["Cast {@spell Detect Thoughts|PHB} at will."] }), "Cast Detect Thoughts at will.");
  assert.equal(getItemSummary({}), "No description available.");
});
