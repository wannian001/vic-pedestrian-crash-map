// Words on the page, English and Chinese. Data values (conditions, crash types) are translated here too;
// road and council names stay as recorded.

let lang = "en";
export const getLang = () => lang;
export function setLang(next) {
  lang = next === "zh" ? "zh" : "en";
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
}

const W = {
  en: {
    "app.name": "Crash hotspots",
    "page.title": "Pedestrian crash hotspots in Victoria",
    "page.sub": "Where do crashes concentrate, and what sets those places apart? {n} pedestrian crashes, 1 Jan 2012 – 30 Nov 2025.",
    "ui.lang": "中文",
    "ui.mode": "Light / dark",
    "ui.loading": "Loading 17,510 crashes…",
    "ui.failed": "The data did not load",
    "ui.reload": "Reload",

    "view.label": "Map view",
    "view.0": "Hotspots",
    "view.1": "Crashes",
    "view.2": "Footfall",
    "map.aside.0": "{h} hexes · {n} crashes on the map",
    "map.aside.1": "{n} crashes on the map",
    "map.aside.2": "84 sensors · City of Melbourne 2025",
    "map.select": "Select an area",
    "map.select.on": "Drag a box on the map",
    "map.reset": "Back to the default sample",
    "map.hint.0": "Click a hex to compare it with Victoria; shift-click adds more. Or select an area.",
    "map.hint.1": "Click a crash to see it against Victoria; shift-click adds more. Or select an area.",
    "map.hint.2": "Circles are sensors, sized by average daily footfall. Context only: not joined to crash records.",
    "map.aria": "Map of pedestrian crashes in Victoria",
    "legend.hex": "Crashes per hex",
    "legend.crash": "One crash",
    "legend.selected": "In the compared area",
    "legend.sensor": "Sensor (size = average daily footfall)",

    "filters.title": "Filters",
    "filters.aside": "Change the map and the comparison, not the footfall layer",
    "filters.year": "Crash year",
    "filters.sev": "Severity",
    "filters.band": "Time of day",
    "filters.age": "Pedestrian age",
    "filters.all": "All",
    "filters.clear": "Clear filters",
    "filters.none": "No crash matches these filters.",

    "cmp.title": "Selection vs Victoria",
    "cmp.default": "Default sample · Melbourne CBD core · n = {n}",
    "cmp.area": "Selected area · n = {n}",
    "cmp.small": "Selected area · n = {n} · small sample, describe only",
    "cmp.single": "Only one crash in the selection · describe only",
    "cmp.empty": "No crash in the selection passes the filters.",
    "cmp.explain": "Share of crashes with each condition, the area against all of Victoria under the same filters. Each row shows the condition with the biggest gap; open it for the rest.",
    "cmp.vs": "{a} vs {b}",
    "cmp.pp": "{d} pp",
    "cmp.higher": "more common here than across Victoria",
    "cmp.lower": "less common here than across Victoria",
    "cmp.none": "None of the area's crashes has a known value.",
    "cmp.th.cond": "Condition",
    "cmp.th.area": "Area",
    "cmp.th.vic": "Victoria",
    "cmp.th.gap": "Gap",
    "cmp.unknown": "Unknown is never shown as a condition but stays in both denominators. Weather and surface can have more than one condition per crash.",
    "factor.weather": "Weather",
    "factor.surface": "Surface",
    "factor.light": "Light",
    "factor.speed": "Speed zone",
    "factor.geom": "Road geometry",

    "ov.title": "Victoria at a glance",
    "ov.aside": "All {n} crashes; the filters do not change these",
    "ov.year": "Year",
    "ov.year.v": "{avg} crashes a year on average (2012–2024); 2020 lowest at {low}",
    "ov.sev": "Severity",
    "ov.sev.v": "{f}% fatal, {s}% serious injury, {o}% other injury",
    "ov.time": "Time",
    "ov.time.v": "15:00–18:00 busiest ({n}); 00:00–05:00 deadliest ({p}% fatal)",
    "ov.age": "Age",
    "ov.age.v": "Pedestrians 65+: {a}% of crashes, {f}% of the fatal ones",
    "ov.place": "Place",
    "ov.place.v": "Melbourne council area alone: {n} crashes ({p}%)",
    "ov.foot": "Footfall",
    "ov.foot.v": "The busiest sensors sit on the highest-count hexes; not joined to crashes",

    "about.title": "About this map",
    "about.p1": "A solo assignment for GEOM90007 Information Visualisation at the University of Melbourne (August 2026, Tableau; 84.3/100, class mean 70.0). The brief's reader is Transport Victoria, deciding where to act on pedestrian safety. This page rebuilds the dashboard for the web with the same data and the same rules, so it can be opened without Tableau.",
    "about.limits": "Limits",
    "about.l1": "Crash counts are not risk: places with more people walking have more crashes. No exposure adjustment.",
    "about.l2": "Hexes are bins of equal size in degrees, not equal-area units.",
    "about.l3": "Footfall sensors cover the City of Melbourne only and are context, not joined to crash records.",
    "about.l4": "2025 runs to 30 November only.",
    "how.title": "How this is worked out",
    "how.p1": "Crashes: every crash with at least one pedestrian in the Victoria Road Crash Data (17,510; 17,501 have coordinates). Hexes use Tableau's HEXBINX and HEXBINY on longitude and latitude times 200 (side 1/200 of a degree), reproduced exactly, so each hex holds the same crashes as on the dashboard.",
    "how.p2": "Comparison: for each factor, the share of the area's crashes with a condition against the share across Victoria, both under the current filters. Unknown values count in the denominators but are never the highlighted condition. The default area is the 120 crashes nearest Flinders Street station.",
    "how.p3": "Nine records give the time as minutes and seconds (\"30:00.0\"); Tableau read the first part as hours past midnight, wrapping at 24, and so does this page, to keep the same time-of-day numbers as the dashboard.",
    "src.title": "Sources",
    "src.crash": "Crashes: Department of Transport and Planning, Victoria Road Crash Data, CC BY 4.0 (as prepared for the course).",
    "src.foot": "Footfall: City of Melbourne Pedestrian Counting System; 2025 average daily counts per sensor (84 sensors).",
    "src.map": "Basemap: OpenFreeMap, © OpenMapTiles, data © OpenStreetMap contributors.",
    "src.ai": "Built with Claude Code from the author's Tableau workbook; the author set the requirements and checked the numbers.",
    "foot.repo": "Source and the Tableau workbook",
    "foot.kit": "Design: dayring kit",

    "tip.hex": "{lga}\n{n} crashes · {period}\n{sev}\nClick to compare with Victoria",
    "tip.hex.many": "{lga} + nearby",
    "tip.sev.many": "Several severities",
    "tip.crash": "{road}, {lga}\n{date} · {time} · {type}\nSeverity: {sev}\nSpeed zone: {speed} · Pedestrians: {peds}\n{id}",
    "tip.sensor": "{name}\nAverage daily footfall: {n}\n2025 complete-day average · context only",
  },
  zh: {
    "app.name": "事故热点",
    "page.title": "维州行人事故热点地图",
    "page.sub": "事故集中在哪里？这些地方和全州比有什么不同？2012 年 1 月 1 日至 2025 年 11 月 30 日，共 {n} 起行人事故。",
    "ui.lang": "EN",
    "ui.mode": "浅色 / 深色",
    "ui.loading": "正在加载 17,510 起事故…",
    "ui.failed": "数据没加载出来",
    "ui.reload": "重新加载",

    "view.label": "地图视图",
    "view.0": "热点",
    "view.1": "单起事故",
    "view.2": "行人流量",
    "map.aside.0": "{h} 个六边形 · 地图上 {n} 起",
    "map.aside.1": "地图上 {n} 起",
    "map.aside.2": "84 个传感器 · 墨尔本市 2025 年",
    "map.select": "框选区域",
    "map.select.on": "在地图上拖出一个框",
    "map.reset": "回到默认样本",
    "map.hint.0": "点一个六边形，和全州比；按住 Shift 再点可以多选。也可以框选。",
    "map.hint.1": "点一起事故，和全州比；按住 Shift 再点可以多选。也可以框选。",
    "map.hint.2": "圆圈是行人流量传感器，大小 = 日均人流。只作背景，没有和事故记录关联。",
    "map.aria": "维州行人事故地图",
    "legend.hex": "每个六边形的事故数",
    "legend.crash": "一起事故",
    "legend.selected": "在对比区域内",
    "legend.sensor": "传感器（大小 = 日均人流）",

    "filters.title": "筛选",
    "filters.aside": "会改地图和对比，不改行人流量",
    "filters.year": "年份",
    "filters.sev": "严重程度",
    "filters.band": "时段",
    "filters.age": "行人年龄",
    "filters.all": "全部",
    "filters.clear": "清除筛选",
    "filters.none": "没有符合这些筛选的事故。",

    "cmp.title": "所选区域 vs 全州",
    "cmp.default": "默认样本 · 墨尔本 CBD 核心 · n = {n}",
    "cmp.area": "所选区域 · n = {n}",
    "cmp.small": "所选区域 · n = {n} · 样本小，只作描述",
    "cmp.single": "所选范围里只有一起事故 · 只作描述",
    "cmp.empty": "所选范围里没有符合筛选的事故。",
    "cmp.explain": "各条件下的事故占比：所选区域对全州，用同样的筛选。每行显示差距最大的那个条件，点开看其余条件。",
    "cmp.vs": "{a} 对 {b}",
    "cmp.pp": "{d} 个百分点",
    "cmp.higher": "这里比全州更常见",
    "cmp.lower": "这里比全州更少见",
    "cmp.none": "区域里的事故都没有这一项的已知值。",
    "cmp.th.cond": "条件",
    "cmp.th.area": "区域",
    "cmp.th.vic": "全州",
    "cmp.th.gap": "差距",
    "cmp.unknown": "「未知」不会被当作条件显示，但算在两边的分母里。天气和路面一起事故可以有好几种。",
    "factor.weather": "天气",
    "factor.surface": "路面",
    "factor.light": "光线",
    "factor.speed": "限速",
    "factor.geom": "道路形态",

    "ov.title": "全州概况",
    "ov.aside": "全部 {n} 起，不随筛选变化",
    "ov.year": "年份",
    "ov.year.v": "平均每年 {avg} 起（2012–2024）；2020 年最少，{low} 起",
    "ov.sev": "严重程度",
    "ov.sev.v": "致命 {f}%，重伤 {s}%，其他受伤 {o}%",
    "ov.time": "时段",
    "ov.time.v": "15:00–18:00 最多（{n} 起）；00:00–05:00 最致命（{p}% 为致命）",
    "ov.age": "年龄",
    "ov.age.v": "65 岁以上行人：占全部事故 {a}%，占致命事故 {f}%",
    "ov.place": "地点",
    "ov.place.v": "仅墨尔本市一个行政区：{n} 起（{p}%）",
    "ov.foot": "行人流量",
    "ov.foot.v": "人流最多的传感器落在事故最多的六边形上；两者没有关联计算",

    "about.title": "关于这张地图",
    "about.p1": "墨尔本大学 GEOM90007 信息可视化课程的个人作业（2026 年 8 月，Tableau；84.3/100，班均 70.0）。作业设定的读者是维州交通部门，要决定在哪里改善行人安全。这一页用同样的数据和同样的口径，把看板做成网页版，不装 Tableau 也能看。",
    "about.limits": "局限",
    "about.l1": "事故数不等于风险：走路的人多，事故就多。没有按人流折算。",
    "about.l2": "六边形按经纬度等分，不是等面积单元。",
    "about.l3": "行人流量传感器只覆盖墨尔本市，只作背景，没有和事故记录关联。",
    "about.l4": "2025 年只到 11 月 30 日。",
    "how.title": "这些数字怎么算的",
    "how.p1": "事故：维州道路事故数据里至少涉及一名行人的事故（17,510 起，其中 17,501 起有坐标）。六边形用 Tableau 的 HEXBINX、HEXBINY，经纬度乘 200（边长 1/200 度），算法逐条复现，每个六边形里的事故和看板上完全一样。",
    "how.p2": "对比：每一类条件里，所选区域中带某个条件的事故占比，对全州的占比，两边都用当前筛选。「未知」算在分母里，但不会被选为高亮条件。默认区域是离 Flinders Street 车站最近的 120 起事故。",
    "how.p3": "有 9 条记录的时间写成了分和秒（「30:00.0」）。Tableau 把前一段当成小时，超过 24 就绕回；这一页照做，时段数字和看板保持一致。",
    "src.title": "来源",
    "src.crash": "事故：维州交通与规划部 Victoria Road Crash Data，CC BY 4.0（课程整理版）。",
    "src.foot": "行人流量：墨尔本市政府 Pedestrian Counting System；各传感器 2025 年日均人流（84 个）。",
    "src.map": "底图：OpenFreeMap，© OpenMapTiles，数据 © OpenStreetMap contributors。",
    "src.ai": "由 Claude Code 依据作者的 Tableau 工作簿搭建；需求和数字核对由作者完成。",
    "foot.repo": "源码和 Tableau 工作簿",
    "foot.kit": "设计：dayring 设计套件",

    "tip.hex": "{lga}\n{n} 起 · {period}\n{sev}\n点一下，和全州比",
    "tip.hex.many": "{lga} 及周边",
    "tip.sev.many": "多种严重程度",
    "tip.crash": "{road}，{lga}\n{date} · {time} · {type}\n严重程度：{sev}\n限速：{speed} · 行人：{peds} 名\n{id}",
    "tip.sensor": "{name}\n日均人流：{n}\n2025 年完整日平均 · 只作背景",
  },
};

