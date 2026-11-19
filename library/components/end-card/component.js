/* End card (series): full-frame paper card, "see you on Day N+1", the 30-block tracker with today's block lifted, and a slow
 * zoom into today's block that fills the screen. Lasts to the end of the video: no fade out. */
VideoLibrary.register({
  id: "end-card",
  name: "End card",
  preview: { background: "#ede7df", params: { zoomAt: null } },
  category: "Series",
  collection: "Series",
  order: 3,
  source: "Day 20",
  description: "Full-frame paper end card: \"see you on Day 21\" in huge type, \"tomorrow\", the 30-block tracker lit up to today, then a zoom into today's block.",
  tags: ["series", "end", "outro", "tracker", "see you tomorrow", "30 day"],
  duration: 4.6,
  params: [
    { key: "day", label: "Today's day number", type: "number", default: 20, min: 1, max: 365 },
    { key: "total", label: "Total days", type: "number", default: 30, min: 1, max: 60 },
    { key: "label", label: "Word before the number", type: "text", default: "Day" },
    { key: "line", label: "Line above (blank = none)", type: "text", default: "see you on" },
    { key: "after", label: "Line below (blank = none)", type: "text", default: "tomorrow" },
    { key: "note", label: "Tracker note (blank = none)", type: "text", default: "day {day} / {total}" },
    { key: "litAt", label: "Blocks light up (s)", type: "time", default: 0.9 },
    { key: "zoomAt", label: "Zoom into today's block (s, blank = none)", type: "time", default: 3.2 },
  ],
  sfx: [{ file: "dry-pop-alert", at: "0.4" }, { file: "pluck_001", at: "litAt" }, { file: "fast-whoosh", at: "zoomAt" }, { file: "boom", at: "zoomAt" }],
  css: `
.vl-end-card .pg{position:absolute;inset:0;background:#ede7df;color:#17120e;opacity:0;overflow:hidden}
.vl-end-card .zm{position:absolute;inset:0}
.vl-end-card .st{position:absolute;left:60px;right:60px;top:560px;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-end-card .sm{font-family:"ArchivoSB";font-size:56px;letter-spacing:-.02em;opacity:0}
.vl-end-card .rw{display:flex;align-items:flex-end;justify-content:center;margin-top:6px}
.vl-end-card .xb{font-family:"ArchivoXB";font-size:230px;line-height:1;letter-spacing:-.045em;opacity:0}
.vl-end-card .xb.n{margin-left:40px}
.vl-end-card .tm{font-family:"ArchivoSB";font-size:52px;letter-spacing:-.02em;margin-top:20px;opacity:0}
.vl-end-card .nt{position:absolute;top:1186px;font-family:"Typewriter";font-size:26px;letter-spacing:.16em;text-transform:uppercase;white-space:nowrap;opacity:0}
.vl-end-card .br{position:absolute;left:90px;width:900px;top:1300px;height:40px;display:flex;gap:6px;align-items:flex-end}
.vl-end-card .br i{flex:1;height:40px;border-radius:5px;background:rgba(23,18,14,.14);transform-origin:50% 100%;opacity:0}`,
  html(p, c) {
    const total = Math.max(1, +p.total), day = Math.min(total, Math.max(1, +p.day)), segs = Array.from({ length: total }, (_, k) => `<i id="${c.id("s" + k)}"></i>`).join("");
    const sw = (900 - (total - 1) * 6) / total, nx = Math.round(90 + (day - 1) * (sw + 6) - 40);
    const note = String(p.note || "").replace("{day}", day).replace("{total}", total);
    return `<div class="pg" id="${c.id("pg")}"><div class="zm" id="${c.id("zm")}"><div class="st">`
      + (p.line ? `<span class="sm" id="${c.id("ln")}">${c.esc(p.line)}</span>` : "")
      + `<div class="rw"><span class="xb" id="${c.id("d")}">${c.esc(p.label)}</span><span class="xb n" id="${c.id("n")}">${day + 1}</span></div>`
      + (p.after ? `<span class="tm" id="${c.id("tm")}">${c.esc(p.after)}</span>` : "")
      + `</div>` + (note ? `<span class="nt" id="${c.id("nt")}" style="left:${Math.min(nx, 700)}px">${c.esc(note)}</span>` : "")
      + `<div class="br" id="${c.id("br")}">${segs}</div></div></div>`;
  },
  animate(tl, p, c) {
    const T = v => (v == null || v === "");
    const total = Math.max(1, +p.total), day = Math.min(total, Math.max(1, +p.day)), q = s => "#" + c.id(s);
    const lit = T(p.litAt) ? 0.9 : +p.litAt;
    tl.fromTo(q("pg"), { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" }, c.at(0));
    if (p.line) tl.fromTo(q("ln"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, c.at(0.05));
    tl.fromTo(q("d"), { opacity: 0, y: 30, filter: "blur(14px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "expo.out" }, c.at(0.2));
    tl.fromTo(q("n"), { opacity: 0, scale: 1.5, filter: "blur(18px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.4, ease: "expo.out" }, c.at(0.4));
    if (p.after) tl.fromTo(q("tm"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, c.at(0.7));
    tl.fromTo(c.$(".br i"), { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, stagger: 0.01, duration: 0.25, ease: "power2.out" }, c.at(0.1));
    if (day > 1) tl.fromTo(Array.from({ length: day - 1 }, (_, k) => q("s" + k)).join(","), { backgroundColor: "rgba(23,18,14,.14)" }, { backgroundColor: "#17120e", stagger: 0.025, duration: 0.18, immediateRender: false }, c.at(lit - 0.3));
    tl.fromTo(q("s" + (day - 1)), { backgroundColor: "rgba(23,18,14,.14)", scaleY: 1 }, { backgroundColor: "#17120e", scaleY: 1.9, duration: 0.5, ease: "back.out(2.2)", immediateRender: false }, c.at(lit));
    if (p.note) tl.fromTo(q("nt"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, c.at(lit + 0.15));
    if (!T(p.zoomAt)) {
      const za = +p.zoomAt, sw = (900 - (total - 1) * 6) / total, zx = 90 + (day - 1) * (sw + 6) + sw / 2, zy = 1300 + 40 - 38;
      if (p.note) tl.to(q("nt"), { opacity: 0, duration: 0.3 }, c.at(za));
      tl.set(q("zm"), { transformOrigin: zx.toFixed(1) + "px " + zy.toFixed(1) + "px" }, 0);
      tl.fromTo(q("zm"), { scale: 1, x: 0, y: 0 }, { scale: 60, x: +(540 - zx).toFixed(1), y: +(960 - zy).toFixed(1), duration: 1.3, ease: "power3.inOut", immediateRender: false }, c.at(za));
    }
  },
});
