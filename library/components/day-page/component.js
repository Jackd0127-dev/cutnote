/* Day page (series): a full-frame paper card, "Day N" in huge type, the episode title, and the 30-block tracker with today's
 * block lifting. Optional zoom into today's block at the end. */
VideoLibrary.register({
  id: "day-page",
  name: "Day page",
  preview: { background: "#ede7df" },
  category: "Series",
  collection: "Series",
  order: 1,
  source: "Day 20",
  description: "Full-frame paper card: a small lead-in, \"Day N\" slamming in, the episode title and a row of 30 blocks. Past days fill in, today's pops tall (optional zoom into it).",
  tags: ["series", "day", "tracker", "30 day", "page", "title card"],
  duration: 4.4,
  params: [
    { key: "day", label: "Day number", type: "number", default: 20, min: 1, max: 365 },
    { key: "total", label: "Total days", type: "number", default: 30, min: 1, max: 60 },
    { key: "label", label: "Word before the number", type: "text", default: "Day" },
    { key: "lead", label: "Small line above", type: "text", default: "this is" },
    { key: "title", label: "Title", type: "text", default: "test a business idea with AI customers" },
    { key: "dayAt", label: "\"Day\" lands (s)", type: "time", default: 0.2 },
    { key: "numAt", label: "Number slams in (s)", type: "time", default: 0.6 },
    { key: "todayAt", label: "Today's block pops (s)", type: "time", default: 1.8 },
    { key: "zoomAt", label: "Zoom into today's block (s, blank = none)", type: "time", default: null },
  ],
  sfx: [{ file: "dry-pop-alert", at: "numAt" }, { file: "pluck_001", at: "todayAt" }, { file: "fast-whoosh", at: "zoomAt" }],
  css: `
.vl-day-page .pg{position:absolute;inset:0;background:#ede7df;color:#17120e;opacity:0;overflow:hidden}
.vl-day-page .zm{position:absolute;inset:0}
.vl-day-page .st{position:absolute;left:60px;right:60px;top:480px;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-day-page .sm{font-family:"ArchivoSB";font-size:56px;letter-spacing:-.02em;opacity:0}
.vl-day-page .rw{display:flex;align-items:flex-end;justify-content:center;margin-top:10px}
.vl-day-page .xb{font-family:"ArchivoXB";font-size:230px;line-height:1;letter-spacing:-.045em;opacity:0}
.vl-day-page .xb.n{margin-left:40px}
.vl-day-page .tt{font-family:"ArchivoXB";font-size:64px;line-height:1.08;letter-spacing:-.03em;margin-top:26px;max-width:880px;opacity:0}
.vl-day-page .br{position:absolute;left:90px;width:900px;top:1250px;height:40px;display:flex;gap:6px;align-items:flex-end}
.vl-day-page .br i{flex:1;height:40px;border-radius:5px;background:rgba(23,18,14,.14);transform-origin:50% 100%;opacity:0}`,
  html(p, c) {
    const total = Math.max(1, +p.total), segs = Array.from({ length: total }, (_, k) => `<i id="${c.id("s" + k)}"></i>`).join("");
    return `<div class="pg" id="${c.id("pg")}"><div class="zm" id="${c.id("zm")}"><div class="st">`
      + (p.lead ? `<span class="sm" id="${c.id("ld")}">${c.esc(p.lead)}</span>` : "")
      + `<div class="rw"><span class="xb" id="${c.id("d")}">${c.esc(p.label)}</span><span class="xb n" id="${c.id("n")}">${+p.day}</span></div>`
      + (p.title ? `<div class="tt" id="${c.id("tt")}">${c.esc(p.title)}</div>` : "")
      + `</div><div class="br" id="${c.id("br")}">${segs}</div></div></div>`;
  },
  animate(tl, p, c) {
    const T = v => (v == null || v === "");
    const total = Math.max(1, +p.total), day = Math.min(total, Math.max(1, +p.day)), q = s => "#" + c.id(s);
    const dA = T(p.dayAt) ? 0.2 : +p.dayAt, nA = T(p.numAt) ? 0.6 : +p.numAt, tA = T(p.todayAt) ? 1.8 : +p.todayAt;
    tl.fromTo(q("pg"), { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" }, c.at(0));
    if (p.lead) tl.fromTo(q("ld"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, c.at(Math.max(0, dA - 0.15)));
    tl.fromTo(q("d"), { opacity: 0, y: 60, filter: "blur(14px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "expo.out" }, c.at(dA));
    tl.fromTo(q("n"), { opacity: 0, scale: 1.5, filter: "blur(18px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.4, ease: "expo.out" }, c.at(nA));
    if (p.title) tl.fromTo(q("tt"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, c.at(nA + 0.25));
    const segs = c.$(".br i");
    tl.fromTo(segs, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, stagger: 0.01, duration: 0.22, ease: "power2.out" }, c.at(nA));
    if (day > 1) tl.fromTo(Array.from({ length: day - 1 }, (_, k) => q("s" + k)).join(","), { backgroundColor: "rgba(23,18,14,.14)" }, { backgroundColor: "#17120e", stagger: 0.022, duration: 0.15, immediateRender: false }, c.at(nA + 0.2));
    tl.fromTo(q("s" + (day - 1)), { backgroundColor: "rgba(23,18,14,.14)", scaleY: 1 }, { backgroundColor: "#17120e", scaleY: 1.9, duration: 0.45, ease: "back.out(2.2)", immediateRender: false }, c.at(tA));
    if (!T(p.zoomAt)) {
      const sw = (900 - (total - 1) * 6) / total, zx = 90 + (day - 1) * (sw + 6) + sw / 2, zy = 1250 + 40 - 38;
      tl.set(q("zm"), { transformOrigin: zx.toFixed(1) + "px " + zy.toFixed(1) + "px" }, 0);
      tl.fromTo(q("zm"), { scale: 1, x: 0, y: 0 }, { scale: 60, x: +(540 - zx).toFixed(1), y: +(960 - zy).toFixed(1), duration: 1.3, ease: "power3.inOut", immediateRender: false }, c.at(+p.zoomAt));
    } else c.exit(tl, q("pg"), { y: 0 });
  },
});
