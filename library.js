/* Library and Captions for the review player.
 *
 * The sidebar has three tabs: Notes, Library, Captions. Library and Captions list the components in
 * library/components (switch collections with the dropdown); every card loops a live preview.
 *
 * Drag a card onto the video (or the timeline), or open it and press Add: it is saved at once as a note with the
 * component attached, and it shows straight away:
 *   - on the video: it plays live at that moment (mounted into the composition's own timeline), with a neon outline you
 *     can drag to move it, and a chip saying Claude builds it on the next run;
 *   - on the timeline: a neon block on the Library lane plus a neon band over the time it plays. Drag the block to
 *     retime it, drag its right edge to make it longer or shorter, × removes it.
 * A caption style applies to the whole video: one at a time, shown in magenta across the whole timeline and around the
 * caption area. The notes carry everything Claude needs (component, params, time, position); review.py writes them
 * into review-notes.md. New component folders appear by themselves. */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const NEON = "#39ff88", PINK = "#ff3fd8";
  const D = (window.LibDrawer = { seen: {}, previews: new Map(), coll: { lib: "", cap: "" }, q: "", detail: { lib: null, cap: null }, measured: new Map(), drag: null });

  /* ---------- styles ---------- */
  const css = `
  .lp-head { display: flex; flex-direction: column; gap: 8px; padding: 12px 12px 10px; border-bottom: 1px solid var(--line); flex: none; }
  .lp-head .row { display: flex; gap: 8px; align-items: center; }
  .lp-head .dd { flex: 1; min-width: 0; }
  .lp-head .dd .dd-btn { width: 100%; }
  .lp-head input[type=search] { flex: 1; min-width: 0; height: 32px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); }
  .lp-head .hint { margin: 0; font-size: 11.5px; color: var(--dim); }
  .lp-body { flex: 1; min-height: 0; overflow: auto; padding: 12px; }
  .lp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .lp-sec { grid-column: 1 / -1; display: flex; align-items: baseline; gap: 8px; margin: 6px 2px 0; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--dim); }
  .lp-sec:first-child { margin-top: 0; }
  .lp-sec span { font-weight: 500; letter-spacing: 0; text-transform: none; }
  .lp-card { position: relative; border: 1px solid var(--line); border-radius: 12px; padding: 6px; background: var(--panel); cursor: grab; user-select: none;
    transition: border-color .15s, transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s; }
  .lp-card:hover { border-color: var(--line-2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .lp-card:active { cursor: grabbing; }
  .lp-card .pv { width: 100%; aspect-ratio: 4/5; pointer-events: none; border-radius: 9px; overflow: hidden; background: var(--panel-2); }
  .lp-card b { display: block; font-size: 12.5px; font-weight: 600; margin: 7px 3px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lp-card small { display: block; font-size: 11px; color: var(--dim); margin: 1px 3px 2px; }
  .lp-card.on { border-color: ${PINK}; box-shadow: 0 0 0 2px rgba(255,63,216,.25); }
  .lp-card .tag { position: absolute; top: 12px; left: 12px; z-index: 2; padding: 3px 8px; border-radius: 10px; background: ${PINK}; color: #fff; font-size: 10.5px; font-weight: 700; }
  .lp-empty { color: var(--dim); text-align: center; padding: 36px 10px; }
  .lp-det .back { margin-bottom: 12px; }
  .lp-det .big { width: 220px; margin: 0 auto 14px; }
  .lp-det h2 { margin: 0 0 4px; font-size: 15px; }
  .lp-det p { margin: 0 0 12px; color: var(--dim); font-size: 12.5px; }
  .lp-det .f { margin: 0 0 9px; }
  .lp-det .f label { display: block; font-size: 11.5px; color: var(--dim); margin-bottom: 3px; }
  .lp-det .f input, .lp-det .f textarea, .lp-det .f select { width: 100%; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); border-radius: 7px; padding: 6px 8px; font: 12px ui-monospace, Menlo, monospace; }
  .lp-det .f input[type=checkbox] { width: auto; }
  .lp-det .f textarea { min-height: 58px; resize: vertical; }
  .lp-det .row { display: flex; gap: 8px; margin-top: 12px; }
  .lp-det .row button { flex: 1; height: 34px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); cursor: pointer; font-weight: 600; }
  .lp-det .row button.b { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .lp-det pre { margin: 12px 0 0; padding: 8px; border-radius: 8px; background: var(--panel-2); border: 1px solid var(--line); color: var(--dim); font-size: 11px; white-space: pre-wrap; word-break: break-word; }
  .lp-det .go { width: 100%; height: 36px; margin: 2px 0 14px; border: 0; border-radius: 9px; background: var(--accent); color: var(--accent-ink); font-weight: 700; cursor: pointer; }
  .lp-det .phead { display: flex; gap: 10px; align-items: flex-start; margin: 2px 0 14px; }
  .lp-det .phead .dot { flex: none; width: 10px; height: 10px; margin-top: 6px; border-radius: 50%; background: #c6f432; box-shadow: 0 0 0 3px rgba(198,244,50,.25); }
  .lp-det .phead .dot.cap { background: #f3a6e6; box-shadow: 0 0 0 3px rgba(243,166,230,.3); }
  .lp-det .phead small { display: block; color: var(--dim); font-size: 11.5px; margin-top: 2px; }
  .lp-det details.fs { border-top: 1px solid var(--line); padding: 10px 0 4px; }
  .lp-det details.fs summary { cursor: pointer; list-style: none; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--dim); margin-bottom: 8px; }
  .lp-det details.fs summary::-webkit-details-marker { display: none; }
  .lp-det details.fs summary::after { content: "▾"; float: right; transition: transform .2s; }
  .lp-det details.fs:not([open]) summary::after { transform: rotate(-90deg); }
  .lp-det .fl { display: block; margin: 0 0 10px; }
  .lp-det .fl > span { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--ink); }
  .lp-det .fl.row { display: flex; align-items: center; justify-content: space-between; }
  .lp-det .fl.row > span { margin: 0; }
  .lp-det .fl input[type=text], .lp-det .fl textarea, .lp-det .num input { width: 100%; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); border-radius: 8px; padding: 7px 9px; font: 13px/1.4 inherit; }
  .lp-det .fl textarea { resize: vertical; } .lp-det .fl textarea.mono { font: 11.5px ui-monospace, Menlo, monospace; }
  .lp-det .fl input:focus, .lp-det .fl textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
  .lp-det .num { display: flex; align-items: center; gap: 6px; max-width: 140px; } .lp-det .num span { color: var(--dim); font-size: 12px; }
  .lp-det .rng { display: flex; align-items: center; gap: 10px; } .lp-det .rng input { flex: 1; accent-color: #9cc20f; } .lp-det .rng output { min-width: 34px; text-align: right; font-size: 12px; color: var(--dim); }
  .lp-det .seg.sm { display: inline-flex; } .lp-det .seg.sm button { height: 28px; padding: 0 12px; text-transform: capitalize; }
  .lp-det .row2 { display: flex; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); } .lp-det .row2 button { flex: 1; }
  .lp-det .ib.danger { color: var(--fix); }
  .lp-cur { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 12px; margin: 0 0 12px; border-radius: 12px; border: 1.5px solid ${PINK}; background: rgba(255,63,216,.07); }
  .lp-cur b { font-size: 12.5px; } .lp-cur small { display: block; color: var(--dim); font-size: 11.5px; }
  .lp-cur button { margin-left: auto; }

  /* drop target over the video while dragging */
  #libDrop { position: absolute; inset: 0; z-index: 30; display: none; align-items: flex-end; justify-content: center; padding-bottom: 18px;
    border: 2px dashed ${NEON}; border-radius: 10px; background: rgba(57,255,136,.08); }
  #libDrop span { padding: 6px 12px; border-radius: 16px; background: ${NEON}; color: #04210f; font-size: 12px; font-weight: 700; }
  body.lib-drag #libDrop { display: flex; }
  body.lib-drag.lib-cap #libDrop { border-color: ${PINK}; background: rgba(255,63,216,.08); }
  body.lib-drag.lib-cap #libDrop span { background: ${PINK}; color: #fff; }
  body.lib-drag #tlwrap { outline: 2px dashed ${NEON}; outline-offset: -2px; }
  #frame.over #libDrop { background: rgba(57,255,136,.16); }

  /* placed components on the video: a neon outline + a chip you drag to move it */
  #libBoxes { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
  .lb-box { position: absolute; border-radius: 10px; }
  .lb-box.drag { outline: 1.5px dashed rgba(255,255,255,.85); outline-offset: 2px; }

  .lb-chip { position: absolute; left: -2px; bottom: calc(100% + 6px); max-width: 280px; pointer-events: auto; cursor: grab; display: flex; align-items: center; gap: 6px; padding: 4px 9px 4px 7px;
    border-radius: 9px; background: ${NEON}; color: #04210f; font-size: 11px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; box-shadow: 0 4px 14px rgba(0,0,0,.35); }
  .lb-chip:active { cursor: grabbing; }
  .lb-chip i { font-style: normal; font-weight: 600; opacity: .8; }
  .lb-box.cap .lb-chip { background: ${PINK}; color: #fff; cursor: default; }
  .lb-box.low .lb-chip { bottom: auto; top: calc(100% + 6px); }

  /* the Library lane and neon time bands on the timeline */
  #libLane { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
  .ll-band { position: absolute; top: 24px; bottom: 0; background: rgba(57,255,136,.10); border-left: 1.5px solid rgba(57,255,136,.7); border-right: 1.5px solid rgba(57,255,136,.7); }
  .ll-band.cap { background: rgba(255,63,216,.05); border-color: rgba(255,63,216,.55); }
  .ll-blk { position: absolute; pointer-events: auto; cursor: grab; display: flex; align-items: center; gap: 6px; padding: 0 22px 0 8px; border-radius: 6px;
    background: #c6f432; color: #141a00; font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; }
  .ll-blk.cap { background: #f3a6e6; color: #3a0632; cursor: pointer; }
  .ll-blk:active { cursor: grabbing; }
  .ll-blk i { font-style: normal; font-weight: 600; opacity: .75; overflow: hidden; text-overflow: ellipsis; }
  .ll-blk .x { position: absolute; right: 3px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; border-radius: 4px; border: 0; padding: 0; background: rgba(0,0,0,.18); color: inherit; font-size: 11px; line-height: 16px; cursor: pointer; }
  .ll-blk .rs { position: absolute; right: 0; top: 0; bottom: 0; width: 6px; cursor: ew-resize; }
  .ll-blk.cap .rs { display: none; }
  .ll-lbl { position: absolute; transform: translateY(-50%); max-width: 230px; padding: 2px 4px;
    color: var(--ink); font-size: 10.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ll-lbl i { font-style: normal; font-weight: 500; color: var(--dim); }
  #libUndo { position: fixed; left: 50%; bottom: 22px; z-index: 60; transform: translate(-50%, 20px); opacity: 0; pointer-events: none; display: flex; align-items: center; gap: 12px; padding: 9px 10px 9px 14px;
    border-radius: 12px; background: var(--panel); border: 1.5px solid ${NEON}; box-shadow: var(--shadow), 0 0 22px rgba(57,255,136,.35); font-size: 12.5px; transition: opacity .2s, transform .3s cubic-bezier(.22,1,.36,1); }
  #libUndo.cap { border-color: ${PINK}; box-shadow: var(--shadow), 0 0 22px rgba(255,63,216,.35); }
  #libUndo.on { opacity: 1; transform: translate(-50%, 0); pointer-events: auto; }
  #libUndo button { height: 28px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-weight: 600; cursor: pointer; }
  #capInfo { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; background: rgba(10,8,12,.38); backdrop-filter: blur(3px);
    opacity: 0; pointer-events: none; transition: opacity .2s; }
  #capInfo.on { opacity: 1; pointer-events: auto; }
  #capInfo .card { width: min(420px, calc(100vw - 32px)); padding: 22px 22px 18px; border-radius: 18px; background: var(--panel); color: var(--ink);
    border: 1.5px solid ${PINK}; box-shadow: 0 30px 80px rgba(0,0,0,.35), 0 0 40px rgba(255,63,216,.25); transform: translateY(10px) scale(.98); transition: transform .3s cubic-bezier(.22,1,.36,1); }
  #capInfo.on .card { transform: none; }
  #capInfo .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 20px; background: ${PINK}; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: .04em; }
  #capInfo h3 { margin: 12px 0 8px; font-size: 17px; letter-spacing: -.01em; }
  #capInfo p { margin: 0 0 10px; font-size: 13px; line-height: 1.5; color: var(--dim); }
  #capInfo p b { color: var(--ink); }
  #capInfo .steps { margin: 12px 0 16px; padding: 0; list-style: none; display: grid; gap: 8px; }
  #capInfo .steps li { display: flex; gap: 10px; align-items: flex-start; font-size: 12.5px; line-height: 1.45; }
  #capInfo .steps i { flex: none; width: 20px; height: 20px; border-radius: 50%; background: rgba(255,63,216,.14); color: ${PINK}; font-style: normal; font-weight: 800; font-size: 11px; display: grid; place-items: center; }
  #capInfo .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  #capInfo label { font-size: 12px; color: var(--dim); display: flex; align-items: center; gap: 6px; cursor: pointer; }
  #capInfo button { height: 34px; padding: 0 18px; border-radius: 9px; border: 0; background: ${PINK}; color: #fff; font-weight: 700; cursor: pointer; }
  @media (prefers-reduced-motion: reduce) { .lp-card, #libUndo { transition: none; } }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  document.body.insertAdjacentHTML("beforeend", `<div id="libUndo" role="status"><span></span><button type="button">Undo</button></div>`);
  $("#tlwrap").insertAdjacentHTML("beforeend", `<div id="libLane"></div>`);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isCap = d => !!(d && (d.captions || d.category === "Captions"));
  const short = name => { const s = String(name || "").replace(/^Captions?:?\s*/i, ""); return s.charAt(0).toUpperCase() + s.slice(1); };

  /* ---------- sidebar tabs ---------- */
  const P = { notes: $("#pNotes"), lib: $("#pLib"), cap: $("#pCap") };
  const SP = (window.SidePane = { cur: "notes" });
  SP.show = name => {
    if (!P[name]) return;
    SP.cur = name;
    document.querySelectorAll("#sideTabs button").forEach(b => { const on = b.dataset.p === name; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    for (const k in P) P[k].classList.toggle("on", k === name);
    slideBar();
    try { localStorage.setItem("cutnote:pane", name); } catch {}
    if (name !== "notes") ensureLoaded().then(() => { if (!P[name].dataset.built) render(name); playVisible(); });
    playVisible();
  };
  // the underline slides to the selected tab
  function slideBar() {
    const bar = $("#sideTabs .ink-bar"), b = $(`#sideTabs button[data-p="${SP.cur}"]`); if (!bar || !b) return;
    const pad = 10;
    bar.style.width = (b.offsetWidth - pad * 2) + "px";
    bar.style.transform = `translateX(${b.offsetLeft + pad}px)`;
  }
  addEventListener("resize", slideBar);
  requestAnimationFrame(slideBar);
  $("#sideTabs").addEventListener("click", e => { const b = e.target.closest("button[data-p]"); if (b) SP.show(b.dataset.p); });

  /* ---------- loading the runtime + components ---------- */
  function script(src) { return new Promise(res => { const s = document.createElement("script"); s.src = src; s.onload = s.onerror = res; document.head.appendChild(s); }); }
  let loading = null;
  function ensureLoaded() {
    if (loading) return loading;
    loading = (async () => {
      const info = await fetch("/api/library").then(r => r.json()).catch(() => null);
      if (!info || !info.available) {
        for (const k of ["lib", "cap"]) P[k].innerHTML = `<div class="lp-empty">No component library found next to Cutnote.</div>`;
        return;
      }
      if (!window.gsap) await script("/lib/vendor/gsap.min.js");
      await script("/lib/runtime.js");
      await script("/lib/editor.js");
      VideoLibrary.base = info.base;
      await loadComps(info.components);
      setInterval(refresh, 5000);
    })();
    return loading;
  }
  async function loadComps(list) {
    const fresh = list.filter(c => D.seen[c.id] !== c.mtime);
    if (!fresh.length) return;
    await Promise.all(fresh.map(c => { D.seen[c.id] = c.mtime; return script(c.script + "?v=" + c.mtime); }));
    D.measured.clear();
    for (const k of ["lib", "cap"]) if (P[k].dataset.built) render(k);
    sync(true);
  }
  async function refresh() {
    const info = await fetch("/api/library").then(r => r.json()).catch(() => null);
    if (info) await loadComps(info.components);
  }

  /* ---------- previews: loop while visible, pause otherwise ---------- */
  let io = null;
  function dropPreviews(pane) {
    for (const [host, pv] of D.previews) if (P[pane].contains(host)) { pv.destroy(); D.previews.delete(host); }
    if (D.ed && P[pane].contains(D.ed.host)) { D.ed.api.destroy(); D.ed = null; }
  }
  function mkPreview(host, def, width) {
    const pv = VideoLibrary.preview(host, def.id, { width, autoplay: false, radius: 9 });
    if (!pv) return;
    D.previews.set(host, pv);
    if (!io) io = new IntersectionObserver(es => { es.forEach(e => { e.target._vis = e.isIntersecting; }); playVisible(); });
    io.observe(host);
  }
  function playVisible() {
    for (const [host, pv] of D.previews) {
      const pane = host.closest(".pane");
      if (pane && pane.classList.contains("on") && host._vis !== false) pv.tl.play(); else pv.tl.pause();
    }
  }

  /* ---------- the two lists ---------- */
  const DD = {};
  const RANK = ["Cinematic", "Clean cards", "Data & numbers", "Photos & media", "Series", "House", "Bold", "Character"];
  const rank = c => { const i = RANK.indexOf(c); return i < 0 ? RANK.length : i; };
  function collections(kind) {
    const list = VideoLibrary.list().filter(d => kind === "cap" ? isCap(d) : !isCap(d))
      .sort((a, b) => rank(a.collection) - rank(b.collection) || String(a.collection || "").localeCompare(String(b.collection || "")) || (a.order || 99) - (b.order || 99) || a.name.localeCompare(b.name));
    const by = new Map();
    for (const d of list) { const c = d.collection || d.category || "Other"; if (!by.has(c)) by.set(c, []); by.get(c).push(d); }
    return { list, by };
  }
  function render(kind) {
    const pane = P[kind];
    if (!window.VideoLibrary) return;
    dropPreviews(kind);
    const { list, by } = collections(kind);
    if (!pane.dataset.built) {
      pane.dataset.built = "1";
      pane.innerHTML = `<div class="lp-head"><div class="row"><div class="dd" data-dd></div></div>
        ${kind === "lib" ? `<div class="row"><input type="search" placeholder="Search components" data-q></div>` : ""}
        <p class="hint">${kind === "lib" ? "Drag onto the video or the timeline. It's added at once, and Claude builds it properly on the next run." : "One caption style for the whole video. Drag one onto the video, or open it and press Use."}</p></div>
        <div class="lp-body" data-body></div>`;
      DD[kind] = Dropdown(pane.querySelector("[data-dd]"), { prefix: "Collection", onChange: v => { D.coll[kind] = v; D.detail[kind] = null; render(kind); } });
      const q = pane.querySelector("[data-q]");
      if (q) q.addEventListener("input", () => { D.q = q.value.trim().toLowerCase(); D.detail.lib = null; render("lib"); });
      const body = pane.querySelector("[data-body]");
      body.addEventListener("click", e => {
        const r = e.target.closest("[data-act=removecap]");
        if (r) { removePlacement(r.dataset.id); return; }
        const c = e.target.closest(".lp-card");
        if (c) { D.detail[kind] = c.dataset.id; render(kind); }
      });
      body.addEventListener("dragstart", onDragStart);
    }
    const names = [...by.keys()];
    if (D.coll[kind] && !by.has(D.coll[kind])) D.coll[kind] = "";
    DD[kind].setItems([{ value: "", label: "All collections", hint: String(list.length) }, ...names.map(n => ({ value: n, label: n, hint: String(by.get(n).length) }))], D.coll[kind]);
    const body = pane.querySelector("[data-body]");
    const det = D.detail[kind] && VideoLibrary.components[D.detail[kind]];
    if (det) return openDetail(kind, det, body);
    const q = kind === "lib" ? D.q : "";
    const curCap = kind === "cap" ? placements().find(p => p.cap) : null;
    let html = "";
    if (curCap) html += `<div class="lp-cur"><span><b>${esc(short(curCap.c.name))} captions</b><small>For the whole video · Claude builds them on the next run</small></span><button class="ib" type="button" data-act="removecap" data-id="${esc(curCap.id)}">Remove</button></div>`;
    const sections = (D.coll[kind] ? [D.coll[kind]] : names).map(n => [n, by.get(n).filter(d => !q || (d.name + " " + (d.description || "") + " " + (d.tags || []).join(" ") + " " + n).toLowerCase().includes(q))]).filter(([, ds]) => ds.length);
    if (!sections.length) html += `<div class="lp-empty">Nothing matches.</div>`;
    else html += `<div class="lp-grid">${sections.map(([n, ds]) => `<div class="lp-sec">${esc(n)}<span>${ds.length}</span></div>` + ds.map(d => `<div class="lp-card${curCap && curCap.c.id === d.id ? " on" : ""}" draggable="true" data-id="${esc(d.id)}" title="${esc(d.description || "")}">${curCap && curCap.c.id === d.id ? '<span class="tag">In use</span>' : ""}<div class="pv"></div><b>${esc(kind === "cap" ? short(d.name) : d.name)}</b><small>${esc(d.source || d.category || "")}</small></div>`).join("")).join("")}</div>`;
    body.innerHTML = html;
    body.querySelectorAll(".lp-card").forEach(el => mkPreview(el.querySelector(".pv"), VideoLibrary.components[el.dataset.id], (el.clientWidth || 160) - 12));
    playVisible();
  }
  /* ---------- the settings form: simple fields, grouped, the fiddly ones tucked under "More" ---------- */
  const GROUP = p => {
    if (["text", "longtext", "lines", "image", "color"].includes(p.type)) return "Text";
    if (["time", "times"].includes(p.type) || /At$|duration/i.test(p.key)) return "Timing";
    if (["box", "json"].includes(p.type)) return "More";
    return "Style";
  };
  function field(p, v) {
    const k = esc(p.key), lab = esc((p.label || p.key).replace(/\s*\((s|px|[^)]*\[[^)]*\][^)]*)\)\s*$/i, ""));
    const unit = p.type === "time" || p.type === "times" || p.key === "duration" ? "s" : "";
    let inp;
    if (p.type === "bool") inp = `<span class="switch"><input type="checkbox" data-k="${k}" ${v ? "checked" : ""}><i></i></span>`;
    else if (p.type === "select") inp = `<div class="seg sm">${p.options.map(o => `<button type="button" data-k="${k}" data-v="${esc(o)}" class="${o === v ? "on" : ""}">${esc(o)}</button>`).join("")}</div>`;
    else if (p.type === "lines") inp = `<textarea data-k="${k}" rows="${Math.min(5, Math.max(2, (v || []).length))}" placeholder="One per line. Put [lime] words in brackets.">${esc((v || []).join("\n"))}</textarea>`;
    else if (p.type === "longtext") inp = `<textarea data-k="${k}" rows="3">${esc(v)}</textarea>`;
    else if (p.type === "number" && p.min != null && p.max != null) inp = `<div class="rng"><input type="range" data-k="${k}" min="${p.min}" max="${p.max}" step="${p.step || 1}" value="${esc(v)}"><output>${esc(v)}</output></div>`;
    else if (p.type === "number" || p.type === "time") inp = `<div class="num"><input type="number" data-k="${k}" step="${p.type === "time" ? 0.1 : p.step || 1}" value="${v == null ? "" : esc(v)}" placeholder="${p.type === "time" ? "off" : ""}">${unit ? `<span>${unit}</span>` : ""}</div>`;
    else if (p.type === "times" || p.type === "box") inp = `<input type="text" data-k="${k}" value="${esc((v || []).join(", "))}">`;
    else if (p.type === "json") inp = `<textarea data-k="${k}" rows="2" class="mono">${esc(JSON.stringify(v))}</textarea>`;
    else if (p.type === "color") inp = `<input type="color" data-k="${k}" value="${esc(v)}">`;
    else inp = `<input type="text" data-k="${k}" value="${esc(v)}">`;
    return `<label class="fl${p.type === "bool" ? " row" : ""}"><span>${lab}</span>${inp}</label>`;
  }
  function readField(p, el) {
    const raw = el.type === "checkbox" ? el.checked : el.dataset.v != null ? el.dataset.v : el.value;
    switch (p.type) {
      case "bool": return !!raw;
      case "number": return raw === "" ? p.default : +raw;
      case "time": return raw === "" ? null : +raw;
      case "lines": return String(raw).split("\n").map(x => x.trim()).filter(Boolean);
      case "times": case "box": return String(raw).split(/[\s,]+/).filter(Boolean).map(Number);
      case "json": try { return JSON.parse(raw); } catch { return undefined; }
      default: return raw;
    }
  }
  // builds the form into host; onChange(params) fires (debounced) after every edit
  function buildForm(host, def, params, onChange, extra) {
    const groups = { Text: [], Timing: [], Style: [], More: [] };
    for (const p of def.params) groups[GROUP(p)].push(p);
    const sec = (name, list, open) => list.length || (name === "Timing" && extra) ? `<details class="fs" ${open ? "open" : ""}><summary>${name}</summary>${name === "Timing" && extra ? extra : ""}${list.map(p => field(p, params[p.key])).join("")}</details>` : "";
    host.innerHTML = sec("Text", groups.Text, true) + sec("Timing", groups.Timing, true) + sec("Style", groups.Style, true) + sec("More", groups.More, false);
    let h = 0;
    const fire = () => { clearTimeout(h); h = setTimeout(() => onChange(params), 350); };
    const upd = el => {
      const k = el.dataset.k; if (!k) return;
      const p = def.params.find(x => x.key === k); if (!p) return;
      const v = readField(p, el); if (v === undefined) return;
      params[k] = v;
      if (el.type === "range") el.nextElementSibling.textContent = el.value;
      if (el.dataset.v != null) el.parentElement.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === el));
      fire();
    };
    host.addEventListener("input", e => upd(e.target));
    host.addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (b) upd(b); });
  }

  // a library card opened before adding it: preview, settings, Add
  function openDetail(kind, def, body) {
    const params = VideoLibrary.defaults(def.id);
    body.innerHTML = `<div class="lp-det"><button class="ib back" type="button">← ${kind === "cap" ? "All caption styles" : "All components"}</button>
      <div class="big"></div><h2>${esc(kind === "cap" ? short(def.name) + " captions" : def.name)}</h2><p>${esc(def.description || "")}</p>
      <button class="go" type="button">${kind === "cap" ? "Use for the whole video" : "Add at the playhead"}</button><div class="form"></div></div>`;
    body.querySelector(".back").onclick = () => { D.detail[kind] = null; render(kind); };
    const big = body.querySelector(".big");
    let pv = null;
    const show = () => { if (pv) pv.destroy(); pv = VideoLibrary.preview(big, def.id, { width: 220, params, radius: 14 }); D.ed = { host: body, api: { destroy: () => pv && pv.destroy() } }; };
    show();
    buildForm(body.querySelector(".form"), def, params, show);
    body.querySelector(".go").onclick = () => place(def, S.t, null, null, JSON.parse(JSON.stringify(params)));
  }

  // a component already on the video: edit it in place (changes save to its note and play straight away)
  function openPlacement(id) {
    const p = placements().find(q => q.id === id); if (!p) return;
    const def = VideoLibrary.components[p.c.id]; if (!def) return;
    const kind = p.cap ? "cap" : "lib";
    D.editing = id;
    SP.show(kind);
    ensureLoaded().then(() => {
      if (!P[kind].dataset.built) render(kind);
      dropPreviews(kind);
      const body = P[kind].querySelector("[data-body]");
      const params = Object.assign(VideoLibrary.defaults(def.id), JSON.parse(JSON.stringify(p.c.params || {})));
      body.innerHTML = `<div class="lp-det pl"><button class="ib back" type="button">← ${kind === "cap" ? "All caption styles" : "All components"}</button>
        <div class="phead"><span class="dot${p.cap ? " cap" : ""}"></span><div><h2>${esc(p.cap ? short(def.name) + " captions" : def.name)}</h2>
        <small>${p.cap ? "Whole video · Claude builds them on the next run" : `On your video at ${fmt(p.t)} · Claude builds it on the next run`}</small></div></div>
        <div class="form"></div><div class="row2"><button class="ib danger" type="button" data-a="del">Remove</button><button class="ib primary" type="button" data-a="done">Done</button></div></div>`;
      const extra = p.cap ? "" : `<label class="fl"><span>Starts at</span><div class="num"><input type="number" data-x="t" step="0.1" min="0" value="${(+p.t).toFixed(2)}"><span>s</span></div></label>
        <label class="fl"><span>Plays for</span><div class="num"><input type="number" data-x="dur" step="0.1" min="0.5" value="${(+p.dur).toFixed(1)}"><span>s</span></div></label>`;
      const form = body.querySelector(".form");
      const save = async () => {
        const n = (S.notes || []).find(x => x.id === id); if (!n) return;
        const patch = { id, component: Object.assign({}, n.component, { params: JSON.parse(JSON.stringify(params)) }) };
        if (!p.cap) {
          const t = Math.max(0, +form.querySelector('[data-x="t"]').value || 0), dur = Math.max(0.5, +form.querySelector('[data-x="dur"]').value || p.dur);
          patch.component.params.duration = dur; patch.t = +t.toFixed(3); patch.end = +(t + dur).toFixed(3); patch.frame = Math.round(t * FPS);
        }
        D.measured.clear();
        await noteOp("update", patch); layoutLanes(); draw(); sync(true);
      };
      buildForm(form, def, params, save, extra);
      let h = 0; form.addEventListener("input", e => { if (e.target.dataset.x) { clearTimeout(h); h = setTimeout(save, 350); } });
      body.querySelector(".back").onclick = () => { D.editing = null; D.detail[kind] = null; render(kind); };
      body.querySelector('[data-a="done"]').onclick = () => { D.editing = null; D.detail[kind] = null; render(kind); };
      body.querySelector('[data-a="del"]').onclick = async () => { D.editing = null; await removePlacement(id); D.detail[kind] = null; render(kind); toast("Removed"); };
      if (!p.cap) seek(Math.max(S.t, p.t));
    });
  }
  D.openPlacement = openPlacement;

  /* ---------- placements = open notes with a component ---------- */
  function placements() {
    if (!S.comp) return [];
    return (S.notes || []).filter(n => n.comp === S.comp.id && n.status !== "done" && n.component && n.component.id)
      .map(n => {
        const c = n.component, def = window.VideoLibrary && VideoLibrary.components[c.id];
        const cap = !!(c.captions || isCap(def));
        const dur = cap ? null : +((c.params && c.params.duration) || (def && def.duration) || 3);
        const drag = D.drag && D.drag.id === n.id ? D.drag : null;
        return { id: n.id, n, c, cap, t: drag && drag.t != null ? drag.t : +n.t || 0, dur: drag && drag.dur != null ? drag.dur : dur,
          dx: drag && drag.dx != null ? drag.dx : +c.dx || 0, dy: drag && drag.dy != null ? drag.dy : +c.dy || 0 };
      });
  }
  D.hasLane = () => placements().length > 0;
  // the lane holds a row for components and a thin row under it for the caption style, when there are both
  D.laneH = () => { const ps = placements(); const a = ps.some(p => !p.cap), b = ps.some(p => p.cap); return a && b ? 44 : a ? 26 : 18; };

  // where a component draws (canvas px), over its whole run; cached per component + params
  function measureBox(id, params) {
    const key = id + JSON.stringify(params || {});
    if (D.measured.has(key)) return D.measured.get(key);
    if (!window.VideoLibrary || !VideoLibrary.components[id] || !window.gsap) return null;
    const host = document.createElement("div");
    host.style.cssText = `position:fixed;left:-30000px;top:0;width:${VideoLibrary.W}px;height:${VideoLibrary.H}px;pointer-events:none`;
    document.body.appendChild(host);
    const tl = gsap.timeline({ paused: true });
    let b = null;
    try {
      const p = Object.assign(VideoLibrary.defaults(id), params || {});
      VideoLibrary.mount(id, { root: host, tl, start: 0.25, params: p });
      b = VideoLibrary.measure(host, tl, 0.25, +p.duration || VideoLibrary.components[id].duration);
    } catch (e) {}
    tl.kill(); host.remove();
    D.measured.set(key, b);
    return b;
  }
  // components are 1080x1920 designs: on another canvas they're scaled to fit (uniformly) and centred
  const MAP = () => { const k = Math.min(S.W / VideoLibrary.W, S.H / VideoLibrary.H); return { k, ox: (S.W - VideoLibrary.W * k) / 2, oy: (S.H - VideoLibrary.H * k) / 2 }; };
  // new components sit centred across the frame; a drop sets the height, otherwise the component keeps its own
  function offsetFor(id, params, x, y) {
    const b = measureBox(id, params);
    if (!b || b.whole || !(b.x1 > b.x0)) return [0, 0];
    const m = MAP();
    const dx = Math.round(VideoLibrary.W / 2 - (b.x0 + b.x1) / 2);
    const dy = y == null ? 0 : Math.round((y - m.oy) / m.k - (b.y0 + b.y1) / 2);
    return [dx, dy];
  }

  /* ---------- adding: saved straight away as a note ---------- */
  async function place(def, t, x, y, params) {
    if (!S.comp) { toast("Open a version first"); return; }
    if (!window.VideoLibrary) await ensureLoaded();
    const cap = isCap(def);
    const p = params || VideoLibrary.defaults(def.id);
    const comp = { id: def.id, name: def.name, category: def.category, collection: def.collection || "", params: p, captions: cap,
      x: x == null || cap ? null : Math.round(x), y: y == null || cap ? null : Math.round(y) };
    if (!cap) { const [dx, dy] = offsetFor(def.id, p, x, y); comp.dx = dx; comp.dy = dy; }
    const replaced = cap ? placements().filter(q => q.cap).map(q => q.n) : [];   // one caption style per version
    if (cap) t = 0;
    const dur = cap ? 0 : +(p.duration || def.duration || 3);
    const note = {
      comp: S.comp.id, label: S.comp.label, compMtime: S.mtime, t: +(+t).toFixed(3), end: cap ? null : +(t + dur).toFixed(3), frame: Math.round(t * FPS), kind: "change",
      text: cap ? `Use the "${short(def.name)}" caption style for the whole video.` : `Add ${def.name} here.`,
      context: typeof contextAt === "function" ? contextAt(t) : {}, component: comp,
    };
    pause();
    const before = new Set((S.notes || []).map(n => n.id));
    try { await noteOp("add", note); } catch (e) { toast("Couldn't add it: " + (e.message || e)); return; }
    const added = (S.notes || []).find(n => !before.has(n.id));
    for (const old of replaced) await noteOp("delete", { id: old.id });
    if (!cap && Math.abs(S.t - t) > 0.02) seek(t);
    layoutLanes(); draw(); sync(true);
    if (cap && P.cap.dataset.built) render("cap");
    if (cap) capExplainer(short(def.name));
    undoBar(added, replaced, cap ? `${short(def.name)} captions for the whole video. Claude builds them on the next run.` : `${def.name} added at ${fmt(t)}. Claude builds it on the next run.`, cap);
  }
  async function removePlacement(id) {
    await noteOp("delete", { id });
    layoutLanes(); draw(); sync(true);
    if (P.cap.dataset.built) render("cap");
  }
  // the first caption style someone picks: say why they won't see it on the video yet
  function capExplainer(name) {
    try { if (localStorage.getItem("cutnote:capInfo") === "off") return; } catch {}
    let el = $("#capInfo");
    if (!el) {
      document.body.insertAdjacentHTML("beforeend", `<div id="capInfo" role="dialog" aria-modal="true" aria-labelledby="capInfoT"><div class="card">
        <span class="badge">▤ CAPTIONS</span><h3 id="capInfoT"></h3>
        <p>You won't see these captions on the video here, and that's expected. Captions follow every word you say, so they're built from your <b>real word timings</b> (the transcript), not from a preview.</p>
        <ul class="steps"><li><i>1</i><span>Your pick is saved as a note for the <b>whole video</b> (the pink band on the timeline).</span></li>
          <li><i>2</i><span>When you ask Claude to work through your notes, it restyles <b>every caption</b> in this style, timed to your words.</span></li>
          <li><i>3</i><span>The page reloads with the new captions on, ready to check.</span></li></ul>
        <div class="row"><label><input type="checkbox"> Don't show this again</label><button type="button">Got it</button></div></div></div>`);
      el = $("#capInfo");
      const close = () => { if (el.querySelector("input").checked) { try { localStorage.setItem("cutnote:capInfo", "off"); } catch {} } el.classList.remove("on"); };
      el.querySelector("button").onclick = close;
      el.addEventListener("click", e => { if (e.target === el) close(); });
      document.addEventListener("keydown", e => { if (e.key === "Escape" && el.classList.contains("on")) close(); });
    }
    el.querySelector("h3").textContent = `${name} captions are on their way`;
    requestAnimationFrame(() => el.classList.add("on"));
    setTimeout(() => el.querySelector("button").focus(), 50);
  }
  function undoBar(n, replaced, msg, cap) {
    const bar = $("#libUndo");
    bar.classList.toggle("cap", !!cap);
    bar.querySelector("span").textContent = msg;
    bar.classList.add("on");
    const hide = () => { clearTimeout(undoBar.h); undoBar.h = setTimeout(() => { if (bar.matches(":hover")) hide(); else bar.classList.remove("on"); }, 10000); };
    hide();
    bar.querySelector("button").onclick = async () => {
      bar.classList.remove("on");
      if (n) await noteOp("delete", { id: n.id });
      for (const old of replaced || []) { const o = Object.assign({}, old); delete o.id; delete o.created; delete o.updated; await noteOp("add", o); }
      layoutLanes(); draw(); sync(true); if (P.cap.dataset.built) render("cap");
      toast(replaced && replaced.length ? "Back to the previous caption style" : "Removed");
    };
  }

  /* ---------- drag and drop from the sidebar ---------- */
  function onDragStart(e) {
    const c = e.target.closest(".lp-card"); if (!c) return;
    const def = VideoLibrary.components[c.dataset.id];
    e.dataTransfer.setData("application/x-cutnote-component", c.dataset.id);
    e.dataTransfer.setData("text/plain", def ? def.name : c.dataset.id);
    e.dataTransfer.effectAllowed = "copy";
    D.dragging = true; frameBits();
    $("#libDrop span").textContent = isCap(def) ? "Drop to use these captions for the whole video" : "Drop to add it here, at the playhead";
    setTimeout(() => { document.body.classList.add("lib-drag"); document.body.classList.toggle("lib-cap", isCap(def)); }, 0);
  }
  document.addEventListener("dragend", () => {
    if (!D.dragging) return;
    D.dragging = false; document.body.classList.remove("lib-drag", "lib-cap"); frEl.classList.remove("over");
  });
  const accepts = e => D.dragging && [...e.dataTransfer.types].includes("application/x-cutnote-component");
  const frEl = $("#frame");
  function frameBits() {
    if (!frEl.querySelector("#libDrop")) frEl.insertAdjacentHTML("beforeend", `<div id="libDrop"><span></span></div>`);
    if (!frEl.querySelector("#libBoxes")) frEl.insertAdjacentHTML("beforeend", `<div id="libBoxes"></div>`);
  }
  frEl.addEventListener("dragover", e => { if (!accepts(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; frEl.classList.add("over"); });
  frEl.addEventListener("dragleave", e => { if (!frEl.contains(e.relatedTarget)) frEl.classList.remove("over"); });
  frEl.addEventListener("drop", e => {
    if (!accepts(e)) return; e.preventDefault();
    const def = VideoLibrary.components[e.dataTransfer.getData("application/x-cutnote-component")]; if (!def) return;
    const r = frEl.getBoundingClientRect();
    if (!r.width || !r.height) return place(def, S.t, null, null, null);
    place(def, S.t, Math.max(0, Math.min(S.W, (e.clientX - r.left) / r.width * S.W)), Math.max(0, Math.min(S.H, (e.clientY - r.top) / r.height * S.H)), null);
  });
  const tw = $("#tlwrap");
  tw.addEventListener("dragover", e => { if (!accepts(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
  tw.addEventListener("drop", e => {
    if (!accepts(e)) return; e.preventDefault();
    const def = VideoLibrary.components[e.dataTransfer.getData("application/x-cutnote-component")]; if (!def) return;
    const cvs = $("#tl"), r = cvs.getBoundingClientRect(), x = e.clientX - r.left;
    let t = S.t;
    try { if (x > G) t = toS(Math.max(0, T(x))); } catch (err) {}
    place(def, t, null, null, null);
  });

  function trackDrag(onMove, onEnd) {
    const mv = ev => onMove(ev);
    const end = ev => { removeEventListener("pointermove", mv); removeEventListener("pointerup", end); removeEventListener("pointercancel", end); onEnd(ev.type === "pointercancel"); };
    addEventListener("pointermove", mv); addEventListener("pointerup", end); addEventListener("pointercancel", end);
  }

  /* ---------- timeline: Library lane blocks + neon bands ---------- */
  D.paintLane = () => {
    const lane = $("#libLane"); if (!lane) return;
    const g = (TL.geom || []).find(q => q.ln.type === "lib");
    const ps = window.VideoLibrary ? placements() : [];
    if (!g || !ps.length) { if (lane._html) { lane.innerHTML = ""; lane._html = ""; } paintFrame(); return; }
    const w = $("#tl").clientWidth;
    const html = [];
    for (const p of ps) {
      const a = p.cap ? 0 : toE(p.t), b = p.cap ? progDur() : toE(p.t + p.dur);
      let x0 = X(a), x1 = X(b);
      if (x1 < G || x0 > w) continue;
      x0 = Math.max(G, x0); x1 = Math.min(w, x1);
      const label = p.cap ? `Captions · ${esc(short(p.c.name))} <i>whole video</i>` : `${esc(p.c.name)} <i>${fmt(p.t)}</i>`;
      const both = g.h > 30, by = p.cap && both ? g.y + 28 : g.y, bh = p.cap ? (both ? 16 : g.h) : (both ? 26 : g.h);
      const narrow = !p.cap && x1 - x0 < 150;
      html.push(`<div class="ll-blk${p.cap ? " cap" : ""}" data-id="${esc(p.id)}" style="left:${x0}px;width:${Math.max(18, x1 - x0)}px;top:${by}px;height:${bh}px" title="${esc(p.c.name)}: ${p.cap ? "caption style for the whole video" : "drag to move it; drag the right edge to change how long it plays"}">${narrow ? "" : label}<button class="x" type="button" title="Remove">×</button><span class="rs"></span></div>`);
      if (narrow) html.push(`<div class="ll-lbl" style="left:${Math.max(x0, Math.min(w - 230, x1 + 6))}px;top:${by + bh / 2}px">${label}</div>`);
    }
    const out = html.join("");
    if (lane._html !== out) { lane.innerHTML = out; lane._html = out; }   // the timeline redraws every frame while playing
    paintFrame();
  };
  $("#libLane").addEventListener("pointerdown", e => {
    const blk = e.target.closest(".ll-blk"); if (!blk) return;
    const p = placements().find(q => q.id === blk.dataset.id); if (!p) return;
    e.preventDefault(); e.stopPropagation();
    if (e.target.closest(".x")) { removePlacement(p.id); return; }
    if (p.cap) { openPlacement(p.id); return; }
    // retime in program time (what the timeline shows), so it follows the pointer even when the video has cuts
    const per = S.view.len / ($("#tl").clientWidth - G), E0 = toE(p.t);
    D.drag = { id: p.id, mode: e.target.closest(".rs") ? "len" : "move", x0: e.clientX, dur0: p.dur, moved: false };
    trackDrag(ev => {
      const d = D.drag; if (!d) return;
      const dE = (ev.clientX - d.x0) * per;
      if (Math.abs(ev.clientX - d.x0) > 3) d.moved = true;
      if (d.mode === "move") d.t = toS(Math.max(0, Math.min(progDur() - 0.2, E0 + dE)));
      else d.dur = Math.max(0.6, +(d.dur0 + dE).toFixed(2));
      D.paintLane();
    }, async cancelled => {
      const d = D.drag; if (!d) return;
      if (cancelled || !d.moved) { D.drag = null; if (!cancelled) { seek(p.t); openPlacement(p.id); } D.paintLane(); return; }
      const patch = { id: p.id };
      if (d.mode === "move") { patch.t = +d.t.toFixed(3); patch.end = +(d.t + p.dur).toFixed(3); patch.frame = Math.round(d.t * FPS); if (typeof contextAt === "function") patch.context = contextAt(patch.t); }
      else { patch.component = Object.assign({}, p.c, { params: Object.assign({}, p.c.params, { duration: d.dur }) }); patch.end = +(p.t + d.dur).toFixed(3); }
      try { await noteOp("update", patch); toast(d.mode === "move" ? `Moved to ${fmt(patch.t)}` : `Plays for ${d.dur.toFixed(1)} s`); }
      catch (err) { toast("Couldn't save that change"); }
      finally { D.drag = null; layoutLanes(); draw(); sync(true); }
      if (d.mode === "move" && patch.t != null) seek(patch.t);
    });
  });

  /* ---------- video: neon outlines while each one plays (drag the chip to move it) ---------- */
  function paintFrame() {
    frameBits();
    const box = $("#libBoxes"), fr = frEl.getBoundingClientRect();
    if (!fr.width || !window.VideoLibrary) { box.innerHTML = ""; return; }
    const m = MAP(), fx = fr.width / S.W, sx = m.k * fx, sy = m.k * fx, ox = m.ox * fx, oy = m.oy * fx, html = [];
    for (const p of placements()) {
      if (p.cap || !(S.t >= p.t - 0.01 && S.t <= p.t + p.dur)) continue;
      const b = measureBox(p.c.id, p.c.params);
      let x0, y0, x1, y1;
      if (!b || b.whole || !(b.x1 > b.x0)) { x0 = 14; y0 = 14; x1 = VideoLibrary.W - 14; y1 = VideoLibrary.H - 14; }
      else { x0 = b.x0 + p.dx - 14; y0 = b.y0 + p.dy - 14; x1 = b.x1 + p.dx + 14; y1 = b.y1 + p.dy + 14; }
      x0 = Math.max(4, x0); x1 = Math.min(VideoLibrary.W - 4, x1);
      const low = y0 < 160;
      // keep the chip inside the frame: as wide as the room to the frame's right edge (at least the box)
      const room = Math.max((x1 - x0) * sx, fr.width - Math.max(0, ox + x0 * sx) - 4);
      const chip = "";
      html.push(`<div class="lb-box${p.cap ? " cap" : ""}${low ? " low" : ""}" data-id="${esc(p.id)}" style="left:${ox + x0 * sx}px;top:${oy + y0 * sy}px;width:${(x1 - x0) * sx}px;height:${(y1 - y0) * sy}px"></div>`);
    }
    if (box.innerHTML !== html.join("")) box.innerHTML = html.join("");
  }
  // move a placed component: drag its chip, or (with the Select tool) the component itself
  frEl.addEventListener("pointerdown", e => {
    if (e.button !== 0 || !window.VideoLibrary) return;
    let boxEl = e.target.closest(".lb-chip") && e.target.closest(".lb-box");
    if (!boxEl && typeof INK !== "undefined" && INK.tool === "select") {
      boxEl = [...frEl.querySelectorAll(".lb-box:not(.cap)")].reverse().find(b => { const r = b.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
    }
    if (!boxEl) return;
    const p = placements().find(q => q.id === boxEl.dataset.id);
    e.preventDefault(); e.stopPropagation();
    if (!p || p.cap) { if (p) openPlacement(p.id); return; }
    const fr = frEl.getBoundingClientRect(), per = S.W / fr.width / MAP().k;   // screen px -> component px
    D.drag = { id: p.id, x0: e.clientX, y0: e.clientY, dx0: p.dx, dy0: p.dy, moved: false };
    trackDrag(ev => {
      const d = D.drag; if (!d) return;
      d.dx = Math.round(d.dx0 + (ev.clientX - d.x0) * per); d.dy = Math.round(d.dy0 + (ev.clientY - d.y0) * per);
      if (Math.abs(ev.clientX - d.x0) + Math.abs(ev.clientY - d.y0) > 3) d.moved = true;
      paintFrame(); liveMove(p.id, d.dx, d.dy);
      const bx = frEl.querySelector(`.lb-box[data-id="${p.id}"]`); if (bx) bx.classList.add("drag");
    }, async cancelled => {
      const d = D.drag;
      if (!d || cancelled || !d.moved) { D.drag = null; liveMove(p.id, p.c.dx, p.c.dy); paintFrame(); if (d && !cancelled) openPlacement(p.id); return; }
      const b = measureBox(p.c.id, p.c.params);
      const c = Object.assign({}, p.c, { dx: d.dx, dy: d.dy });
      if (b && b.x1 > b.x0) { const m = MAP(); c.x = Math.round(m.ox + ((b.x0 + b.x1) / 2 + d.dx) * m.k); c.y = Math.round(m.oy + ((b.y0 + b.y1) / 2 + d.dy) * m.k); }
      try { await noteOp("update", { id: p.id, component: c }); toast("Moved"); }
      catch (err) { toast("Couldn't save the move"); }
      finally { D.drag = null; sync(true); }
    });
  }, true);

  /* ---------- live: placed components play on the video at once ----------
   * Mounted into the composition's own page and added to its GSAP timeline, so they play, scrub and loop with the edit.
   * Notes marked done are left to the real build. Nothing here touches the composition's files. */
  const LIVE = { win: null, rt: null, ids: new Set(), items: new Map(), sig: "", busy: false };
  function liveFrame() {
    const fr = typeof compFrame === "function" ? compFrame() : null;
    return fr && fr.w && fr.w.gsap && fr.w.__timelines && fr.w.__timelines.main ? fr : null;
  }
  function loadInto(w, src) { return new Promise(res => { const s = w.document.createElement("script"); s.src = src; s.onload = s.onerror = res; setTimeout(res, 6000); try { w.document.head.appendChild(s); } catch (e) { res(); } }); }
  function liveT(dx, dy) { const m = MAP(); return `translate(${m.ox}px,${m.oy}px) scale(${m.k}) translate(${+dx || 0}px,${+dy || 0}px)`; }
  function fixScrims(holder, dx, dy) {
    for (const sc of holder.querySelectorAll(".vl-scrim")) {
      if (sc.dataset.h0 == null) sc.dataset.h0 = parseFloat(sc.style.height) || 0;
      sc.style.left = (-(+dx || 0) - 200) + "px"; sc.style.right = ((+dx || 0) - 200) + "px";
      sc.style.height = (+sc.dataset.h0 + Math.max(0, -(+dy || 0)) + 200) + "px";
    }
  }
  function liveMove(id, dx, dy) { for (const v of LIVE.items.values()) if (v.id === id) { v.holder.style.transform = liveT(dx, dy); fixScrims(v.holder, dx, dy); } }
  async function liveSync(force) {
    if (LIVE.busy) { if (force) setTimeout(() => liveSync(true), 300); return; }
    const fr = liveFrame();
    if (!fr || !window.VideoLibrary) return;
    const want = placements().filter(p => !p.cap);
    const keyOf = p => p.id + JSON.stringify([p.c.id, p.c.params, +p.n.t || 0, p.c.dx, p.c.dy]);
    const sig = want.map(keyOf).join("|");
    if (fr.w === LIVE.win && sig === LIVE.sig && !force) return;
    LIVE.busy = true;
    try {
      const W = fr.w;
      if (LIVE.win !== W) { LIVE.win = W; LIVE.items.clear(); LIVE.ids = new Set(); LIVE.rt = loadInto(W, "/lib/runtime.js"); }
      await LIVE.rt;
      if (!W.VideoLibrary) return;
      W.VideoLibrary.base = "/lib/";
      for (const id of new Set(want.map(p => p.c.id))) if (!LIVE.ids.has(id)) { LIVE.ids.add(id); await loadInto(W, `/lib/components/${encodeURIComponent(id)}/component.js?v=${D.seen[id] || 0}`); }
      const main = W.__timelines.main, keep = new Set();
      const root = W.document.querySelector("[data-composition-id]") || W.document.body;
      for (const p of want) {
        const k = keyOf(p); keep.add(k);
        if (LIVE.items.has(k) || !W.VideoLibrary.components[p.c.id]) continue;
        const holder = W.document.createElement("div");
        holder.className = "cutnote-live";
        holder.style.cssText = `position:absolute;left:0;top:0;width:${W.VideoLibrary.W}px;height:${W.VideoLibrary.H}px;pointer-events:none;z-index:900;transform-origin:0 0;transform:${liveT(p.c.dx, p.c.dy)}`;
        root.appendChild(holder);
        const sub = W.gsap.timeline();
        try { W.VideoLibrary.mount(p.c.id, { root: holder, tl: sub, start: 0, params: p.c.params }); } catch (e) { holder.remove(); continue; }
        fixScrims(holder, p.c.dx, p.c.dy);
        main.add(sub, Math.max(0, +p.n.t || 0));
        LIVE.items.set(k, { id: p.id, holder, sub });
      }
      for (const [k, v] of LIVE.items) if (!keep.has(k)) { try { main.remove(v.sub); v.sub.kill(); } catch (e) {} v.holder.remove(); LIVE.items.delete(k); }
      LIVE.sig = sig;
      if (S.player && S.player.paused && S.player.paused()) S.player.seek(S.t);   // redraw the paused frame with it on
    } finally { LIVE.busy = false; }
  }
  function sync(force) { liveSync(force); D.paintLane(); }
  D.sync = sync;
  let lastLane = null;
  setInterval(() => {
    if (!window.VideoLibrary) { if ((S.notes || []).some(n => n.component)) ensureLoaded(); return; }
    const has = D.hasLane() ? D.laneH() : 0;
    if (has !== lastLane) { lastLane = has; layoutLanes(); draw(); }
    liveSync();
  }, 600);
  addEventListener("resize", () => D.paintLane());

  // start: the library loads in the background so placed components show on the video and timeline straight away
  ensureLoaded().then(() => { layoutLanes(); draw(); sync(true); });
  let first = "notes"; try { first = localStorage.getItem("cutnote:pane") || "notes"; } catch {}
  if (first !== "notes") SP.show(first);
})();
