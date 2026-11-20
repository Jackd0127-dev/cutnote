"use strict";
/* Right-click on the timeline: copy, cut, paste, duplicate, speed, reverse, crop, mirror, extract audio, delete.
   Selecting a sound (a sound effect or audio taken out of the footage) opens the Sound panel in the sidebar:
   volume, fades, mute, noise reduction, voice clarity, loudness. Everything is a timeline edit (S.ed), so it is
   undoable, previews live where a browser can, is written into review-notes.md for the rebuild, and Export cut applies it. */
(() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = `
  #cxm { position: fixed; z-index: 400; min-width: 236px; padding: 6px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line-2); color: var(--ink);
    box-shadow: 0 22px 60px rgba(0,0,0,.25), 0 2px 8px rgba(0,0,0,.08); opacity: 0; transform: scale(.94); transform-origin: top left; transition: opacity .16s ease, transform .26s cubic-bezier(.22,1,.36,1); }
  #cxm.on { opacity: 1; transform: none; }
  #cxm .h { padding: 7px 10px 5px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px; }
  #cxm button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 10px; border: 0; border-radius: 8px; background: none; color: var(--ink); font: 500 13px -apple-system, system-ui, sans-serif; text-align: left; cursor: pointer; white-space: nowrap; }
  #cxm button:hover:not(:disabled) { background: var(--raise); }
  #cxm button:disabled { color: var(--faint); cursor: default; }
  #cxm button svg { width: 15px; height: 15px; flex: none; color: var(--dim); }
  #cxm button kbd { margin-left: auto; font-size: 10.5px; color: var(--faint); border: 0; background: none; padding: 0 0 0 16px; }
  #cxm button .ck { margin-left: auto; width: 14px; height: 14px; color: var(--accent-text, var(--ink)); }
  #cxm button.danger, #cxm button.danger svg { color: #e5484d; }
  #cxm hr { border: 0; border-top: 1px solid var(--line); margin: 5px 4px; }
  #cxm .spd { display: flex; gap: 3px; padding: 4px 6px 6px 35px; }
  #cxm .spd button { width: auto; padding: 4px 7px; border-radius: 6px; font-size: 11.5px; font-weight: 600; color: var(--dim); background: var(--panel-2); }
  #cxm .spd button.on { background: var(--accent); color: var(--accent-ink); }
  #cxm > * { opacity: 0; transform: translateY(-3px); transition: opacity .18s ease, transform .26s cubic-bezier(.22,1,.36,1); }
  #cxm.on > * { opacity: 1; transform: none; }
  ${Array.from({ length: 18 }, (_, i) => `#cxm.on > :nth-child(${i + 1}) { transition-delay: ${i * 0.016}s; }`).join(" ")}
  #cropP { position: absolute; z-index: 30; left: 50%; bottom: 14px; width: min(360px, calc(100% - 24px)); transform: translate(-50%, 8px); opacity: 0; pointer-events: none; padding: 14px; border-radius: 16px;
    background: var(--panel); border: 1px solid var(--line-2); box-shadow: 0 20px 50px rgba(0,0,0,.28); transition: opacity .2s, transform .3s cubic-bezier(.22,1,.36,1); }
  #cropP.on { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
  #cropP b { display: block; font-size: 13px; margin-bottom: 8px; }
  #cropP .r { display: grid; grid-template-columns: 52px 1fr 40px; align-items: center; gap: 10px; font-size: 12px; color: var(--dim); margin: 6px 0; }
  #cropP .r span:last-child { text-align: right; font-variant-numeric: tabular-nums; color: var(--ink); }
  #cropP .a { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
  #cropP .a button { height: 32px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font-weight: 600; font-size: 12.5px; cursor: pointer; }
  #cropP .a button.p { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  #sndp .meter { font-variant-numeric: tabular-nums; color: var(--ink); }
  #sndp .acts { display: flex; gap: 8px; flex-wrap: wrap; }
  #sndp .acts button { height: 32px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font-weight: 600; font-size: 12.5px; cursor: pointer; }
  #sndp .acts button.danger { color: #e5484d; }
  #sndp .opt { padding: 9px 0; }
  #sndp .opt b { font-size: 13px; } #sndp .opt .hint { margin-top: 1px; }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const I = {
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg>',
    cut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/></svg>',
    paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/></svg>',
    dup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="7" width="12" height="12" rx="2"/><path d="M9 7V5a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2h-4" stroke-linecap="round"/></svg>',
    rev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L4 12l7 7M20 5l-7 7 7 7"/></svg>',
    crop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14"/></svg>',
    mh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18" stroke-dasharray="2 3"/><path d="M9 6L3 18h6zM15 6l6 12h-6z"/></svg>',
    mv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18" stroke-dasharray="2 3"/><path d="M6 9L18 3v6zM6 15l12 6v-6z"/></svg>',
    aud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/></svg>',
    snd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a3 3 0 010 6M18.5 6.5a7 7 0 010 11"/></svg>',
    split: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M5 8l-3 4 3 4M19 8l3 4-3 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14l-5-5 5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/></svg>',
    check: '<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  };
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const K = k => (isMac ? "⌘" : "Ctrl+") + k, DEL = isMac ? "⌫" : "Del";

  /* ---------- clipboard: a footage piece or a sound ---------- */
  const CB = (window.TLClip = { item: null });
  const selected = () => {
    const s = TL.sel; if (!s) return null;
    if (s.kind === "seg") return segs()[s.i] ? { kind: "seg", i: s.i, seg: segs()[s.i] } : null;
    const c = clipBy(s.key); return c ? { kind: c.sfx ? "snd" : "clip", c } : null;
  };
  const newId = () => Math.random().toString(36).slice(2, 10);
  function freeRow(kind, P, dur) {
    const items = sfxItems().filter(x => (x.kind === "ext") === (kind === "ext"));
    for (let r = 0; r < 8; r++) if (!items.some(it => (it.row || 0) === r && P < toE(it.start) + it.dur - 1e-3 && P + dur > toE(it.start) + 1e-3)) return r;
    return 0;
  }
  function copySel(quiet) {
    const s = selected(); if (!s) { toast("Select something on the timeline first"); return false; }
    if (s.kind === "clip") { toast("Overlays and captions can't be copied yet: right-click them for what they can do"); return false; }
    CB.item = s.kind === "seg" ? { kind: "seg", seg: noMute(s.seg) } : { kind: "snd", it: clone(s.c.sfx) };
    if (!quiet) toast(s.kind === "seg" ? "Copied the footage piece" : "Copied " + (s.c.sfx.name || "the sound"));
    return true;
  }
  function cutSel() {
    const s = selected(); if (!s) return;
    if (s.kind === "seg" && segs().length < 2) { toast("That's the whole video: split it first, then cut a piece"); return; }
    if (!copySel(true)) return;
    tlDelete(); toast("Cut: paste it anywhere with " + K("V"));
  }
  // footage pastes in at the playhead (splitting the piece there); a sound lands at the playhead on a free row
  function paste() {
    if (!CB.item) { toast("Nothing copied yet"); return; }
    if (!canEdit()) return;
    const E = toE(S.t);
    if (CB.item.kind === "snd") {
      const it = Object.assign(clone(CB.item.it), { u: newId(), start: +toS(E).toFixed(4) });
      it.row = freeRow(it.kind, E, it.dur);
      tlBegin(); S.ed = S.ed || { segments: null, clips: {} }; S.ed.sfx = S.ed.sfx || []; S.ed.sfx.push(it);
      TL.sel = { kind: "clip", key: "sfx:" + it.u }; tlCommit(); toast("Pasted at " + fmt(E)); return;
    }
    const ss = clone(segs()), st = segStarts(); let at = ss.length;
    for (let i = 0; i < ss.length; i++) {
      if (Math.abs(st[i] - E) < 1.5 / FPS) { at = i; break; }
      const L = segLen(ss[i]);
      if (E > st[i] && E < st[i] + L - 1.5 / FPS) {   // inside a piece: split it here first
        const s0 = ss[i], t = +(s0.in + (E - st[i]) * spOf(s0)).toFixed(4);
        ss.splice(i, 1, Object.assign({}, s0, { out: t }), Object.assign({}, s0, { in: t })); at = i + 1; break;
      }
    }
    tlBegin(); const keep = holdPlaces(); ss.splice(at, 0, clone(CB.item.seg));
    S.ed = Object.assign(S.ed || { clips: {} }, { segments: ss }); restorePlaces(keep);
    TL.sel = { kind: "seg", i: at }; tlCommit(); toast("Pasted the footage piece at " + fmt(E));
  }
  function duplicate() {
    const s = selected(); if (!s) { toast("Select something on the timeline first"); return; }
    if (!canEdit()) return;
    if (s.kind === "seg") {
      tlBegin(); const keep = holdPlaces(); const ss = clone(segs()); ss.splice(s.i + 1, 0, noMute(ss[s.i]));
      S.ed = Object.assign(S.ed || { clips: {} }, { segments: ss }); restorePlaces(keep);
      TL.sel = { kind: "seg", i: s.i + 1 }; tlCommit(); toast("Duplicated: the copy plays straight after"); return;
    }
    if (s.kind === "snd") {
      const src = s.c.sfx, P = toE(src.start) + src.dur;
      const it = Object.assign(clone(src), { u: newId(), start: +toS(Math.min(P, Math.max(0, progDur() - 0.05))).toFixed(4) });
      it.row = freeRow(it.kind, P, it.dur);
      tlBegin(); S.ed.sfx.push(it); TL.sel = { kind: "clip", key: "sfx:" + it.u }; tlCommit(); toast("Duplicated"); return;
    }
    toast("Overlays and captions can't be duplicated here yet");
  }
  window.TLClip.copy = copySel; window.TLClip.cut = cutSel; window.TLClip.paste = paste; window.TLClip.duplicate = duplicate;

  /* ---------- footage effects ---------- */
  function segSet(i, patch, label) {
    if (!canEdit()) return;
    tlBegin(); const ss = clone(segs()), s = ss[i];
    for (const [k, v] of Object.entries(patch)) { if (v == null || v === false) delete s[k]; else s[k] = v; }
    S.ed = Object.assign(S.ed || { clips: {} }, { segments: ss });
    tlCommit(); mainFx(true); if (label) toast(label);
  }
  function clipSet(c, patch, label) {
    if (!editable(c)) return;
    const e = eff(c); tlBegin(); S.ed = S.ed || { segments: null, clips: {} }; S.ed.clips = S.ed.clips || {};
    const o = Object.assign({ start: e.start, dur: e.end - e.start, del: false }, S.ed.clips[c.key] || {});
    for (const [k, v] of Object.entries(patch)) { if (v == null || v === false) delete o[k]; else o[k] = v; }
    S.ed.clips[c.key] = o; tlCommit(); if (label) toast(label);
  }
  function extractAudio(i) {
    if (!canEdit()) return;
    const s = segs()[i]; if (!s) return;
    if (s.mute) { toast("This piece's audio is already on the Audio track"); return; }
    // the audio keeps its piece's timing: same length on the timeline, same speed, reversed if the piece is
    const P = segStarts()[i], dur = +segLen(s).toFixed(4);
    const it = { u: newId(), kind: "ext", id: "footage-audio", name: `Audio ${fmt(s.in)}–${fmt(s.out)}`, file: "", start: s.in, dur, len: dur, off: s.in, vol: 1, row: freeRow("ext", P, dur) };
    if (spOf(s) !== 1) it.sp = spOf(s);
    if (s.rev) it.rev = true;
    tlBegin(); const ss = clone(segs()); ss[i].mute = true;
    S.ed = Object.assign(S.ed || { clips: {} }, { segments: ss }); S.ed.sfx = S.ed.sfx || []; S.ed.sfx.push(it);
    TL.sel = { kind: "clip", key: "sfx:" + it.u }; tlCommit(); mainFx(true);
    toast("Audio extracted: it's on the Audio track, select it to edit");
  }
  // put extracted audio back into its footage
  // every piece whose sound this audio carried gets it back (a split piece has two halves)
  function putBack(it) {
    const a = it.off, b = it.off + it.dur * (it.sp || 1);
    const ss = clone(segs()); let n = 0;
    for (const s of ss) if (s.mute && s.in < b - 1e-3 && s.out > a + 1e-3) { delete s.mute; n++; }
    tlBegin(); S.ed.sfx = sfxItems().filter(x => x !== it); S.ed.segments = ss;
    TL.sel = null; tlCommit(); mainFx(true);
    toast(n ? "Audio put back into the footage" : "Audio removed (its footage had already changed)");
  }
  // a piece showing "Audio out": bring its sound back, with or without an Audio item still around
  function restoreAudio(i) {
    const s = segs()[i]; if (!s) return;
    const it = sfxItems().find(x => x.kind === "ext" && x.off < s.out - 1e-3 && x.off + x.dur * (x.sp || 1) > s.in + 1e-3);
    if (it) { putBack(it); return; }
    segSet(i, { mute: null }, "Audio back in the footage");
  }
  const noMute = seg => { const c = clone(seg); delete c.mute; return c; };   // copies of a piece bring their own sound

  /* ---------- crop: four sliders, live on the frame ---------- */
  let cropT = null, cropUndo = null;
  function cropPanel(target) {
    closeCrop(true);
    const pre = clone(S.ed || null), comp = S.comp && S.comp.id;
    const cur = (target.kind === "seg" ? segs()[target.i].crop : (S.ed && S.ed.clips && S.ed.clips[target.c.key] || {}).crop) || { l: 0, r: 0, t: 0, b: 0 };
    const v = Object.assign({ l: 0, r: 0, t: 0, b: 0 }, cur);
    if (S.playing) pause();
    if (target.kind === "seg") seekE(segStarts()[target.i] + Math.min(0.3, segLen(segs()[target.i]) / 2));
    const el = document.createElement("div"); el.id = "cropP";
    el.innerHTML = `<b>Crop ${target.kind === "seg" ? "this footage piece" : esc(target.c.id)}</b>
      ${[["l", "Left"], ["r", "Right"], ["t", "Top"], ["b", "Bottom"]].map(([k, n]) => `<div class="r"><span>${n}</span><input type="range" min="0" max="45" step="1" data-k="${k}" value="${Math.round(v[k] * 100)}"><span data-v="${k}">${Math.round(v[k] * 100)}%</span></div>`).join("")}
      <div class="a"><button type="button" data-a="reset">Reset</button><button type="button" data-a="cancel">Cancel</button><button type="button" class="p" data-a="done">Done</button></div>`;
    $("#frame").parentElement.appendChild(el);
    requestAnimationFrame(() => el.classList.add("on"));
    window.CropOpen = true;
    // closing without Done (Cancel, Esc, another panel, a version switch) puts back what was there
    cropUndo = () => { if (S.comp && S.comp.id === comp) { S.ed = clone(pre); tlCommit(); mainFx(true); } };
    const apply = () => {
      if (!S.comp || S.comp.id !== comp) { closeCrop(true); return; }
      const c = v.l || v.r || v.t || v.b ? { l: v.l, r: v.r, t: v.t, b: v.b } : null;
      if (target.kind === "seg") { const ss = clone(segs()); if (c) ss[target.i].crop = c; else delete ss[target.i].crop; S.ed = Object.assign(S.ed || { clips: {} }, { segments: ss }); mainFx(true); }
      else { S.ed.clips = S.ed.clips || {}; const e = eff(target.c); const o = Object.assign({ start: e.start, dur: e.end - e.start, del: false }, S.ed.clips[target.c.key] || {}); if (c) o.crop = c; else delete o.crop; S.ed.clips[target.c.key] = o; applyClipEdits(); }
      draw();
    };
    el.addEventListener("input", e => { const k = e.target.dataset.k; if (!k) return; v[k] = +e.target.value / 100; el.querySelector(`[data-v="${k}"]`).textContent = e.target.value + "%"; apply(); });
    el.addEventListener("click", e => {
      const a = e.target.closest("[data-a]"); if (!a) return;
      if (a.dataset.a === "reset") { v.l = v.r = v.t = v.b = 0; el.querySelectorAll("input").forEach(i => i.value = 0); el.querySelectorAll("[data-v]").forEach(s => s.textContent = "0%"); apply(); }
      if (a.dataset.a === "cancel") closeCrop(true);
      if (a.dataset.a === "done") {
        const now = clone(S.ed); cropUndo = null; closeCrop(false);
        if (JSON.stringify(now) === JSON.stringify(pre)) return;
        S.ed = clone(pre); tlBegin(); S.ed = now; tlCommit(); mainFx(true);   // one undo step for the whole crop
        toast(v.l || v.r || v.t || v.b ? "Cropped" : "Crop removed");
      }
    });
    cropT = el;
  }
  function closeCrop(revert) {
    if (!cropT) return;
    const el = cropT; cropT = null; window.CropOpen = false;
    if (revert && cropUndo) cropUndo();
    cropUndo = null; el.classList.remove("on"); setTimeout(() => el.remove(), 250);
    if (TL.needSync) setTimeout(tlSync, 0);
  }
  addEventListener("keydown", e => { if (cropT && e.key === "Escape") { e.stopPropagation(); closeCrop(true); } }, true);

  /* ---------- the menu ---------- */
  let menu = null;
  function closeMenu() { if (!menu) return; const m = menu; menu = null; m.classList.remove("on"); setTimeout(() => m.remove(), 180); }
  function show(x, y, items, title) {
    closeMenu();
    menu = document.createElement("div"); menu.id = "cxm"; menu.setAttribute("role", "menu");
    menu.innerHTML = (title ? `<div class="h">${esc(title)}</div>` : "") + items.map((it, k) => it === "-" ? "<hr>" : it.speed != null
      ? `<div class="spd">${[0.25, 0.5, 1, 1.5, 2, 4].map(v => `<button type="button" data-sp="${v}" class="${v === it.speed ? "on" : ""}">${v}×</button>`).join("")}</div>`
      : `<button type="button" data-k="${k}" class="${it.danger ? "danger" : ""}" ${it.off ? "disabled" : ""}>${it.ic || ""}<span>${esc(it.t)}</span>${it.on ? I.check : it.kbd ? `<kbd>${esc(it.kbd)}</kbd>` : ""}</button>`).join("");
    document.body.appendChild(menu);
    const w = menu.offsetWidth, h = menu.offsetHeight;
    const left = Math.min(x, innerWidth - w - 8), top = y + h > innerHeight - 8 ? Math.max(8, y - h) : y;
    menu.style.left = left + "px"; menu.style.top = top + "px";
    menu.style.transformOrigin = `${x - left}px ${y - top}px`;
    requestAnimationFrame(() => requestAnimationFrame(() => menu && menu.classList.add("on")));
    menu.addEventListener("click", e => {
      const sp = e.target.closest("[data-sp]"); if (sp) { closeMenu(); tlSetSpeed(+sp.dataset.sp); return; }
      const b = e.target.closest("[data-k]"); if (!b || b.disabled) return;
      const it = items[+b.dataset.k]; closeMenu(); it.do && it.do();
    });
  }
  addEventListener("pointerdown", e => { if (menu && !menu.contains(e.target)) closeMenu(); }, true);
  addEventListener("keydown", e => { if (!menu) return; if (e.key === "Escape") e.stopPropagation(); closeMenu(); }, true);
  addEventListener("blur", closeMenu);
  $("#tlwrap").addEventListener("scroll", closeMenu, true);

  cv.addEventListener("contextmenu", e => {
    e.preventDefault();
    const x = e.offsetX, y = e.offsetY; if (x < G) return;
    const h = hitAt(x, y), E = T(x);
    if (window.LibDrawer && LibDrawer.unpick) LibDrawer.unpick();
    const base = [{ t: "Copy", ic: I.copy, kbd: K("C"), do: () => copySel() }, { t: "Cut", ic: I.cut, kbd: K("X"), do: cutSel },
      { t: "Paste", ic: I.paste, kbd: K("V"), off: !CB.item, do: paste }, { t: "Duplicate", ic: I.dup, kbd: K("D"), do: duplicate }];
    if (h.zone === "seg") {
      TL.sel = { kind: "seg", i: h.i }; FE.sel = null; draw();
      const s = segs()[h.i];
      show(e.clientX, e.clientY, [...base, "-",
        { t: "Split here", ic: I.split, do: () => tlSplitAt(snapE(E).E) },
        { speed: spOf(s) }, "-",
        { t: "Reverse", ic: I.rev, on: !!s.rev, do: () => segSet(h.i, { rev: !s.rev }, s.rev ? "Plays forwards again" : "Reversed: it plays backwards in the export and the build (forwards in this preview)") },
        { t: "Crop…", ic: I.crop, on: !!s.crop, do: () => cropPanel({ kind: "seg", i: h.i }) },
        { t: "Mirror horizontally", ic: I.mh, on: !!s.flipH, do: () => segSet(h.i, { flipH: !s.flipH }, s.flipH ? "Not mirrored" : "Mirrored left to right") },
        { t: "Mirror vertically", ic: I.mv, on: !!s.flipV, do: () => segSet(h.i, { flipV: !s.flipV }, s.flipV ? "Not flipped" : "Flipped upside down") }, "-",
        s.mute ? { t: "Put audio back", ic: I.back, do: () => restoreAudio(h.i) } : { t: "Extract audio", ic: I.aud, do: () => extractAudio(h.i) }, "-",
        { t: "Delete", ic: I.trash, kbd: DEL, danger: true, off: segs().length < 2, do: tlDelete }], "Footage " + fmt(s.in) + "–" + fmt(s.out));
      return;
    }
    if (h.zone === "clip") {
      TL.sel = { kind: "clip", key: h.c.key }; draw();
      const c = h.c;
      if (c.sfx) {
        const it = c.sfx;
        show(e.clientX, e.clientY, [...base, "-",
          { t: "Sound options…", ic: I.snd, do: () => SND.open(it) },
          { t: it.mute ? "Unmute" : "Mute", ic: I.snd, do: () => { tlBegin(); it.mute = !it.mute || undefined; tlCommit(); } },
          ...(it.kind === "ext" ? [{ t: "Put back into the footage", ic: I.back, do: () => putBack(it) }] : []), "-",
          { t: "Delete", ic: I.trash, kbd: DEL, danger: true, do: tlDelete }], it.name || "Sound");
        return;
      }
      const o = (S.ed && S.ed.clips && S.ed.clips[c.key]) || {}, ed = editable(c);
      const items = [];
      if (c.type === "video") items.push({ speed: eff(c).sp }, "-",
        { t: "Reverse", ic: I.rev, on: !!o.rev, off: !ed, do: () => clipSet(c, { rev: !o.rev }, o.rev ? "Plays forwards again" : "Reversed in the build") },
        { t: "Crop…", ic: I.crop, on: !!o.crop, off: !ed, do: () => cropPanel({ kind: "clip", c }) },
        { t: "Mirror horizontally", ic: I.mh, on: !!o.flipH, off: !ed, do: () => clipSet(c, { flipH: !o.flipH }) },
        { t: "Mirror vertically", ic: I.mv, on: !!o.flipV, off: !ed, do: () => clipSet(c, { flipV: !o.flipV }) }, "-");
      items.push({ t: "Delete", ic: I.trash, kbd: DEL, danger: true, off: !ed, do: tlDelete });
      show(e.clientX, e.clientY, items, c.type === "cap" ? "Caption" : c.id);
      return;
    }
    show(e.clientX, e.clientY, [{ t: "Paste", ic: I.paste, kbd: K("V"), off: !CB.item, do: paste }, { t: "Split at the playhead", ic: I.split, kbd: K("B"), do: () => tlSplitAt(toE(S.t)) }]);
  });

  /* ---------- the Sound panel (sidebar): opens when a sound is selected ---------- */
  const aside = $("#insp").parentElement;
  aside.insertAdjacentHTML("beforeend", `<section id="sndp" aria-label="Sound">
    <header><div class="nm"><h2 class="it">Sound</h2><small data-n></small></div><button class="ib icon" data-x title="Close (Esc)">✕</button></header>
    <div class="body">
      <div class="grp"><h3>Volume<button class="lnk" data-r="vol" type="button">Reset</button></h3><div class="slide"><input type="range" min="0" max="200" step="1" data-f="vol"><span class="meter" data-m="vol"></span></div></div>
      <div class="grp"><h3>Fades<button class="lnk" data-r="fade" type="button">Reset</button></h3>
        <div class="slide"><span style="width:58px;font-size:12px;color:var(--dim)">Fade in</span><input type="range" min="0" max="300" step="5" data-f="fadeIn"><span class="meter" data-m="fadeIn"></span></div>
        <div class="slide" style="margin-top:8px"><span style="width:58px;font-size:12px;color:var(--dim)">Fade out</span><input type="range" min="0" max="300" step="5" data-f="fadeOut"><span class="meter" data-m="fadeOut"></span></div></div>
      <div class="grp">
        <div class="row2 opt"><div><b>Mute</b><div class="hint">Silence this sound</div></div><span class="switch"><input type="checkbox" data-t="mute"><i></i></span></div>
        <div class="row2 opt"><div><b>Reduce noise</b><div class="hint">Cleans hiss, hum and room noise</div></div><span class="switch"><input type="checkbox" data-t="denoise"><i></i></span></div>
        <div class="row2 opt"><div><b>Voice clarity</b><div class="hint">Cuts rumble and lifts speech</div></div><span class="switch"><input type="checkbox" data-t="voice"><i></i></span></div>
        <div class="row2 opt"><div><b>Even out loudness</b><div class="hint">Brings it to a steady level for socials</div></div><span class="switch"><input type="checkbox" data-t="norm"><i></i></span></div>
        <p class="hint" style="margin:6px 0 0">Volume and fades play live here. Noise, clarity and loudness are applied when you export or rebuild.</p></div>
      <div class="grp"><div class="acts"><button type="button" data-a="back">Put back into the footage</button><button type="button" class="danger" data-a="del">Delete</button></div></div>
    </div></section>`);
  // the Sound panel shares the on-frame inspector's look
  const sst = document.createElement("style");
  sst.textContent = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch { return []; } })
    .filter(r => r.selectorText && r.selectorText.includes("#insp")).map(r => r.cssText.replace(/#insp/g, "#sndp")).join("\n");
  document.head.appendChild(sst);
  const P = $("#sndp");
  const SND = (window.SoundPanel = { it: null, begun: false });
  const fmtS = v => (v / 100).toFixed(2) + " s";
  SND.paint = () => {
    const it = SND.it; if (!it) return;
    P.querySelector("[data-n]").textContent = (it.name || "Sound") + (it.kind === "ext" ? " · from your footage" : " · sound effect");
    const vol = Math.round((it.vol == null ? 1 : it.vol) * 100), fi = Math.round((it.fadeIn || 0) * 100), fo = Math.round((it.fadeOut || 0) * 100);
    const set = (k, v) => { const i = P.querySelector(`[data-f="${k}"]`); if (document.activeElement !== i) i.value = v; };
    set("vol", vol); set("fadeIn", fi); set("fadeOut", fo);
    P.querySelector('[data-m="vol"]').textContent = vol + "%" + (vol > 100 ? " · louder in the build" : "");
    P.querySelector('[data-m="fadeIn"]').textContent = fmtS(fi); P.querySelector('[data-m="fadeOut"]').textContent = fmtS(fo);
    for (const t of ["mute", "denoise", "voice", "norm"]) P.querySelector(`[data-t="${t}"]`).checked = !!it[t];
    P.querySelector('[data-a="back"]').style.display = it.kind === "ext" ? "" : "none";
    P.querySelector('[data-r="vol"]').disabled = vol === 100; P.querySelector('[data-r="fade"]').disabled = !fi && !fo;
  };
  SND.open = it => { SND.it = it; SND.paint(); P.classList.add("on"); if (window.SidePane && !SidePane.isOpen()) SidePane.setOpen(true); };
  SND.close = () => { commit(); SND.it = null; P.classList.remove("on"); };
  const begin = () => { if (!SND.begun) { tlBegin(); SND.begun = true; } };
  const commit = () => { if (SND.begun) { SND.begun = false; tlCommit(); } };
  P.addEventListener("input", e => {
    const f = e.target.dataset.f; if (!f || !SND.it) return;
    begin(); const v = +e.target.value;
    if (f === "vol") SND.it.vol = v / 100; else SND.it[f] = Math.min(v / 100, SND.it.dur / 2) || undefined;
    SND.paint(); draw();
  });
  P.addEventListener("change", e => {
    if (e.target.dataset.f) { commit(); return; }
    const t = e.target.dataset.t; if (!t || !SND.it) return;
    tlBegin(); SND.it[t] = e.target.checked || undefined; tlCommit(); SND.paint();
  });
  P.addEventListener("click", e => {
    if (e.target.closest("[data-x]")) { TL.sel = null; SND.close(); draw(); return; }
    const r = e.target.closest("[data-r]"); if (r && SND.it) { tlBegin(); if (r.dataset.r === "vol") SND.it.vol = 1; else { delete SND.it.fadeIn; delete SND.it.fadeOut; } tlCommit(); SND.paint(); return; }
    const a = e.target.closest("[data-a]"); if (!a || !SND.it) return;
    if (a.dataset.a === "back") { const it = SND.it; SND.close(); putBack(it); }
    if (a.dataset.a === "del") { TL.sel = { kind: "clip", key: "sfx:" + SND.it.u }; SND.close(); tlDelete(); }
  });
  // follow the timeline selection: a sound selected opens the panel, anything else closes it
  let lastKey = null;
  setInterval(() => {
    const s = TL.sel, c = s && s.kind === "clip" ? clipBy(s.key) : null, it = c && c.sfx ? c.sfx : null;
    const key = it ? it.u : null;
    if (key !== lastKey) { lastKey = key; if (it) SND.open(it); else if (SND.it) SND.close(); }
    else if (it && it !== SND.it) { SND.it = it; SND.paint(); }   // undo/redo swapped the object
  }, 150);

  /* ---------- keys: ⌘C ⌘X ⌘V ⌘D on the timeline ---------- */
  document.addEventListener("keydown", e => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const ck = window.CnKeys;
    if (!ck || ck.blocked() || ck.typing(e.target) || ck.control(e.target) || (e.target.closest && e.target.closest(".dd.open")) || cropT || TL.drag) return;
    if (getSelection && String(getSelection()).length) return;   // copying text on the page stays normal
    const k = e.key.toLowerCase();
    if (k === "c" && TL.sel) { e.preventDefault(); copySel(); }
    else if (k === "x" && TL.sel) { e.preventDefault(); cutSel(); }
    else if (k === "v" && CB.item) { e.preventDefault(); paste(); }
    else if (k === "d" && TL.sel) { e.preventDefault(); duplicate(); }
  }, true);
})();
