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
  #updBar { position: fixed; left: 50%; top: 62px; z-index: 49; transform: translateX(-50%); display: none; align-items: center; gap: 12px; padding: 8px 10px 8px 14px;
    border-radius: 12px; background: var(--panel); border: 1px solid var(--accent); box-shadow: var(--shadow); font-size: 12.5px; }
  #updBar.on { display: flex; }
  #updBar button { height: 28px; padding: 0 12px; border-radius: 8px; border: 0; background: var(--accent); color: var(--accent-ink); font-weight: 700; cursor: pointer; }
  #updBar .x { background: none; color: var(--dim); padding: 0 4px; font-weight: 400; }`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  const chip = document.createElement("button");
  chip.id = "updChip"; chip.type = "button"; chip.title = "Cutnote version and updates";
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
  menu.innerHTML = `<button class="ib" type="button" aria-haspopup="true" aria-expanded="false">Cutnote <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5 6 7.5l3-3"/></svg></button>
    <div id="cnPop" role="menu">
      <div class="cards">
        <a class="card" role="menuitem" href="${SITE}" target="_blank" rel="noopener"><span class="tile"><svg><use href="#i-blade"/></svg></span><span><b>Website</b><small>What Cutnote does, the demo and how to install it</small></span></a>
        <a class="card" role="menuitem" href="${GH}" target="_blank" rel="noopener"><span class="tile dark"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg></span><span><b>GitHub</b><small>The code, every release and how to contribute</small></span></a>
      </div>
      <div class="links"><a href="#" data-news>What's new</a><a href="${GH}/issues/new" target="_blank" rel="noopener">Report a problem</a><a href="${GH}#install" target="_blank" rel="noopener">Install guide</a></div>
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
  document.body.insertAdjacentHTML("beforeend", `<div id="updPop" role="dialog" aria-label="Updates"></div>
    <div id="updBar" role="status"><span></span><button type="button" data-a="go">Update now</button><button type="button" class="x" data-a="later" title="Not now">✕</button></div>`);
  const pop = $("#updPop"), bar = $("#updBar");
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const post = body => fetch("/api/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Update failed"); return j; });
  let U = null, busy = false, pageVersion = null;
  const dismissed = () => { try { return sessionStorage.getItem("cutnote:later") === (U && U.latest); } catch { return false; } };

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
      + (fresh ? `<button class="go" type="button" data-a="go" ${U.can && !busy ? "" : "disabled"}>${busy ? "Updating…" : "Update now"}</button>` : "")
      + `<div class="row"><span>Update automatically<small>New versions install by themselves while Cutnote runs.</small></span>
          <span class="switch"><input type="checkbox" data-a="auto" ${U.auto ? "checked" : ""} ${U.can || !fresh ? "" : ""}><i></i></span></div>
        <div class="foot"><button type="button" data-a="check">Check now</button><a href="#" data-news>What's new</a></div>`;
    bar.querySelector("span").textContent = `Cutnote ${U.latest} is available.`;
    bar.classList.toggle("on", fresh && U.can && !U.auto && !busy && !dismissed() && !pop.classList.contains("on"));
    // the server was updated (by auto-update or another tab) while this page was open
    if (pageVersion && U.current !== pageVersion && !busy) {
      bar.querySelector("span").textContent = `Cutnote was updated to ${U.current}.`;
      bar.querySelector("[data-a=go]").textContent = "Reload";
      bar.classList.add("on");
    }
  }
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
    busy = true; paint(); bar.classList.remove("on");
    try { await post({ action: "apply" }); }
    catch (e) { busy = false; paint(); if (typeof toast === "function") toast(e.message); return; }
    try { sessionStorage.setItem("cutnote:updated-from", U.current); } catch {}
    if (typeof toast === "function") toast("Updating Cutnote… the page reloads by itself");
    const from = U.current, t0 = Date.now();
    // the server restarts on the same port: wait until it answers with the new version, then reload in place
    const wait = async () => {
      if (Date.now() - t0 > 90000) { busy = false; refresh(); if (typeof toast === "function") toast("Cutnote didn't come back: restart it from the terminal"); return; }
      try { const j = await fetch("/api/info", { cache: "no-store" }).then(r => r.json()); if (j.version && j.version !== from) return location.reload(); } catch {}
      setTimeout(wait, 900);
    };
    setTimeout(wait, 1200);
  }

  {
    let t = 0;
    const openPop = () => { if (pop.classList.contains("on")) return; place(); refresh(!U || Date.now() / 1000 - U.checked > 60); pop.classList.add("on"); bar.classList.remove("on"); };
    const later = () => { clearTimeout(t); t = setTimeout(() => { if (!pop.matches(":hover") && !chip.matches(":hover") && !pop.contains(document.activeElement)) pop.classList.remove("on"); }, 250); };
    chip.addEventListener("mouseenter", () => { clearTimeout(t); t = setTimeout(openPop, 80); });
    chip.addEventListener("mouseleave", later);
    pop.addEventListener("mouseenter", () => clearTimeout(t));
    pop.addEventListener("mouseleave", later);
  }
  chip.onclick = e => { e.stopPropagation(); const on = !pop.classList.contains("on"); if (on) { place(); refresh(!U || Date.now() / 1000 - U.checked > 60); } pop.classList.toggle("on", on); bar.classList.remove("on"); };
  document.addEventListener("click", e => { if (!pop.contains(e.target) && e.target !== chip) pop.classList.remove("on"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") pop.classList.remove("on"); });
  addEventListener("resize", () => pop.classList.contains("on") && place());
  pop.addEventListener("click", async e => {
    const a = e.target.closest("[data-a]") && e.target.closest("[data-a]").dataset.a;
    if (a === "go") update();
    if (a === "check") { pop.querySelector(".sub").textContent = "Checking…"; await refresh(true); }
  });
  pop.addEventListener("change", async e => {
    if (e.target.dataset.a !== "auto") return;
    try { U = await post({ action: "auto", on: e.target.checked }); paint(); if (typeof toast === "function") toast(U.auto ? "Cutnote will update itself" : "Automatic updates off"); }
    catch (err) { e.target.checked = !e.target.checked; }
  });
  bar.addEventListener("click", e => {
    const a = e.target.closest("[data-a]") && e.target.closest("[data-a]").dataset.a;
    if (a === "go") update();
    if (a === "later") { try { sessionStorage.setItem("cutnote:later", U.latest); } catch {} bar.classList.remove("on"); }
  });

  /* ---------- What's new: shown once after every update (clicked, automatic or a fresh install's first update) ---------- */
  const wcss = `
  #wnew { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 16px; background: rgba(12,12,14,.42); backdrop-filter: blur(6px); opacity: 0; pointer-events: none; transition: opacity .25s; }
  #wnew.on { opacity: 1; pointer-events: auto; }
  #wnew .card { position: relative; width: min(460px, 100%); max-height: calc(100vh - 32px); overflow: auto; border-radius: 22px; background: var(--panel); color: var(--ink);
    box-shadow: 0 40px 100px rgba(0,0,0,.35), 0 0 0 1px var(--line); transform: translateY(14px) scale(.97); transition: transform .45s cubic-bezier(.22,1,.36,1); }
  #wnew.on .card { transform: none; }
  #wnew .hero { position: relative; padding: 26px 26px 22px; overflow: hidden; background: radial-gradient(120% 140% at 0% 0%, rgba(198,244,50,.55), transparent 55%), radial-gradient(120% 140% at 100% 0%, rgba(198,244,50,.22), transparent 60%), var(--panel-2); border-bottom: 1px solid var(--line); }
  #wnew .hero .logo { width: 44px; height: 44px; border-radius: 13px; display: grid; place-items: center; background: var(--accent); color: var(--accent-ink); box-shadow: 0 8px 20px rgba(120,160,0,.35); }
  #wnew .hero .logo svg { width: 22px; height: 22px; }
  #wnew .eyebrow { margin-top: 16px; font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--accent-text); }
  #wnew h2 { margin: 4px 0 0; font-size: 26px; letter-spacing: -.02em; line-height: 1.15; }
  #wnew .sub { margin-top: 4px; color: var(--dim); font-size: 12.5px; }
  #wnew ul { list-style: none; margin: 0; padding: 18px 26px 6px; display: grid; gap: 14px; }
  #wnew li { display: flex; gap: 12px; align-items: flex-start; opacity: 0; transform: translateY(6px); animation: wnIn .45s cubic-bezier(.22,1,.36,1) forwards; }
  #wnew li i { flex: none; width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent-text); font-style: normal; }
  #wnew li i svg { width: 14px; height: 14px; }
  #wnew li b { display: block; font-size: 13.5px; line-height: 1.35; }
  #wnew li span { display: block; color: var(--dim); font-size: 12.5px; line-height: 1.45; margin-top: 2px; }
  @keyframes wnIn { to { opacity: 1; transform: none; } }
  #wnew .foot { display: flex; align-items: center; gap: 12px; padding: 16px 26px 22px; }
  #wnew .foot a { color: var(--dim); font-size: 12px; text-decoration: underline; text-underline-offset: 3px; }
  #wnew .foot button { margin-left: auto; height: 38px; padding: 0 22px; border: 0; border-radius: 10px; background: var(--ink); color: var(--panel); font-weight: 700; cursor: pointer; }
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
  async function whatsNew(fromV) {
    if ($("#wnew")) return;
    let v;
    try { v = await fetch("/version.json", { cache: "no-store" }).then(r => r.json()); } catch { return; }
    if (!v || !(v.notes || []).length) return;
    document.body.insertAdjacentHTML("beforeend", `<div id="wnew" role="dialog" aria-modal="true" aria-labelledby="wnT"><div class="card">
      <div class="hero"><span class="logo"><svg><use href="#i-blade"/></svg></span><div class="eyebrow">What's new</div>
        <h2 id="wnT">Cutnote ${esc(v.version)}</h2><div class="sub">${fromV ? "Updated from " + esc(fromV) : "The latest changes"}${v.date ? " · " + esc(v.date) : ""}</div></div>
      <ul>${v.notes.map((n, k) => { const [t, d] = splitNote(n); return `<li style="animation-delay:${0.12 + k * 0.07}s"><i>${CHECK}</i><div><b>${esc(t)}</b>${d ? `<span>${esc(d)}</span>` : ""}</div></li>`; }).join("")}</ul>
      <div class="foot"><a href="https://github.com/Jackd0127-dev/cutnote/commits/main" target="_blank" rel="noopener">See every change</a><button type="button">Let's go</button></div></div></div>`);
    const el = $("#wnew");
    const close = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 300); };
    el.querySelector("button").onclick = close;
    el.addEventListener("click", e => { if (e.target === el) close(); });
    document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", k); } });
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
    setTimeout(() => el.querySelector("button").focus(), 100);
  }
  // remember the last version this browser saw; a newer one (however it got here) gets the What's new screen once
  (async () => {
    let cur;
    try { cur = (await fetch("/api/version", { cache: "no-store" }).then(r => r.json())).version; } catch { return; }
    let seen = null, from = null;
    try { seen = localStorage.getItem("cutnote:seen"); from = sessionStorage.getItem("cutnote:updated-from"); sessionStorage.removeItem("cutnote:updated-from"); } catch {}
    try { localStorage.setItem("cutnote:seen", cur); } catch {}
    const newer = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
    if ((seen && newer(cur, seen)) || (from && newer(cur, from))) setTimeout(() => whatsNew(from || seen), 900);
  })();
  refresh();
  setInterval(() => refresh(), 10 * 60 * 1000);

  // When Cutnote restarts (an update, or someone restarts it), the page's video connections are cut and would freeze.
  // Watch for a new server and reload in place: same version, same moment, paused or playing as before.
  let boot = null;
  const resumeKey = "cutnote:resume";
  setInterval(async () => {
    let v;
    try { v = await fetch("/api/version", { cache: "no-store" }).then(r => r.json()); } catch { return; }   // down: try again
    if (!boot) { boot = v.boot; return; }
    if (v.boot !== boot) {
      try { sessionStorage.setItem(resumeKey, JSON.stringify({ comp: S.comp && S.comp.id, t: S.t, playing: !!S.playing })); } catch {}
      location.reload();
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
          if (typeof toast === "function") toast("Cutnote restarted: back where you were");
        } else if (Date.now() < until) setTimeout(go, 300);
      };
      go();
    }
  } catch {}
})();
