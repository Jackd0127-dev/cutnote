/* Price slider (Day 20): a big price whose digits roll like a slot machine while a lime slider knob sweeps and settles. */
VideoLibrary.register({
  id: "price-slider",
  name: "Price slider",
  category: "Data & numbers",
  collection: "Data & numbers",
  order: 2,
  preview: { background: "photo" },
  source: "Day 20",
  description: "A huge price rolls digit by digit while a slider's lime knob sweeps both ways and settles on the value. Optional \"example\" tag.",
  tags: ["price", "pricing", "money", "slider", "number", "digits"],
  duration: 3.8,
  params: [
    { key: "value", label: "Price", type: "number", default: 24, min: 0, max: 99999 },
    { key: "lo", label: "Slider low", type: "number", default: 10 },
    { key: "hi", label: "Slider high", type: "number", default: 50 },
    { key: "currency", label: "Currency symbol", type: "text", default: "£" },
    { key: "label", label: "Label", type: "text", default: "BEST PRICE" },
    { key: "example", label: "Show \"example\" tag", type: "bool", default: true },
    { key: "rollAt", label: "Digits roll at (s)", type: "time", default: 0.5 },
    { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [150, 1220, 930, 1600] },
  ],
  sfx: [{ file: "switch_003", at: "rollAt" }, { file: "tick_002", at: "rollAt+1.3" }],
  css: `
.vl-price-slider .pr{position:absolute;opacity:0;color:#fff}
.vl-price-slider .lb{font-family:"Typewriter";font-size:26px;letter-spacing:.18em;color:rgba(255,255,255,.85);text-shadow:0 2px 10px rgba(0,0,0,.6)}
.vl-price-slider .lb em{font-style:normal;opacity:.6;letter-spacing:.08em}
.vl-price-slider .v{display:flex;align-items:flex-start;height:150px;font-family:"ArchivoXB";font-size:150px;line-height:150px;letter-spacing:-.05em;text-shadow:0 8px 40px rgba(0,0,0,.6);margin-top:6px}
.vl-price-slider .cur{margin-right:4px}
.vl-price-slider .dg{display:inline-block;height:150px;overflow:hidden}
.vl-price-slider .sp{display:flex;flex-direction:column}
.vl-price-slider .sp b{display:block;height:150px;margin:0;font-size:inherit;line-height:150px;font-weight:normal}
.vl-price-slider .tr{position:relative;height:34px;margin:26px 20px 0}
.vl-price-slider .tk{position:absolute;left:0;right:0;top:15px;height:4px;border-radius:2px;background:rgba(255,255,255,.3)}
.vl-price-slider .tk i{position:absolute;top:-7px;width:2px;height:18px;background:rgba(255,255,255,.45)}
.vl-price-slider .fl{position:absolute;left:0;top:15px;height:4px;border-radius:2px;background:#c8ff3a;box-shadow:0 0 12px rgba(200,255,58,.7);width:0}
.vl-price-slider .kn{position:absolute;left:-17px;top:0;width:34px;height:34px;border-radius:50%;background:#c8ff3a;box-shadow:0 0 0 6px rgba(200,255,58,.25),0 0 20px rgba(200,255,58,.8)}
.vl-price-slider .ax{display:flex;justify-content:space-between;margin:10px 20px 0;font-family:"ArchivoSB";font-size:26px;color:rgba(255,255,255,.7)}`,
  html(p, c) {
    const [x0, y0, x1] = p.box, cur = c.esc(p.currency);
    const digits = String(Math.max(0, Math.round(+p.value || 0)));
    const cols = [...digits].map((_, k) => `<span class="dg"><span class="sp" id="${c.id("d" + k)}">` + Array.from({ length: 20 }, (_, n) => `<b>${n % 10}</b>`).join("") + "</span></span>").join("");
    const ticks = Array.from({ length: 9 }, (_, k) => `<i style="left:${(100 * k / 8).toFixed(1)}%"></i>`).join("");
    return c.scrim(y0 - 160, 0.6) + `<div class="pr" id="${c.id("pr")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px"><div class="lb">${c.esc(p.label)}${p.example ? " <em>· example</em>" : ""}</div>`
      + `<div class="v"><span class="cur">${cur}</span>${cols}</div><div class="tr"><div class="tk">${ticks}</div><div class="fl" id="${c.id("fl")}"></div><div class="kn" id="${c.id("kn")}"></div></div>`
      + `<div class="ax"><span>${cur}${c.esc(p.lo)}</span><span>${cur}${c.esc(p.hi)}</span></div></div>`;
  },
  animate(tl, p, c) {
    const digits = String(Math.max(0, Math.round(+p.value || 0)));
    const r = p.rollAt == null || p.rollAt === "" ? 0.5 : +p.rollAt;
    tl.fromTo("#" + c.id("pr"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, c.at(0));
    [...digits].forEach((d, k) => tl.fromTo("#" + c.id("d" + k), { y: 0 }, { y: -(10 + +d) * 150, duration: 1 + 0.15 * k, ease: "power3.out" }, c.at(r + 0.08 * k)));
    const track = p.box[2] - p.box[0] - 40, span = (+p.hi - +p.lo) || 1;
    const pos = Math.min(1, Math.max(0, (+p.value - +p.lo) / span));
    for (const [sel, prop] of [["kn", "x"], ["fl", "width"]]) {
      const id = "#" + c.id(sel);
      tl.fromTo(id, { [prop]: 0 }, { [prop]: track * 0.82, duration: 0.45, ease: "power2.inOut" }, c.at(r));
      tl.to(id, { [prop]: track * 0.12, duration: 0.4, ease: "power2.inOut", immediateRender: false }, c.at(r + 0.45));
      tl.to(id, { [prop]: track * pos, duration: 0.45, ease: "back.out(1.6)", immediateRender: false }, c.at(r + 0.85));
    }
    c.exit(tl, "#" + c.id("pr"));
  },
});
