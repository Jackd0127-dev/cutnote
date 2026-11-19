/* Captions, classic (Day 20 template word()): white heavy words, soft shadow, blur-in per word. */
VideoLibrary.register({
  id: "captions-classic",
  name: "Captions: classic",
  category: "Captions",
  collection: "House",
  order: 1,
  preview: { background: "photo" },
  captions: true,
  source: "Day 20",
  description: "The house caption style: heavy white words with a soft shadow, each word blurring in on its time. [Lime] words supported.",
  tags: ["captions", "house", "white", "default"],
  duration: 3.4,
  params: [
    { key: "text", label: "Caption text ([lime] words)", type: "longtext", default: "so what would [you] actually do with it" },
    { key: "wordAt", label: "Gap between words (s)", type: "number", default: 0.28, min: 0.05, max: 1.5 },
    { key: "y", label: "Caption centre line (px)", type: "number", default: 560 },
    { key: "size", label: "Text size (px)", type: "number", default: 84, min: 24, max: 220 },
  ],
  css: `
.vl-captions-classic .cap{position:absolute;left:50px;right:50px;display:flex;justify-content:center;transform:translateY(-50%)}
.vl-captions-classic .capi{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-captions-classic .cl{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline}
.vl-captions-classic .w{display:inline-block}
.vl-captions-classic .cl{column-gap:.26em}
.vl-captions-classic .w{font-family:"ArchivoXB";letter-spacing:-.03em;line-height:1.1;color:#fff;text-shadow:0 6px 28px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.35)}
.vl-captions-classic em{font-style:normal;color:#c8ff3a}`,
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
    tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.05 }, c.at(0.05));
    ws.forEach((_, i) => tl.fromTo("#" + c.id("w" + i), { opacity: 0.22, y: 12, filter: "blur(7px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.22, ease: "power2.out" }, c.at(0.1 + i * at)));
    tl.to(g, { opacity: 0, filter: "blur(8px)", duration: 0.12, ease: "power2.in" }, c.end - 0.14);
  },
});
