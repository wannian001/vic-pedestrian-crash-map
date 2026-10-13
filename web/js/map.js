// The map: a MapLibre basemap (OpenFreeMap positron or dark, following the page's mode; free, no key) under one
// canvas the page draws itself: hexes, single crashes or footfall sensors. The canvas is pinned to the map box
// and redrawn on every frame the map moves, so 17,500 points stay quick; hover and click find the nearest mark
// through a pixel grid.
/* global maplibregl */

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
// the style's own source credits OpenFreeMap, OpenMapTiles and OpenStreetMap in the attribution control
// the first view: inner Melbourne around the CBD, fitted to the box so a phone sees the same area as a laptop
export const HOME = [[144.915, -37.848], [145.02, -37.778]];
const CELL = 24;  // pixel grid for hit testing

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function createMap(el, { onHover, onClick, onBox, label, dark }) {
  let styleMode = dark ? "dark" : "light";
  const map = new maplibregl.Map({
    container: el, style: STYLES[styleMode], bounds: HOME, minZoom: 5, maxZoom: 17.5,
    attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, boxZoom: false,
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
  // the credits start folded into their (i) button on a narrow map, so they do not cover it
  map.once("idle", () => {
    const attrib = el.querySelector(".maplibregl-ctrl-attrib");
    if (attrib && el.clientWidth < 640) { attrib.classList.remove("maplibregl-compact-show"); attrib.removeAttribute("open"); }
  });
  el.setAttribute("aria-label", label);
  function setBasemap(dark) {
    const mode = dark ? "dark" : "light";
    if (mode === styleMode) return;
    map.setStyle(STYLES[mode]);
    styleMode = mode;
  }

  // the canvas sits over the basemap and under the zoom buttons
  const canvas = document.createElement("canvas");
  canvas.className = "map-canvas";
  map.getContainer().appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let scene = { view: 0, hexes: [], points: null, sensors: [] };
  let grid = new Map(), drawn = [];
  let frame = 0;

  function size() {
    const W = el.clientWidth, H = el.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function hexPath(x, y, r) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI / 3) * k;  // flat-top, like Tableau's lattice
      const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  function index(item, x, y, r) {
    drawn.push(item);
    item._x = x; item._y = y; item._r = r;
    const k = `${Math.floor(x / CELL)}|${Math.floor(y / CELL)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(item);
  }

  function draw() {
    frame = 0;
    const W = el.clientWidth, H = el.clientHeight;
    ctx.clearRect(0, 0, W, H);
    grid = new Map(); drawn = [];
    const pad = 40;
    const inView = (p) => p.x > -pad && p.y > -pad && p.x < W + pad && p.y < H + pad;
    const accent = css("--accent"), halo = css("--surface");
    const z = map.getZoom();
    if (scene.view === 0) {
      // a hex's side is 1/scale degree of longitude. Like the Tableau marks, each is drawn well inside its cell,
      // so the streets show between hexes; never smaller than a few pixels when zoomed out.
      const c = map.getCenter();
      const side = map.project([c.lng + 1 / scene.scale, c.lat]).x - map.project([c.lng, c.lat]).x;
      const r = Math.min(Math.max(2.6, side * 0.5), 24);
      const fills = [0, 1, 2, 3, 4, 5].map((b) => css(`--hex-${b}`));
      const picked = [];
      for (const h of scene.hexes) {  // sorted low to high, so hot hexes are drawn last, on top
        const p = map.project([h.lon, h.lat]);
        if (!inView(p)) continue;
        hexPath(p.x, p.y, r);
        ctx.fillStyle = fills[h.band];
        ctx.fill();
        index(h, p.x, p.y, r);
        if (h.selected) picked.push(p);
      }
      for (const p of picked) {  // the compared area: an accent ring with a halo so it reads on any fill
        hexPath(p.x, p.y, r + 2);
        ctx.lineWidth = 4; ctx.strokeStyle = halo; ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = accent; ctx.stroke();
      }
    } else if (scene.view === 1 && scene.points) {
      const { lat, lon, keep, sel } = scene.points;
      const r = z >= 15 ? 4 : z >= 13 ? 3 : z >= 10 ? 2.2 : 1.6;
      ctx.fillStyle = css("--crash");
      ctx.globalAlpha = 0.75;
      const chosen = [];
      for (let i = 0; i < lat.length; i++) {
        if (!keep[i] || lat[i] === null) continue;
        const p = map.project([lon[i], lat[i]]);
        if (!inView(p)) continue;
        if (sel[i]) { chosen.push([i, p]); continue; }
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        index({ kind: "crash", i }, p.x, p.y, r);
      }
      ctx.globalAlpha = 1;
      for (const [i, p] of chosen) {
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 1.4, 0, Math.PI * 2);
        ctx.fillStyle = accent; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = halo; ctx.stroke();
        index({ kind: "crash", i }, p.x, p.y, r + 1.4);
      }
    } else if (scene.view === 2) {
      const max = Math.max(...scene.sensors.map((s) => s.avg));
      const R = 16 * Math.pow(2, (z - 14) / 2);  // the busiest sensor's radius at zoom 14, growing gently with zoom
      const color = css("--sensor");
      for (const s of [...scene.sensors].sort((a, b) => b.avg - a.avg)) {
        const p = map.project([s.lon, s.lat]);
        const r = Math.max(2.5, R * Math.sqrt(s.avg / max));
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.globalAlpha = 0.28; ctx.fillStyle = color; ctx.fill();
        ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2; ctx.strokeStyle = color; ctx.stroke();
        index({ kind: "sensor", s }, p.x, p.y, r);
      }
      ctx.globalAlpha = 1;
    }
  }
  const redraw = () => { if (!frame) frame = requestAnimationFrame(draw); };

  // the nearest drawn mark within its radius (at least 6 px, so small dots are easy to hit)
  function hit(point) {
    const cx = Math.floor(point.x / CELL), cy = Math.floor(point.y / CELL);
    let best = null, bestD = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const item of grid.get(`${cx + dx}|${cy + dy}`) || []) {
        const d = Math.hypot(item._x - point.x, item._y - point.y);
        if (d <= Math.max(item._r, 6) && d < bestD) { best = item; bestD = d; }
      }
    }
    return best;
  }

  map.on("mousemove", (e) => {
    if (boxing) return;
    const item = hit(e.point);
    map.getCanvas().style.cursor = item && scene.view !== 2 ? "pointer" : "";
    onHover(item, e.originalEvent);
  });
  map.on("mouseout", () => onHover(null));
  map.on("click", (e) => {
    if (boxing) return;
    const o = e.originalEvent;
    onClick(hit(e.point), o.shiftKey || o.metaKey || o.ctrlKey);
  });
  map.on("move", redraw);
  map.on("resize", () => { size(); draw(); });
  // the map box grows with the page layout (it stretches to the height of the column beside it), not only with the window
  new ResizeObserver(() => map.resize()).observe(el);
  map.on("styledata", redraw);

  // box select: while on, a drag draws a box instead of panning; every drawn mark inside it is picked
  let boxing = false, start = null;
  const box = document.createElement("div");
  box.className = "map-box";
  map.getContainer().appendChild(box);
  const local = (e) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  el.addEventListener("pointerdown", (e) => {
    if (!boxing || e.button !== 0 || e.target.closest(".maplibregl-ctrl")) return;
    start = local(e);
    el.setPointerCapture(e.pointerId);
    Object.assign(box.style, { display: "block", left: `${start.x}px`, top: `${start.y}px`, width: "0px", height: "0px" });
    e.preventDefault();
  }, true);
  el.addEventListener("pointermove", (e) => {
    if (!boxing || !start) return;
    const p = local(e);
    Object.assign(box.style, { left: `${Math.min(p.x, start.x)}px`, top: `${Math.min(p.y, start.y)}px`, width: `${Math.abs(p.x - start.x)}px`, height: `${Math.abs(p.y - start.y)}px` });
  });
  el.addEventListener("pointerup", (e) => {
    if (!boxing || !start) return;
    const p = local(e);
    const x0 = Math.min(p.x, start.x), x1 = Math.max(p.x, start.x), y0 = Math.min(p.y, start.y), y1 = Math.max(p.y, start.y);
    start = null;
    box.style.display = "none";
    if (x1 - x0 < 4 || y1 - y0 < 4) return;
    onBox(drawn.filter((item) => item._x >= x0 && item._x <= x1 && item._y >= y0 && item._y <= y1));
  });
  function setBoxing(on) {
    boxing = on;
    el.classList.toggle("boxing", on);
    if (on) { map.dragPan.disable(); onHover(null); } else map.dragPan.enable();
  }

  size();
  return {
    map,
    setBasemap,
    setScene(next) { scene = { ...scene, ...next }; redraw(); },
    setBoxing,
    redraw,
  };
}
