/* Logo pop (Day 17): a wordmark on a white rounded tile pops in with a slight overshoot. */
(function () {
  const U = (c, s) => (/^(https?:|\/|data:)/.test(s) ? s : c.base + s);
  VideoLibrary.register({
    id: "logo-pop",
    name: "Logo pop",
    category: "Cards",
    collection: "Clean cards",
    order: 5,
    source: "Day 17",
    description: "A wordmark on a white rounded tile that pops in with a slight overshoot and tilt, holds, then lifts away.",
    tags: ["logo", "wordmark", "brand", "tile", "pop"],
    duration: 2.6,
    params: [
      { key: "image", label: "Wordmark image", type: "image", default: "preview/wordmark-lumora.png" },
      { key: "w", label: "Wordmark width (px)", type: "number", default: 400, min: 80, max: 800 },
      { key: "h", label: "Wordmark height (px)", type: "number", default: 112, min: 40, max: 400 },
      { key: "inAt", label: "Pops in (s)", type: "time", default: 0.1 },
      { key: "x", label: "Left edge (px)", type: "number", default: 236, min: 0, max: 1000 },
      { key: "y", label: "Top edge (px)", type: "number", default: 1320, min: 0, max: 1800 },
    ],
    sfx: [{ file: "pluck_001", at: "inAt" }],
    css: `
.vl-logo-pop .lg{position:absolute;padding:36px 52px;border-radius:34px;background:#fff;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0;display:flex}
.vl-logo-pop .lg img{display:block;object-fit:contain}`,
    html(p, c) {
      return `<div class="lg" id="${c.id("t")}" style="left:${p.x}px;top:${p.y}px"><img src="${c.esc(U(c, p.image))}" style="width:${p.w}px;height:${p.h}px"/></div>`;
    },
    animate(tl, p, c) {
      const a = p.inAt == null || p.inAt === "" ? 0.1 : +p.inAt, id = "#" + c.id("t");
      tl.fromTo(id, { opacity: 0, y: 50, scale: 0.7, rotation: 5 }, { opacity: 1, y: 0, scale: 1, rotation: -2, duration: 0.5, ease: "back.out(2.4)" }, c.at(a));
      c.exit(tl, id);
    },
  });
})();
