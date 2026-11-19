/* Photo scatter (Day 19): photos popping in around his face at given spots, one per word, each with a small pop. */
(function () {
  const U = (c, s) => (/^(https?:|\/|data:)/.test(s) ? s : c.base + s);
  VideoLibrary.register({
    id: "photo-scatter",
    name: "Photo scatter",
    category: "Media",
    collection: "Photos & media",
    order: 4,
    source: "Day 19",
    description: "White photo cards popping in at different spots around his face, one per time, each with a springy scale. They shrink away one after another at the end.",
    tags: ["photos", "scatter", "references", "angles", "pop"],
    duration: 3.2,
    params: [
      { key: "image1", label: "Image 1", type: "image", default: "preview/scene-shapes.jpg" },
      { key: "image2", label: "Image 2", type: "image", default: "preview/scene-neon-street.jpg" },
      { key: "image3", label: "Image 3", type: "image", default: "preview/scene-mountains.jpg" },
      { key: "at", label: "When each photo pops (s)", type: "times", default: [0.2, 0.8, 1.4] },
      { key: "spots", label: "Spots [[x, y, rotation], ...] (top-left, canvas px)", type: "json", default: [[40, 560, -8], [812, 860, 7], [60, 1240, -4]] },
      { key: "cw", label: "Photo width (px)", type: "number", default: 230, min: 100, max: 420 },
      { key: "ch", label: "Photo height (px)", type: "number", default: 288, min: 100, max: 520 },
    ],
    sfx: [{ file: "dry-pop-alert", at: "at[0]" }, { file: "dry-pop-alert", at: "at[1..]" }],
    css: `
.vl-photo-scatter .fc{position:absolute;padding:11px;border-radius:24px;background:#fff;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0}
.vl-photo-scatter .fc img{display:block;border-radius:15px;object-fit:cover}`,
    html(p, c) {
      const imgs = [p.image1, p.image2, p.image3];
      return imgs.map((src, k) => {
        const s = (p.spots && p.spots[k]) || [100 + 300 * k, 600, 0];
        return `<div class="fc" id="${c.id("c" + k)}" style="left:${s[0]}px;top:${s[1]}px;transform:rotate(${s[2] || 0}deg)"><img src="${c.esc(U(c, src))}" style="width:${p.cw}px;height:${p.ch}px"/></div>`;
      }).join("");
    },
    animate(tl, p, c) {
      for (let k = 0; k < 3; k++) {
        const at = p.at[k] != null ? p.at[k] : p.at[p.at.length - 1] + 0.6 * (k - p.at.length + 1);
        tl.fromTo("#" + c.id("c" + k), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.34, ease: "back.out(2.4)" }, c.at(at - 0.04));
        tl.to("#" + c.id("c" + k), { opacity: 0, scale: 0.85, duration: 0.2, ease: "power2.in" }, c.end - 0.26 + 0.04 * k);
      }
    },
  });
})();
