/* Reference fan (Day 19): three photo cards fanned with slight rotations, each landing on its own word. */
(function () {
  const U = (c, s) => (/^(https?:|\/|data:)/.test(s) ? s : c.base + s);
  VideoLibrary.register({
    id: "reference-fan",
    name: "Reference fan",
    category: "Media",
    collection: "Photos & media",
    order: 3,
    source: "Day 19",
    description: "Three white photo cards fanned out with slight tilts, each popping in from below on its own time. Good for \"my reference images\".",
    tags: ["photos", "references", "images", "fan", "cards"],
    duration: 3.4,
    params: [
      { key: "image1", label: "Image 1", type: "image", default: "preview/scene-mountains.jpg" },
      { key: "image2", label: "Image 2", type: "image", default: "preview/scene-neon-street.jpg" },
      { key: "image3", label: "Image 3", type: "image", default: "preview/scene-beach.jpg" },
      { key: "at", label: "When each card lands (s)", type: "times", default: [0.2, 0.8, 1.4] },
      { key: "cw", label: "Card photo width (px)", type: "number", default: 270, min: 120, max: 420 },
      { key: "ch", label: "Card photo height (px)", type: "number", default: 340, min: 120, max: 520 },
      { key: "step", label: "Spacing between cards (px)", type: "number", default: 270, min: 100, max: 460 },
      { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [60, 1220, 1020, 1700] },
    ],
    sfx: [{ file: "drop_002", at: "at[0]" }, { file: "drop_002", at: "at[1..]" }],
    css: `
.vl-reference-fan .fan{position:absolute}
.vl-reference-fan .fc{position:absolute;padding:11px;border-radius:24px;background:#fff;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0}
.vl-reference-fan .fc img{display:block;border-radius:15px;object-fit:cover}`,
    html(p, c) {
      const [x0, y0, x1, y1] = p.box, n = 3, rots = [-6, 0, 6];
      const W = p.cw + 20 + p.step * (n - 1), H = p.ch + 20;
      const left = x0 + (x1 - x0 - W) / 2, top = y0 + (y1 - y0 - H) / 2;
      const cards = [p.image1, p.image2, p.image3].map((src, k) =>
        `<div class="fc" id="${c.id("c" + k)}" style="left:${k * p.step}px;top:${k === 1 ? 0 : 14}px;transform:rotate(${rots[k]}deg)"><img src="${c.esc(U(c, src))}" style="width:${p.cw}px;height:${p.ch}px"/></div>`).join("");
      return `<div class="fan" id="${c.id("w")}" style="left:${left.toFixed(0)}px;top:${top.toFixed(0)}px;width:${W}px;height:${H}px">${cards}</div>`;
    },
    animate(tl, p, c) {
      for (let k = 0; k < 3; k++) {
        const at = p.at[k] != null ? p.at[k] : p.at[p.at.length - 1] + 0.6 * (k - p.at.length + 1);
        tl.fromTo("#" + c.id("c" + k), { opacity: 0, y: 90, scale: 0.7 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.7)" }, c.at(at - 0.05));
      }
      c.exit(tl, "#" + c.id("w"));
    },
  });
})();
