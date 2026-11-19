/* Voice waveform (Day 19): a "your hum" card with ~26 bars that swell outward from the centre on the hum, then settle. */
VideoLibrary.register({
  id: "voice-waveform",
  name: "Voice waveform",
  category: "Data & numbers",
  collection: "Data & numbers",
  order: 5,
  source: "Day 19",
  description: "A white card with a small label and 26 ink bars. On the swell beat the bars grow outward from the middle, then settle back.",
  tags: ["voice", "audio", "waveform", "hum", "sound"],
  duration: 3.4,
  params: [
    { key: "label", label: "Label", type: "text", default: "your hum" },
    { key: "inAt", label: "Card lands (s)", type: "time", default: 0.1 },
    { key: "swellAt", label: "Bars swell (s)", type: "time", default: 1.0 },
    { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [240, 1300, 840, 1530] },
  ],
  sfx: [{ file: "pluck_001", at: "swellAt" }],
  css: `
.vl-voice-waveform .wv{position:absolute;padding:24px 30px 28px;border-radius:30px;background:rgba(255,255,255,.97);box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0}
.vl-voice-waveform .lb{font-family:"Typewriter";font-size:24px;letter-spacing:.16em;text-transform:uppercase;color:#17120e;opacity:.55;margin-bottom:14px}
.vl-voice-waveform .bs{display:flex;align-items:center;justify-content:space-between;height:130px}
.vl-voice-waveform .bs i{display:block;width:12px;border-radius:6px;background:#17120e;transform-origin:50% 50%;transform:scaleY(.25)}`,
  html(p, c) {
    const [x0, y0, x1] = p.box;
    const bars = Array.from({ length: 26 }, (_, k) => `<i style="height:${(18 + 70 * Math.abs(Math.sin(k * 0.62)) * (0.4 + 0.6 * Math.abs(Math.sin(k * 0.21)))).toFixed(0)}px"></i>`).join("");
    return `<div class="wv" id="${c.id("card")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px"><div class="lb">${c.esc(p.label)}</div><div class="bs" id="${c.id("bs")}">${bars}</div></div>`;
  },
  animate(tl, p, c) {
    const a = p.inAt || 0, id = "#" + c.id("card"), bars = c.$(".bs i");
    tl.fromTo(id, { opacity: 0, y: 50, scale: 0.82 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, c.at(a));
    tl.set(bars, { scaleY: 0.25 }, c.at(0));
    if (p.swellAt != null && p.swellAt !== "") {
      tl.fromTo(bars, { scaleY: 0.25 }, { scaleY: 1.35, duration: 0.35, ease: "power2.out", stagger: { each: 0.02, from: "center" }, immediateRender: false }, c.at(p.swellAt - 0.05));
      tl.fromTo(bars, { scaleY: 1.35 }, { scaleY: 1, duration: 0.5, ease: "power2.inOut", stagger: { each: 0.015, from: "edges" }, immediateRender: false }, c.at(p.swellAt + 0.6));
    }
    c.exit(tl, id);
  },
});
