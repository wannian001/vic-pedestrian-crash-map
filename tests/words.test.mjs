// node tests/words.test.mjs — both languages carry the same words: every key of the page in English and Chinese,
// and the How to use and project pages with the same steps, items, examples and cards.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WORDS } from "../web/js/i18n.js";
import { GUIDE, PROJECT } from "../web/js/content.js";

const en = Object.keys(WORDS.en).sort(), zh = Object.keys(WORDS.zh).sort();
assert.deepEqual(en.filter((k) => !WORDS.zh[k]), [], "keys missing in Chinese");
assert.deepEqual(zh.filter((k) => !WORDS.en[k]), [], "keys missing in English");
// the same {placeholders} on both sides
for (const k of en) {
  const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
  assert.equal(vars(WORDS.en[k]), vars(WORDS.zh[k]), k);
}

// the shape of the long pages: arrays of the same length, item by item
function sameShape(a, b, path) {
  if (Array.isArray(a)) { assert.ok(Array.isArray(b), path); assert.equal(a.length, b.length, path); a.forEach((x, i) => sameShape(x, b[i], `${path}[${i}]`)); }
  else if (a && typeof a === "object") { assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), path); for (const k of Object.keys(a)) sameShape(a[k], b[k], `${path}.${k}`); }
  else assert.equal(typeof a, typeof b, path);
}
sameShape(GUIDE.en, GUIDE.zh, "GUIDE");
sameShape(PROJECT.en, PROJECT.zh, "PROJECT");
assert.equal(GUIDE.en.steps.length, 5);
assert.deepEqual(GUIDE.en.examples.map((e) => e.id), GUIDE.zh.examples.map((e) => e.id));

// every example on the How to use page has a setting in app.js, and every image the project page shows is there
const app = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");
for (const { id } of GUIDE.en.examples) assert.match(app, new RegExp(`\\n  ${id}: \\{`), `example ${id} has no setting in app.js`);
for (const { src } of PROJECT.en.shots) assert.ok(readFileSync(new URL(`../web/${src}`, import.meta.url)).length > 10000, src);

console.log("words: ok");
