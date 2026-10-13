// The longer texts: the "How to use" page and the "What this project solves" page, English and Chinese.
// Numbers here are the dashboard's (tests/model.test.mjs checks them against the data); the assignment card
// summarises the Canvas assignment page as read on 23 August 2026.

export const GUIDE = {
  en: {
    title: "How to use this map",
    lede: "The map answers two questions: where do pedestrian crashes concentrate in Victoria, and how do those places differ from the rest of the state? Five steps, about half a minute each.",
    steps: [
      { h: "See where crashes concentrate", items: [
        "The map opens on <b>Hotspots</b>, zoomed to inner Melbourne. Every crash in Victoria is on it; zoom out to see the whole state.",
        "Each hexagon is a patch of ground about 1 km across. <b>The darker the hexagon, the more crashes</b> (in dark mode it is the other way round: brighter means more). The key under the map gives the counts: 1, 2–4, 5–9, 10–29, 30–99, 100+.",
        "Hover over a hexagon to see its council area, how many crashes it holds and in which years.",
        "Zoom with the scroll wheel or the + and − buttons; drag to move around."] },
      { h: "Pick a place", items: [
        "<b>Click a hexagon</b> to select it; it gets an outline. Hold Shift (or ⌘ on a Mac) and click to add more.",
        "To take a whole area, click <b>Select an area</b> under the map and drag a box; every hexagon inside is selected.",
        "Click a selected hexagon again, or an empty spot on the map, to let go. <b>Back to the default sample</b> clears the selection.",
        "With nothing selected, the comparison uses a default sample: the 120 crashes nearest Flinders Street station, the core of the CBD."] },
      { h: "Narrow it down if you want", items: [
        "Four filters on the right: crash year, severity, time of day and pedestrian age.",
        "A filter changes both sides of the comparison. Pick <b>Fatal</b>, and it compares the place's fatal crashes with Victoria's fatal crashes.",
        "The footfall view is not filtered. <b>Clear filters</b> puts everything back."] },
      { h: "Read the comparison", items: [
        "<b>Selection vs Victoria</b> looks at five kinds of conditions: weather, road surface, light, speed zone and road layout.",
        "Each row shows the condition with the biggest gap. Example: \"40 km/h, 62.5% vs 17.4%\" means 62.5% of this place's crashes were in a 40 km/h zone, against 17.4% across Victoria.",
        "A bar to the right of the centre line (green) means the condition is <b>more common here</b>; to the left (purple), <b>less common</b>. The number is the gap in percentage points.",
        "Click a row to see every condition of that kind. Under 30 crashes, the panel says the sample is small; read it as a description only."] },
      { h: "Switch the view", items: [
        "<b>Crashes</b> shows each crash as a dot. Hover for the road, date, time, crash type and severity. Selecting works as on Hotspots.",
        "<b>Footfall</b> shows 84 City of Melbourne pedestrian sensors; the bigger the circle, the more people walked past on an average day in 2025. It is there for context and is not linked to the crash records."] },
    ],
    careH: "Keep in mind",
    care: [
      "More crashes does not mean more dangerous. Places where many people walk have more crashes, and the map does not divide by how many people walk there.",
      "2025 runs to 30 November only.",
    ],
    tryH: "Try these",
    tryLede: "Each button sets the map up and takes you there.",
    examples: [
      { id: "old", q: "Crashes involving pedestrians aged 65+: are the hotspots still all in the city centre?", how: "Sets Pedestrian age to 65+ and zooms out to greater Melbourne." },
      { id: "peak", q: "15:00–18:00, the busiest time of day: which places stand out?", how: "Sets Time of day to 15–18." },
      { id: "night", q: "00:00–05:00, the deadliest time: how does the CBD core differ from Victoria?", how: "Sets Time of day to 00–05. Look at the light and speed-zone rows." },
      { id: "foot", q: "Where do the most people walk?", how: "Opens the Footfall view." },
    ],
    go: "Show me",
  },
  zh: {
    title: "使用说明",
    lede: "这张地图回答两个问题。维州的行人事故集中在哪里？这些地方和全州比有什么不同？跟着下面五步走一遍，每步大约半分钟。",
    steps: [
      { h: "看事故集中在哪里", items: [
        "地图打开时是<b>热点</b>视图，范围是墨尔本市区。全州的事故都在图上，缩小就能看到整个维州。",
        "每个六边形是大约 1 公里宽的一块地方。<b>颜色越深，事故越多</b>（深色模式反过来，越亮越多）。地图下方的图例写着每档的事故数：1、2–4、5–9、10–29、30–99、100+。",
        "鼠标停在六边形上，会显示它属于哪个行政区、有几起事故，以及发生在哪几年。",
        "用滚轮或左上角的 + 和 − 缩放，按住拖动可以平移。"] },
      { h: "选一块地方", items: [
        "<b>点一个六边形</b>就选中了它，选中的六边形有一圈描边。按住 Shift（Mac 上也可以按 ⌘）再点，可以加选。",
        "想选一整片：点地图下方的<b>框选区域</b>，在地图上拖出一个框，框里的六边形都会选中。",
        "再点一次已选的六边形，或者点地图空白处，就取消选择。<b>回到默认样本</b>会清空所有选择。",
        "什么都没选时，对比用的是默认样本：离 Flinders Street 车站最近的 120 起事故，也就是墨尔本 CBD 的核心。"] },
      { h: "需要的话，用筛选缩小范围", items: [
        "右边有四个筛选：年份、严重程度、时段、行人年龄。",
        "筛选会同时改变对比的两边。比如选了<b>致命</b>，就是拿这块地方的致命事故和全州的致命事故比。",
        "行人流量视图不受筛选影响。点<b>清除筛选</b>就全部恢复。"] },
      { h: "看这块地方和全州比", items: [
        "<b>所选区域 vs 全州</b>看五类条件：天气、路面、光线、限速和道路形态。",
        "每行显示差距最大的那个条件。比如“40 km/h，62.5% 对 17.4%”，意思是这块地方 62.5% 的事故发生在限速 40 的路段，全州只有 17.4%。",
        "条在中线右边（绿色）表示这个条件<b>在这里更常见</b>，在左边（紫色）表示<b>更少见</b>；数字是相差多少个百分点。",
        "点一行可以展开，看这一类里的所有条件。所选范围不到 30 起时，面板会提示样本小，只能当描述看。"] },
      { h: "换个视图看", items: [
        "<b>单起事故</b>：每个点是一起事故。鼠标停上去，可以看到路名和日期时间，还有事故类型和严重程度。点选和框选的用法和热点视图一样。",
        "<b>行人流量</b>：墨尔本市的 84 个行人计数传感器，圆越大，2025 年平均每天经过的人越多。这一层只作背景，没有和事故记录关联。"] },
    ],
    careH: "读图时注意",
    care: [
      "事故多不等于更危险。有的地方走路的人多，事故自然也多，这张图没有按人流折算。",
      "2025 年的数据只到 11 月 30 日。",
    ],
    tryH: "试试这几个问题",
    tryLede: "点按钮会把地图设好，直接带你过去。",
    examples: [
      { id: "old", q: "65 岁以上行人的事故，热点还都在市中心吗？", how: "把行人年龄设为 65 岁以上，并缩小到大墨尔本范围。" },
      { id: "peak", q: "下午 3 点到 6 点是事故最多的时段，哪些地方最突出？", how: "把时段设为 15–18 下午高峰。" },
      { id: "night", q: "凌晨 0 点到 5 点最致命，CBD 核心和全州比有什么不同？", how: "把时段设为 00–05 深夜，看光线和限速两行。" },
      { id: "foot", q: "哪里走路的人最多？", how: "切换到行人流量视图。" },
    ],
    go: "带我去看",
  },
};

