/* AI customer crowd (Day 20): 100 lit figures in perspective rows spawn out from the middle, a counter runs to 100, then the
 * buyers glow lime and the rest fall back into shadow. Optional: one "exact buyer" lights up and a ripple runs out. */
VideoLibrary.register({
  id: "customer-crowd",
  name: "Customer crowd",
  category: "Data & numbers",
  collection: "Data & numbers",
  order: 4,
  preview: { background: "photo" },
  source: "Day 20",
  description: "100 lit people in perspective rows spawn from the middle with a counter; on the verdict the buyers glow lime and the rest fade back. Sits under his face on a soft scrim.",
  tags: ["people", "audience", "crowd", "survey", "customers", "percentage"],
  duration: 4.6,
  params: [
    { key: "label", label: "Label", type: "text", default: "AI CUSTOMERS" },
    { key: "count", label: "Number shown", type: "number", default: 100, min: 1, max: 100000 },
    { key: "buyerShare", label: "Share that light up (%)", type: "number", default: 41, min: 0, max: 100 },
    { key: "spawnAt", label: "Crowd appears (s)", type: "time", default: 0.2 },
    { key: "verdictAt", label: "Buyers light up (s, blank = never)", type: "time", default: 1.9 },
    { key: "buyerAt", label: "\"Exact buyer\" moment (s, blank = never)", type: "time", default: 3.1 },
    { key: "yes", label: "Legend: yes", type: "text", default: "would buy" },
    { key: "no", label: "Legend: no", type: "text", default: "wouldn't" },
    { key: "buyerText", label: "Exact buyer label", type: "text", default: "your exact buyer" },
    { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [150, 1120, 930, 1600] },
  ],
  sfx: [{ file: "maximize_006", at: "spawnAt" }, { file: "confirmation_002", at: "verdictAt" }, { file: "pluck_001", at: "buyerAt" }],
  css: `
.vl-customer-crowd .fig{position:absolute;display:block;color:#fff;opacity:0;filter:drop-shadow(0 6px 10px rgba(0,0,0,.55))}
.vl-customer-crowd .fig svg{width:100%;height:100%;fill:currentColor;opacity:var(--o);display:block}
.vl-customer-crowd .lb{position:absolute;z-index:2000;font-family:"Typewriter";font-size:26px;letter-spacing:.18em;color:rgba(255,255,255,.85);opacity:0;text-shadow:0 2px 10px rgba(0,0,0,.6);white-space:nowrap}
.vl-customer-crowd .lb .n{color:#c8ff3a;font-family:"ArchivoXB";letter-spacing:-.02em;font-size:34px}
.vl-customer-crowd .lg{position:absolute;z-index:2000;display:flex;justify-content:center;gap:40px;font-family:"ArchivoSB";font-size:30px;color:#fff;opacity:0;text-shadow:0 2px 10px rgba(0,0,0,.6)}
.vl-customer-crowd .lg span{display:flex;align-items:center;gap:12px}
.vl-customer-crowd .lg i{width:20px;height:20px;border-radius:50%;display:inline-block}
.vl-customer-crowd .lg .by{background:#c8ff3a;box-shadow:0 0 14px rgba(200,255,58,.8)}.vl-customer-crowd .lg .no{background:rgba(255,255,255,.3)}
.vl-customer-crowd .bt{position:absolute;z-index:2000;width:320px;text-align:center;font-family:"ArchivoXB";font-size:34px;letter-spacing:-.02em;color:#c8ff3a;opacity:0;text-shadow:0 0 18px rgba(200,255,58,.45),0 3px 12px rgba(0,0,0,.6)}`,
  _figs(p, c) {
    if (c._figs) return c._figs;
    const [x0, y0, x1, y1] = p.box;
    const rows = [16, 15, 14, 13, 12, 11, 10, 9];
    const rnd = c.rng(Math.round(x0) + 77);
    const figs = [];
    let k = 0;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    rows.forEach((n, r) => {
      const f = r / (rows.length - 1), sz = 30 + 50 * f;
      const yb = y0 + 60 + (y1 - y0 - 60) * (0.18 + 0.82 * Math.pow(f, 0.9));
      const span = (x1 - x0) * (0.62 + 0.38 * f);
      for (let j = 0; j < n; j++) {
        const x = cx - span / 2 + span * (j + 0.5) / n + (rnd() - 0.5) * span / n * 0.5;
        const y = yb - sz * 1.3 + (rnd() - 0.5) * 6;
        figs.push({ k, x: x - sz / 2, y, sz, o: 0.55 + 0.45 * f, buy: (k * 37 + 11) % 100 < p.buyerShare, d: Math.hypot(x - cx, (y - cy) * 1.6) });
        k++;
      }
    });
    return (c._figs = figs);
  },
  html(p, c) {
    const FIG = '<svg viewBox="0 0 40 52"><circle cx="20" cy="12" r="10"/><path d="M2 52c0-13 8-22 18-22s18 9 18 22z"/></svg>';
    const [x0, y0, x1, y1] = p.box;
    const figs = this._figs(p, c);
    const body = figs.map(q => `<i class="fig" id="${c.id("p" + q.k)}" style="left:${q.x.toFixed(0)}px;top:${q.y.toFixed(0)}px;width:${q.sz.toFixed(0)}px;height:${(q.sz * 1.3).toFixed(0)}px;--o:${q.o.toFixed(2)};z-index:${Math.round(q.y)}">${FIG}</i>`).join("");
    const lab = `<div class="lb" id="${c.id("lb")}" style="left:${x0 + 8}px;top:${y0 - 6}px"><span class="n" id="${c.id("n")}">0</span> ${c.esc(p.label)}</div>`;
    const leg = p.verdictAt != null && p.verdictAt !== "" ? `<div class="lg" id="${c.id("lg")}" style="left:${x0}px;width:${x1 - x0}px;top:${y1 + 14}px"><span><i class="by"></i>${c.esc(p.yes)}</span><span><i class="no"></i>${c.esc(p.no)}</span></div>` : "";
    let bt = "";
    if (p.buyerAt != null && p.buyerAt !== "") {
      const c0 = figs.slice().sort((a, b) => a.d - b.d)[0];
      bt = `<div class="bt" id="${c.id("bt")}" style="left:${(c0.x + c0.sz / 2 - 160).toFixed(0)}px;top:${(c0.y - 66).toFixed(0)}px">${c.esc(p.buyerText)}</div>`;
    }
    return c.scrim(y0 - 140, 0.62) + `<div class="cr">${body}${lab}${leg}${bt}</div>`;
  },
  animate(tl, p, c) {
    const figs = this._figs(p, c);
    const order = figs.slice().sort((a, b) => a.d - b.d);
    const sp = c.at(p.spawnAt);
    order.forEach((q, r) => tl.fromTo("#" + c.id("p" + q.k), { opacity: 0, y: 26, scale: 0.5 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "back.out(2)" }, sp + 0.75 * r / order.length));
    tl.fromTo("#" + c.id("lb"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, c.at(0.05));
    const cnt = { n: 0 }, el = () => document.getElementById(c.id("n")), total = +p.count || 100, pad = String(total).length;
    tl.fromTo(cnt, { n: 0 }, { n: total, duration: 0.8, ease: "power2.out", onUpdate() { const e = el(); if (e) e.textContent = String(Math.round(cnt.n)).padStart(pad, "0"); } }, sp);
    if (p.verdictAt != null && p.verdictAt !== "") {
      const va = c.at(p.verdictAt);
      const buyers = order.filter(q => q.buy), rest = order.filter(q => !q.buy);
      buyers.forEach((q, r) => tl.fromTo("#" + c.id("p" + q.k), { color: "#ffffff" }, { color: c.lime, filter: "drop-shadow(0 0 10px rgba(200,255,58,.75))", duration: 0.25, ease: "power2.out", immediateRender: false }, va + 0.4 * r / Math.max(1, buyers.length)));
      if (rest.length) tl.fromTo(rest.map(q => "#" + c.id("p" + q.k)).join(","), { opacity: 1 }, { opacity: 0.22, duration: 0.35, ease: "power2.out", immediateRender: false }, va + 0.1);
      tl.fromTo("#" + c.id("lg"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, va + 0.35);
    }
    if (p.buyerAt != null && p.buyerAt !== "") {
      const ba = c.at(p.buyerAt), q0 = order[0];
      // each figure's colour going into the ripple: lime if the verdict already lit it, white otherwise; the ripple flashes
      // the other colour and comes back, so the verdict's result survives
      const lit = p.verdictAt != null && p.verdictAt !== "" && +p.verdictAt < +p.buyerAt;
      const base = q => (lit && q.buy ? c.lime : "#ffffff");
      tl.fromTo("#" + c.id("p" + q0.k), { color: base(q0), scale: 1 }, { color: c.lime, scale: 1.35, filter: "drop-shadow(0 0 14px rgba(200,255,58,.9))", duration: 0.3, ease: "back.out(2)", immediateRender: false }, ba - 0.1);
      tl.fromTo("#" + c.id("bt"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" }, ba);
      order.slice(1).forEach((q, r) => tl.fromTo("#" + c.id("p" + q.k), { color: base(q) }, { color: base(q) === c.lime ? "#ffffff" : c.lime, yoyo: true, repeat: 1, duration: 0.14, ease: "sine.inOut", immediateRender: false }, ba + 0.15 + 0.6 * r / order.length));
    }
    c.exit(tl, c.$(".cr"), { y: 20 });
  },
});
