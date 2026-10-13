"""从提交版生成浅色版：地图换成浅色底图，六边形色带改成「越多越深」。只改颜色，不动数据和计算。

用法（在仓库根目录）：
    python3 tools/make_light_version.py GEOM90007_A1_Pedestrian_Crash_Map_JiakuoTang.twbx GEOM90007_A1_Pedestrian_Crash_Map_JiakuoTang_light.twbx
"""
import re, sys, zipfile, hashlib, pathlib

SRC, DST = map(pathlib.Path, sys.argv[1:3])
RAMP = {  # 1 → 100+，浅 → 深。OKLCH 生成：亮度单调、相邻档 ΔL ≥ 0.06、色相跨度 36°，最浅档对底图 #e8e8e8 的对比度 ≥ 2:1
    '1': '#e18f4b', '2–4': '#db702c', '5–9': '#cf521b',
    '10–29': '#bc3718', '30–99': '#a3231e', '100+': '#871823',
}
OLD = {'1': '#ab2494', '2–4': '#cc4977', '5–9': '#e56b5d', '10–29': '#f79044', '30–99': '#feb72d', '100+': '#fbe06b'}
INK, BORDER, PANEL = '#23384d', '#d8dee5', '#ffffff'
CRASH_DOT, SENSOR = '#a3231e', '#5a6673'

def sub_once(pat, rep, s, n=1, flags=0):
    out, k = re.subn(pat, rep, s, flags=flags)
    assert k == n, f'expected {n} hit(s), got {k}: {pat[:80]}'
    return out

with zipfile.ZipFile(SRC) as z:
    names = z.namelist()
    twb_name = next(n for n in names if n.endswith('.twb'))
    t = z.read(twb_name).decode('utf-8')

# 1. 底图：dark → light
t = sub_once(r"(<format attr='map-style' value=)'dark'", r"\1'light'", t)

# 2. 六边形分档配色（数据源里的颜色映射）
for band, old in OLD.items():
    t = sub_once(rf"<map to='{old}'>(\s*<bucket>&quot;{re.escape(band)}&quot;</bucket>)", rf"<map to='{RAMP[band]}'>\1", t)

# 3. 地图上的两个图例浮框：深底白字 → 白底深字；图例色块同步新色带
def fix_zone(zid, t):
    m = re.search(rf"<zone [^>]*id='{zid}'[^>]*type-v2='text'.*?</zone>", t, flags=re.S)
    assert m, zid
    z = m.group(0)
    z2 = z.replace("fontcolor='#e6edf3'", f"fontcolor='{INK}'")
    z2 = z2.replace("value='#2a3442'", f"value='{BORDER}'").replace("value='#0e1116'", f"value='{PANEL}'")
    for band, old in OLD.items():
        z2 = z2.replace(f"fontcolor='{old}'", f"fontcolor='{RAMP[band]}'")
    assert '#e6edf3' not in z2 and '#0e1116' not in z2 and '#2a3442' not in z2
    return t.replace(z, z2)
t = fix_zone('69', t)
t = fix_zone('77', t)

# 4. 单起事故点（CRASHES 视图）：白点在浅底图上看不见 → 深红，75% 不透明
pane7 = re.search(r"<pane id='7' [^>]*title='Events context[^']*'>.*?</pane>", t, flags=re.S).group(0)
p7 = sub_once(r"<format attr='mark-color' value='#FFFFFF' />", f"<format attr='mark-color' value='{CRASH_DOT}' />", pane7)
p7 = sub_once(r"<format attr='mark-transparency' value='255' />", "<format attr='mark-transparency' value='191' />", p7)
t = t.replace(pane7, p7)

# 5. 行人流量传感器（FOOTFALL 视图）：浅灰 → 中灰，浅底图上仍是背景层但看得见
pane10 = re.search(r"<pane id='10' [^>]*title='Pedestrian sensors[^']*'>.*?</pane>", t, flags=re.S).group(0)
p10 = sub_once(r"value='#8B98A5'", f"value='{SENSOR}'", pane10)
t = t.replace(pane10, p10)

for old in OLD.values():
    assert old not in t.lower(), f'leftover {old}'

DST.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(SRC) as zin, zipfile.ZipFile(DST, 'w') as zout:
    for info in zin.infolist():
        data = t.encode('utf-8') if info.filename == twb_name else zin.read(info.filename)
        zout.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED)
print('OK', DST, hashlib.sha256(DST.read_bytes()).hexdigest())
