/* Fade to black (Day 19, "Listen up" transition): black fades in with a blur feel, holds, then fades back out.
 * The component can't blur footage it doesn't own, so it layers black over a backdrop-filter blur layer and animates both. */
VideoLibrary.register({
  id: "fade-to-black",
  name: "Fade to black",
  category: "Transitions",
  collection: "Cinematic",
  order: 5,
  preview: { background: "light", keepWash: true, frame: [0, 555, 1080, 1365] },
  source: "Day 19",
  description: "Full-canvas black fades in over a growing backdrop blur, holds for a beat, then fades out (the blur clears with it). Use between two takes.",
  tags: ["transition", "black", "fade", "blur", "cut"],
  duration: 2.2,
  z: 30,
  params: [
    { key: "fadeInAt", label: "Fade in starts (s)", type: "time", default: 0 },
    { key: "fadeInFor", label: "Fade in takes (s)", type: "number", default: 0.7, min: 0.1, max: 3 },
    { key: "holdFor", label: "Hold on black (s)", type: "number", default: 0.5, min: 0, max: 5 },
    { key: "fadeOutAt", label: "Fade out starts (s, blank = after the hold)", type: "time", default: null },
    { key: "fadeOutFor", label: "Fade out takes (s)", type: "number", default: 0.42, min: 0.1, max: 3 },
    { key: "blur", label: "Blur strength (px)", type: "number", default: 18, min: 0, max: 60 },
  ],
  sfx: [],
  css: `
.vl-fade-to-black .bl,.vl-fade-to-black .bk{position:absolute;left:-200px;top:-200px;width:1480px;height:2320px;opacity:0}
.vl-fade-to-black .bl{-webkit-backdrop-filter:blur(0px);backdrop-filter:blur(0px)}
.vl-fade-to-black .bk{background:#000}`,
  html(p, c) {
    return `<div class="bl" id="${c.id("bl")}"></div><div class="bk" id="${c.id("bk")}"></div>`;
  },
  animate(tl, p, c) {
    const s = p.fadeInAt || 0, fi = Math.max(0.1, +p.fadeInFor || 0.7), fo = Math.max(0.1, +p.fadeOutFor || 0.42), b = +p.blur || 0;
    let out = p.fadeOutAt != null && p.fadeOutAt !== "" ? +p.fadeOutAt : s + fi + (+p.holdFor || 0);
    const dur = +p.duration || 2.2;
    out = Math.max(s, Math.min(out, dur - 0.05 - fo));  // fully clear by c.end: the fade out ends at duration - 0.05
    const bl = "#" + c.id("bl"), bk = "#" + c.id("bk");
    tl.fromTo(bl, { opacity: 0, backdropFilter: "blur(0px)" }, { opacity: 1, backdropFilter: `blur(${b}px)`, duration: fi, ease: "power2.in" }, c.at(s));
    tl.fromTo(bk, { opacity: 0 }, { opacity: 1, duration: fi, ease: "power2.in" }, c.at(s));
    tl.fromTo(bk, { opacity: 1 }, { opacity: 0, duration: fo, ease: "power2.out", immediateRender: false }, c.at(out));
    tl.fromTo(bl, { opacity: 1, backdropFilter: `blur(${b}px)` }, { opacity: 0, backdropFilter: "blur(0px)", duration: fo, ease: "power2.out", immediateRender: false }, c.at(out));
  },
});
