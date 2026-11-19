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
        <a class="card" role="menuitem" href="${SITE}" target="_blank" rel="noopener"><span class="tile"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg></span><span><b>Website</b><small>What Cutnote does, the demo and how to install it</small></span></a>
        <a class="card" role="menuitem" href="${GH}" target="_blank" rel="noopener"><span class="tile dark"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg></span><span><b>GitHub</b><small>The code, every release and how to contribute</small></span></a>
      </div>
      <div class="links"><a href="${GH}/commits/main" target="_blank" rel="noopener">What's new</a><a href="${GH}/issues/new" target="_blank" rel="noopener">Report a problem</a><a href="${GH}#install" target="_blank" rel="noopener">Install guide</a></div>
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
        <div class="foot"><button type="button" data-a="check">Check now</button><a href="${esc(U.repo)}/commits/main" target="_blank" rel="noopener">What changed</a></div>`;
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

  try {
    const from = sessionStorage.getItem("cutnote:updated-from");
    if (from) { sessionStorage.removeItem("cutnote:updated-from"); setTimeout(() => typeof toast === "function" && toast("Cutnote is up to date"), 1200); }
  } catch {}
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
