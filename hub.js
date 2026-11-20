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
  #hub .hb-brand .logo { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--ink); color: var(--accent); }
  #hub .hb-brand .logo svg { width: 19px; height: 19px; }
  #hub .hb-brand .logo .mk-hub path { fill: var(--ink); }
  .mk svg { overflow: visible; }
  #brandBtn .logo { width: 28px; height: 28px; border-radius: 8px; }
  #brandBtn .logo svg { width: 19px; height: 19px; }
  .mk-ph { transition: transform .45s cubic-bezier(.22,1,.36,1); }
  #brandBtn:hover .mk-ph, #brandPop button:hover .mk-ph { transform: translateX(-4.5px); }
  .mk-open { transition: transform .4s cubic-bezier(.22,1,.36,1); transform-origin: 16.9px 16.9px; }
  #brandPop button:hover .mk-open, #hub .hb-brand:hover .mk-open { transform: scale(1.12); }
  #brandPop .tile.mk svg { width: 22px; height: 22px; }
  #brandPop .tile.dark.mk { color: var(--accent); } #brandPop .tile.dark .mk-hub path { fill: var(--ink); }
  #hub .hb-brand span { color: var(--dim); font-weight: 600; }
  #hub .sp { flex: 1; }
  .hb-btn { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 13px; border-radius: 9px; border: 1px solid var(--line); background: var(--panel); color: var(--ink); font: 600 12.5px -apple-system, system-ui, sans-serif; cursor: pointer; white-space: nowrap; }
  .hb-btn:hover { border-color: var(--line-2); background: var(--raise); }
  .hb-btn svg { width: 14px; height: 14px; }
  .hb-btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .hb-btn.primary:hover { filter: brightness(.97); }
  .hb-btn.ghost { border-color: transparent; color: var(--dim); }
  .hb-btn.ghost:hover { color: var(--ink); background: var(--hover); }
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
    transition: box-shadow .45s cubic-bezier(.22,1,.36,1), transform .55s cubic-bezier(.22,1,.36,1); animation: hbIn .4s cubic-bezier(.22,1,.36,1) backwards; will-change: transform; }
  /* hover: a slow lift and a lime neon edge */
  .hb-card:hover, .hb-card:focus-visible { outline: none; transform: translateY(-6px);
    box-shadow: 0 0 0 2px var(--accent), 0 0 18px 2px rgba(198,244,50,.55), 0 0 46px 6px rgba(198,244,50,.22), 0 22px 44px rgba(0,0,0,.16); }
  .hb-card.cur { box-shadow: 0 0 0 2px var(--accent); }
  .hb-card.missing:hover { box-shadow: 0 0 0 1.5px var(--line-2), 0 16px 40px rgba(0,0,0,.12); }
  .hb-card.missing { opacity: .6; }
  @keyframes hbIn { from { opacity: 0; translate: 0 10px; } }
  .hb-pic { position: relative; aspect-ratio: 4 / 5; border-radius: 16px 16px 0 0; overflow: hidden; background: linear-gradient(150deg, var(--panel-2), var(--raise)); }
  .hb-pic img { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .5s cubic-bezier(.22,1,.36,1); }
  .hb-card:hover .hb-pic img { transform: scale(1.03); }
  .hb-pic .ph { position: absolute; inset: 0; display: grid; place-items: center; font-size: 46px; font-weight: 800; color: var(--faint); letter-spacing: -.03em; }
  .hb-pic::after { content: ""; position: absolute; z-index: 1; inset: auto 0 0; height: 40%; background: linear-gradient(transparent, rgba(0,0,0,.35)); pointer-events: none; }
  .hb-badge { position: absolute; z-index: 2; top: 10px; left: 10px; height: 22px; padding: 0 9px; border-radius: 11px; display: inline-flex; align-items: center; gap: 5px; font: 700 11px -apple-system, system-ui, sans-serif; }
  .hb-badge.cur { background: var(--accent); color: var(--accent-ink); }
  .hb-badge.miss { background: rgba(20,20,20,.75); color: #fff; }
  /* the Open button: a neon pill in the middle of the picture */
  .hb-open { position: absolute; z-index: 2; left: 50%; top: 50%; display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-width: 112px; height: 40px; padding: 0 20px;
    border-radius: 20px; background: var(--accent); color: #141a00; font: 800 13px -apple-system, system-ui, sans-serif; letter-spacing: .01em; text-align: center; white-space: nowrap; pointer-events: none;
    box-shadow: 0 0 0 1px rgba(255,255,255,.55) inset, 0 0 22px 3px rgba(198,244,50,.75), 0 0 60px 10px rgba(198,244,50,.3), 0 10px 24px rgba(0,0,0,.3);
    opacity: 0; transform: translate(-50%, -50%) scale(.86); transition: opacity .3s ease, transform .45s cubic-bezier(.22,1,.36,1); }
  .hb-open svg { width: 14px; height: 14px; }
  .hb-card:hover .hb-open, .hb-card:focus-visible .hb-open { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  .hb-card:hover .hb-pic::before { opacity: 1; }
  .hb-pic::before { content: ""; position: absolute; inset: 0; z-index: 1; background: radial-gradient(60% 50% at 50% 50%, rgba(0,0,0,.28), transparent 75%); opacity: 0; transition: opacity .35s; pointer-events: none; }
  .hb-more, .hb-cos { position: absolute; z-index: 3; top: 9px; width: 30px; height: 30px; border-radius: 9px; border: 0; display: grid; place-items: center; background: rgba(255,255,255,.94); color: #111;
    cursor: pointer; opacity: 0; transform: translateY(-4px); transition: opacity .25s, transform .35s cubic-bezier(.22,1,.36,1), background .15s; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
  .hb-more { right: 9px; } .hb-cos { right: 45px; transition-delay: .03s; text-decoration: none; }
  .hb-more:hover, .hb-cos:hover { background: #fff; }
  .hb-card:hover .hb-more, .hb-card:hover .hb-cos, .hb-more[aria-expanded="true"], .hb-more[aria-expanded="true"] ~ .hb-cos { opacity: 1; transform: none; }
  .hb-more svg { width: 15px; height: 15px; } .hb-cos svg { width: 17px; height: 17px; }
  .hb-cos.linked::after { content: ""; position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 3px; background: #2bd96b; box-shadow: 0 0 0 1.5px #fff; }
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
  .hb-menu { position: fixed; z-index: 320; min-width: 220px; padding: 6px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line-2); box-shadow: 0 18px 50px rgba(0,0,0,.22);
    opacity: 0; transform: translateY(-6px) scale(.95); transform-origin: top right; transition: opacity .18s ease, transform .3s cubic-bezier(.22,1,.36,1); }
  .hb-menu.up { transform-origin: bottom right; transform: translateY(6px) scale(.95); }
  .hb-menu.on { opacity: 1; transform: none; }
  .hb-menu > * { opacity: 0; transform: translateY(-3px); transition: opacity .2s ease, transform .3s cubic-bezier(.22,1,.36,1); }
  .hb-menu.on > * { opacity: 1; transform: none; }
  ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `.hb-menu.on > :nth-child(${i}) { transition-delay: ${i * 0.022}s; }`).join(" ")}
  .hb-menu button { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 10px; border: 0; border-radius: 8px; background: none; color: var(--ink); font: 500 13px -apple-system, system-ui, sans-serif; text-align: left; cursor: pointer; }
  .hb-menu button:hover { background: var(--raise); }
  .hb-menu button svg { width: 15px; height: 15px; color: var(--dim); }
  .hb-menu hr { border: 0; border-top: 1px solid var(--line); margin: 5px 4px; }
  .hb-menu .danger, .hb-menu .danger svg { color: #e5484d; }
  .hb-modal { position: fixed; inset: 0; z-index: 340; display: grid; place-items: center; background: rgba(10,12,18,.45); backdrop-filter: blur(4px); animation: hbFade .18s ease both; }
  @keyframes hbFade { from { opacity: 0; } }
  /* sheets: one compact card, never scrolling, with a soft lime edge like the rest of Cutnote */
  .hb-dlg { position: relative; width: min(480px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: hidden; border-radius: 20px; background: var(--panel); padding: 20px;
    box-shadow: 0 0 0 1px rgba(198,244,50,.55), 0 0 30px rgba(198,244,50,.18), 0 30px 80px rgba(0,0,0,.35); animation: hbPop .3s cubic-bezier(.22,1,.36,1) both; }
  .hb-dlg .hb-hd { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .hb-dlg .hb-hd i { flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); font-style: normal; box-shadow: 0 6px 16px rgba(120,160,0,.3); }
  .hb-dlg .hb-hd i svg { width: 19px; height: 19px; }
  .hb-dlg .hb-hd h3 { margin: 0; } .hb-dlg .hb-hd p { margin: 1px 0 0; color: var(--dim); font-size: 12.5px; line-height: 1.4; }
  .hb-x { position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border-radius: 9px; border: 0; background: none; color: var(--dim); cursor: pointer; font-size: 15px; }
  .hb-x:hover { background: var(--hover); color: var(--ink); }
  @keyframes hbPop { from { opacity: 0; transform: translateY(10px) scale(.98); } }
  .hb-dlg h3 { margin: 0 0 4px; font-size: 18px; font-weight: 750; letter-spacing: -.01em; }
  .hb-dlg > p { margin: 0 0 16px; color: var(--dim); font-size: 13px; line-height: 1.45; }
  .hb-dlg label.f { display: grid; gap: 6px; min-width: 0; margin-bottom: 12px; font-size: 12px; font-weight: 600; color: var(--dim); }
  .hb-dlg label.f small { font-weight: 500; color: var(--faint); }
  .hb-dlg input[type=text] { height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-size: 14px; }
  .hb-dlg input[type=text]:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: var(--panel); }
  .hb-where { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 6px 6px 6px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-size: 12.5px; font-weight: 500; }
  .hb-where span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
  .hb-drop { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 14px; border-radius: 12px; border: 1.5px dashed var(--line-2); color: var(--dim); font-size: 12.5px; text-align: left; cursor: pointer; transition: border-color .15s, background .15s; }
  .hb-drop.over, .hb-drop:hover { border-color: var(--accent); background: var(--accent-soft); color: var(--ink); }
  .hb-drop svg { width: 22px; height: 22px; }
  .hb-files { display: grid; gap: 4px; margin-top: 6px; max-height: 92px; overflow: auto; font-size: 12px; color: var(--dim); }
  .hb-files:empty { display: none; }
  .hb-files div { display: flex; gap: 8px; align-items: center; } .hb-files b { color: var(--ink); font-weight: 500; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hb-files i { font-style: normal; font-variant-numeric: tabular-nums; }
  .hb-acts { display: flex; gap: 8px; justify-content: flex-end; margin-top: 18px; flex-wrap: wrap; }
  .hb-btn.danger { background: #e5484d !important; border-color: #e5484d !important; color: #fff !important; }
  .hb-roots { display: grid; gap: 6px; margin: 2px 0 4px; max-height: 236px; overflow: auto; }
  .hb-root { display: flex; align-items: center; gap: 12px; padding: 10px 10px 10px 12px; border-radius: 12px; background: var(--panel-2); border: 1px solid var(--line); transition: border-color .15s; }
  .hb-root:hover { border-color: var(--line-2); }
  .hb-root .ic { flex: none; width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent-text, var(--ink)); }
  .hb-root .ic svg { width: 16px; height: 16px; }
  .hb-root .tx { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .hb-root .tx b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hb-root .tx small { font-size: 11px; color: var(--faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hb-root .n { flex: none; font-size: 11.5px; font-weight: 600; color: var(--dim); padding: 3px 8px; border-radius: 10px; background: var(--panel); border: 1px solid var(--line); }
  .hb-root button { flex: none; width: 28px; height: 28px; border-radius: 8px; border: 0; background: none; color: var(--faint); cursor: pointer; font-size: 13px; }
  .hb-root button:hover { background: #e5484d18; color: #e5484d; }
  .hb-empty2 svg { width: 26px; height: 26px; color: var(--faint); }
  .hb-empty2 { display: grid; place-items: center; gap: 6px; padding: 22px; border-radius: 12px; border: 1.5px dashed var(--line-2); color: var(--dim); font-size: 12.5px; text-align: center; }
  .hb-err { color: #e5484d; font-size: 12.5px; margin-top: -6px; margin-bottom: 10px; min-height: 0; }
  @media (max-width: 720px) { #hub .hb-search { display: none; } #hub .hb-top .lbl { display: none; } }
  @media (prefers-reduced-motion: reduce) { #hub, .hb-card, .hb-dlg, .hb-modal { transition: none; animation: none; } }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* the marks: Editor = three clips on a timeline with a playhead; Hub = a grid of projects, one opening */
  const LOGO_EDITOR = `<svg class="mk-ed" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.4" width="10.5" height="3.7" rx="1.85" fill="currentColor"/><rect x="7.5" y="10.15" width="13.5" height="3.7" rx="1.85" fill="currentColor" opacity=".5"/><rect x="3" y="14.9" width="7.5" height="3.7" rx="1.85" fill="currentColor"/>
    <g class="mk-ph"><path d="M15.6 6V21.2" stroke="var(--accent)" stroke-width="3.8" stroke-linecap="round"/><path d="M15.6 6V21.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12.6 2.1h6a.9.9 0 0 1 .9.9v2.2l-3.9 2.9-3.9-2.9V3a.9.9 0 0 1 .9-.9z" fill="currentColor" stroke="var(--accent)" stroke-width="1.2" stroke-linejoin="round"/></g></svg>`;
  const LOGO_HUB = `<svg class="mk-hub" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="7.8" height="7.8" rx="2.3" fill="currentColor"/><rect x="13" y="3.2" width="7.8" height="7.8" rx="2.3" fill="currentColor" opacity=".45"/><rect x="3.2" y="13" width="7.8" height="7.8" rx="2.3" fill="currentColor" opacity=".45"/><rect class="mk-open" x="13" y="13" width="7.8" height="7.8" rx="2.3" fill="currentColor"/><path d="M15.7 15v3.8l3.2-1.9z" fill="var(--accent)"/></svg>`;
  window.CutnoteMarks = { LOGO_EDITOR, LOGO_HUB };
  const I = {
    chev: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5 6 7.5l3-3"/></svg>',
    check: '<svg class="ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    cos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M10 13.5l4 2-4 2z" fill="currentColor"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></svg>',
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
  brand.innerHTML = `<button type="button" id="brandBtn" aria-haspopup="true" aria-expanded="false"><span class="logo mk">${LOGO_EDITOR}</span><b>Cutnote <span>Editor</span></b>${I.chev}</button>
    <div id="brandPop" role="menu">
      <button type="button" role="menuitem" data-go="editor" aria-current="true"><span class="tile mk">${LOGO_EDITOR}</span><span><b>Cutnote Editor</b><small>Review, cut and build this project</small></span>${I.check}</button>
      <button type="button" role="menuitem" data-go="hub" aria-current="false"><span class="tile dark mk">${LOGO_HUB}</span><span><b>Cutnote Hub</b><small>All your projects: open, rename, create</small></span>${I.check}</button>
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
      <div class="hb-brand"><span class="logo mk">${LOGO_HUB}</span>Cutnote <span>Hub</span></div>
      <button type="button" class="hb-btn ghost" data-a="back">${I.back}<span class="lbl">Back to the editor</span></button>
      <span class="sp"></span>
      <label class="hb-search">${I.search}<input type="search" placeholder="Search projects" aria-label="Search projects" data-q></label>
      <button type="button" class="hb-btn" data-a="roots" title="Folders the Hub watches for projects">${I.folder}<span class="lbl">Folders</span></button>
      <button type="button" class="hb-btn primary" data-a="new">${I.plus}New project</button>
    </div>
    <div class="hb-main"><div class="hb-head"><div><h2>Projects</h2><p><span data-sub>Loading…</span> · <a href="#" data-a="tour" style="color:inherit;text-underline-offset:3px">Take the tour</a></p></div><span class="sp"></span>
      <div class="hb-sort" role="tablist" aria-label="Sort"><button type="button" data-sort="opened" class="on">Recent</button><button type="button" data-sort="changed">Last edited</button><button type="button" data-sort="name">Name</button></div></div>
      <div class="hb-grid" data-grid></div></div>
  </section>`);
  const hub = $("#hub"), grid = hub.querySelector("[data-grid]");
  const H = (window.CutnoteHub = { data: null, q: "", sort: (() => { try { return localStorage.getItem("cutnote:hubsort") || "opened"; } catch { return "opened"; } })() });
  hub.querySelectorAll("[data-sort]").forEach(b => b.classList.toggle("on", b.dataset.sort === H.sort));

  const toured = () => { try { return localStorage.getItem("cutnote:hubtour") === "done"; } catch { return true; } };
  H.show = (on, noTour) => {
    document.body.classList.toggle("hub-on", on); hub.setAttribute("aria-hidden", String(!on));
    $("#brandPop").querySelectorAll("[data-go]").forEach(b => b.setAttribute("aria-current", String((b.dataset.go === "hub") === on)));
    if (on) {
      if (typeof S !== "undefined" && S.playing && typeof pause === "function") pause();
      if (!noTour && !toured() && !tourEl) H.tour(false); else load();   // the first visit offers the tour
      if (location.hash !== "#hub") history.replaceState(null, "", "#hub");
    }
    else if (location.hash === "#hub") history.replaceState(null, "", location.pathname + location.search);
  };
  let loading = null;
  function load() {
    if (loading) return loading;
    loading = (async () => {
      try { H.data = await fetch("/api/hub", { cache: "no-store" }).then(r => r.json()); } catch { hub.querySelector("[data-sub]").textContent = "Couldn't load your projects"; return; }
      paint();
    })().finally(() => { loading = null; });
    return loading;
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
    const key = p => H.sort === "name" ? p.name.toLowerCase() : (H.sort === "changed" ? p.changed : [p.opened, p.changed].filter(Boolean).sort().pop()) || "";
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
          <a class="hb-cos${p.content ? " linked" : ""}" data-a="cos" href="${esc(p.content || H.data.contentHome)}" target="_blank" rel="noopener" title="${p.content ? "Open it in Content OS" : "Open Content OS (not linked yet: ⋯ › Link to Content OS)"}" aria-label="${p.content ? "Open in Content OS" : "Open Content OS"}">${I.cos}</a>
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
    if (a && a.dataset.a === "tour") { e.preventDefault(); return H.tour(false); }
    if (a && a.dataset.a === "more" && c) { e.stopPropagation(); return menu(a, proj(c.dataset.id)); }
    if (a && a.dataset.a === "cos") { e.stopPropagation(); return; }   // the link opens Content OS in a new tab
    if (c && !e.target.closest("[contenteditable=true]")) open(proj(c.dataset.id));
  });
  hub.addEventListener("keydown", e => { const c = e.target.closest && e.target.closest(".hb-card"); if (c && e.target === c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(proj(c.dataset.id)); } });
  const proj = id => H.data.projects.find(p => p.id === id);

  async function open(p) {
    if (!p) return;
    if (p.current) return H.show(false);
    if (!p.exists) return window.CutnoteProblem("missing", { name: p.name, path: p.path, id: p.id });
    try { await api({ action: "open", id: p.id }); } catch (e) { return say(e.message); }
    try { sessionStorage.removeItem("cutnote:resume"); } catch {}
    location.replace(location.pathname);
  }
  let menuEl = null;
  function closeMenu() {
    if (!menuEl) return;
    const m = menuEl; menuEl = null; m.classList.remove("on"); setTimeout(() => m.remove(), 220);
    hub.querySelectorAll('.hb-more[aria-expanded="true"]').forEach(b => b.setAttribute("aria-expanded", "false"));
  }
  function menu(btn, p) {
    closeMenu(); if (!p) return;
    const where = H.data.platform === "darwin" ? "Show in Finder" : H.data.platform === "win32" ? "Show in Explorer" : "Show the folder";
    menuEl = document.createElement("div"); menuEl.className = "hb-menu"; menuEl.setAttribute("role", "menu");
    menuEl.innerHTML = `${p.exists ? `<button data-m="open">${I.open}${p.current ? "Back to the editor" : "Open"}</button>` : ""}<button data-m="rename">${I.pen}Rename</button>${p.exists ? `<button data-m="reveal">${I.folder}${where}</button>` : ""}
      <button data-m="cos">${I.link}${p.content ? "Change Content OS link…" : "Link to Content OS…"}</button><hr>
      <button data-m="remove">${I.minus}Remove from Hub</button>${p.exists && !p.current ? `<button data-m="trash" class="danger">${I.trash}Move to Trash…</button>` : ""}`;
    document.body.appendChild(menuEl); btn.setAttribute("aria-expanded", "true");
    const r = btn.getBoundingClientRect(), w = menuEl.offsetWidth, h = menuEl.offsetHeight;
    menuEl.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
    const up = r.bottom + 6 + h > innerHeight - 8;
    menuEl.style.top = (up ? r.top - h - 6 : r.bottom + 6) + "px"; menuEl.classList.toggle("up", up);
    requestAnimationFrame(() => requestAnimationFrame(() => menuEl && menuEl.classList.add("on")));
    menuEl.addEventListener("click", async e => {
      const m = e.target.closest("[data-m]"); if (!m) return; closeMenu();
      if (m.dataset.m === "open") open(p);
      else if (m.dataset.m === "rename") rename(p);
      else if (m.dataset.m === "reveal") api({ action: "reveal", id: p.id }).catch(err => say(err.message));
      else if (m.dataset.m === "remove") { try { await api({ action: "remove", id: p.id }); say(`Removed "${p.name}" from the Hub. Its folder is untouched.`); load(); } catch (err) { say(err.message); } }
      else if (m.dataset.m === "trash") trash(p);
      else if (m.dataset.m === "cos") linkContent(p);
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
    const m = document.createElement("div"); m.className = "hb-modal"; m.innerHTML = `<div class="hb-dlg" role="dialog" aria-modal="true"><button type="button" class="hb-x" aria-label="Close">✕</button>${html}</div>`;
    document.body.appendChild(m);
    const close = () => { m.remove(); document.removeEventListener("keydown", key, true); };
    const key = e => { if (e.key === "Escape") { e.stopPropagation(); close(); } };
    document.addEventListener("keydown", key, true);
    m.addEventListener("pointerdown", e => { if (e.target === m) close(); });
    m.querySelector(".hb-x").onclick = () => close();
    return { el: m.firstElementChild, close };
  }
  function linkContent(p) {
    const d = modal(`<h3>Link to Content OS</h3><p>Paste the link to this video's page in Content OS. The Content OS button on its card then opens that page.</p>
      <label class="f">Link<input type="text" data-u placeholder="${esc(H.data.contentHome)}/content/…" value="${esc(p.content || "")}" autocomplete="off"></label><div class="hb-err" data-e></div>
      <div class="hb-acts">${p.content ? `<button type="button" class="hb-btn ghost" data-rm>Remove link</button>` : ""}<span style="flex:1"></span><button type="button" class="hb-btn ghost" data-x>Cancel</button><button type="button" class="hb-btn primary" data-ok>Save</button></div>`);
    const inp = d.el.querySelector("[data-u]"); setTimeout(() => inp.focus(), 30);
    const save = async url => { try { await api({ action: "content", id: p.id, url }); d.close(); say(url ? "Linked to Content OS" : "Link removed"); load(); } catch (e) { d.el.querySelector("[data-e]").textContent = e.message; } };
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === "Enter") save(inp.value.trim()); };
    d.el.querySelector("[data-x]").onclick = d.close;
    d.el.querySelector("[data-ok]").onclick = () => save(inp.value.trim());
    const rm = d.el.querySelector("[data-rm]"); if (rm) rm.onclick = () => save("");
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
    const short = p => { const xs = p.split(/[\\/]/).filter(Boolean); return xs.length > 2 ? "…/" + xs.slice(-2).join("/") : p; };
    const d = modal(`<div class="hb-hd"><i>${I.plus}</i><div><h3>New project</h3><p>A folder with Footage and Exports, added to your Hub.</p></div></div>
      <label class="f">Name<input type="text" data-n placeholder="e.g. Product launch video" maxlength="80" autocomplete="off"></label>
      <div class="hb-err" data-e></div>
      <label class="f">Save in<div class="hb-where"><span data-w title="${esc(where)}" style="direction:ltr">${esc(short(where))}</span><button type="button" class="hb-btn" data-c>Change…</button></div></label>
      <label class="f">Footage <small>optional · copied in, your originals stay put</small>
        <div class="hb-drop" data-d tabindex="0">${I.upload}<span>Drop videos, sounds or pictures, or click to choose</span></div><input type="file" multiple accept="video/*,audio/*,image/*" hidden data-f>
        <div class="hb-files" data-l></div></label>
      <div class="hb-acts"><button type="button" class="hb-btn ghost" data-x>Cancel</button><button type="button" class="hb-btn primary" data-go>Create project</button></div>`);
    const $d = s => d.el.querySelector(s), nameIn = $d("[data-n]"), err = $d("[data-e]");
    setTimeout(() => nameIn.focus(), 30);
    nameIn.onkeydown = e => { e.stopPropagation(); if (e.key === "Enter") $d("[data-go]").click(); };
    $d("[data-x]").onclick = d.close;
    $d("[data-c]").onclick = async () => { const p = await pick("new"); if (p) { where = p; $d("[data-w]").textContent = short(p); $d("[data-w]").title = p; } };
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
    const d = modal(`<div class="hb-hd"><i>${I.folder}</i><div><h3>Watched folders</h3><p>New projects in these folders show up in your Hub by themselves.</p></div></div>
      <div class="hb-roots" data-r></div>
      <div class="hb-acts" style="justify-content:space-between;margin-top:14px"><button type="button" class="hb-btn" data-add>${I.plus}Add a folder…</button><button type="button" class="hb-btn primary" data-x>Done</button></div>`);
    const count = r => ((H.data && H.data.projects) || []).filter(p => p.path === r || p.path.startsWith(r.replace(/\/$/, "") + "/")).length;
    const paintR = () => {
      const rs = (H.data && H.data.roots) || [];
      d.el.querySelector("[data-r]").innerHTML = rs.length ? rs.map((r, i) => { const parts = r.split(/[\\/]/).filter(Boolean), n = count(r);
        return `<div class="hb-root"><span class="ic">${I.folder}</span><span class="tx"><b>${esc(parts[parts.length - 1] || r)}</b><small title="${esc(r)}">${esc(parts.slice(0, -1).join(" › ") || "/")}</small></span>
          <span class="n">${n} project${n === 1 ? "" : "s"}</span><button type="button" data-rm="${i}" title="Stop watching this folder" aria-label="Stop watching">✕</button></div>`; }).join("")
        : `<div class="hb-empty2">${I.folder}<span>No folders yet. Add the folder you keep your videos in.</span></div>`;
    };
    paintR();
    d.el.querySelector("[data-x]").onclick = () => { d.close(); load(); };
    d.el.querySelector("[data-add]").onclick = async () => { const p = await pick("roots"); if (!p) return; try { await api({ action: "addRoot", path: p }); await load(); paintR(); } catch (e) { say(e.message); } };
    d.el.querySelector("[data-r]").onclick = async e => { const b = e.target.closest("[data-rm]"); if (!b) return; try { await api({ action: "removeRoot", path: H.data.roots[+b.dataset.rm] }); await load(); paintR(); } catch (err) { say(err.message); } };
  }

  /* ---------- when a project can't load: what happened, steps to fix it, and a prompt to paste into Claude ---------- */
  const pcss = `
  .hb-prob { width: min(520px, calc(100vw - 32px)); }
  .hb-prob .hb-hd i { background: #ffb340; color: #2a1500; box-shadow: 0 6px 18px rgba(255,170,40,.35); }
  .hb-prob ol { margin: 4px 0 12px; padding: 0; list-style: none; display: grid; gap: 8px; counter-reset: s; }
  .hb-prob li { display: flex; gap: 10px; font-size: 13px; line-height: 1.45; color: var(--ink); counter-increment: s; }
  .hb-prob li::before { content: counter(s); flex: none; width: 20px; height: 20px; margin-top: 1px; border-radius: 6px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent-text, var(--ink)); font-size: 11px; font-weight: 800; }
  .hb-prob li code { font-size: 11.5px; padding: 1px 5px; border-radius: 5px; background: var(--panel-2); border: 1px solid var(--line); }
  .hb-prob .path { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; padding: 7px 7px 7px 11px; border-radius: 10px; background: var(--panel-2); border: 1px solid var(--line); font: 500 11.5px ui-monospace, SF Mono, Menlo, monospace; color: var(--dim); }
  .hb-prob .path span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hb-prob .ask { border-radius: 12px; border: 1px solid rgba(198,244,50,.6); background: linear-gradient(180deg, var(--accent-soft), transparent 120%); padding: 10px 10px 10px 12px; }
  .hb-prob .ask .t { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; margin-bottom: 6px; }
  .hb-prob .ask .t .hb-btn { margin-left: auto; height: 28px; }
  .hb-prob .ask p { margin: 0; font: 500 11.5px/1.5 ui-monospace, SF Mono, Menlo, monospace; color: var(--dim); white-space: pre-wrap; }
  .hb-btn.cpy .c2 { color: #1fb35a; }`;
  const pst = document.createElement("style"); pst.textContent = pcss; document.head.appendChild(pst);
  const PROBLEMS = {
    empty: (x) => ({ t: "Nothing to play in this project", what: "Cutnote opened the folder but couldn't find a video or an edit inside it.",
      steps: ["Check the drive or folder is still there (an external drive may be unplugged or asleep).", "Make sure the video files or the edit's HTML are inside this folder, not somewhere else.", "Paste the prompt below into Claude: it'll look for the files and set the project up again.", "Or open another project from Cutnote Hub."],
      prompt: `Cutnote opened my project folder at "${x.path}" but found nothing to play (no video files and no HyperFrames composition). Please look inside it and its subfolders (Footage/, Project/<name> Edit/, Exports/) and tell me what's there. If the files were moved, find where they are now and put things back so Cutnote can open it. If there's footage but no edit yet, set the edit up. Don't delete or rename anything without asking me.` }),
    play: (x) => ({ t: "This video won't play", what: `Cutnote found the project, but the browser can't play ${x.comp ? "“" + x.comp + "”" : "this version"}.` + (x.detail ? ` It said: ${x.detail}` : ""),
      steps: ["Try another version from the version menu at the top.", "If the file is still being written or rendered, wait for it to finish, then reload.", "Some formats don't play in browsers: an MP4 (H.264 video, AAC audio) always does.", "Paste the prompt below into Claude to check the file and convert it if needed."],
      prompt: `Cutnote can't play "${x.comp || "a version"}" in my project at "${x.path}".${x.detail ? ` The error was: ${x.detail}.` : ""} Please check the file (is it complete, not corrupt, which codecs it uses with ffprobe). If it's a format browsers can't play, make a browser-friendly copy next to it (MP4, H.264 + AAC) without touching the original, and tell me what you found. If it's a HyperFrames composition, run its checks and fix what's broken.` }),
    player: (x) => ({ t: "The video player isn't installed", what: "Cutnote plays edits with the HyperFrames player, and it couldn't find it on this computer.",
      steps: ["Open a terminal and run <code>npx hyperframes --version</code> once: it downloads the player.", "Reload this page.", "Still stuck? Run <code>python3 review.py --doctor</code> to see what's missing, or paste the prompt below into Claude."],
      prompt: `Cutnote says the HyperFrames player isn't installed on my computer, so it can't play my edits. Please check Node.js and npx work, run "npx hyperframes --version" to install the player, then run Cutnote's "review.py --doctor" and fix anything it reports. My project is at "${x.path}".` }),
    slow: (x) => ({ t: "This is taking a while to load", what: "The project opened, but its video still hasn't loaded.",
      steps: ["If it's on an external drive, check it's plugged in and awake.", "Very large or long videos can take a moment: give it a few seconds more.", "Reload the page, or try another version from the menu at the top.", "Paste the prompt below into Claude to find out why."],
      prompt: `Cutnote opened my project at "${x.path}" but the video never finishes loading. Please check the files are all there and readable, that the version I'm opening isn't broken or huge, and that Cutnote's server is running without errors. Tell me what's wrong and fix it if you can, without deleting anything.` }),
    missing: (x) => ({ t: "That project's folder is missing", what: `Cutnote can't find “${x.name || "this project"}” where it was.`,
      steps: ["If it's on an external drive, plug it in and try again.", "If you moved the folder, open it from its new place, or ask Claude to find it.", "If it's gone for good, remove it from the Hub with ⋯ › Remove from Hub."],
      prompt: `My Cutnote project "${x.name || ""}" used to be at "${x.path}" and Cutnote can't find it now. Please search my drives for that folder (it may have been moved or renamed), tell me where it is, and add it back to Cutnote Hub with: python3 review.py --add "<the folder>" "${x.name || ""}". Don't move or delete anything.` }),
  };
  let probOpen = false;
  window.CutnoteProblem = (kind, x = {}) => {
    if (probOpen || !PROBLEMS[kind]) return;
    probOpen = true;
    const X = Object.assign({ path: (typeof S !== "undefined" && S.info && S.info.root) || "" }, x), P = PROBLEMS[kind](X);
    const d = modal(`<div class="hb-hd"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 8v5M12 16.5v.5"/><path d="M10.3 3.9L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke-linejoin="round"/></svg></i><div><h3>${esc(P.t)}</h3><p>${esc(P.what)}</p></div></div>
      ${X.path ? `<div class="path"><span title="${esc(X.path)}">${esc(X.path)}</span></div>` : ""}
      <ol>${P.steps.map(t => `<li><span>${t}</span></li>`).join("")}</ol>
      <div class="ask"><div class="t">${LOGO_EDITOR.replace('class="mk-ed"', 'class="mk-ed" style="width:16px;height:16px"')}Ask Claude to fix it<button type="button" class="hb-btn cpy" data-cp><svg class="c1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/></svg><svg class="c2" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Copy prompt</button></div><p>${esc(P.prompt)}</p></div>
      <div class="hb-acts"><button type="button" class="hb-btn ghost" data-reload>Try again</button><button type="button" class="hb-btn" data-reveal>Show the folder</button><button type="button" class="hb-btn primary" data-hub>${LOGO_HUB.replace('class="mk-hub"', 'class="mk-hub" style="width:15px;height:15px"')}Open Cutnote Hub</button></div>`);
    d.el.classList.add("hb-prob");
    const done = () => { probOpen = false; };
    const close0 = d.close; d.close = () => { done(); close0(); };
    d.el.querySelector(".hb-x").onclick = d.close;
    d.el.parentElement.addEventListener("pointerdown", e => { if (e.target === d.el.parentElement) done(); });
    d.el.querySelector("[data-cp]").onclick = e => navigator.clipboard.writeText(P.prompt).then(() => { (window.copyTick || (() => {}))(e.currentTarget); say("Prompt copied: paste it into Claude"); }, () => say("Couldn't copy: select the text instead"));
    d.el.querySelector("[data-reload]").onclick = () => location.reload();
    d.el.querySelector("[data-reveal]").onclick = () => { const id = x.id || (typeof S !== "undefined" && S.info && S.info.project); if (id) api({ action: "reveal", id }).catch(err => say(err.message)); };
    d.el.querySelector("[data-hub]").onclick = () => { d.close(); H.show(true); };
  };
  // an error raised before this file loaded still gets its card
  { const e0 = document.getElementById("err"); if (e0 && e0.textContent && typeof err === "function") setTimeout(() => err(e0.textContent), 0); }
  // nothing playable, or the video never loads: say so instead of leaving a blank editor
  setTimeout(function watchLoad() {
    if (typeof S === "undefined" || !S.info) return setTimeout(watchLoad, 500);
    if (!S.info.comps || !S.info.comps.length) return;   // the "nothing to play" case is reported as it happens
    const t0 = Date.now();
    (function wait() {
      if (S.player && S.player.ready) return;
      if (Date.now() - t0 > 25000) { if (!document.querySelector("#hub.on, .hb-modal") && !document.body.classList.contains("hub-on")) window.CutnoteProblem("slow"); return; }
      setTimeout(wait, 1000);
    })();
  }, 1500);

  /* ---------- the guided tour: a spotlight walks round the Hub; Skip at every step; ends on the way back ---------- */
  const tcss = `
  #hbTour { position: fixed; inset: 0; z-index: 360; pointer-events: none; }
  #hbTour .hole { position: fixed; border-radius: 16px; box-shadow: 0 0 0 9999px rgba(8,10,16,.58), 0 0 0 2px var(--accent), 0 0 0 7px rgba(198,244,50,.25);
    transition: left .45s cubic-bezier(.22,1,.36,1), top .45s cubic-bezier(.22,1,.36,1), width .45s cubic-bezier(.22,1,.36,1), height .45s cubic-bezier(.22,1,.36,1), border-radius .45s; }
  #hbTour .hole.none { box-shadow: 0 0 0 9999px rgba(8,10,16,.58); }
  #hbTour .tip { position: fixed; width: min(370px, calc(100vw - 32px)); padding: 18px 18px 14px; border-radius: 18px; background: var(--panel); color: var(--ink); pointer-events: auto;
    box-shadow: 0 30px 80px rgba(0,0,0,.35), 0 0 0 1px var(--line); transition: left .45s cubic-bezier(.22,1,.36,1), top .45s cubic-bezier(.22,1,.36,1); animation: hbPop .3s cubic-bezier(.22,1,.36,1) both; }
  #hbTour .tip .ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--ink); color: var(--accent); margin-bottom: 12px; }
  #hbTour .tip .ic svg { width: 24px; height: 24px; } #hbTour .tip .ic .mk-hub path { fill: var(--ink); }
  #hbTour .tip .ic.lime { background: var(--accent); color: var(--accent-ink); }
  #hbTour .tip small { display: block; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--accent-text, var(--dim)); margin-bottom: 4px; }
  #hbTour .tip h4 { margin: 0 0 6px; font-size: 17px; letter-spacing: -.01em; }
  #hbTour .tip p { margin: 0; color: var(--dim); font-size: 13px; line-height: 1.5; }
  #hbTour .tip p kbd { font-size: 11px; }
  #hbTour .row { display: flex; align-items: center; gap: 8px; margin-top: 16px; }
  #hbTour .dots { display: flex; gap: 5px; margin-right: auto; }
  #hbTour .dots i { width: 6px; height: 6px; border-radius: 3px; background: var(--line-2); transition: width .3s, background .3s; }
  #hbTour .dots i.on { width: 18px; background: var(--accent); }
  #hbTour .row button { flex: none; white-space: nowrap; height: 34px; padding: 0 14px; border-radius: 9px; border: 0; font: 700 12.5px -apple-system, system-ui, sans-serif; cursor: pointer; }
  #hbTour .skip { background: none; color: var(--dim); } #hbTour .skip:hover { color: var(--ink); background: var(--hover); }
  #hbTour .next { background: var(--ink); color: var(--panel); }
  #hbTour .next.lime { background: var(--accent); color: var(--accent-ink); }
  #hub.touring .hb-card.cur .hb-more, #hub.touring .hb-card:nth-child(2) .hb-more { opacity: 1; }`;
  const tst = document.createElement("style"); tst.textContent = tcss; document.head.appendChild(tst);
  const firstCard = () => grid.querySelector(".hb-card.cur") || grid.querySelector(".hb-card");
  const STEPS = [
    { ic: LOGO_HUB, k: "Cutnote Hub", t: "All your projects in one place", p: "Every video project on this computer lives here. Take a 20-second look round, or skip and explore.", next: "Show me round", lime: true },
    { el: firstCard, k: "Projects", t: "Open any project", p: "Each card shows a frame from the footage, its open notes and when you last edited it. Click one and the editor switches to it." },
    { el: () => { const c = firstCard(); return c && c.querySelector(".hb-more"); }, pad: 6, k: "More", t: "Rename, find or tidy up", p: "Rename it (only the name here changes, never the folder), show it in your file manager, take it off the list or move it to the Trash." },
    { el: () => hub.querySelector('.hb-top [data-a="new"]'), pad: 6, k: "New project", t: "Start a new video", p: "Name it and drop in your footage. Cutnote makes the folder, copies the footage in and opens it." },
    { el: () => hub.querySelector('[data-a="roots"]'), pad: 6, k: "Folders", t: "Projects find their own way here", p: "Point the Hub at the folders you keep videos in and new projects show up by themselves, including ones your AI assistant makes." },
    { el: () => hub.querySelector(".hb-search"), pad: 6, k: "Search", t: "Find anything fast", p: "Search by name or folder, and sort by recent, last edited or name. <kbd>⌘F</kbd> jumps here." },
    { el: () => hub.querySelector('[data-a="back"]'), pad: 6, k: "Back to editing", t: "Getting back to the editor", p: "Click <b>Back to the editor</b>, press <kbd>Esc</kbd>, or hover <b>Cutnote Editor</b> at the top left any time to switch between the editor and the Hub.", next: "Got it", lime: true },
  ];
  // the editor's walk-round: new people see this first, and it hands over to the Hub tour at the end
  const side = name => { if (window.SidePane) { if (!SidePane.isOpen()) SidePane.setOpen(true, true); if (name) SidePane.show(name); } };
  const EDITOR_STEPS = [
    { ic: LOGO_EDITOR, icLime: true, k: "Cutnote Editor", t: "Welcome to Cutnote", p: "Review a video, leave notes and cut it, then your AI assistant builds the changes. Here's a one-minute look round, or skip and explore.", next: "Show me round", lime: true },
    { el: () => $("#frame"), k: "The video", t: "It plays live, right here", p: "Your edit plays as it really is. With the select tool, click anything on it to move it, resize it from a corner, or double-click to change its words." },
    { el: () => $("#tools"), pad: 6, k: "Drawing", t: "Point at things", p: "Scribble <kbd>P</kbd> or draw a box <kbd>R</kbd> on any frame, in any colour. Drawings are saved with your note." },
    { el: () => $("#transport"), pad: 4, k: "Playback", t: "Play, step and loop", p: "<kbd>Space</kbd> plays, <kbd>←</kbd> <kbd>→</kbd> step a frame, <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> work too. Change the speed or loop the whole video." },
    { el: () => $("#tlbar"), pad: 4, k: "Editing tools", t: "Cut like a real editor", p: "Select, Slip, Roll and Blade; split at the playhead, trim the start or end, change speed for slow motion, and set snapping or the magnetic timeline." },
    { el: () => $("#tlwrap"), pad: 0, k: "Timeline", t: "Everything on its own track", p: "Drag clips to move them, pull their edges to trim, drag up or down to layer. The eye hides a track and the speaker mutes it." },
    { el: () => $("#sideTabs"), pad: 4, before: () => side(), k: "Sidebar", t: "Notes, Library, Captions, Sounds", p: "Animated overlays, caption styles and 50 sound effects: drag any of them onto the video or the timeline." },
    { el: () => $("#compose"), pad: 6, before: () => side("notes"), k: "Notes", t: "Tell your AI what to change", p: "Press <kbd>N</kbd> at any moment, type what should change and press <kbd>Enter</kbd>. Your AI assistant reads the notes and makes the changes." },
    { el: () => $("#approve"), pad: 6, k: "Approve", t: "Sign off when it's right", p: "Approve the exact version you're happy with. Nothing gets rendered until you do." },
    { el: () => $("#brandBtn"), pad: 6, k: "Your projects", t: "Every project lives in the Hub", p: "Hover <b>Cutnote Editor</b> any time to switch to <b>Cutnote Hub</b>, your project manager. Want a quick look at it now?", next: "Show me the Hub", lime: true, last: "Finish" },
  ];
  let tourEl = null, tourK = 0, tourKind = "hub", tourSteps = STEPS;
  function tourDone(skipped) {
    if (!tourEl) return;
    tourEl.remove(); tourEl = null; hub.classList.remove("touring");
    try { localStorage.setItem(tourKind === "editor" ? "cutnote:edtour" : "cutnote:hubtour", "done"); } catch {}
    if (skipped) say(tourKind === "editor" ? "Tour skipped. Replay it from the Cutnote menu: Take the tour" : "Tour skipped. To get back to the editor: Back to the editor at the top left, or Esc");
  }
  function tourPaint() {
    const STEPS = tourSteps;
    const st = STEPS[tourK], hole = tourEl.querySelector(".hole"), tip = tourEl.querySelector(".tip");
    if (st.before) st.before();
    const el = st.el && st.el();
    if (el) el.scrollIntoView({ block: "nearest" });
    const r = el ? el.getBoundingClientRect() : null, pad = st.pad != null ? st.pad : 8;
    if (r) Object.assign(hole.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px", borderRadius: (st.pad ? 12 : 20) + "px" });
    else Object.assign(hole.style, { left: innerWidth / 2 + "px", top: innerHeight / 2 + "px", width: "0px", height: "0px" });
    hole.classList.toggle("none", !r);
    tip.innerHTML = `${st.ic ? `<div class="ic${st.icLime ? " lime" : ""}">${st.ic}</div>` : ""}<small>${st.k}</small><h4>${st.t}</h4><p>${st.p}</p>
      <div class="row"><div class="dots">${STEPS.map((_, i) => `<i class="${i === tourK ? "on" : ""}"></i>`).join("")}</div>
      ${tourK < STEPS.length - 1 ? `<button type="button" class="skip" data-t="skip">Skip tour</button>` : st.last ? `<button type="button" class="skip" data-t="finish">${st.last}</button>` : `<button type="button" class="skip" data-t="prev">Back</button>`}
      <button type="button" class="next${st.lime ? " lime" : ""}" data-t="next">${st.next || "Next"}</button></div>`;
    // the card sits beside the spotlight, wherever it fits
    const tw = tip.offsetWidth, th = tip.offsetHeight, m = 16;
    let x, y;
    if (!r) { x = (innerWidth - tw) / 2; y = (innerHeight - th) / 2; }
    else if (r.right + pad + m + tw < innerWidth) { x = r.right + pad + m; y = r.top; }
    else if (r.left - pad - m - tw > 0) { x = r.left - pad - m - tw; y = r.top; }
    else { x = r.left + r.width / 2 - tw / 2; y = r.bottom + pad + m; if (y + th > innerHeight - m) y = r.top - pad - m - th; }
    tip.style.left = Math.max(m, Math.min(innerWidth - tw - m, x)) + "px"; tip.style.top = Math.max(m, Math.min(innerHeight - th - m, y)) + "px";
    setTimeout(() => { const b = tip.querySelector(".next"); b && b.focus({ preventScroll: true }); }, 50);
  }
  function startTour(kind) {
    if (tourEl) tourEl.remove();
    tourKind = kind; tourSteps = kind === "editor" ? EDITOR_STEPS : STEPS; tourK = 0;
    hub.classList.toggle("touring", kind === "hub");
    tourEl = document.createElement("div"); tourEl.id = "hbTour";
    tourEl.innerHTML = `<div class="hole none"></div><div class="tip" role="dialog" aria-modal="true" aria-label="${kind === "editor" ? "Cutnote Editor" : "Cutnote Hub"} tour"></div>`;
    document.body.appendChild(tourEl);
    tourEl.addEventListener("click", e => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      if (b.dataset.t === "skip") return tourDone(true);
      if (b.dataset.t === "finish") return tourDone(false);
      if (b.dataset.t === "prev") { tourK = Math.max(0, tourK - 1); return tourPaint(); }
      if (tourK >= tourSteps.length - 1) {
        const handOver = tourKind === "editor";
        tourDone(false);
        if (handOver) H.tour(true);   // the editor tour ends by walking into the Hub
        return;
      }
      tourK++; tourPaint();
    });
    tourPaint();
  }
  H.tour = async (open) => {
    if (open && !document.body.classList.contains("hub-on")) H.show(true, true);
    await load();
    startTour("hub");
  };
  H.editorTour = () => { if (document.body.classList.contains("hub-on")) H.show(false); if (typeof S !== "undefined" && S.playing && typeof pause === "function") pause(); startTour("editor"); };
  // someone new: the editor tour first (the Hub tour follows from its last step)
  (() => {
    let fresh = false; try { fresh = !localStorage.getItem("cutnote:seen") && localStorage.getItem("cutnote:edtour") !== "done"; } catch {}
    if (!fresh || location.hash === "#hub") return;
    const until = Date.now() + 20000;
    const go = () => {
      if (typeof S !== "undefined" && S.player && S.player.ready && !document.querySelector("#wnew")) setTimeout(() => !tourEl && H.editorTour(), 700);
      else if (Date.now() < until) setTimeout(go, 400);
    };
    go();
  })();
  addEventListener("resize", () => tourEl && tourPaint());
  document.addEventListener("click", e => { const a = e.target.closest("[data-tour]"); if (!a) return; e.preventDefault(); document.querySelectorAll(".open").forEach(x => x.classList.remove("open")); H.editorTour(); });
  document.addEventListener("keydown", e => {
    if (!tourEl) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); tourDone(true); }
    else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); tourEl.querySelector(".next").click(); }
    else if (e.key === "ArrowLeft" && tourK > 0) { e.preventDefault(); e.stopImmediatePropagation(); tourK--; tourPaint(); }
  }, true);

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
