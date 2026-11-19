/* Updates: a version chip in the header. It turns lime when a newer Cutnote is published, and its panel has
 * "Update now" (pulls the new version and restarts the player, then the page reloads at the same place) and an
 * "Update automatically" switch (saved in ~/.config/cutnote/settings.json, applied in the background from then on). */
(function () {
  "use strict";
  const $ = s => document.querySelector(s);
  const css = `
  #updChip { height: 26px; padding: 0 10px; border-radius: 13px; border: 1px solid var(--line); background: var(--panel-2); color: var(--dim);
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
  const anchor = $("#themeBtn");
  anchor.parentNode.insertBefore(chip, anchor);
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
    pop.style.top = (r.bottom + 8) + "px";
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
