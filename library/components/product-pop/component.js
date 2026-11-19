/* Product pop (Day 20): a cut-out product pops in rotated with a label under it, then floats gently. */
VideoLibrary.register({
  id: "product-pop",
  name: "Product pop",
  category: "Media",
  collection: "Photos & media",
  order: 6,
  preview: { background: "photo" },
  source: "Day 20",
  description: "A cut-out product image pops in tilted with a bouncy scale and a label, then floats up and down until it leaves.",
  tags: ["product", "cut-out", "pop", "etsy", "item", "label"],
  duration: 3.2,
  params: [
    { key: "src", label: "Product image (transparent PNG/SVG)", type: "image", default: "preview/product-candle.png" },
    { key: "label", label: "Label", type: "text", default: "my Etsy best-seller" },
    { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [236, 1140, 596, 1640] },
    { key: "popAt", label: "Pops in (s)", type: "time", default: 0.2 },
  ],
  sfx: [{ file: "dry-pop-alert", at: "popAt" }, { file: "pluck_001", at: "popAt" }],
  css: `
.vl-product-pop .pd{position:absolute;opacity:0;display:flex;flex-direction:column;align-items:center;gap:6px}
.vl-product-pop .pd img{flex:1;min-height:0;max-width:92%;object-fit:contain;display:block;filter:drop-shadow(0 26px 30px rgba(0,0,0,.55))}
.vl-product-pop .pd span{font-family:"ArchivoXB";font-size:36px;letter-spacing:-.02em;color:#fff;text-shadow:0 3px 14px rgba(0,0,0,.7);white-space:nowrap}`,
  html(p, c) {
    const [x0, y0, x1, y1] = p.box;
    const u = /^(https?:|\/|data:)/.test(p.src) ? p.src : c.base + p.src;
    return `<div class="pd" id="${c.id("pd")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px"><img src="${c.esc(u)}" alt="">${p.label ? `<span>${c.esc(p.label)}</span>` : ""}</div>`;
  },
  animate(tl, p, c) {
    const el = "#" + c.id("pd"), a = p.popAt == null || p.popAt === "" ? 0.2 : +p.popAt;
    tl.fromTo(el, { opacity: 0, scale: 0.3, y: 120, rotation: -14 }, { opacity: 1, scale: 1, y: 0, rotation: -4, duration: 0.5, ease: "back.out(2.1)" }, c.at(a - 0.04));
    tl.fromTo(el, { y: 0 }, { y: -12, duration: Math.max(0.3, c.end - c.at(a) - 0.9), ease: "sine.inOut", immediateRender: false }, c.at(a + 0.6));
    c.exit(tl, el, { scale: 0.9 });
  },
});
