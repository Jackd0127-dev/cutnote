/* Before / after pair (Day 19): two labelled photo cards; the second lands with a lime ring and the first dims. */
(function () {
  const U = (c, s) => (/^(https?:|\/|data:)/.test(s) ? s : c.base + s);
  VideoLibrary.register({
    id: "before-after-pair",
    name: "Before / after pair",
    category: "Media",
    collection: "Photos & media",
    order: 2,
    source: "Day 19",
    description: "Two labelled photo cards side by side. The first lands, then the second drops in with a lime ring while the first dims back.",
    tags: ["before", "after", "compare", "photos", "pair"],
    duration: 3.4,
    params: [
      { key: "before", label: "Before image", type: "image", default: "preview/website-before.jpg" },
      { key: "after", label: "After image", type: "image", default: "preview/website-after.jpg" },
      { key: "beforeLabel", label: "Before label", type: "text", default: "their site" },
      { key: "afterLabel", label: "After label", type: "text", default: "my redesign" },
      { key: "beforeAt", label: "Before lands (s)", type: "time", default: 0.2 },
      { key: "afterAt", label: "After lands (s)", type: "time", default: 1.3 },
      { key: "cw", label: "Photo width (px)", type: "number", default: 380, min: 160, max: 460 },
      { key: "ch", label: "Photo height (px)", type: "number", default: 430, min: 160, max: 560 },
      { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [110, 1220, 970, 1730] },
    ],
    sfx: [{ file: "drop_002", at: "beforeAt" }, { file: "pluck_001", at: "afterAt" }],
    css: `
.vl-before-after-pair .pr{position:absolute;display:flex;gap:24px;align-items:flex-end;justify-content:center}
.vl-before-after-pair .pc{padding:12px 12px 16px;border-radius:26px;background:#fff;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0;display:flex;flex-direction:column;align-items:center;gap:10px}
.vl-before-after-pair .pc img{display:block;border-radius:16px;object-fit:cover;object-position:50% 0}
.vl-before-after-pair .pc span{padding:6px 16px 7px;border-radius:16px;background:#f1eee8;font-family:"Typewriter";font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:rgba(23,18,14,.7);white-space:nowrap}
.vl-before-after-pair .pc.af span{background:#c8ff3a;color:#17120e}
.vl-before-after-pair .pc.af{box-shadow:0 0 0 5px #c8ff3a,0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05)}`,
    html(p, c) {
      const [x0, y0, x1, y1] = p.box;
      const card = (k, cls, rot, src, lab) => `<div class="pc${cls}" id="${c.id(k)}" style="transform:rotate(${rot}deg)"><img src="${c.esc(U(c, src))}" style="width:${p.cw}px;height:${p.ch}px"/><span>${c.esc(lab)}</span></div>`;
      return `<div class="pr" id="${c.id("w")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px">`
        + card("a", "", -3, p.before, p.beforeLabel) + card("b", " af", 2, p.after, p.afterLabel) + `</div>`;
    },
    animate(tl, p, c) {
      const a = p.beforeAt || 0, b = p.afterAt == null ? 1.3 : p.afterAt;
      tl.fromTo("#" + c.id("a"), { opacity: 0, y: 80, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, c.at(a - 0.05));
      tl.fromTo("#" + c.id("b"), { opacity: 0, y: 80, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, c.at(b - 0.05));
      tl.to("#" + c.id("a"), { opacity: 0.55, duration: 0.3, ease: "power2.out" }, c.at(b + 0.1));
      c.exit(tl, "#" + c.id("w"));
    },
  });
})();
