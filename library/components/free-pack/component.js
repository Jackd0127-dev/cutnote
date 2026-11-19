/* Free pack (Day 20): a white card with a title, three little skill-file tiles popping in and a lime FREE badge stamped on. */
VideoLibrary.register({
  id: "free-pack",
  name: "Free pack",
  category: "Cards",
  collection: "Clean cards",
  order: 4,
  source: "Day 20",
  description: "A white card with a bold title, three file tiles that pop in one after another, a lime FREE badge that stamps on, and a label underneath.",
  tags: ["free", "pack", "download", "files", "lead magnet", "giveaway"],
  duration: 3.6,
  params: [
    { key: "title", label: "Title", type: "text", default: "Claude" },
    { key: "label", label: "Label", type: "text", default: "skills pack" },
    { key: "badge", label: "Badge", type: "text", default: "FREE" },
    { key: "fileTag", label: "Tag on each file", type: "text", default: "SKILL" },
    { key: "files", label: "File names (one per tile)", type: "lines", default: ["hooks", "scripts", "outreach"] },
    { key: "inAt", label: "Card lands (s)", type: "time", default: 0.1 },
    { key: "freeAt", label: "Badge stamps on (s)", type: "time", default: 1.4 },
    { key: "x", label: "Left edge (px)", type: "number", default: 260, min: 0, max: 1000 },
    { key: "y", label: "Top edge (px)", type: "number", default: 1280, min: 0, max: 1700 },
  ],
  sfx: [{ file: "drop_002", at: "inAt" }, { file: "pluck_001", at: "freeAt" }],
  css: `
.vl-free-pack .pk{position:absolute;width:560px;padding:36px 40px 32px;border-radius:36px;background:rgba(255,255,255,.97);color:#17120e;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);display:flex;flex-direction:column;align-items:flex-start;opacity:0}
.vl-free-pack .wm{font-family:"ArchivoXB";font-size:64px;letter-spacing:-.04em;line-height:1}
.vl-free-pack .fs{display:flex;gap:16px;margin-top:26px}
.vl-free-pack .fl{position:relative;width:146px;height:150px;border-radius:18px 34px 18px 18px;background:#f3f0eb;padding:18px 16px 14px;display:flex;flex-direction:column;gap:9px;opacity:0;box-shadow:inset 0 0 0 2px rgba(23,18,14,.06)}
.vl-free-pack .fl:before{content:"";position:absolute;right:0;top:0;width:34px;height:34px;border-radius:0 34px 0 12px;background:linear-gradient(225deg,transparent 50%,#e2ddd3 50%)}
.vl-free-pack .fl i{display:block;width:70%;height:8px;border-radius:5px;background:rgba(23,18,14,.14)}
.vl-free-pack .fl b{display:block;margin:auto 0 0;font-family:"ArchivoXB";font-weight:normal;font-size:26px;letter-spacing:-.02em;line-height:1;white-space:nowrap}
.vl-free-pack .fl span{font-family:"Typewriter";font-size:16px;letter-spacing:.16em;color:rgba(23,18,14,.5)}
.vl-free-pack .fr{position:absolute;right:30px;top:28px;padding:10px 24px 12px;border-radius:40px;background:#c8ff3a;font-family:"ArchivoXB";font-size:40px;letter-spacing:-.02em;opacity:0;box-shadow:0 10px 22px rgba(90,120,0,.28)}
.vl-free-pack .lb{font-family:"ArchivoXB";font-size:42px;letter-spacing:-.03em;margin-top:22px}`,
  html(p, c) {
    const names = p.files || [];
    const files = [0, 1, 2].map(k => `<div class="fl" id="${c.id("f" + k)}"><i></i><i style="width:46%"></i><b>${c.esc(names[k] || "")}</b><span>${c.esc(p.fileTag)}</span></div>`).join("");
    return `<div class="pk" id="${c.id("c")}" style="left:${p.x}px;top:${p.y}px"><div class="wm">${c.esc(p.title)}</div><div class="fs">${files}</div>`
      + `<span class="fr" id="${c.id("fr")}">${c.esc(p.badge)}</span><div class="lb">${c.esc(p.label)}</div></div>`;
  },
  animate(tl, p, c) {
    const a = p.inAt == null || p.inAt === "" ? 0.1 : +p.inAt, id = "#" + c.id("c");
    tl.fromTo(id, { opacity: 0, y: 60, scale: 0.82, rotation: -1 + 7 }, { opacity: 1, y: 0, scale: 1, rotation: -1, duration: 0.5, ease: "back.out(1.6)" }, c.at(a));
    [0, 1, 2].forEach(k => tl.fromTo("#" + c.id("f" + k), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: "back.out(1.8)" }, c.at(a + 0.25 + 0.08 * k)));
    if (!(p.freeAt == null || p.freeAt === ""))
      tl.fromTo("#" + c.id("fr"), { opacity: 0, scale: 2, rotation: -18 }, { opacity: 1, scale: 1, rotation: -8, duration: 0.3, ease: "back.out(1.6)" }, c.at(+p.freeAt - 0.05));
    c.exit(tl, id);
  },
});
