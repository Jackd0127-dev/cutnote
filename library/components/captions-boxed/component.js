/* Captions, boxed (TikTok style): each word on its own black rounded box. */
VideoLibrary.register({
  id: "captions-boxed",
  name: "Captions: boxed",
  category: "Captions",
  collection: "Bold",
  order: 2,
  captions: true,
  source: "Day 20",
  description: "TikTok style: each word on its own black rounded box with white text, popping in one by one.",
  tags: ["captions", "tiktok", "box", "black", "pop"],
  duration: 3.4,
  params: [
    { key: "text", label: "Caption text ([lime] words)", type: "longtext", default: "so what would [you] actually do with it" },
    { key: "wordAt", label: "Gap between words (s)", type: "number", default: 0.28, min: 0.05, max: 1.5 },
    { key: "y", label: "Caption centre line (px)", type: "number", default: 560 },
    { key: "size", label: "Text size (px)", type: "number", default: 66, min: 24, max: 220 },
  ],
  css: `
.vl-captions-boxed .cap{position:absolute;left:50px;right:50px;display:flex;justify-content:center;transform:translateY(-50%)}
.vl-captions-boxed .capi{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-captions-boxed .cl{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline}
.vl-captions-boxed .w{display:inline-block}
.vl-captions-boxed .cl{gap:10px 10px}
.vl-captions-boxed .w{font-family:"ArchivoXB";letter-spacing:-.02em;line-height:1.05;color:#fff;background:#0b0908;padding:.1em .3em .16em;border-radius:.28em;box-shadow:0 8px 22px rgba(0,0,0,.35)}
.vl-captions-boxed em{font-style:normal;color:#c8ff3a}`,
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
    ws.forEach((_, i) => tl.fromTo("#" + c.id("w" + i), { opacity: 0, scale: 0.5, y: 10 }, { opacity: 1, scale: 1, y: 0, duration: 0.2, ease: "back.out(2.4)" }, c.at(0.1 + i * at)));
    tl.to(g, { opacity: 0, scale: 0.96, duration: 0.12, ease: "power2.in" }, c.end - 0.14);
  },
});
