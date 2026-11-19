/* Captions, highlight (karaoke): all words visible, the active word turns lime and scales up. */
VideoLibrary.register({
  id: "captions-highlight",
  name: "Captions: highlight",
  category: "Captions",
  collection: "House",
  order: 2,
  preview: { background: "photo" },
  captions: true,
  source: "Day 20",
  description: "Karaoke style: every word is visible and the active word turns lime and grows slightly as it's said.",
  tags: ["captions", "karaoke", "highlight", "lime", "active word"],
  duration: 3.4,
  params: [
    { key: "text", label: "Caption text ([lime] words)", type: "longtext", default: "so what would [you] actually do with it" },
    { key: "wordAt", label: "Gap between words (s)", type: "number", default: 0.28, min: 0.05, max: 1.5 },
    { key: "y", label: "Caption centre line (px)", type: "number", default: 560 },
    { key: "size", label: "Text size (px)", type: "number", default: 84, min: 24, max: 220 },
  ],
  css: `
.vl-captions-highlight .cap{position:absolute;left:50px;right:50px;display:flex;justify-content:center;transform:translateY(-50%)}
.vl-captions-highlight .capi{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-captions-highlight .cl{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline}
.vl-captions-highlight .w{display:inline-block}
.vl-captions-highlight .cl{column-gap:.26em}
.vl-captions-highlight .w{font-family:"ArchivoXB";letter-spacing:-.03em;line-height:1.1;color:#fff;text-shadow:0 6px 28px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.35)}
.vl-captions-highlight em{font-style:normal;color:#c8ff3a}`,
  _w(p, c) {
    let open = false;
    return String(p.text || "").split(/\s+/).filter(Boolean).map(raw => {
      const lime = open || raw.includes("[");
      if (raw.includes("[")) open = true;
      if (raw.includes("]")) open = false;
      const t = raw.replace(/[\[\]]/g, "");
      return { t, lime, h: lime ? c.marks("[" + t + "]") : c.esc(t) };
    });
  },
  html(p, c) {
    const ws = this._w(p, c);
    const words = ws.map((q, i) => `<span class="w" id="${c.id("w" + i)}">${q.h}</span>`).join("");
    return `<div class="cap" style="top:${p.y}px"><div class="capi" id="${c.id("g")}" style="font-size:${p.size}px"><div class="cl">${words}</div></div></div>`;
  },
  animate(tl, p, c) {
    const ws = this._w(p, c), g = "#" + c.id("g"), at = +p.wordAt || 0.28;
    tl.fromTo(g, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }, c.at(0.05));
    ws.forEach((_, i) => {
      const w = "#" + c.id("w" + i);
      tl.fromTo(w, { color: "#ffffff", scale: 1 }, { color: c.lime, scale: 1.14, duration: 0.12, ease: "power2.out", immediateRender: false }, c.at(0.1 + i * at));
      tl.to(w, { color: "#ffffff", scale: 1, duration: 0.12, ease: "power2.inOut", immediateRender: false }, c.at(0.1 + (i + 1) * at));
    });
    tl.to(g, { opacity: 0, filter: "blur(8px)", duration: 0.12, ease: "power2.in" }, c.end - 0.14);
  },
});
