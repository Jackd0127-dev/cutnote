/* Persona cards (Day 20): stacked white rows, each an AI customer (coloured initial, name, what they think), landing on their own word. */
VideoLibrary.register({
  id: "persona-cards",
  name: "Persona cards",
  category: "People",
  collection: "Clean cards",
  order: 6,
  source: "Day 20",
  description: "Stacked white rows, one per AI customer: a coloured initial, a name and a quote. Each row pops in from alternating sides on its own beat.",
  tags: ["persona", "customers", "people", "quotes", "cards"],
  duration: 4.2,
  params: [
    { key: "lines", label: "Customers (one per line: Name|quote)", type: "lines", default: ["Budget Ben|“Bit pricey for me.”", "Gamer Gia|“Need this for my setup!”", "Practical Pete|“Will it wobble?”"] },
    { key: "times", label: "When each lands (s)", type: "times", default: [0.2, 1.1, 2.0] },
    { key: "x", label: "Left edge (px)", type: "number", default: 230, min: 0, max: 900 },
    { key: "y", label: "Top edge (px)", type: "number", default: 1230, min: 0, max: 1800 },
    { key: "width", label: "Width (px)", type: "number", default: 620, min: 360, max: 1040 },
  ],
  sfx: [{ file: "dry-pop-alert", at: "times[0]" }, { file: "pluck_001", at: "times[1]" }, { file: "hard-pop-click", at: "times[2]" }],
  css: `
.vl-persona-cards .ps{position:absolute;display:flex;flex-direction:column;gap:14px}
.vl-persona-cards .pp{display:flex;align-items:center;gap:22px;height:128px;padding:0 30px;border-radius:32px;background:rgba(255,255,255,.97);color:#17120e;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0}
.vl-persona-cards .av{flex:none;width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"ArchivoXB";font-size:38px;color:#fff}
.vl-persona-cards .av0{background:#17120e}.vl-persona-cards .av1{background:#c8ff3a;color:#17120e}.vl-persona-cards .av2{background:#7a6e63}
.vl-persona-cards .tx{display:flex;flex-direction:column;min-width:0}
.vl-persona-cards .nm{font-family:"ArchivoXB";font-size:36px;letter-spacing:-.02em;line-height:1.1}
.vl-persona-cards .qt{font-family:"ArchivoSB";font-size:30px;opacity:.7;margin-top:4px;white-space:nowrap}`,
  html(p, c) {
    const rows = p.lines.map((ln, k) => {
      const i = String(ln).indexOf("|"), nm = i < 0 ? String(ln) : String(ln).slice(0, i).trim(), q = i < 0 ? "" : String(ln).slice(i + 1).trim();
      return `<div class="pp" id="${c.id("r" + k)}"><div class="av av${k % 3}">${c.esc(nm.charAt(0).toUpperCase())}</div><div class="tx"><div class="nm">${c.esc(nm)}</div><div class="qt">${c.esc(q)}</div></div></div>`;
    }).join("");
    return `<div class="ps" id="${c.id("w")}" style="left:${p.x}px;top:${p.y}px;width:${p.width}px">${rows}</div>`;
  },
  animate(tl, p, c) {
    p.lines.forEach((_, k) => {
      const v = (p.times || [])[k];
      if (v == null || v === "") return;
      tl.fromTo("#" + c.id("r" + k), { opacity: 0, x: k % 2 === 0 ? -60 : 60, scale: 0.9 }, { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "back.out(1.7)" }, c.at(v - 0.05));
    });
    c.exit(tl, "#" + c.id("w"));
  },
});
