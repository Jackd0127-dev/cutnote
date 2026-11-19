/* Captions, ink (Day 13 .cap.ink): dark text, white glow, for bright skies. */
VideoLibrary.register({
  id: "captions-ink",
  name: "Captions: ink",
  category: "Captions",
  collection: "Character",
  order: 2,
  preview: { background: "light" },
  captions: true,
  source: "Day 13",
  description: "Dark ink words with a white glow for bright backgrounds (the Day 13 ink style). [Lime] words become a lime highlighter mark.",
  tags: ["captions", "ink", "dark", "bright background", "glow"],
  duration: 3.4,
  params: [
    { key: "text", label: "Caption text ([lime] words)", type: "longtext", default: "so what would [you] actually do with it" },
    { key: "wordAt", label: "Gap between words (s)", type: "number", default: 0.28, min: 0.05, max: 1.5 },
    { key: "y", label: "Caption centre line (px)", type: "number", default: 560 },
    { key: "size", label: "Text size (px)", type: "number", default: 84, min: 24, max: 220 },
  ],
  css: `
.vl-captions-ink .cap{position:absolute;left:50px;right:50px;display:flex;justify-content:center;transform:translateY(-50%)}
.vl-captions-ink .capi{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-captions-ink .cl{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline}
.vl-captions-ink .w{display:inline-block}
.vl-captions-ink .cl{column-gap:.26em}
.vl-captions-ink .w{font-family:"ArchivoXB";letter-spacing:-.03em;line-height:1.1;color:#17120e;text-shadow:0 0 22px rgba(255,255,255,.6),0 0 6px rgba(255,255,255,.45)}
.vl-captions-ink .w em{color:#17120e;background:#c8ff3a;padding:0 .12em;border-radius:.14em;text-shadow:none}
.vl-captions-ink em{font-style:normal;color:#c8ff3a}`,
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
