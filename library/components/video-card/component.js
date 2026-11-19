/* Video card (Day 20): a rounded video or image card with a lime tag ("DAY 17") flies in with a slight 3D turn, then nudges
 * aside to make room for another overlay (e.g. product-pop). */
VideoLibrary.register({
  id: "video-card",
  name: "Video card",
  category: "Media",
  collection: "Photos & media",
  order: 7,
  source: "Day 20",
  description: "A rounded 9:16 video or image card with a lime tag flies in with a slight 3D turn and, on a beat, nudges aside to make room.",
  tags: ["video", "clip", "card", "reference", "previous episode", "tag"],
  duration: 4,
  params: [
    { key: "src", label: "Image or .mp4", type: "image", default: "preview/clip-desk.jpg" },
    { key: "tag", label: "Lime tag", type: "text", default: "DAY 17" },
    { key: "box", label: "Card [x0, y0, x1, y1]", type: "box", default: [520, 1126, 808, 1638] },
    { key: "inAt", label: "Flies in (s)", type: "time", default: 0.1 },
    { key: "shiftAt", label: "Nudges aside (s, blank = never)", type: "time", default: 2 },
    { key: "shiftX", label: "Nudge distance (px)", type: "number", default: 150 },
  ],
  sfx: [{ file: "drop_002", at: "inAt" }],
  css: `
.vl-video-card .vd{position:absolute;border-radius:30px;overflow:hidden;opacity:0;background:#17120e;box-shadow:0 30px 70px rgba(0,0,0,.55),0 0 0 3px rgba(255,255,255,.9)}
.vl-video-card .vd img,.vl-video-card .vd video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.vl-video-card .vd .pl{position:absolute;left:14px;top:14px;z-index:2;padding:6px 14px;border-radius:20px;background:#c8ff3a;color:#0f0c0a;font-family:"ArchivoXB";font-size:24px;letter-spacing:-.01em}`,
  html(p, c) {
    const [x0, y0, x1, y1] = p.box;
    const u = /^(https?:|\/|data:)/.test(p.src) ? p.src : c.base + p.src;
    const media = /\.(mp4|mov|webm)(\?|#|$)/i.test(p.src) ? `<video src="${c.esc(u)}#t=0.1" muted playsinline preload="auto"></video>` : `<img src="${c.esc(u)}" alt="">`;
    return `<div class="vd" id="${c.id("v")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px">${p.tag ? `<span class="pl">${c.esc(p.tag)}</span>` : ""}${media}</div>`;
  },
  animate(tl, p, c) {
    const v = "#" + c.id("v"), a = p.inAt == null || p.inAt === "" ? 0.1 : +p.inAt;
    tl.fromTo(v, { opacity: 0, y: 80, rotationY: -24, scale: 0.86, transformPerspective: 900 }, { opacity: 1, y: 0, rotationY: 0, scale: 1, transformPerspective: 900, duration: 0.55, ease: "expo.out" }, c.at(a));
    if (p.shiftAt != null && p.shiftAt !== "")
      tl.fromTo(v, { x: 0, rotation: 0 }, { x: +p.shiftX, rotation: 3, scale: 0.94, duration: 0.45, ease: "power3.inOut", immediateRender: false }, c.at(+p.shiftAt - 0.08));
    c.exit(tl, v);
  },
});
