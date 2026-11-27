"use strict";
/* Music tab: the tracks an assistant picked for this video. They live in Music/ inside the opened folder, described by
   Music/music.json (title, artist, BPM, mood, source, why it fits); any audio file there shows up even without an entry.
   Play auditions a track WITH the video: the video plays from the playhead and the track plays as if it started at 0:00.
   Add (or drag onto the timeline) puts it on the Music track. Placed music is a sound item (S.ed.sfx, kind "music"): it
   moves, trims, slips, splits with the blade, has volume and fades in the Sound panel, plays live, Export cut mixes it
   in, and the notes describe it for whoever bakes it into a build. */
(() => {
  const MD = (window.MusicDrawer = { list: null, data: null, sig: "", peaks: new Map(), loading: new Set() });
  const pane = $("#pMusic"); if (!pane) return;
  const LEVEL = 0.25, FADE_OUT = 1.5;   // what a track gets when it's added, and the level it's auditioned at
  const css = `
  #pMusic .mu-body { padding: 0 12px 16px; overflow: auto; flex: 1; min-height: 0; }
  #pMusic .mu-bar { display: flex; align-items: center; gap: 8px; min-width: 0; }
  #pMusic .mu-bar b { font-size: 13px; font-weight: 700; white-space: nowrap; }
  #pMusic .mu-bar span { color: var(--faint); font-size: 12px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #pMusic .mu-ref { margin-left: auto; flex: none; height: 28px; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; border: 1px solid var(--line);
    background: var(--panel); color: var(--dim); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
  #pMusic .mu-ref:hover { color: var(--ink); border-color: var(--line-2); }
  #pMusic .mu-ref svg { width: 13px; height: 13px; }
  #pMusic .mu-ref.spin svg { animation: muSpin .7s linear infinite; }
  @keyframes muSpin { to { transform: rotate(360deg); } }
  #pMusic .mu-list { display: grid; gap: 8px; margin-top: 12px; }
  /* rings are inset so the scroll box can never cut them off */
  .mu-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: start; gap: 10px; padding: 9px 8px; border-radius: 12px;
    background: var(--panel); box-shadow: inset 0 0 0 1px var(--line); cursor: grab; user-select: none; transition: box-shadow .15s, background .15s; }
  .mu-row:hover { box-shadow: inset 0 0 0 1.5px var(--line-2); background: color-mix(in srgb, var(--ink) 3%, var(--panel)); }
  .mu-row.playing { box-shadow: inset 0 0 0 1.5px var(--accent-text); background: color-mix(in srgb, var(--accent) 8%, var(--panel)); }
  .mu-play { position: relative; width: 34px; height: 34px; border-radius: 50%; border: 0; padding: 0; display: grid; place-items: center; cursor: pointer;
    background: var(--play-bg, var(--accent)); color: var(--play-ink, #0b0b0b); box-shadow: 0 1px 2px rgba(0,0,0,.14);
    transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease; }
  .mu-play:hover { transform: scale(1.07); box-shadow: 0 0 14px 2px var(--play-glow, color-mix(in srgb, var(--accent) 45%, transparent)), 0 1px 2px rgba(0,0,0,.14); }
  .mu-play:active { transform: scale(.9); transition-duration: .09s; }
  .mu-row.playing .mu-play { box-shadow: 0 0 10px 1px var(--play-glow, color-mix(in srgb, var(--accent) 45%, transparent)), 0 1px 2px rgba(0,0,0,.14); }
  .mu-play svg { grid-area: 1 / 1; width: 14px; height: 14px; transition: opacity .2s ease, transform .3s cubic-bezier(.22,1,.36,1); }
  .mu-play .i-play { transform: none; }
  .mu-play .i-stop { opacity: 0; transform: scale(.4) rotate(-90deg); }
  .mu-row.playing .mu-play .i-play { opacity: 0; transform: scale(.4) rotate(90deg); }
  .mu-row.playing .mu-play .i-stop { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) { .mu-play, .mu-play svg { transition: opacity .12s linear; } .mu-play:hover, .mu-play:active { transform: none; } .mu-play svg, .mu-row.playing .mu-play svg { transform: none; } }
  .mu-mid { min-width: 0; display: grid; gap: 4px; }
  .mu-mid > b { font-size: 13px; font-weight: 650; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mu-meta { display: flex; min-width: 0; font-size: 11.5px; color: var(--dim); line-height: 1.35; white-space: nowrap; }
  .mu-meta .a { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mu-meta .n { flex: none; white-space: nowrap; font-variant-numeric: tabular-nums; }
  /* at most two pills, on one line: two moods, or one mood and "On the timeline" */
  .mu-chips { display: flex; flex-wrap: nowrap; gap: 4px; min-width: 0; overflow: hidden; }
  .mu-chips:not(:has(span:not([hidden]))) { display: none; }
  .mu-chips span { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; line-height: 16px; padding: 1px 7px; border-radius: 999px;
    background: var(--panel-2); border: 1px solid var(--line); color: var(--dim); }
  .mu-chips .on { flex: none; background: var(--music-soft); border-color: transparent; color: var(--music-text); font-weight: 600; }
  .mu-row.placed .mu-chips .m2 { display: none; }
  /* the waveform is a scrubber: press or drag on it to hear that part of the track */
  .mu-mid canvas { width: 100%; height: 22px; display: block; margin-top: 2px; cursor: pointer; touch-action: none; border-radius: 4px; }
  .mu-mid canvas:hover { background: color-mix(in srgb, var(--ink) 4%, transparent); }
  body.mu-scrubbing, body.mu-scrubbing * { cursor: ew-resize !important; }
  .mu-add { height: 30px; padding: 0 10px 0 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); display: inline-flex; align-items: center; gap: 5px;
    cursor: pointer; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .mu-add:hover { border-color: var(--line-2); background: var(--raise); }
  .mu-add svg { width: 13px; height: 13px; }
  .mu-empty { display: grid; justify-items: center; gap: 8px; text-align: center; padding: 34px 14px 20px; color: var(--dim); font-size: 12.5px; line-height: 1.5; }
  .mu-empty i { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--music-soft); color: var(--music-text); }
  .mu-empty i svg { width: 20px; height: 20px; }
  .mu-empty b { color: var(--ink); font-size: 13.5px; }
  .mu-empty small { color: var(--faint); font-size: 11.5px; }
  .mu-note { margin: 12px 0 0; padding: 8px 10px; border-radius: 9px; background: var(--panel-2); border: 1px solid var(--line); color: var(--dim); font-size: 11.5px; line-height: 1.45; overflow-wrap: anywhere; }
  #muGhost { position: fixed; z-index: 400; pointer-events: none; padding: 7px 12px 7px 10px; border-radius: 10px; background: var(--music); color: var(--music-ink); font: 600 12px -apple-system, system-ui, sans-serif;
    box-shadow: 0 10px 28px rgba(0,0,0,.25); display: none; align-items: center; gap: 6px; transform: translate(-50%, -130%); white-space: nowrap; max-width: 320px; overflow: hidden; text-overflow: ellipsis; }
  #muGhost.bad { background: var(--panel-2); color: var(--dim); }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  document.body.insertAdjacentHTML("beforeend", `<div id="muGhost"></div>`);
  const ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 6.2v11.6a1 1 0 0 0 1.53.85l9.2-5.8a1 1 0 0 0 0-1.7l-9.2-5.8A1 1 0 0 0 8 6.2z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>',
    playStop: '<svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 6.2v11.6a1 1 0 0 0 1.53.85l9.2-5.8a1 1 0 0 0 0-1.7l-9.2-5.8A1 1 0 0 0 8 6.2z"/></svg><svg class="i-stop" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    ref: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 11-2.34-5.66"/><path d="M20 4v5h-5"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  };
  const mmss = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const byFile = f => (MD.list || []).find(t => t.file === f) || null;

  /* ---------- the list: fetched when the tab opens, then every few seconds while it shows ---------- */
  async function load(quiet) {
    const btn = pane.querySelector(".mu-ref"); if (btn && !quiet) btn.classList.add("spin");
    try {
      const j = await api("/api/music");
      const sig = JSON.stringify(j);
      if (sig !== MD.sig) {
        // a file that changed gets its waveform again
        for (const t of j.tracks || []) { const o = byFile(t.file); if (o && (o.mtime !== t.mtime || o.size !== t.size)) { MD.peaks.delete(t.file); MD.loading.delete(t.file); } }
        MD.sig = sig; MD.data = j; MD.list = j.tracks || []; paint();
      }
    } catch { if (!MD.list) { MD.data = { tracks: [] }; MD.list = []; paint(); } }
    finally { if (btn) setTimeout(() => btn.classList.remove("spin"), 250); }
  }
  MD.open = () => {
    if (!pane.dataset.built) {
      pane.dataset.built = "1";
      pane.innerHTML = `<div class="lp-head"><div class="mu-bar"><b>Music</b><span data-count></span><button type="button" class="mu-ref" data-act="ref" data-tip="Look for new tracks in the Music folder">${ICON.ref}Refresh</button></div></div><div class="mu-body" data-body></div>`;
      pane.addEventListener("click", onClick);
      pane.querySelector("[data-body]").addEventListener("pointerdown", onDown);
    }
    load(true);
  };
  MD.refresh = () => load(false);
  setInterval(() => { if (pane.classList.contains("on") && !document.hidden && !dragging) load(true); }, 4000);
  addEventListener("focus", () => { if (pane.classList.contains("on")) load(true); });

  function paint() {
    const body = pane.querySelector("[data-body]"); if (!body) return;
    const d = MD.data || {}, list = MD.list || [];
    pane.querySelector("[data-count]").textContent = list.length ? list.length + (list.length === 1 ? " track" : " tracks") : "";
    let html = "";
    if (!list.length) {
      html = `<div class="mu-empty"><i>${ICON.note}</i><b>No music yet</b><span>Ask Claude to find music for this video. Tracks it picks appear here.</span>
        <small>Claude saves them in a Music folder inside the folder Cutnote opened.</small></div>`;
    } else {
      if (!tipOff()) html += `<div class="lp-tip"><span>Press play to hear a track with your video, from the playhead. Click or drag along a waveform to hear that part. <b>Add</b> puts it on the Music track from the start, or drag it to where it should begin.</span><button type="button" data-act="tipx" aria-label="Hide tip" data-tip="Hide this tip">×</button></div>`;
      html += `<div class="mu-list">` + list.map(rowHtml).join("") + `</div>`;
    }
    if (d.error) html += `<p class="mu-note">${esc(d.error)}</p>`;
    if ((d.skipped || []).length) html += `<p class="mu-note">Not shown: ${d.skipped.map(n => "“" + esc(n) + "”").join(", ")}. Rename ${d.skipped.length === 1 ? "it" : "them"} using letters, digits, spaces and - _ ( ) &amp; ' . , only.</p>`;
    body.innerHTML = html;
    if (cur) mark(cur, true);
    placedSync(true); waves();
  }
  function rowHtml(t) {
    const nums = [t.bpm ? Math.round(t.bpm) + " BPM" : "", t.dur ? mmss(t.dur) : ""].filter(Boolean).join(" · ");
    const meta = t.artist ? `<span class="a">${esc(t.artist)}</span>${nums ? `<span class="n">&nbsp;· ${nums}</span>` : ""}` : `<span class="n">${nums}</span>`;
    const metaTip = [t.artist, nums].filter(Boolean).join(" · ");
    const chips = (t.mood || []).slice(0, 2).map((m, i) => `<span${i ? ' class="m2"' : ""}>${esc(m)}</span>`).join("") + `<span class="on" data-on hidden>On the timeline</span>`;
    return `<div class="mu-row" data-f="${esc(t.file)}"${t.why ? ` data-tip-always data-tip="${esc(t.why)}"` : ""}><button type="button" class="mu-play" data-act="play" aria-label="Play ${esc(t.title)} with your video" data-tip="Play with your video, from the playhead">${ICON.playStop}</button>
      <div class="mu-mid"><b>${esc(t.title)}</b>${nums || t.artist ? `<div class="mu-meta" data-tip="${esc(metaTip)}">${meta}</div>` : ""}<div class="mu-chips">${chips}</div>
        <canvas data-wave="${esc(t.file)}" aria-hidden="true"></canvas></div>
      <button type="button" class="mu-add" data-act="add" aria-label="Add ${esc(t.title)} to the Music track" data-tip="Put it on the Music track from 0:00">${ICON.plus}Add</button></div>`;
  }
  const tipOff = () => { try { return localStorage.getItem("cutnote:tip:music") === "off"; } catch { return false; } };
  // "On the timeline" beside tracks already placed
  const fileKey = f => { f = String(f || ""); try { f = decodeURIComponent(f); } catch {} return f.replace(/\\/g, "/").split("/").pop().toLowerCase(); };
  let placedSig = null;
  function placedSync(force) {
    const on = new Set(sfxItems().filter(x => x.kind === "music").map(x => fileKey(x.file)));
    const sig = [...on].sort().join("|"); if (!force && sig === placedSig) return; placedSig = sig;
    for (const r of pane.querySelectorAll(".mu-row")) { const p = on.has(fileKey(r.dataset.f)), s = r.querySelector("[data-on]"); if (s) s.hidden = !p; r.classList.toggle("placed", p); }
  }
  // edits, undo / redo and the saved edits arriving after the list all change what's placed: check a few times a second
  setInterval(() => { if (pane.classList.contains("on")) placedSync(); }, 300);

  /* ---------- waveforms: from the server (ffmpeg), one per file, shared by the list and the timeline ---------- */
  MD.peaksFor = file => {
    if (!file) return null;
    if (MD.peaks.has(file)) return MD.peaks.get(file);
    if (!MD.loading.has(file)) { MD.loading.add(file); fetchWave(file); }
    return null;
  };
  async function fetchWave(file) {
    try {
      const r = await fetch("/api/music/wave?file=" + encodeURIComponent(file)); if (!r.ok) return;
      const j = await r.json(), src = j.peaks || []; if (!src.length) return;
      let mx = 1; for (const v of src) if (v > mx) mx = v;
      const pk = new Float32Array(src.length); for (let i = 0; i < src.length; i++) pk[i] = src[i] / mx;
      MD.peaks.set(file, pk);
      if (typeof draw === "function") draw();
      const c = pane.querySelector(`canvas[data-wave="${CSS.escape(file)}"]`); if (c) waveOne(c);
    } catch {}
  }
  // the track being auditioned shows how far it has got: played bars in the accent, the rest dim, a thin playhead line
  function waveOne(c) {
    if (!c) return;
    const pk = MD.peaks.get(c.dataset.wave); if (!pk) { MD.peaksFor(c.dataset.wave); return; }
    const dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight; if (!w) return;
    const W = Math.round(w * dpr), H = Math.round(h * dpr); if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const cs = getComputedStyle(document.documentElement), dim = cs.getPropertyValue("--faint").trim() || "#999";
    let px = -1;
    if (cur && aud && c.dataset.wave === cur) { const t = byFile(cur), d = (t && t.dur) || au.duration || 0; if (d > 0) px = Math.max(0, Math.min(1, playAt() / d)) * w; }
    const lit = px >= 0 ? cs.getPropertyValue("--accent-text").trim() || dim : dim;
    for (let x = 0; x < w; x += 2.5) {
      const a0 = Math.floor(x / w * pk.length), a1 = Math.max(a0 + 1, Math.floor((x + 2.5) / w * pk.length)); let v = 0;
      for (let i = a0; i < a1 && i < pk.length; i++) if (pk[i] > v) v = pk[i];
      const a = Math.max(0.6, v * (h / 2 - 1)); g.fillStyle = x + 0.75 <= px ? lit : dim; g.fillRect(x, h / 2 - a, 1.5, a * 2);
    }
    if (px >= 0) { g.fillStyle = cs.getPropertyValue("--ink").trim() || "#000"; g.fillRect(Math.min(w - 1.5, px), 0, 1.5, h); }
  }
  function waves() { for (const c of pane.querySelectorAll("canvas[data-wave]")) waveOne(c); }
  new ResizeObserver(() => { if (pane.classList.contains("on")) waves(); }).observe(pane);

  /* ---------- audition: the track plays with the video, in sync, as if it started at 0:00 of the edit ---------- */
  const au = new Audio(); au.preload = "auto";
  // the file being auditioned; aud = { t0, seen, video, off, hold, scrub }. off: where in the track the video's 0:00 lands
  // (scrubbing changes it, never the video); hold: the scrub point while the pointer is down
  let cur = null, aud = null, loop = 0;
  // currentTime moves in steps; run it on smoothly between updates so the playhead glides
  const clk = { t: -1, at: 0 };
  function auT() {
    const t = au.currentTime || 0, now = performance.now();
    if (t !== clk.t || au.paused) { clk.t = t; clk.at = now; return t; }
    return t + Math.min(0.3, (now - clk.at) / 1000) * (au.playbackRate || 1);
  }
  const playAt = () => !aud ? 0 : aud.hold != null ? aud.hold : aud.video ? toE(liveT()) + (aud.off || 0) : auT();
  function mark(file, on) {
    const r = pane.querySelector(`.mu-row[data-f="${CSS.escape(file)}"]`); if (!r) return;
    r.classList.toggle("playing", on);
    const b = r.querySelector(".mu-play"), t = byFile(file);
    b.setAttribute("aria-label", (on ? "Stop " : "Play ") + (t ? t.title : "") + (on ? "" : " with your video"));
    b.dataset.tip = on ? "Stop" : "Play with your video, from the playhead";
    const c = r.querySelector("canvas"); if (c) waveOne(c);
  }
  // stop the audition; pauseVideo: the person pressed Stop, so the video stops too
  function stopAudition(pauseVideo) {
    if (!cur) return;
    const f = cur; cur = null; const hadVideo = aud && aud.video; aud = null;
    au.pause(); TL.audition = false; mark(f, false);
    if (pauseVideo && hadVideo && S.playing) pause();
  }
  MD.stop = () => stopAudition(true);
  // at: start from that point of the track (a click on its waveform) instead of in step with the playhead
  function audition(t, at) {
    if (cur === t.file) { if (at == null) stopAudition(true); else seekTrack(at, true); return; }
    stopAudition(false);
    cur = t.file; TL.audition = true; clk.t = -1;
    au.src = t.url; au.volume = LEVEL; au.playbackRate = 1;
    const video = !!(S.player && S.comp && progDur() > 0);
    aud = { t0: performance.now(), seen: false, video, off: at != null ? at - toE(S.t) : 0, hold: null, scrub: false };
    if (video) { if (!S.playing) play(); }
    else { try { au.currentTime = at || 0; } catch {} au.play().catch(() => {}); }
    mark(t.file, true);
    if (video && at == null && t.dur && toE(S.t) >= t.dur - 0.05) toast(`The playhead is past the end of this track (${mmss(t.dur)}): move it earlier to hear it`);
    const id = ++loop; requestAnimationFrame(() => tick(id));
  }
  // jump the audition to point `at` of the track; while dragging the seeks are spaced out so the audio doesn't stutter
  let lastSeek = 0;
  function seekTrack(at, now) {
    if (!cur || !aud) return;
    const t = byFile(cur), d = (t && t.dur) || au.duration || 0;
    at = Math.max(0, d ? Math.min(d - 0.05, at) : at);
    if (aud.video) aud.off = at - toE(liveT());
    const ms = performance.now(); if (!now && ms - lastSeek < 70) return;
    lastSeek = ms; clk.t = -1;
    try { au.currentTime = at; } catch {}
    if (au.paused && (!aud.video || S.playing)) au.play().catch(() => {});
  }
  au.addEventListener("ended", () => { if (cur && aud && !aud.video && !aud.scrub) stopAudition(false); });
  au.addEventListener("error", () => { if (cur) { stopAudition(false); toast("Couldn't play that track"); } });   // a file that won't load never ends
  function tick(id) {
    if (!cur || !aud || id !== loop) return;   // a newer audition has its own loop
    const t = byFile(cur);
    if (aud.video) {
      if (S.playing) aud.seen = true;
      else if (aud.seen || performance.now() - aud.t0 > 2500) { stopAudition(false); return; }   // paused (Space, the transport, the end of the video)
      const P = toE(liveT()) + (aud.off || 0), d = (t && t.dur) || au.duration || 0;
      if (aud.scrub) { /* the scrub does its own seeking */ }
      else if (S.playing && P >= 0 && (!d || P < d - 0.05)) {
        if (Math.abs(au.playbackRate - S.rate) > 1e-3) au.playbackRate = S.rate;
        if (au.paused) { try { au.currentTime = P; } catch {} au.play().catch(() => {}); }
        else if (Math.abs(au.currentTime - P) > 0.25 * Math.max(1, S.rate)) { try { au.currentTime = P; } catch {} }
      } else if (!au.paused) au.pause();   // outside the track: the video plays on without it
    }
    const c = pane.querySelector(`.mu-row.playing canvas`); if (c) waveOne(c);
    requestAnimationFrame(() => tick(id));
  }
  // switching version or project ends an audition
  addEventListener("pagehide", () => stopAudition(false));

  /* ---------- placing a track on the Music track ---------- */
  function freeRow(E, dur) {
    const ms = sfxItems().filter(x => x.kind === "music");
    const busy = r => ms.some(it => (it.row || 0) === r && E < toE(it.start) + it.dur - 1e-3 && E + dur > toE(it.start) + 1e-3);
    return !busy(0) ? 0 : !busy(1) ? 1 : 0;
  }
  // add track t at program time E (default 0:00): as long as the track, or up to the end of the video
  function musicAdd(t, E, row) {
    if (!S.comp) { toast("Pick a version first"); return; }
    if (S.comp.kind === "video" && S.info.layout !== "folder") { toast("Music needs the live version or a plain video"); return; }
    if (!(t.dur > 0)) { toast("Couldn't read how long this track is"); return; }
    const PD = progDur(); if (!(PD > 0)) { toast("The video hasn't loaded yet"); return; }
    E = Math.max(0, Math.min(Math.max(0, PD - 0.05), E || 0));
    const dur = +Math.max(0.05, Math.min(t.dur, PD - E)).toFixed(4);
    if (row == null || row > 1) row = freeRow(E, dur);
    // an audition of this track hands over to the placed clip: same place in the song, same level
    if (cur) stopAudition(false);
    const it = { u: Math.random().toString(36).slice(2, 10), kind: "music", id: "music", name: t.title, file: t.file, start: +toS(E).toFixed(4), dur, len: +t.dur.toFixed(4), off: 0, vol: LEVEL, row };
    if (t.artist) it.artist = t.artist;
    const fo = Math.min(FADE_OUT, dur / 2); if (fo > 0) it.fadeOut = +fo.toFixed(3);
    tlBegin(); S.ed = S.ed || { segments: null, clips: {} }; S.ed.sfx = S.ed.sfx || []; S.ed.sfx.push(it);
    TL.sel = { kind: "clip", key: "sfx:" + it.u };
    tlCommit(); MD.peaksFor(t.file); placedSync(true);
    toast(`Added "${t.title}" at ${fmt(E)} on the Music track: ${Math.round(LEVEL * 100)}% volume, fades out over ${fo.toFixed(1)} s`);
  }
  MD.add = musicAdd;

  function onClick(e) {
    if (e.target.closest('[data-act="ref"]')) { MD.refresh(); return; }
    if (e.target.closest('[data-act="tipx"]')) { try { localStorage.setItem("cutnote:tip:music", "off"); } catch {} e.target.closest(".lp-tip").remove(); return; }
    const row = e.target.closest(".mu-row"); if (!row || MD.dragged) return;
    const t = byFile(row.dataset.f); if (!t) return;
    if (e.target.closest('[data-act="add"]')) { musicAdd(t, 0); return; }
    if (e.target.closest('[data-act="play"]')) audition(t);
  }

  /* ---------- drag a track onto the timeline (that time, that Music row) or the video (from the start) ---------- */
  const ghost = $("#muGhost");
  let dragging = false;
  // press or drag on a waveform: hear that part of the track (starts it there if it isn't playing)
  function scrub(e, c) {
    const row = c.closest(".mu-row"), t = row && byFile(row.dataset.f); if (!t || !(t.dur > 0)) return;
    e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch {}
    const at = ev => { const r = c.getBoundingClientRect(); return (r.width ? Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) : 0) * t.dur; };
    let a = at(e);
    audition(t, a); if (cur !== t.file || !aud) return;
    const mine = aud; mine.hold = a; mine.scrub = true; dragging = true; document.body.classList.add("mu-scrubbing"); waveOne(c);
    const mv = ev => { if (aud !== mine) return; a = at(ev); mine.hold = a; seekTrack(a); waveOne(c); };
    const up = ev => {
      c.removeEventListener("pointermove", mv); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up);
      document.body.classList.remove("mu-scrubbing"); dragging = false;
      if (aud !== mine) return;
      if (ev.type === "pointerup") a = at(ev);
      seekTrack(a, true); mine.hold = null; mine.scrub = false; waveOne(c);
    };
    c.addEventListener("pointermove", mv); c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
  }
  function onDown(e) {
    if (e.button !== 0 || e.target.closest("button")) return;
    const wv = e.target.closest("canvas[data-wave]"); if (wv) { scrub(e, wv); return; }
    const row = e.target.closest(".mu-row"); if (!row) return;
    const t = byFile(row.dataset.f); if (!t) return;
    const x0 = e.clientX, y0 = e.clientY; let on = false; MD.dragged = false;
    const target = ev => {
      const tl = $("#tl").getBoundingClientRect(), fr = $("#frame").getBoundingClientRect();
      if (ev.clientX >= tl.left + G && ev.clientX <= tl.right && ev.clientY >= tl.top && ev.clientY <= tl.bottom) {
        const ox = ev.clientX - tl.left, oy = ev.clientY - tl.top;
        let E = Math.max(0, Math.min(progDur(), T(ox))); E = snapE(E).E;
        const g = (TL.geom || []).find(g => g.ln.type === "music" && oy >= g.y - 2 && oy < g.y + g.h + 2);
        return { E, row: g ? g.ln.row : null, label: "from " + fmt(E) };
      }
      if (ev.clientX >= fr.left && ev.clientX <= fr.right && ev.clientY >= fr.top && ev.clientY <= fr.bottom) return { E: 0, row: null, label: "from the start" };
      return null;
    };
    const mv = ev => {
      if (!on && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      if (!on) { on = true; dragging = MD.dragged = true; document.body.style.cursor = "grabbing"; TL.musicDrop = true; layoutLanes(); }
      const tg = target(ev);
      ghost.style.display = "inline-flex"; ghost.style.left = ev.clientX + "px"; ghost.style.top = ev.clientY + "px";
      ghost.classList.toggle("bad", !tg); ghost.textContent = tg ? `${t.title} · ${tg.label}` : t.title;
      TL.dropE = tg && tg.label !== "from the start" ? tg.E : null;
      draw();
    };
    const up = ev => {
      removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
      ghost.style.display = "none"; document.body.style.cursor = ""; TL.dropE = null;
      if (on) { const tg = ev.type === "pointerup" ? target(ev) : null; TL.musicDrop = false; layoutLanes(); if (tg) musicAdd(t, tg.E, tg.row); else draw(); }
      dragging = false; setTimeout(() => { MD.dragged = false; }, 0);
    };
    addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  }

  // library.js shows the Music pane; if it asked before this file loaded (the tab was open last time), open now
  if (window.SidePane && SidePane.cur === "music") MD.open();
})();
