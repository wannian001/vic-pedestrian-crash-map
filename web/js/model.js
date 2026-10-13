// The numbers behind the page: filters, hex counts and "selected area vs Victoria". No DOM here, so the
// same file runs in a test under node. Every rule follows a calculated field of the Tableau workbook
// (named in the comments) so the page shows the same numbers as the submitted dashboard.

export const FACTORS = ["weather", "surface", "light", "speed", "geom"];
// c.Hex Count Band
export const BANDS = [[1, 1, "1"], [2, 4, "2–4"], [5, 9, "5–9"], [10, 29, "10–29"], [30, 99, "30–99"], [100, Infinity, "100+"]];
export const bandOf = (count) => BANDS.findIndex(([lo, hi]) => count >= lo && count <= hi);
const SQRT3 = Math.sqrt(3);

// Wraps crashes.json: columns of equal length, strings stored once in dict.
export function load(raw) {
  const c = raw.cols;
  const n = raw.n;
  const hexKey = new Array(n);
  for (let i = 0; i < n; i++) hexKey[i] = c.hx[i] === null ? null : `${c.hx[i]}|${c.hy[i]}`;
  return { ...raw, c, hexKey, years: [...new Set(c.date.map((d) => Math.floor(d / 10000)))].sort((a, b) => a - b) };
}

// The centre of a hex in degrees (HEXBINX = 1.5 * ix, HEXBINY = sqrt(3)/2 * iy, both divided by the scale).
export function hexCentre(data, key) {
  const [ix, iy] = key.split("|").map(Number);
  return { lon: (1.5 * ix) / data.hex_scale, lat: ((SQRT3 / 2) * iy) / data.hex_scale };
}

// Tableau's HEXBINX / HEXBINY for a point, as a key ("ix|iy"): the same routine tools/build_web_data.py uses,
// so a click on the map finds the hex the crash was counted in.
export function hexKeyAt(data, lon, lat) {
  const x = lon * data.hex_scale, y = lat * data.hex_scale;
  const halfUp = (v, step) => Math.floor(v / step + 0.5) * step;
  let x0 = halfUp(x, 3), y0 = halfUp(y, SQRT3);
  const dx = x - x0, dy = y - y0;
  if ((Math.abs(dx) - 1) * SQRT3 + Math.abs(dy) > 0) {
    x0 += dx < 0 ? -1.5 : 1.5;
    y0 += dy < 0 ? -SQRT3 / 2 : SQRT3 / 2;
  }
  y0 = Math.floor(y0 * 1000 + 0.5) / 1000;
  return `${Math.round(x0 / 1.5)}|${Math.round(y0 / (SQRT3 / 2))}`;
}

// The four dashboard filters (context filters in Tableau, so they also narrow "Victoria"): year, severity,
// time band, age. null = all.
export function passes(data, i, f) {
  const c = data.c;
  if (f.year !== null && Math.floor(c.date[i] / 10000) !== f.year) return false;
  if (f.sev !== null && c.sev[i] !== f.sev) return false;
  if (f.band !== null && c.band[i] !== f.band) return false;
  if (f.age !== null && c.old[i] !== f.age) return false;
  return true;
}

export function filtered(data, f) {
  const keep = new Uint8Array(data.n);
  for (let i = 0; i < data.n; i++) keep[i] = passes(data, i, f) ? 1 : 0;
  return keep;
}

// Hexes of the crashes that pass: key -> {count, lgas, years, sevs} (c.Hex Location / Period / Severity context).
export function hexes(data, keep) {
  const out = new Map();
  const c = data.c;
  for (let i = 0; i < data.n; i++) {
    const key = data.hexKey[i];
    if (!keep[i] || key === null) continue;
    let h = out.get(key);
    if (!h) { h = { key, count: 0, lgas: new Set(), y0: Infinity, y1: -Infinity, sevs: new Set() }; out.set(key, h); }
    h.count++;
    h.lgas.add(c.lga[i]);
    const y = Math.floor(c.date[i] / 10000);
    if (y < h.y0) h.y0 = y;
    if (y > h.y1) h.y1 = y;
    h.sevs.add(c.sev[i]);
  }
  return out;
}

// c.Effective Selected: the user's selection for the current view, else the default sample (s.Default Accidents).
// sel = {hexes: Set of keys, crashes: Set of indices}; view 1 = crashes, anything else uses the hex selection.
export function selectedMask(data, keep, sel, view) {
  const mask = new Uint8Array(data.n);
  const byCrash = view === 1 && sel.crashes.size > 0;
  const byHex = view !== 1 && sel.hexes.size > 0;
  for (let i = 0; i < data.n; i++) {
    if (!keep[i]) continue;
    if (byCrash) mask[i] = sel.crashes.has(i) ? 1 : 0;
    else if (byHex) mask[i] = data.hexKey[i] !== null && sel.hexes.has(data.hexKey[i]) ? 1 : 0;
    else mask[i] = data.c.def[i];
  }
  return { mask, user: byCrash || byHex };
}

// One factor of "Selection vs Victoria": every known condition with its share in the area and in Victoria.
// Shares are of all crashes (Unknown stays in the denominator, c.Area N / c.Victoria N); a crash can have several
// weather or surface conditions. rows are sorted by the size of the gap; top = c.Top Difference (the biggest gap
// among conditions the area has at least one crash in).
export function factor(data, keep, mask, name) {
  const col = data.c[name];
  let nAll = 0, nArea = 0;
  const vic = new Map(), area = new Map();
  for (let i = 0; i < data.n; i++) {
    if (!keep[i]) continue;
    nAll++;
    if (mask[i]) nArea++;
    const values = Array.isArray(col[i]) ? col[i] : [col[i]];
    for (const v of values) {
      if (v === 0) continue;  // Unknown
      vic.set(v, (vic.get(v) || 0) + 1);
      if (mask[i]) area.set(v, (area.get(v) || 0) + 1);
    }
  }
  const rows = [...vic.keys()].map((v) => {
    const a = area.get(v) || 0, b = vic.get(v);
    const areaShare = nArea ? a / nArea : null, vicShare = nAll ? b / nAll : null;
    return { value: v, label: data.dict[name][v], areaN: a, vicN: b, areaShare, vicShare, diff: areaShare === null ? null : areaShare - vicShare };
  });
  const ranked = rows.filter((r) => r.areaN > 0).sort((p, q) => Math.abs(q.diff) - Math.abs(p.diff) || p.label.localeCompare(q.label));
  const rest = rows.filter((r) => r.areaN === 0).sort((p, q) => q.vicN - p.vicN);
  return { name, nAll, nArea, rows: [...ranked, ...rest], top: ranked[0] || null };
}
