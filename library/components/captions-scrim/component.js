/* Captions, scrim: classic words over a soft dark radial pill. */
VideoLibrary.register({
  id: "captions-scrim",
  name: "Captions: soft scrim",
  category: "Captions",
  collection: "House",
  order: 4,
  preview: { background: "photo" },
  captions: true,
  source: "Day 20",
  description: "Classic captions on a soft dark radial pill, for bright or busy footage.",
  tags: ["captions", "scrim", "dark", "readable", "bright"],
  duration: 3.4,
  params: [
    { key: "text", label: "Caption text ([lime] words)", type: "longtext", default: "so what would [you] actually do with it" },
    { key: "wordAt", label: "Gap between words (s)", type: "number", default: 0.28, min: 0.05, max: 1.5 },
    { key: "y", label: "Caption centre line (px)", type: "number", default: 560 },
    { key: "size", label: "Text size (px)", type: "number", default: 84, min: 24, max: 220 },
  ],
  css: `
.vl-captions-scrim .cap{position:absolute;left:50px;right:50px;display:flex;justify-content:center;transform:translateY(-50%)}
.vl-captions-scrim .capi{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-captions-scrim .cl{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline}
.vl-captions-scrim .w{display:inline-block}
.vl-captions-scrim .cl{column-gap:.26em}
.vl-captions-scrim .w{font-family:"ArchivoXB";letter-spacing:-.03em;line-height:1.1;color:#fff;text-shadow:0 6px 28px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.35)}
.vl-captions-scrim .capi::before{content:"";position:absolute;left:-90px;right:-90px;top:-50px;bottom:-50px;z-index:-1;border-radius:50%;background:radial-gradient(ellipse at center,rgba(6,5,4,.72) 0%,rgba(6,5,4,.5) 50%,rgba(6,5,4,0) 74%)}
.vl-captions-scrim em{font-style:normal;color:#c8ff3a}`,
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
