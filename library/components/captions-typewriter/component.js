/* Captions, typewriter: letters type in one by one with a caret. */
VideoLibrary.register({
  id: "captions-typewriter",
  name: "Captions: typewriter",
  category: "Captions",
  collection: "Character",
  order: 1,
  preview: { background: "photo" },
  captions: true,
  source: "Day 20",
  description: "Typewriter font: letters appear one by one with a lime blinking caret.",
  tags: ["captions", "typewriter", "mono", "letters", "caret"],
  duration: 3.4,
  params: [
    { key: "text", label: "Caption text ([lime] words)", type: "longtext", default: "so what would [you] actually do with it" },
    { key: "wordAt", label: "Gap between words (s)", type: "number", default: 0.28, min: 0.05, max: 1.5 },
    { key: "y", label: "Caption centre line (px)", type: "number", default: 560 },
    { key: "size", label: "Text size (px)", type: "number", default: 54, min: 24, max: 220 },
  ],
  css: `
.vl-captions-typewriter .cap{position:absolute;left:50px;right:50px;display:flex;justify-content:center;transform:translateY(-50%)}
.vl-captions-typewriter .capi{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-captions-typewriter .cl{display:flex;flex-wrap:wrap;justify-content:center;align-items:baseline}
.vl-captions-typewriter .w{display:inline-block}
.vl-captions-typewriter .cl{column-gap:.6em;row-gap:.1em}
.vl-captions-typewriter .w{font-family:"Typewriter";letter-spacing:0;line-height:1.25;color:#fff;white-space:nowrap;text-shadow:0 4px 20px rgba(0,0,0,.6),0 2px 5px rgba(0,0,0,.4)}
.vl-captions-typewriter .ch{position:relative;display:inline-block;opacity:0}
.vl-captions-typewriter .ch i{position:absolute;right:-.12em;top:.12em;bottom:.1em;width:.1em;background:#c8ff3a;box-shadow:0 0 10px rgba(200,255,58,.7);opacity:0}
.vl-captions-typewriter em{font-style:normal;color:#c8ff3a}`,
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
    let k = 0;
    const words = ws.map(q => `<span class="w">` + [...q.t].map(ch => { const n = k++; const s = `<span class="ch" id="${c.id("c" + n)}">${c.esc(ch)}<i id="${c.id("k" + n)}"></i></span>`; return q.lime ? `<em>${s}</em>` : s; }).join("") + `</span>`).join("");
    return `<div class="cap" style="top:${p.y}px"><div class="capi" id="${c.id("g")}" style="font-size:${p.size}px"><div class="cl">${words}</div></div></div>`;
  },
  animate(tl, p, c) {
    const n = [...this._w(p, c).map(q => q.t).join("")].length, g = "#" + c.id("g"), st = (+p.wordAt || 0.28) / 4.5;
    tl.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.05 }, c.at(0.05));
    for (let i = 0; i < n; i++) {
      const t = 0.1 + i * st;
      tl.fromTo("#" + c.id("c" + i), { opacity: 0 }, { opacity: 1, duration: 0.01 }, c.at(t));
      tl.fromTo("#" + c.id("k" + i), { opacity: 0 }, { opacity: 1, duration: 0.01 }, c.at(t));
      if (i < n - 1) tl.to("#" + c.id("k" + i), { opacity: 0, duration: 0.01, immediateRender: false }, c.at(t + st));
    }
    if (n) tl.to("#" + c.id("k" + (n - 1)), { opacity: 0, duration: 0.3, repeat: 5, yoyo: true, ease: "steps(1)", immediateRender: false }, c.at(0.1 + n * st));
    tl.to(g, { opacity: 0, filter: "blur(8px)", duration: 0.12, ease: "power2.in" }, c.end - 0.14);
  },
});
