/* Break-even graph (Day 20): a lime line climbs, a dashed break-even line draws across, and the crossing flashes with a label. */
VideoLibrary.register({
  id: "break-even-graph",
  name: "Break-even graph",
  category: "Data & numbers",
  collection: "Data & numbers",
  order: 3,
  preview: { background: "photo" },
  source: "Day 20",
  description: "A glowing lime line climbs a faint grid past a dashed break-even line; the crossing pops with a lime dot and a \"38 sales / month\" label.",
  tags: ["graph", "chart", "break even", "sales", "growth", "line"],
  duration: 4,
  params: [
    { key: "label", label: "Chart title", type: "text", default: "SALES / MONTH" },
    { key: "need", label: "Number at the crossing", type: "number", default: 38 },
    { key: "unit", label: "Crossing label unit", type: "text", default: "sales / month" },
    { key: "be", label: "Break-even line label", type: "text", default: "break-even" },
    { key: "example", label: "Show \"example\" tag", type: "bool", default: true },
    { key: "crossAt", label: "Line crosses (s)", type: "time", default: 1.8 },
    { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [150, 1180, 930, 1620] },
  ],
  sfx: [{ file: "select_002", at: "crossAt" }, { file: "confirmation_002", at: "crossAt" }],
  css: `
.vl-break-even-graph .gr{position:absolute;opacity:0}
.vl-break-even-graph .lb{font-family:"Typewriter";font-size:26px;letter-spacing:.18em;color:rgba(255,255,255,.85);text-shadow:0 2px 10px rgba(0,0,0,.6)}
.vl-break-even-graph .lb em{font-style:normal;opacity:.6;letter-spacing:.08em}
.vl-break-even-graph svg{display:block;margin:20px 20px 0;overflow:visible}
.vl-break-even-graph line.g{stroke:rgba(255,255,255,.12);stroke-width:2}
.vl-break-even-graph line.be{stroke:#fff;stroke-width:4;stroke-dasharray:14 12;opacity:0}
.vl-break-even-graph path.ln{fill:none;stroke:#c8ff3a;stroke-width:9;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 12px rgba(200,255,58,.7))}
.vl-break-even-graph path.ar{fill:rgba(200,255,58,.12);stroke:none;opacity:0}
.vl-break-even-graph circle.x{fill:#c8ff3a;stroke:#fff;stroke-width:5;opacity:0;filter:drop-shadow(0 0 16px rgba(200,255,58,.9))}
.vl-break-even-graph .bl{position:absolute;left:24px;font-family:"ArchivoSB";font-size:28px;color:#fff;opacity:0;text-shadow:0 2px 10px rgba(0,0,0,.6)}
.vl-break-even-graph .cl{position:absolute;font-family:"ArchivoXB";font-size:38px;letter-spacing:-.02em;color:#c8ff3a;opacity:0;white-space:nowrap;text-shadow:0 0 18px rgba(200,255,58,.45),0 3px 12px rgba(0,0,0,.6)}`,
  _geo(p) {
    const [x0, y0, x1, y1] = p.box, W = x1 - x0, H = y1 - y0, pw = W - 40, ph = H - 120, by = ph * 0.42;
    const pts = [[0, ph * 0.95], [pw * 0.18, ph * 0.86], [pw * 0.36, ph * 0.7], [pw * 0.52, by], [pw * 0.7, ph * 0.26], [pw * 0.86, ph * 0.12], [pw, ph * 0.02]];
    return { x0, y0, W, H, pw, ph, by, pts, d: "M" + pts.map(q => `${q[0].toFixed(0)} ${q[1].toFixed(0)}`).join(" L") };
  },
  html(p, c) {
    const g = this._geo(p), [cx, cy] = g.pts[3];
    const grid = [1, 2, 3, 4].map(k => `<line class="g" x1="0" x2="${g.pw}" y1="${(g.ph * k / 4).toFixed(0)}" y2="${(g.ph * k / 4).toFixed(0)}"/>`).join("");
    return c.scrim(g.y0 - 140, 0.62) + `<div class="gr" id="${c.id("gr")}" style="left:${g.x0}px;top:${g.y0}px;width:${g.W}px;height:${g.H}px"><div class="lb">${c.esc(p.label)}${p.example ? " <em>· example</em>" : ""}</div>`
      + `<svg viewBox="-10 -20 ${g.pw + 20} ${g.ph + 40}" style="width:${g.pw}px;height:${g.ph}px">${grid}<line id="${c.id("be")}" class="be" x1="0" x2="${g.pw}" y1="${g.by.toFixed(0)}" y2="${g.by.toFixed(0)}"/>`
      + `<path id="${c.id("ar")}" class="ar" d="${g.d} L${g.pw} ${g.ph} L0 ${g.ph} Z"/><path id="${c.id("ln")}" class="ln" d="${g.d}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>`
      + `<circle id="${c.id("x")}" class="x" cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="16"/></svg>`
      + (p.be ? `<div class="bl" id="${c.id("bl")}" style="top:${(g.by - 6).toFixed(0)}px">${c.esc(p.be)}</div>` : "")
      + `<div class="cl" id="${c.id("cl")}" style="left:${(cx + 54).toFixed(0)}px;top:${(cy + 84).toFixed(0)}px">${c.esc(p.need)} ${c.esc(p.unit)}</div></div>`;
  },
  animate(tl, p, c) {
    const x = p.crossAt == null || p.crossAt === "" ? 1.8 : +p.crossAt, I = n => "#" + c.id(n);
    tl.fromTo(I("gr"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, c.at(0));
    tl.fromTo(I("be"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, c.at(0.2));
    if (p.be) tl.fromTo(I("bl"), { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, c.at(0.3));
    tl.fromTo(I("ln"), { strokeDashoffset: 100 }, { strokeDashoffset: 48, duration: Math.max(0.2, x - 0.25), ease: "power1.inOut" }, c.at(0.25));
    tl.fromTo(I("ln"), { strokeDashoffset: 48 }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.out", immediateRender: false }, c.at(x));
    tl.fromTo(I("ar"), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out" }, c.at(x + 0.2));
    tl.fromTo(I("x"), { opacity: 0, scale: 0.2, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(3)" }, c.at(x - 0.05));
    tl.fromTo(I("cl"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, c.at(x + 0.1));
    c.exit(tl, I("gr"));
  },
});
