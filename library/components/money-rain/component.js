/* Money rain (Day 20): coins and notes fall through the whole frame, then a big "£0 spent" slams in below his face. */
VideoLibrary.register({
  id: "money-rain",
  name: "Money rain",
  category: "Series",
  collection: "Cinematic",
  order: 3,
  preview: { background: "photo", params: { y: 790 } },
  source: "Day 20",
  description: "Coins and notes fall through the whole frame over a soft dark dim, then a huge \"£0\" with a lime \"spent\" slams in with a blur.",
  tags: ["money", "coins", "price", "spend", "cost", "free"],
  duration: 3.6,
  params: [
    { key: "big", label: "Big number", type: "text", default: "0" },
    { key: "small", label: "Small word", type: "text", default: "spent" },
    { key: "currency", label: "Currency symbol", type: "text", default: "£" },
    { key: "slamAt", label: "Big number slams in (s)", type: "time", default: 1.5 },
    { key: "count", label: "Coins and notes", type: "number", default: 26, min: 4, max: 60 },
    { key: "y", label: "Big number top (px)", type: "number", default: 1240 },
  ],
  sfx: [{ file: "arrow-whoosh", at: "0" }, { file: "hard-pop-click", at: "slamAt" }, { file: "boom", at: "slamAt" }],
  css: `
.vl-money-rain{overflow:hidden}
.vl-money-rain .dm{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,5,4,.25),rgba(6,5,4,.55));opacity:0}
.vl-money-rain i{position:absolute;top:0;display:flex;align-items:center;justify-content:center;opacity:0}
.vl-money-rain i.cn{border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0 0%,#f2c23a 40%,#b8860b 100%);box-shadow:inset 0 0 0 6px rgba(120,80,0,.35),0 10px 22px rgba(0,0,0,.45)}
.vl-money-rain i.nt{border-radius:10px;background:linear-gradient(135deg,#d9f2c4,#8fc87a);box-shadow:inset 0 0 0 5px rgba(40,90,30,.3),0 10px 22px rgba(0,0,0,.45)}
.vl-money-rain i b{display:block;margin:0;font-family:"ArchivoXB";font-weight:normal;font-size:48px;line-height:1;color:rgba(90,60,0,.75)}
.vl-money-rain i.nt b{color:rgba(30,70,20,.7)}
.vl-money-rain .zt{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;opacity:0}
.vl-money-rain .zt .n{font-family:"ArchivoXB";font-size:260px;line-height:.9;letter-spacing:-.06em;color:#fff;text-shadow:0 10px 50px rgba(0,0,0,.6)}
.vl-money-rain .zt .s{font-family:"ArchivoXB";font-size:72px;letter-spacing:-.03em;color:#c8ff3a;text-shadow:0 0 24px rgba(200,255,58,.5);margin-top:6px}`,
  _items(p, c) {
    const rnd = c.rng(53), out = [];
    for (let k = 0; k < (+p.count || 26); k++) {
      const x = 40 + rnd() * 1000, sz = 70 + rnd() * 70, dl = rnd() * 0.7, rot = (rnd() - 0.5) * 540, dur = 1.25 + rnd() * 0.5, blur = rnd() * 0.6;
      out.push({ k, x, sz, dl, rot, dur, blur, note: k % 4 === 3 });
    }
    return out;
  },
  html(p, c) {
    const sym = c.esc(p.currency);
    const coins = this._items(p, c).map(q => `<i class="${q.note ? "nt" : "cn"}" id="${c.id("c" + q.k)}" style="left:${q.x.toFixed(0)}px;width:${(q.sz * (q.note ? 1.9 : 1)).toFixed(0)}px;height:${q.sz.toFixed(0)}px;filter:blur(${q.blur.toFixed(1)}px)"><b>${sym}</b></i>`).join("");
    return `<div class="dm" id="${c.id("dm")}"></div>${coins}<div class="zt" id="${c.id("z")}" style="top:${p.y}px"><span class="n">${sym}${c.esc(p.big)}</span>${p.small ? `<span class="s">${c.esc(p.small)}</span>` : ""}</div>`;
  },
  animate(tl, p, c) {
    tl.fromTo("#" + c.id("dm"), { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" }, c.at(0));
    for (const q of this._items(p, c))
      tl.fromTo("#" + c.id("c" + q.k), { y: -260, rotation: 0, opacity: 1 }, { y: 2150, rotation: q.rot, duration: q.dur, ease: "power1.in" }, c.at(q.dl));
    const s = p.slamAt == null || p.slamAt === "" ? 1.5 : +p.slamAt;
    tl.fromTo("#" + c.id("z"), { opacity: 0, scale: 1.6, filter: "blur(16px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.4, ease: "expo.out" }, c.at(s - 0.05));
    tl.to(c.$(), { opacity: 0, duration: 0.25, ease: "power2.in" }, c.end - 0.25);
  },
});
