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
  .lp-head { display: flex; flex-direction: column; gap: 10px; padding: 12px 12px 10px; border-bottom: 1px solid var(--line); flex: none; }
  .lp-search { position: relative; }
  .lp-search svg { position: absolute; left: 10px; top: 50%; width: 14px; height: 14px; transform: translateY(-50%); color: var(--faint); pointer-events: none; }
  .lp-search input { width: 100%; height: 34px; padding: 0 10px 0 32px; border-radius: 9px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-size: 13px; }
  .lp-search input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: var(--panel); }
  .lp-chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0 -12px; padding: 0 12px; -webkit-mask: linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 18px), transparent); }
  .lp-chips::-webkit-scrollbar { display: none; }
  .lp-chips button { flex: none; height: 28px; padding: 0 11px; border-radius: 14px; border: 1px solid var(--line); background: var(--panel); color: var(--dim); font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s, border-color .15s; }
  .lp-chips button:hover { color: var(--ink); border-color: var(--line-2); }
  .lp-chips button.on { background: var(--ink); border-color: var(--ink); color: var(--panel); }
  .lp-chips button i { font-style: normal; font-weight: 500; opacity: .6; margin-left: 4px; }
  .lp-body { flex: 1; min-height: 0; overflow: auto; padding: 0 12px 16px; }
  .lp-tip { display: flex; gap: 8px; align-items: flex-start; margin: 12px 0 0; padding: 9px 10px; border-radius: 10px; background: var(--accent-soft); color: var(--ink); font-size: 12px; line-height: 1.4; }
  .lp-tip button { margin-left: auto; border: 0; background: none; color: var(--dim); cursor: pointer; font-size: 14px; line-height: 1; padding: 0 2px; }
  .lp-sec { position: sticky; top: 0; z-index: 3; display: flex; align-items: baseline; gap: 6px; margin: 0 -12px; padding: 14px 14px 8px; background: var(--panel); font-size: 12px; font-weight: 700; color: var(--ink); }
  .lp-sec span { font-weight: 500; color: var(--faint); }
  .lp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .lp-card { position: relative; border-radius: 12px; cursor: grab; user-select: none; }
  .lp-card .pv { position: relative; width: 100%; aspect-ratio: 4/3; border-radius: 11px; overflow: hidden; background: var(--panel-2); box-shadow: 0 0 0 1px var(--line); transition: box-shadow .15s; pointer-events: none; }
  .lp-card:hover .pv { box-shadow: 0 0 0 1.5px var(--line-2), 0 8px 22px rgba(0,0,0,.12); }
  .lp-card:active { cursor: grabbing; }
  .lp-card b { display: block; font-size: 12.5px; font-weight: 600; margin: 7px 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lp-card small { display: block; font-size: 11px; color: var(--faint); margin: 1px 2px 0; }
  .lp-card .add svg { width: 14px; height: 14px; display: block; }
  .lp-card .add { position: absolute; right: 7px; top: 7px; z-index: 2; width: 28px; height: 28px; padding: 0; border-radius: 50%; border: 0; background: var(--accent); color: var(--accent-ink); cursor: pointer;
    display: grid; place-items: center;
    box-shadow: 0 4px 12px rgba(0,0,0,.2); opacity: 0; transform: scale(.85); transition: opacity .15s, transform .15s; }
  .lp-card:hover .add, .lp-card .add:focus-visible { opacity: 1; transform: none; }
  .lp-list { display: grid; gap: 10px; }
  .lp-row { position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 0 0 1px var(--line); cursor: grab; background: var(--panel); transition: box-shadow .15s; }
  .lp-row:hover { box-shadow: 0 0 0 1.5px var(--line-2), 0 8px 22px rgba(0,0,0,.1); }
  .lp-row .pv { width: 100%; aspect-ratio: 2.2/1; pointer-events: none; }
  .lp-row .foot { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 12px; }
  .lp-row .foot b { font-size: 12.5px; } .lp-row .foot small { color: var(--faint); font-size: 11px; }
  .lp-row .foot button { margin-left: auto; height: 28px; padding: 0 14px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-weight: 600; font-size: 12px; cursor: pointer; }
  .lp-row .foot button:hover { border-color: var(--line-2); }
  .lp-row.on { box-shadow: 0 0 0 2px #f3a6e6; }
  .lp-row.on .foot button { background: #f3a6e6; border-color: #f3a6e6; color: #3a0632; }
  .lp-empty { color: var(--dim); text-align: center; padding: 36px 10px; }
  .lp-det { padding-top: 12px; animation: lpIn .32s cubic-bezier(.22,1,.36,1); }
  .lp-body.back > * { animation: lpBack .32s cubic-bezier(.22,1,.36,1); }
  @keyframes lpIn { from { opacity: 0; transform: translateX(18px); } }
  @keyframes lpBack { from { opacity: 0; transform: translateX(-14px); } }
  @media (prefers-reduced-motion: reduce) { .lp-det, .lp-body.back > * { animation: none; } }
  .lp-det .back { height: 28px; padding: 0 10px 0 8px; margin-bottom: 12px; font-size: 12px; }
  .lp-det .big { width: 100%; margin: 0 0 14px; }
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
  .lp-det .rng { display: flex; align-items: center; gap: 12px; } .lp-det .rng input { flex: 1; }
  .lp-det .rng output { min-width: 40px; height: 26px; padding: 0 6px; border-radius: 7px; background: var(--panel-2); border: 1px solid var(--line); display: grid; place-items: center; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--ink); }
  .lp-det .seg.sm { display: inline-flex; } .lp-det .seg.sm button { height: 28px; padding: 0 12px; text-transform: capitalize; }
  .lp-det .row2 { display: flex; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); } .lp-det .row2 button { flex: 1; }
  .lp-det .ib.danger { color: var(--fix); }
  .lp-cur { display: flex; align-items: center; gap: 10px; padding: 10px 10px 10px 12px; margin: 12px 0 0; border-radius: 12px; border: 1.5px solid ${PINK}; background: rgba(255,63,216,.07); }
  .lp-cur b { font-size: 12.5px; } .lp-cur small { display: block; color: var(--dim); font-size: 11.5px; }
  .lp-cur button { margin-left: auto; }

  #libGhost { position: fixed; left: -1000px; top: -1000px; padding: 7px 12px; border-radius: 10px; background: #c6f432; color: #141a00; font: 700 12px -apple-system, system-ui, sans-serif; white-space: nowrap; box-shadow: 0 6px 18px rgba(0,0,0,.25); }
  #libGhost.cap { background: #f3a6e6; color: #3a0632; }
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
  .lb-box.cap { border: 2px dashed ${PINK}; border-radius: 12px; box-shadow: 0 0 14px rgba(255,63,216,.55), inset 0 0 10px rgba(255,63,216,.25); }
  .lb-box.cap .lb-tag { position: absolute; left: 8px; top: -9px; padding: 1px 7px; border-radius: 6px; background: ${PINK}; color: #fff; font-size: 10px; font-weight: 700; white-space: nowrap; pointer-events: auto; cursor: pointer; }
  .lb-box.cap.sel { border-style: solid; box-shadow: 0 0 0 1px rgba(0,0,0,.3), 0 0 18px rgba(255,63,216,.7); cursor: move; }
  .lb-box.cap .lb-h { border-color: ${PINK}; }
  .lb-box.sel { outline: 2px solid #c6f432; outline-offset: 0; box-shadow: 0 0 0 1px rgba(0,0,0,.35); }
  .lb-h { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 2px; background: #fff; border: 1.5px solid #6f8f00; pointer-events: auto; }
  .lb-h.nw { left: 0; top: 0; cursor: nwse-resize; } .lb-h.ne { left: 100%; top: 0; cursor: nesw-resize; }
  .lb-h.sw { left: 0; top: 100%; cursor: nesw-resize; } .lb-h.se { left: 100%; top: 100%; cursor: nwse-resize; }

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
  .ll-blk.sel { box-shadow: 0 0 0 2px var(--panel), 0 0 0 4px var(--ink); z-index: 2; }
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
  #capInfo label.ck { position: relative; display: inline-flex; align-items: center; gap: 9px; padding: 6px 12px 6px 7px; border-radius: 10px; cursor: pointer; user-select: none; transition: background .15s; }
  #capInfo label.ck:hover { background: var(--hover); }
  #capInfo label.ck input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  #capInfo label.ck .box { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--line-2); background: var(--panel); display: grid; place-items: center; color: transparent;
    transition: background .18s, border-color .18s, color .18s, transform .18s cubic-bezier(.22,1,.36,1); }
  #capInfo label.ck .box svg { width: 12px; height: 12px; stroke-dasharray: 16; stroke-dashoffset: 16; transition: stroke-dashoffset .25s ease .05s; }
  #capInfo label.ck input:checked + .box { background: ${PINK}; border-color: ${PINK}; color: #fff; transform: scale(1.05); }
  #capInfo label.ck input:checked + .box svg { stroke-dashoffset: 0; }
  #capInfo label.ck input:focus-visible + .box { box-shadow: 0 0 0 3px rgba(255,63,216,.3); }
  #capInfo label.ck .t { font-size: 12.5px; font-weight: 600; color: var(--dim); }
  #capInfo label.ck input:checked ~ .t { color: var(--ink); }
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
  // hide / show the whole sidebar (header button, or ⇧\); remembered per browser
  SP.setOpen = (on, quiet) => {
    const app = $("#app"); if (!app) return;
    app.classList.toggle("side-off", !on);
    try { localStorage.setItem("cutnote:side", on ? "on" : "off"); } catch {}
    // the frame and timeline fit to the new width as the sidebar slides
    const t0 = performance.now(), tick = () => { dispatchEvent(new Event("resize")); if (performance.now() - t0 < 380) requestAnimationFrame(tick); };
    if (!quiet) requestAnimationFrame(tick); else dispatchEvent(new Event("resize"));
  };
  SP.isOpen = () => !$("#app").classList.contains("side-off");
  $("#sideHide").addEventListener("click", e => { e.stopPropagation(); SP.setOpen(false); });
  $("#sideShow").addEventListener("click", () => SP.setOpen(true));
  document.addEventListener("keydown", e => {
    if (e.key === "|" || (e.shiftKey && e.code === "Backslash")) { if (e.target.closest && e.target.closest("input, textarea, [contenteditable=true]")) return; e.preventDefault(); SP.setOpen(!SP.isOpen()); }
  });
  try { if (localStorage.getItem("cutnote:side") === "off") SP.setOpen(false, true); } catch {}
  SP.show = name => {
    if (!P[name]) return;
    if (!SP.isOpen()) SP.setOpen(true);
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
  function mkPreview(host, def, width, aspect) {
    const pv = VideoLibrary.preview(host, def.id, { width, aspect: aspect || 4 / 5, autoplay: false, radius: 0 });
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
  const ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  const tipOff = k => { try { return localStorage.getItem("cutnote:tip:" + k) === "off"; } catch { return false; } };
  function render(kind) {
    const pane = P[kind];
    if (!window.VideoLibrary) return;
    dropPreviews(kind);
    const { list, by } = collections(kind);
    if (!pane.dataset.built) {
      pane.dataset.built = "1";
      pane.innerHTML = `<div class="lp-head">${kind === "lib" ? `<label class="lp-search">${ICON_SEARCH}<input type="search" data-q placeholder="Search ${list.length} components" aria-label="Search components"></label>` : ""}
        <div class="lp-chips" role="tablist" data-chips></div></div><div class="lp-body" data-body></div>`;
      const q = pane.querySelector("[data-q]");
      if (q) q.addEventListener("input", () => { D.q = q.value.trim().toLowerCase(); D.detail.lib = null; render("lib"); });
      pane.querySelector("[data-chips]").addEventListener("click", e => { const b = e.target.closest("button[data-c]"); if (!b) return; D.coll[kind] = b.dataset.c; D.detail[kind] = null; render(kind); });
      const body = pane.querySelector("[data-body]");
      body.addEventListener("click", e => {
        const tipX = e.target.closest("[data-act=tipx]");
        if (tipX) { try { localStorage.setItem("cutnote:tip:" + kind, "off"); } catch {} tipX.closest(".lp-tip").remove(); return; }
        const r = e.target.closest("[data-act=removecap]");
        if (r) { removePlacement(r.dataset.id); return; }
        const add = e.target.closest("[data-act=add], [data-act=use]");
        if (add) { const def = VideoLibrary.components[add.closest("[data-id]").dataset.id]; if (def) place(def, S.t, null, null, null); return; }
        const c = e.target.closest(".lp-card, .lp-row");
        if (c) { (D.scroll = D.scroll || {})[kind] = body.scrollTop; D.detail[kind] = c.dataset.id; render(kind); body.scrollTop = 0; }
      });
      body.addEventListener("dragstart", onDragStart);
    }
    if (D.coll[kind] && !by.has(D.coll[kind])) D.coll[kind] = "";
    const names = [...by.keys()];
    pane.querySelector("[data-chips]").innerHTML = [["", "All", list.length], ...names.map(n => [n, n, by.get(n).length])]
      .map(([v, l, c]) => `<button type="button" role="tab" data-c="${esc(v)}" class="${v === D.coll[kind] ? "on" : ""}" aria-selected="${v === D.coll[kind]}">${esc(l)}<i>${c}</i></button>`).join("");
    const body = pane.querySelector("[data-body]");
    const det = D.detail[kind] && VideoLibrary.components[D.detail[kind]];
    pane.querySelector(".lp-head").style.display = det ? "none" : "";
    if (det) return openDetail(kind, det, body);
    const q = kind === "lib" ? D.q : "";
    const curCap = kind === "cap" ? placements().find(p => p.cap) : null;
    let html = "";
    if (!tipOff(kind)) html += `<div class="lp-tip"><span>${kind === "lib" ? "Drag a component onto your video, or press <b>+</b> to add it at the playhead. Click one to set it up first." : "One caption style for the whole video. Press <b>Use</b>, or drag it onto your video."}</span><button type="button" data-act="tipx" aria-label="Hide tip">×</button></div>`;
    if (curCap) html += `<div class="lp-cur"><span><b>${esc(short(curCap.c.name))} captions</b><small>For the whole video · Claude builds them on the next run</small></span><button class="ib" type="button" data-act="removecap" data-id="${esc(curCap.id)}">Remove</button></div>`;
    const match = (d, n) => !q || (d.name + " " + (d.description || "") + " " + (d.tags || []).join(" ") + " " + n).toLowerCase().includes(q);
    const sections = (D.coll[kind] ? [D.coll[kind]] : names).map(n => [n, by.get(n).filter(d => match(d, n))]).filter(([, ds]) => ds.length);
    if (!sections.length) html += `<div class="lp-empty">Nothing matches “${esc(q)}”.</div>`;
    for (const [n, ds] of sections) {
      html += `<div class="lp-sec">${esc(n)}<span>${ds.length}</span></div>`;
      if (kind === "lib") html += `<div class="lp-grid">${ds.map(d => `<div class="lp-card" draggable="true" data-id="${esc(d.id)}" title="${esc(d.description || "")}"><div class="pv"></div><button class="add" type="button" data-act="add" title="Add at the playhead" aria-label="Add ${esc(d.name)} at the playhead"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg></button><b>${esc(d.name)}</b><small>${esc(d.source || "")}</small></div>`).join("")}</div>`;
      else html += `<div class="lp-list">${ds.map(d => { const on = curCap && curCap.c.id === d.id; return `<div class="lp-row${on ? " on" : ""}" draggable="true" data-id="${esc(d.id)}" title="${esc(d.description || "")}"><div class="pv"></div><div class="foot"><span><b>${esc(short(d.name))}</b><br><small>${esc(d.source || "")}</small></span><button type="button" data-act="use">${on ? "In use" : "Use"}</button></div></div>`; }).join("")}</div>`;
    }
    const back = D.back === kind; D.back = null;
    body.classList.remove("back");
    body.innerHTML = html;
    if (back) { void body.offsetWidth; body.classList.add("back"); body.scrollTop = (D.scroll && D.scroll[kind]) || 0; }
    body.querySelectorAll(".lp-card .pv").forEach(el => mkPreview(el, VideoLibrary.components[el.closest("[data-id]").dataset.id], el.clientWidth || 160, 4 / 3));
    body.querySelectorAll(".lp-row .pv").forEach(el => mkPreview(el, VideoLibrary.components[el.closest("[data-id]").dataset.id], el.clientWidth || 330, 2.2));
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
    body.querySelector(".back").onclick = () => { D.detail[kind] = null; D.back = kind; render(kind); };
    const big = body.querySelector(".big");
    let pv = null;
    const show = () => { if (pv) pv.destroy(); pv = VideoLibrary.preview(big, def.id, { width: big.clientWidth || 300, aspect: kind === "cap" ? 2.2 : 4 / 3, params: Object.assign({}, params, def.preview && def.preview.params), radius: 12 }); D.ed = { host: body, api: { destroy: () => pv && pv.destroy() } }; };
    show();
    buildForm(body.querySelector(".form"), def, params, show);
    body.querySelector(".go").onclick = () => place(def, S.t, null, null, JSON.parse(JSON.stringify(params)));
  }

  // a component already on the video: edit it in place (changes save to its note and play straight away)
  function openPlacement(id) {
    const p = placements().find(q => q.id === id); if (!p) return;
    const def = VideoLibrary.components[p.c.id]; if (!def) return;
    const kind = p.cap ? "cap" : "lib";
    D.editing = id; D.selected = id;
    SP.show(kind);
    ensureLoaded().then(() => {
      if (!P[kind].dataset.built) render(kind);
      dropPreviews(kind);
      P[kind].querySelector(".lp-head").style.display = "none";
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
      body.querySelector(".back").onclick = () => { D.editing = null; D.selected = null; D.detail[kind] = null; D.back = kind; render(kind); paintFrame(); };
      body.querySelector('[data-a="done"]').onclick = () => { D.editing = null; D.selected = null; D.detail[kind] = null; D.back = kind; render(kind); paintFrame(); };
      body.querySelector('[data-a="del"]').onclick = async () => { D.editing = null; await removePlacement(id); D.detail[kind] = null; render(kind); toast("Removed"); };
      if (!p.cap) { if (!(S.t >= p.t && S.t <= p.t + p.dur)) seek(p.t); reveal(p.t, p.dur); }
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
          dx: drag && drag.dx != null ? drag.dx : +c.dx || 0, dy: drag && drag.dy != null ? drag.dy : +c.dy || 0,
          s: drag && drag.s != null ? drag.s : +c.scale || 1 };
      });
  }
  D.hasLane = () => placements().length > 0;
  // the lane holds a row for components and a thin row under it for the caption style, when there are both
  // components that overlap in time (including their floating labels) get their own rows; captions take a thin row under them
  const ROW = 24, CAPROW = 16;
  function laneRows() {
    const spans = [], at = new Map(), lab = 2.4;   // keep ~2.4 s clear after each block for its label
    const ps = placements().filter(q => !q.cap).sort((a, b) => a.t - b.t);
    const want = p => (D.drag && D.drag.id === p.id && D.drag.row != null) ? D.drag.row : (p.c.layer != null ? +p.c.layer : null);
    const free = (r, a, b) => !(spans[r] || []).some(([x, y]) => a < y && b > x);
    const put = (p, r) => { (spans[r] = spans[r] || []).push([p.t, p.t + Math.max(p.dur, 0) + lab]); at.set(p.id, r); };
    for (const p of ps) if (want(p) != null) put(p, Math.max(0, Math.min(11, want(p))));
    for (const p of ps) if (want(p) == null) { let r = 0; while (!free(r, p.t, p.t + p.dur + lab)) r++; put(p, r); }
    let n = 0; for (const r of at.values()) n = Math.max(n, r + 1);
    if (D.drag && D.drag.mode === "move" && D.drag.row != null) n = Math.max(n, D.drag.row + 1);
    return { n, at };
  }
  D.rowOf = id => laneRows().at.get(id) || 0;
  D.laneH = () => { const n = laneRows().n, cap = placements().some(p => p.cap); return Math.max(18, n * (ROW + 2) + (cap ? CAPROW + 2 : 0)); };

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

  // bring a placement into view on the timeline (pan, keeping the zoom) so you never have to scroll to find it
  function reveal(t, dur) {
    if (!S.view || !S.view.len) return;
    const a = toE(t), b = dur ? toE(t + dur) : a, D0 = progDur(), len = S.view.len;
    const inView = a >= S.view.start && b <= S.view.start + len;
    if (!inView) {
      const want = (b - a) < len * 0.8 ? a - len * 0.15 : a - len * 0.05;
      S.view.start = Math.max(0, Math.min(Math.max(0, D0 - len), want));
      S.follow = false;
    }
    draw();
  }
  D.reveal = reveal;

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
    reveal(cap ? 0 : t, cap ? 0 : dur);
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
        <div class="row"><label class="ck"><input type="checkbox"><span class="box"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg></span><span class="t">Don't show this again</span></label><button type="button">Got it</button></div></div></div>`);
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
    const c = e.target.closest(".lp-card, .lp-row"); if (!c) return;
    const def = VideoLibrary.components[c.dataset.id];
    e.dataTransfer.setData("application/x-cutnote-component", c.dataset.id);
    e.dataTransfer.setData("text/plain", def ? def.name : c.dataset.id);
    e.dataTransfer.effectAllowed = "copy";
    let ghost = $("#libGhost");
    if (!ghost) { ghost = document.createElement("div"); ghost.id = "libGhost"; document.body.appendChild(ghost); }
    ghost.className = isCap(def) ? "cap" : "";
    ghost.textContent = (isCap(def) ? "▤ " + short(def.name) + " captions" : "▦ " + (def ? def.name : c.dataset.id));
    try { e.dataTransfer.setDragImage(ghost, 16, 16); } catch (err) {}
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
    D._rows = laneRows();
    const html = [];
    for (const p of ps) {
      const a = p.cap ? 0 : toE(p.t), b = p.cap ? progDur() : toE(p.t + p.dur);
      let x0 = X(a), x1 = X(b);
      if (x1 < G || x0 > w) continue;
      x0 = Math.max(G, x0); x1 = Math.min(w, x1);
      const label = p.cap ? `Captions · ${esc(short(p.c.name))} <i>whole video</i>` : `${esc(p.c.name)} <i>${fmt(p.t)}</i>`;
      const LR = D._rows || (D._rows = laneRows());
      const by = p.cap ? g.y + LR.n * (ROW + 2) : g.y + (LR.at.get(p.id) || 0) * (ROW + 2), bh = p.cap ? CAPROW : ROW;
      const narrow = !p.cap && x1 - x0 < 150;
      html.push(`<div class="ll-blk${p.cap ? " cap" : ""}${D.selected === p.id || D.editing === p.id ? " sel" : ""}" data-id="${esc(p.id)}" style="left:${x0}px;width:${Math.max(18, x1 - x0)}px;top:${by}px;height:${bh}px" title="${esc(p.c.name)}: ${p.cap ? "caption style for the whole video" : "drag to move it; drag the right edge to change how long it plays"}">${narrow ? "" : label}<button class="x" type="button" title="Remove">×</button><span class="rs"></span></div>`);
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
    const row0 = D.rowOf(p.id), rows0 = laneRows().n;
    D.drag = { id: p.id, mode: e.target.closest(".rs") ? "len" : "move", x0: e.clientX, y0: e.clientY, dur0: p.dur, moved: false, row: null };
    trackDrag(ev => {
      const d = D.drag; if (!d) return;
      const dE = (ev.clientX - d.x0) * per;
      if (Math.abs(ev.clientX - d.x0) > 3 || Math.abs(ev.clientY - d.y0) > 6) d.moved = true;
      if (d.mode === "move") { const r = Math.max(0, Math.min(rows0, row0 + Math.round((ev.clientY - d.y0) / (ROW + 2)))); if (r !== row0 || d.row != null) d.row = r; }
      if (d.mode === "move") d.t = toS(Math.max(0, Math.min(progDur() - 0.2, E0 + dE)));
      else d.dur = Math.max(0.6, +(d.dur0 + dE).toFixed(2));
      D.paintLane();
    }, async cancelled => {
      const d = D.drag; if (!d) return;
      if (cancelled || !d.moved) { D.drag = null; if (!cancelled) { seek(p.t); openPlacement(p.id); } D.paintLane(); return; }
      const patch = { id: p.id };
      if (d.mode === "move") {
        if (d.t != null) { patch.t = +d.t.toFixed(3); patch.end = +(d.t + p.dur).toFixed(3); patch.frame = Math.round(d.t * FPS); if (typeof contextAt === "function") patch.context = contextAt(patch.t); }
        if (d.row != null && d.row !== row0) patch.component = Object.assign({}, p.c, { layer: d.row });
      }
      else { patch.component = Object.assign({}, p.c, { params: Object.assign({}, p.c.params, { duration: d.dur }) }); patch.end = +(p.t + d.dur).toFixed(3); }
      try { await noteOp("update", patch); toast(d.mode !== "move" ? `Plays for ${d.dur.toFixed(1)} s` : patch.component ? `Moved to row ${d.row + 1}${d.row === 0 ? " (in front)" : ""}` : `Moved to ${fmt(patch.t)}`); }
      catch (err) { toast("Couldn't save that change"); }
      finally { D.drag = null; layoutLanes(); draw(); sync(true); }
      if (d.mode === "move" && patch.t != null) seek(patch.t);
    });
  });

  /* ---------- video: neon outlines while each one plays (drag the chip to move it) ---------- */
  // where a placed component sits on the canvas (component px), with its move and size applied
  function boxOf(p) {
    const b = measureBox(p.c.id, p.c.params);
    if (!b || b.whole || !(b.x1 > b.x0)) return { x0: 0, y0: 0, x1: VideoLibrary.W, y1: VideoLibrary.H, cx: VideoLibrary.W / 2, cy: VideoLibrary.H / 2, whole: true };
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, hw = (b.x1 - b.x0) / 2 * p.s, hh = (b.y1 - b.y0) / 2 * p.s;
    return { x0: cx - hw + p.dx, y0: cy - hh + p.dy, x1: cx + hw + p.dx, y1: cy + hh + p.dy, cx, cy };
  }
  function paintFrame() {
    frameBits();
    const box = $("#libBoxes"), fr = frEl.getBoundingClientRect();
    if (!fr.width || !window.VideoLibrary) { box.innerHTML = ""; return; }
    const m = MAP(), fx = fr.width / S.W, k = m.k * fx, ox = m.ox * fx, oy = m.oy * fx, html = [];
    for (const p of placements()) {
      if (p.cap) {   // where the captions will sit, for the whole video: select it (tag or timeline block) to move or resize it
        const q = boxOf(p); if (q.whole) continue;
        const sel = D.selected === p.id;
        const L = ox + (q.x0 - 30) * k, T = oy + (q.y0 - 18) * k, W = (q.x1 - q.x0 + 60) * k, H = (q.y1 - q.y0 + 36) * k;
        const hs = sel ? ["nw", "ne", "sw", "se"].map(c => `<i class="lb-h ${c}" data-h="${c}"></i>`).join("") : "";
        html.push(`<div class="lb-box cap${sel ? " sel" : ""}" data-id="${esc(p.id)}" style="left:${L.toFixed(1)}px;top:${T.toFixed(1)}px;width:${W.toFixed(1)}px;height:${H.toFixed(1)}px"><span class="lb-tag" title="Select to move or resize the captions">${esc(short(p.c.name))} captions</span>${hs}</div>`);
        continue;
      }
      if (!(S.t >= p.t - 0.01 && S.t <= p.t + p.dur)) continue;
      const q = boxOf(p), pad = 10, sel = D.selected === p.id;
      const L = ox + (q.x0 - pad) * k, T = oy + (q.y0 - pad) * k, W = (q.x1 - q.x0 + pad * 2) * k, H = (q.y1 - q.y0 + pad * 2) * k;
      const hs = sel && !q.whole ? ["nw", "ne", "sw", "se"].map(c => `<i class="lb-h ${c}" data-h="${c}"></i>`).join("") : "";
      html.push(`<div class="lb-box${sel ? " sel" : ""}" data-id="${esc(p.id)}" style="left:${L.toFixed(1)}px;top:${T.toFixed(1)}px;width:${W.toFixed(1)}px;height:${H.toFixed(1)}px">${hs}</div>`);
    }
    const out = html.join("");
    if (box._html !== out) { box.innerHTML = out; box._html = out; }
  }
  D.select = id => { D.selected = id || null; paintFrame(); };
  // select, move (drag it) and resize (drag a corner) a placed component on the video, with the Select tool
  frEl.addEventListener("pointerdown", e => {
    if (e.button !== 0 || !window.VideoLibrary) return;
    const handle = e.target.closest(".lb-h");
    let boxEl = (handle || e.target.closest(".lb-tag")) && e.target.closest(".lb-box");
    if (!boxEl && typeof INK !== "undefined" && INK.tool === "select") {
      boxEl = [...frEl.querySelectorAll(".lb-box:not(.cap), .lb-box.cap.sel")].reverse().find(b => { const r = b.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
    }
    if (!boxEl) { if (D.selected && typeof INK !== "undefined" && INK.tool === "select") D.select(null); return; }
    const p = placements().find(q => q.id === boxEl.dataset.id); if (!p) return;
    e.preventDefault(); e.stopPropagation();
    if (D.selected !== p.id) { D.selected = p.id; openPlacement(p.id); paintFrame(); }
    if (p.cap && !boxOf(p).cx) return;
    const fr = frEl.getBoundingClientRect(), m = MAP(), per = S.W / fr.width / m.k;   // screen px -> component px
    const q = boxOf(p), ccx = fr.left + (m.ox + (q.cx + p.dx) * m.k) * fr.width / S.W, ccy = fr.top + (m.oy + (q.cy + p.dy) * m.k) * fr.width / S.W;
    const r0 = Math.hypot(e.clientX - ccx, e.clientY - ccy) || 1;
    D.drag = { id: p.id, mode: handle ? "size" : "move", x0: e.clientX, y0: e.clientY, dx0: p.dx, dy0: p.dy, s0: p.s, moved: false };
    trackDrag(ev => {
      const d = D.drag; if (!d) return;
      if (Math.abs(ev.clientX - d.x0) + Math.abs(ev.clientY - d.y0) > 3) d.moved = true;
      if (d.mode === "move") { d.dx = Math.round(d.dx0 + (ev.clientX - d.x0) * per); d.dy = Math.round(d.dy0 + (ev.clientY - d.y0) * per); }
      else d.s = Math.max(0.25, Math.min(4, +(d.s0 * Math.hypot(ev.clientX - ccx, ev.clientY - ccy) / r0).toFixed(3)));
      paintFrame(); const z = placements().find(x => x.id === p.id); if (z) liveMove(p.id, z.dx, z.dy, z.s);
    }, async cancelled => {
      const d = D.drag;
      if (!d || cancelled || !d.moved) { D.drag = null; liveMove(p.id, p.c.dx, p.c.dy, +p.c.scale || 1); paintFrame(); return; }
      const c = Object.assign({}, p.c);
      if (d.mode === "move") { c.dx = d.dx; c.dy = d.dy; } else c.scale = d.s;
      const b = measureBox(p.c.id, p.c.params);
      if (b && b.x1 > b.x0) { c.x = Math.round(m.ox + ((b.x0 + b.x1) / 2 + (+c.dx || 0)) * m.k); c.y = Math.round(m.oy + ((b.y0 + b.y1) / 2 + (+c.dy || 0)) * m.k); }
      try { await noteOp("update", { id: p.id, component: c }); toast(d.mode === "move" ? "Moved" : `Size ${Math.round(d.s * 100)}%`); }
      catch (err) { toast("Couldn't save that"); }
      finally { D.drag = null; sync(true); }
    });
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && D.selected && !e.target.closest("input, textarea")) D.select(null); });

  /* ---------- live: placed components play on the video at once ----------
   * Mounted into the composition's own page and added to its GSAP timeline, so they play, scrub and loop with the edit.
   * Notes marked done are left to the real build. Nothing here touches the composition's files. */
  const LIVE = { win: null, rt: null, ids: new Set(), items: new Map(), sig: "", busy: false };
  function liveFrame() {
    const fr = typeof compFrame === "function" ? compFrame() : null;
    return fr && fr.w && fr.w.gsap && fr.w.__timelines && fr.w.__timelines.main ? fr : null;
  }
  function loadInto(w, src) { return new Promise(res => { const s = w.document.createElement("script"); s.src = src; s.onload = s.onerror = res; setTimeout(res, 6000); try { w.document.head.appendChild(s); } catch (e) { res(); } }); }
  function liveT(dx, dy, sc, cx, cy) {
    const m = MAP(), z = +sc || 1;
    const grow = z !== 1 && cx != null ? ` translate(${cx}px,${cy}px) scale(${z}) translate(${-cx}px,${-cy}px)` : "";
    return `translate(${m.ox}px,${m.oy}px) scale(${m.k}) translate(${+dx || 0}px,${+dy || 0}px)${grow}`;
  }
  function centreOf(p) { const b = measureBox(p.c.id, p.c.params); return b && b.x1 > b.x0 && !b.whole ? [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2] : [null, null]; }
  function fixScrims(holder, dx, dy) {
    for (const sc of holder.querySelectorAll(".vl-scrim")) {
      if (sc.dataset.h0 == null) sc.dataset.h0 = parseFloat(sc.style.height) || 0;
      sc.style.left = (-(+dx || 0) - 200) + "px"; sc.style.right = ((+dx || 0) - 200) + "px";
      sc.style.height = (+sc.dataset.h0 + Math.max(0, -(+dy || 0)) + 200) + "px";
    }
  }
  function liveMove(id, dx, dy, sc) {
    const p = placements().find(q => q.id === id); const [cx, cy] = p ? centreOf(p) : [null, null];
    for (const v of LIVE.items.values()) if (v.id === id) { v.holder.style.transform = liveT(dx, dy, sc, cx, cy); fixScrims(v.holder, dx, dy); }
  }
  async function liveSync(force) {
    if (LIVE.busy) { if (force) setTimeout(() => liveSync(true), 300); return; }
    const fr = liveFrame();
    if (!fr || !window.VideoLibrary) return;
    const want = placements().filter(p => !p.cap);
    const keyOf = p => p.id + JSON.stringify([p.c.id, p.c.params, +p.n.t || 0, p.c.dx, p.c.dy, p.c.scale, D.rowOf(p.id)]);
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
        holder.style.cssText = `position:absolute;left:0;top:0;width:${W.VideoLibrary.W}px;height:${W.VideoLibrary.H}px;pointer-events:none;z-index:${950 - D.rowOf(p.id)};transform-origin:0 0;transform:${liveT(p.c.dx, p.c.dy, p.c.scale, ...centreOf(p))}`;
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
