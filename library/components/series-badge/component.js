/* Series badge (Day 19): a small "Day N / 30" card with a tracker of blocks; earlier days filled, today's block pops. */
VideoLibrary.register({
  id: "series-badge",
  name: "Series badge",
  category: "Series",
  collection: "Series",
  order: 2,
  source: "Day 19",
  description: "A small white card reading \"Day 19 / 30\" over a row of 30 blocks. Past days fill in, then today's block pops taller.",
  tags: ["series", "day", "tracker", "30 day", "badge"],
  duration: 3,
  params: [
    { key: "day", label: "Day number", type: "number", default: 19, min: 1, max: 365 },
    { key: "total", label: "Total days", type: "number", default: 30, min: 1, max: 60 },
    { key: "label", label: "Word before the number", type: "text", default: "Day" },
    { key: "inAt", label: "Card lands (s)", type: "time", default: 0.1 },
    { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [240, 560, 840, 800] },
  ],
  sfx: [{ file: "dry-pop-alert", at: "inAt" }, { file: "pluck_001", at: "inAt" }],
  css: `
.vl-series-badge .db{position:absolute;padding:26px 34px 30px;border-radius:30px;background:rgba(255,255,255,.97);box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0;color:#17120e;text-align:center}
.vl-series-badge .t{font-family:"ArchivoXB";font-size:76px;letter-spacing:-.04em;line-height:1}
.vl-series-badge .o{font-family:"ArchivoSB";font-size:44px;color:rgba(23,18,14,.45);letter-spacing:-.02em}
.vl-series-badge .bk{display:flex;gap:5px;margin-top:20px;height:34px;align-items:flex-end}
.vl-series-badge .bk i{flex:1;height:22px;border-radius:4px;background:rgba(23,18,14,.12);transform-origin:50% 100%}
.vl-series-badge .bk i.on,.vl-series-badge .bk i.td{background:#17120e}`,
  html(p, c) {
    const [x0, y0, x1] = p.box, day = +p.day, total = Math.max(1, +p.total);
    const blocks = Array.from({ length: total }, (_, k) => `<i class="${k < day - 1 ? "on" : (k === day - 1 ? "td" : "")}" id="${c.id("s" + k)}"></i>`).join("");
    return `<div class="db" id="${c.id("card")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px"><div class="t">${c.esc(p.label)} ${day}<span class="o"> / ${total}</span></div><div class="bk">${blocks}</div></div>`;
  },
  animate(tl, p, c) {
    const a = p.inAt || 0, id = "#" + c.id("card"), day = +p.day, total = Math.max(1, +p.total);
    tl.fromTo(id, { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, c.at(a));
    tl.fromTo(c.$(".bk i"), { scaleY: 0 }, { scaleY: 1, duration: 0.2, ease: "power2.out", stagger: 0.01 }, c.at(a + 0.15));
    if (day >= 1 && day <= total) tl.fromTo("#" + c.id("s" + (day - 1)), { scaleY: 1 }, { scaleY: 1.8, duration: 0.35, ease: "back.out(2.4)", immediateRender: false }, c.at(a + 0.6));
    c.exit(tl, id);
  },
});
