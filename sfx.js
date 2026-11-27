"use strict";
/* Sounds tab: 50 original sound effects (library/sfx, made by make_sfx.py). Click one to hear it, press + to add it at
   the playhead, or drag it onto the timeline (any time, any Sound FX row) or the video (at the playhead).
   Placed sounds are timeline edits (S.ed.sfx): they play live, Export cut mixes them in, and Claude adds them to the build. */
(() => {
  const SX = (window.SfxDrawer = { list: null, cats: [], cat: "All", q: "", peaks: new Map(), loading: new Map() });
  const pane = $("#pSfx");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = `
  #pSfx .sx-body { padding: 0 12px 16px; overflow: auto; flex: 1; min-height: 0; }
  #pSfx .sx-list { display: grid; gap: 6px; }
  /* rings are inset so the scroll box and the sticky section headings can never cut them off */
  .sx-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto 30px; align-items: center; gap: 10px; padding: 7px; border-radius: 11px;
    background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); cursor: grab; user-select: none; transition: box-shadow .15s, background .15s; }
  .sx-row:hover { box-shadow: inset 0 0 0 1.5px var(--line-2); background: color-mix(in srgb, var(--ink) 3%, var(--panel)); }
  .sx-row.playing { box-shadow: inset 0 0 0 1.5px var(--accent-text); background: color-mix(in srgb, var(--accent) 8%, var(--panel)); }
  .sx-play { position: relative; width: 34px; height: 34px; border-radius: 50%; border: 0; padding: 0; display: grid; place-items: center; cursor: pointer;
    background: var(--play-bg, var(--accent)); color: var(--play-ink, #0b0b0b); box-shadow: 0 1px 2px rgba(0,0,0,.14);
    transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease; }
  .sx-play:hover { transform: scale(1.07); box-shadow: 0 0 14px 2px var(--play-glow, color-mix(in srgb, var(--accent) 45%, transparent)), 0 1px 2px rgba(0,0,0,.14); }
  .sx-play:active { transform: scale(.9); transition-duration: .09s; }
  .sx-row.playing .sx-play { box-shadow: 0 0 10px 1px var(--play-glow, color-mix(in srgb, var(--accent) 45%, transparent)), 0 1px 2px rgba(0,0,0,.14); }
  .sx-play svg { grid-area: 1 / 1; width: 14px; height: 14px; transition: opacity .2s ease, transform .3s cubic-bezier(.22,1,.36,1); }
  .sx-play .i-play { transform: none; }
  .sx-play .i-stop { opacity: 0; transform: scale(.4) rotate(-90deg); }
  .sx-row.playing .sx-play .i-play { opacity: 0; transform: scale(.4) rotate(90deg); }
  .sx-row.playing .sx-play .i-stop { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) { .sx-play, .sx-play svg { transition: opacity .12s linear; } .sx-play:hover, .sx-play:active { transform: none; } .sx-play svg, .sx-row.playing .sx-play svg { transform: none; } }
  .sx-mid { min-width: 0; display: grid; gap: 3px; }
  .sx-mid b { font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sx-mid canvas { width: 100%; height: 16px; display: block; }
  .sx-dur { font: 500 11px ui-monospace, SF Mono, Menlo, monospace; color: var(--faint); }
  .sx-add { width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); display: grid; place-items: center; cursor: pointer; padding: 0; }
  .sx-add:hover { border-color: var(--line-2); background: var(--raise); }
  .sx-add svg { width: 14px; height: 14px; }
  .sx-empty { color: var(--faint); font-size: 12px; padding: 20px 4px; text-align: center; }
  #sxGhost { position: fixed; z-index: 400; pointer-events: none; padding: 7px 12px 7px 10px; border-radius: 10px; background: #ffa53d; color: #2a1500; font: 600 12px -apple-system, system-ui, sans-serif;
    box-shadow: 0 10px 28px rgba(0,0,0,.25); display: none; align-items: center; gap: 6px; transform: translate(-50%, -130%); white-space: nowrap; }
  #sxGhost.bad { background: var(--panel-2); color: var(--dim); }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  document.body.insertAdjacentHTML("beforeend", `<div id="sxGhost"></div>`);
  const ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6.2v11.6a1 1 0 0 0 1.53.85l9.2-5.8a1 1 0 0 0 0-1.7l-9.2-5.8A1 1 0 0 0 8 6.2z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>',
    playStop: '<svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 6.2v11.6a1 1 0 0 0 1.53.85l9.2-5.8a1 1 0 0 0 0-1.7l-9.2-5.8A1 1 0 0 0 8 6.2z"/></svg><svg class="i-stop" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  };

  async function load() {
    if (SX.list) return SX.list;
    const r = await fetch("/lib/sfx/sounds.json", { cache: "no-cache" }); if (!r.ok) throw new Error("no sounds");
    const j = await r.json();
    SX.cats = j.categories || []; SX.list = (j.sounds || []).map(x => Object.assign({}, x, { file: "sfx/" + x.file }));
    return SX.list;
  }
  SX.open = async () => {
    if (pane.dataset.built) return;
    pane.dataset.built = "1";
    try { await load(); } catch { pane.innerHTML = `<div class="sx-empty">No sound effects found in this install's library folder.</div>`; return; }
    pane.innerHTML = `<div class="lp-head"><label class="lp-search">${ICON.search}<input type="search" data-q placeholder="Search ${SX.list.length} sounds" aria-label="Search sounds"></label><div class="lp-chips" data-chips></div></div><div class="sx-body" data-body></div>`;
    pane.style.display = ""; pane.classList.add("sx");
    pane.querySelector("[data-q]").addEventListener("input", e => { SX.q = e.target.value.trim().toLowerCase(); paint(); });
    pane.querySelector("[data-chips]").addEventListener("click", e => { const b = e.target.closest("button[data-c]"); if (b && b.dataset.c !== SX.cat) { SX.cat = b.dataset.c; chipsOn(); paint(); } });
    pane.querySelector("[data-body]").addEventListener("click", onClick);
    pane.querySelector("[data-body]").addEventListener("pointerdown", onDown);
    chipsBuild(); paint();
  };
  /* category chips: built once (their counts never change), so the sliding highlight (CNSlider, when the page has it) keeps its place */
  let slider = null;
  function chipsBuild() {
    const chips = pane.querySelector("[data-chips]");
    const count = c => SX.list.filter(x => c === "All" || x.category === c).length;
    chips.innerHTML = ["All", ...SX.cats].map(c => `<button type="button" data-c="${esc(c)}" class="${c === SX.cat ? "on" : ""}" aria-pressed="${c === SX.cat}" data-tip="${c === "All" ? "Show every sound" : "Show only " + esc(c) + " sounds"}">${esc(c)}<i>${count(c)}</i></button>`).join("");
    if (window.CNSlider && CNSlider.attach) { try { slider = CNSlider.attach(chips, "button[data-c]", el => el.dataset.c === SX.cat); } catch { slider = null; } }
  }
  function chipsOn() {
    const chips = pane.querySelector("[data-chips]");
    for (const b of chips.querySelectorAll("button[data-c]")) { const on = b.dataset.c === SX.cat; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }
    if (window.CNSlider && CNSlider.attach) {
      try { if (slider && typeof slider.refresh === "function") slider.refresh(); else slider = CNSlider.attach(chips, "button[data-c]", el => el.dataset.c === SX.cat); } catch {}
    }
  }
  function paint() {
    const body = pane.querySelector("[data-body]");
    const q = SX.q, hit = x => (SX.cat === "All" || x.category === SX.cat) && (!q || (x.name + " " + x.category + " " + (x.tags || []).join(" ")).toLowerCase().includes(q));
    let html = "";
    if (!tipOff()) html += `<div class="lp-tip"><span>Click a sound to hear it. Drag it onto the timeline, or press <b>+</b> to add it at the playhead.</span><button type="button" data-act="tipx" aria-label="Hide tip" data-tip="Hide this tip">×</button></div>`;
    for (const c of SX.cats) {
      const xs = SX.list.filter(x => x.category === c && hit(x)); if (!xs.length) continue;
      html += `<div class="lp-sec">${esc(c)}<span>${xs.length}</span></div><div class="sx-list">` + xs.map(x =>
        `<div class="sx-row" data-id="${esc(x.id)}"><button type="button" class="sx-play" data-act="play" aria-label="Play ${esc(x.name)}" data-tip="Hear this sound">${ICON.playStop}</button>
          <div class="sx-mid"><b data-tip="${esc(x.name)}">${esc(x.name)}</b><canvas data-wave="${esc(x.id)}" aria-hidden="true"></canvas></div><span class="sx-dur">${x.dur.toFixed(2)}s</span>
          <button type="button" class="sx-add" data-act="add" aria-label="Add ${esc(x.name)} at the playhead" data-tip="Add at the playhead">${ICON.plus}</button></div>`).join("") + `</div>`;
    }
    if (!SX.list.some(hit)) html += `<div class="sx-empty">No sounds match "${esc(SX.q)}"</div>`;
    body.innerHTML = html;
    if (cur) mark(cur, true);
    waves();
  }
  const tipOff = () => { try { return localStorage.getItem("cutnote:tip:sfx") === "off"; } catch { return false; } };

  /* waveforms: decoded once per sound, used by the list and the timeline blocks */
  let actx = null;
  SX.peaksFor = id => {
    if (SX.peaks.has(id)) return SX.peaks.get(id);
    if (!SX.loading.has(id)) SX.loading.set(id, decode(id));
    return null;
  };
  async function decode(id) {
    try {
      if (!SX.list) await load();
      const x = SX.list.find(s => s.id === id); if (!x) return;
      actx = actx || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100, 44100);
      const buf = await (await fetch("/lib/" + x.file)).arrayBuffer();
      const ab = await actx.decodeAudioData(buf), ch = ab.getChannelData(0), N = 160, pk = new Float32Array(N);
      const step = Math.max(1, Math.floor(ch.length / N)); let mx = 1e-6;
      for (let i = 0; i < N; i++) { let m = 0; for (let j = i * step, e = Math.min(ch.length, j + step); j < e; j++) { const v = Math.abs(ch[j]); if (v > m) m = v; } pk[i] = m; if (m > mx) mx = m; }
      for (let i = 0; i < N; i++) pk[i] = Math.pow(pk[i] / mx, 0.7);
      SX.peaks.set(id, pk);
      if (typeof draw === "function") draw();
      const c = pane.querySelector(`canvas[data-wave="${CSS.escape(id)}"]`); if (c) waveOne(c);
    } catch {}
  }
  // frac: how far the preview has got (0..1), or null when this sound isn't playing. Played bars fill in the accent, the
  // rest stay dim, and a thin playhead line marks where the audio is.
  function waveOne(c, frac) {
    if (!c) return;
    const pk = SX.peaks.get(c.dataset.wave); if (!pk) { SX.peaksFor(c.dataset.wave); return; }
    const dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight; if (!w) return;
    const W = Math.round(w * dpr), H = Math.round(h * dpr); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const cs = getComputedStyle(document.documentElement), dim = cs.getPropertyValue("--faint").trim() || "#999";
    const on = frac != null && c.dataset.wave === cur, px = on ? Math.max(0, Math.min(1, frac)) * w : -1;
    const lit = on ? cs.getPropertyValue("--accent-text").trim() || dim : dim;
    for (let x = 0; x < w; x += 2.5) {
      const v = pk[Math.min(pk.length - 1, Math.floor(x / w * pk.length))], a = Math.max(0.6, v * (h / 2 - 1));
      g.fillStyle = x + 0.75 <= px ? lit : dim; g.fillRect(x, h / 2 - a, 1.5, a * 2);
    }
    if (on) { g.fillStyle = cs.getPropertyValue("--ink").trim() || "#000"; g.fillRect(Math.min(w - 1.5, px), 0, 1.5, h); }
  }
  function waves() { for (const c of pane.querySelectorAll("canvas[data-wave]")) waveOne(c); }
  new ResizeObserver(() => { if (pane.classList.contains("on")) waves(); }).observe(pane);

  /* preview: plays the sound from start to finish; its waveform fills in as it goes */
  const au = new Audio(); let cur = null, raf = 0;
  const rowOf = id => pane.querySelector(`.sx-row[data-id="${CSS.escape(id)}"]`);
  // currentTime moves in steps; run it on smoothly between updates so the playhead glides
  const clk = { t: -1, at: 0 };
  function nowT() {
    const t = au.currentTime || 0, now = performance.now();
    if (t !== clk.t || au.paused) { clk.t = t; clk.at = now; return t; }
    return t + Math.min(0.3, (now - clk.at) / 1000) * (au.playbackRate || 1);
  }
  function frac() { const x = SX.list && SX.list.find(s => s.id === cur), d = (isFinite(au.duration) && au.duration) || (x && x.dur) || 0; return d ? nowT() / d : 0; }
  function mark(id, on) {
    const r = rowOf(id); if (!r) return;
    r.classList.toggle("playing", on);
    const b = r.querySelector(".sx-play"), x = SX.list.find(s => s.id === id), n = x ? x.name : "";
    b.setAttribute("aria-label", (on ? "Stop " : "Play ") + n); b.dataset.tip = on ? "Stop" : "Hear this sound";
    waveOne(r.querySelector("canvas"), on ? frac() : null);
  }
  function frame() {
    raf = 0; if (!cur) return;
    const r = rowOf(cur); if (r) waveOne(r.querySelector("canvas"), frac());
    raf = requestAnimationFrame(frame);
  }
  function stopPreview() {
    au.pause(); if (raf) cancelAnimationFrame(raf); raf = 0;
    const f = cur; cur = null; if (f) mark(f, false);
  }
  function preview(id) {
    if (cur === id) { stopPreview(); return; }
    stopPreview();
    const x = SX.list.find(s => s.id === id); if (!x) return;
    cur = id; clk.t = -1; au.src = "/lib/" + x.file; au.currentTime = 0; au.play().catch(() => {});
    mark(id, true); raf = requestAnimationFrame(frame);
  }
  au.addEventListener("ended", stopPreview);
  au.addEventListener("error", () => { if (cur) { stopPreview(); toast("Couldn't play that sound"); } });   // ended never comes for a file that won't load
  function onClick(e) {
    if (e.target.closest('[data-act="tipx"]')) { try { localStorage.setItem("cutnote:tip:sfx", "off"); } catch {} e.target.closest(".lp-tip").remove(); return; }
    const row = e.target.closest(".sx-row"); if (!row || SX.dragged) return;
    const x = SX.list.find(s => s.id === row.dataset.id); if (!x) return;
    if (e.target.closest('[data-act="add"]')) { if (S.playing) pause(); sfxAdd(x, toE(S.t)); return; }
    preview(x.id);
  }

  /* drag a sound onto the timeline (that time + row) or the video (the playhead) */
  const ghost = $("#sxGhost");
  function onDown(e) {
    if (e.button !== 0 || e.target.closest("button")) return;
    const row = e.target.closest(".sx-row"); if (!row) return;
    const x = SX.list.find(s => s.id === row.dataset.id); if (!x) return;
    const x0 = e.clientX, y0 = e.clientY; let on = false; SX.dragged = false;
    const target = ev => {
      const tl = $("#tl").getBoundingClientRect(), fr = $("#frame").getBoundingClientRect();
      if (ev.clientX >= tl.left + G && ev.clientX <= tl.right && ev.clientY >= tl.top && ev.clientY <= tl.bottom) {
        const ox = ev.clientX - tl.left, oy = ev.clientY - tl.top;
        let E = Math.max(0, Math.min(progDur(), T(ox))); const sn = snapE(E); E = sn.E;
        const g = (TL.geom || []).find(g => g.ln.type === "sfx" && oy >= g.y - 2 && oy < g.y + g.h + 2);
        return { where: "tl", E, row: g ? g.ln.row : null, label: "at " + fmt(E) };
      }
      if (ev.clientX >= fr.left && ev.clientX <= fr.right && ev.clientY >= fr.top && ev.clientY <= fr.bottom) return { where: "video", E: toE(S.t), row: null, label: "at the playhead" };
      return null;
    };
    const mv = ev => {
      if (!on && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      if (!on) { on = true; SX.dragged = true; document.body.style.cursor = "grabbing"; }
      const t = target(ev);
      ghost.style.display = "inline-flex"; ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px";
      ghost.classList.toggle("bad", !t); ghost.textContent = t ? `${x.name} · ${t.label}` : x.name;
      TL.dropE = t && t.where === "tl" ? t.E : null;
      draw();
    };
    const up = ev => {
      removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      ghost.style.display = "none"; document.body.style.cursor = ""; TL.dropE = null;
      if (on) { const t = target(ev); if (t) sfxAdd(x, t.E, t.row); else draw(); }
      setTimeout(() => { SX.dragged = false; }, 0);
    };
    addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  }
  // the Sounds tab was open last time and library.js showed it before this file loaded: fill it now
  if (window.SidePane && SidePane.cur === "sfx") SX.open();
  // warm the waveforms of sounds already on the timeline
  setTimeout(() => { load().then(() => { for (const it of sfxItems()) SX.peaksFor(it.id); }).catch(() => {}); }, 400);
})();
