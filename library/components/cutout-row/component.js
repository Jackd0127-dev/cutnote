/* Cutout row (Day 19): a row of labelled cut-out photo cards, each popping in on its own word. */
(function () {
  const U = (c, s) => (/^(https?:|\/|data:)/.test(s) ? s : c.base + s);
  VideoLibrary.register({
    id: "cutout-row",
    name: "Cut-out row",
    category: "Media",
    collection: "Photos & media",
    order: 5,
    source: "Day 19",
    description: "A row of white photo cards, each with a label under it, popping in one per time with a springy scale. For \"the three assets you get\".",
    tags: ["photos", "row", "labels", "assets", "cards"],
    duration: 3.6,
    params: [
      { key: "image1", label: "Image 1", type: "image", default: "preview/scene-podium.jpg" },
      { key: "image2", label: "Image 2", type: "image", default: "preview/scene-beach.jpg" },
      { key: "image3", label: "Image 3", type: "image", default: "preview/scene-phone-app.jpg" },
      { key: "labels", label: "Labels (one per card)", type: "lines", default: ["product shot", "lifestyle", "app screen"] },
      { key: "at", label: "When each card lands (s)", type: "times", default: [0.2, 0.9, 1.6] },
      { key: "cw", label: "Photo width (px)", type: "number", default: 260, min: 120, max: 400 },
      { key: "ch", label: "Photo height (px)", type: "number", default: 300, min: 120, max: 520 },
      { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [40, 1260, 1040, 1700] },
    ],
    sfx: [{ file: "drop_002", at: "at[0]" }, { file: "drop_002", at: "at[1..]" }],
    css: `
.vl-cutout-row .row{position:absolute;display:flex;gap:24px;align-items:flex-end;justify-content:center}
.vl-cutout-row .pc{padding:12px 12px 16px;border-radius:26px;background:#fff;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0;display:flex;flex-direction:column;align-items:center;gap:10px}
.vl-cutout-row .pc img{display:block;border-radius:16px;object-fit:cover;object-position:50% 0}
.vl-cutout-row .pc span{font-family:"ArchivoXB";font-size:28px;letter-spacing:-.02em;color:#17120e;white-space:nowrap}`,
    html(p, c) {
      const [x0, y0, x1, y1] = p.box;
      const cards = [p.image1, p.image2, p.image3].map((src, k) =>
        `<div class="pc" id="${c.id("c" + k)}"><img src="${c.esc(U(c, src))}" style="width:${p.cw}px;height:${p.ch}px"/><span>${c.esc(p.labels[k] || "")}</span></div>`).join("");
      return `<div class="row" id="${c.id("w")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px">${cards}</div>`;
    },
    animate(tl, p, c) {
      for (let k = 0; k < 3; k++) {
        const at = p.at[k] != null ? p.at[k] : p.at[p.at.length - 1] + 0.7 * (k - p.at.length + 1);
        tl.fromTo("#" + c.id("c" + k), { opacity: 0, y: 70, scale: 0.6 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "back.out(2)" }, c.at(at - 0.05));
      }
      c.exit(tl, "#" + c.id("w"));
    },
  });
})();
