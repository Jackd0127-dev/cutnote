/* Prompt quote (Day 19): a line from his own prompt on a clean card, small Typewriter label over a Typewriter quote. */
VideoLibrary.register({
  id: "prompt-quote",
  name: "Prompt quote",
  category: "Cards",
  collection: "Clean cards",
  order: 2,
  source: "Day 19",
  description: "A white card with a small Typewriter label and one quoted line in Typewriter. Floats in with a slight tilt and drifts until it lifts away.",
  tags: ["quote", "prompt", "typewriter", "card", "text"],
  duration: 3.6,
  params: [
    { key: "label", label: "Label", type: "text", default: "my prompt" },
    { key: "text", label: "Quoted line", type: "longtext", default: "“A calm, low voice, like someone telling you a secret.”" },
    { key: "inAt", label: "Card lands (s)", type: "time", default: 0.1 },
    { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [200, 1220, 880, 1620] },
  ],
  sfx: [{ file: "drop_002", at: "inAt" }],
  css: `
.vl-prompt-quote .qt{position:absolute;padding:30px 38px 34px;border-radius:30px;background:rgba(255,255,255,.97);box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0;color:#17120e}
.vl-prompt-quote .lb{display:flex;align-items:center;gap:12px;font-family:"Typewriter";font-size:24px;letter-spacing:.16em;text-transform:uppercase;color:rgba(23,18,14,.55);margin-bottom:16px}
.vl-prompt-quote .lb:before{content:"";flex:none;width:14px;height:14px;border-radius:50%;background:#c8ff3a;box-shadow:0 0 0 3px rgba(23,18,14,.9)}
.vl-prompt-quote .tx{font-family:"Typewriter";font-size:36px;line-height:52px;letter-spacing:-.01em}`,
  html(p, c) {
    const [x0, y0, x1] = p.box;
    return `<div class="qt" id="${c.id("card")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px"><div class="lb">${c.esc(p.label)}</div><div class="tx">${c.esc(p.text)}</div></div>`;
  },
  animate(tl, p, c) {
    const a = p.inAt || 0, id = "#" + c.id("card");
    tl.fromTo(id, { opacity: 0, y: 60, scale: 0.82, rotation: 6 }, { opacity: 1, y: 0, scale: 1, rotation: -1, duration: 0.5, ease: "back.out(1.6)" }, c.at(a));
    if (p.duration - a > 1.4) tl.fromTo(id, { y: 0 }, { y: -10, duration: p.duration - a - 0.8, ease: "sine.inOut", immediateRender: false }, c.at(a + 0.5));
    c.exit(tl, id);
  },
});
