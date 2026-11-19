/* Selection box (Day 17/20): a Figma-style dashed marquee. A cursor presses at the top-left and drags it out round a phrase;
 * optionally a strike line crosses the phrase out. The box is sized from the width param (nothing is measured). */
VideoLibrary.register({
  id: "selection-box",
  name: "Selection box",
  category: "Text",
  collection: "Cinematic",
  order: 2,
  preview: { background: "photo" },
  source: "Day 17",
  description: "A phrase lands, then a cursor drags a dashed Figma-style marquee out around it with corner handles. Optional white strike-through on his word.",
  tags: ["marquee", "selection", "cursor", "highlight", "strike", "figma"],
  duration: 3.4,
  params: [
    { key: "small", label: "Small label above", type: "text", default: "before you prototype" },
    { key: "text", label: "Big phrase", type: "text", default: "the most important thing" },
    { key: "at", label: "Phrase lands (s)", type: "time", default: 0.1 },
    { key: "dragAt", label: "Cursor starts dragging (s)", type: "time", default: 1.0 },
    { key: "dragFor", label: "Drag takes (s)", type: "number", default: 0.55, min: 0.2, max: 2 },
    { key: "strikeAt", label: "Strike-through (s, blank = none)", type: "time", default: null },
    { key: "width", label: "Box width (px, fit to the phrase)", type: "number", default: 850, min: 200, max: 1040 },
    { key: "size", label: "Phrase size (px)", type: "number", default: 60, min: 30, max: 120 },
    { key: "x", label: "Left edge (px)", type: "number", default: 160, min: 0, max: 1000 },
    { key: "y", label: "Top edge (px)", type: "number", default: 1320, min: 0, max: 1800 },
  ],
  sfx: [{ file: "click_004", at: "dragAt" }, { file: "scratch_002", at: "strikeAt" }],
  css: `
.vl-selection-box .sb{position:absolute;opacity:0}
.vl-selection-box .mq{position:absolute;left:0;top:0;width:0;height:0;border:3px dashed rgba(255,255,255,.95);box-sizing:border-box}
.vl-selection-box .h{position:absolute;display:block;margin:0;width:16px;height:16px;background:#fff;border:2px solid #17120e;transform:scale(0)}
.vl-selection-box .h.tl{left:-10px;top:-10px}.vl-selection-box .h.tr{right:-10px;top:-10px}.vl-selection-box .h.bl{left:-10px;bottom:-10px}.vl-selection-box .h.br{right:-10px;bottom:-10px}
.vl-selection-box .in{position:absolute;left:30px;top:30px;text-shadow:0 3px 14px rgba(0,0,0,.5)}
.vl-selection-box .sm{font-family:"Typewriter";font-size:26px;line-height:30px;letter-spacing:.16em;text-transform:uppercase;color:#fff;white-space:nowrap;opacity:0}
.vl-selection-box .bg{margin-top:6px}
.vl-selection-box .bw{position:relative;display:inline-block;font-family:"ArchivoXB";letter-spacing:-.04em;color:#fff;white-space:nowrap;opacity:0}
.vl-selection-box .sk{position:absolute;left:-6px;right:-6px;top:52%;height:7px;margin-top:-3px;border-radius:4px;background:#fff;transform-origin:0 50%;transform:scaleX(0)}
.vl-selection-box .cur{position:absolute;left:-8px;top:-6px;width:46px;height:46px;opacity:0;z-index:2}
.vl-selection-box .cur svg{width:46px;height:46px;display:block}`,
  html(p, c) {
    const W = Math.round(+p.width), lh = Math.round(p.size * 1.03), H = 30 + 30 + 6 + lh + 26;
    const strike = !(p.strikeAt == null || p.strikeAt === "");
    return `<div class="sb" id="${c.id("b")}" style="left:${p.x}px;top:${p.y}px;width:${W}px;height:${H}px" data-h="${H}">`
      + `<div class="mq" id="${c.id("mq")}"><b class="h tl"></b><b class="h tr"></b><b class="h bl"></b><b class="h br"></b></div>`
      + `<div class="in"><div class="sm" id="${c.id("sm")}">${c.esc(p.small)}</div><div class="bg"><span class="bw" id="${c.id("bw")}" style="font-size:${p.size}px;line-height:${lh}px">${c.esc(p.text)}${strike ? `<i class="sk" id="${c.id("k")}"></i>` : ""}</span></div></div>`
      + `<div class="cur" id="${c.id("cu")}"><svg viewBox="0 0 24 24"><path d="M5 3 L5 19 L9 15 L12 22 L15 20.5 L11.5 14 L18 14 Z" fill="#fff" stroke="#141414" stroke-width="1.4" stroke-linejoin="round"/></svg></div></div>`;
  },
  animate(tl, p, c) {
    const W = Math.round(+p.width), lh = Math.round(p.size * 1.03), H = 30 + 30 + 6 + lh + 26;
    const a = p.at == null || p.at === "" ? 0.1 : +p.at, dg = p.dragAt == null || p.dragAt === "" ? 1 : +p.dragAt, df = Math.max(0.2, +p.dragFor || 0.55);
    const q = s => "#" + c.id(s), box = q("b");
    tl.set(box, { opacity: 1 }, c.at(a - 0.01));
    tl.fromTo(q("sm"), { opacity: 0, y: 10 }, { opacity: 0.9, y: 0, duration: 0.3, ease: "power3.out" }, c.at(a));
    tl.fromTo(q("bw"), { opacity: 0, y: 22, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "expo.out" }, c.at(a + 0.06));
    tl.fromTo(q("cu"), { opacity: 0, x: -60, y: -50 }, { opacity: 1, x: 0, y: 0, duration: 0.28, ease: "power3.out" }, c.at(dg - 0.3));
    tl.to(q("cu"), { scale: 0.86, duration: 0.06 }, c.at(dg - 0.04));
    tl.fromTo(q("mq"), { width: 0, height: 0, opacity: 1 }, { width: W, height: H, opacity: 1, duration: df, ease: "power2.inOut" }, c.at(dg));
    tl.fromTo(q("cu"), { x: 0, y: 0 }, { x: W, y: H, duration: df, ease: "power2.inOut", immediateRender: false }, c.at(dg));
    tl.to(q("cu"), { scale: 1, duration: 0.08 }, c.at(dg + df));
    tl.fromTo(c.$(".mq .h"), { scale: 0 }, { scale: 1, stagger: 0.03, duration: 0.2, ease: "back.out(3)" }, c.at(dg + df - 0.05));
    tl.fromTo(q("mq"), { backgroundColor: "rgba(12,9,7,0)" }, { backgroundColor: "rgba(12,9,7,.34)", duration: 0.25, ease: "power2.out", immediateRender: false }, c.at(dg + df));
    tl.to(q("cu"), { opacity: 0, x: W + 40, y: H + 30, duration: 0.35, ease: "power2.in" }, c.at(dg + df + 0.25));
    if (!(p.strikeAt == null || p.strikeAt === ""))
      tl.fromTo(q("k"), { scaleX: 0 }, { scaleX: 1, duration: 0.32, ease: "power3.out" }, c.at(+p.strikeAt));
    c.exit(tl, box, { y: 0, scale: 0.96 });
  },
});