export const PROJECT = {
  en: {
    title: "What this project solves",
    lede: "A course assignment on one side, a real question on the other. Read the three cards first, then see the dashboard as it was submitted.",
    cards: [
      { h: "The assignment", items: [
        "<b>GEOM90007 Information Visualisation</b>, University of Melbourne, Semester 2 2026 · Assignment 1 (static visualisation) · individual · 20% of the subject · due 25 August 2026.",
        "Build one interactive dashboard in <b>Tableau</b> on the course's Victoria Road Crash dataset: one dashboard and no stories, 1600 × 900 preferred, at least two graphics, and one clear theme for a set reader, <b>Transport Victoria</b>. Extra tables or outside data are allowed; no in-depth modelling is expected.",
        "Hand in one Tableau packaged workbook (.twbx).",
        "Marked on data correspondence (25), data integrity (15), data density (10), data aesthetics (25) and technical challenge (25)."] },
      { h: "The problem I chose", items: [
        "<b>For whom:</b> the people at Transport Victoria who look into pedestrian crashes and decide where to act.",
        "<b>Their questions:</b> where do pedestrian crashes concentrate, and how do those places differ from the rest of Victoria in weather, road surface, light, speed zone and road layout?",
        "<b>The approach:</b> hexagon hotspots show where crashes pile up; pick any place and the panel beside the map compares its crashes with Victoria's, condition by condition.",
        "<b>Data:</b> 17,510 crashes involving a pedestrian from the Victoria Road Crash Data (January 2012 to November 2025); 2025 average daily footfall at 84 City of Melbourne sensors as context."] },
      { h: "What came out", items: [
        "One Tableau dashboard: three map views (hotspots, single crashes, footfall), four filters, the Selection vs Victoria panel, a Victoria overview and a footer that states the limits.",
        "<b>Findings:</b> the five hexagons with 100+ crashes each are all in and around the Melbourne CBD. In the CBD core, 62.5% of crashes were in a 40 km/h zone (Victoria: 17.4%) and 34.2% happened after dark with the street lights on (Victoria: 21.1%). Across Victoria, pedestrians aged 65+ are 20.4% of crashes but 41.8% of fatal ones.",
        "<b>Mark:</b> 84.3/100; class mean 70.0 (291 students).",
        "<b>This web version</b> uses the same data and the same rules; every figure was checked against the dashboard. It opens without Tableau."] },
    ],
    tryIt: "Try it:",
    source: "The assignment card summarises the Canvas assignment page (read on 23 August 2026).",
    shotsH: "The dashboard as submitted",
    shotsLede: "The original was built in Tableau. The left image is the file handed in on 25 August 2026; the right one is a light version made in October, with only the colours changed.",
    shots: [
      { src: "img/dashboard_default.jpg", alt: "The submitted Tableau dashboard: a dark basemap of inner Melbourne with coloured hexagons, filters and the Selection vs Victoria panel on the right", cap: "Submitted version: dark basemap, more crashes = brighter hexagon." },
      { src: "img/dashboard_light.jpg", alt: "The light version of the Tableau dashboard: the same layout on a light basemap with an orange-to-dark-red ramp", cap: "Light version (October 2026): light basemap, more crashes = darker hexagon. Data, filters and layout unchanged." },
    ],
    aiH: "AI use",
    ai: "The dashboard footer, quoted: \"Student: concept, design, planning, review and submission. AI (OpenAI Codex, Anthropic Claude, OpenAI ChatGPT): calculations, workbook edits, QA.\" The web version was built by Claude Code at my request; scripts check its numbers against the dashboard and I reviewed the result.",
  },
  zh: {
    title: "这个项目解决什么问题",
    lede: "一边是课程作业的要求，一边是一个真实的问题。先看这三张卡片，再看交上去的看板长什么样。",
    cards: [
      { h: "老师布置的作业", items: [
        "墨尔本大学 <b>GEOM90007 信息可视化</b>，2026 年第 2 学期 · 作业 1（静态可视化）· 个人完成 · 占总成绩 20% · 2026 年 8 月 25 日截止。",
        "用 <b>Tableau</b> 和课程给的维州道路事故数据做一个交互看板：只能有一个看板、不能用故事（Story），建议 1600 × 900；至少两种图形；主题要清楚，写给一位设定好的读者，<b>维州交通部门</b>。可以加附加数据表或外部数据，不要求深入建模。",
        "提交一个 Tableau 打包工作簿（.twbx）。",
        "评分维度：数据对应（25）、数据诚实（15）、数据密度（10）、数据美观（25）、技术难度（25）。"] },
      { h: "我选的问题", items: [
        "<b>给谁用：</b>维州交通部门里调查行人事故、决定在哪里采取措施的人。",
        "<b>他们想知道：</b>行人事故集中在哪里？这些地方的事故，在天气、路面、光线、限速和道路形态上和全州比有什么不同？",
        "<b>做法：</b>先用六边形热点找出事故扎堆的地方；任选一块，地图旁边的面板逐个条件拿它和全州比。",
        "<b>数据：</b>维州道路事故数据里涉及行人的 17,510 起事故（2012 年 1 月到 2025 年 11 月）；墨尔本市 84 个行人计数传感器 2025 年的日均人流作背景。"] },
      { h: "做出了什么", items: [
        "一个 Tableau 看板，有三种地图视图（热点、单起事故、行人流量）和四个筛选，还有“所选区域 vs 全州”对比面板和全州概况，页脚写明局限。",
        "<b>发现：</b>每个都有 100 起以上事故的 5 个六边形，全在墨尔本 CBD 及周边。CBD 核心的事故里，62.5% 发生在限速 40 km/h 的路段（全州 17.4%），34.2% 发生在天黑但路灯开着的时候（全州 21.1%）。全州来看，65 岁以上行人占全部事故的 20.4%，却占致命事故的 41.8%。",
        "<b>得分：</b>84.3/100，班均 70.0（291 人）。",
        "<b>这个网页版</b>用同一份数据、同样的算法，每个数字都和看板核对过，不装 Tableau 也能看。"] },
    ],
    tryIt: "去看看：",
    source: "“老师布置的作业”一栏根据 Canvas 作业页面整理（2026 年 8 月 23 日查看）。",
    shotsH: "交上去的看板",
    shotsLede: "原版用 Tableau 做。左边是 2026 年 8 月 25 日交到 Canvas 的文件；右边是 10 月做的浅色版，只换了配色。",
    shots: [
      { src: "img/dashboard_default.jpg", alt: "提交的 Tableau 看板：墨尔本市区的深色底图上画着彩色六边形，右侧是筛选和“所选区域 vs 全州”面板", cap: "提交版：深色底图，事故越多，六边形越亮。" },
      { src: "img/dashboard_light.jpg", alt: "Tableau 看板的浅色版：同样的版面，浅色底图，橙到深红的色带", cap: "浅色版（2026 年 10 月）：浅色底图，事故越多，六边形越深。数据、筛选和版面都没改。" },
    ],
    aiH: "AI 使用",
    ai: "看板页脚原文：“Student: concept, design, planning, review and submission. AI (OpenAI Codex, Anthropic Claude, OpenAI ChatGPT): calculations, workbook edits, QA.”（构思、设计、规划、检查和提交由我完成；计算、工作簿编辑和质检用了 AI。）网页版由 Claude Code 按我的要求搭建，脚本把每个数字和看板核对，最后由我检查。",
  },
};
