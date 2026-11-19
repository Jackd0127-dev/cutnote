/* Email card (Day 18): a clean mail card with an EXAMPLE tag; one sentence sweeps lime on the highlight beat. */
(function () {
  const ICON = '<svg viewBox="0 0 48 48" width="44" height="44"><rect x="4" y="9" width="40" height="30" rx="6" fill="#17120e"/><path d="M8 15l16 12 16-12" fill="none" stroke="#c8ff3a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  VideoLibrary.register({
    id: "email-card",
    name: "Email card",
    category: "Cards",
    collection: "Clean cards",
    order: 1,
    source: "Day 18",
    description: "A clean white mail card (from, to, subject, body) with an EXAMPLE tag. It floats in, then one sentence is swept with a lime highlighter.",
    tags: ["email", "mail", "outreach", "example", "card"],
    duration: 4.4,
    params: [
      { key: "from", label: "From", type: "text", default: "Sam" },
      { key: "to", label: "To", type: "text", default: "to Belfast Roofing" },
      { key: "subject", label: "Subject", type: "text", default: "Your site on a phone" },
      { key: "body", label: "Body (one paragraph per line)", type: "longtext", default: "Hi Dave,\nHad a look at your reviews, 4.9 from 86 people, which is brilliant. One thing: your website doesn't load properly on a phone, and that's where most people will find you.\nWant me to send a 60-second video of the fix?" },
      { key: "highlight", label: "Sentence to highlight (must appear in the body)", type: "text", default: "One thing: your website doesn't load properly on a phone," },
      { key: "tag", label: "Tag (blank = none)", type: "text", default: "example" },
      { key: "inAt", label: "Card lands (s)", type: "time", default: 0.1 },
      { key: "highlightAt", label: "Highlight sweeps (s)", type: "time", default: 1.9 },
      { key: "box", label: "Area [x0, y0, x1, y1]", type: "box", default: [240, 1100, 840, 1700] },
    ],
    sfx: [{ file: "drop_002", at: "inAt" }, { file: "select_002", at: "highlightAt" }],
    css: `
.vl-email-card .ml{position:absolute;padding:26px 30px 28px;border-radius:30px;background:#fff;box-shadow:0 32px 64px -14px rgba(20,14,8,.5),0 12px 26px -8px rgba(20,14,8,.22),0 0 0 1px rgba(23,18,14,.05);opacity:0;color:#17120e;font-family:"ArchivoM"}
.vl-email-card .hd{display:flex;align-items:center;gap:14px;margin-bottom:14px}
.vl-email-card .fr{font-family:"ArchivoSB";font-size:30px;letter-spacing:-.01em}
.vl-email-card .to{font-size:26px;color:rgba(23,18,14,.55)}
.vl-email-card .sj{font-family:"ArchivoXB";font-size:36px;letter-spacing:-.025em;line-height:1.15;margin-bottom:14px}
.vl-email-card .bd{font-size:29px;line-height:1.32;color:rgba(23,18,14,.82)}
.vl-email-card .bd p{margin:0 0 12px}
.vl-email-card .bd mark{color:inherit;background-color:transparent;background-image:linear-gradient(transparent 12%,rgba(214,255,120,.9) 12%,rgba(214,255,120,.9) 88%,transparent 88%);background-size:0% 100%;background-repeat:no-repeat}
.vl-email-card .vl-tag{position:absolute;right:26px;top:-16px}`,
    html(p, c) {
      const [x0, y0, x1] = p.box;
      const hl = c.esc(p.highlight);
      const paras = String(p.body).split(/\n+/).map(s => {
        let e = c.esc(s);
        if (hl && e.indexOf(hl) >= 0) e = e.replace(hl, `<mark id="${c.id("m")}">${hl}</mark>`);
        return `<p>${e}</p>`;
      }).join("");
      return `<div class="ml" id="${c.id("card")}" style="left:${x0}px;top:${y0}px;width:${x1 - x0}px">`
        + (p.tag ? `<span class="vl-tag">${c.esc(p.tag)}</span>` : "")
        + `<div class="hd">${ICON}<span class="fr">${c.esc(p.from)}</span><span class="to">${c.esc(p.to)}</span></div>`
        + `<div class="sj">${c.esc(p.subject)}</div><div class="bd">${paras}</div></div>`;
    },
    animate(tl, p, c) {
      const id = c.id("card"), a = p.inAt == null ? 0.1 : p.inAt;
      tl.fromTo("#" + id, { opacity: 0, y: 60, scale: 0.82, rotation: 5 }, { opacity: 1, y: 0, scale: 1, rotation: -2, duration: 0.5, ease: "back.out(1.6)" }, c.at(a));
      if (p.duration - a > 1.4) tl.fromTo("#" + id, { y: 0 }, { y: -10, duration: p.duration - a - 0.8, ease: "sine.inOut", immediateRender: false }, c.at(a + 0.5));
      if (p.highlightAt != null && p.highlightAt !== "")
        tl.fromTo("#" + c.id("m"), { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", duration: 0.5, ease: "power2.out" }, c.at(p.highlightAt));
      c.exit(tl, "#" + id);
    },
  });
})();
