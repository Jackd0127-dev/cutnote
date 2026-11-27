/* Follow outro: the end-of-video CTA. Profile pic scales in with a drawn ring, name + handle, a cursor taps "Follow" and it
 * flips to "Following ✓" (one click), then "Comment [KEYWORD]" pops in with the keyword typed into a lime chip.
 * Sits on the last seconds of footage over a soft scrim. Holds to the end unless "Fade out" is on.
 * Per video, change only the params (keyword, name, handle, picture). Suggested sounds: whoosh-soft, swipe-up,
 * mouse-click, message-bubble, keyboard-key per letter; none on the Following flip. */
const CHECK = (sz, w) => `<svg class="tk" width="${sz}" height="${sz}" viewBox="0 0 24 24"><path d="M4.5 12.5 L10 18 L19.5 6.5" fill="none" stroke="currentColor" stroke-width="${w * 24 / sz}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
VideoLibrary.register({
  id: "follow-outro",
  name: "Follow + comment outro",
  category: "People",
  collection: "Clean cards",
  order: 9,
  preview: { background: "photo" },
  source: "Outro",
  description: "End-of-video CTA: your profile pic and handle, a cursor taps Follow (flips to Following ✓), then \"Comment KEYWORD\" types into a lime chip.",
  tags: ["outro", "follow", "comment", "cta", "subscribe", "profile", "avatar", "end"],
  duration: 4.2,
  params: [
    { key: "image", label: "Profile pic (blank = initials)", type: "image", default: "" },
    { key: "name", label: "Name", type: "text", default: "Your Name" },
    { key: "handle", label: "Handle", type: "text", default: "@yourhandle" },
    { key: "keyword", label: "Comment keyword", type: "text", default: "PROMPT" },
    { key: "before", label: "Before the keyword", type: "text", default: "Comment" },
    { key: "after", label: "Line under it (blank = none)", type: "text", default: "and I'll send it to you" },
    { key: "follow", label: "Button text", type: "text", default: "Follow" },
    { key: "following", label: "Button text after the tap", type: "text", default: "Following" },
    { key: "accent", label: "Accent colour", type: "color", default: "#c8ff3a" },
    { key: "y", label: "Profile pic centre (px from top)", type: "number", default: 560, min: 300, max: 1000 },
    { key: "tapAt", label: "Cursor taps Follow (s, blank = no cursor)", type: "time", default: 1.3 },
    { key: "commentAt", label: "Comment line in (s)", type: "time", default: 1.7 },
    { key: "fadeOut", label: "Fade out at the end", type: "bool", default: false },
  ],
  sfx: [{ file: "whoosh-soft", at: "0" }, { file: "swipe-up", at: "0.55" }, { file: "mouse-click", at: "tapAt" }, { file: "message-bubble", at: "commentAt" }, { file: "keyboard-key", at: "commentAt" }],
  css: `
