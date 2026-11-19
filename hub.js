"use strict";
/* Cutnote Hub: every project on this computer in one screen. Open, rename, remove, trash, create.
   The list lives in ~/.config/cutnote/projects.json (see review.py). Renaming only changes the name shown here:
   folders on disk keep their names. The header's "Cutnote Editor" menu switches between the editor and the Hub. */
(() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = `
  .brand { position: relative; flex: none; }
  #title { flex: 0 1 auto; min-width: 40px; }
  @media (max-width: 900px) { #brandBtn b span { display: none; } }
  #brandBtn { flex: none; display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 10px 0 4px; margin-left: -4px; border: 1px solid transparent; border-radius: 10px; background: none; color: var(--ink); cursor: pointer; font: inherit; }
  #brandBtn:hover, .brand.open #brandBtn { background: var(--raise); border-color: var(--line); }
  #brandBtn b { font-size: 14px; font-weight: 700; letter-spacing: -.01em; white-space: nowrap; }
  #brandBtn b span { color: var(--dim); font-weight: 600; }
  #brandBtn > svg { width: 12px; height: 12px; color: var(--dim); transition: transform .2s; }
  .brand.open #brandBtn > svg { transform: rotate(180deg); }
  #brandPop { position: absolute; top: calc(100% + 10px); left: 0; z-index: 80; width: 380px; padding: 8px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line-2);
    box-shadow: 0 24px 60px rgba(0,0,0,.2), 0 2px 8px rgba(0,0,0,.08); opacity: 0; transform: translateY(-6px) scale(.98); transform-origin: top left; pointer-events: none;
    transition: opacity .16s ease, transform .22s cubic-bezier(.22,1,.36,1); }
  #brandPop::before { content: ""; position: absolute; left: 0; right: 0; top: -12px; height: 12px; }
  .brand.open #brandPop { opacity: 1; transform: none; pointer-events: auto; }
  #brandPop button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; border: 0; border-radius: 11px; background: none; color: var(--ink); text-align: left; cursor: pointer; font: inherit; }
  #brandPop button:hover { background: var(--raise); }
  #brandPop .tile { flex: none; width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); }
  #brandPop .tile.dark { background: var(--ink); color: var(--panel); }
  #brandPop .tile svg { width: 18px; height: 18px; }
  #brandPop b { display: block; font-size: 13px; } #brandPop small { display: block; color: var(--dim); font-size: 11.5px; line-height: 1.35; margin-top: 2px; }
  #brandPop .ck { margin-left: auto; width: 16px; height: 16px; color: var(--accent-text, var(--ink)); opacity: 0; }
  #brandPop button[aria-current="true"] .ck { opacity: 1; }
  #title { color: var(--dim); font-weight: 500; }

  body.hub-on { overflow: hidden; }
  #hub { position: fixed; inset: 0; z-index: 300; display: flex; flex-direction: column; background: var(--bg); color: var(--ink);
    opacity: 0; transform: scale(.985); pointer-events: none; transition: opacity .2s ease, transform .28s cubic-bezier(.22,1,.36,1); }
  body.hub-on #hub { opacity: 1; transform: none; pointer-events: auto; }
  #hub .hb-top { flex: none; display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 20px; border-bottom: 1px solid var(--line); background: var(--panel); }
  #hub .hb-brand { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; }
  #hub .hb-brand .logo { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); }
  #hub .hb-brand .logo svg { width: 15px; height: 15px; }
  #hub .hb-brand span { color: var(--dim); font-weight: 600; }
  #hub .sp { flex: 1; }
  #hub .hb-btn { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 13px; border-radius: 9px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: 600 12.5px -apple-system, system-ui, sans-serif; cursor: pointer; white-space: nowrap; }
  #hub .hb-btn:hover { border-color: var(--line-2); background: var(--raise); }
  #hub .hb-btn svg { width: 14px; height: 14px; }
  #hub .hb-btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  #hub .hb-btn.primary:hover { filter: brightness(.97); }
  #hub .hb-btn.ghost { border-color: transparent; color: var(--dim); }
  #hub .hb-btn.ghost:hover { color: var(--ink); background: var(--hover); }
  #hub .hb-search { position: relative; width: min(320px, 30vw); }
  #hub .hb-search svg { position: absolute; left: 11px; top: 50%; width: 14px; height: 14px; transform: translateY(-50%); color: var(--faint); pointer-events: none; }
  #hub .hb-search input { width: 100%; height: 34px; padding: 0 12px 0 33px; border-radius: 9px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-size: 13px; }
  #hub .hb-search input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: var(--panel); }
  #hub .hb-main { flex: 1; overflow: auto; padding: 28px clamp(16px, 4vw, 48px) 60px; }
  #hub .hb-head { display: flex; align-items: flex-end; gap: 14px; max-width: 1400px; margin: 0 auto 18px; }
  #hub h2 { margin: 0; font-size: 26px; font-weight: 750; letter-spacing: -.02em; }
  #hub .hb-head p { margin: 4px 0 0; color: var(--dim); font-size: 13px; }
  #hub .hb-sort { display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--panel-2); border: 1px solid var(--line); }
  #hub .hb-sort button { height: 28px; padding: 0 11px; border: 0; border-radius: 7px; background: none; color: var(--dim); font: 600 12px -apple-system, system-ui, sans-serif; cursor: pointer; }
  #hub .hb-sort button.on { background: var(--panel); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  #hub .hb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 18px; max-width: 1400px; margin: 0 auto; }
  .hb-card { position: relative; display: flex; flex-direction: column; border-radius: 16px; background: var(--panel); box-shadow: 0 0 0 1px var(--line); cursor: pointer; text-align: left;
    transition: box-shadow .18s, transform .25s cubic-bezier(.22,1,.36,1); animation: hbIn .35s cubic-bezier(.22,1,.36,1) both; }
  .hb-card:hover { box-shadow: 0 0 0 1.5px var(--line-2), 0 16px 40px rgba(0,0,0,.12); transform: translateY(-2px); }
  .hb-card.cur { box-shadow: 0 0 0 2px var(--accent); }
  .hb-card.missing { opacity: .6; }
  @keyframes hbIn { from { opacity: 0; transform: translateY(8px); } }
  .hb-pic { position: relative; aspect-ratio: 4 / 5; border-radius: 16px 16px 0 0; overflow: hidden; background: linear-gradient(150deg, var(--panel-2), var(--raise)); }
  .hb-pic img { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s cubic-bezier(.22,1,.36,1); }
  .hb-card:hover .hb-pic img { transform: scale(1.03); }
  .hb-pic .ph { position: absolute; inset: 0; display: grid; place-items: center; font-size: 46px; font-weight: 800; color: var(--faint); letter-spacing: -.03em; }
  .hb-pic::after { content: ""; position: absolute; z-index: 1; inset: auto 0 0; height: 40%; background: linear-gradient(transparent, rgba(0,0,0,.35)); pointer-events: none; }
  .hb-badge { position: absolute; z-index: 2; top: 10px; left: 10px; height: 22px; padding: 0 9px; border-radius: 11px; display: inline-flex; align-items: center; gap: 5px; font: 700 11px -apple-system, system-ui, sans-serif; }
  .hb-badge.cur { background: var(--accent); color: var(--accent-ink); }
  .hb-badge.miss { background: rgba(20,20,20,.75); color: #fff; }
  .hb-open { position: absolute; z-index: 2; left: 50%; bottom: 14px; transform: translate(-50%, 6px); opacity: 0; height: 32px; padding: 0 16px; border-radius: 16px; border: 0; background: #fff; color: #111;
    font: 700 12px -apple-system, system-ui, sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,.25); transition: opacity .16s, transform .22s cubic-bezier(.22,1,.36,1); pointer-events: none; white-space: nowrap; }
  .hb-card:hover .hb-open { opacity: 1; transform: translate(-50%, 0); }
  .hb-more { position: absolute; z-index: 3; top: 8px; right: 8px; width: 30px; height: 30px; border-radius: 9px; border: 0; display: grid; place-items: center; background: rgba(255,255,255,.92); color: #111;
    cursor: pointer; opacity: 0; transition: opacity .15s; box-shadow: 0 2px 8px rgba(0,0,0,.18); }
  .hb-card:hover .hb-more, .hb-more[aria-expanded="true"] { opacity: 1; }
  .hb-more svg { width: 15px; height: 15px; }
  .hb-body { padding: 12px 14px 14px; display: grid; gap: 4px; min-width: 0; }
  .hb-name { font-size: 14px; font-weight: 700; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; outline: none; border-radius: 5px; }
  .hb-name[contenteditable="true"] { white-space: normal; box-shadow: 0 0 0 2px var(--accent); padding: 1px 4px; margin: -1px -4px; cursor: text; background: var(--panel); }
  .hb-meta { display: flex; flex-wrap: wrap; gap: 4px 10px; color: var(--dim); font-size: 12px; }
  .hb-meta .open { color: var(--change, #ff9500); font-weight: 600; }
  .hb-path { color: var(--faint); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hb-new { display: grid; place-items: center; align-content: center; gap: 10px; min-height: 260px; border-radius: 16px; border: 1.5px dashed var(--line-2); background: none; color: var(--dim); cursor: pointer; font: 600 13px -apple-system, system-ui, sans-serif; transition: border-color .15s, color .15s, background .15s; }
  .hb-new:hover { border-color: var(--accent); color: var(--ink); background: var(--panel); }
  .hb-new i { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); }
  .hb-new i svg { width: 20px; height: 20px; }
  .hb-empty { max-width: 460px; margin: 60px auto; text-align: center; color: var(--dim); font-size: 14px; line-height: 1.5; }
  .hb-menu { position: fixed; z-index: 320; min-width: 210px; padding: 6px; border-radius: 13px; background: var(--panel); border: 1px solid var(--line-2); box-shadow: 0 18px 50px rgba(0,0,0,.22); }
  .hb-menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px; background: none; color: var(--ink); font: 500 13px -apple-system, system-ui, sans-serif; text-align: left; cursor: pointer; }
  .hb-menu button:hover { background: var(--raise); }
  .hb-menu button svg { width: 15px; height: 15px; color: var(--dim); }
  .hb-menu hr { border: 0; border-top: 1px solid var(--line); margin: 5px 4px; }
  .hb-menu .danger, .hb-menu .danger svg { color: #e5484d; }
  .hb-modal { position: fixed; inset: 0; z-index: 340; display: grid; place-items: center; background: rgba(10,12,18,.45); backdrop-filter: blur(4px); animation: hbFade .18s ease both; }
  @keyframes hbFade { from { opacity: 0; } }
  .hb-dlg { width: min(520px, calc(100vw - 32px)); max-height: calc(100vh - 40px); overflow: auto; border-radius: 20px; background: var(--panel); box-shadow: 0 30px 80px rgba(0,0,0,.35); padding: 22px; animation: hbPop .26s cubic-bezier(.22,1,.36,1) both; }
  @keyframes hbPop { from { opacity: 0; transform: translateY(10px) scale(.98); } }
  .hb-dlg h3 { margin: 0 0 4px; font-size: 18px; font-weight: 750; letter-spacing: -.01em; }
  .hb-dlg > p { margin: 0 0 16px; color: var(--dim); font-size: 13px; line-height: 1.45; }
  .hb-dlg label.f { display: grid; gap: 6px; margin-bottom: 14px; font-size: 12px; font-weight: 600; color: var(--dim); }
  .hb-dlg input[type=text] { height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-size: 14px; }
  .hb-dlg input[type=text]:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: var(--panel); }
  .hb-where { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-size: 12.5px; font-weight: 500; }
  .hb-where span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
  .hb-drop { display: grid; place-items: center; gap: 6px; padding: 22px 14px; border-radius: 14px; border: 1.5px dashed var(--line-2); color: var(--dim); font-size: 13px; text-align: center; cursor: pointer; transition: border-color .15s, background .15s; }
  .hb-drop.over, .hb-drop:hover { border-color: var(--accent); background: var(--accent-soft); color: var(--ink); }
  .hb-drop svg { width: 22px; height: 22px; }
  .hb-files { display: grid; gap: 4px; margin-top: 8px; font-size: 12px; color: var(--dim); }
  .hb-files div { display: flex; gap: 8px; align-items: center; } .hb-files b { color: var(--ink); font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hb-files i { font-style: normal; font-variant-numeric: tabular-nums; }
  .hb-acts { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; flex-wrap: wrap; }
  .hb-btn.danger { background: #e5484d !important; border-color: #e5484d !important; color: #fff !important; }
  .hb-roots { display: grid; gap: 6px; margin: 4px 0 6px; }
  .hb-roots div { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 12px; border-radius: 10px; background: var(--panel-2); border: 1px solid var(--line); font-size: 12.5px; }
  .hb-roots span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
  .hb-roots button { border: 0; background: none; color: var(--dim); cursor: pointer; font-size: 15px; padding: 0 4px; }
  .hb-err { color: #e5484d; font-size: 12.5px; margin-top: -6px; margin-bottom: 10px; min-height: 0; }
  @media (max-width: 720px) { #hub .hb-search { display: none; } #hub .hb-top .lbl { display: none; } }
  @media (prefers-reduced-motion: reduce) { #hub, .hb-card, .hb-dlg, .hb-modal { transition: none; animation: none; } }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const I = {
    chev: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5 6 7.5l3-3"/></svg>',
    check: '<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',
  };
  const api = async (body) => {
    const r = await fetch("/api/hub", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Something went wrong"); return j;
  };
  const say = m => (typeof toast === "function" ? toast(m) : null);

  /* ---------- header: "Cutnote Editor" with a menu to the Hub ---------- */
  const brand = document.querySelector("header .brand");
  const logo = brand.querySelector(".logo").outerHTML;
  brand.innerHTML = `<button type="button" id="brandBtn" aria-haspopup="true" aria-expanded="false">${logo}<b>Cutnote <span>Editor</span></b>${I.chev}</button>
    <div id="brandPop" role="menu">
      <button type="button" role="menuitem" data-go="editor" aria-current="true"><span class="tile"><svg><use href="#i-blade"/></svg></span><span><b>Cutnote Editor</b><small>Review, cut and build this project</small></span>${I.check}</button>
      <button type="button" role="menuitem" data-go="hub" aria-current="false"><span class="tile dark">${I.grid}</span><span><b>Cutnote Hub</b><small>All your projects: open, rename, create</small></span>${I.check}</button>
    </div>`;
  const title = document.createElement("h1"); title.id = "title"; title.textContent = (typeof S !== "undefined" && S.info && (S.info.name || S.info.video)) || "";
  title.title = "Open Cutnote Hub to switch project"; title.style.cursor = "pointer"; title.onclick = () => H.show(true);
  const oldTitle = document.getElementById("title"); if (oldTitle && oldTitle !== title) oldTitle.remove();
  brand.after(title);
  (function hover() {
    let t = 0; const set = on => { brand.classList.toggle("open", on); $("#brandBtn").setAttribute("aria-expanded", String(on)); };
    brand.addEventListener("mouseenter", () => { clearTimeout(t); t = setTimeout(() => set(true), 80); });
    brand.addEventListener("mouseleave", () => { clearTimeout(t); t = setTimeout(() => set(false), 220); });
    $("#brandBtn").addEventListener("click", () => set(!brand.classList.contains("open")));
    document.addEventListener("pointerdown", e => { if (!brand.contains(e.target)) set(false); });
    $("#brandPop").addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (!b) return; set(false); H.show(b.dataset.go === "hub"); });
  })();

  /* ---------- the Hub screen ---------- */
  document.body.insertAdjacentHTML("beforeend", `<section id="hub" aria-label="Cutnote Hub" aria-hidden="true">
    <div class="hb-top">
      <div class="hb-brand"><span class="logo"><svg><use href="#i-blade"/></svg></span>Cutnote <span>Hub</span></div>
      <button type="button" class="hb-btn ghost" data-a="back">${I.back}<span class="lbl">Back to the editor</span></button>
      <span class="sp"></span>
      <label class="hb-search">${I.search}<input type="search" placeholder="Search projects" aria-label="Search projects" data-q></label>
      <button type="button" class="hb-btn" data-a="roots" title="Folders the Hub watches for projects">${I.folder}<span class="lbl">Folders</span></button>
      <button type="button" class="hb-btn primary" data-a="new">${I.plus}New project</button>
    </div>
    <div class="hb-main"><div class="hb-head"><div><h2>Projects</h2><p data-sub>Loading…</p></div><span class="sp"></span>
      <div class="hb-sort" role="tablist" aria-label="Sort"><button type="button" data-sort="opened" class="on">Recent</button><button type="button" data-sort="changed">Last edited</button><button type="button" data-sort="name">Name</button></div></div>
      <div class="hb-grid" data-grid></div></div>
  </section>`);
  const hub = $("#hub"), grid = hub.querySelector("[data-grid]");
  const H = (window.CutnoteHub = { data: null, q: "", sort: (() => { try { return localStorage.getItem("cutnote:hubsort") || "opened"; } catch { return "opened"; } })() });
  hub.querySelectorAll("[data-sort]").forEach(b => b.classList.toggle("on", b.dataset.sort === H.sort));

  H.show = on => {
    document.body.classList.toggle("hub-on", on); hub.setAttribute("aria-hidden", String(!on));
    $("#brandPop").querySelectorAll("[data-go]").forEach(b => b.setAttribute("aria-current", String((b.dataset.go === "hub") === on)));
    if (on) { if (typeof S !== "undefined" && S.playing && typeof pause === "function") pause(); load(); if (location.hash !== "#hub") history.replaceState(null, "", "#hub"); }
    else if (location.hash === "#hub") history.replaceState(null, "", location.pathname + location.search);
  };
  async function load() {
    try { H.data = await fetch("/api/hub", { cache: "no-store" }).then(r => r.json()); } catch { hub.querySelector("[data-sub]").textContent = "Couldn't load your projects"; return; }
    paint();
  }
  const ago = iso => {
    if (!iso) return ""; const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return "just now"; if (s < 3600) return Math.round(s / 60) + " min ago"; if (s < 86400) return Math.round(s / 3600) + " h ago";
    if (s < 86400 * 7) return Math.round(s / 86400) + (Math.round(s / 86400) === 1 ? " day ago" : " days ago");
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
  };
  // "in Other Videos" style: the folder it sits in, full path on hover
  const where = path => { const parts = path.split(/[\\/]/).filter(Boolean); return parts.length > 1 ? "in " + parts[parts.length - 2] : path; };
  function paint() {
    const d = H.data; if (!d) return;
    const q = H.q.toLowerCase();
    let ps = d.projects.filter(p => !q || (p.name + " " + p.path).toLowerCase().includes(q));
    const key = p => H.sort === "name" ? p.name.toLowerCase() : (H.sort === "changed" ? p.changed : (p.opened || p.added || p.changed)) || "";
    ps.sort((a, b) => b.current - a.current || (H.sort === "name" ? key(a).localeCompare(key(b)) : String(key(b)).localeCompare(String(key(a)))));
    hub.querySelector("[data-sub]").textContent = d.projects.length ? `${d.projects.length} project${d.projects.length === 1 ? "" : "s"} on this computer` : "No projects yet";
    const card = p => {
      const meta = [];
      if (p.open) meta.push(`<span class="open">${p.open} open note${p.open === 1 ? "" : "s"}</span>`);
      if (p.versions) meta.push(`${p.versions} version${p.versions === 1 ? "" : "s"}`);
      else if (p.videos != null) meta.push(p.videos ? `${p.videos} video${p.videos === 1 ? "" : "s"}` : "No footage yet");
      if (p.changed) meta.push("Edited " + ago(p.changed));
      const init = esc((p.name.match(/[A-Za-z0-9]/) || ["•"])[0].toUpperCase());
      return `<div class="hb-card${p.current ? " cur" : ""}${p.exists ? "" : " missing"}" data-id="${p.id}" role="button" tabindex="0" aria-label="Open ${esc(p.name)}">
        <div class="hb-pic"><span class="ph">${init}</span>${p.exists ? `<img alt="" loading="lazy" src="/api/hub/thumb?id=${p.id}&v=${encodeURIComponent(p.changed || "")}" onerror="this.remove()">` : ""}
          ${p.current ? `<span class="hb-badge cur">Open now</span>` : p.exists ? "" : `<span class="hb-badge miss">Folder missing</span>`}
          <button type="button" class="hb-more" data-a="more" aria-label="More for ${esc(p.name)}" aria-expanded="false">${I.dots}</button>
          ${p.exists ? `<span class="hb-open">${p.current ? "Back to it" : "Open"}</span>` : ""}</div>
        <div class="hb-body"><div class="hb-name" data-name>${esc(p.name)}</div><div class="hb-meta">${meta.join("<span>·</span>")}</div><div class="hb-path" title="${esc(p.path)}">${esc(where(p.path))}</div></div></div>`;
    };
    grid.innerHTML = (q ? "" : `<button type="button" class="hb-new" data-a="new"><i>${I.plus}</i>New project</button>`) + ps.map(card).join("");
    if (q && !ps.length) grid.innerHTML = `<div class="hb-empty" style="grid-column:1/-1">No projects match "${esc(H.q)}"</div>`;
  }
  hub.querySelector("[data-q]").addEventListener("input", e => { H.q = e.target.value.trim(); paint(); });
  hub.querySelector(".hb-sort").addEventListener("click", e => { const b = e.target.closest("[data-sort]"); if (!b) return; H.sort = b.dataset.sort; try { localStorage.setItem("cutnote:hubsort", H.sort); } catch {} hub.querySelectorAll("[data-sort]").forEach(x => x.classList.toggle("on", x === b)); paint(); });
  hub.addEventListener("click", e => {
    const a = e.target.closest("[data-a]"), c = e.target.closest(".hb-card");
    if (a && a.dataset.a === "back") return H.show(false);
    if (a && a.dataset.a === "new") return newProject();
    if (a && a.dataset.a === "roots") return roots();
    if (a && a.dataset.a === "more" && c) { e.stopPropagation(); return menu(a, proj(c.dataset.id)); }
    if (c && !e.target.closest("[contenteditable=true]")) open(proj(c.dataset.id));
  });
  hub.addEventListener("keydown", e => { const c = e.target.closest && e.target.closest(".hb-card"); if (c && e.target === c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(proj(c.dataset.id)); } });
  const proj = id => H.data.projects.find(p => p.id === id);

  async function open(p) {
    if (!p) return;
    if (p.current) return H.show(false);
    if (!p.exists) return say("Its folder is missing. Is the drive connected?");
    try { await api({ action: "open", id: p.id }); } catch (e) { return say(e.message); }
    try { sessionStorage.removeItem("cutnote:resume"); } catch {}
    location.replace(location.pathname);
  }
  let menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; hub.querySelectorAll('.hb-more[aria-expanded="true"]').forEach(b => b.setAttribute("aria-expanded", "false")); } }
  function menu(btn, p) {
    closeMenu(); if (!p) return;
    const where = H.data.platform === "darwin" ? "Show in Finder" : H.data.platform === "win32" ? "Show in Explorer" : "Show the folder";
    menuEl = document.createElement("div"); menuEl.className = "hb-menu"; menuEl.setAttribute("role", "menu");
    menuEl.innerHTML = `${p.exists ? `<button data-m="open">${I.open}${p.current ? "Back to the editor" : "Open"}</button>` : ""}<button data-m="rename">${I.pen}Rename</button>${p.exists ? `<button data-m="reveal">${I.folder}${where}</button>` : ""}<hr>
      <button data-m="remove">${I.minus}Remove from Hub</button>${p.exists && !p.current ? `<button data-m="trash" class="danger">${I.trash}Move to Trash…</button>` : ""}`;
    document.body.appendChild(menuEl); btn.setAttribute("aria-expanded", "true");
    const r = btn.getBoundingClientRect(), w = menuEl.offsetWidth, h = menuEl.offsetHeight;
    menuEl.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
    menuEl.style.top = (r.bottom + 6 + h > innerHeight - 8 ? r.top - h - 6 : r.bottom + 6) + "px";
    menuEl.addEventListener("click", async e => {
      const m = e.target.closest("[data-m]"); if (!m) return; closeMenu();
      if (m.dataset.m === "open") open(p);
      else if (m.dataset.m === "rename") rename(p);
      else if (m.dataset.m === "reveal") api({ action: "reveal", id: p.id }).catch(err => say(err.message));
      else if (m.dataset.m === "remove") { try { await api({ action: "remove", id: p.id }); say(`Removed "${p.name}" from the Hub. Its folder is untouched.`); load(); } catch (err) { say(err.message); } }
      else if (m.dataset.m === "trash") trash(p);
    });
  }
  document.addEventListener("pointerdown", e => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest(".hb-more")) closeMenu(); });
  function rename(p) {
    const el = grid.querySelector(`.hb-card[data-id="${p.id}"] [data-name]`); if (!el) return;
    el.contentEditable = "true"; el.focus();
    const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    let done = false;
    const finish = async save => {
      if (done) return; done = true; el.contentEditable = "false";
      const v = el.textContent.replace(/\s+/g, " ").trim();
      if (!save || !v || v === p.name) { el.textContent = p.name; return; }
      try { await api({ action: "rename", id: p.id, name: v }); p.name = v; say("Renamed. The folder on disk keeps its name."); if (p.current) { const t = $("#title"); if (t) t.textContent = v; document.title = v + " · Cutnote"; } }
      catch (err) { el.textContent = p.name; say(err.message); }
    };
    el.onkeydown = e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); finish(true); } if (e.key === "Escape") { e.preventDefault(); finish(false); } };
    el.onblur = () => finish(true);
    el.onclick = e => e.stopPropagation();
  }

  /* dialogs */
  function modal(html) {
    const m = document.createElement("div"); m.className = "hb-modal"; m.innerHTML = `<div class="hb-dlg" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(m);
    const close = () => { m.remove(); document.removeEventListener("keydown", key, true); };
    const key = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    document.addEventListener("keydown", key, true);
    m.addEventListener("pointerdown", e => { if (e.target === m) close(); });
    return { el: m.firstElementChild, close };
  }
  function trash(p) {
    const d = modal(`<h3>Delete "${esc(p.name)}"?</h3><p>Move its folder to the Trash, or just take it off this list. Trashed folders can be put back from the Trash.</p>
      <div class="hb-where"><span title="${esc(p.path)}">${esc(p.path)}</span></div>
      <div class="hb-acts"><button type="button" class="hb-btn ghost" data-x>Cancel</button><button type="button" class="hb-btn" data-r>Remove from Hub only</button><button type="button" class="hb-btn danger" data-t>${I.trash}Move folder to Trash</button></div>`);
    d.el.querySelector("[data-x]").onclick = d.close;
    d.el.querySelector("[data-r]").onclick = async () => { try { await api({ action: "remove", id: p.id }); d.close(); say("Removed from the Hub. Its folder is untouched."); load(); } catch (e) { say(e.message); } };
    d.el.querySelector("[data-t]").onclick = async ev => { ev.target.disabled = true; try { await api({ action: "trash", id: p.id }); d.close(); say(`"${p.name}" moved to the Trash`); load(); } catch (e) { ev.target.disabled = false; say(e.message); } };
  }
  async function pick(prompt) { try { return (await api({ action: "pick", prompt })).path; } catch { return null; } }
  function newProject() {
    let where = (H.data && H.data.newIn) || "", files = [];
    const d = modal(`<h3>New project</h3><p>Cutnote makes a folder for it with <b>Footage</b> and <b>Exports</b> inside, and adds it here. Your AI assistant saves the projects it makes here too.</p>
      <label class="f">Name<input type="text" data-n placeholder="e.g. Product launch video" maxlength="80" autocomplete="off"></label>
      <div class="hb-err" data-e></div>
      <label class="f">Save in<div class="hb-where"><span data-w title="${esc(where)}">${esc(where)}</span><button type="button" class="hb-btn" data-c>Change…</button></div></label>
      <label class="f">Footage <span style="font-weight:500;color:var(--faint)">(optional, copied in, your originals stay where they are)</span>
        <div class="hb-drop" data-d tabindex="0">${I.upload}<span>Drop videos, sounds or pictures here, or click to choose</span></div><input type="file" multiple accept="video/*,audio/*,image/*" hidden data-f>
        <div class="hb-files" data-l></div></label>
      <div class="hb-acts"><button type="button" class="hb-btn ghost" data-x>Cancel</button><button type="button" class="hb-btn primary" data-go>Create project</button></div>`);
    const $d = s => d.el.querySelector(s), nameIn = $d("[data-n]"), err = $d("[data-e]");
    setTimeout(() => nameIn.focus(), 30);
    nameIn.onkeydown = e => { e.stopPropagation(); if (e.key === "Enter") $d("[data-go]").click(); };
    $d("[data-x]").onclick = d.close;
    $d("[data-c]").onclick = async () => { const p = await pick("new"); if (p) { where = p; $d("[data-w]").textContent = p; $d("[data-w]").title = p; } };
    const list = () => { $d("[data-l]").innerHTML = files.map((f, i) => `<div><b>${esc(f.name)}</b><i data-p="${i}">${(f.size / 1048576).toFixed(f.size > 1048576 * 100 ? 0 : 1)} MB</i></div>`).join(""); };
    const add = fl => { for (const f of fl) if (/^(video|audio|image)\//.test(f.type) || /\.(mp4|mov|m4v|webm|mkv|avi|mp3|wav|m4a|aac|png|jpe?g|heic|webp|gif)$/i.test(f.name)) files.push(f); list(); };
    const drop = $d("[data-d]");
    drop.onclick = () => $d("[data-f]").click(); $d("[data-f]").onchange = e => add(e.target.files);
    drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); }; drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); add(e.dataTransfer.files); };
    $d("[data-go]").onclick = async ev => {
      const name = nameIn.value.replace(/\s+/g, " ").trim(); if (!name) { err.textContent = "Give it a name"; nameIn.focus(); return; }
      const b = ev.target; b.disabled = true; b.textContent = "Creating…"; err.textContent = "";
      let made;
      try { made = await api({ action: "create", name, where }); } catch (e) { err.textContent = e.message; b.disabled = false; b.textContent = "Create project"; return; }
      for (let i = 0; i < files.length; i++) {
        const f = files[i], tag = d.el.querySelector(`[data-p="${i}"]`);
        try { await upload(made.id, f, pct => { if (tag) tag.textContent = Math.round(pct * 100) + "%"; b.textContent = `Copying ${i + 1} of ${files.length}…`; }); if (tag) tag.textContent = "✓"; }
        catch { if (tag) tag.textContent = "failed"; }
      }
      try { await api({ action: "open", id: made.id }); } catch (e) { d.close(); say(e.message); load(); return; }
      try { sessionStorage.removeItem("cutnote:resume"); } catch {}
      location.replace(location.pathname);
    };
  }
  function upload(id, f, onp) {
    return new Promise((res, rej) => {
      const x = new XMLHttpRequest();
      x.open("POST", `/api/hub/upload?id=${encodeURIComponent(id)}&name=${encodeURIComponent(f.name)}`);
      x.setRequestHeader("X-Cutnote", "1"); x.setRequestHeader("Content-Type", "application/octet-stream");
      x.upload.onprogress = e => e.lengthComputable && onp(e.loaded / e.total);
      x.onload = () => x.status < 300 ? res() : rej(new Error(x.responseText)); x.onerror = () => rej(new Error("upload failed"));
      x.send(f);
    });
  }
  function roots() {
    const d = modal(`<h3>Folders the Hub watches</h3><p>Any project inside these folders (a folder holding a <b>Project</b> folder) shows up here by itself. Projects you open or create are always added.</p>
      <div class="hb-roots" data-r></div>
      <div class="hb-acts" style="justify-content:space-between"><button type="button" class="hb-btn" data-add>${I.plus}Add a folder…</button><button type="button" class="hb-btn primary" data-x>Done</button></div>`);
    const paintR = () => { const rs = (H.data && H.data.roots) || []; d.el.querySelector("[data-r]").innerHTML = rs.length ? rs.map((r, i) => `<div><span title="${esc(r)}">${esc(r)}</span><button type="button" data-rm="${i}" aria-label="Stop watching">✕</button></div>`).join("") : `<div style="justify-content:center;color:var(--faint)">None yet</div>`; };
    paintR();
    d.el.querySelector("[data-x]").onclick = () => { d.close(); load(); };
    d.el.querySelector("[data-add]").onclick = async () => { const p = await pick("roots"); if (!p) return; try { await api({ action: "addRoot", path: p }); await load(); paintR(); } catch (e) { say(e.message); } };
    d.el.querySelector("[data-r]").onclick = async e => { const b = e.target.closest("[data-rm]"); if (!b) return; try { await api({ action: "removeRoot", path: H.data.roots[+b.dataset.rm] }); await load(); paintR(); } catch (err) { say(err.message); } };
  }

  document.addEventListener("keydown", e => {
    if (!document.body.classList.contains("hub-on")) return;
    if (e.key === "Escape" && !document.querySelector(".hb-modal") && !menuEl && !(e.target.closest && e.target.closest("[contenteditable=true]"))) { e.preventDefault(); H.show(false); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") { e.preventDefault(); hub.querySelector("[data-q]").focus(); }
  }, true);
  addEventListener("hashchange", () => H.show(location.hash === "#hub"));
  if (location.hash === "#hub") H.show(true);
  // the title follows the project's Hub name once the page knows it
  let tries = 0; const naming = setInterval(() => { if (++tries > 300) clearInterval(naming); if (typeof S !== "undefined" && S.info) { clearInterval(naming); const n = S.info.name || S.info.video; title.textContent = n; document.title = n + " · Cutnote"; } }, 200);
})();
