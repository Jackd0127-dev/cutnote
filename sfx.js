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
  .sx-row { display: grid; grid-template-columns: 34px 1fr auto 30px; align-items: center; gap: 10px; padding: 7px 7px 7px 7px; border-radius: 11px;
    background: var(--panel); box-shadow: 0 0 0 1px var(--line); cursor: grab; user-select: none; transition: box-shadow .15s, background .15s; }
  .sx-row:hover { box-shadow: 0 0 0 1.5px var(--line-2), 0 6px 18px rgba(0,0,0,.08); }
  .sx-row.playing { box-shadow: 0 0 0 1.5px #ffa53d; background: color-mix(in srgb, #ffa53d 7%, var(--panel)); }
  .sx-play { width: 34px; height: 34px; border-radius: 50%; border: 0; display: grid; place-items: center; background: color-mix(in srgb, #ffa53d 18%, var(--panel-2)); color: #c26a00; cursor: pointer; }
  [data-theme="dark"] .sx-play { color: #ffb661; }
  .sx-play svg { width: 14px; height: 14px; }
  .sx-play:hover { background: color-mix(in srgb, #ffa53d 30%, var(--panel-2)); }
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
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 001.5.86l10.5-6.5a1 1 0 000-1.72L9.5 4.64A1 1 0 008 5.5z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>',
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
    pane.querySelector("[data-chips]").addEventListener("click", e => { const b = e.target.closest("button[data-c]"); if (b) { SX.cat = b.dataset.c; paint(); } });
    pane.querySelector("[data-body]").addEventListener("click", onClick);
    pane.querySelector("[data-body]").addEventListener("pointerdown", onDown);
    paint();
  };
  function paint() {
    const chips = pane.querySelector("[data-chips]"), body = pane.querySelector("[data-body]");
    const count = c => SX.list.filter(x => c === "All" || x.category === c).length;
    chips.innerHTML = ["All", ...SX.cats].map(c => `<button type="button" data-c="${esc(c)}" class="${c === SX.cat ? "on" : ""}">${esc(c)}<i>${count(c)}</i></button>`).join("");
    const q = SX.q, hit = x => (SX.cat === "All" || x.category === SX.cat) && (!q || (x.name + " " + x.category + " " + (x.tags || []).join(" ")).toLowerCase().includes(q));
    let html = "";
    if (!tipOff()) html += `<div class="lp-tip"><span>Click a sound to hear it. Drag it onto the timeline, or press <b>+</b> to add it at the playhead.</span><button type="button" data-act="tipx" aria-label="Hide tip">×</button></div>`;
    for (const c of SX.cats) {
      const xs = SX.list.filter(x => x.category === c && hit(x)); if (!xs.length) continue;
      html += `<div class="lp-sec">${esc(c)}<span>${xs.length}</span></div><div class="sx-list">` + xs.map(x =>
        `<div class="sx-row" data-id="${esc(x.id)}" title=""><button type="button" class="sx-play" data-act="play" aria-label="Play ${esc(x.name)}">${ICON.play}</button>
          <div class="sx-mid"><b>${esc(x.name)}</b><canvas data-wave="${esc(x.id)}"></canvas></div><span class="sx-dur">${x.dur.toFixed(2)}s</span>
          <button type="button" class="sx-add" data-act="add" aria-label="Add ${esc(x.name)} at the playhead">${ICON.plus}</button></div>`).join("") + `</div>`;
    }
    if (!SX.list.some(hit)) html += `<div class="sx-empty">No sounds match "${esc(SX.q)}"</div>`;
    body.innerHTML = html;
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
  function waveOne(c) {
    const pk = SX.peaks.get(c.dataset.wave); if (!pk) { SX.peaksFor(c.dataset.wave); return; }
    const dpr = devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight; if (!w) return;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--faint").trim() || "#999";
    const playing = c.closest(".sx-row.playing"); if (playing) g.fillStyle = "#ffa53d";
    for (let x = 0; x < w; x += 2.5) { const v = pk[Math.min(pk.length - 1, Math.floor(x / w * pk.length))], a = Math.max(0.6, v * (h / 2 - 1)); g.fillRect(x, h / 2 - a, 1.5, a * 2); }
  }
  function waves() { for (const c of pane.querySelectorAll("canvas[data-wave]")) waveOne(c); }
  new ResizeObserver(() => { if (pane.classList.contains("on")) waves(); }).observe(pane);

  /* preview */
  const au = new Audio(); let cur = null;
  function stopPreview() { au.pause(); if (cur) { const r = pane.querySelector(`.sx-row[data-id="${CSS.escape(cur)}"]`); if (r) { r.classList.remove("playing"); r.querySelector(".sx-play").innerHTML = ICON.play; waveOne(r.querySelector("canvas")); } } cur = null; }
  function preview(id) {
    if (cur === id) { stopPreview(); return; }
    stopPreview();
    const x = SX.list.find(s => s.id === id); if (!x) return;
    cur = id; au.src = "/lib/" + x.file; au.currentTime = 0; au.play().catch(() => {});
    const r = pane.querySelector(`.sx-row[data-id="${CSS.escape(id)}"]`); if (r) { r.classList.add("playing"); r.querySelector(".sx-play").innerHTML = ICON.stop; waveOne(r.querySelector("canvas")); }
  }
  au.addEventListener("ended", stopPreview);
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
  // warm the waveforms of sounds already on the timeline
  setTimeout(() => { load().then(() => { for (const it of sfxItems()) SX.peaksFor(it.id); }).catch(() => {}); }, 400);
})();