export function t(key, vars = {}) {
  const s = W[lang][key] ?? W.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

// numbers with thousands separators (both languages), shares with one decimal
export const num = (n) => Number(n).toLocaleString("en-AU");
export const pct = (x) => `${(Math.round(x * 1000) / 10).toFixed(1)}%`;

const SEV = { en: ["Fatal", "Serious injury", "Other injury", "Other / unknown"], zh: ["致命", "重伤", "其他受伤", "其他或未知"] };
const BAND = {
  en: ["00–05 late night", "06–09 morning peak", "10–14 midday", "15–18 afternoon peak", "19–23 evening"],
  zh: ["00–05 深夜", "06–09 早高峰", "10–14 中午", "15–18 下午高峰", "19–23 晚上"],
};
const AGE = { en: ["Other ages", "65+"], zh: ["其他年龄", "65 岁以上"] };
export const sevName = (i) => SEV[lang][i];
export const bandName = (i) => BAND[lang][i];
export const ageName = (i) => AGE[lang][i];

// conditions and crash types as recorded -> Chinese; English shows the record with small clean-ups
const ZH = {
  Unknown: "未知",
  Clear: "晴", Raining: "下雨", "Strong winds": "大风", Dust: "扬尘", Fog: "雾", Snowing: "下雪", Smoke: "烟雾",
  Dry: "干燥", Wet: "湿滑", Muddy: "泥泞", Icy: "结冰", Snowy: "积雪",
  Day: "白天", "Dark – lights on": "夜间 · 路灯开", "Dark Street lights unknown": "夜间 · 路灯情况不明", "Dusk/Dawn": "黄昏或清晨",
  "Dark No street lights": "夜间 · 没有路灯", "Dark Street lights off": "夜间 · 路灯关",
  "Other speed limit": "其他限速", "Camping grounds or off road": "营地或非道路",
  "T intersection": "丁字路口", "Not at intersection": "不在路口", "Multiple intersection": "多路交叉口", Crossing: "十字路口",
  "Y intersection": "Y 形路口", "Dead end": "尽头路", "Road closure": "封路处", "Private property": "私人场地",
  "Struck Pedestrian": "撞到行人", "Collision with vehicle": "与车辆相撞", "Collision with a fixed object": "撞到固定物体",
  "collision with some other object": "撞到其他物体", "Fall from or in moving vehicle": "从行驶中的车上跌落",
  "No collision and no object struck": "没有碰撞", "Vehicle overturned (no collision)": "车辆侧翻（无碰撞）",
  "Other accident": "其他事故", "Struck animal": "撞到动物",
};
const EN = {
  "Dark Street lights unknown": "Dark – lights unknown", "Dark No street lights": "Dark – no street lights",
  "Dark Street lights off": "Dark – lights off", "collision with some other object": "Collision with some other object",
  "Struck Pedestrian": "Struck pedestrian",
};
export function valueName(v) {
  const speed = /^(\d+)\s*km\/hr$/.exec(v);
  if (speed) return `${speed[1]} km/h`;
  return lang === "zh" ? (ZH[v] ?? v) : (EN[v] ?? v);
}

// 20251130 -> "30/11/2025"; 1835 -> "18:35"
export const dateText = (d) => `${String(d % 100).padStart(2, "0")}/${String(Math.floor(d / 100) % 100).padStart(2, "0")}/${Math.floor(d / 10000)}`;
export const timeText = (hm) => `${String(Math.floor(hm / 100)).padStart(2, "0")}:${String(hm % 100).padStart(2, "0")}`;
