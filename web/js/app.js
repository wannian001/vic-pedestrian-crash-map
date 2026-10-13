// The page: one dashboard. A map with three views (hotspots, single crashes, footfall), four filters, the
// comparison of the selected area with Victoria, and the fixed overview. Built on the dayring design kit.
import { esc, installTooltip } from "../kit/js/charts.js";
import { load, filtered, hexes, hexCentre, selectedMask, factor, bandOf, BANDS, FACTORS } from "./model.js";
import { getLang, setLang, t, num, pct, sevName, bandName, ageName, valueName, dateText, timeText } from "./i18n.js";
import { createMap } from "./map.js";

const REPO = "https://github.com/wannian001/vic-pedestrian-crash-map";
const KIT = "https://github.com/wannian001/dayring/blob/main/docs/DESIGN_KIT.md";
const store = {
  get(key) { try { return localStorage.getItem(`crashmap.${key}`); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(`crashmap.${key}`, value); } catch { /* private mode */ } },
};
const query = new URLSearchParams(location.search);  // ?lang=zh&mode=dark for shared links

const LOGO = `<svg viewBox="0 0 32 32" aria-hidden="true">
  <path d="M10 4.5h12l6 11.5-6 11.5H10L4 16z" fill="none" stroke="var(--c-band)" stroke-width="3" stroke-linejoin="round"/>
  <path d="M12.3 9.2h4.4l2.2 3.8-2.2 3.8h-4.4L10.1 13z" fill="var(--hex-2)"/>
  <path d="M17.6 12.3h4.4l2.2 3.8-2.2 3.8h-4.4l-2.2-3.8z" fill="var(--hex-5)"/>
  <path d="M12.3 15.4h4.4l2.2 3.8-2.2 3.8h-4.4l-2.2-3.8z" fill="var(--hex-0)"/>
</svg>`;
const MOON = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1z"/></svg>`;
const BOX = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 6V3h3M14 3h3v3M17 14v3h-3M6 17H3v-3" /><rect x="7" y="7" width="6" height="6" rx="1" stroke-dasharray="2 2"/></svg>`;
const RESET = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10a6 6 0 1 0 2-4.5"/><path d="M4 3.5V7h3.5"/></svg>`;

let data = null, sensors = [], mapApi = null;
const state = {
  view: 0,                                              // 0 hotspots, 1 crashes, 2 footfall (Parameter_MapLayer)
  filters: { year: null, sev: null, band: null, age: null },
  sel: { hexes: new Set(), crashes: new Set() },        // s.Selected Hexes / s.Selected Accidents
  boxing: false,
};

// ---- light / dark -----------------------------------------------------------------------------------------
let picked = null;
const isDark = () => {
  const m = document.documentElement.dataset.mode;
  return m ? m === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};
function applyLook() {
  const mode = picked || query.get("mode") || store.get("mode");
  if (mode === "light" || mode === "dark") document.documentElement.dataset.mode = mode; else delete document.documentElement.dataset.mode;
  if (mapApi) { mapApi.setBasemap(isDark()); mapApi.redraw(); }
}

// ---- the page skeleton (built once; the map element must survive a language switch) --------------------------
function skeleton() {
  document.body.innerHTML = `
  <header class="top"><div class="top-in">
    <a class="brand" href="./">${LOGO}<span id="app-name"></span></a>
    <span class="spacer"></span>
    <div class="tools">
      <button class="tool" id="lang" type="button" aria-label="Language"></button>
      <button class="tool" id="mode" type="button">${MOON}</button>
    </div>
  </div></header>
  <main>
    <div class="head"><div><h1 id="title"></h1><div class="sub" id="sub"></div></div></div>
    <div class="grid">
      <section class="card span-8 map-card" aria-labelledby="view-label">
        <div class="map-bar">
          <span class="sr" id="view-label"></span>
          <div class="seg" id="views" role="group"></div>
          <span class="aside xs muted num" id="map-aside"></span>
        </div>
        <div id="map"></div>
        <div class="map-foot">
          <div class="legend" id="legend"></div>
          <div class="row map-tools">
            <button class="tool" id="box" type="button" aria-pressed="false">${BOX}<span></span></button>
            <button class="tool" id="reset" type="button">${RESET}<span></span></button>
          </div>
          <p class="xs muted map-hint" id="hint"></p>
        </div>
      </section>
      <div class="col span-4">
        <section class="card" id="filters"></section>
        <section class="card" id="compare"></section>
      </div>
      <section class="card span-6" id="overview"></section>
      <section class="card span-6" id="about"></section>
    </div>
    <footer class="foot" id="foot"></footer>
  </main>`;
  document.getElementById("lang").onclick = () => { const next = getLang() === "zh" ? "en" : "zh"; store.set("lang", next); setLang(next); renderAll(); };
  document.getElementById("mode").onclick = () => {
    picked = isDark() ? "light" : "dark";
    store.set("mode", picked);
    if (query.has("mode")) { query.delete("mode"); const rest = query.toString(); history.replaceState(null, "", `${location.pathname}${rest ? `?${rest}` : ""}${location.hash}`); }
    applyLook();
  };
  document.getElementById("box").onclick = () => { state.boxing = !state.boxing; mapApi.setBoxing(state.boxing); renderMapBar(); };
  document.getElementById("reset").onclick = () => { clearSelection(); };
}

