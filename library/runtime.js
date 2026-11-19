/* Video component library runtime.
 *
 * One file that any HyperFrames composition (or any page with GSAP) can load. Components register themselves with
 * VideoLibrary.register({...}) from components/<id>/component.js; a composition then mounts one onto its GSAP timeline:
 *
 *   VideoLibrary.mount("crowd-reveal", { root: document.querySelector("#overlays"), tl, start: 12.4,
 *                                        params: { label: "AI CUSTOMERS", verdictAt: 2.1 } });
 *
 * Every time inside a component's params is in seconds from the component's own start, so the same component drops onto
 * any moment of any video. The canvas is 1080x1920 (positions in params are canvas pixels). The full contract for
 * authors and for any AI using the library is in SPEC.md.
 */
(function (g) {
  "use strict";
  const LIB = (g.VideoLibrary = g.VideoLibrary || { components: {}, order: [] });
  LIB.version = "1.0.0";
  LIB.W = 1080;
  LIB.H = 1920;
  LIB.LIME = "#c8ff3a";
  // where fonts/, preview/ and components/ live, as seen by the page (set before mounting; "" = same folder)
  if (LIB.base == null) LIB.base = "";

  LIB.register = function (def) {
    if (!def || !def.id) throw new Error("VideoLibrary.register: a component needs an id");
    if (!LIB.components[def.id]) LIB.order.push(def.id);
    def.params = def.params || [];
    def.duration = def.duration || 3;
    LIB.components[def.id] = def;
    if (LIB.onregister) LIB.onregister(def);
    return def;
  };

  LIB.list = function (category) {
    return LIB.order.map(id => LIB.components[id]).filter(d => !category || d.category === category);
  };

  LIB.defaults = function (id) {
    const def = LIB.components[id];
    const out = { duration: def.duration };
    for (const p of def.params) out[p.key] = Array.isArray(p.default) ? p.default.slice() : p.default;
    return out;
  };

  /* ---------- styles ---------- */
  const FONTS = [
    ["ArchivoXB", "Archivo-ExtraBold.ttf"], ["ArchivoSB", "Archivo-SemiBold.ttf"], ["ArchivoM", "Archivo-Medium.ttf"],
    ["Typewriter", "IBMPlexMono-Regular.ttf"], ["PlayfairI", "PlayfairDisplay-RegularItalic.ttf"],
  ];
  LIB.fontCss = function (base) {
    const b = base == null ? LIB.base : base;
    return FONTS.map(([f, file]) => `@font-face{font-family:"${f}";src:url("${b}fonts/${file}");font-display:block}`).join("\n");
  };
  const BASE_CSS = `
.vlib{position:absolute;inset:0;pointer-events:none;overflow:visible;background:none;width:auto;height:auto;left:0;top:0;display:block}
.vlib *{box-sizing:border-box}
.vlib .vl-scrim{position:absolute;left:0;right:0;opacity:0;
  background:linear-gradient(180deg,rgba(6,5,4,0) 0%,rgba(6,5,4,calc(var(--k,.6)*.75)) 30%,rgba(6,5,4,var(--k,.6)) 62%,rgba(6,5,4,calc(var(--k,.6)*.85)) 100%)}
.vl-pv .vl-scrim{visibility:hidden!important}
.vlib .vl-tag{display:inline-block;padding:6px 14px;border-radius:14px;background:#17120e;color:#fff;font-family:"Typewriter";font-size:20px;letter-spacing:.14em;text-transform:uppercase}
`;
  LIB.injectCss = function (doc, def) {
    doc = doc || document;
    const want = [["vl-base", () => LIB.fontCss() + BASE_CSS]];
    if (def && def.css) want.push(["vl-css-" + def.id, () => def.css]);
    for (const [id, css] of want) {
      if (doc.getElementById(id)) continue;
      const s = doc.createElement("style");
      s.id = id;
      s.textContent = css();
      (doc.head || doc.documentElement).appendChild(s);
    }
  };

  /* ---------- helpers handed to every component ---------- */
  LIB.rng = function (seed) {
    let s = (seed * 9301 + 49297) % 2147483648;
    return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  };
  LIB.esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // "a [lime] word" -> "a <em>lime</em> word" (escaped)
  LIB.marks = s => LIB.esc(s).replace(/\[(.+?)\]/g, "<em>$1</em>");
  let seq = 0;

  /* Mount a component: returns { el, uid, start, end }.
   *   root    element to put the overlay in (it should cover the 1080x1920 canvas)
   *   tl      the GSAP timeline to add tweens to
   *   start   composition time (s) the component starts at
   *   params  overrides of the component's defaults (duration included)
   *   uid     optional fixed id (defaults to vl-<id>-<n>) */
  LIB.mount = function (id, opts) {
    const def = LIB.components[id];
    if (!def) throw new Error("VideoLibrary: no component " + id);
    const o = opts || {};
    const doc = (o.root && o.root.ownerDocument) || document;
    LIB.injectCss(doc, def);
    const p = Object.assign(LIB.defaults(id), o.params || {});
    const t0 = +o.start || 0;
    const uid = o.uid || ("vl-" + id + "-" + (++seq));
    const c = {
      uid, p, t0, base: LIB.base, lime: LIB.LIME,
      end: t0 + (+p.duration || def.duration),
      id: name => uid + "-" + name,                       // a unique element id inside this instance
      $: sel => "#" + uid + (sel ? " " + sel : ""),       // a selector scoped to this instance
      at: s => t0 + (+s || 0),                            // component seconds -> composition seconds
      rng: LIB.rng, esc: LIB.esc, marks: LIB.marks,
      // the house exit: fade + small lift over the last 0.28 s
      exit: (tl, sel, extra) => tl.to(sel || c.$(), Object.assign({ opacity: 0, y: -16, duration: 0.28, ease: "power2.in" }, extra || {}), c.end - 0.28),
      // a soft dark scrim behind a lower-third (top -> bottom of canvas), fading in and out with the component
      scrim: (top, strength, at) => {
        const sid = c.id("scrim" + (++seq));
        c._scrims.push([sid, top, strength == null ? 0.6 : strength, at == null ? 0 : at]);
        return `<div class="vl-scrim" id="${sid}" style="top:${Math.round(top)}px;height:${LIB.H - Math.round(top)}px;--k:${strength == null ? 0.6 : strength}"></div>`;
      },
      _scrims: [],
    };
    const wrap = doc.createElement("div");
    wrap.className = "vlib vl-" + id;   // "vlib": a class a composition is unlikely to style itself
    wrap.id = uid;
    wrap.style.opacity = "0";
    if (def.z != null) wrap.style.zIndex = def.z;
    wrap.innerHTML = def.html(p, c);
    (o.root || doc.body).appendChild(wrap);
    const tl = o.tl;
    if (tl) {
      tl.set("#" + uid, { opacity: 1 }, Math.max(0, t0 - 0.01));
      for (const [sid, , , at] of c._scrims) {
        tl.fromTo("#" + sid, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, Math.max(0, c.at(at) - 0.1));
        tl.to("#" + sid, { opacity: 0, duration: 0.35, ease: "power2.in" }, c.end - 0.3);
      }
      def.animate(tl, p, c);
      tl.set("#" + uid, { opacity: 0 }, c.end + 0.02);
    }
    return { el: wrap, uid, start: t0, end: c.end, def, params: p };
  };

  /* ---------- live preview (library panel / gallery) ----------
   * The component on its own: a plain backdrop, no footage. It is measured over its whole animation, then centred and
   * scaled to fill the card; full-frame pieces (rain, storyline, transitions) show the whole canvas. Loops forever.
   *   opts: width, aspect (w/h, default 4/5), background ("light" | "photo" | "dark" | any CSS background), autoplay, gap, radius
   * Backdrops: "light" (the default) is a clean near-white; "dark" (also "photo") is a plain black gradient
   * for white type and glow made to sit on footage. A component picks one with
   * `preview: { background }`.
   * Returns { tl, stage, box, restart, destroy, fit }. */
  const BGS = {
    light: "radial-gradient(130% 95% at 50% 26%, #fbfaf8 0%, #f7f6f3 42%, #efede8 100%)",
    dark: "linear-gradient(180deg, #26262a 0%, #111113 60%, #08080a 100%)",
    photo: "linear-gradient(180deg, #26262a 0%, #111113 60%, #08080a 100%)",   // same plain black gradient (was a blurred room photo)
  };
  LIB.backdrop = function (name) { const b = BGS[name || "light"]; return typeof b === "function" ? b() : b || name; };
  // visible area a component draws over its run, in canvas px; null when nothing (or only full-canvas layers) shows
  LIB.measure = function (stage, tl, t0, dur) {
    const sr = stage.getBoundingClientRect();
    const k = sr.width / LIB.W || 1;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, full = false;
    const was = tl.time();
    for (const f of [0.2, 0.35, 0.5, 0.65, 0.8, 0.92]) {
      tl.time(t0 + dur * f, true);
      for (const el of stage.querySelectorAll(".vlib *")) {
        if (el.closest(".vl-scrim") || el.tagName === "STYLE") continue;
        const r0 = el.getBoundingClientRect();
        let o = 1, n = el, L = r0.left, T = r0.top, R = r0.right, B = r0.bottom;
        while (n && n !== stage && o > 0.05) {
          const cs = getComputedStyle(n);
          if (cs.display === "none") o = 0; else o *= +cs.opacity;   // (visibility is ignored: a closed drawer hides its cards that way)
          if (n !== el && cs.overflow !== "visible") {   // what a clipping parent hides doesn't count (rolling digits, masks)
            const c = n.getBoundingClientRect(); L = Math.max(L, c.left); T = Math.max(T, c.top); R = Math.min(R, c.right); B = Math.min(B, c.bottom);
          }
          n = n.parentElement;
        }
        if (o <= 0.05 || R - L < 1 || B - T < 1) continue;
        const a = { x0: (L - sr.left) / k, y0: (T - sr.top) / k, x1: (R - sr.left) / k, y1: (B - sr.top) / k };
        if (a.x1 - a.x0 > LIB.W * 0.9 && a.y1 - a.y0 > LIB.H * 0.8) { full = true; continue; }   // a dim layer / full-frame wash
        if (el.children.length && !el.textContent.trim() && !/IMG|SVG|VIDEO|CANVAS/.test(el.tagName) && getComputedStyle(el).backgroundColor === "rgba(0, 0, 0, 0)" && getComputedStyle(el).backgroundImage === "none" && getComputedStyle(el).boxShadow === "none") continue;   // an empty layout wrapper
        x0 = Math.min(x0, a.x0); y0 = Math.min(y0, a.y0); x1 = Math.max(x1, a.x1); y1 = Math.max(y1, a.y1);
      }
    }
    tl.time(was, true);
    if (!isFinite(x0)) return full ? { full: true } : null;
    const box = { x0: Math.max(-200, x0), y0: Math.max(-200, y0), x1: Math.min(LIB.W + 200, x1), y1: Math.min(LIB.H + 200, y1), full };
    // pieces that spread over most of the canvas read best as the whole frame
    if (full && (box.x1 - box.x0) * (box.y1 - box.y0) > LIB.W * LIB.H * 0.35) box.whole = true;
    if ((box.x1 - box.x0) > LIB.W * 0.85 && (box.y1 - box.y0) > LIB.H * 0.6) box.whole = true;
    return box;
  };

  LIB.preview = function (host, id, opts) {
    const o = opts || {};
    const def = LIB.components[id];
    const gs = g.gsap;
    if (!def || !gs) return null;
    host.innerHTML = "";
    const w = o.width || host.clientWidth || 180;
    const h = Math.round(w / (o.aspect || 4 / 5));
    const want = o.background || (def.preview && def.preview.background) || "light";
    const box = document.createElement("div");
    box.className = "vl-pv";
    box.style.cssText = `position:relative;width:${w}px;height:${h}px;overflow:hidden;border-radius:${o.radius == null ? 12 : o.radius}px;background:${LIB.backdrop(want)}`;
    const stage = document.createElement("div");
    stage.style.cssText = `position:absolute;left:0;top:0;width:${LIB.W}px;height:${LIB.H}px;transform-origin:0 0`;
    box.appendChild(stage);
    host.appendChild(box);
    // a component can ask for different settings in its preview card (preview.params), e.g. text centred in the card
    const p = Object.assign(LIB.defaults(id), (def.preview && def.preview.params) || {}, o.params || {});
    const dur = +p.duration || def.duration;
    const T0 = 0.25;
    let tl = null;
    // whole canvas, centred (also the starting point before measuring)
    function place(b) {
      let K, cx, cy;
      if (!b) { K = Math.min(w / LIB.W, h / LIB.H); cx = LIB.W / 2; cy = LIB.H / 2; }
      else if (b.whole || b.full && !(b.x1 > b.x0)) {
        // full-frame pieces fill the card edge to edge (no side bars), centred on what they draw, kept inside the canvas
        K = Math.max(w / LIB.W, h / LIB.H); cx = LIB.W / 2;
        const half = h / 2 / K, mid = b.y1 > b.y0 ? (b.y0 + b.y1) / 2 : LIB.H / 2;
        cy = Math.min(LIB.H - half, Math.max(half, mid));
      }
      else {
        const bw = Math.max(40, b.x1 - b.x0), bh = Math.max(40, b.y1 - b.y0);
        K = Math.min(w * 0.84 / bw, h * 0.8 / bh, (w / LIB.W) * 2.4);
        cx = (b.x0 + b.x1) / 2; cy = (b.y0 + b.y1) / 2;
      }
      stage.style.transform = `translate(${(w / 2 - cx * K).toFixed(1)}px,${(h / 2 - cy * K).toFixed(1)}px) scale(${K.toFixed(4)})`;
    }
    function fit() {
      if (!tl || !stage.isConnected) return;
      stage.style.transform = `scale(${w / LIB.W})`;   // measure at a known scale
      place(LIB.measure(stage, tl, T0, dur));
    }
    function build() {
      if (tl) tl.kill();
      stage.querySelectorAll(".vlib").forEach(n => n.remove());
      tl = gs.timeline({ paused: true, repeat: o.loop === false ? 0 : -1, repeatDelay: o.gap == null ? 0.5 : o.gap });
      LIB.mount(id, { root: stage, tl, start: T0, params: p, uid: "pv" + (++seq) });
      tl.set({}, {}, dur + 0.45);   // a beat of empty frame before it loops
      place(null);
      fit();
      if (document.fonts && document.fonts.status !== "loaded") document.fonts.ready.then(fit);
      if (o.autoplay !== false) tl.play(0);
      return tl;
    }
    build();
    return {
      get tl() { return tl; }, stage, box, fit,
      restart: () => build(),
      destroy() { if (tl) tl.kill(); host.innerHTML = ""; },
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
