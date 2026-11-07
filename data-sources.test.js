import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("./data/manifest.json", import.meta.url), "utf8"));

test("source datasets cover the manifest total with matching source codes and counts", async () => {
  const codes = new Set();
  let total = 0;

  for (const source of manifest.sources) {
    assert.equal(codes.has(source.code), false, `duplicate source ${source.code}`);
    codes.add(source.code);
    const items = JSON.parse(await readFile(new URL(`./data/${source.file}`, import.meta.url), "utf8"));
    assert.equal(items.length, source.count, `${source.code} item count`);
    assert.ok(items.every((item) => item.source === source.code), `${source.code} item source`);
    total += items.length;
  }

  assert.equal(total, manifest.total);
});