// ---- static text ---------------------------------------------------------------------------------------
function renderStatic() {
  const ov = data.overview;
  document.title = `${t("page.title")} · ${t("app.name")}`;
  document.getElementById("app-name").textContent = t("app.name");
  document.getElementById("lang").textContent = t("ui.lang");
  const mode = document.getElementById("mode");
  mode.title = t("ui.mode"); mode.setAttribute("aria-label", t("ui.mode"));
  document.getElementById("title").textContent = t("page.title");
  document.getElementById("sub").textContent = t("page.sub", { n: num(data.n) });
  document.getElementById("view-label").textContent = t("view.label");
  document.getElementById("views").setAttribute("aria-label", t("view.label"));

  const facts = [
    ["ov.year", t("ov.year.v", { avg: num(ov.avg_per_year), low: num(ov.lowest_n) })],
    ["ov.sev", t("ov.sev.v", { f: ov.sev_pct[0], s: ov.sev_pct[1], o: ov.sev_pct[2] })],
    ["ov.time", t("ov.time.v", { n: num(ov.busiest_n), p: ov.deadliest_fatal_pct })],
    ["ov.age", t("ov.age.v", { a: ov.old_pct, f: ov.old_fatal_pct })],
    ["ov.place", t("ov.place.v", { n: num(ov.melb_n), p: ov.melb_pct })],
    ["ov.foot", t("ov.foot.v")],
  ];
  document.getElementById("overview").innerHTML = `
    <h2>${t("ov.title")}<span class="aside">${t("ov.aside", { n: num(data.n) })}</span></h2>
    <dl class="facts overview">${facts.map(([k, v]) => `<div><dt>${t(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;

  document.getElementById("about").innerHTML = `
    <h2>${t("about.title")}</h2>
    <p class="small about-p">${esc(t("about.p1"))}</p>
    <div class="eyebrow">${t("about.limits")}</div>
    <ul class="small limits">${["about.l1", "about.l2", "about.l3", "about.l4"].map((k) => `<li>${esc(t(k))}</li>`).join("")}</ul>
    <details class="how"><summary>${t("how.title")}</summary>
      ${["how.p1", "how.p2", "how.p3"].map((k) => `<p>${esc(t(k))}</p>`).join("")}</details>
    <details class="how"><summary>${t("src.title")}</summary>
      ${["src.crash", "src.foot", "src.map", "src.ai"].map((k) => `<p>${esc(t(k))}</p>`).join("")}</details>`;

  document.getElementById("foot").innerHTML = `<a href="${REPO}">${t("foot.repo")}</a><a href="${KIT}">${t("foot.kit")}</a>`;
}

// ---- filters ---------------------------------------------------------------------------------------------
function select(id, label, value, options) {
  return `<label class="filter"><span>${label}</span><select id="${id}">
    <option value="">${t("filters.all")}</option>
    ${options.map(([v, text]) => `<option value="${v}" ${value === v ? "selected" : ""}>${esc(text)}</option>`).join("")}
  </select></label>`;
}
function renderFilters() {
  const f = state.filters;
  const any = Object.values(f).some((v) => v !== null);
  const el = document.getElementById("filters");
  el.innerHTML = `
    <h2>${t("filters.title")}<span class="aside">${t("filters.aside")}</span></h2>
    <div class="filters">
      ${select("f-year", t("filters.year"), f.year, [...data.years].reverse().map((y) => [y, String(y)]))}
      ${select("f-sev", t("filters.sev"), f.sev, [0, 1, 2, 3].map((i) => [i, sevName(i)]))}
      ${select("f-band", t("filters.band"), f.band, [0, 1, 2, 3, 4].map((i) => [i, bandName(i)]))}
      <div class="filter"><span id="f-age-label">${t("filters.age")}</span>
        <div class="seg" role="group" aria-labelledby="f-age-label">
          ${[[null, t("filters.all")], [1, ageName(1)], [0, ageName(0)]].map(([v, text]) =>
            `<button type="button" data-age="${v ?? ""}" aria-pressed="${f.age === v}">${esc(text)}</button>`).join("")}
        </div>
      </div>
    </div>
    ${any ? `<p class="xs"><a href="#" id="f-clear">${t("filters.clear")}</a></p>` : ""}`;
  const bind = (id, key) => {
    el.querySelector(`#${id}`).onchange = (e) => { state.filters[key] = e.target.value === "" ? null : Number(e.target.value); update(); };
  };
  bind("f-year", "year"); bind("f-sev", "sev"); bind("f-band", "band");
  el.querySelectorAll("[data-age]").forEach((b) => { b.onclick = () => { state.filters.age = b.dataset.age === "" ? null : Number(b.dataset.age); update(); }; });
  const clear = el.querySelector("#f-clear");
  if (clear) clear.onclick = (e) => { e.preventDefault(); state.filters = { year: null, sev: null, band: null, age: null }; update(); };
}

// ---- the map bar, legend and hint -----------------------------------------------------------------------
function renderMapBar(info) {
  if (info) renderMapBar.info = info;
  const { nHex, nMapped } = renderMapBar.info || { nHex: 0, nMapped: 0 };
  document.getElementById("views").innerHTML = [0, 1, 2].map((v) =>
    `<button type="button" data-view="${v}" aria-pressed="${state.view === v}">${t(`view.${v}`)}</button>`).join("");
  document.querySelectorAll("#views [data-view]").forEach((b) => { b.onclick = () => setView(Number(b.dataset.view)); });
  document.getElementById("map-aside").textContent = t(`map.aside.${state.view}`, { h: num(nHex), n: num(nMapped) });

  const legend = document.getElementById("legend");
  if (state.view === 0) {
    legend.innerHTML = `<span class="xs muted">${t("legend.hex")}</span>` +
      BANDS.map(([, , label], b) => `<span class="key"><i class="hexkey" style="background:var(--hex-${b})"></i>${label}</span>`).join("") +
      `<span class="key"><i class="hexkey ring"></i>${t("legend.selected")}</span>`;
  } else if (state.view === 1) {
    legend.innerHTML = `<span class="key"><i class="dotkey" style="background:var(--crash)"></i>${t("legend.crash")}</span>
      <span class="key"><i class="dotkey sel"></i>${t("legend.selected")}</span>`;
  } else {
    legend.innerHTML = `<span class="key"><i class="dotkey sensor"></i>${t("legend.sensor")}</span>`;
  }
  const box = document.getElementById("box");
  box.setAttribute("aria-pressed", String(state.boxing));
  box.hidden = state.view === 2;
  box.querySelector("span").textContent = state.boxing ? t("map.select.on") : t("map.select");
  document.getElementById("reset").querySelector("span").textContent = t("map.reset");
  document.getElementById("reset").hidden = state.view === 2 || !hasUserSelection();
  document.getElementById("hint").textContent = t(`map.hint.${state.view}`);
}

const hasUserSelection = () => (state.view === 1 ? state.sel.crashes.size : state.sel.hexes.size) > 0;

// ---- selection vs Victoria ------------------------------------------------------------------------------
function bar(diff) {
  if (diff === null) return `<span class="dbar"></span>`;
  const w = Math.min(Math.abs(diff), 1) * 50;  // ±100 pp across the bar, as on the dashboard
  const side = diff >= 0 ? `left:50%;background:var(--diff-up)` : `right:50%;background:var(--diff-down)`;
  return `<span class="dbar" aria-hidden="true"><span style="${side};width:${w}%"></span></span>`;
}
const pp = (d) => `${d >= 0 ? "+" : "−"}${Math.abs(Math.round(d * 1000) / 10).toFixed(1)}`;

function renderCompare(keep, sel) {
  const el = document.getElementById("compare");
  const open = new Set([...el.querySelectorAll("details[open]")].map((d) => d.dataset.f));
  const results = FACTORS.map((name) => factor(data, keep, sel.mask, name));
  const n = results[0].nArea;
  let status;
  if (!sel.user) status = t("cmp.default", { n: num(n) });
  else if (n === 1) status = t("cmp.single");
  else if (n < 30) status = t("cmp.small", { n: num(n) });
  else status = t("cmp.area", { n: num(n) });
  const head = `<h2>${t("cmp.title")}</h2>
    <p class="cmp-status"><span class="chip ${sel.user ? "accent" : ""}">${esc(status)}</span></p>
    <p class="xs muted">${esc(t("cmp.explain"))}</p>`;
  if (!n) { el.innerHTML = `${head}<div class="empty">${esc(t(results[0].nAll ? "cmp.empty" : "filters.none"))}</div>`; return; }

  const rows = results.map((r) => {
    const top = r.top;
    const word = top ? t(top.diff >= 0 ? "cmp.higher" : "cmp.lower") : "";
    const summary = top
      ? `<span class="cmp-cond">${esc(valueName(top.label))}</span>
         <span class="cmp-vals num">${t("cmp.vs", { a: pct(top.areaShare), b: pct(top.vicShare) })}</span>
         ${bar(top.diff)}
         <span class="cmp-d num" title="${esc(word)}">${pp(top.diff)}<small> pp</small></span>`
      : `<span class="cmp-cond muted">${esc(t("cmp.none"))}</span>`;
    const table = `<div class="table-wrap"><table class="cmp-table">
      <thead><tr><th>${t("cmp.th.cond")}</th><th class="r">${t("cmp.th.area")}</th><th class="r">${t("cmp.th.vic")}</th><th>${t("cmp.th.gap")}</th></tr></thead>
      <tbody>${r.rows.map((row) => `<tr${row === top ? ' class="top"' : ""}>
        <th scope="row">${esc(valueName(row.label))}</th>
        <td class="r num">${pct(row.areaShare)}<span class="muted xs"> (${num(row.areaN)})</span></td>
        <td class="r num">${pct(row.vicShare)}</td>
        <td class="gap">${bar(row.diff)}<span class="num xs">${pp(row.diff)}</span></td></tr>`).join("")}</tbody></table></div>`;
    return `<details class="cmp" data-f="${r.name}" ${open.has(r.name) ? "open" : ""}>
      <summary><span class="cmp-factor">${t(`factor.${r.name}`)}</span>${summary}</summary>${table}</details>`;
  }).join("");
  el.innerHTML = `${head}<div class="cmp-list">${rows}</div>
    <div class="cmp-axis xs muted num" aria-hidden="true"><span>−100</span><span>0</span><span>+100 pp</span></div>
    <p class="xs muted">${esc(t("cmp.unknown"))}</p>`;
}

// ---- map hover -------------------------------------------------------------------------------------------
let tipEl = null;
function hover(item, ev) {
  if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "tip map-tip"; tipEl.setAttribute("role", "status"); document.body.appendChild(tipEl); }
  if (!item || !ev) { tipEl.classList.remove("on"); return; }
  const c = data.c, d = data.dict;
  let text = "";
  if (item.kind === "hex") {
    const lgas = [...item.lgas].map((i) => d.lga[i]).sort();
    const lga = lgas.length === 1 ? lgas[0] : t("tip.hex.many", { lga: lgas[0] });
    const sev = item.sevs.size === 1 ? sevName([...item.sevs][0]) : t("tip.sev.many");
    text = t("tip.hex", { lga, n: num(item.count), period: item.y0 === item.y1 ? item.y0 : `${item.y0}–${item.y1}`, sev });
  } else if (item.kind === "crash") {
    const i = item.i;
    text = t("tip.crash", {
      road: d.road[c.road[i]], lga: d.lga[c.lga[i]], date: dateText(c.date[i]), time: timeText(c.time[i]),
      type: valueName(d.type[c.type[i]]), sev: sevName(c.sev[i]), speed: valueName(d.speed[c.speed[i]]), peds: c.peds[i], id: c.id[i],
    });
  } else {
    text = t("tip.sensor", { name: item.s.name, n: num(Math.round(item.s.avg)) });
  }
  tipEl.textContent = text;
  tipEl.classList.add("on");
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  tipEl.style.left = `${Math.min(innerWidth - w - 8, Math.max(8, ev.clientX - w / 2))}px`;
  tipEl.style.top = `${ev.clientY - h - 14 < 8 ? ev.clientY + 18 : ev.clientY - h - 14}px`;
}

// ---- selection ---------------------------------------------------------------------------------------------
function toggle(set, value, add) {
  if (add) { if (set.has(value)) set.delete(value); else set.add(value); return; }
  const only = set.size === 1 && set.has(value);
  set.clear();
  if (!only) set.add(value);
}
function click(item, add) {
  if (state.view === 2) return;
  if (!item) { if (!add) clearSelection(); return; }
  if (item.kind === "hex") toggle(state.sel.hexes, item.key, add);
  if (item.kind === "crash") toggle(state.sel.crashes, item.i, add);
  update();
}
function boxed(items, add = false) {
  const target = state.view === 1 ? state.sel.crashes : state.sel.hexes;
  if (!add) target.clear();
  for (const item of items) {
    if (item.kind === "hex") target.add(item.key);
    if (item.kind === "crash") target.add(item.i);
  }
  state.boxing = false;
  mapApi.setBoxing(false);
  update();
}
function clearSelection() {
  if (state.view === 1) state.sel.crashes.clear(); else state.sel.hexes.clear();
  update();
}
function setView(v) {
  state.view = v;
  if (v === 2 && state.boxing) { state.boxing = false; mapApi.setBoxing(false); }
  update();
}

// ---- one pass: filters -> marks -> comparison ---------------------------------------------------------------
function update() {
  const keep = filtered(data, state.filters);
  const sel = selectedMask(data, keep, state.sel, state.view);
  const picked = new Set();
  for (let i = 0; i < data.n; i++) if (sel.mask[i] && data.hexKey[i] !== null) picked.add(data.hexKey[i]);
  const hx = [...hexes(data, keep).values()].map((h) => ({ ...h, kind: "hex", ...hexCentre(data, h.key), band: bandOf(h.count), selected: picked.has(h.key) }))
    .sort((a, b) => a.count - b.count);
  let mapped = 0;
  for (let i = 0; i < data.n; i++) if (keep[i] && data.c.lat[i] !== null) mapped++;
  mapApi.setScene({ view: state.view, scale: data.hex_scale, hexes: hx, points: { lat: data.c.lat, lon: data.c.lon, keep, sel: sel.mask }, sensors });
  renderMapBar({ nHex: hx.length, nMapped: mapped });
  renderFilters();
  renderCompare(keep, sel);
}

function renderAll() {
  renderStatic();
  update();
}

async function start() {
  window.crashmapStarted = true;
  setLang(query.get("lang") || store.get("lang") || ((navigator.language || "").startsWith("zh") ? "zh" : "en"));
  applyLook();
  const main = document.querySelector("main");
  main.innerHTML = `<p class="muted">${t("ui.loading")}</p>`;
  try {
    const [raw, s] = await Promise.all([
      fetch("data/crashes.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch("data/sensors.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    ]);
    data = load(raw);
    sensors = s;
  } catch (error) {
    main.innerHTML = `<div class="card"><p class="lede">${t("ui.failed")}</p><p class="xs muted">${esc(error.message)}</p>
      <p><button class="tool" type="button" onclick="location.reload()">${t("ui.reload")}</button></p></div>`;
    return;
  }
  skeleton();
  installTooltip();
  mapApi = createMap(document.getElementById("map"), { onHover: hover, onClick: click, onBox: (items) => boxed(items), label: t("map.aria"), dark: isDark() });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyLook);
  renderAll();
}

start();
