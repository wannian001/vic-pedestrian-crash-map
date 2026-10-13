"""为网页版样例生成数据：web/data/crashes.json 和 web/data/sensors.json。

口径与 Tableau 工作簿一致（计算字段逐条照搬），生成后用看板上的数字逐项核对，有一项对不上就失败退出。

用法（在仓库根目录）：
    python3 tools/build_web_data.py RAW_DIR
RAW_DIR 是课程发的数据解压后的目录，里面要有 Road_Crash_Vic_Core_Dataset.csv 和
Additional tables/Atmospheric_cond.csv、Additional tables/Road_surface_cond.csv。
默认样本（墨尔本 CBD 核心 120 起）和行人流量传感器表从仓库里的提交版 .twbx 读取。
只用标准库。
"""
import csv
import io
import json
import math
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TWBX = ROOT / "GEOM90007_A1_Pedestrian_Crash_Map_JiakuoTang.twbx"
OUT = ROOT / "web" / "data"

UNKNOWN = {"", "unknown", "not known", "unk", "unk."}
SEVERITY = {"Fatal accident": 0, "Serious injury accident": 1, "Other injury accident": 2}  # 其余 = 3（Other / Unknown）
HEX_SCALE = 200.0  # HEXBINX([LONGITUDE] * 200., [LATITUDE] * 200.)
SQRT3 = math.sqrt(3.0)


def clean(value, renames=None):
    """c.Weather Clean / Surface / Light / Speed / Geometry：空值和各种 unknown 记为 Unknown，个别值改短名。"""
    text = (value or "").strip()
    if text.lower() in UNKNOWN:
        return "Unknown"
    return (renames or {}).get(text.lower(), text)


def time_band(hour):
    """Time：00–05 / 06–09 / 10–14 / 15–18 / 19–23，记为 0–4。"""
    return 0 if hour < 6 else 1 if hour < 10 else 2 if hour < 15 else 3 if hour < 19 else 4


def half_up_to_step(value, step):
    return math.floor(value / step + 0.5) * step


def tableau_hexbin(x, y):
    """Tableau 2026.2 HEXBINX/HEXBINY 的逐条复现（边长 1 的平顶六边形，Y 中心舍入到 0.001）。
    出自 A1 当初对 libtabvizengine 的复现脚本 gate_b_hex_metrics.py，返回整数格点键 (ix, iy)：
    中心 X = 1.5 * ix，中心 Y = sqrt(3) / 2 * iy。"""
    x0 = half_up_to_step(x, 3.0)
    y0 = half_up_to_step(y, SQRT3)
    dx, dy = x - x0, y - y0
    if (abs(dx) - 1.0) * SQRT3 + abs(dy) > 0.0:
        x0 += -1.5 if dx < 0.0 else 1.5
        y0 += -SQRT3 / 2.0 if dy < 0.0 else SQRT3 / 2.0
    y0 = math.floor(y0 * 1000.0 + 0.5) / 1000.0
    return round(x0 / 1.5), round(y0 / (SQRT3 / 2.0))


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def twbx_parts():
    """提交版工作簿里的默认样本成员（s.Default Accidents）和传感器表。"""
    with zipfile.ZipFile(TWBX) as z:
        twb = next(n for n in z.namelist() if n.endswith(".twb"))
        root = ET.fromstring(z.read(twb))
        sensors = z.read("Data/build/pedestrian_sensor_avg_daily_2025.csv").decode("utf-8-sig")
    group = next(g for g in root.iter("group") if g.get("caption") == "s.Default Accidents")
    members = [g.get("member").strip('"') for g in group.iter("groupfilter")
               if g.get("function") == "member" and g.get("member")]
    return members, list(csv.DictReader(io.StringIO(sensors)))


class Index:
    """把重复的字符串存成下标，网页里再查回来。"""

    def __init__(self):
        self.items, self.pos = [], {}

    def __call__(self, value):
        if value not in self.pos:
            self.pos[value] = len(self.items)
            self.items.append(value)
        return self.pos[value]


def title_road(name, kind):
    words = " ".join(w for w in ((name or "").strip(), (kind or "").strip()) if w)
    return words.title() if words else ""


