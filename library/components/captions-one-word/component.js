/* Captions, one word at a time: big, centred, punchy scale-in. */
VideoLibrary.register({
  id: "captions-one-word",
  name: "Captions: one word",
  category: "Captions",
  collection: "Bold",
  order: 1,
  preview: { background: "photo" },
  captions: true,
  source: "Day 20",
  description: "One big word at a time, centred, each landing with a punchy scale-in.",
  tags: ["captions", "one word", "big", "punchy", "centred"],
  duration: 3.4,
  params: [
    { key: "text", label: "Caption text ([lime] words)", type: "longtext", default: "so what would [you] actually do with it" },
    { key: "wordAt", label: "Gap between words (s)", type: "number", default: 0.28, min: 0.05, max: 1.5 },
    { key: "y", label: "Caption centre line (px)", type: "number", default: 560 },
    { key: "size", label: "Text size (px)", type: "number", default: 150, min: 24, max: 220 },
  ],
  css: `
.vl-captions-one-word .cap{position:absolute;left:50px;right:50px;display:flex;justify-content:center;transform:translateY(-50%)}
.vl-captions-one-word .capi{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-captions-one-word .cl{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline}
.vl-captions-one-word .w{display:inline-block}
.vl-captions-one-word .cap{left:0;right:0}
.vl-captions-one-word .capi{width:100%;height:1em;align-items:center;justify-content:center}
.vl-captions-one-word .w{position:absolute;left:0;right:0;top:50%;margin-top:-.55em;text-align:center;font-family:"ArchivoXB";letter-spacing:-.045em;line-height:1.1;color:#fff;opacity:0;white-space:nowrap;text-shadow:0 8px 40px rgba(0,0,0,.6),0 2px 8px rgba(0,0,0,.4)}
.vl-captions-one-word em{font-style:normal;color:#c8ff3a}`,
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
    const ws = this._w(p, c), at = +p.wordAt || 0.28;
    ws.forEach((_, i) => {
      const w = "#" + c.id("w" + i), t = 0.1 + i * at;
      tl.fromTo(w, { opacity: 0, scale: 0.55, y: 14 }, { opacity: 1, scale: 1, y: 0, duration: 0.18, ease: "back.out(2.4)" }, c.at(t));
      if (i < ws.length - 1) tl.to(w, { opacity: 0, duration: 0.05, immediateRender: false }, c.at(t + at - 0.02));
    });
    tl.to("#" + c.id("g"), { opacity: 0, filter: "blur(8px)", duration: 0.12, ease: "power2.in" }, c.end - 0.14);
  },
});
