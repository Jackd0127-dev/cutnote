/* Updates: a version chip in the header. It turns lime when a newer Cutnote is published, and its panel has
 * "Update now" (pulls the new version and restarts the player, then the page reloads at the same place) and an
 * "Update automatically" switch (saved in ~/.config/cutnote/settings.json, applied in the background from then on). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const css = `
  #updChip { height: 30px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); color: var(--dim);
    font-size: 11.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; transition: background .2s, color .2s, border-color .2s; }
  #updChip:hover { border-color: var(--line-2); color: var(--ink); }
  #updChip.new { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  #updChip.new i { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-ink); animation: updPulse 1.6s ease-in-out infinite; }
  @keyframes updPulse { 50% { opacity: .35; } }
  #updPop { position: fixed; z-index: 50; width: 320px; padding: 16px; border-radius: 14px; background: var(--panel); border: 1px solid var(--line);
    box-shadow: var(--shadow); opacity: 0; transform: translateY(-6px); pointer-events: none; transition: opacity .2s, transform .25s cubic-bezier(.22,1,.36,1); }
  #updPop.on { opacity: 1; transform: none; pointer-events: auto; }
  #updPop h3 { margin: 0 0 2px; font-size: 14px; }
  #updPop .sub { color: var(--dim); font-size: 12px; margin: 0 0 12px; }
  #updPop ul { margin: 0 0 14px; padding-left: 18px; font-size: 12.5px; line-height: 1.5; max-height: 180px; overflow: auto; }
  #updPop .why { font-size: 12px; color: var(--dim); background: var(--panel-2); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; margin: 0 0 12px; }
  #updPop .why code { font-size: 11px; }
  #updPop .go { width: 100%; height: 34px; border-radius: 9px; border: 0; background: var(--accent); color: var(--accent-ink); font-weight: 700; cursor: pointer; }
  #updPop .go:disabled { opacity: .45; cursor: default; }
  #updPop .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 12.5px; }
  #updPop .row small { display: block; color: var(--dim); font-size: 11.5px; }
  #updPop .foot { display: flex; justify-content: space-between; margin-top: 10px; font-size: 11.5px; }
  #updPop .foot a, #updPop .foot button { color: var(--dim); background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; font: inherit; }
  #updPop .go:not(:disabled):hover { filter: brightness(1.05); }
  #updPop .go:not(:disabled):active { transform: scale(.98); }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const chip = document.createElement("button");
  chip.id = "updChip"; chip.type = "button"; chip.dataset.tip = "Cutnote version and updates: click for what's new and the update settings"; chip.setAttribute("aria-haspopup", "dialog");
  const anchor = $("#approve");
  anchor.parentNode.insertBefore(chip, anchor);

  /* ---------- the Cutnote menu: hover to reveal the website and GitHub ---------- */
  const SITE = "https://jackd0127-dev.github.io/cutnote/", GH = "https://github.com/Jackd0127-dev/cutnote";
  const mcss = `
  #cnMenu { position: relative; }
  #cnMenu > button svg { width: 12px; height: 12px; transition: transform .2s; }
  #cnMenu.open > button { background: var(--raise); border-color: var(--line-2); }
  #cnMenu.open > button svg { transform: rotate(180deg); }
  #cnPop { position: absolute; top: calc(100% + 10px); right: 0; z-index: 60; width: 400px; padding: 10px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line-2);
    box-shadow: 0 24px 60px rgba(0,0,0,.2), 0 2px 8px rgba(0,0,0,.08); opacity: 0; transform: translateY(-6px) scale(.98); transform-origin: top right; pointer-events: none;
    transition: opacity .16s ease, transform .22s cubic-bezier(.22,1,.36,1); }
  #cnPop::before { content: ""; position: absolute; left: 0; right: 0; top: -12px; height: 12px; }
  #cnMenu.open #cnPop { opacity: 1; transform: none; pointer-events: auto; }
  #cnPop .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  #cnPop a.card { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 12px; background: var(--panel-2); border: 1px solid var(--line); color: var(--ink); text-decoration: none; transition: border-color .15s, background .15s, transform .2s cubic-bezier(.22,1,.36,1); }
  #cnPop a.card:hover { border-color: var(--line-2); background: var(--raise); }
  #cnPop .tile { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); }
  #cnPop .tile.dark { background: var(--ink); color: var(--panel); }
  #cnPop .tile svg { width: 18px; height: 18px; }
  #cnPop b { font-size: 13px; } #cnPop small { display: block; color: var(--dim); font-size: 11.5px; line-height: 1.35; margin-top: 2px; }
  #cnPop .links { display: flex; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--line); }
  #cnPop .links a { flex: 1; text-align: center; padding: 7px 6px; border-radius: 8px; color: var(--dim); font-size: 12px; font-weight: 600; text-decoration: none; }
  #cnPop .links a:hover { background: var(--hover); color: var(--ink); }
  @media (prefers-reduced-motion: reduce) { #cnPop { transition: none; } }`;
  const mst = document.createElement("style"); mst.textContent = mcss; document.head.appendChild(mst);
  const menu = document.createElement("div");
  menu.id = "cnMenu";
  menu.innerHTML = `<button class="ib" type="button" aria-haspopup="true" aria-expanded="false" data-tip="Cutnote: the website, GitHub, the tour and what's new">Cutnote <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5 6 7.5l3-3"/></svg></button>
    <div id="cnPop" role="menu">
      <div class="cards">
        <a class="card" role="menuitem" href="${SITE}" target="_blank" rel="noopener"><span class="tile"><svg><use href="#i-blade"/></svg></span><span><b>Website</b><small>What Cutnote does, the demo and how to install it</small></span></a>
        <a class="card" role="menuitem" href="${GH}" target="_blank" rel="noopener"><span class="tile dark"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg></span><span><b>GitHub</b><small>The code, every release and how to contribute</small></span></a>
      </div>
      <div class="links"><a href="#" data-tour data-tip="A short walk round the editor">Take the tour</a><a href="#" data-news data-tip="The changes in this version">What's new</a><a href="${GH}/issues/new" target="_blank" rel="noopener" data-tip="Report a problem or ask for something on GitHub">Report</a><a href="${GH}#install" target="_blank" rel="noopener" data-tip="How to install Cutnote on another computer">Install guide</a></div>
    </div>`;
  chip.parentNode.insertBefore(menu, chip);
  // hover to open (with a little grace so the pointer can cross to the panel); click toggles; Esc closes
  function hoverReveal(root, onOpen) {
    let t = 0;
    const set = on => { root.classList.toggle("open", on); const b = root.querySelector("button"); if (b) b.setAttribute("aria-expanded", String(on)); if (on && onOpen) onOpen(); };
    root.addEventListener("mouseenter", () => { clearTimeout(t); t = setTimeout(() => set(true), 80); });
    root.addEventListener("mouseleave", () => { clearTimeout(t); t = setTimeout(() => set(false), 220); });
    root.querySelector("button").addEventListener("click", () => set(!root.classList.contains("open")));
    document.addEventListener("keydown", e => { if (e.key === "Escape") set(false); });
    document.addEventListener("pointerdown", e => { if (!root.contains(e.target)) set(false); });
  }
  hoverReveal(menu);
  document.body.insertAdjacentHTML("beforeend", `<div id="updPop" role="dialog" aria-label="Updates"></div>`);
  const pop = $("#updPop");
  const say = (m, o) => (typeof toast === "function" ? toast(m, o) : null);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const post = body => fetch("/api/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Update failed"); return j; });
  let U = null, busy = false, pageVersion = null;
  // Why the update notice kept coming back: "Not now" was kept in sessionStorage, which every new tab (each launch opens one)
  // and every restart forgets, and the panel also opened whenever the pointer brushed the chip. Now the banner shows once per
  // new version (remembered in localStorage), never when "Update automatically" is on, and the panel opens only on a click.
  // The lime "Update to x.y.z" chip stays as the quiet reminder.
  const NOTICE = "cutnote:updNoticed";
  const noticed = v => { try { return !!v && localStorage.getItem(NOTICE) === String(v); } catch { return false; } };
  const notice = v => { try { localStorage.setItem(NOTICE, String(v)); } catch {} };

  function paint() {
    if (!U) return;
    const fresh = U.available;
    chip.className = fresh ? "new" : "";
    chip.innerHTML = fresh ? `<i></i>Update to ${esc(U.latest)}` : "v" + esc(U.current);
    const notes = (U.notes || []).map(n => `<li>${esc(n)}</li>`).join("");
    pop.innerHTML = (fresh
      ? `<h3>Cutnote ${esc(U.latest)} is out</h3><p class="sub">You have ${esc(U.current)}.${U.date ? " Released " + esc(U.date) + "." : ""}</p>${notes ? `<ul>${notes}</ul>` : ""}`
      : `<h3>Cutnote ${esc(U.current)}</h3><p class="sub">${U.error ? "Couldn't check for updates (offline?)." : U.latest ? "You're on the newest version." : "Checking for updates…"}</p>`)
      + (fresh && !U.can ? `<div class="why">${esc(U.reason)}<br>Or update by hand: <code>curl -fsSL https://raw.githubusercontent.com/Jackd0127-dev/cutnote/main/install.sh | sh</code></div>` : "")
      + (fresh ? `<button class="go" type="button" data-a="go" data-tip="Download ${esc(U.latest)} and restart Cutnote. The page comes back at the same place" ${U.can && !busy ? "" : "disabled"}>${busy ? "Updating…" : "Update now"}</button>` : "")
      + `<div class="row"><span>Update automatically<small>New versions install by themselves while Cutnote runs.</small></span>
          <span class="switch" data-tip="Update automatically: new versions install in the background, with no pop-ups"><input type="checkbox" data-a="auto" aria-label="Update automatically" ${U.auto ? "checked" : ""}><i></i></span></div>
        <div class="foot"><button type="button" data-a="check" data-tip="Look for a new version now">Check now</button><a href="#" data-news data-tip="The changes in this version">What's new</a></div>`;
    chip.dataset.tip = fresh ? `Cutnote ${U.latest} is out: click to see what's new and update` : U.error ? "Cutnote version and updates: couldn't check just now" : "Cutnote version and updates: you're on the newest version";
    nudge();
  }
  // The notice counts as seen only once someone could really see it: the Hub isn't covering the editor, the tab is in
  // front, and it stayed up for 1.5 s (or they closed it, or opened the update panel). If the Hub opens or the tab
  // goes to the back first, it's taken down unseen and offered again on the next check, tab switch or Hub close.
  let offered = null;
  const canSee = () => !document.body.classList.contains("hub-on") && document.visibilityState === "visible" && !pop.classList.contains("on");
  function offer(key, msg, opts) {
    if (noticed(key) || (offered && offered.key === key) || !canSee()) return;
    const me = { key, unseen: false };
    offered = me;
    me.h = say(msg, Object.assign({}, opts, { onClose: () => { if (!me.unseen) notice(key); if (offered === me) offered = null; } }));
    const t0 = Date.now();
    const tick = () => {
      if (offered !== me) return;
      if (!canSee()) { me.unseen = true; offered = null; if (me.h) me.h.close(); return; }
      if (Date.now() - t0 >= 1500) { notice(key); return; }
      setTimeout(tick, 250);
    };
    setTimeout(tick, 250);
  }
  function nudge() {
    if (!U) return;
    // once per new version, and never when it updates itself
    if (U.available && U.can && !U.auto && !busy) offer(U.latest, `Cutnote ${U.latest} is out.`, { kind: "info", id: "upd", ms: 12000, action: { label: "Update now", run: update } });
    // the server was updated (by another tab) while this page was open: offer a reload, once
    else if (pageVersion && U.current !== pageVersion && !busy && !U.auto) offer("reload:" + U.current, `Cutnote was updated to ${U.current}.`, { kind: "info", id: "upd", ms: 0, action: { label: "Reload", run: () => location.reload() } });
  }
  document.addEventListener("visibilitychange", nudge);
  { let hubWas = document.body.classList.contains("hub-on");
    new MutationObserver(() => { const h = document.body.classList.contains("hub-on"); if (h !== hubWas) { hubWas = h; if (!h) setTimeout(nudge, 400); } }).observe(document.body, { attributes: true, attributeFilter: ["class"] }); }
  async function refresh(check) {
    try { U = await fetch("/api/update" + (check ? "?check=1" : "")).then(r => r.json()); } catch { return; }
    if (!pageVersion) pageVersion = U.current;
    paint();
  }
  function place() {
    const r = chip.getBoundingClientRect();
    pop.style.top = (r.bottom + 6) + "px";
    pop.style.left = Math.max(8, Math.min(innerWidth - 328, r.right - 320)) + "px";
  }
  async function update() {
    if (busy) return;
    if (pageVersion && U && U.current !== pageVersion) { location.reload(); return; }
    busy = true; paint(); if (typeof toast === "function" && toast.close) toast.close("upd");
    try { await post({ action: "apply" }); }
    catch (e) { busy = false; paint(); say(e.message, { kind: "warn" }); return; }
    try { sessionStorage.setItem("cutnote:updated-from", U.current); } catch {}
    say("Updating Cutnote… the page reloads by itself", { kind: "info", ms: 0, id: "upd" });
    const from = U.current, t0 = Date.now();
    // the server restarts on the same port: wait until it answers with the new version, then reload in place
    const wait = async () => {
      if (Date.now() - t0 > 90000) { busy = false; refresh(); say("Cutnote didn't come back: restart it from the terminal", { kind: "error", id: "upd", ms: 0 }); return; }
      try { const j = await fetch("/api/info", { cache: "no-store" }).then(r => r.json()); if (j.version && j.version !== from) return location.reload(); } catch {}
      setTimeout(wait, 900);
    };
    setTimeout(wait, 1200);
  }

  // the panel opens on a click only (it used to open whenever the pointer brushed the chip)
  chip.onclick = e => { e.stopPropagation(); const on = !pop.classList.contains("on"); if (on) { place(); refresh(!U || Date.now() / 1000 - U.checked > 60); if (U && U.latest) notice(U.latest); if (typeof toast === "function" && toast.close) toast.close("upd"); } pop.classList.toggle("on", on); chip.setAttribute("aria-expanded", String(on)); };
  const shut = () => { if (pop.classList.contains("on")) { pop.classList.remove("on"); chip.setAttribute("aria-expanded", "false"); } };
  document.addEventListener("click", e => { if (!pop.contains(e.target) && !chip.contains(e.target)) shut(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") shut(); });
  addEventListener("resize", () => pop.classList.contains("on") && place());
  pop.addEventListener("click", async e => {
    const a = e.target.closest("[data-a]") && e.target.closest("[data-a]").dataset.a;
    if (a === "go") update();
    if (a === "check") { pop.querySelector(".sub").textContent = "Checking…"; await refresh(true); }
  });
  pop.addEventListener("change", async e => {
    if (e.target.dataset.a !== "auto") return;
    try { U = await post({ action: "auto", on: e.target.checked }); paint(); say(U.auto ? "Cutnote will update itself from now on" : "Automatic updates off", { kind: U.auto ? "ok" : "info" }); }
    catch (err) { e.target.checked = !e.target.checked; }
  });
  /* ---------- What's new: once after every update. An update you started (Update now) opens this screen; one that installed
     itself shows a banner whose "What's new" button opens it (with the same tour / Hub buttons). Also from the menus. ---------- */
  const wcss = `
  #wnew { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 16px; background: var(--scrim, rgba(12,12,14,.42)); backdrop-filter: blur(6px); opacity: 0; pointer-events: none; transition: opacity .25s; }
  #wnew.on { opacity: 1; pointer-events: auto; }
  #wnew .card { position: relative; width: min(640px, 100%); max-height: calc(100vh - 32px); overflow: hidden; border-radius: 22px; background: var(--panel); color: var(--ink);
    box-shadow: var(--shadow), 0 0 0 1px var(--line); transform: translateY(14px) scale(.97); transition: transform .45s cubic-bezier(.22,1,.36,1); }
  #wnew.on .card { transform: none; }
  #wnew .hero { position: relative; display: flex; align-items: center; gap: 14px; padding: 18px 22px; overflow: hidden; background: radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--accent) 55%, transparent), transparent 55%), radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%), var(--panel-2); border-bottom: 1px solid var(--line); }
  #wnew .hero .logo { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); box-shadow: 0 8px 20px var(--accent-glow); }
  #wnew .hero .logo svg { width: 22px; height: 22px; }
  #wnew .eyebrow { margin-top: 0; font-size: 10.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--accent-text); }
  #wnew h2 { margin: 1px 0 0; font-size: 21px; letter-spacing: -.02em; line-height: 1.15; }
  #wnew .sub { margin-top: 2px; color: var(--dim); font-size: 12px; }
  #wnew ul { list-style: none; margin: 0; padding: 16px 22px 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; }
  @media (max-width: 560px) { #wnew ul { grid-template-columns: 1fr; } }
  #wnew li { display: flex; gap: 12px; align-items: flex-start; opacity: 0; transform: translateY(6px); animation: wnIn .45s cubic-bezier(.22,1,.36,1) forwards; }
  #wnew li i { flex: none; width: 22px; height: 22px; border-radius: 7px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent-text); font-style: normal; }
  #wnew li i svg { width: 14px; height: 14px; }
  #wnew li b { display: block; font-size: 13px; line-height: 1.3; }
  #wnew li span { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; color: var(--dim); font-size: 12px; line-height: 1.42; margin-top: 2px; }
  @keyframes wnIn { to { opacity: 1; transform: none; } }
  #wnew .foot { display: flex; align-items: center; gap: 10px; padding: 14px 22px 18px; }
  #wnew .foot a { color: var(--dim); font-size: 12px; text-decoration: underline; text-underline-offset: 3px; }
  #wnew .foot button { margin-left: auto; height: 38px; padding: 0 22px; border: 0; border-radius: 10px; background: var(--ink); color: var(--panel); font-weight: 700; cursor: pointer; }
  #wnew .foot button.later { margin-left: auto; background: none; color: var(--dim); padding: 0 12px; }
  #wnew .foot button.later:hover { color: var(--ink); background: var(--hover); }
  #wnew .foot button.later + button { margin-left: 0; }
  #wnew .foot button.lime { display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: var(--accent-ink); box-shadow: 0 8px 22px var(--accent-glow); }
  #wnew .foot button.lime svg { width: 18px; height: 18px; } #wnew .foot button.lime .mk-hub path { fill: var(--accent); } #wnew .foot button.lime .mk-hub { color: var(--accent-ink); }
  #wnew .foot button.lime .mk-ph path:first-child { stroke: var(--accent); }
  @media (prefers-reduced-motion: reduce) { #wnew, #wnew .card, #wnew li { transition: none; animation: none; opacity: 1; transform: none; } }`;
  const wst = document.createElement("style"); wst.textContent = wcss; document.head.appendChild(wst);
  const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>';
  // a note is "Title: more detail" or {title, text}; plain sentences show as one line
  const splitNote = n => {
    if (n && typeof n === "object") return [n.title || "", n.text || ""];
    const s2 = String(n); const k = s2.indexOf(": ");
    if (k > 0 && k < 70) { const d2 = s2.slice(k + 2); return [s2.slice(0, k), d2.charAt(0).toUpperCase() + d2.slice(1)]; }
    const d = s2.search(/[.!?](\s|$)/); return d > 0 && d < s2.length - 2 ? [s2.slice(0, d + 1), s2.slice(d + 2)] : [s2, ""];
  };
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-news]"); if (!a) return;
    e.preventDefault(); const pop2 = $("#updPop"); if (pop2) pop2.classList.remove("on"); const m = $("#cnMenu"); if (m) m.classList.remove("open");
    whatsNew(null);
  });
  // a release can ask for an action button, e.g. {"action": {"label": "Show me the Hub", "run": "hub-tour"}}
  function tourBtn(v) {
    const a = v.action;
    if (a && (a.run === "hub-tour" || a.run === "tour") && window.CutnoteHub) {
      const mark = (window.CutnoteMarks && (a.run === "tour" ? window.CutnoteMarks.LOGO_EDITOR : window.CutnoteMarks.LOGO_HUB)) || "";
      return `<button type="button" class="later">Not now</button><button type="button" class="lime" data-run="${a.run}">${mark}${esc(a.label || "Show me round")}</button>`;
    }
    return `<button type="button">Let's go</button>`;
  }
  async function whatsNew(fromV, onClose) {
    const done = () => { if (onClose) { const f = onClose; onClose = null; f(); } };
    if ($("#wnew")) return done();
    let v;
    try { v = await fetch("/version.json", { cache: "no-store" }).then(r => r.json()); } catch { return done(); }
    if (!v || !(v.notes || []).length) return done();
    document.body.insertAdjacentHTML("beforeend", `<div id="wnew" role="dialog" aria-modal="true" aria-labelledby="wnT"><div class="card">
      <div class="hero"><span class="logo"><svg><use href="#i-blade"/></svg></span><div><div class="eyebrow">What's new</div>
        <h2 id="wnT">Cutnote ${esc(v.version)}</h2><div class="sub">${fromV ? "Updated from " + esc(fromV) : "The latest changes"}${v.date ? " · " + esc(v.date) : ""}</div></div></div>
      <ul>${v.notes.map((n, k) => { const [t, d] = splitNote(n); return `<li style="animation-delay:${0.12 + k * 0.07}s"><i>${CHECK}</i><div><b>${esc(t)}</b>${d ? `<span>${esc(d)}</span>` : ""}</div></li>`; }).join("")}</ul>
      <div class="foot"><a href="https://github.com/Jackd0127-dev/cutnote/commits/main" target="_blank" rel="noopener">See every change</a>${tourBtn(v)}</div></div></div>`);
    const el = $("#wnew");
    const close = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 300); done(); };
    el.querySelectorAll(".foot button").forEach(b => b.onclick = () => {
      close();
      // "Show me the Hub": open Cutnote Hub and walk round it (the tour can be skipped at every step)
      if (b.dataset.run === "hub-tour" && window.CutnoteHub) setTimeout(() => window.CutnoteHub.tour(true), 320);
      if (b.dataset.run === "tour" && window.CutnoteHub) setTimeout(() => window.CutnoteHub.editorTour(), 320);   // the editor, then the Hub
    });
    el.addEventListener("click", e => { if (e.target === el) close(); });
    document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); } });
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
    setTimeout(() => { const b = el.querySelector(".foot button:last-child"); b && b.focus(); }, 100);
  }
  // The first thing someone sees: What's new after an update, or (for someone new) the tour, never both at once.
  // CutnoteIntro settles once What's new is closed (or isn't needed): {updated} says an update happened, {firstRun} that
  // this browser has never opened Cutnote. The tour in hub.js waits for it and only runs on a first run.
  let introDone;
  window.CutnoteIntro = new Promise(r => { introDone = r; });
  // remember the last version this browser saw; a newer one (however it got here) gets the What's new screen once
  (async () => {
    let cur;
    try { cur = (await fetch("/api/version", { cache: "no-store" }).then(r => r.json())).version; } catch { return introDone({ updated: false, firstRun: false }); }
    let seen = null, from = null;
    try { seen = localStorage.getItem("cutnote:seen"); from = sessionStorage.getItem("cutnote:updated-from"); sessionStorage.removeItem("cutnote:updated-from"); } catch {}
    try { localStorage.setItem("cutnote:seen", cur); } catch {}
    const newer = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
    const updated = !!((seen && newer(cur, seen)) || (from && newer(cur, from)));
    const intro = { updated, firstRun: !seen && !from };
    // an update you asked for (Update now) gets the What's new screen; one that installed itself just says so in a banner
    let auto = false;
    if (updated && !from) { try { auto = !!(await fetch("/api/update").then(r => r.json())).auto; } catch {} }
    if (updated && auto) {
      introDone(intro);
      setTimeout(() => say(`Cutnote updated itself to ${cur}.`, { kind: "ok", id: "upd", ms: 8000, action: { label: "What's new", run: () => whatsNew(seen) } }), 900);
    } else if (updated) setTimeout(() => whatsNew(from || seen, () => introDone(intro)), 900);
    else introDone(intro);
  })();
  refresh();
  setInterval(() => refresh(), 10 * 60 * 1000);

  // When Cutnote restarts (an update, or someone restarts it), the page's video connections are cut and would freeze.
  // Watch for a new server and reload in place: same version, same moment, paused or playing as before.
  let boot = null, proj = null;
  const resumeKey = "cutnote:resume";
  setInterval(async () => {
    let v;
    try { v = await fetch("/api/version", { cache: "no-store" }).then(r => r.json()); } catch { return; }   // down: try again
    if (!boot) { boot = v.boot; proj = v.project; return; }
    if (v.boot !== boot) {
      // another tab switched project in the Hub: open the new one from the start; otherwise come back to the same moment
      if (v.project === proj) { try { sessionStorage.setItem(resumeKey, JSON.stringify({ comp: S.comp && S.comp.id, t: S.t, playing: !!S.playing })); } catch {} }
      location.replace(location.pathname + (document.body.classList.contains("hub-on") ? "#hub" : ""));
    }
  }, 3000);
  try {
    const r = JSON.parse(sessionStorage.getItem(resumeKey) || "null");
    if (r) {
      sessionStorage.removeItem(resumeKey);
      const until = Date.now() + 20000;
      const go = () => {
        if (S.player && S.player.ready && S.comp) {
          const p = r.comp && S.comp.id !== r.comp && typeof loadComp === "function" ? loadComp(r.comp) : Promise.resolve();
          p.then(() => setTimeout(() => { seek(r.t || 0); if (r.playing) play(); }, 300));
          say("Cutnote restarted: back where you were", { kind: "ok" });
        } else if (Date.now() < until) setTimeout(go, 300);
      };
      go();
    }
  } catch {}
})();
