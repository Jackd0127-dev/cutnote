/* Stat tiles (Day 18): white stat tiles stacked beside his face, each landing on its own word with a small spring. */
VideoLibrary.register({
  id: "stat-tiles",
  name: "Stat tiles",
  category: "Data & numbers",
  collection: "Data & numbers",
  order: 1,
  source: "Day 18",
  description: "White stat tiles stacked in a column, each landing on its own time with a springy rise (number big, label beside it). They lift away together at the end.",
  tags: ["stats", "numbers", "tiles", "metrics", "emails"],
  duration: 3.6,
  params: [
    { key: "items", label: "Tiles (number|label, one per line)", type: "lines", default: ["140|emails sent", "12|replies", "3|calls booked"] },
    { key: "at", label: "When each tile lands (s)", type: "times", default: [0.2, 0.9, 1.6] },
    { key: "big", label: "Bigger tiles", type: "bool", default: false },
    { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [80, 1260, 600, 1720] },
  ],
  sfx: [{ file: "drop_002", at: "at[0]" }, { file: "drop_002", at: "at[1..]" }],
  css: `
.vl-stat-tiles .stt{position:absolute;display:flex;flex-direction:column;gap:14px;align-items:flex-start}
.vl-stat-tiles .sttile{display:flex;align-items:baseline;gap:16px;padding:18px 30px 20px;border-radius:26px;background:#fff;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0;color:#17120e;white-space:nowrap}
.vl-stat-tiles .n{font-family:"ArchivoXB";font-size:74px;letter-spacing:-.04em;line-height:1}
.vl-stat-tiles .l{font-family:"ArchivoSB";font-size:34px;letter-spacing:-.01em;color:rgba(23,18,14,.72)}
.vl-stat-tiles .big .n{font-size:100px}.vl-stat-tiles .big .l{font-size:30px}.vl-stat-tiles .big{padding:16px 26px 18px}`,
  html(p, c) {
    const [x0, y0, x1] = p.box;
    const rows = p.items.map((s, k) => {
      const i = String(s).indexOf("|"), n = i < 0 ? s : s.slice(0, i), l = i < 0 ? "" : s.slice(i + 1);
      return `<div class="sttile${p.big ? " big" : ""}" id="${c.id("t" + k)}"><span class="n">${c.esc(n)}</span><span class="l">${c.esc(l)}</span></div>`;
    }).join("");
    return `<div class="stt" id="${c.id("w")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px">${rows}</div>`;
  },
  animate(tl, p, c) {
    p.items.forEach((_, k) => {
      const at = p.at[k] != null ? p.at[k] : p.at[p.at.length - 1] + 0.7 * (k - p.at.length + 1);
      tl.fromTo("#" + c.id("t" + k), { opacity: 0, y: 40, scale: 0.86 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "back.out(1.8)" }, c.at(at - 0.06));
    });
    c.exit(tl, "#" + c.id("w"));
  },
});
