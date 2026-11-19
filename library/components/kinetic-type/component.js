/* Kinetic type (Day 20): big lines land one by one with a blur-in straight on the footage; earlier lines step back.
 * Put a lime word in [brackets]. */
VideoLibrary.register({
  id: "kinetic-type",
  name: "Kinetic type",
  category: "Text",
  collection: "Cinematic",
  order: 1,
  preview: { background: "photo" },
  source: "Day 20",
  description: "Big lines land one at a time on the speaker's words with a blur-in; earlier lines step back. Lime words in [brackets]. No card, a soft dark scrim underneath.",
  tags: ["text", "kinetic", "headline", "cinematic"],
  duration: 3.2,
  params: [
    { key: "lines", label: "Lines (one per line, [lime] words)", type: "lines", default: ["no money", "no risk", "[just answers]"] },
    { key: "at", label: "When each line lands (s)", type: "times", default: [0.1, 0.8, 1.5] },
    { key: "size", label: "Text size (px)", type: "number", default: 104, min: 40, max: 220 },
    { key: "align", label: "Align", type: "select", options: ["center", "left"], default: "center" },
    { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [80, 1180, 1000, 1640] },
    { key: "scrim", label: "Dark scrim behind", type: "bool", default: true },
  ],
  sfx: [{ file: "drop_002", at: "at[0]" }, { file: "tick_002", at: "at[1..]" }],
  css: `
.vl-kinetic-type .kt{position:absolute;display:flex;flex-direction:column;justify-content:flex-end;gap:4px}
.vl-kinetic-type .kt.center{align-items:center;text-align:center}.vl-kinetic-type .kt.left{align-items:flex-start}
.vl-kinetic-type .kl{font-family:"ArchivoXB";line-height:1.02;letter-spacing:-.045em;color:#fff;white-space:nowrap;opacity:0;
  text-shadow:0 8px 40px rgba(0,0,0,.6),0 2px 8px rgba(0,0,0,.4);transform-origin:50% 100%}
.vl-kinetic-type .kt.left .kl{transform-origin:0 100%}
.vl-kinetic-type em{font-style:normal;color:#c8ff3a;text-shadow:0 0 26px rgba(200,255,58,.45),0 4px 18px rgba(0,0,0,.5)}`,
  html(p, c) {
    const [x0, y0, x1, y1] = p.box;
    const rows = p.lines.map((tx, k) => `<div class="kl" id="${c.id("l" + k)}" style="font-size:${p.size}px">${c.marks(tx)}</div>`).join("");
    return (p.scrim ? c.scrim(y0 - 160, 0.58, p.at[0]) : "")
      + `<div class="kt ${p.align}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px">${rows}</div>`;
  },
  animate(tl, p, c) {
    p.lines.forEach((_, k) => {
      const at = c.at(p.at[k] != null ? p.at[k] : p.at[p.at.length - 1] + 0.6 * (k - p.at.length + 1));
      tl.fromTo("#" + c.id("l" + k), { opacity: 0, y: 40, scale: 1.12, filter: "blur(14px)" },
        { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.42, ease: "expo.out" }, at - 0.06);
      for (let j = 0; j < k; j++)
        tl.to("#" + c.id("l" + j), { opacity: 0.38, scale: 0.92, filter: "blur(1.5px)", duration: 0.35, ease: "power2.out" }, at - 0.06);
    });
    c.exit(tl, c.$(".kt"));
  },
});
