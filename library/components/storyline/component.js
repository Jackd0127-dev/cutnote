/* Storyline (Day 20): the frame dims and a glowing path draws itself through every step from idea to launch; one node can
 * light up lime as it's said. */
VideoLibrary.register({
  id: "storyline",
  name: "Storyline",
  category: "Series",
  collection: "Cinematic",
  order: 4,
  preview: { background: "photo" },
  source: "Day 20",
  description: "The frame dims and a glowing path draws through round icon nodes (idea, test, prototype, launch); one node turns lime on his word, with a small tagline.",
  tags: ["steps", "process", "path", "timeline", "idea", "launch"],
  duration: 4.8,
  params: [
    { key: "steps", label: "Steps (one per line)", type: "lines", default: ["idea", "test", "prototype", "launch"] },
    { key: "hot", label: "Lime step (number, 1 = first, blank = none)", type: "number", default: 2, min: 0, max: 8 },
    { key: "hotAt", label: "Lime step lights up (s, blank = never)", type: "time", default: 1.7 },
    { key: "pulseAt", label: "First step pulses (s, blank = never)", type: "time", default: null },
    { key: "tagline", label: "Tagline", type: "text", default: "from idea to launch" },
  ],
  sfx: [{ file: "drop_002", at: "0.2" }, { file: "pluck_001", at: "hotAt" }],
  css: `
.vl-storyline .dm{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 35%,rgba(6,5,4,.18) 0%,rgba(6,5,4,.62) 70%),linear-gradient(180deg,rgba(6,5,4,0) 40%,rgba(6,5,4,.55) 100%);opacity:0}
.vl-storyline svg.pt{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:visible}
.vl-storyline path.bg{fill:none;stroke:rgba(255,255,255,.14);stroke-width:6;stroke-dasharray:2 16;stroke-linecap:round}
.vl-storyline path.ln{fill:none;stroke:#fff;stroke-width:7;stroke-linecap:round;filter:drop-shadow(0 0 10px rgba(255,255,255,.55))}
.vl-storyline .sn{position:absolute;width:140px;display:flex;flex-direction:column;align-items:center;gap:14px;opacity:0}
.vl-storyline .sn .c{position:relative;flex:none;width:104px;height:104px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#2a2420 0%,#0f0c0a 75%);border:3px solid rgba(255,255,255,.95);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 8px rgba(255,255,255,.08),0 14px 34px rgba(0,0,0,.55)}
.vl-storyline .sn .c svg{display:block;width:48px;height:48px;flex:none;fill:none;stroke:currentColor;stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
.vl-storyline .sn span{position:relative;z-index:2;padding:8px 16px 10px;border-radius:22px;background:rgba(12,10,8,.82);font-family:"ArchivoXB";font-size:36px;line-height:1;letter-spacing:-.02em;color:#fff;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.35)}
.vl-storyline .sn.hot .c{background:#c8ff3a;border-color:#c8ff3a;color:#0f0c0a;box-shadow:0 0 0 8px rgba(200,255,58,.18),0 0 40px rgba(200,255,58,.55)}
.vl-storyline .sn.hot span{color:#c8ff3a}
.vl-storyline .tg{position:absolute;left:60px;top:1740px;font-family:"Typewriter";font-size:28px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.8);opacity:0}`,
  _icons: [
    '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16.2 14.2c3 .3 5.3 2.4 5.3 5.8"/>',
    '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    '<path d="M12 2.5c3.4 2.3 5.2 6 5 10.6l2.4 3.4-3.3 1.4-1.6-2.2H9.5l-1.6 2.2-3.3-1.4L7 13.1C6.8 8.5 8.6 4.8 12 2.5z"/><circle cx="12" cy="9.5" r="1.8"/><path d="M10 19.5l2 2.2 2-2.2"/>',
  ],
  _nodes(p) {
    const n = p.steps.length, T = [[170, 1520], [400, 1250], [690, 1500], [900, 1190]];
    return p.steps.map((nm, k) => {
      const [x, y] = n === 4 ? T[k] : [n === 1 ? 540 : 170 + 730 * k / (n - 1), (k % 2 ? 1260 : 1510) - (n === 1 ? 0 : 70 * k / (n - 1))];
      return { nm, x, y, icon: this._icons[k % this._icons.length] };
    });
  },
  html(p, c) {
    const ns = this._nodes(p);
    if (!ns.length) return "";
    let d = `M60 1700 C 120 1640, 130 1560, ${ns[0].x} ${ns[0].y}`;
    for (let k = 1; k < ns.length; k++) d += ` S ${ns[k].x - 80} ${ns[k].y + (k % 2 ? 60 : -20)}, ${ns[k].x} ${ns[k].y}`;
    const L = ns[ns.length - 1];
    d += ` S ${L.x + 100} ${L.y - 170}, 1040 960`;
    const hot = (+p.hot || 0) - 1;
    const dots = ns.map((q, k) => `<div class="sn${k === hot ? " hot" : ""}" id="${c.id("n" + k)}" style="left:${q.x - 70}px;top:${q.y - 52}px"><div class="c"><svg viewBox="0 0 24 24">${q.icon}</svg></div><span>${c.esc(q.nm)}</span></div>`).join("");
    return `<div class="dm" id="${c.id("dm")}"></div><svg class="pt" viewBox="0 0 1080 1920"><path class="bg" d="${d}"/><path id="${c.id("p")}" class="ln" d="${d}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>${dots}`
      + (p.tagline ? `<div class="tg" id="${c.id("tg")}">${c.esc(p.tagline)}</div>` : "");
  },
  animate(tl, p, c) {
    const ns = this._nodes(p);
    if (!ns.length) return;
    const hot = (+p.hot || 0) - 1, hotAt = p.hotAt == null || p.hotAt === "" ? null : +p.hotAt;
    const drawEnd = (hotAt != null && hot >= 0 ? hotAt : 1.6) + 1.1;
    tl.fromTo("#" + c.id("dm"), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, c.at(0));
    tl.fromTo("#" + c.id("p"), { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: drawEnd - 0.1, ease: "power1.inOut" }, c.at(0.1));
    if (p.tagline) tl.fromTo("#" + c.id("tg"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, c.at(0.15));
    ns.forEach((q, k) => {
      let at = 0.1 + (drawEnd - 0.1) * (ns.length === 1 ? 0.5 : 0.24 + 0.68 * k / (ns.length - 1));
      if (k === hot && hotAt != null) at = Math.min(at, hotAt - 0.05);
      tl.fromTo("#" + c.id("n" + k), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.2)" }, c.at(at - 0.1));
      if (k !== hot) tl.fromTo("#" + c.id("n" + k) + " .c", { scale: 1 }, { scale: 1.08, yoyo: true, repeat: 1, duration: 0.16, ease: "power2.out", immediateRender: false }, c.at(at + 0.25));
    });
    if (hot >= 0 && hot < ns.length && hotAt != null)
      tl.fromTo("#" + c.id("n" + hot) + " .c", { scale: 1, boxShadow: "0 0 0 8px rgba(200,255,58,.18), 0 0 0px rgba(200,255,58,0)" }, { scale: 1.28, boxShadow: "0 0 0 16px rgba(200,255,58,.18), 0 0 60px rgba(200,255,58,.75)", duration: 0.35, ease: "back.out(2.4)", immediateRender: false }, c.at(hotAt));
    if (!(p.pulseAt == null || p.pulseAt === ""))
      tl.fromTo("#" + c.id("n0") + " .c", { scale: 1 }, { scale: 1.15, yoyo: true, repeat: 1, duration: 0.18, ease: "power2.out", immediateRender: false }, c.at(+p.pulseAt));
    c.exit(tl, c.$(), { y: 0 });
  },
});