def main(raw_dir):
    raw = Path(raw_dir)
    core = [r for r in read_csv(raw / "Road_Crash_Vic_Core_Dataset.csv") if float(r["PEDESTRIAN"] or 0) > 0]
    ids = {r["ACCIDENT_NO"] for r in core}
    assert len(core) == len(ids), "Core 里同一起事故出现了两次"

    weather, surface = defaultdict(set), defaultdict(set)
    for r in read_csv(raw / "Additional tables" / "Atmospheric_cond.csv"):
        if r["ACCIDENT_NO"] in ids:
            weather[r["ACCIDENT_NO"]].add(clean(r["ATMOSPH_COND_DESC"]))
    for r in read_csv(raw / "Additional tables" / "Road_surface_cond.csv"):
        if r["ACCIDENT_NO"] in ids:
            surface[r["ACCIDENT_NO"]].add(clean(r["SURFACE_COND_DESC"]))

    members, sensor_rows = twbx_parts()
    default_ids = set(members)

    core.sort(key=lambda r: (r["ACCIDENT_DATE"][-4:], r["ACCIDENT_NO"]))
    dicts = {k: Index() for k in ("lga", "road", "type", "speed", "light", "geom", "weather", "surface")}
    for d in dicts.values():
        d("Unknown")  # 下标 0 永远是 Unknown
    cols = defaultdict(list)
    for r in core:
        day, month, year = (int(p) for p in r["ACCIDENT_DATE"].split("/"))
        # 9 条时间写成了 "30:00.0"（分:秒）。Tableau 把前一段当小时、超过 24 就绕回（30 → 06 点），
        # 看板上的时段数字就是这么来的；这里照做，结果和看板一致（Accident.csv 里这 9 条另有时间，没用）。
        first, second = r["ACCIDENT_TIME"].split(":")[:2]
        hh, mm = int(first) % 24, int(second[:2])
        lat = float(r["LATITUDE"]) if r["LATITUDE"].strip() else None
        lon = float(r["LONGITUDE"]) if r["LONGITUDE"].strip() else None
        mapped = lat is not None and lon is not None and math.isfinite(lat) and math.isfinite(lon)
        hx, hy = tableau_hexbin(lon * HEX_SCALE, lat * HEX_SCALE) if mapped else (None, None)
        cols["id"].append(r["ACCIDENT_NO"])
        cols["lat"].append(lat if mapped else None)
        cols["lon"].append(lon if mapped else None)
        cols["hx"].append(hx)
        cols["hy"].append(hy)
        cols["date"].append(year * 10000 + month * 100 + day)
        cols["time"].append(hh * 100 + mm)
        cols["sev"].append(SEVERITY.get(r["SEVERITY"], 3))
        cols["band"].append(time_band(hh))
        cols["old"].append(1 if float(r["OLD_PED_65_AND_OVER"] or 0) > 0 else 0)
        cols["peds"].append(int(float(r["PEDESTRIAN"])))
        cols["lga"].append(dicts["lga"](r["LGA_NAME"].strip() or "Unknown"))
        cols["road"].append(dicts["road"](title_road(r["ROAD_NAME"], r["ROAD_TYPE"]) or "Unknown"))
        cols["type"].append(dicts["type"](r["ACCIDENT_TYPE"].strip() or "Unknown"))
        cols["speed"].append(dicts["speed"](clean(r["SPEED_ZONE"])))
        cols["light"].append(dicts["light"](clean(r["LIGHT_CONDITION"], {"dark street lights on": "Dark – lights on"})))
        cols["geom"].append(dicts["geom"](clean(r["ROAD_GEOMETRY"], {"cross intersection": "Crossing"})))
        # 一起事故可能有好几种天气、路面；没有记录 = Unknown（只算进分母）
        cols["weather"].append(sorted(dicts["weather"](w) for w in weather.get(r["ACCIDENT_NO"], ()) if w != "Unknown"))
        cols["surface"].append(sorted(dicts["surface"](s) for s in surface.get(r["ACCIDENT_NO"], ()) if s != "Unknown"))
        cols["def"].append(1 if r["ACCIDENT_NO"] in default_ids else 0)

    data = {
        "n": len(core),
        "hex_scale": HEX_SCALE,
        "dict": {k: d.items for k, d in dicts.items()},
        "cols": cols,
    }
    check(data, members)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "crashes.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    sensors = [{"id": int(s["sensor_id"]), "name": s["sensor_name"], "lat": float(s["latitude"]),
                "lon": float(s["longitude"]), "avg": float(s["avg_daily_count"])} for s in sensor_rows]
    assert len(sensors) == 84
    (OUT / "sensors.json").write_text(json.dumps(sensors, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"OK crashes={data['n']} mapped={sum(v is not None for v in cols['lat'])} sensors={len(sensors)} "
          f"-> {OUT.relative_to(ROOT)}")


# ---- 对账：看板上写着的数字 ------------------------------------------------------------------------------

def compare(data, factor, selected):
    """所选区域 vs 全州：某一类条件里差距最大的那一项（c.Top Difference：区域里出现过、排除 Unknown）。"""
    cols, names = data["cols"], data["dict"][factor]
    n_all, n_sel = data["n"], sum(selected)
    vic, area = Counter(), Counter()
    for i, value in enumerate(cols[factor]):
        for v in (value if isinstance(value, list) else [value]):
            if v == 0:
                continue
            vic[v] += 1
            if selected[i]:
                area[v] += 1
    rows = [(abs(area[v] / n_sel - vic[v] / n_all), names[v], area[v] / n_sel, vic[v] / n_all) for v in area]
    rows.sort(key=lambda r: (-r[0], r[1]))
    _, name, a, b = rows[0]
    return name, round(a * 100, 1), round(b * 100, 1)


def check(data, members):
    cols, n = data["cols"], data["n"]
    pct = lambda a, b: round(100 * a / b, 1)
    assert n == 17510, n
    assert sum(v is not None for v in cols["lat"]) == 17501
    assert len(members) == 120 and sum(cols["def"]) == 120, "默认样本应为 120 起"
    hexes = Counter((x, y) for x, y in zip(cols["hx"], cols["hy"]) if x is not None)
    assert sum(hexes.values()) == 17501

    # 右栏「Selection vs Victoria」默认画面
    sel = cols["def"]
    expect = {
        "weather": ("Clear", 83.3, 80.6), "surface": ("Dry", 80.8, 81.2), "light": ("Dark – lights on", 34.2, 21.1),
        "speed": ("40 km/hr", 62.5, 17.4), "geom": ("Crossing", 37.5, 25.6),
    }
    for factor, want in expect.items():
        got = compare(data, factor, sel)
        assert got == want, f"{factor}: {got} != {want}"

    # 「Victoria overview」卡片
    years = Counter(d // 10000 for d in cols["date"])
    full = [years[y] for y in range(2012, 2025)]
    assert round(sum(full) / len(full)) == 1256 and min(full) == years[2020] == 869
    sev = Counter(cols["sev"])
    assert (pct(sev[0], n), pct(sev[1], n), pct(sev[2], n)) == (3.1, 44.2, 52.7)
    band = Counter(cols["band"])
    assert [band[b] for b in range(5)] == [1058, 3138, 4819, 5512, 2983], band  # A1 QA 日志 T6 记下的 Tableau 时段计数
    assert band[3] == max(band.values())
    fatal_by_band = {b: pct(sum(1 for s, bb in zip(cols["sev"], cols["band"]) if bb == b and s == 0), band[b]) for b in band}
    assert fatal_by_band[0] == 6.9 == max(fatal_by_band.values())
    old = sum(cols["old"])
    old_fatal = sum(1 for o, s in zip(cols["old"], cols["sev"]) if o and s == 0)
    assert (pct(old, n), pct(old_fatal, sev[0])) == (20.4, 41.8)
    melb = data["dict"]["lga"].index("MELBOURNE")
    melb_n = sum(1 for v in cols["lga"] if v == melb)
    assert (melb_n, pct(melb_n, n)) == (1773, 10.1)
    first, last = min(cols["date"]), max(cols["date"])
    assert last == 20251130, last
    data["overview"] = {
        "first": first, "last": last, "years_full": [2012, 2024], "avg_per_year": round(sum(full) / len(full)),
        "lowest_year": 2020, "lowest_n": years[2020], "sev_pct": [pct(sev[k], n) for k in range(3)],
        "busiest_band": 3, "busiest_n": band[3], "deadliest_band": 0, "deadliest_fatal_pct": fatal_by_band[0],
        "old_pct": pct(old, n), "old_fatal_pct": pct(old_fatal, sev[0]), "melb_n": melb_n, "melb_pct": pct(melb_n, n),
        "hexes": len(hexes), "hex_max": max(hexes.values()),
    }
    print("CHECK PASS", json.dumps(data["overview"], ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
