/* Before / after wipe (Day 19, compare19): the "before" fills one card, then a white divider sweeps in from the right on the
 * reveal beat and settles at the middle, uncovering the "after" on the right half. Images (or .mp4 URLs, muted, no autoplay). */
(function () {
  const U = (c, s) => (/^(https?:|\/|data:)/.test(s) ? s : c.base + s);
  const media = (c, src, id, extra) => /\.mp4(\?|#|$)/i.test(src)
    ? `<video id="${id}" src="${c.esc(U(c, src))}" muted playsinline preload="auto" style="${extra}"></video>`
    : `<img id="${id}" src="${c.esc(U(c, src))}" style="${extra}"/>`;
  VideoLibrary.register({
    id: "before-after-wipe",
    name: "Before / after wipe",
    category: "Media",
    collection: "Photos & media",
    order: 1,
    source: "Day 19",
    description: "One card showing the before; a white divider sweeps in from the right and settles in the middle to reveal the after. A label on each side.",
    tags: ["before", "after", "compare", "wipe", "480p", "quality"],
    duration: 4,
    params: [
      { key: "before", label: "Before (image or .mp4)", type: "image", default: "preview/cafe-480p.jpg" },
      { key: "after", label: "After (image or .mp4)", type: "image", default: "preview/cafe-1080p.jpg" },
      { key: "beforeLabel", label: "Before label", type: "text", default: "480p draft" },
      { key: "afterLabel", label: "After label", type: "text", default: "1080p" },
      { key: "inAt", label: "Card lands (s)", type: "time", default: 0.1 },
      { key: "revealAt", label: "Divider sweeps (s)", type: "time", default: 1.6 },
      { key: "box", label: "Card [x0, y0, x1, y1]", type: "box", default: [90, 1180, 990, 1680] },
    ],
    sfx: [{ file: "arrow-whoosh", at: "inAt" }, { file: "fast-whoosh", at: "revealAt" }],
    css: `
.vl-before-after-wipe .cmp{position:absolute;overflow:hidden;border-radius:30px;background:#111;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0}
.vl-before-after-wipe .cmp img,.vl-before-after-wipe .cmp video{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover}
.vl-before-after-wipe .dv{position:absolute;top:0;bottom:0;left:0;width:6px;margin-left:-3px;background:#fff;box-shadow:0 0 18px rgba(0,0,0,.45);z-index:3}
.vl-before-after-wipe .dv b{position:absolute;left:50%;top:50%;width:60px;height:60px;margin:-30px 0 0 -30px;font-size:0;border-radius:50%;background:#fff;box-shadow:0 8px 22px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;gap:6px}
.vl-before-after-wipe .dv b:before,.vl-before-after-wipe .dv b:after{content:"";width:0;height:0;border:8px solid transparent}
.vl-before-after-wipe .dv b:before{border-right:10px solid #17120e;border-left:0}.vl-before-after-wipe .dv b:after{border-left:10px solid #17120e;border-right:0}
.vl-before-after-wipe .lb{position:absolute;top:24px;z-index:4;padding:9px 18px 10px;border-radius:18px;background:rgba(255,255,255,.96);font-family:"ArchivoXB";font-size:30px;letter-spacing:-.01em;color:#17120e;opacity:0;box-shadow:0 8px 20px rgba(0,0,0,.28)}
.vl-before-after-wipe .lb.l{left:24px}.vl-before-after-wipe .lb.r{right:24px;background:#c8ff3a}`,
    html(p, c) {
      const [x0, y0, x1, y1] = p.box;
      return `<div class="cmp" id="${c.id("card")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px">`
        + media(c, p.before, c.id("lo"), "")
        + `<div id="${c.id("hi")}" style="position:absolute;inset:0;clip-path:inset(0% 0% 0% 100%)">${media(c, p.after, c.id("hiM"), "")}</div>`
        + `<i class="dv" id="${c.id("dv")}" style="opacity:0"><b></b></i><span class="lb l" id="${c.id("l")}">${c.esc(p.beforeLabel)}</span><span class="lb r" id="${c.id("r")}">${c.esc(p.afterLabel)}</span></div>`;
    },
    animate(tl, p, c) {
      const N = v => v == null || v === "";
      const cw = p.box[2] - p.box[0], a = N(p.inAt) ? 0 : +p.inAt, rv = N(p.revealAt) ? null : +p.revealAt, card = "#" + c.id("card");
      tl.fromTo(card, { opacity: 0, y: 90, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "expo.out" }, c.at(a));
      tl.fromTo("#" + c.id("l"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, c.at(a + 0.35));
      if (rv != null) {
      tl.fromTo("#" + c.id("hi"), { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 50%)", duration: 0.75, ease: "power3.inOut" }, c.at(rv));
      tl.fromTo("#" + c.id("dv"), { x: cw, opacity: 0 }, { x: cw / 2, opacity: 1, duration: 0.75, ease: "power3.inOut" }, c.at(rv));
      tl.fromTo("#" + c.id("r"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, c.at(rv + 0.5));
      }
      c.exit(tl, card);
    },
  });
})();