.vl-follow-outro{--ac:#c8ff3a;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.vl-follow-outro .st{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;text-align:center}
.vl-follow-outro .av{position:relative;width:300px;height:300px;opacity:0}
.vl-follow-outro .ph{position:absolute;inset:14px;border-radius:50%;overflow:hidden;background:#2a2622;box-shadow:0 24px 60px rgba(0,0,0,.45)}
.vl-follow-outro .ph img{width:100%;height:100%;object-fit:cover;display:block}
.vl-follow-outro .ph .ini{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:"ArchivoXB";font-size:120px;color:var(--ac);letter-spacing:-.04em}
.vl-follow-outro .rg{position:absolute;inset:0;overflow:visible}
.vl-follow-outro .rg circle{fill:none;stroke:#fff;stroke-width:6;stroke-linecap:round}
.vl-follow-outro .bd{position:absolute;right:10px;bottom:14px;width:78px;height:78px;border-radius:50%;background:#fff;box-shadow:0 8px 22px rgba(0,0,0,.35);opacity:0}
.vl-follow-outro .bd i{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-style:normal;font-family:"ArchivoXB";color:#17120e}
.vl-follow-outro .bd .pl{font-size:58px;line-height:1;margin-top:-4px}
.vl-follow-outro .bd .ck{opacity:0}
.vl-follow-outro .nm{font-family:"ArchivoXB";font-size:76px;line-height:1;letter-spacing:-.035em;color:#fff;margin-top:34px;text-shadow:0 4px 24px rgba(0,0,0,.45);opacity:0}
.vl-follow-outro .hd{font-family:"Typewriter";font-size:32px;letter-spacing:.04em;color:rgba(255,255,255,.82);margin-top:16px;text-shadow:0 2px 14px rgba(0,0,0,.5);opacity:0}
.vl-follow-outro .bt{position:relative;margin-top:40px;height:104px;min-width:380px;opacity:0}
.vl-follow-outro .bt .bg{position:absolute;inset:0;border-radius:60px;background:#fff;box-shadow:0 18px 44px rgba(0,0,0,.35)}
.vl-follow-outro .bt .bg2{position:absolute;inset:0;border-radius:60px;background:rgba(23,18,14,.55);border:3px solid rgba(255,255,255,.9);opacity:0}
.vl-follow-outro .bt span{position:relative;display:flex;align-items:center;justify-content:center;height:104px;padding:0 64px;font-family:"ArchivoXB";font-size:46px;letter-spacing:-.02em;white-space:nowrap}
.vl-follow-outro .bt .a{color:#17120e}
.vl-follow-outro .bt .b{position:absolute;inset:0;color:#fff;opacity:0}
.vl-follow-outro .bt .b b{display:flex;color:var(--ac);margin-left:14px}
.vl-follow-outro svg.tk{display:block;overflow:visible}
.vl-follow-outro .cm{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:56px;height:104px}
.vl-follow-outro .cw{font-family:"ArchivoSB";font-size:54px;letter-spacing:-.02em;color:#fff;text-shadow:0 4px 22px rgba(0,0,0,.5);opacity:0}
.vl-follow-outro .ch{position:relative;display:flex;align-items:center;height:96px;padding:0 28px;border-radius:22px;background:var(--ac);box-shadow:0 16px 40px rgba(0,0,0,.35);opacity:0}
.vl-follow-outro .ch .kw{font-family:"ArchivoXB";font-size:58px;letter-spacing:-.01em;color:#17120e;white-space:pre}
.vl-follow-outro .ch .kw u{text-decoration:none;display:none}
.vl-follow-outro .ch .cr{width:5px;height:56px;margin-left:4px;background:#17120e;border-radius:2px;opacity:0}
.vl-follow-outro .af{font-family:"Typewriter";font-size:30px;letter-spacing:.04em;color:rgba(255,255,255,.85);margin-top:24px;text-shadow:0 2px 14px rgba(0,0,0,.5);opacity:0}
.vl-follow-outro .cu{position:absolute;left:0;top:0;width:70px;height:84px;opacity:0;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45))}`,
  html(p, c) {
    const U = s => (/^preview\//.test(s) ? c.base + s : s);   // library samples live under base; anything else is the page's own path
    const ini = String(p.name || "?").trim().split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase();
    const kw = Array.from(String(p.keyword || "")).map(ch => `<u>${c.esc(ch)}</u>`).join("");
    const top = Math.round(+p.y - 150);
    return c.scrim(Math.max(0, top - 260), 0.72)
      + `<div class="st" id="${c.id("st")}" style="top:${top}px;--ac:${c.esc(p.accent || c.lime)}">`
      + `<div class="av" id="${c.id("av")}"><div class="ph">`
      + (p.image ? `<img src="${c.esc(U(p.image))}" alt="">` : `<div class="ini">${c.esc(ini)}</div>`)
      + `</div><svg class="rg" viewBox="0 0 300 300"><circle id="${c.id("rg")}" cx="150" cy="150" r="147" transform="rotate(-90 150 150)" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>`
      + `<div class="bd" id="${c.id("bd")}"><i class="pl" id="${c.id("pl")}">+</i><i class="ck" id="${c.id("ck")}">${CHECK(38, 7)}</i></div></div>`
      + `<div class="nm" id="${c.id("nm")}">${c.esc(p.name)}</div>`
      + (p.handle ? `<div class="hd" id="${c.id("hd")}">${c.esc(p.handle)}</div>` : "")
      + `<div class="bt" id="${c.id("bt")}"><div class="bg" id="${c.id("bg")}"></div><div class="bg2" id="${c.id("bg2")}"></div>`
      + `<span class="a" id="${c.id("ba")}">${c.esc(p.follow)}</span><span class="b" id="${c.id("bb")}">${c.esc(p.following)}<b>${CHECK(36, 6)}</b></span></div>`
      + `<div class="cm"><span class="cw" id="${c.id("cw")}">${c.esc(p.before)}</span>`
      + `<span class="ch" id="${c.id("ch")}"><span class="kw">${kw}</span><i class="cr" id="${c.id("cr")}"></i></span></div>`
      + (p.after ? `<div class="af" id="${c.id("af")}">${c.esc(p.after)}</div>` : "")
      + `</div>`
      + `<svg class="cu" id="${c.id("cu")}" viewBox="0 0 70 84"><path d="M6 4 L6 66 L22 51 L33 77 L45 72 L34 47 L56 47 Z" fill="#fff" stroke="#17120e" stroke-width="4" stroke-linejoin="round"/></svg>`;
  },
  animate(tl, p, c) {
    const q = s => "#" + c.id(s), T = v => (v == null || v === "");
    const tap = T(p.tapAt) ? null : +p.tapAt, cm = T(p.commentAt) ? 1.7 : +p.commentAt;
    // avatar + ring + badge
    tl.fromTo(q("av"), { opacity: 0, scale: 0.55, filter: "blur(16px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.55, ease: "back.out(1.6)" }, c.at(0));
    tl.fromTo(q("av"), { filter: "blur(0px)" }, { filter: "none", duration: 0.01, immediateRender: false }, c.at(0.56));   // drop the filter so the picture renders at full sharpness
    tl.fromTo(q("rg"), { attr: { "stroke-dashoffset": 1 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.7, ease: "power2.inOut" }, c.at(0.15));
    tl.fromTo(q("bd"), { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.4)" }, c.at(0.55));
    // name, handle, button
    tl.fromTo(q("nm"), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, c.at(0.3));
    if (p.handle) tl.fromTo(q("hd"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, c.at(0.42));
    tl.fromTo(q("bt"), { opacity: 0, y: 30, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "back.out(1.8)" }, c.at(0.55));
    // the tap: cursor glides to the button, presses, button flips to Following ✓, badge + becomes ✓
    const flip = tap == null ? 1.1 : tap;
    if (tap != null) {
      // button centre in canvas px: stage top + avatar 300 + name (34+76) + handle (16+~38) + button margin 40 + half 52
      const top = +p.y - 150, by = top + 300 + 110 + (p.handle ? 54 : 0) + 40 + 52;
      const tx = 560, ty = by - 6;   // pointer tip lands just right of centre
      tl.fromTo(q("cu"), { opacity: 0, x: 900, y: by + 330, scale: 1 }, { opacity: 1, x: tx, y: ty, duration: 0.55, ease: "power3.out" }, c.at(tap - 0.6));
      tl.fromTo(q("cu"), { scale: 1 }, { scale: 0.82, duration: 0.08, ease: "power2.in", yoyo: true, repeat: 1, immediateRender: false, transformOrigin: "10% 5%" }, c.at(tap - 0.02));
      tl.fromTo(q("bt"), { scale: 1 }, { scale: 0.93, duration: 0.08, ease: "power2.in", yoyo: true, repeat: 1, immediateRender: false }, c.at(tap - 0.02));
      tl.to(q("cu"), { opacity: 0, x: tx + 300, y: ty + 30, duration: 0.3, ease: "power2.in", immediateRender: false }, c.at(tap + 0.2));
    }
    tl.fromTo(q("bg"), { opacity: 1 }, { opacity: 0, duration: 0.18, immediateRender: false }, c.at(flip + 0.06));
    tl.fromTo(q("bg2"), { opacity: 0 }, { opacity: 1, duration: 0.18, immediateRender: false }, c.at(flip + 0.06));
    tl.fromTo(q("ba"), { opacity: 1 }, { opacity: 0, duration: 0.12, immediateRender: false }, c.at(flip + 0.06));
    tl.fromTo(q("bb"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, ease: "power3.out", immediateRender: false }, c.at(flip + 0.1));
    tl.fromTo(q("pl"), { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.3, duration: 0.1, ease: "power2.in", immediateRender: false }, c.at(flip + 0.04));
    tl.fromTo(q("bd"), { backgroundColor: "#ffffff" }, { backgroundColor: p.accent || c.lime, duration: 0.2, immediateRender: false }, c.at(flip + 0.06));
    tl.fromTo(q("ck"), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(3)", immediateRender: false }, c.at(flip + 0.1));
    tl.fromTo(q("av"), { scale: 1 }, { scale: 1.06, duration: 0.14, ease: "power2.out", yoyo: true, repeat: 1, immediateRender: false }, c.at(flip + 0.06));
    // comment line: "Comment" in, chip pops, keyword types in with a caret
    tl.fromTo(q("cw"), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, c.at(cm));
    tl.fromTo(q("ch"), { opacity: 0, scale: 0.6, rotate: -4 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.42, ease: "back.out(2.2)" }, c.at(cm + 0.1));
    const letters = c.$(".ch .kw u"), n = Array.from(String(p.keyword || "")).length, per = Math.min(0.06, 0.45 / Math.max(1, n));
    tl.fromTo(q("cr"), { opacity: 0 }, { opacity: 1, duration: 0.01 }, c.at(cm + 0.25));
    if (n) tl.fromTo(letters, { display: "none" }, { display: "inline", duration: 0.01, stagger: per }, c.at(cm + 0.3));
    const done = cm + 0.3 + n * per;
    tl.fromTo(q("cr"), { opacity: 1 }, { opacity: 0, duration: 0.01, repeat: 3, yoyo: true, repeatDelay: 0.25, immediateRender: false }, c.at(done + 0.15));
    tl.to(q("cr"), { opacity: 0, duration: 0.01 }, c.at(done + 1.3));
    if (p.after) tl.fromTo(q("af"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, c.at(done + 0.1));
    if (p.fadeOut) c.exit(tl, q("st"));
  },
});
