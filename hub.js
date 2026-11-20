"use strict";
/* Cutnote Hub: every project on this computer in one screen. Open, rename, remove, trash, create.
   The list lives in ~/.config/cutnote/projects.json (see review.py). Renaming only changes the name shown here:
   folders on disk keep their names. The header's "Cutnote Editor" menu switches between the editor and the Hub. */
(() => {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = `
  .brand { position: relative; flex: none; }
  #title { flex: 0 1 auto; min-width: 40px; }
  @media (max-width: 900px) { .brandBtn b span { display: none; } }
  .brandBtn { flex: none; display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 10px 0 4px; margin-left: -4px; border: 1px solid transparent; border-radius: 10px; background: none; color: var(--ink); cursor: pointer; font: inherit; }
  .brandBtn:hover, .brand.open .brandBtn { background: var(--raise); border-color: var(--line); }
  .brandBtn b { font-size: 14px; font-weight: 700; letter-spacing: -.01em; white-space: nowrap; }
  .brandBtn b span { color: var(--dim); font-weight: 600; }
  .brandBtn > svg { width: 12px; height: 12px; color: var(--dim); transition: transform .2s; }
  .brand.open .brandBtn > svg { transform: rotate(180deg); }
  .brandPop { position: absolute; top: calc(100% + 10px); left: 0; z-index: 80; width: min(380px, calc(100vw - 24px)); padding: 8px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line-2);
    box-shadow: 0 24px 60px rgba(0,0,0,.2), 0 2px 8px rgba(0,0,0,.08); opacity: 0; transform: translateY(-6px) scale(.98); transform-origin: top left; pointer-events: none;
    transition: opacity .16s ease, transform .22s cubic-bezier(.22,1,.36,1); }
  .brandPop::before { content: ""; position: absolute; left: 0; right: 0; top: -12px; height: 12px; }
  .brand.open .brandPop { opacity: 1; transform: none; pointer-events: auto; }
  .brandPop button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px; border: 0; border-radius: 11px; background: none; color: var(--ink); text-align: left; cursor: pointer; font: inherit; }
  .brandPop button:hover { background: var(--raise); }
  .brandPop .tile { flex: none; width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); }
  .brandPop .tile.dark { background: var(--ink); color: var(--panel); }
  .brandPop .tile svg { width: 18px; height: 18px; }
  .brandPop b { display: block; font-size: 13px; } .brandPop small { display: block; color: var(--dim); font-size: 11.5px; line-height: 1.35; margin-top: 2px; }
  .brandPop .ck { margin-left: auto; width: 16px; height: 16px; color: var(--accent-text, var(--ink)); opacity: 0; }
  .brandPop button[aria-current="true"] .ck { opacity: 1; }
  #title { color: var(--dim); font-weight: 500; }

  body.hub-on { overflow: hidden; }
  #hub { position: fixed; inset: 0; z-index: 300; display: flex; flex-direction: column; background: var(--bg); color: var(--ink);
    opacity: 0; transform: scale(.985); pointer-events: none; visibility: hidden; transition: opacity .22s ease, transform .32s cubic-bezier(.22,1,.36,1), visibility 0s linear .32s; }
  body.hub-on #hub { opacity: 1; transform: none; pointer-events: auto; visibility: visible; transition-delay: 0s; }
  #hub [hidden], .hb-modal [hidden] { display: none !important; }
  #hub .hb-top { flex: none; display: flex; align-items: center; gap: 10px; height: 56px; padding: 0 20px; border-bottom: 1px solid var(--line); background: var(--panel); }
  #hub .hb-brand { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 700; }
  #hub .hb-brand .logo { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--ink); color: var(--accent); }
  #hub .hb-brand .logo svg { width: 19px; height: 19px; }
  #hub .hb-brand .logo { --mk-bg: var(--ink); }
  .mk svg { overflow: visible; }
  .brandBtn .logo { width: 28px; height: 28px; border-radius: 8px; }
  .brandBtn .logo svg { width: 19px; height: 19px; }
  .mk-ph { transition: transform .45s cubic-bezier(.22,1,.36,1); }
  .brandBtn:hover .mk-ph, .brandPop button:hover .mk-ph { transform: translateX(-4.5px); }
  /* the Hub mark: a grid of projects with one card lifting out of it. Hover (or opening the Hub) lifts the card and settles the grid */
  .mk-hub .mk-t, .mk-hub .mk-c { transform-box: fill-box; transform-origin: center; transition: transform .5s cubic-bezier(.22,1,.36,1), opacity .35s ease; }
  .mk-hub .mk-c { transition: transform .55s cubic-bezier(.34,1.5,.5,1); }
  :is(button, a, .mk-play):hover .mk-hub .mk-t, .mk-play .mk-hub .mk-t { transform: scale(.84); opacity: .72; }
  :is(button, a, .mk-play):hover .mk-hub .mk-t:nth-child(2), .mk-play .mk-hub .mk-t:nth-child(2) { transition-delay: .04s; }
  :is(button, a, .mk-play):hover .mk-hub .mk-t:nth-child(3), .mk-play .mk-hub .mk-t:nth-child(3) { transition-delay: .08s; }
  :is(button, a, .mk-play):hover .mk-hub .mk-c, .mk-play .mk-hub .mk-c { transform: translate(-.7px, -.7px) rotate(-9deg) scale(1.14); }
  .brandPop .tile.mk svg { width: 22px; height: 22px; }
  .brandPop .tile.dark.mk { color: var(--accent); } .brandPop .tile.dark { --mk-bg: var(--ink); }
  #hub .hb-brand span { color: var(--dim); font-weight: 600; }
  /* the Hub's top left is the editor's, pixel for pixel: same place, same hover menu, so switching feels like one screen */
  #hub .hb-top { padding-left: 16px; }
  #hub .hb-top .brand { flex: none; }
  .brandBtn .logo.dark { background: var(--ink); color: var(--accent); }
  .brandBtn .logo.dark { --mk-bg: var(--ink); }
  /* dark theme: the Hub tile is a deep chip with a lime hairline, so the lime grid reads (a light tile washed it out) */
  [data-theme="dark"] :is(.brandBtn .logo.dark, .brandPop .tile.dark, #hbTour .tip .ic:not(.lime)) { background: #1d2126; color: var(--accent); --mk-bg: #1d2126; box-shadow: inset 0 0 0 1px rgba(198,244,50,.32); }
  .brandBtn b span { display: inline-block; transition: opacity .2s; }
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
  #hub .hb-head { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 14px; max-width: 1400px; margin: 0 auto 18px; }
  #hub .hb-hl { flex: 1 1 240px; min-width: 0; }
  #hub h2 { margin: 0; font-size: 26px; font-weight: 750; letter-spacing: -.02em; }
  #hub .hb-head p { margin: 4px 0 0; color: var(--dim); font-size: 13px; }
  /* the sort switch: one pill slides to the picked option */
  #hub .hb-sort { position: relative; flex: none; display: flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--panel-2); border: 1px solid var(--line); }
  #hub .hb-sort button { position: relative; z-index: 1; height: 28px; padding: 0 11px; border: 0; border-radius: 7px; background: none; color: var(--dim); font: 600 12px -apple-system, system-ui, sans-serif; cursor: pointer; white-space: nowrap; transition: color .25s ease; }
  #hub .hb-sort button:hover { color: var(--ink); }
  #hub .hb-sort button.on { color: var(--ink); }
  #hub .hb-sort button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  #hub .hb-pill { position: absolute; z-index: 0; left: 0; top: 3px; height: 28px; width: 0; border-radius: 7px; background: var(--panel); box-shadow: 0 0 0 1px var(--line), 0 1px 3px rgba(0,0,0,.12);
    transition: transform .42s cubic-bezier(.22,1,.36,1), width .42s cubic-bezier(.22,1,.36,1); }
  #hub .hb-pill.still { transition: none; }
  #hub .hb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 18px; max-width: 1400px; margin: 0 auto; }
  .hb-card { position: relative; display: flex; flex-direction: column; border-radius: 16px; background: var(--panel); box-shadow: 0 0 0 1px var(--line); cursor: pointer; text-align: left;
    transition: box-shadow .45s cubic-bezier(.22,1,.36,1), transform .55s cubic-bezier(.22,1,.36,1); will-change: transform; }
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
  .hb-meta { display: flex; flex-wrap: wrap; gap: 4px 10px; min-width: 0; color: var(--dim); font-size: 12px; }
  .hb-meta > * { min-width: 0; max-width: 100%; }
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
  .hb-modal { position: fixed; inset: 0; z-index: 340; display: grid; place-items: center; padding: 12px; background: rgba(10,12,18,.45); backdrop-filter: blur(4px); animation: hbFade .2s ease both; transition: opacity .18s ease; }
  .hb-modal.out { opacity: 0; pointer-events: none; }
  @keyframes hbFade { from { opacity: 0; } }
  /* sheets: one compact card, never scrolling, with a soft lime edge like the rest of Cutnote */
  .hb-dlg { position: relative; width: min(480px, calc(100vw - 24px)); max-height: calc(100dvh - 24px); overflow: hidden auto; overscroll-behavior: contain; border-radius: 20px; background: var(--panel); padding: 20px;
    box-shadow: 0 0 0 1px rgba(198,244,50,.55), 0 0 30px rgba(198,244,50,.18), 0 30px 80px rgba(0,0,0,.35); animation: hbPop .3s cubic-bezier(.22,1,.36,1) both; }
  .hb-dlg .hb-hd { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding-right: 30px; }
  .hb-dlg .hb-hd > div { min-width: 0; }
  .hb-dlg .hb-hd i { flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); font-style: normal; box-shadow: 0 6px 16px rgba(120,160,0,.3); }
  .hb-dlg .hb-hd i svg { width: 19px; height: 19px; }
  .hb-dlg .hb-hd h3 { margin: 0; } .hb-dlg .hb-hd p { margin: 1px 0 0; color: var(--dim); font-size: 12.5px; line-height: 1.4; }
  .hb-x { position: absolute; top: 14px; right: 14px; width: 30px; height: 30px; border-radius: 9px; border: 0; background: none; color: var(--dim); cursor: pointer; font-size: 15px; }
  .hb-x:hover { background: var(--hover); color: var(--ink); }
  @keyframes hbPop { from { opacity: 0; transform: translateY(10px) scale(.98); } }
  .hb-dlg h3 { margin: 0 0 4px; padding-right: 30px; font-size: 18px; font-weight: 750; letter-spacing: -.01em; overflow-wrap: anywhere; }
  .hb-dlg .hb-hd h3 { padding-right: 0; }
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
  /* Stacks: groups made by hand. Wide lime-edged cards above the grid; one opens into its own view with a way back */
  #hub .hb-view { max-width: 1400px; margin: 0 auto; transition: opacity .2s ease, transform .32s cubic-bezier(.22,1,.36,1); }
  #hub .hb-ghost { position: fixed; z-index: 1; overflow: hidden; pointer-events: none; }
  #hub .hb-sec { display: flex; align-items: baseline; gap: 8px; margin: 0 0 12px; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); }
  #hub .hb-sec span { font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--faint); }
  #hub .hb-stacks { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; margin-bottom: 30px; }
  .hb-stack { position: relative; display: flex; align-items: center; gap: 18px; min-height: 124px; padding: 16px 18px 16px 16px; border-radius: 18px; cursor: pointer; text-align: left; color: var(--ink);
    background: linear-gradient(120deg, rgba(198,244,50,.16), rgba(198,244,50,.04) 55%, var(--panel) 100%), var(--panel);
    box-shadow: 0 0 0 1.5px rgba(198,244,50,.55), 0 8px 24px rgba(0,0,0,.08);
    transition: box-shadow .45s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1); }
  .hb-stack:hover, .hb-stack:focus-visible, .hb-stack.drop { outline: none; transform: translateY(-4px);
    box-shadow: 0 0 0 2px var(--accent), 0 0 18px 2px rgba(198,244,50,.5), 0 0 46px 6px rgba(198,244,50,.2), 0 20px 40px rgba(0,0,0,.14); }
  .hb-stack.drop { transform: translateY(-4px) scale(1.02); }
  .hb-fan { position: relative; flex: none; width: 112px; height: 92px; }
  .hb-fan i { position: absolute; top: 4px; left: 22px; width: 66px; height: 84px; border-radius: 11px; overflow: hidden; background: linear-gradient(150deg, var(--panel-2), var(--raise));
    box-shadow: 0 0 0 1px var(--line), 0 6px 14px rgba(0,0,0,.18); transition: transform .5s cubic-bezier(.22,1,.36,1); }
  .hb-fan i img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .hb-fan i:nth-child(1) { transform: rotate(-11deg) translateX(-20px); } .hb-fan i:nth-child(2) { transform: rotate(9deg) translateX(20px); } .hb-fan i:nth-child(3) { z-index: 1; }
  .hb-stack:hover .hb-fan i:nth-child(1) { transform: rotate(-16deg) translateX(-28px) translateY(-2px); }
  .hb-stack:hover .hb-fan i:nth-child(2) { transform: rotate(14deg) translateX(28px) translateY(-2px); }
  .hb-stack:hover .hb-fan i:nth-child(3) { transform: translateY(-4px); }
  .hb-fan .none { left: 22px; display: grid; place-items: center; color: var(--faint); box-shadow: 0 0 0 1.5px var(--line-2); background: none; border: 0; }
  .hb-fan .none svg { width: 22px; height: 22px; }
  .hb-stack .tx { flex: 1; min-width: 0; display: grid; gap: 4px; padding-right: 30px; }
  .hb-stack .tx b { font-size: 16px; font-weight: 750; letter-spacing: -.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hb-stack .tx small { color: var(--dim); font-size: 12.5px; }
  .hb-stack .tx em { justify-self: start; margin-top: 6px; display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 11px; border-radius: 13px; font: 700 11.5px -apple-system, system-ui, sans-serif; font-style: normal;
    background: var(--accent); color: var(--accent-ink); opacity: .9; transition: opacity .2s, gap .3s cubic-bezier(.22,1,.36,1); }
  .hb-stack .tx em svg { width: 12px; height: 12px; transform: rotate(180deg); }
  .hb-stack:hover .tx em { opacity: 1; gap: 9px; }
  .hb-stack .hb-more { top: 12px; right: 12px; background: var(--panel); color: var(--ink); box-shadow: 0 0 0 1px var(--line), 0 2px 8px rgba(0,0,0,.12); }
  .hb-stack:hover .hb-more { opacity: 1; transform: none; }
  .hb-card.dragging { opacity: .45; transform: scale(.97); }
  .hb-chip { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 18px; height: 18px; padding: 0 7px; border-radius: 9px; background: var(--accent-soft); color: var(--accent-text, var(--ink)); font-size: 11px; font-weight: 700; }
  #hub .hb-backto { display: inline-flex; align-items: center; gap: 6px; height: 30px; margin: 0 0 10px -6px; padding: 0 12px 0 6px; border: 0; border-radius: 15px; background: none; color: var(--dim);
    font: 650 13px -apple-system, system-ui, sans-serif; cursor: pointer; transition: background .15s, color .15s, gap .3s cubic-bezier(.22,1,.36,1); }
  #hub .hb-backto:hover { background: var(--accent-soft); color: var(--ink); gap: 3px; }
  #hub .hb-backto svg { width: 16px; height: 16px; }
  #hub .hb-head .ttl { display: flex; align-items: center; gap: 10px; min-width: 0; }
  #hub .hb-head .ttl .tag { flex: none; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); box-shadow: 0 0 18px rgba(198,244,50,.45); }
  #hub .hb-head .ttl .tag svg { width: 17px; height: 17px; }
  #hub .hb-head h2 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #hub .hb-head .hb-more { position: static; opacity: 1; transform: none; background: var(--panel); box-shadow: 0 0 0 1px var(--line); color: var(--ink); }
  /* the stack sheets: a live preview of the stack card, then a searchable list that scrolls inside the sheet */
  .hb-dlg.ns { width: min(600px, calc(100vw - 24px)); max-height: min(780px, calc(100dvh - 24px)); display: flex; flex-direction: column; overflow: hidden; padding: 22px 22px 18px; }
  .hb-dlg.ns > * { flex: none; }
  .hb-dlg.ns > .ns-list { flex: 0 1 auto; }
  .hb-dlg.ns.one { width: min(480px, calc(100vw - 24px)); }
  .ns-card { position: relative; display: flex; align-items: center; gap: 18px; min-width: 0; padding: 14px 16px 14px 12px; margin: 2px 0 0; border-radius: 18px;
    background: linear-gradient(120deg, rgba(198,244,50,.16), rgba(198,244,50,.04) 55%, transparent), var(--panel-2);
    box-shadow: 0 0 0 1.5px rgba(198,244,50,.55), 0 8px 24px rgba(0,0,0,.08); transition: box-shadow .35s cubic-bezier(.22,1,.36,1); }
  .ns-card:focus-within { box-shadow: 0 0 0 2px var(--accent), 0 0 24px rgba(198,244,50,.28), 0 8px 24px rgba(0,0,0,.08); }
  .ns-fan i { display: grid; place-items: center; color: var(--faint); }
  .ns-fan i img { position: absolute; inset: 0; }
  .ns-fan i.e:nth-child(1), .ns-fan i.e:nth-child(2) { opacity: .55; }
  .ns-fan i.e:nth-child(3) { background: var(--panel); box-shadow: 0 0 0 1.5px var(--line-2); }
  .ns-fan i svg { width: 22px; height: 22px; }
  .ns-card.spread .hb-fan i:nth-child(1) { transform: rotate(-16deg) translateX(-28px) translateY(-2px); }
  .ns-card.spread .hb-fan i:nth-child(2) { transform: rotate(14deg) translateX(28px) translateY(-2px); }
  .ns-card.spread .hb-fan i:nth-child(3) { transform: translateY(-4px); }
  .ns-id { flex: 1; min-width: 0; display: grid; gap: 5px; }
  .ns-lbl { font-size: 10.5px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; color: var(--accent-text, var(--dim)); }
  .hb-dlg .ns-in { width: 100%; min-width: 0; height: 46px; padding: 0 13px; border-radius: 12px; border: 1px solid var(--line-2); background: var(--panel); color: var(--ink); font: 700 18px -apple-system, system-ui, sans-serif; letter-spacing: -.01em; }
  .hb-dlg .ns-in::placeholder { color: var(--faint); font-weight: 600; }
  .hb-dlg .ns-in:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: var(--panel); }
  .ns-nm { font-size: 19px; font-weight: 750; letter-spacing: -.01em; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ns-cnt { min-height: 17px; color: var(--dim); font-size: 12.5px; line-height: 1.35; }
  .ns-cnt b { color: var(--ink); font-weight: 700; }
  .hb-dlg .ns-err { margin: 8px 2px 0; } .hb-dlg .ns-err:empty { display: none; }
  .ns-bar { display: flex; align-items: center; gap: 4px; margin: 16px 0 8px; }
  .ns-bar .ns-h { flex: none; margin-right: 6px; font-size: 12px; font-weight: 700; color: var(--dim); }
  .ns-q { position: relative; flex: 1; min-width: 0; margin-right: 4px; }
  .ns-q svg { position: absolute; left: 11px; top: 50%; width: 14px; height: 14px; transform: translateY(-50%); color: var(--faint); pointer-events: none; }
  .ns-q input { width: 100%; height: 36px; padding: 0 12px 0 33px; border-radius: 10px; border: 1px solid var(--line); background: var(--panel-2); color: var(--ink); font-size: 13px; }
  .ns-q input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); background: var(--panel); }
  .ns-l { flex: none; height: 32px; padding: 0 10px; border: 0; border-radius: 8px; background: none; color: var(--dim); font: 650 12px -apple-system, system-ui, sans-serif; cursor: pointer; white-space: nowrap; transition: background .15s, color .15s; }
  .ns-l:hover { background: var(--hover); color: var(--ink); }
  .ns-l:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .ns-list { min-height: 128px; overflow: auto; overscroll-behavior: contain; display: grid; align-content: start; gap: 2px; padding: 3px; margin: 0 -3px; border-radius: 14px; }
  .ns-list.ns-one { min-height: 0; }
  .ns-row { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 7px 10px 7px 8px; border-radius: 12px; cursor: pointer; user-select: none; outline: none; transition: background .16s ease, box-shadow .16s ease; }
  .ns-row:hover { background: var(--raise); }
  .ns-row[aria-selected="true"] { background: var(--accent-soft); }
  .ns-row:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
  .ns-ck { flex: none; width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; box-shadow: inset 0 0 0 1.5px var(--line-2); color: var(--accent-ink); transition: background .18s ease, box-shadow .18s ease; }
  .ns-ck svg { width: 13px; height: 13px; opacity: 0; transform: scale(.4); transition: transform .32s cubic-bezier(.34,1.56,.64,1), opacity .15s ease; }
  [aria-selected="true"] > .ns-ck { background: var(--accent); box-shadow: none; }
  [aria-selected="true"] > .ns-ck svg { opacity: 1; transform: none; }
  .ns-th { position: relative; flex: none; width: 34px; height: 42px; border-radius: 8px; overflow: hidden; display: grid; place-items: center; background: linear-gradient(150deg, var(--panel-2), var(--raise)); box-shadow: 0 0 0 1px var(--line); }
  .ns-th img { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; object-fit: cover; display: block; }
  .ns-th em { font-style: normal; font-size: 14px; font-weight: 800; color: var(--faint); }
  .ns-th.stk { overflow: visible; margin: 4px 4px 0 0; box-shadow: 0 0 0 1px var(--line), 4px -4px 0 -1px var(--panel-2), 4px -4px 0 0 var(--line-2); }
  .ns-th.stk img { border-radius: 8px; }
  .ns-th.lime { background: var(--accent); color: var(--accent-ink); box-shadow: none; }
  .ns-th.add { background: var(--panel-2); color: var(--ink); box-shadow: 0 0 0 1px var(--line); }
  .ns-th svg { width: 16px; height: 16px; }
  .ns-tx { flex: 1; min-width: 0; display: grid; gap: 1px; }
  .ns-tx b { font-size: 13.5px; font-weight: 650; letter-spacing: -.005em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ns-tx small { font-size: 11.5px; color: var(--faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ns-row.miss .ns-tx small { color: var(--change, #d98a12); }
  .ns-chip { flex: 0 1 auto; min-width: 0; max-width: 42%; display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 9px; border-radius: 11px; background: var(--panel); box-shadow: 0 0 0 1px var(--line); color: var(--dim); font-size: 11px; font-weight: 700; }
  .ns-chip svg { flex: none; width: 12px; height: 12px; }
  .ns-chip span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ns-chip.on { background: var(--accent); color: var(--accent-ink); box-shadow: none; }
  .ns-go-ic { flex: none; width: 16px; height: 16px; color: var(--faint); transform: rotate(180deg); transition: transform .3s cubic-bezier(.22,1,.36,1), color .15s; }
  .ns-row:hover .ns-go-ic, .ns-row:focus-visible .ns-go-ic { color: var(--ink); transform: rotate(180deg) translateX(-3px); }
  .ns-none { padding: 26px 12px; text-align: center; color: var(--dim); font-size: 12.5px; }
  .hb-dlg .ns-acts { align-items: center; flex-wrap: nowrap; margin-top: 12px; padding-top: 14px; border-top: 1px solid var(--line); }
  .ns-tip { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 4px; color: var(--faint); font-size: 11.5px; white-space: nowrap; overflow: hidden; }
  .ns-tip kbd { font-size: 10.5px; }
  .ns-acts .hb-btn { flex: none; }
  .ns-acts .primary { font-variant-numeric: tabular-nums; }
  @media (max-width: 560px) { .ns-tip { display: none; } .ns-acts { justify-content: flex-end; } .ns-card { gap: 10px; padding: 12px; } .ns-card .ns-fan { transform: scale(.8); margin: -9px -11px; } .ns-chip { max-width: 36%; }
    .hb-dlg .ns-in { height: 42px; font-size: 16px; } .ns-bar .ns-h { display: none; } .hb-dlg.ns { padding: 18px 16px 14px; } }
  @media (max-width: 720px) { #hub .hb-search { display: none; } #hub .hb-top .lbl { display: none; } #hub .hb-top .hb-btn:not(.primary) { padding: 0 10px; } #hub .hb-stacks { grid-template-columns: 1fr; } }
  @media (max-width: 520px) { #hub .hb-top .lbl2 { display: none; } #hub .hb-top .hb-btn.primary { padding: 0 10px; } #hub .hb-top { gap: 6px; padding-right: 12px; }
    #hub .hb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } .hb-open { min-width: 0; padding: 0 16px; } #hub .hb-stack { gap: 12px; } }
  @media (prefers-reduced-motion: reduce) { #hub, .hb-card, .hb-stack, .hb-view, .hb-dlg, .hb-modal, #hub .hb-pill, .mk-hub .mk-t, .mk-hub .mk-c, .ns-card, .hb-fan i, .ns-ck, .ns-ck svg { transition: none !important; animation: none !important; } }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  /* the marks: Editor = three clips on a timeline with a playhead; Hub = a grid of projects, one opening */
  const LOGO_EDITOR = `<svg class="mk-ed" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5.4" width="10.5" height="3.7" rx="1.85" fill="currentColor"/><rect x="7.5" y="10.15" width="13.5" height="3.7" rx="1.85" fill="currentColor" opacity=".5"/><rect x="3" y="14.9" width="7.5" height="3.7" rx="1.85" fill="currentColor"/>
    <g class="mk-ph"><path d="M15.6 6V21.2" stroke="var(--accent)" stroke-width="3.8" stroke-linecap="round"/><path d="M15.6 6V21.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12.6 2.1h6a.9.9 0 0 1 .9.9v2.2l-3.9 2.9-3.9-2.9V3a.9.9 0 0 1 .9-.9z" fill="currentColor" stroke="var(--accent)" stroke-width="1.2" stroke-linejoin="round"/></g></svg>`;
  // Hub: three project tiles and a fourth card lifting out of the grid, cut out from the tile behind it (--mk-bg) so it reads at 19px
  const LOGO_HUB = `<svg class="mk-hub" viewBox="0 0 24 24" aria-hidden="true"><rect class="mk-t" x="3" y="3" width="8" height="8" rx="2.4" fill="currentColor"/><rect class="mk-t" x="13" y="3" width="8" height="8" rx="2.4" fill="currentColor" opacity=".5"/><rect class="mk-t" x="3" y="13" width="8" height="8" rx="2.4" fill="currentColor" opacity=".5"/>
    <g class="mk-c"><rect x="12.2" y="12.2" width="9.6" height="9.6" rx="2.8" fill="currentColor" stroke="var(--mk-bg, var(--accent))" stroke-width="1.7" paint-order="stroke"/><path d="M15.7 14.8v4.4l3.6-2.2z" fill="var(--mk-bg, var(--accent))" stroke="var(--mk-bg, var(--accent))" stroke-width=".7" stroke-linejoin="round"/></g></svg>`;
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
    stack: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3.5l8.5 4.3L12 12 3.5 7.8z"/><path d="M3.5 12l8.5 4.3 8.5-4.3" stroke-linecap="round"/><path d="M3.5 16.2l8.5 4.3 8.5-4.3" stroke-linecap="round"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',
  };
  const api = async (body) => {
    const r = await fetch("/api/hub", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Something went wrong"); return j;
  };
  const say = m => (typeof toast === "function" ? toast(m) : null);

  /* ---------- header: "Cutnote Editor" with a menu to the Hub ---------- */
  const brand = document.querySelector("header .brand");
  const brandHTML = (hubSide, ids) => `<button type="button" class="brandBtn"${ids ? ' id="brandBtn"' : ""} aria-haspopup="true" aria-expanded="false"><span class="logo mk${hubSide ? " dark" : ""}">${hubSide ? LOGO_HUB : LOGO_EDITOR}</span><b>Cutnote <span>${hubSide ? "Hub" : "Editor"}</span></b>${I.chev}</button>
    <div class="brandPop"${ids ? ' id="brandPop"' : ""} role="menu">
      <button type="button" role="menuitem" data-go="editor" aria-current="${!hubSide}"><span class="tile mk">${LOGO_EDITOR}</span><span><b>Cutnote Editor</b><small>Review, cut and build this project</small></span>${I.check}</button>
      <button type="button" role="menuitem" data-go="hub" aria-current="${hubSide}"><span class="tile dark mk">${LOGO_HUB}</span><span><b>Cutnote Hub</b><small>All your projects: open, rename, create</small></span>${I.check}</button>
    </div>`;
  brand.innerHTML = brandHTML(false, true);
  const title = document.createElement("h1"); title.id = "title"; title.textContent = (typeof S !== "undefined" && S.info && (S.info.name || S.info.video)) || "";
  title.title = "Open Cutnote Hub to switch project"; title.style.cursor = "pointer"; title.onclick = () => H.show(true);
  const oldTitle = document.getElementById("title"); if (oldTitle && oldTitle !== title) oldTitle.remove();
  brand.after(title);
  // hover reveals the Editor / Hub menu; picking one switches with the Hub's fade
  function brandMenu(el) {
    let t = 0; const btn = el.querySelector(".brandBtn"), set = on => { el.classList.toggle("open", on); btn.setAttribute("aria-expanded", String(on)); };
    el.addEventListener("mouseenter", () => { clearTimeout(t); t = setTimeout(() => set(true), 80); });
    el.addEventListener("mouseleave", () => { clearTimeout(t); t = setTimeout(() => set(false), 220); });
    btn.addEventListener("click", () => set(!el.classList.contains("open")));
    document.addEventListener("pointerdown", e => { if (!el.contains(e.target)) set(false); });
    el.querySelector(".brandPop").addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (!b) return; clearTimeout(t); set(false); H.show(b.dataset.go === "hub"); });
    return set;
  }
  brandMenu(brand);

  /* ---------- the Hub screen ---------- */
  document.body.insertAdjacentHTML("beforeend", `<section id="hub" aria-label="Cutnote Hub" aria-hidden="true">
    <div class="hb-top">
      <div class="brand" data-hbrand>${brandHTML(true)}</div>
      <span class="sp"></span>
      <label class="hb-search">${I.search}<input type="search" placeholder="Search projects" aria-label="Search projects" data-q></label>
      <button type="button" class="hb-btn" data-a="roots" title="Folders the Hub watches for projects">${I.folder}<span class="lbl">Folders</span></button>
      <button type="button" class="hb-btn" data-a="newstack" title="Group projects into a stack">${I.stack}<span class="lbl">New stack</span></button>
      <button type="button" class="hb-btn primary" data-a="new" aria-label="New project" title="Make a new project">${I.plus}<span class="lbl2">New project</span></button>
    </div>
    <div class="hb-main"><div class="hb-view" data-view><div class="hb-head"><div class="hb-hl"><div data-back></div><div class="ttl" data-ttl><h2>Projects</h2></div><p><span data-sub>Loading…</span> · <a href="#" data-a="tour" style="color:inherit;text-underline-offset:3px">Take the tour</a></p></div>
      <div class="hb-sort" role="tablist" aria-label="Sort"><i class="hb-pill still" aria-hidden="true"></i><button type="button" role="tab" data-sort="opened">Recent</button><button type="button" role="tab" data-sort="changed">Last edited</button><button type="button" role="tab" data-sort="name">Name</button></div></div>
      <div data-stacks><div class="hb-sec" data-ssec hidden>Stacks<span></span></div><div class="hb-stacks" data-sgrid hidden></div></div><div data-psec></div>
      <div class="hb-grid" data-grid></div></div></div>
  </section>`);
  brandMenu($("#hub [data-hbrand]"));
  const hub = $("#hub"), grid = hub.querySelector("[data-grid]"), view = hub.querySelector("[data-view]");
  const H = (window.CutnoteHub = { data: null, q: "", stack: null, sort: (() => { try { return localStorage.getItem("cutnote:hubsort") || "opened"; } catch { return "opened"; } })() });
  const sortEl = hub.querySelector(".hb-sort"), pillEl = sortEl.querySelector(".hb-pill");
  const mo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(.22,1,.36,1)";
  // the sort pill sits under the picked option; it slides (transform + width) when the pick changes
  const pill = () => { const b = sortEl.querySelector("button.on"); if (!b || !b.offsetWidth) return; pillEl.style.width = b.offsetWidth + "px"; pillEl.style.transform = `translateX(${b.offsetLeft}px)`; };
  const setSort = () => sortEl.querySelectorAll("[data-sort]").forEach(b => { const on = b.dataset.sort === H.sort; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
  setSort(); pill(); requestAnimationFrame(() => requestAnimationFrame(() => pillEl.classList.remove("still")));
  new ResizeObserver(() => { pillEl.classList.add("still"); pill(); requestAnimationFrame(() => pillEl.classList.remove("still")); }).observe(sortEl);

  const toured = () => { try { return localStorage.getItem("cutnote:hubtour") === "done"; } catch { return true; } };
  // opening paints what's already known first, then refreshes in place: no blank frame, no repainting flash
  let showN = 0, entered = false;
  const staggerIn = () => { if (mo()) return; [...hub.querySelectorAll("[data-sgrid] > *, [data-grid] > *")].slice(0, 24).forEach((el, i) =>
    el.animate([{ opacity: 0, transform: "translateY(12px) scale(.985)", offset: 0 }], { duration: 480, delay: 40 + i * 30, easing: EASE, fill: "backwards" })); };
  H.show = (on, noTour) => {
    const n = ++showN;
    hub.setAttribute("aria-hidden", String(!on));
    if (!on) { document.body.classList.remove("hub-on"); if (location.hash === "#hub") history.replaceState(null, "", location.pathname + location.search); return; }
    const hh = document.querySelector("body > header, header"); if (hh && hh.offsetHeight) hub.querySelector(".hb-top").style.height = hh.offsetHeight + "px";
    if (typeof S !== "undefined" && S.playing && typeof pause === "function") pause();
    if (location.hash !== "#hub") history.replaceState(null, "", "#hub");
    let shown = false;
    const reveal = () => {
      if (shown || n !== showN) return; shown = true;
      if (H.data) paint({ flip: false, enter: false });
      document.body.classList.add("hub-on"); H.openedAt = performance.now(); pill();
      if (!entered && H.data) { entered = true; staggerIn(); }
      const lg = hub.querySelector("[data-hbrand] .logo"); if (lg && !mo()) { lg.classList.add("mk-play"); setTimeout(() => lg.classList.remove("mk-play"), 620); }
    };
    if (H.data) { reveal(); load(); }   // what we know now, then a quiet refresh
    else { const t = setTimeout(reveal, 450); load().then(() => { clearTimeout(t); reveal(); }); }   // first time: wait (briefly) for the list so it opens full
    if (!noTour && !toured() && !tourEl) H.tour(false);   // the first visit offers the tour
  };
  // warm the list when someone heads for the Hub, so it opens already painted
  const warm = () => { if (!H.data && !loading) load(); };
  brand.addEventListener("pointerenter", warm); title.addEventListener("pointerenter", warm);
  let loading = null;
  function load(fresh) {
    if (loading) return fresh ? loading.then(() => load()) : loading;   // fresh: a change was just saved, so read again after any fetch in flight
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
  const stackOf = id => ((H.data && H.data.stacks) || []).find(k => k.id === id);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const thumb = p => `/api/hub/thumb?id=${p.id}&v=${encodeURIComponent(p.changed || "")}`;
  const initial = p => esc((p.name.match(/[A-Za-z0-9]/) || ["•"])[0].toUpperCase());
  const setH = (el, html) => { if (el._h !== html) { el._h = html; el.innerHTML = html; } };
  // keyed repaint: unchanged cards stay put (no reload, no flash), changed ones are patched in place (same element, same
  // loaded pictures, same focus), and everything that moves glides from where it was (FLIP)
  const tpl = document.createElement("template");
  function morph(o, n) {
    for (const a of [...o.attributes]) if (!n.hasAttribute(a.name)) o.removeAttribute(a.name);
    for (const a of n.attributes) if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
    const oc = [...o.childNodes], nc = [...n.childNodes];
    if (oc.length !== nc.length) { o.replaceChildren(...nc); return; }
    oc.forEach((x, i) => {
      const y = nc[i];
      if (x.nodeType !== y.nodeType || x.nodeName !== y.nodeName) x.replaceWith(y);
      else if (x.nodeType === 3) { if (x.data !== y.data) x.data = y.data; }
      else if (x.nodeType === 1 && x.outerHTML !== y.outerHTML) { if (x.tagName === "IMG") { if (x.getAttribute("src") !== y.getAttribute("src")) x.replaceWith(y); } else morph(x, y); }
    });
  }
  function sync(box, items, how) {
    const old = new Map(); for (const c of [...box.children]) { if (c.dataset.k) old.set(c.dataset.k, c); else c.remove(); }
    const before = new Map(); if (how.flip) old.forEach((c, k) => before.set(k, c.getBoundingClientRect()));
    const act = document.activeElement;
    const next = items.map(([k, html]) => {
      const o = old.get(k);
      if (o && o._h === html) { old.delete(k); return o; }
      tpl.innerHTML = html.trim(); const n = tpl.content.firstElementChild; n.dataset.k = k;
      if (o) { morph(o, n); o._h = html; old.delete(k); return o; }
      n._h = html; return n;
    });
    old.forEach(c => c.remove());
    next.forEach((n, i) => { if (box.children[i] !== n) box.insertBefore(n, box.children[i] || null); });
    if (act && act !== document.activeElement && act.isConnected) act.focus({ preventScroll: true });
    let fresh = 0;
    next.forEach(n => {
      const a = before.get(n.dataset.k);
      if (a) {
        n.getAnimations().forEach(x => x.id === "flip" && x.cancel());
        const b = n.getBoundingClientRect(), dx = Math.round(a.left - b.left), dy = Math.round(a.top - b.top);
        if (dx || dy) n.animate([{ transform: `translate(${dx}px, ${dy}px)`, offset: 0 }], { id: "flip", duration: 560, easing: EASE });
      } else if (how.enter) n.animate([{ opacity: 0, transform: "translateY(12px) scale(.985)", offset: 0 }], { duration: 460, delay: how.stagger ? 40 + Math.min(fresh++, 16) * 30 : 0, easing: EASE, fill: "backwards" });
    });
  }
  function paint(how) {
    const d = H.data; if (!d) return;
    const vis = document.body.classList.contains("hub-on") && !mo();
    how = Object.assign({ flip: true, enter: true }, how); how.flip = how.flip && vis; how.enter = how.enter && vis;
    if (vis && !entered) { entered = true; how.stagger = true; how.flip = false; }
    d.stacks = d.stacks || [];
    if (H.stack && !stackOf(H.stack)) H.stack = null;   // it was deleted
    const K = H.stack && stackOf(H.stack);
    const q = H.q.toLowerCase();
    // the top level shows stacks plus the projects outside them; a search there looks inside stacks too
    let ps = d.projects.filter(p => K ? p.stack === K.id : (q || !p.stack)).filter(p => !q || (p.name + " " + p.path).toLowerCase().includes(q));
    const key = p => H.sort === "name" ? p.name.toLowerCase() : (H.sort === "changed" ? p.changed : [p.opened, p.changed].filter(Boolean).sort().pop()) || "";
    ps.sort((a, b) => b.current - a.current || (H.sort === "name" ? key(a).localeCompare(key(b)) : String(key(b)).localeCompare(String(key(a)))));
    setH(hub.querySelector("[data-back]"), K ? `<button type="button" class="hb-backto" data-a="unstack">${I.back}All projects</button>` : "");
    setH(hub.querySelector("[data-ttl]"), K ? `<span class="tag">${I.stack}</span><h2 title="${esc(K.name)}">${esc(K.name)}</h2><button type="button" class="hb-more" data-a="smore" data-s="${esc(K.id)}" aria-label="More for this stack" aria-expanded="false">${I.dots}</button>` : `<h2>Projects</h2>`);
    hub.querySelector("[data-sub]").textContent = K ? (K.ids.length ? `${plural(K.ids.length, "project")} in this stack` : "Nothing in this stack yet")
      : d.projects.length ? `${plural(d.projects.length, "project")} on this computer` + (d.stacks.length ? ` · ${plural(d.stacks.length, "stack")}` : "") : "No projects yet";
    const ks = K ? [] : d.stacks.filter(k => !q || k.name.toLowerCase().includes(q));
    const fan = k => {
      const ids = k.ids.map(proj).filter(p => p && p.exists).slice(0, 3);
      if (!ids.length) return `<span class="hb-fan"><i class="none">${I.stack}</i></span>`;
      const pics = ids.map(p => `<i><img alt="" loading="lazy" src="${thumb(p)}" onerror="this.remove()"></i>`);
      while (pics.length < 3) pics.unshift(`<i></i>`);   // the front tile is always a real picture
      return `<span class="hb-fan">${pics.join("")}</span>`;
    };
    const ssec = hub.querySelector("[data-ssec]"), sgrid = hub.querySelector("[data-sgrid]");
    ssec.hidden = sgrid.hidden = !ks.length; ssec.querySelector("span").textContent = ks.length;
    sync(sgrid, ks.map(k => ["s:" + k.id,
      `<div class="hb-stack" data-s="${esc(k.id)}" role="button" tabindex="0" aria-label="Open the stack ${esc(k.name)}">${fan(k)}
        <span class="tx"><b title="${esc(k.name)}">${esc(k.name)}</b><small>${k.ids.length ? plural(k.ids.length, "project") : "Empty: drag projects onto it"}</small><em>Open stack${I.back}</em></span>
        <button type="button" class="hb-more" data-a="smore" data-s="${esc(k.id)}" aria-label="More for ${esc(k.name)}" aria-expanded="false">${I.dots}</button></div>`]), how);
    setH(hub.querySelector("[data-psec]"), ks.length && !K ? `<div class="hb-sec">Projects<span>${ps.length}</span></div>` : "");
    const card = p => {
      const meta = [];
      if (p.open) meta.push(`<span class="open">${p.open} open note${p.open === 1 ? "" : "s"}</span>`);
      if (p.versions) meta.push(`<span>${p.versions} version${p.versions === 1 ? "" : "s"}</span>`);
      else if (p.videos != null) meta.push(`<span>${p.videos ? `${p.videos} video${p.videos === 1 ? "" : "s"}` : "No footage yet"}</span>`);
      if (p.changed) meta.push(`<span>Edited ${ago(p.changed)}</span>`);
      if (!K && p.stack && stackOf(p.stack)) meta.unshift(`<span class="hb-chip" title="In the stack ${esc(stackOf(p.stack).name)}">${esc(stackOf(p.stack).name)}</span>`);
      return `<div class="hb-card${p.current ? " cur" : ""}${p.exists ? "" : " missing"}" data-id="${p.id}" role="button" tabindex="0" draggable="true" aria-label="Open ${esc(p.name)}">
        <div class="hb-pic"><span class="ph">${initial(p)}</span>${p.exists ? `<img alt="" loading="lazy" src="${thumb(p)}" onerror="this.remove()">` : ""}
          ${p.current ? `<span class="hb-badge cur">Open now</span>` : p.exists ? "" : `<span class="hb-badge miss">Folder missing</span>`}
          <button type="button" class="hb-more" data-a="more" aria-label="More for ${esc(p.name)}" aria-expanded="false">${I.dots}</button>
          <a class="hb-cos${p.content ? " linked" : ""}" data-a="cos" href="${esc(p.content || H.data.contentHome)}" target="_blank" rel="noopener" title="${p.content ? "Open it in Content OS" : "Open Content OS (not linked yet: ⋯ › Link to Content OS)"}" aria-label="${p.content ? "Open in Content OS" : "Open Content OS"}">${I.cos}</a>
          ${p.exists ? `<span class="hb-open">${p.current ? "Back to it" : "Open"}</span>` : ""}</div>
        <div class="hb-body"><div class="hb-name" data-name title="${esc(p.name)}">${esc(p.name)}</div><div class="hb-meta">${meta.join("<span>·</span>")}</div><div class="hb-path" title="${esc(p.path)}">${esc(where(p.path))}</div></div></div>`;
    };
    const items = ps.map(p => [p.id, card(p)]);
    if (!q) items.unshift(K ? ["addto", `<button type="button" class="hb-new" data-a="addto"><i>${I.plus}</i>Add projects</button>`] : ["new", `<button type="button" class="hb-new" data-a="new"><i>${I.plus}</i>New project</button>`]);
    if (q && !ps.length && !ks.length) items.push(["empty", `<div class="hb-empty" style="grid-column:1/-1">No projects match "${esc(H.q)}"</div>`]);
    sync(grid, items, how);
  }
  hub.querySelector("[data-q]").addEventListener("input", e => { H.q = e.target.value.trim(); paint(); });
  sortEl.addEventListener("click", e => {
    const b = e.target.closest("[data-sort]"); if (!b || b.dataset.sort === H.sort) return;
    H.sort = b.dataset.sort; try { localStorage.setItem("cutnote:hubsort", H.sort); } catch {}
    setSort(); pill(); paint();
  });
  hub.addEventListener("click", e => {
    const a = e.target.closest("[data-a]"), c = e.target.closest(".hb-card");
    if (a && a.dataset.a === "back") return H.show(false);
    if (a && a.dataset.a === "new") return newProject();
    if (a && a.dataset.a === "roots") return roots();
    if (a && a.dataset.a === "newstack") return newStack();
    if (a && a.dataset.a === "unstack") return go(null);
    if (a && a.dataset.a === "addto") return addTo(stackOf(H.stack));
    if (a && a.dataset.a === "smore") { e.stopPropagation(); return stackMenu(a, stackOf(a.dataset.s)); }
    const sc = e.target.closest(".hb-stack"); if (sc) return go(sc.dataset.s);
    if (a && a.dataset.a === "tour") { e.preventDefault(); return H.tour(false); }
    if (a && a.dataset.a === "more" && c) { e.stopPropagation(); return menu(a, proj(c.dataset.id)); }
    if (a && a.dataset.a === "cos") { e.stopPropagation(); return; }   // the link opens Content OS in a new tab
    if (c && !e.target.closest("[contenteditable=true]")) open(proj(c.dataset.id));
  });
  hub.addEventListener("keydown", e => {
    const c = e.target.closest && e.target.closest(".hb-card, .hb-stack"); if (!c || e.target !== c || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault(); c.classList.contains("hb-stack") ? go(c.dataset.s) : open(proj(c.dataset.id));
  });
  // into a stack and back out: the old view (a still copy) fades and slides away while the new one is already
  // painted underneath and slides in from the other side, so there is never an empty frame between them
  function go(sid) {
    if ((sid || null) === H.stack) return;
    const dir = sid ? -1 : 1, main = hub.querySelector(".hb-main");
    hub.querySelectorAll(".hb-ghost").forEach(g => g.remove());
    if (!mo()) {
      const mr = main.getBoundingClientRect(), vr = view.getBoundingClientRect();
      const wrap = document.createElement("div"), g = view.cloneNode(true);
      wrap.className = "hb-ghost"; wrap.inert = true; wrap.setAttribute("aria-hidden", "true");
      Object.assign(wrap.style, { left: mr.left + "px", top: mr.top + "px", width: mr.width + "px", height: mr.height + "px" });
      g.removeAttribute("data-view"); g.querySelectorAll("*").forEach(x => { for (const at of [...x.attributes]) if (at.name.startsWith("data-") || at.name === "id" || at.name === "tabindex") x.removeAttribute(at.name); });
      Object.assign(g.style, { position: "absolute", left: vr.left - mr.left + "px", top: vr.top - mr.top + "px", width: vr.width + "px", margin: "0" });
      wrap.appendChild(g); hub.appendChild(wrap);
      g.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: `translateX(${dir * 28}px)` }], { duration: 170, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" }).finished.then(() => wrap.remove(), () => wrap.remove());
    }
    H.stack = sid || null; H.q = ""; hub.querySelector("[data-q]").value = ""; paint({ flip: false, enter: false });
    main.scrollTop = 0;
    if (!mo()) view.animate([{ opacity: 0, transform: `translateX(${-dir * 28}px)` }, { opacity: 1, transform: "none" }], { duration: 420, delay: 100, easing: EASE, fill: "backwards" });
    const f = hub.querySelector(sid ? ".hb-backto" : `.hb-stack[data-s="${CSS.escape(H.leftFrom || "")}"]`); if (f) f.focus({ preventScroll: !!sid });
    H.leftFrom = sid;
  }
  H.openStack = go;
  // drag a project card onto a stack to put it in
  let dragId = null;
  hub.addEventListener("dragstart", e => { const c = e.target.closest && e.target.closest(".hb-card"); if (!c) return; if (c.querySelector("[contenteditable=true]")) { e.preventDefault(); return; } dragId = c.dataset.id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/x-cutnote-project", dragId); c.classList.add("dragging"); });
  hub.addEventListener("dragend", () => { dragId = null; hub.querySelectorAll(".dragging, .drop").forEach(x => x.classList.remove("dragging", "drop")); });
  hub.addEventListener("dragover", e => { const s = dragId && e.target.closest(".hb-stack"); hub.querySelectorAll(".hb-stack.drop").forEach(x => x !== s && x.classList.remove("drop")); if (!s) return; e.preventDefault(); e.dataTransfer.dropEffect = "move"; s.classList.add("drop"); });
  hub.addEventListener("drop", e => { const s = dragId && e.target.closest(".hb-stack"); if (!s) return; e.preventDefault(); moveTo(proj(dragId), stackOf(s.dataset.s)); });
  async function moveTo(p, k) {
    if (!p) return;
    try { await api({ action: "stack", id: p.id, stack: k ? k.id : "" }); say(k ? `"${p.name}" is in ${k.name} now` : `"${p.name}" is back in All projects`); await load(true); } catch (e) { say(e.message); }
  }
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
      <button data-m="cos">${I.link}${p.content ? "Change Content OS link…" : "Link to Content OS…"}</button>
      <button data-m="stack">${I.stack}${p.stack ? "Move to another stack…" : "Add to a stack…"}</button>${p.stack ? `<button data-m="unstack">${I.back}Take out of the stack</button>` : ""}<hr>
      <button data-m="remove">${I.minus}Remove from Hub</button>${p.exists && !p.current ? `<button data-m="trash" class="danger">${I.trash}Move to Trash…</button>` : ""}`;
    document.body.appendChild(menuEl); btn.setAttribute("aria-expanded", "true");
    const r = btn.getBoundingClientRect(), w = menuEl.offsetWidth, h = menuEl.offsetHeight;
    menuEl.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
    const up = r.bottom + 6 + h > innerHeight - 8;
    menuEl.style.top = Math.max(8, Math.min(innerHeight - h - 8, up ? r.top - h - 6 : r.bottom + 6)) + "px"; menuEl.classList.toggle("up", up);
    requestAnimationFrame(() => requestAnimationFrame(() => menuEl && menuEl.classList.add("on")));
    menuEl.addEventListener("click", async e => {
      const m = e.target.closest("[data-m]"); if (!m) return; closeMenu();
      if (m.dataset.m === "open") open(p);
      else if (m.dataset.m === "rename") rename(p);
      else if (m.dataset.m === "reveal") api({ action: "reveal", id: p.id }).catch(err => say(err.message));
      else if (m.dataset.m === "remove") { try { await api({ action: "remove", id: p.id }); say(`Removed "${p.name}" from the Hub. Its folder is untouched.`); load(); } catch (err) { say(err.message); } }
      else if (m.dataset.m === "trash") trash(p);
      else if (m.dataset.m === "cos") linkContent(p);
      else if (m.dataset.m === "stack") pickStack(p);
      else if (m.dataset.m === "unstack") moveTo(p, null);
    });
  }
  function popMenu(btn, html, onPick) {
    closeMenu();
    menuEl = document.createElement("div"); menuEl.className = "hb-menu"; menuEl.setAttribute("role", "menu"); menuEl.innerHTML = html;
    document.body.appendChild(menuEl); btn.setAttribute("aria-expanded", "true");
    const r = btn.getBoundingClientRect(), w = menuEl.offsetWidth, h = menuEl.offsetHeight;
    menuEl.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
    const up = r.bottom + 6 + h > innerHeight - 8;
    menuEl.style.top = Math.max(8, Math.min(innerHeight - h - 8, up ? r.top - h - 6 : r.bottom + 6)) + "px"; menuEl.classList.toggle("up", up);
    requestAnimationFrame(() => requestAnimationFrame(() => menuEl && menuEl.classList.add("on")));
    menuEl.addEventListener("click", e => { const m = e.target.closest("[data-m]"); if (!m) return; closeMenu(); onPick(m.dataset.m); });
  }
  function stackMenu(btn, k) {
    if (!k) return;
    popMenu(btn, `${H.stack === k.id ? "" : `<button data-m="open">${I.open}Open</button>`}<button data-m="add">${I.plus}Add projects…</button><button data-m="rename">${I.pen}Rename</button><hr>
      <button data-m="del" class="danger">${I.trash}Delete stack…</button>`, m => {
      if (m === "open") go(k.id);
      else if (m === "add") addTo(k);
      else if (m === "rename") renameStack(k);
      else if (m === "del") delStack(k);
    });
  }
  const byName = () => H.data.projects.slice().sort((a, b) => a.name.localeCompare(b.name));
  const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  // arrow keys walk a list of rows; Space and Enter act on the focused one
  function rover(list, { space, enter, top }) {
    const rows = () => [...list.querySelectorAll(".ns-row:not([hidden])")];
    const to = r => { list.querySelectorAll(".ns-row").forEach(x => { x.tabIndex = -1; }); r.tabIndex = 0; r.focus({ preventScroll: true }); r.scrollIntoView({ block: "nearest" }); };
    const reset = () => { const rs = rows(); list.querySelectorAll(".ns-row").forEach(x => { x.tabIndex = -1; }); if (rs[0]) rs[0].tabIndex = 0; return rs[0]; };
    list.addEventListener("keydown", e => {
      const r = e.target.closest && e.target.closest(".ns-row"); if (!r) return;
      const rs = rows(), i = rs.indexOf(r), k = e.key;
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Home" || k === "End") {
        const j = k === "Home" ? 0 : k === "End" ? rs.length - 1 : i + (k === "ArrowDown" ? 1 : -1);
        if (j < 0 && top) top.focus(); else if (rs[j]) to(rs[j]);
      } else if (k === " " && space) space(r);
      else if (k === "Enter") enter(r);
      else return;
      e.preventDefault(); e.stopPropagation();
    });
    list.addEventListener("focusin", e => { const r = e.target.closest(".ns-row"); if (r) { list.querySelectorAll(".ns-row").forEach(x => { x.tabIndex = x === r ? 0 : -1; }); } });
    reset();
    return { to, rows, reset };
  }
  // New stack and Add to a stack: one sheet. A live stack card on top (its fan follows the ticks), a searchable list below
  function stackSheet(k, first) {
    const isNew = !k, all = byName();
    const sel = new Set(isNew ? (first ? [first.id] : []) : all.filter(p => p.stack === k.id).map(p => p.id));
    const row = p => {
      const ks = p.stack && stackOf(p.stack), other = ks && (!k || ks.id !== k.id);
      return `<div class="ns-row${p.exists ? "" : " miss"}" role="option" tabindex="-1" data-id="${p.id}" aria-selected="${sel.has(p.id)}">
        <span class="ns-ck">${TICK}</span><span class="ns-th">${p.exists ? `<img alt="" loading="lazy" src="${thumb(p)}" onerror="this.remove()">` : ""}<em>${initial(p)}</em></span>
        <span class="ns-tx"><b title="${esc(p.name)}">${esc(p.name)}</b><small title="${esc(p.path)}">${p.exists ? esc(where(p.path)) : "Folder missing"}${p.current ? " · open now" : ""}</small></span>
        ${other ? `<span class="ns-chip" title="In the stack ${esc(ks.name)}. Ticking it moves it here.">${I.stack}<span>${esc(ks.name)}</span></span>` : ""}</div>`;
    };
    const d = modal(`<div class="hb-hd"><i>${I.stack}</i><div><h3>${isNew ? "New stack" : `Add to ${esc(k.name)}`}</h3><p>${isNew ? "Group projects for a series or a client. Their folders stay exactly where they are." : "Tick what belongs here. A project sits in one stack at a time."}</p></div></div>
      <div class="ns-card"><span class="hb-fan ns-fan" data-fan aria-hidden="true"><i></i><i></i><i></i></span>
        <div class="ns-id">${isNew ? `<span class="ns-lbl">Stack name</span><input type="text" class="ns-in" data-n placeholder="e.g. 30 Day AI Series" maxlength="80" autocomplete="off" spellcheck="false" aria-label="Stack name">`
          : `<span class="ns-lbl">Stack</span><b class="ns-nm" title="${esc(k.name)}">${esc(k.name)}</b>`}<small class="ns-cnt" data-c aria-live="polite"></small></div></div>
      <div class="hb-err ns-err" data-e role="alert"></div>
      <div class="ns-bar"><span class="ns-h">Projects</span><label class="ns-q">${I.search}<input type="search" data-q placeholder="Search ${plural(all.length, "project")}" aria-label="Search projects" autocomplete="off" spellcheck="false"></label>
        <button type="button" class="ns-l" data-all>Select all</button><button type="button" class="ns-l" data-none>Clear</button></div>
      <div class="ns-list" role="listbox" aria-multiselectable="true" aria-label="Projects">${all.map(row).join("")}<div class="ns-none" data-none-msg ${all.length ? "hidden" : ""}>${all.length ? "No projects match" : "No projects yet"}</div></div>
      <div class="hb-acts ns-acts"><span class="ns-tip"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>Space</kbd> tick <kbd>↵</kbd> ${isNew ? "create" : "save"}</span><button type="button" class="hb-btn ghost" data-x>Cancel</button><button type="button" class="hb-btn primary" data-go></button></div>`, "ns");
    const $d = s => d.el.querySelector(s), nameIn = $d("[data-n]"), q = $d("[data-q]"), list = $d(".ns-list"), goBtn = $d("[data-go]"), card = $d(".ns-card");
    const fanEl = $d("[data-fan]"), slots = [...fanEl.children];
    let spreadT = 0;
    const update = (moved) => {
      const n = sel.size, mv = all.filter(p => sel.has(p.id) && p.stack && stackOf(p.stack) && (!k || p.stack !== k.id)).length;
      $d("[data-c]").innerHTML = n ? `<b>${plural(n, "project")}</b>${mv ? ` · ${mv} ${mv === 1 ? "moves" : "move"} from another stack` : ""}` : (isNew ? "Empty for now: you can drag projects onto it later" : "Nothing in it");
      goBtn.textContent = isNew ? (n ? `Create stack · ${plural(n, "project")}` : "Create stack") : `Save · ${plural(n, "project")}`;
      // the fan: front = first ticked, then right, then left
      const ps = all.filter(p => sel.has(p.id) && p.exists).slice(0, 3), want = [ps[2], ps[1], ps[0]];
      slots.forEach((sl, i) => {
        const p = want[i], src = p ? thumb(p) : "";
        if (sl.dataset.src === src && sl.childNodes.length === (p || i === 2 ? 1 : 0)) return;
        sl.dataset.src = src; sl.classList.toggle("e", !p);
        sl.innerHTML = p ? `<img alt="" src="${src}" onerror="this.remove()">` : (i === 2 ? I.stack : "");
        if (moved && !mo()) sl.animate([{ scale: ".86", opacity: .35, offset: 0 }], { duration: 420, easing: "cubic-bezier(.34,1.45,.5,1)" });
      });
      if (moved && !mo()) { card.classList.add("spread"); clearTimeout(spreadT); spreadT = setTimeout(() => card.classList.remove("spread"), 420); }
    };
    const R = rover(list, { top: q, space: r => toggle(r), enter: () => save() });
    const toggle = r => { const id = r.dataset.id; sel.has(id) ? sel.delete(id) : sel.add(id); r.setAttribute("aria-selected", String(sel.has(id))); update(true); };
    list.addEventListener("click", e => { const r = e.target.closest(".ns-row"); if (!r) return; toggle(r); R.to(r); });
    q.addEventListener("input", () => {
      const t = q.value.trim().toLowerCase(); let any = false;
      list.querySelectorAll(".ns-row").forEach(r => { const p = proj(r.dataset.id), hit = !t || (p.name + " " + p.path).toLowerCase().includes(t); r.hidden = !hit; any = any || hit; });
      $d("[data-none-msg]").hidden = any && all.length > 0; R.reset();
    });
    const pickAll = on => { R.rows().forEach(r => { on ? sel.add(r.dataset.id) : sel.delete(r.dataset.id); r.setAttribute("aria-selected", String(on)); }); update(true); };
    $d("[data-all]").onclick = () => pickAll(true); $d("[data-none]").onclick = () => pickAll(false);
    // Enter saves from anywhere but a button; ↓ walks from the name to the search to the list; nothing leaks to the editor's shortcuts
    d.el.addEventListener("keydown", e => {
      if (e.key === "Escape" || e.key === "Tab") return;
      if (e.key === "Enter" && !(e.target.closest && e.target.closest("button"))) { e.preventDefault(); save(); }
      else if (e.key === "ArrowDown" && e.target === nameIn) { e.preventDefault(); q.focus(); }
      else if (e.key === "ArrowDown" && e.target === q) { e.preventDefault(); const f = R.rows()[0]; if (f) R.to(f); }
      else if (e.key === "ArrowUp" && e.target === q && nameIn) { e.preventDefault(); nameIn.focus(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a" && e.target.closest && e.target.closest(".ns-list")) { e.preventDefault(); pickAll(true); }
      e.stopPropagation();
    });
    $d("[data-x]").onclick = d.close;
    let busy = false;
    const save = async () => {
      if (busy) return;
      const err = $d("[data-e]");
      if (isNew) {
        const name = nameIn.value.replace(/\s+/g, " ").trim();
        if (!name) { err.textContent = "Give it a name"; nameIn.focus(); if (!mo()) card.animate([{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "none" }], { duration: 260, easing: "ease-out" }); return; }
        busy = true; goBtn.disabled = true; goBtn.textContent = "Creating…"; err.textContent = "";
        try { const r = await api({ action: "stackCreate", name, ids: [...sel] }); d.close(); say(`Made the stack "${name}"`); await load(); if (!first) go(r.id); }
        catch (e) { busy = false; goBtn.disabled = false; update(); err.textContent = e.message; }
        return;
      }
      busy = true; goBtn.disabled = true; goBtn.textContent = "Saving…";
      try {
        for (const p of H.data.projects) {
          if (sel.has(p.id) && p.stack !== k.id) await api({ action: "stack", id: p.id, stack: k.id });
          else if (!sel.has(p.id) && p.stack === k.id) await api({ action: "stack", id: p.id, stack: "" });
        }
        d.close(); await load();
      } catch (e) { busy = false; goBtn.disabled = false; update(); say(e.message); load(); }
    };
    goBtn.onclick = save;
    update(false);
    setTimeout(() => (nameIn || q).focus(), 30);
  }
  const newStack = first => stackSheet(null, first);
  const addTo = k => { if (k) stackSheet(k); };
  // one project into a stack: every stack as a row with its top picture, the one it's in marked
  function pickStack(p) {
    const ks = H.data.stacks || [];
    const face = k => { const f = k.ids.map(proj).find(x => x && x.exists); return f ? `<span class="ns-th stk"><img alt="" loading="lazy" src="${thumb(f)}" onerror="this.remove()"><em>${I.stack}</em></span>` : `<span class="ns-th lime">${I.stack}</span>`; };
    const d = modal(`<div class="hb-hd"><i>${I.stack}</i><div><h3>${p.stack ? "Move to another stack" : "Add to a stack"}</h3><p>“${esc(p.name)}”. Only the Hub changes: the folder stays where it is.</p></div></div>
      <div class="ns-list ns-one" role="listbox" aria-label="Stacks">${ks.map(k => `<div class="ns-row" role="option" tabindex="-1" data-k="${esc(k.id)}" aria-selected="${p.stack === k.id}">${face(k)}
          <span class="ns-tx"><b title="${esc(k.name)}">${esc(k.name)}</b><small>${k.ids.length ? plural(k.ids.length, "project") : "Empty"}</small></span>${p.stack === k.id ? `<span class="ns-chip on"><span>Here now</span></span>` : `<span class="ns-go-ic">${I.back}</span>`}</div>`).join("")}
        <div class="ns-row" role="option" tabindex="-1" data-k="" aria-selected="false"><span class="ns-th add">${I.plus}</span><span class="ns-tx"><b>New stack…</b><small>Name it and put this project in it</small></span><span class="ns-go-ic">${I.back}</span></div></div>
      <div class="hb-acts"><button type="button" class="hb-btn ghost" data-x>Cancel</button></div>`, "ns one");
    const list = d.el.querySelector(".ns-list");
    const pick = b => { d.close(); b.dataset.k ? moveTo(p, stackOf(b.dataset.k)) : newStack(p); };
    const R = rover(list, { enter: pick, space: pick });
    list.addEventListener("click", e => { const b = e.target.closest(".ns-row"); if (b) pick(b); });
    d.el.querySelector("[data-x]").onclick = d.close;
    setTimeout(() => { const f = list.querySelector('.ns-row[aria-selected="true"]') || R.rows()[0]; if (f) R.to(f); }, 30);
  }
  function renameStack(k) {
    const d = modal(`<h3>Rename stack</h3><p>Only the Hub changes: no folders are renamed.</p>
      <label class="f">Name<input type="text" data-n value="${esc(k.name)}" maxlength="80" autocomplete="off"></label><div class="hb-err" data-e></div>
      <div class="hb-acts"><button type="button" class="hb-btn ghost" data-x>Cancel</button><button type="button" class="hb-btn primary" data-go>Save</button></div>`);
    const inp = d.el.querySelector("[data-n]"); setTimeout(() => { inp.focus(); inp.select(); }, 30);
    const save = async () => { const name = inp.value.replace(/\s+/g, " ").trim(); if (!name || name === k.name) return d.close();
      try { await api({ action: "stackRename", stack: k.id, name }); d.close(); load(); } catch (e) { d.el.querySelector("[data-e]").textContent = e.message; } };
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === "Enter") save(); };
    d.el.querySelector("[data-x]").onclick = d.close; d.el.querySelector("[data-go]").onclick = save;
  }
  function delStack(k) {
    const d = modal(`<h3>Delete the stack "${esc(k.name)}"?</h3><p>${k.ids.length ? `Its ${plural(k.ids.length, "project")} go back to All projects.` : "It's empty."} No projects or folders are deleted.</p>
      <div class="hb-acts"><button type="button" class="hb-btn ghost" data-x>Cancel</button><button type="button" class="hb-btn danger" data-go>${I.trash}Delete stack</button></div>`);
    d.el.querySelector("[data-x]").onclick = d.close;
    d.el.querySelector("[data-go]").onclick = async () => { try { await api({ action: "stackDelete", stack: k.id }); d.close(); say(`Deleted the stack. Its projects are in All projects.`); await load(true); if (H.stack === k.id) go(null); } catch (e) { say(e.message); } };
  }
  document.addEventListener("pointerdown", e => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest(".hb-more")) closeMenu(); });
  function rename(p) {
    const el = grid.querySelector(`.hb-card[data-id="${p.id}"] [data-name]`); if (!el) return;
    el.contentEditable = "true"; el.focus(); const cardEl = el.closest(".hb-card"); if (cardEl) cardEl.draggable = false;
    const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    let done = false;
    const finish = async save => {
      if (done) return; done = true; el.contentEditable = "false"; const cardEl = el.closest(".hb-card"); if (cardEl) cardEl.draggable = true;
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
  function modal(html, cls) {
    const m = document.createElement("div"); m.className = "hb-modal"; m.innerHTML = `<div class="hb-dlg${cls ? " " + cls : ""}" role="dialog" aria-modal="true"><button type="button" class="hb-x" aria-label="Close">✕</button>${html}</div>`;
    const back = document.activeElement;
    document.body.appendChild(m);
    let closed = false;
    const ret = { el: m.firstElementChild, close: () => close() };
    const close = () => {
      if (closed) return; closed = true; document.removeEventListener("keydown", key, true); if (ret.onclose) ret.onclose();
      m.classList.add("out"); setTimeout(() => m.remove(), mo() ? 0 : 190);
      if (back && back.isConnected && back.focus && !back.closest(".hb-modal")) back.focus({ preventScroll: true });
    };
    const key = e => { if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); } };
    document.addEventListener("keydown", key, true);
    m.addEventListener("pointerdown", e => { if (e.target === m) close(); });
    m.querySelector(".hb-x").onclick = () => close();
    return ret;
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
    d.onclose = () => { probOpen = false; };   // however it closes: ✕, Esc, outside or a button
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
  #hbTour { position: fixed; inset: 0; z-index: 360; pointer-events: none; opacity: 0; transition: opacity .32s ease; }
  #hbTour.on { opacity: 1; }
  /* one even ring: 2px lime, a soft glow outside it, then the dim. Whole-pixel rects, kept inside the window */
  #hbTour .hole { position: fixed; left: 50%; top: 50%; width: 0; height: 0; border-radius: 14px;
    box-shadow: 0 0 0 2px var(--accent), 0 0 20px 3px rgba(198,244,50,.32), 0 0 0 9999px rgba(8,10,16,.58);
    transition: left .5s cubic-bezier(.22,1,.36,1), top .5s cubic-bezier(.22,1,.36,1), width .5s cubic-bezier(.22,1,.36,1), height .5s cubic-bezier(.22,1,.36,1), border-radius .5s cubic-bezier(.22,1,.36,1), box-shadow .35s ease; }
  #hbTour .hole.none { box-shadow: 0 0 0 2px rgba(198,244,50,0), 0 0 20px 3px rgba(198,244,50,0), 0 0 0 9999px rgba(8,10,16,.58); }
  #hbTour .still { transition: none !important; }
  #hbTour .tip { position: fixed; left: 0; top: 0; width: min(370px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow: auto; overscroll-behavior: contain; padding: 18px 18px 14px; border-radius: 18px;
    background: var(--panel); color: var(--ink); pointer-events: auto; box-shadow: 0 30px 80px rgba(0,0,0,.35), 0 0 0 1px var(--line);
    transition: opacity .28s ease, transform .42s cubic-bezier(.22,1,.36,1); }
  #hbTour .tip.out { opacity: 0; transform: translateY(6px) scale(.985); transition: opacity .14s ease, transform .2s ease; }
  #hbTour .tip .ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--ink); color: var(--accent); margin-bottom: 12px; --mk-bg: var(--ink); }
  #hbTour .tip .ic svg { width: 24px; height: 24px; overflow: visible; }
  #hbTour .tip .ic.lime { background: var(--accent); color: var(--accent-ink); --mk-bg: var(--accent); }
  #hbTour .tip small { display: block; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: var(--accent-text, var(--dim)); margin-bottom: 4px; }
  #hbTour .tip h4 { margin: 0 0 6px; font-size: 17px; letter-spacing: -.01em; overflow-wrap: anywhere; }
  #hbTour .tip p { margin: 0; color: var(--dim); font-size: 13px; line-height: 1.5; }
  #hbTour .tip p kbd { font-size: 11px; }
  #hbTour .row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 8px; margin-top: 16px; }
  #hbTour .dots { display: flex; gap: 5px; margin-right: auto; padding: 4px 0; }
  #hbTour .dots i { width: 6px; height: 6px; border-radius: 3px; background: var(--line-2); transition: width .35s cubic-bezier(.22,1,.36,1), background .3s; }
  #hbTour .dots i.on { width: 18px; background: var(--accent); }
  #hbTour .btns { display: flex; gap: 8px; margin-left: auto; }
  #hbTour .row button { flex: none; white-space: nowrap; height: 34px; padding: 0 14px; border-radius: 9px; border: 0; font: 700 12.5px -apple-system, system-ui, sans-serif; cursor: pointer; }
  #hbTour .row button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  #hbTour .skip { background: none; color: var(--dim); } #hbTour .skip:hover { color: var(--ink); background: var(--hover); }
  #hbTour .next { background: var(--ink); color: var(--panel); }
  #hbTour .next.lime { background: var(--accent); color: var(--accent-ink); }
  @media (prefers-reduced-motion: reduce) { #hbTour, #hbTour .hole, #hbTour .tip, #hbTour .dots i { transition: none !important; } }
  #hub.touring .hb-card.cur .hb-more, #hub.touring .hb-card:nth-child(2) .hb-more { opacity: 1; }`;
  const tst = document.createElement("style"); tst.textContent = tcss; document.head.appendChild(tst);
  const firstCard = () => grid.querySelector(".hb-card.cur") || grid.querySelector(".hb-card");
  const STEPS = [
    { ic: LOGO_HUB, k: "Cutnote Hub", t: "All your projects in one place", p: "Every video project on this computer lives here. Take a 20-second look round, or skip and explore.", next: "Show me round", lime: true },
    { el: firstCard, r: 22, k: "Projects", t: "Open any project", p: "Each card shows a frame from the footage, its open notes and when you last edited it. Click one and the editor switches to it." },
    { el: () => { const c = firstCard(); return c && c.querySelector(".hb-more"); }, pad: 6, k: "More", t: "Rename, find or tidy up", p: "Rename it (only the name here changes, never the folder), show it in your file manager, take it off the list or move it to the Trash." },
    { el: () => hub.querySelector('.hb-top [data-a="new"]'), pad: 6, k: "New project", t: "Start a new video", p: "Name it and drop in your footage. Cutnote makes the folder, copies the footage in and opens it." },
    { el: () => hub.querySelector('[data-a="roots"]'), pad: 6, k: "Folders", t: "Projects find their own way here", p: "Point the Hub at the folders you keep videos in and new projects show up by themselves, including ones your AI assistant makes." },
    { el: () => hub.querySelector('[data-a="newstack"]'), pad: 6, k: "Stacks", t: "Group projects into stacks", p: "Make a stack for a series or a client and drag projects onto it. Click a stack to open it; <b>All projects</b> takes you back. Folders on disk never move." },
    { el: () => { const q = hub.querySelector(".hb-search"); return q && q.offsetWidth ? q : sortEl; }, pad: 6, k: "Search", t: "Find anything fast", p: "Search by name or folder, and sort by recent, last edited or name. <kbd>⌘F</kbd> jumps here." },
    { el: () => hub.querySelector("[data-hbrand] .brandBtn"), pad: 6, k: "Back to editing", t: "Getting back to the editor", p: "Hover <b>Cutnote Hub</b> at the top left and pick <b>Cutnote Editor</b>, or press <kbd>Esc</kbd>. It's the same menu in both places.", next: "Got it", lime: true },
  ];
  // the editor's walk-round: new people see this first, and it hands over to the Hub tour at the end
  const side = name => { if (window.SidePane) { if (!SidePane.isOpen()) SidePane.setOpen(true, true); if (name) SidePane.show(name); } };
  const EDITOR_STEPS = [
    { ic: LOGO_EDITOR, icLime: true, k: "Cutnote Editor", t: "Welcome to Cutnote", p: "Review a video, leave notes and cut it, then your AI assistant builds the changes. Here's a one-minute look round, or skip and explore.", next: "Show me round", lime: true },
    { el: () => $("#frame"), pad: 4, r: 16, k: "The video", t: "It plays live, right here", p: "Your edit plays as it really is. With the select tool, click anything on it to move it, resize it from a corner, or double-click to change its words." },
    { el: () => $("#tools"), pad: 6, k: "Drawing", t: "Point at things", p: "Scribble <kbd>P</kbd> or draw a box <kbd>R</kbd> on any frame, in any colour. Drawings are saved with your note." },
    { el: () => $("#transport"), fit: true, pad: 6, k: "Playback", t: "Play, step and loop", p: "<kbd>Space</kbd> plays, <kbd>←</kbd> <kbd>→</kbd> step a frame, <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> work too. Change the speed or loop the whole video." },
    { el: () => $("#tlbar"), fit: true, pad: 6, k: "Editing tools", t: "Cut like a real editor", p: "Select, Slip, Roll and Blade; split at the playhead, trim the start or end, change speed for slow motion, and set snapping or the magnetic timeline." },
    { el: () => [$("#tlgrip"), $("#tlwrap")], pad: 0, r: 10, k: "Timeline", t: "Everything on its own track", p: "Drag clips to move them, pull their edges to trim, drag up or down to layer. The eye hides a track and the speaker mutes it." },
    { el: () => $("#sideTabs"), pad: 4, before: () => side(), k: "Sidebar", t: "Notes, Library, Captions, Sounds", p: "Animated overlays, caption styles and 50 sound effects: drag any of them onto the video or the timeline." },
    { el: () => $("#compose"), pad: 6, before: () => side("notes"), k: "Notes", t: "Tell your AI what to change", p: "Press <kbd>N</kbd> at any moment, type what should change and press <kbd>Enter</kbd>. Your AI assistant reads the notes and makes the changes." },
    { el: () => $("#approve"), pad: 6, k: "Approve", t: "Sign off when it's right", p: "Approve the exact version you're happy with. Nothing gets rendered until you do." },
    { el: () => $("#brandBtn"), pad: 6, k: "Your projects", t: "Every project lives in the Hub", p: "Hover <b>Cutnote Editor</b> any time to switch to <b>Cutnote Hub</b>, your project manager. Want a quick look at it now?", next: "Show me the Hub", lime: true, last: "Finish" },
  ];
  let tourEl = null, tourK = 0, tourKind = "hub", tourSteps = STEPS, tourSwap = 0, tourBusy = false, tourR = null;
  function tourDone(skipped, keep) {
    if (!tourEl) return;
    hub.classList.remove("touring");
    try { localStorage.setItem(tourKind === "editor" ? "cutnote:edtour" : "cutnote:hubtour", "done"); } catch {}
    if (skipped) say(tourKind === "editor" ? "Tour skipped. Replay it from the Cutnote menu: Take the tour" : "Tour skipped. To get back to the editor: hover Cutnote Hub at the top left, or press Esc");
    tourSwap++;
    if (keep) {   // handing over to the Hub tour: the dim stays, the card fades and the spotlight lets go
      tourBusy = true; tourEl.querySelector(".tip").classList.add("out"); tourR = null; placeHole(false); return;
    }
    const el = tourEl; tourEl = null; tourBusy = false;
    el.classList.remove("on"); setTimeout(() => el.remove(), mo() ? 0 : 340);
  }
  // the spotlight's rect: the target (or its children's extent when its own box has uneven padding), padded,
  // rounded to whole pixels and kept inside the window so the ring is never cut off
  function tourRect(st) {
    const got = st.el && st.el(); if (!got) return null;
    const els = (Array.isArray(got) ? got : [got]).filter(Boolean); if (!els.length) return null;
    els[0].scrollIntoView({ block: "nearest", inline: "nearest" });
    let L = Infinity, T = Infinity, R = -Infinity, B = -Infinity;
    const add = r => { if (r.width < 1 || r.height < 1) return; L = Math.min(L, r.left); T = Math.min(T, r.top); R = Math.max(R, r.right); B = Math.max(B, r.bottom); };
    for (const el of els) {
      if (st.fit) { for (const c of el.children) if (getComputedStyle(c).position !== "fixed") add(c.getBoundingClientRect()); }
      else add(el.getBoundingClientRect());
    }
    if (!isFinite(L)) return null;
    // m keeps the 2px ring on screen; near an edge the padding shrinks on every side alike, so the ring stays even
    const m = 4, room = Math.min(L - m, T - m, innerWidth - m - R, innerHeight - m - B), pad = Math.max(Math.min(st.pad != null ? st.pad : 8, room), Math.min(2, st.pad != null ? st.pad : 8));
    L = Math.max(m, Math.round(L - pad)); T = Math.max(m, Math.round(T - pad)); R = Math.min(innerWidth - m, Math.round(R + pad)); B = Math.min(innerHeight - m, Math.round(B + pad));
    if (R - L < 12 || B - T < 12) return null;
    return { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T };
  }
  function placeHole(instant) {
    const hole = tourEl.querySelector(".hole"), r = tourR, st = tourSteps[tourK];
    if (instant) hole.classList.add("still");
    if (r) Object.assign(hole.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", borderRadius: (st && st.r != null ? st.r : 14) + "px" });
    else Object.assign(hole.style, { left: Math.round(innerWidth / 2) + "px", top: Math.round(innerHeight / 2) + "px", width: "0px", height: "0px", borderRadius: "14px" });
    hole.classList.toggle("none", !r);
    if (instant) { void hole.offsetWidth; hole.classList.remove("still"); }
  }
  // the card sits beside the spotlight, wherever it fits
  function placeTip() {
    const tip = tourEl.querySelector(".tip"), r = tourR, tw = tip.offsetWidth, th = tip.offsetHeight, m = 16;
    let x, y;
    if (!r) { x = (innerWidth - tw) / 2; y = (innerHeight - th) / 2; }
    else if (r.right + m + tw <= innerWidth - m) { x = r.right + m; y = r.top; }
    else if (r.left - m - tw >= m) { x = r.left - m - tw; y = r.top; }
    else { x = r.left + r.width / 2 - tw / 2; y = r.bottom + m; if (y + th > innerHeight - m) y = r.top - m - th; }
    tip.style.left = Math.round(Math.max(m, Math.min(innerWidth - tw - m, x))) + "px"; tip.style.top = Math.round(Math.max(m, Math.min(innerHeight - th - m, y))) + "px";
  }
  function tourPlace() { if (!tourEl || tourBusy) return; tourR = tourRect(tourSteps[tourK]); placeHole(true); placeTip(); }
  // a step: the spotlight glides from where it was while the card fades out, swaps its words and fades back in beside it
  function tourStep(first) {
    const STEPS = tourSteps, st = STEPS[tourK], tip = tourEl.querySelector(".tip"), n = ++tourSwap;
    if (st.before) st.before();
    if (tourKind === "editor" && tourK === STEPS.length - 1) warm();   // it offers the Hub next
    tourR = tourRect(st); placeHole(first);
    const fill = () => {
      if (n !== tourSwap || !tourEl) return;
      tip.innerHTML = `${st.ic ? `<div class="ic${st.icLime ? " lime" : ""}">${st.ic}</div>` : ""}<small>${st.k}</small><h4>${st.t}</h4><p>${st.p}</p>
        <div class="row"><div class="dots" aria-label="Step ${tourK + 1} of ${STEPS.length}">${STEPS.map((_, i) => `<i class="${i === tourK ? "on" : ""}"></i>`).join("")}</div><div class="btns">
        ${tourK < STEPS.length - 1 ? `<button type="button" class="skip" data-t="skip">Skip tour</button>` : st.last ? `<button type="button" class="skip" data-t="finish">${st.last}</button>` : `<button type="button" class="skip" data-t="prev">Back</button>`}
        <button type="button" class="next${st.lime ? " lime" : ""}" data-t="next">${st.next || "Next"}</button></div></div>`;
      placeTip();
      requestAnimationFrame(() => requestAnimationFrame(() => { if (n !== tourSwap || !tourEl) return; tip.classList.remove("out"); const b = tip.querySelector(".next"); if (b) b.focus({ preventScroll: true }); }));
      if (st.before) setTimeout(() => { if (n === tourSwap) tourPlace(); }, 380);   // the sidebar slides open: measure again once it has
    };
    if (first || mo() || tip.classList.contains("out")) { tip.classList.add("out"); fill(); }
    else { tip.classList.add("out"); setTimeout(fill, 150); }
  }
  function startTour(kind) {
    tourBusy = false;
    tourKind = kind; tourSteps = kind === "editor" ? EDITOR_STEPS : STEPS; tourK = 0;
    hub.classList.toggle("touring", kind === "hub");
    const fresh = !tourEl;
    if (fresh) {
      tourEl = document.createElement("div"); tourEl.id = "hbTour";
      tourEl.innerHTML = `<div class="hole none"></div><div class="tip out" role="dialog" aria-modal="true"></div>`;
      document.body.appendChild(tourEl);
      tourEl.addEventListener("click", e => {
        const b = e.target.closest("[data-t]"); if (!b || tourBusy) return;
        if (b.dataset.t === "skip") return tourDone(true);
        if (b.dataset.t === "finish") return tourDone(false);
        if (b.dataset.t === "prev") { tourK = Math.max(0, tourK - 1); return tourStep(false); }
        if (tourK >= tourSteps.length - 1) {
          if (tourKind === "editor") { tourDone(false, true); H.tour(true); }   // the editor tour ends by walking into the Hub
          else tourDone(false);
          return;
        }
        tourK++; tourStep(false);
      });
    }
    tourEl.querySelector(".tip").setAttribute("aria-label", (kind === "editor" ? "Cutnote Editor" : "Cutnote Hub") + " tour");
    tourStep(fresh);
    if (fresh) requestAnimationFrame(() => requestAnimationFrame(() => tourEl && tourEl.classList.add("on")));
  }
  H.tour = async (open) => {
    try { if (open && !document.body.classList.contains("hub-on")) H.show(true, true); await load(); }
    catch (e) { if (tourBusy) tourDone(false); throw e; }   // never leave the dim layer stuck
    // let the Hub finish opening before the spotlight comes in: one movement at a time
    const wait = mo() ? 0 : 320 - (performance.now() - (H.openedAt || 0));
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    if (!document.body.classList.contains("hub-on")) { if (tourBusy) tourDone(false); return; }
    startTour("hub");
  };
  H.editorTour = () => { if (document.body.classList.contains("hub-on")) H.show(false); if (typeof S !== "undefined" && S.playing && typeof pause === "function") pause(); startTour("editor"); };
  // someone new: the editor tour first (the Hub tour follows from its last step). It waits until What's new has been
  // closed, and never runs after an update: someone updating already knows Cutnote (Take the tour is in the menu).
  (async () => {
    for (let i = 0; i < 50 && !window.CutnoteIntro; i++) await new Promise(r => setTimeout(r, 100));
    let intro = { updated: false, firstRun: false };
    try { if (window.CutnoteIntro) intro = await window.CutnoteIntro; } catch {}
    if (intro.updated) { try { localStorage.setItem("cutnote:edtour", "done"); } catch {} return; }
    let fresh = false; try { fresh = intro.firstRun && localStorage.getItem("cutnote:edtour") !== "done"; } catch {}
    if (!fresh || location.hash === "#hub") return;
    const until = Date.now() + 20000;
    const go = () => {
      if (typeof S !== "undefined" && S.player && S.player.ready && !document.querySelector("#wnew")) setTimeout(() => !tourEl && H.editorTour(), 700);
      else if (Date.now() < until) setTimeout(go, 400);
    };
    go();
  })();
  addEventListener("resize", () => tourPlace());
  document.addEventListener("click", e => { const a = e.target.closest("[data-tour]"); if (!a) return; e.preventDefault(); document.querySelectorAll(".open").forEach(x => x.classList.remove("open")); H.editorTour(); });
  document.addEventListener("keydown", e => {
    if (!tourEl) return;
    if (tourBusy) { if (["Escape", "Enter", "ArrowRight", "ArrowLeft", " "].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); } return; }
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); tourDone(true); }
    else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); const b = tourEl.querySelector(".next"); if (b) b.click(); }
    else if (e.key === "ArrowLeft" && tourK > 0) { e.preventDefault(); e.stopImmediatePropagation(); tourK--; tourStep(false); }
  }, true);

  document.addEventListener("keydown", e => {
    if (!document.body.classList.contains("hub-on")) return;
    if (document.querySelector(".hb-modal:not(.out)")) return;   // a sheet is open: it has the keys
    if (e.key === "Escape" && menuEl) { e.preventDefault(); closeMenu(); return; }
    if (e.key === "Escape" && !menuEl && !(e.target.closest && e.target.closest("[contenteditable=true]"))) { e.preventDefault(); if (H.stack) go(null); else H.show(false); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") { e.preventDefault(); hub.querySelector("[data-q]").focus(); }
  }, true);
  addEventListener("hashchange", () => H.show(location.hash === "#hub"));
  if (location.hash === "#hub") H.show(true);
  // the title follows the project's Hub name once the page knows it
  let tries = 0; const naming = setInterval(() => { if (++tries > 300) clearInterval(naming); if (typeof S !== "undefined" && S.info) { clearInterval(naming); const n = S.info.name || S.info.video; title.textContent = n; document.title = n + " · Cutnote"; } }, 200);
})();
