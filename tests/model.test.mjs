// node tests/model.test.mjs — the page's model gives the numbers on the submitted Tableau dashboard.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { load, filtered, hexes, selectedMask, factor, hexKeyAt, hexCentre, bandOf } from "../web/js/model.js";

const data = load(JSON.parse(readFileSync(new URL("../web/data/crashes.json", import.meta.url))));
const all = { year: null, sev: null, band: null, age: null };
const keep = filtered(data, all);
const sel = { hexes: new Set(), crashes: new Set() };

// default view: Melbourne CBD core, n = 120, the five biggest gaps as on the dashboard
const { mask, user } = selectedMask(data, keep, sel, 0);
assert.equal(user, false);
const pct = (x) => Math.round(x * 1000) / 10;
const want = { weather: ["Clear", 83.3, 80.6], surface: ["Dry", 80.8, 81.2], light: ["Dark – lights on", 34.2, 21.1],
  speed: ["40 km/hr", 62.5, 17.4], geom: ["Crossing", 37.5, 25.6] };
for (const [name, [label, a, b]] of Object.entries(want)) {
  const f = factor(data, keep, mask, name);
  assert.equal(f.nArea, 120);
  assert.equal(f.nAll, 17510);
  assert.deepEqual([f.top.label, pct(f.top.areaShare), pct(f.top.vicShare)], [label, a, b], name);
}

// hexes: 3,939 bins holding the 17,501 mapped crashes; the JS hexbin finds every crash's own bin
const hx = hexes(data, keep);
assert.equal(hx.size, 3939);
assert.equal([...hx.values()].reduce((s, h) => s + h.count, 0), 17501);
assert.equal(Math.max(...[...hx.values()].map((h) => h.count)), 247);
for (let i = 0; i < data.n; i++) {
  if (data.hexKey[i] === null) continue;
  assert.equal(hexKeyAt(data, data.c.lon[i], data.c.lat[i]), data.hexKey[i], data.c.id[i]);
}
// a hex centre maps back to its own key
for (const key of [...hx.keys()].slice(0, 500)) {
  const { lon, lat } = hexCentre(data, key);
  assert.equal(hexKeyAt(data, lon, lat), key);
}
assert.deepEqual([1, 2, 4, 5, 9, 10, 29, 30, 99, 100, 247].map(bandOf), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);

// filters are context filters: Victoria shrinks with them
const fatal = filtered(data, { ...all, sev: 0 });
const f2 = factor(data, fatal, selectedMask(data, fatal, sel, 0).mask, "light");
assert.equal(f2.nAll, data.c.sev.filter((s) => s === 0).length);

// a user selection replaces the default, per view
const someHex = [...hx.keys()][0];
const s2 = { hexes: new Set([someHex]), crashes: new Set([5]) };
assert.equal(selectedMask(data, keep, s2, 0).user, true);
assert.equal(selectedMask(data, keep, s2, 1).mask.reduce((a, b) => a + b, 0), 1);
console.log("model tests: PASS");
