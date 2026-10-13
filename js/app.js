// The shell and the dashboard. A left menu (a bottom tab bar on phones) holds three pages and, at its foot, the
// language and light/dark buttons, as in the Ready to Train? web version. Pages: #map (the dashboard: a map with
// three views, four filters, the comparison of the selected area with Victoria, the overview and the limits),
// #guide (how to use it, with one-click examples) and #project (what the project solves, and the Tableau dashboard
// as submitted). The map is built once and kept while another page shows, so a page switch never reloads it.
// Built on the Proactive Health AIO design kit (formerly dayring; web/kit/ holds the 1.3.0 export).
import { esc, installTooltip } from "../kit/js/charts.js";
import { icon as kitIcon } from "../kit/js/icons.js";
import { load, filtered, hexes, hexCentre, selectedMask, factor, bandOf, BANDS, FACTORS } from "./model.js";
import { getLang, setLang, t, tIn, num, pct, sevName, bandName, ageName, valueName, dateText, timeText } from "./i18n.js";
import { createMap, HOME } from "./map.js";
import { GUIDE, PROJECT } from "./content.js";

const REPO = "https://github.com/wannian001/vic-pedestrian-crash-map";
const KIT = "https://github.com/wannian001/proactive-health-aio/blob/main/docs/DESIGN_KIT.md";
const PAGES = ["map", "guide", "project"];
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
// stroke icons for the menu and the links, drawn like the Ready to Train? ones
const ICON = {
  map: '<path d="M9 4.5 3.5 6.8v12.7L9 17.2l6 2.3 5.5-2.3V4.5L15 6.8z"/><path d="M9 4.5v12.7M15 6.8v12.7"/>',
  guide: '<circle cx="12" cy="12" r="9"/><path d="M9.7 9.4a2.4 2.4 0 0 1 4.6.9c0 1.6-2.3 2-2.3 3.6M12 16.8v.3"/>',
  doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
};
const icon = (name, size = 20) =>
  `<svg class="metric-icon" width="${size}" height="${size}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

let data = null, sensors = [], mapApi = null;
const state = {
  page: "map",
  view: 0,                                              // 0 hotspots, 1 crashes, 2 footfall (Parameter_MapLayer)
  filters: { year: null, sev: null, band: null, age: null },
  sel: { hexes: new Set(), crashes: new Set() },        // s.Selected Hexes / s.Selected Accidents
  boxing: false,
};
let fitTo = null;  // a view an example asked for, applied once the map is on screen

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

// ---- the page skeleton (built once; the map element must survive a language switch and a page switch) ----------
function skeleton() {
  document.body.innerHTML = `
  <aside class="side"></aside>
  <main>
    <div id="head"></div>
    <div class="page" data-page="map">
      <div class="tips" id="tips" hidden></div>
      <div class="map-row">
        <section class="card map-card" aria-labelledby="view-label">
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
        <div class="col">
          <section class="card" id="filters"></section>
          <section class="card" id="compare"></section>
        </div>
      </div>
      <div class="grid">
        <section class="card span-6" id="overview"></section>
        <section class="card span-6" id="limits"></section>
      </div>
    </div>
    <div class="page" data-page="guide" id="guide" hidden></div>
    <div class="page" data-page="project" id="project" hidden></div>
    <footer class="foot" id="foot"></footer>
  </main>`;
  document.getElementById("box").onclick = () => { state.boxing = !state.boxing; mapApi.setBoxing(state.boxing); renderMapBar(); };
  document.getElementById("reset").onclick = () => { clearSelection(); };
}

// ---- the menu: pages, then the course badge, language and light/dark at its foot (as in Ready to Train?) ------
const NAV = [["map", "map"], ["guide", "guide"], ["project", "doc"]];
const folded = () => document.documentElement.classList.contains("side-folded");
const wide = () => matchMedia("(min-width: 900px)").matches;
function sidebar() {
  const side = document.querySelector(".side");
  const items = NAV.map(([p, ic]) => `<a href="#${p}" title="${esc(t(`nav.${p}`))}" ${p === state.page ? 'aria-current="page"' : ""}>${icon(ic, 18)}<span>${esc(t(`nav.${p}`))}</span></a>`).join("");
  side.innerHTML = `
    <div class="side-head">
      <a class="brand" href="#map">${LOGO}<span>${esc(t("app.name"))}</span></a>
      <button class="side-fold" id="fold" type="button" aria-label="${esc(t("ui.fold"))}" title="${esc(t("ui.fold"))}">${kitIcon("sidebar", 18)}</button>
    </div>
    <nav class="side-nav" aria-label="Pages">${items}</nav>
    <div class="side-tools">
      <span class="demo-badge" title="${esc(t("ui.web_note"))}">GEOM90007</span>
      <button class="tool" id="lang" type="button" aria-label="Language">${t("ui.lang")}</button>
      <button class="tool" id="mode" type="button" aria-label="${esc(t("ui.mode"))}" title="${esc(t("ui.mode"))}">${MOON}</button>
    </div>`;
  const brand = side.querySelector(".brand");
  const label = () => {
    if (folded() && wide()) { brand.title = t("ui.unfold"); brand.setAttribute("aria-label", t("ui.unfold")); }
    else { brand.removeAttribute("title"); brand.setAttribute("aria-label", t("app.name")); }  // the name hides on narrow screens
  };
  const setFold = (on) => { document.documentElement.classList.toggle("side-folded", on); store.set("side", on ? "folded" : "open"); label(); };
  label();
  side.querySelector("#fold").onclick = () => { setFold(true); brand.focus(); };
  brand.onclick = (e) => { if (folded() && wide()) { e.preventDefault(); setFold(false); side.querySelector("#fold").focus(); } };
  side.querySelector("#lang").onclick = () => { const next = getLang() === "zh" ? "en" : "zh"; store.set("lang", next); setLang(next); renderAll(); };
  side.querySelector("#mode").onclick = () => {
    picked = isDark() ? "light" : "dark";
    store.set("mode", picked);
    if (query.has("mode")) { query.delete("mode"); const rest = query.toString(); history.replaceState(null, "", `${location.pathname}${rest ? `?${rest}` : ""}${location.hash}`); }
    applyLook();
  };
}

// ---- the head: both names on one line, three lines for a first-time reader (the question, what came out, who did
// what), then the data line with the ways to the guide, the project page and the methods --------------------------
function renderHead() {
  const other = getLang() === "zh" ? "en" : "zh";
  const rows = [["brief.q.h", "brief.q"], ["brief.f.h", "brief.f"], ["brief.r.h", "brief.r"]]
    .map(([h, b]) => `<div class="brief-row"><dt>${esc(t(h))}</dt><dd>${esc(t(b))}</dd></div>`).join("");
  const links = [
    state.page === "guide" ? "" : `<a class="solves-link" href="#guide">${icon("guide", 16)}${esc(t("app.guide"))} ›</a>`,
    state.page === "project" ? "" : `<a class="solves-link" href="#project">${icon("doc", 16)}${esc(t("app.solves"))} ›</a>`,
    `<button type="button" class="link-button" data-about>${icon("info", 16)}${esc(t("app.about"))}</button>`,
  ].join("");
  document.getElementById("head").innerHTML = `<div class="head"><div>
    <h1>${esc(t("page.title"))} <span class="h1-alt" lang="${other === "zh" ? "zh-CN" : "en"}">${esc(tIn(other, "page.title"))}</span></h1>
    <dl class="brief">${rows}</dl>
    <p class="data-line"><span>${esc(t("app.data", { n: num(data.n) }))}</span>${links}</p>
  </div></div>`;
}

// ---- static parts of the map page: the three-step tip, the overview, the limits; and the footer -----------------
function renderTips() {
  const el = document.getElementById("tips");
  el.hidden = store.get("tips") === "hidden";
  if (el.hidden) return;
  el.innerHTML = `${icon("guide")}<span class="tips-lead">${esc(t("tips.lead"))}</span>
    <ol class="tips-steps">${[1, 2, 3].map((i) => `<li>${esc(t(`tips.${i}`))}</li>`).join("")}</ol>
    <span class="tips-end"><a href="#guide">${esc(t("tips.more"))}</a><button class="tool" type="button" id="tips-hide">${esc(t("tips.hide"))}</button></span>`;
  el.querySelector("#tips-hide").onclick = () => { store.set("tips", "hidden"); el.hidden = true; };
}

function renderStatic() {
  const ov = data.overview;
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

  document.getElementById("limits").innerHTML = `
    <h2>${t("lim.title")}</h2>
    <ul class="small limits">${["about.l1", "about.l2", "about.l3", "about.l4"].map((k) => `<li>${esc(t(k))}</li>`).join("")}</ul>
    <p class="lim-more"><button type="button" class="link-button" data-about>${icon("info", 16)}${esc(t("lim.more"))} ›</button></p>`;

  document.getElementById("view-label").textContent = t("view.label");
  document.getElementById("views").setAttribute("aria-label", t("view.label"));
  document.getElementById("foot").innerHTML = `<span>${esc(t("foot.data"))}</span>
    <span><a href="${REPO}">${esc(t("foot.repo"))}</a> · <a href="${KIT}">${esc(t("foot.kit"))}</a></span>`;
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
const hexLegend = () => BANDS.map(([, , label], b) => `<span class="key"><i class="hexkey" style="background:var(--hex-${b})"></i>${label}</span>`).join("");
function renderMapBar(info) {
  if (info) renderMapBar.info = info;
  const { nHex, nMapped } = renderMapBar.info || { nHex: 0, nMapped: 0 };
  document.getElementById("views").innerHTML = [0, 1, 2].map((v) =>
    `<button type="button" data-view="${v}" aria-pressed="${state.view === v}">${t(`view.${v}`)}</button>`).join("");
  document.querySelectorAll("#views [data-view]").forEach((b) => { b.onclick = () => setView(Number(b.dataset.view)); });
  document.getElementById("map-aside").textContent = t(`map.aside.${state.view}`, { h: num(nHex), n: num(nMapped) });

  const legend = document.getElementById("legend");
  if (state.view === 0) {
    legend.innerHTML = `<span class="xs muted">${t("legend.hex")}</span>${hexLegend()}<span class="key"><i class="hexkey ring"></i>${t("legend.selected")}</span>`;
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
// one row's summary: the condition, "area vs Victoria", the bar and the gap
const rowSummary = (row) => `<span class="cmp-cond">${esc(valueName(row.label))}</span>
  <span class="cmp-vals num">${t("cmp.vs", { a: pct(row.areaShare), b: pct(row.vicShare) })}</span>
  ${bar(row.diff)}
  <span class="cmp-d num" title="${esc(t(row.diff >= 0 ? "cmp.higher" : "cmp.lower"))}">${pp(row.diff)}<small> pp</small></span>`;

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
    const summary = top ? rowSummary(top) : `<span class="cmp-cond muted">${esc(t("cmp.none"))}</span>`;
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

// ---- How to use -------------------------------------------------------------------------------------------
// what a step looks like on the map page, drawn with the page's own pieces so the reader knows it when they see it
function stepVisual(i) {
  if (i === 0) return `<div class="legend guide-key" aria-hidden="true"><span class="xs muted">${t("legend.hex")}</span>${hexLegend()}</div>`;
  if (i === 1) return `<div class="guide-key row" aria-hidden="true"><span class="key"><i class="hexkey ring"></i>${t("legend.selected")}</span>
    <span class="tool">${BOX}<span>${t("map.select")}</span></span><span class="tool">${RESET}<span>${t("map.reset")}</span></span></div>`;
  if (i === 2) return `<div class="guide-key row" aria-hidden="true"><span class="xs muted">${t("filters.sev")}</span><span class="tool">${esc(sevName(0))} ▾</span>
    <span class="xs muted">${t("filters.age")}</span><span class="seg demo">${[[t("filters.all"), false], [ageName(1), true], [ageName(0), false]].map(([text, on]) => `<span class="${on ? "on" : ""}">${esc(text)}</span>`).join("")}</span></div>`;
  if (i === 3) {
    // the default sample's speed-zone rows: the biggest gap above Victoria and the biggest below, as the panel shows them
    const keep = filtered(data, { year: null, sev: null, band: null, age: null });
    const f = factor(data, keep, selectedMask(data, keep, { hexes: new Set(), crashes: new Set() }, 0).mask, "speed");
    const known = f.rows.filter((r) => r.areaN > 0);
    const low = known.reduce((m, r) => (r.diff < m.diff ? r : m), known[0]);
    const row = (r) => `<div class="cmp-demo"><span class="cmp-factor">${t("factor.speed")}</span>${rowSummary(r)}</div>`;
    return `<div class="guide-key cmp-demos" aria-hidden="true">${row(f.top)}${low && low.diff < 0 ? row(low) : ""}</div>`;
  }
  if (i === 4) return `<div class="guide-key row" aria-hidden="true"><span class="seg demo">${[0, 1, 2].map((v) => `<span class="${v === 0 ? "on" : ""}">${t(`view.${v}`)}</span>`).join("")}</span>
    <span class="key"><i class="dotkey" style="background:var(--crash)"></i>${t("legend.crash")}</span><span class="key"><i class="dotkey sensor"></i>${t("legend.sensor")}</span></div>`;
  return "";
}
function renderGuide() {
  const g = GUIDE[getLang()];
  document.getElementById("guide").innerHTML = `
    <div class="page-intro"><h2>${esc(g.title)}</h2><p>${esc(g.lede)}</p></div>
    <ol class="guide-steps">${g.steps.map((s, i) => `<li class="card guide-step">
      <h3><span class="step-n" aria-hidden="true">${i + 1}</span>${esc(s.h)}</h3>
      <ul>${s.items.map((x) => `<li>${x}</li>`).join("")}</ul>${stepVisual(i)}</li>`).join("")}
      <li class="card guide-step care"><h3><span class="step-n" aria-hidden="true">!</span>${esc(g.careH)}</h3>
        <ul>${g.care.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        <p class="lim-more"><button type="button" class="link-button" data-about>${icon("info", 16)}${esc(t("lim.more"))} ›</button></p></li>
    </ol>
    <h2 class="section-head">${esc(g.tryH)}</h2>
    <p class="page-lede">${esc(g.tryLede)}</p>
    <div class="try-grid">${g.examples.map((e) => `<div class="card try-card">
      <p class="try-q">${esc(e.q)}</p><p class="try-how">${esc(e.how)}</p>
      <button type="button" class="btn soft" data-example="${e.id}">${esc(g.go)} ›</button></div>`).join("")}</div>`;
}

// the examples set the filters and the view from scratch, clear any selection and open the map
const WIDE_MELBOURNE = [[144.85, -37.97], [145.17, -37.69]];
const EXAMPLES = {
  old: { filters: { age: 1 }, bounds: WIDE_MELBOURNE },
  peak: { filters: { band: 3 } },
  night: { filters: { band: 0 } },
  foot: { view: 2 },
};
function runExample(id) {
  const ex = EXAMPLES[id];
  if (!ex) return;
  state.filters = { year: null, sev: null, band: null, age: null, ...(ex.filters || {}) };
  state.view = ex.view ?? 0;
  state.sel.hexes.clear(); state.sel.crashes.clear();
  if (state.boxing) { state.boxing = false; mapApi.setBoxing(false); }
  fitTo = ex.bounds || HOME;
  update();
  if (state.page === "map") showPage(); else location.hash = "#map";
}

// ---- What this project solves --------------------------------------------------------------------------------
function renderProject() {
  const p = PROJECT[getLang()];
  const pages = [["map", "nav.map"], ["guide", "nav.guide"]].map(([go, key]) => `<a href="#${go}">${esc(t(key))} ›</a>`).join("");
  const cards = p.cards.map((c, i) => `<section class="card brief-card"><h3><span class="step-n" aria-hidden="true">${["A", "B", "C"][i]}</span>${esc(c.h)}</h3>
    <ul>${c.items.map((x) => `<li>${x}</li>`).join("")}</ul>${i === 2 ? `<p class="brief-try"><span>${esc(p.tryIt)}</span>${pages}</p>` : ""}</section>`).join("");
  document.getElementById("project").innerHTML = `
    <div class="page-intro"><h2>${esc(p.title)}</h2><p>${esc(p.lede)}</p></div>
    <div class="brief-grid">${cards}</div>
    <p class="xs muted">${esc(p.source)}</p>
    <h2 class="section-head">${esc(p.shotsH)}</h2>
    <p class="page-lede">${esc(p.shotsLede)}</p>
    <div class="shots">${p.shots.map((s) => `<figure class="shot"><a href="${s.src}"><img src="${s.src}" alt="${esc(s.alt)}" width="1600" height="900" loading="lazy"></a>
      <figcaption>${esc(s.cap)}</figcaption></figure>`).join("")}</div>
    <section class="card ai-note"><h3>${esc(p.aiH)}</h3><p>${esc(p.ai)}</p></section>`;
}

// ---- About the data & methods (a dialog, as in Ready to Train?) --------------------------------------------------
function openAbout() {
  let dlg = document.querySelector("dialog.about");
  if (!dlg) { dlg = document.createElement("dialog"); dlg.className = "about"; document.body.appendChild(dlg); dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); }
  dlg.innerHTML = `<div class="about-in"><div class="about-head"><h2>${esc(t("about.title"))}</h2><button type="button" class="tool" id="about-close">${esc(t("ui.close"))}</button></div>
    <h3>${esc(t("about.web"))}</h3><p>${esc(t("about.p1"))}</p>
    <h3>${esc(t("how.title"))}</h3>${["how.p1", "how.p2", "how.p3"].map((k) => `<p>${esc(t(k))}</p>`).join("")}
    <h3>${esc(t("about.limits"))}</h3><ul>${["about.l1", "about.l2", "about.l3", "about.l4"].map((k) => `<li>${esc(t(k))}</li>`).join("")}</ul>
    <h3>${esc(t("src.title"))}</h3><ul>${["src.crash", "src.foot", "src.map", "src.ai"].map((k) => `<li>${esc(t(k))}</li>`).join("")}</ul></div>`;
  dlg.querySelector("#about-close").onclick = () => dlg.close();
  dlg.showModal();
}

// ---- pages ----------------------------------------------------------------------------------------------------
const pageFromHash = () => { const p = location.hash.replace(/^#/, "").split(/[/?]/)[0]; return PAGES.includes(p) ? p : "map"; };
function renderPage() {
  if (state.page === "guide") renderGuide();
  if (state.page === "project") renderProject();
}
function showPage() {
  document.querySelectorAll("main > [data-page]").forEach((el) => { el.hidden = el.dataset.page !== state.page; });
  const other = getLang() === "zh" ? "en" : "zh";
  document.title = state.page === "map" ? `${t("page.title")} · ${tIn(other, "page.title")}` : `${t(`nav.${state.page}`)} · ${t("page.title")}`;
  sidebar();
  renderHead();
  renderPage();
  if (state.page === "map") {
    // the map box had no size while hidden: fit it to the window again, then to the view an example asked for
    requestAnimationFrame(() => {
      mapApi.map.resize();
      if (fitTo) { mapApi.map.fitBounds(fitTo, { duration: 0 }); fitTo = null; }
    });
  }
}

function renderAll() {
  renderStatic();
  renderTips();
  update();
  showPage();
}

// clicks anywhere: the methods dialog, an example
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-about], [data-example]");
  if (!el) return;
  if (el.dataset.example) runExample(el.dataset.example);
  else openAbout();
});

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
  state.page = pageFromHash();
  // the map is made while its page is on screen, so MapLibre starts with the real box size
  document.querySelector('main > [data-page="map"]').hidden = false;
  mapApi = createMap(document.getElementById("map"), { onHover: hover, onClick: click, onBox: (items) => boxed(items), label: t("map.aria"), dark: isDark() });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyLook);
  renderAll();
  window.addEventListener("hashchange", () => {
    const next = pageFromHash();
    if (next === state.page) return;
    state.page = next;
    hover(null);
    showPage();
    window.scrollTo(0, 0);
  });
}

start();
