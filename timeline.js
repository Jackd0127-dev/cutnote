"use strict";
/* Timeline editor for the review player.
   - Program lane: the main footage as a sequence of spans. Split (S / razor C), delete (ripple), drag to reorder, drag edges to trim.
   - Clip lanes (b-roll, overlays, captions, sound): drag to move, drag edges to trim, Delete hides.
   Everything is stored in SOURCE time (this build's composition time); the timeline shows PROGRAM time (after the edits).
   Edits play live here and are saved per version in review-notes.json "edits"; the editing session bakes them into a clean
   rebuild from source footage, then clears them. Nothing here touches the composition file. */

/* ---------- soft snapping for anything dragged on the frame ----------
   Shared by on-frame pieces (overlays, captions, b-roll, your footage), Library components and caption styles, the
   delivery crop window and drawing marks. Lines: the frame's edges, centre, thirds and quarters (and the crop window's
   when a delivery format is set), plus other pieces' edges and centres. Soft: within LOCK px of a line it sits exactly
   on it; out to R px it eases back to the pointer, so nothing jumps. Hold ⌥ (or ⌘) to move freely. Thin guides show
   while something sits on a line. All values are client (CSS) px. */
const CutSnap = (() => {
  const FR = [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75, 1], R = 8, LOCK = 4;
  let el = null;
  const off = e => !!(e && (e.altKey || e.metaKey || e.ctrlKey));
  const frameRect = () => { const f = document.getElementById("frame"); return f ? f.getBoundingClientRect() : null; };
  // the lines to snap to: { x: [{ v, k, f }], y: [...] }
  function targets(others, o) {
    const r = frameRect(), L = { x: [], y: [] }; if (!r || !r.width) return L;
    const add = (b, fr, k) => { for (const f of fr) { L.x.push({ v: b.left + b.width * f, k, f }); L.y.push({ v: b.top + b.height * f, k, f }); } };
    add(r, FR, "frame");
    const f = typeof S !== "undefined" && S.ed && S.ed.format;
    if (f && !(o && o.noCrop) && typeof cropBox === "function") { const b = cropBox(f); add({ left: r.left + b.x * r.width, top: r.top + b.y * r.height, width: b.w * r.width, height: b.h * r.height }, FR, "crop"); }
    for (const b of others || []) if (b && b.width > 2 && b.height > 2) add(b, [0, 0.5, 1], "el");
    return L;
  }
  // how far to shift a feature that is `o` px from its line: exact inside LOCK, eased back to 0 at R
  function pull(o) { const a = Math.abs(o); if (a >= R) return null; if (a <= LOCK) return -o; return Math.sign(o) * (a - LOCK) * R / (R - LOCK) - o; }
  // the frame's centre wins a near-tie, then the nearest line
  const rank = (o, ln) => Math.abs(o) - (ln.k !== "el" && ln.f === 0.5 ? 0.75 : 0) - (ln.k === "crop" ? 0.25 : 0);
  function axis(feats, lines) {
    let best = null;
    for (const v of feats) for (const ln of lines) { const o = v - ln.v; if (Math.abs(o) < R && (!best || rank(o, ln) < best.r)) best = { o, ln, r: rank(o, ln) }; }
    if (!best) return null;
    const sh = pull(best.o); return sh == null ? null : { shift: sh, v: best.ln.v, exact: Math.abs(best.o + sh) < 0.01 };
  }
  // a box being dragged (client px: left, top, width, height) -> the nudge { dx, dy } that snaps it
  function move(box, e, o) {
    o = o || {};
    if (off(e)) { hide(); return { dx: 0, dy: 0 }; }
    const L = o.lines || targets(o.others, o);
    const ax = o.lockX ? null : axis([box.left, box.left + box.width / 2, box.left + box.width], L.x);
    const ay = o.lockY ? null : axis([box.top, box.top + box.height / 2, box.top + box.height], L.y);
    show(ax && ax.exact ? ax.v : null, ay && ay.exact ? ay.v : null);
    return { dx: ax ? ax.shift : 0, dy: ay ? ay.shift : 0, x: !!(ax && ax.exact), y: !!(ay && ay.exact) };
  }
  // a box scaled about its centre (cx, cy), hw/hh its half size at scale 1 -> the scale that puts its nearest edge on a line
  function scale(cx, cy, hw, hh, s, e, o) {
    o = o || {};
    if (off(e) || !(hw > 0 && hh > 0)) { hide(); return s; }
    const L = o.lines || targets(o.others, o);
    let best = null;
    for (const [c, h, lines, ax] of [[cx, hw, L.x, "x"], [cy, hh, L.y, "y"]]) for (const sg of [-1, 1]) {
      const edge = c + sg * h * s;
      for (const ln of lines) { if (Math.sign(ln.v - c) !== sg || Math.abs(ln.v - c) < 4) continue; const d = edge - ln.v; if (Math.abs(d) < R && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, ln, c, h, ax, sg }; }
    }
    if (!best) { hide(); return s; }
    const sh = pull(best.d); if (sh == null) { hide(); return s; }
    const edge = best.c + best.sg * best.h * s + sh, s2 = Math.abs(edge - best.c) / best.h;
    const exact = Math.abs(best.d + sh) < 0.01;
    show(exact && best.ax === "x" ? best.ln.v : null, exact && best.ax === "y" ? best.ln.v : null);
    return s2;
  }
  function guides() {
    const f = document.getElementById("frame"); if (!f) return null;
    if (!el) { el = document.createElement("div"); el.id = "snapG"; el.setAttribute("aria-hidden", "true"); el.innerHTML = '<i class="gx"></i><i class="gy"></i>'; }
    if (el.parentNode !== f) f.appendChild(el);
    return el;
  }
  function show(x, y) {
    const g = (x != null || y != null || el) ? guides() : null; if (!g) return;
    const r = frameRect(), [gx, gy] = g.children;
    if (x != null) gx.style.left = (x - r.left) + "px";
    if (y != null) gy.style.top = (y - r.top) + "px";
    gx.classList.toggle("on", x != null); gy.classList.toggle("on", y != null);
  }
  function hide() { if (el) for (const i of el.children) i.classList.remove("on"); }
  return { targets, move, scale, hide, off, R, LOCK };
})();
window.CutSnap = CutSnap;

const TL = {
  tool: "select", wave: store.get("hfr:wave") === "1", snap: store.get("hfr:snap") !== "0", magnet: store.get("hfr:magnet") !== "0", follow: store.get("hfr:follow") !== "0", strip: store.get("hfr:strip") !== "0", sel: null, drag: null, hist: [], fut: [], playSeg: null,
  h: Math.max(200, Math.min(640, +(store.get("hfr:tlh") || 300))), media: null, img: null, pending: null, lanes: [], geom: null,
};
const G = 112, RULER = 24, NOTES_H = 18, PROG_H = 58, WAVE_H = 30, ROW_H = 22, CAP_H = 18, SFX_H = 16, EDGE = 7;
const clone = o => JSON.parse(JSON.stringify(o));
const BLADE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/></g><g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/></g></svg>')}") 12 12, crosshair`;

/* ---------- the edit model ---------- */
function segs() { const e = S.ed; return e && e.segments && e.segments.length ? e.segments : [{ in: 0, out: S.dur || 0 }]; }
// a footage piece can play slower or faster: sp 0.5 = half speed (twice as long on the timeline)
const spOf = s => (s && +s.sp > 0 ? +s.sp : 1);
const segLen = s => (s.out - s.in) / spOf(s);
const segFxOn = x => !!(x.rev || x.flipH || x.flipV || x.crop || x.mute);
function seqEdited() { const s = segs(); return s.some(x => spOf(x) !== 1 || segFxOn(x)) || !(s.length === 1 && s[0].in < 1e-3 && Math.abs(s[0].out - (S.dur || 0)) < 1e-3); }
function edActive() { return !!S.ed && (seqEdited() || Object.keys(S.ed.clips || {}).length > 0 || !!S.ed.format || Object.keys(S.ed.frame || {}).length > 0 || (S.ed.sfx || []).length > 0 || Object.keys(S.ed.lanes || {}).length > 0); }
function progDur() { return segs().reduce((a, s) => a + segLen(s), 0); }
function segStarts() { let E = 0; return segs().map(s => { const r = E; E += segLen(s); return r; }); }
// source time -> program time (a removed moment maps to the next kept frame)
function toE(t) {
  let E = 0, best = null;
  for (const s of segs()) {
    if (t >= s.in - 1e-6 && t < s.out - 1e-6) return E + (t - s.in) / spOf(s);
    if (s.in >= t && (!best || s.in < best.in)) best = { in: s.in, E };
    E += segLen(s);
  }
  return best ? best.E : E;
}
function toS(E) {
  let acc = 0; const ss = segs();
  for (const s of ss) { const L = segLen(s); if (E < acc + L - 1e-6) return s.in + Math.max(0, E - acc) * spOf(s); acc += L; }
  return ss.length ? ss[ss.length - 1].out : 0;
}
function segAtE(E) { let acc = 0; const ss = segs(); for (let i = 0; i < ss.length; i++) { const L = segLen(ss[i]); if (E < acc + L - 1e-6) return i; acc += L; } return ss.length - 1; }
function seekE(E) { seek(toS(Math.max(0, Math.min(progDur(), E)))); }
function mainClip() { return S.clips.filter(c => c.type === "video").sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] || null; }
function eff(c) {   // a clip with its edits applied (source time)
  if (c.sfx) return { start: c.sfx.start, end: c.sfx.start + c.sfx.dur, del: false, lane: c.sfx.row || 0, sp: 1 };
  const o = S.ed && S.ed.clips && S.ed.clips[c.key];
  return o ? { start: o.start, end: o.start + o.dur, del: !!o.del, lane: o.lane != null ? o.lane : null, sp: +o.sp > 0 ? +o.sp : 1 } : { start: c.start, end: c.end, del: false, lane: null, sp: 1 };
}
/* sound effects placed from the Sounds tab: S.ed.sfx = [{u, id, name, file, start (source time), dur, len, off, vol, row}].
   start is anchored to the footage (it moves with cuts like every clip); dur and off are real seconds of the sound. */
const sfxItems = () => (S.ed && S.ed.sfx) || [];
// kind "ext" = audio taken out of the footage (Extract audio): it plays the footage's own sound from `off` (source time)
// kind "music" = a track from the project's Music/ folder (Music tab): file "Music/<name>", on the Music track (2 rows), same
// move / trim / slip / fades / volume as a sound effect; the blade splits it, and deleting a piece closes the gap after it
const sfxType = it => it.kind === "ext" ? "ext" : it.kind === "music" ? "music" : "sfx";
function sfxClips() { return sfxItems().map(it => ({ key: "sfx:" + it.u, id: it.name || it.id, type: sfxType(it), sfx: it, start: it.start, end: it.start + it.dur, text: "" })); }
// where a placed sound's file is served from: the Cutnote library, or the opened folder for music
const sfxSrc = it => it.kind === "music" ? "/f/" + String(it.file || "").split("/").map(encodeURIComponent).join("/") : "/lib/" + it.file;
function allClips() { return S.clips.concat(sfxClips()); }
function clipBy(key) { return allClips().find(c => c.key === key) || null; }
// where a clip sits in program time: pieces of the kept footage it overlaps (a sound plays in real time from its anchor)
function spansOf(c, e) { e = e || eff(c); if (c.sfx) { const P = toE(c.sfx.start); return [[P, P + c.sfx.dur]]; } return pieces(e.start, e.end); }
// where a clip shows in program time: one piece per kept span it overlaps
function pieces(a, b) {
  const out = []; let E = 0;
  for (const s of segs()) {
    const x = Math.max(a, s.in), y = Math.min(b, s.out), k = spOf(s);
    if (y > x + 1e-4) out.push([E + (x - s.in) / k, E + (y - s.in) / k]);
    E += segLen(s);
  }
  return out;
}
function editable(c) { if (c && c.sfx) return !!S.comp; return S.comp && S.comp.kind === "code" && c !== mainClip(); }

/* ---------- track switches (eye / speaker in the track headers) ---------- */
const LANE_SW = { prog: ["mute", "hide"], wave: ["mute"], lib: ["hide"], video: ["mute", "hide"], other: ["hide"], cap: ["hide"], audio: ["mute"], sfx: ["mute"], ext: ["mute"], music: ["mute"] };
const laneKey = ln => ["prog", "wave", "lib"].includes(ln.type) ? ln.type : ln.type + ":" + (ln.row || 0);
const laneSw = k => (S.ed && S.ed.lanes && S.ed.lanes[k]) || {};
function laneToggle(k, what) {
  if (!S.comp) return;
  tlBegin(); S.ed = S.ed || { segments: null, clips: {} }; S.ed.lanes = S.ed.lanes || {};
  const o = Object.assign({}, S.ed.lanes[k] || {});
  if (k === "prog" && what === "mute") {   // one switch for the footage's sound (older saves kept it on the waveform track)
    const was = !!(o.mute || laneSw("wave").mute);
    if (S.ed.lanes.wave) { delete S.ed.lanes.wave.mute; if (!Object.keys(S.ed.lanes.wave).length) delete S.ed.lanes.wave; }
    o.mute = !was;
  } else o[what] = !o[what];
  if (!o[what]) delete o[what];
  if (Object.keys(o).length) S.ed.lanes[k] = o; else delete S.ed.lanes[k];
  tlCommit(); toast(what === "mute" ? (o.mute ? "Track muted" : "Track unmuted") : (o.hide ? "Track hidden" : "Track showing"));
}
// the switch buttons a lane header shows, right-aligned: [{what, x}] (x = left of the 14 px hit box, the button's centre is x + 7)
function laneIcons(ln) { const w = LANE_SW[ln.type] || []; return w.map((what, i) => ({ what, x: G - 22 - (w.length - 1 - i) * 18 })); }
/* switch animation: per switch (laneKey + what) three eased values, worked out from the time on each draw.
   tog 0 = on, 1 = off (eye shut / speaker struck out); hov = hover; prs = pressed. Nothing redraws once they all settle. */
const SWA = new Map();
const RMQ = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const twVal = (tw, now) => !tw.d || now - tw.t0 >= tw.d ? tw.b : tw.a + (tw.b - tw.a) * easeOut((now - tw.t0) / tw.d);
function twTo(tw, b, ms, now) {
  if (tw.b === b) return;
  tw.a = twVal(tw, now); tw.b = b; tw.t0 = now;
  tw.d = RMQ && RMQ.matches ? 0 : ms * Math.max(0.35, Math.abs(b - tw.a));   // a reversal half-way takes the time that is left
}
function swState(key, off, hot, down, now) {
  let s = SWA.get(key);
  if (!s) { const tw = v => ({ a: v, b: v, t0: 0, d: 0 }); s = { tog: tw(off ? 1 : 0), hov: tw(hot ? 1 : 0), prs: tw(0) }; SWA.set(key, s); }
  twTo(s.tog, off ? 1 : 0, 240, now); twTo(s.hov, hot ? 1 : 0, hot ? 140 : 200, now); twTo(s.prs, down ? 1 : 0, down ? 70 : 170, now);
  if (now - s.tog.t0 < s.tog.d || now - s.hov.t0 < s.hov.d || now - s.prs.t0 < s.prs.d) swKick();
  return { p: twVal(s.tog, now), h: twVal(s.hov, now), d: twVal(s.prs, now) };
}
// one extra frame while a switch moves. The page's frame loop already draws every frame once the player is ready, so
// this only draws itself before that; either way it stops asking once the switches settle.
let swRaf = 0;
function swKick() { if (!swRaf) swRaf = requestAnimationFrame(() => { swRaf = 0; if (!(S.player && S.player.ready)) draw(); }); }
function swRelease() { if (TL.swPress) { TL.swPress = null; draw(); } }
// theme colours as [r, g, b, a] so the switches can blend between them (the canvas normalises any CSS colour)
const COLS = new Map(); let colCtx = null;
function rgbOf(c) {
  let v = COLS.get(c); if (v) return v;
  colCtx = colCtx || document.createElement("canvas").getContext("2d");
  colCtx.fillStyle = "#000"; colCtx.fillStyle = c || "#000"; const s = String(colCtx.fillStyle);
  if (s[0] === "#") v = [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
  else { const m = /^rgba?\(/.test(s) ? s.match(/[\d.]+/g) : null; v = m ? [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1] : [128, 128, 128, 1]; }
  COLS.set(c, v); return v;
}
const mixRGB = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const rgbaS = v => `rgba(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])},${v[3].toFixed(3)})`;

/* ---------- magnetic timeline ---------- */
// on: overlays, captions and sounds stay stuck to the footage under them when you cut, move or retime it.
// off: they keep their place in time instead.
function holdPlaces() {
  if (TL.magnet) return null;
  const m = new Map();
  for (const c of allClips()) { if (c === mainClip()) continue; const e = eff(c); if (!e.del) m.set(c.key, toE(e.start)); }
  return m;
}
function restorePlaces(m) {
  if (!m) return;
  for (const [key, E0] of m) {
    const c = clipBy(key); if (!c) continue;
    const e = eff(c), ns = +toS(Math.min(E0, Math.max(0, progDur() - 1e-3))).toFixed(4);
    if (Math.abs(ns - e.start) < 1e-4) continue;
    if (c.sfx) { c.sfx.start = ns; continue; }
    S.ed.clips = S.ed.clips || {};
    const o = Object.assign({}, S.ed.clips[key] || {}, { start: ns, dur: +(e.end - e.start).toFixed(4), del: false });
    S.ed.clips[key] = o;
  }
}
const fmtOf = () => (S.ed && S.ed.format) || null;

/* ---------- history + saving ---------- */
// UNDO: "tl" | {ink: owner, shapes} | "draft" | {undo, redo} (a step kept elsewhere, e.g. a Library placement): what ⌘Z steps back through, newest last.
// REDO: "tl" | {undo, redo}: what ⇧⌘Z steps forward through. Any new edit clears it.
const UNDO = [], REDO = [];
const HIST = { busy: false };
function tlBegin() { TL.hist.push(clone(S.ed || null)); if (TL.hist.length > 200) TL.hist.shift(); TL.fut = []; REDO.length = 0; UNDO.push("tl"); if (UNDO.length > 400) UNDO.shift(); }
// record an edit that isn't part of S.ed (it undoes and redoes itself, maybe asynchronously)
function histPush(step) { UNDO.push(step); if (UNDO.length > 400) UNDO.shift(); REDO.length = 0; TL.fut = []; tlStatus(); }
function histDrop(step) { for (const L of [UNDO, REDO]) { const i = L.lastIndexOf(step); if (i >= 0) L.splice(i, 1); } tlStatus(); }
async function histRun(step, back) {
  HIST.busy = true;
  try { await (back ? step.undo() : step.redo()); toast((back ? "Undo" : "Redo") + (step.label ? ": " + step.label : "")); }
  catch { toast(back ? "Couldn't undo that" : "Couldn't redo that"); }
  finally { HIST.busy = false; tlStatus(); }
}
// ⌘Z. tlOnly (the timeline's own Undo button): skip drawing marks, step back through timeline and Library edits only.
function undoAny(tlOnly) {
  if (HIST.busy || TL.drag) return;
  if (window.CropOpen) { toast("Finish the crop first: Done or Cancel"); return; }
  for (let i = UNDO.length - 1; i >= 0; i--) {
    const u = UNDO[i];
    if (tlOnly && (u === "draft" || (u && u.ink))) continue;
    UNDO.splice(i, 1);
    if (u === "tl") { if (TL.hist.length) { tlUndo(true); return; } continue; }
    if (u === "draft") { if (INK.draft.length) { INK.draft.pop(); INK.sel = null; updateAt(); inkBump(); return; } continue; }
    if (u && u.ink) { const arr = ownerShapes(u.ink); if (arr) { arr.splice(0, arr.length, ...u.shapes); INK.sel = null; inkCommit(u.ink, true); toast("Undo"); return; } continue; }
    if (u && u.undo) { REDO.push(u); histRun(u, true); return; }
  }
  if (TL.hist.length) tlUndo(true);
}
// ⇧⌘Z / ⌘Y
function redoAny() {
  if (HIST.busy || TL.drag) return;
  if (window.CropOpen) { toast("Finish the crop first: Done or Cancel"); return; }
  while (REDO.length) {
    const r = REDO.pop();
    if (r === "tl") { if (TL.fut.length) { tlRedo(true); return; } continue; }
    if (r && r.redo) { UNDO.push(r); histRun(r, false); return; }
  }
}
function tlCommit() {
  if (S.ed && !edActive()) S.ed = null;
  layoutLanes(); applyClipEdits(); tlStatus(); fmtSync(); draw(); tlSave();
}
// after undo / redo nothing stays selected, on the timeline or on the frame (a leftover frame selection would take the next ⌫)
// a timeline or frame selection (or none) replaces a picked Library component
const libUnpick = () => { if (window.LibDrawer && LibDrawer.unpick) LibDrawer.unpick(); };
function tlUndo(fromStack) { if (!TL.hist.length) return; if (!fromStack) { const k = UNDO.lastIndexOf("tl"); if (k >= 0) UNDO.splice(k, 1); } TL.fut.push(clone(S.ed || null)); REDO.push("tl"); S.ed = TL.hist.pop(); TL.sel = null; FE.sel = null; libUnpick(); tlCommit(); toast("Undo"); }
function tlRedo(fromStack) { if (!TL.fut.length) return; if (!fromStack) { const k = REDO.lastIndexOf("tl"); if (k >= 0) REDO.splice(k, 1); } TL.hist.push(clone(S.ed || null)); UNDO.push("tl"); S.ed = TL.fut.pop(); TL.sel = null; FE.sel = null; libUnpick(); tlCommit(); toast("Redo"); }
function tlSave() {
  if (!S.comp) return;
  clearTimeout(TL.saveT);
  // capture everything now: the version may change before the timer fires
  const comp = S.comp.id, label = S.comp.label, kind = S.comp.kind;
  const edits = S.ed && edActive() ? edPayload() : null;
  const summary = edits ? edSummary() : [];
  const gen = TL.gen = (TL.gen || 0) + 1;
  TL.pending = true;
  TL.saveT = setTimeout(() => { TL.inflight = (async () => {
    try {
      const d = await api("/api/notes", { op: "edits", comp, label, kind, edits, summary });
      if (gen === TL.gen) S.allEdits = d.edits || {};
      const st = await api("/api/stat"); if (gen === TL.gen) S.notesMtime = st.__notes;
    } catch { toast("Couldn't save the timeline edits"); }
    if (gen === TL.gen) { TL.pending = false; if (TL.needSync) tlSync(); }
  })(); }, 350);
}
const sortKeys = v => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])])) : v;
const canon = e => e ? JSON.stringify(sortKeys({ segments: e.segments || null, clips: e.clips || {}, format: e.format || null, frame: e.frame || {}, sfx: e.sfx || [], lanes: e.lanes || {} })) : "null";
function edPayload() { return { segments: seqEdited() ? clone(segs()) : null, clips: clone(S.ed.clips || {}), format: fmtOf() ? clone(fmtOf()) : null, frame: clone(S.ed.frame || {}), sfx: clone(S.ed.sfx || []), lanes: clone(S.ed.lanes || {}) }; }
function edFrom(srv) { return srv ? { segments: srv.segments ? clone(srv.segments) : null, clips: clone(srv.clips || {}), format: srv.format ? clone(srv.format) : null, frame: clone(srv.frame || {}), sfx: clone(srv.sfx || []), lanes: clone(srv.lanes || {}) } : null; }
// called whenever notes are (re)loaded: adopt the server's edits for this version unless ours are still being saved
function tlSync() {
  if (!S.comp || TL.pending || TL.drag || (typeof IN !== "undefined" && IN.begun) || (window.SoundPanel && SoundPanel.begun) || window.CropOpen) { TL.needSync = true; return; }
  TL.needSync = false;
  const srv = (S.allEdits || {})[S.comp.id] || null;
  const mine = S.ed && edActive() ? edPayload() : null;
  if (canon(srv) === canon(mine)) return;
  S.ed = edFrom(srv);
  TL.sel = null; FE.sel = null; libUnpick(); TL.hist = []; TL.fut = [];
  for (const L of [UNDO, REDO]) for (let i = L.length - 1; i >= 0; i--) if (L[i] === "tl") L.splice(i, 1);
  layoutLanes(); applyClipEdits(); tlStatus(); fmtSync(); draw();
}
function edSummary() {
  const out = [], ss = segs();
  const capsIn = (a, b) => S.clips.filter(c => c.type === "cap" && c.start < b && c.end > a).map(c => c.text).join(" ").replace(/\s+/g, " ").trim().slice(0, 160);
  if (seqEdited()) {
    out.push("Main footage, play these spans in this order: " + ss.map(s => fmt(s.in) + "–" + fmt(s.out) + (spOf(s) !== 1 ? ` at ${spOf(s)}× speed` : "")).join(", "));
    for (const s of ss) if (spOf(s) !== 1) out.push(spOf(s) < 1
      ? `Slow motion: ${fmt(s.in)}–${fmt(s.out)} plays at ${spOf(s)}× (${segLen(s).toFixed(2)} s on screen). Retime with frame blending or optical-flow interpolation (ffmpeg minterpolate) so it stays smooth; slow its audio with atempo or replace it with room tone, and keep captions on the words`
      : `Speed up: ${fmt(s.in)}–${fmt(s.out)} plays at ${spOf(s)}× (${segLen(s).toFixed(2)} s on screen); speed its audio with atempo (pitch kept) and retime captions to match`);
    const sorted = [...ss].sort((a, b) => a.in - b.in); let cur = 0;
    const rem = [];
    for (const s of sorted) { if (s.in > cur + 0.01) rem.push([cur, s.in]); cur = Math.max(cur, s.out); }
    if (cur < S.dur - 0.01) rem.push([cur, S.dur]);
    for (const [a, b] of rem) { const c = capsIn(a, b); out.push(`Cut ${fmt(a)}–${fmt(b)} (${(b - a).toFixed(2)} s)` + (c ? `: "${c}"` : "")); }
    for (let i = 1; i < ss.length; i++) if (ss[i].in < ss[i - 1].in) out.push(`Moved ${fmt(ss[i].in)}–${fmt(ss[i].out)} to play after ${fmt(ss[i - 1].in)}–${fmt(ss[i - 1].out)}`);
  }
  for (const [key, o] of Object.entries((S.ed && S.ed.clips) || {})) {
    const c = S.clips.find(x => x.key === key); if (!c) continue;
    if (+o.sp > 0 && +o.sp !== 1 && !o.del) out.push(`Play ${c.id} [b-roll] at ${o.sp}× speed${o.sp < 1 ? " (slow motion, smooth it with frame blending)" : ""}: it now runs ${fmt(o.start)}–${fmt(o.start + o.dur)}`);
    const name = `${c.id}${c.text ? ` ("${c.text.slice(0, 50)}")` : ""} [${c.type === "cap" ? "caption" : c.type === "audio" ? "sound" : c.type === "video" ? "b-roll" : "overlay"}]`;
    if (o.del) { out.push(`Remove ${name} (was ${fmt(c.start)}–${fmt(c.end)})`); continue; }
    if (o.lane != null) out.push(`Layer ${name}: put it on row ${o.lane + 1} of its track in the editor (top row is in front), so it sits ${o.lane === 0 ? "in front of" : "behind"} the clips on the rows above it`);
    const moved = Math.abs(o.start - c.start) > 1e-3, len = Math.abs(o.dur - (c.end - c.start)) > 1e-3;
    if (moved && !len) out.push(`Move ${name} ${o.start > c.start ? "later" : "earlier"} by ${Math.abs(o.start - c.start).toFixed(2)} s: ${fmt(c.start)}–${fmt(c.end)} → ${fmt(o.start)}–${fmt(o.start + o.dur)} (animations move with it)`);
    else if (len) out.push(`Retime ${name}: ${fmt(c.start)}–${fmt(c.end)} → ${fmt(o.start)}–${fmt(o.start + o.dur)}`);
  }
  for (const [key, o] of Object.entries((S.ed && S.ed.frame) || {})) {
    const bits = [];
    if (o.hide) bits.push("remove it");
    const one = v => String(v).replace(/\s+/g, " ").trim();
    if (o.dx || o.dy) bits.push(`move it ${o.dx ? Math.abs(Math.round(o.dx)) + " px " + (o.dx > 0 ? "right" : "left") : ""}${o.dx && o.dy ? " and " : ""}${o.dy ? Math.abs(Math.round(o.dy)) + " px " + (o.dy > 0 ? "down" : "up") : ""} (CSS translate in its own pixels, which are canvas pixels unless a parent is scaled; the whole time it's on screen)`);
    if (o.s && Math.abs(o.s - 1) > 1e-3) bits.push(`scale it to ${Math.round(o.s * 100)}% (CSS scale around its transform origin)`);
    if (o.color) bits.push(`make its text colour ${o.color}`);
    if (o.text != null) bits.push(`change its text${o.was != null ? ` from "${one(o.was).slice(0, 120)}"` : ""} to "${one(o.text).slice(0, 300)}"`);
    if (bits.length) out.push(isMainKey(key) ? `Your footage itself on the frame: ${bits.join("; ")}` : `On the frame, ${one(o.name || key)} (element ${key}${key[0] === "/" ? ", child path from the composition root" : ""}): ${bits.join("; ")}`);
  }
  ss.forEach((s, i) => {
    const bits = [s.rev && "play it in reverse (video and audio)", s.flipH && "mirror it left to right", s.flipV && "flip it upside down",
      s.crop && `crop it: ${Math.round(s.crop.l * 100)}% off the left, ${Math.round(s.crop.r * 100)}% off the right, ${Math.round(s.crop.t * 100)}% off the top, ${Math.round(s.crop.b * 100)}% off the bottom (leave the cropped area black, don't zoom)`,
      s.mute && "take its audio out (it now lives on the Audio track, see below)"].filter(Boolean);
    if (bits.length) out.push(`Footage ${fmt(s.in)}–${fmt(s.out)}: ${bits.join("; ")}`);
  });
  for (const [key, o] of Object.entries((S.ed && S.ed.clips) || {})) {
    const c = S.clips.find(x => x.key === key); if (!c || o.del) continue;
    const bits = [o.rev && "play it in reverse", o.flipH && "mirror it left to right", o.flipV && "flip it upside down", o.crop && `crop ${Math.round(o.crop.l * 100)}% left, ${Math.round(o.crop.r * 100)}% right, ${Math.round(o.crop.t * 100)}% top, ${Math.round(o.crop.b * 100)}% bottom`].filter(Boolean);
    if (bits.length) out.push(`${c.id} [b-roll]: ${bits.join("; ")}`);
  }
  for (const it of sfxItems().filter(x => x.kind === "ext")) {
    const P = toE(it.start), opts = [it.vol != null && it.vol !== 1 && `volume ${Math.round(it.vol * 100)}%`, it.fadeIn > 0 && `fade in ${it.fadeIn.toFixed(2)} s`, it.fadeOut > 0 && `fade out ${it.fadeOut.toFixed(2)} s`,
      it.sp > 0 && it.sp !== 1 && `at ${it.sp}× speed like its footage`, it.rev && "reversed like its footage", it.denoise && "reduce background noise", it.voice && "make the voice clearer (EQ: cut below 80 Hz, lift 2–5 kHz)", it.norm && "even out the loudness (-14 LUFS)", it.mute && "muted"].filter(Boolean);
    out.push(`${laneSw("ext:" + (it.row || 0)).mute ? "(Muted track, leave out) " : ""}Footage audio, separated: play the footage's own sound from ${fmt(it.off)} (${(it.dur * (it.sp || 1)).toFixed(2)} s of it) for ${it.dur.toFixed(2)} s at ${fmt(P)} on the edited timeline${opts.length ? ": " + opts.join(", ") : ""}`);
  }
  for (const it of sfxItems().filter(x => x.kind !== "ext" && x.kind !== "music")) {
    const P = toE(it.start), muted = laneSw("sfx:" + (it.row || 0)).mute;
    out.push(`${muted ? "(Muted track, leave out) " : ""}Sound effect "${it.name || it.id}" (Cutnote library file library/${it.file}) at ${fmt(P)} on the edited timeline (composition time ${fmt(it.start)}), ${it.dur.toFixed(2)} s${it.off > 0.005 ? `, starting ${it.off.toFixed(2)} s into the sound` : ""}, volume ${Math.round((it.vol == null ? 1 : it.vol) * 100)}%`);
  }
  for (const it of sfxItems().filter(x => x.kind === "music").sort((a, b) => (a.row || 0) - (b.row || 0) || toE(a.start) - toE(b.start))) out.push(musicLine(it));
  const NAMES = { prog: "Footage", wave: "Footage audio", lib: "Library", video: "B-roll", other: "Overlays", cap: "Captions", audio: "Sound", sfx: "Sound FX", ext: "Audio", music: "Music" };
  for (const [k, o] of Object.entries((S.ed && S.ed.lanes) || {})) {
    const [t, r] = k.split(":"), ln = TL.lanes.find(l => laneKey(l) === k);
    const who = ln && ln.clips && ln.clips.length ? ": " + ln.clips.map(c => c.id).slice(0, 12).join(", ") : "";
    const name = NAMES[t] + (r != null ? " row " + (+r + 1) : "");
    if (o.hide) out.push(t === "prog" ? "Footage track switched off: show black where the footage is (keep its timing and audio)" : `${name} track switched off: leave these out${who}`);
    if (o.mute) out.push(t === "wave" || t === "prog" ? "Mute the footage's own audio" : `${name} track muted: no audio from it${who}`);
  }
  const f = fmtOf();
  if (f) {
    const b = cropBox(f), px = (v, n) => Math.round(v * n);
    out.push(`Deliver as ${f.aspect} (${f.w}×${f.h}): crop the ${S.W}×${S.H} canvas to x ${px(b.x, S.W)}–${px(b.x + b.w, S.W)}, y ${px(b.y, S.H)}–${px(b.y + b.h, S.H)} (window centre ${Math.round(f.x * 100)}%, ${Math.round(f.y * 100)}%), then scale to ${f.w}×${f.h}. Re-check captions and overlays sit inside that window.`);
  }
  return out;
}
// one music clip, spelled out for whoever bakes it into a build: which file, which part of the track, where, how loud, fades
const volDb = v => v > 0 ? (20 * Math.log10(v) >= 0 ? "+" : "") + (20 * Math.log10(v)).toFixed(1) + " dB" : "silent";
function musicLine(it) {
  const P = toE(it.start), vol = it.vol == null ? 1 : it.vol, off = it.off || 0, end = Math.min(P + it.dur, progDur());
  const why = [laneSw("music:" + (it.row || 0)).mute && "muted track", it.mute && "muted clip"].filter(Boolean);
  const fades = [it.fadeIn > 0 ? `fade in ${(+it.fadeIn).toFixed(2)} s` : "no fade in", it.fadeOut > 0 ? `fade out ${(+it.fadeOut).toFixed(2)} s` : "no fade out"];
  return `${why.length ? `(${why.join(", ")}: leave out) ` : ""}Music "${it.name || it.file}"${it.artist ? " by " + it.artist : ""} (file ${it.file} in the opened folder), Music row ${(it.row || 0) + 1}: ` +
    `play the track from ${fmt(off)} for ${it.dur.toFixed(2)} s (track ${fmt(off)}–${fmt(off + it.dur)}), placed at ${fmt(P)}–${fmt(end)} on the edited timeline (composition time ${fmt(it.start)}), ` +
    `volume ${Math.round(vol * 100)}% (${volDb(vol)}), ${fades.join(", ")}. Mix it under the footage's own sound` + (P + it.dur > progDur() + 0.01 ? "; it runs past the end of the video, so stop it there" : "");
}
function tlStatus() {
  const el = $("#tlEdits"); if (!el) return;
  const n = edActive() ? edSummary().length : 0;
  const vid = S.comp && S.comp.kind === "video";
  el.textContent = n ? n + (n === 1 ? " edit" : " edits") + (vid ? " · not exported yet" : " · not in the build yet") : "No timeline edits";
  el.title = n ? (vid ? "Export cut writes a new file next to the original" : "Ask Claude to bake these into a clean rebuild from the source footage") : "";
  el.classList.toggle("on", !!n);
  $("#tlReset").style.display = n ? "" : "none";
  $("#tlExport").style.display = n && vid ? "inline-flex" : "none";
  $("#tlUndo").disabled = !TL.hist.length && !UNDO.some(u => u && u.undo);
  $("#tlRedo").disabled = !REDO.some(r => (r === "tl" && TL.fut.length) || (r && r.redo));
}

/* ---------- live preview of clip edits inside the composition ---------- */
function compFrame() {
  const p = S.player && S.player.el; if (!p || p.tagName === "VIDEO") return null;
  const f = p.shadowRoot && p.shadowRoot.querySelector("iframe");
  try { return f && f.contentDocument ? { w: f.contentWindow, d: f.contentDocument } : null; } catch { return null; }
}
const TWEEN0 = new WeakMap();
function compEls(fr) {
  const d = fr.d, all = [...d.querySelectorAll("[data-start]")], byKey = new Map();
  for (const c of S.clips) {
    const el = c.elId ? d.getElementById(c.elId) : all[c.idx];
    if (el && (c.elId || el.tagName.toLowerCase() === c.tag)) byKey.set(c.key, el);
  }
  return byKey;
}

/* ---------- on-frame editing: select an overlay or caption on the frame, drag to move, corner to resize, double-click to retype ---------- */
// Stored as S.ed.frame[key] = {dx, dy, s, hide, text, was, name}. key is "#id", or "/i.j.k" (child path from the composition root).
// Works on anything visible in the composition, including elements its scripts build at runtime.
// Applied with !important rules on CSS translate/scale, which stack on top of the composition's own GSAP transforms.
const FE = { drag: null, text0: new Map(), box: null, sel: null, hoverT: 0, hoverC: null };
const feEdits = () => (S.ed && S.ed.frame) || {};
const feRoot = d => d.querySelector("[data-composition-id]") || d.body;
function feKey(el, d) {
  if (el.id && d.querySelectorAll("#" + CSS.escape(el.id)).length === 1) return "#" + el.id;
  const root = feRoot(d), path = [];
  for (let n = el; n && n !== root; n = n.parentElement) { if (!n.parentElement) return null; path.unshift([...n.parentElement.children].indexOf(n)); }
  return "/" + path.join(".");
}
function feResolve(key, d) {
  if (key === "@main") return S.comp && S.comp.kind === "video" && S.player ? S.player.el : null;   // a plain video file: the video itself
  if (key[0] === "#") return d.getElementById(key.slice(1));
  if (key[0] !== "/") return null;
  let el = feRoot(d); for (const i of key.slice(1).split(".").filter(Boolean)) el = el && el.children[+i];
  return el || null;
}
// the main footage on the frame: "@main" for a plain video file, or the composition's main video element
function isMainKey(key) { const m = mainClip(); return key === "@main" || !!(m && m.elId && key === "#" + m.elId); }
function feName(el) {
  const t = feText0(el).slice(0, 50), cls = typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "";
  return (el.id ? "#" + el.id : el.tagName.toLowerCase() + (cls ? "." + cls : "")) + (t ? ` "${t}"` : "");
}
function applyVideoFe() {   // plain video file: move/resize the <video> itself (dx, dy in video pixels)
  const v = S.player && S.player.el; if (!v || v.tagName !== "VIDEO") return;
  const o = feEdits()["@main"] || {}, b = v.getBoundingClientRect(), s0 = parseFloat(getComputedStyle(v).scale) || 1;
  const k = (b.width / s0) / (v.videoWidth || S.W);
  v.style.translate = o.dx || o.dy ? `${(o.dx || 0) * k}px ${(o.dy || 0) * k}px` : "";
  v.style.scale = o.s && o.s !== 1 ? String(o.s) : "";
}
function applyFrameEdits(fr) {
  if (fr && fr.d === document) { applyVideoFe(); return; }
  const d = fr.d;
  for (const [node, v] of FE.text0) node.nodeValue = v;
  FE.text0.clear();
  for (const e of d.querySelectorAll("[data-hfr-fe]")) e.removeAttribute("data-hfr-fe");
  let st = d.getElementById("hfr-fe-style");
  if (!st) { st = d.createElement("style"); st.id = "hfr-fe-style"; (d.head || d.documentElement).appendChild(st); }
  const rules = []; let n = 0;
  for (const [key, o] of Object.entries(feEdits())) {   // text first (it can replace children), then positions
    const el = feResolve(key, d); if (el && o.text != null) feRetype(el, o.text, d);
  }
  for (const [key, o] of Object.entries(feEdits())) {
    const el = feResolve(key, d); if (!el || !(o.dx || o.dy || (o.s && o.s !== 1) || o.hide || o.color)) continue;
    const id = "f" + n++, sel = `[data-hfr-fe="${id}"]`; el.setAttribute("data-hfr-fe", id);
    if (o.hide) { rules.push(`${sel}{visibility:hidden !important}`); continue; }
    if (o.dx || o.dy || (o.s && o.s !== 1)) rules.push(`${sel}{translate:${+o.dx || 0}px ${+o.dy || 0}px !important;scale:${+o.s || 1} !important}`);
    if (/^#[0-9a-f]{6}$/i.test(o.color || "")) rules.push(`${sel},${sel} *{color:${o.color} !important;-webkit-text-fill-color:${o.color} !important}`);
  }
  st.textContent = rules.join("\n");
}
// put new words into the element's existing text pieces, so word-by-word styling and animation keep working
function feRetype(el, text, d) {
  const nodes = [], tw = d.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (n.nodeValue.trim()) nodes.push(n);
  if (!nodes.length) return;
  const words = text.split(/\s+/).filter(Boolean), last = nodes.length - 1;
  nodes.forEach((n, i) => {
    if (!FE.text0.has(n)) FE.text0.set(n, n.nodeValue);
    const m = n.nodeValue.match(/^(\s*)[\s\S]*?(\s*)$/);
    const part = nodes.length === 1 ? text : i < last ? (words[i] || "") : words.slice(last).join(" ");
    n.nodeValue = m[1] + part + m[2];
  });
}
const feText0 = el => (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
function feGeom() {
  if (S.comp && S.comp.kind === "video" && S.player && S.player.el && S.player.el.tagName === "VIDEO") {   // plain video: page coordinates
    const v = S.player.el, b = v.getBoundingClientRect(); if (!b.width) return null;
    return { video: v, fr: { d: document, w: window }, r: { left: 0, top: 0 }, k: 1, vk: b.width / ((feEdits()["@main"] || {}).s || 1) / (v.videoWidth || S.W) };
  }
  const fr = compFrame(); if (!fr || !S.comp || S.comp.kind !== "code") return null;
  const ifr = S.player.el.shadowRoot && S.player.el.shadowRoot.querySelector("iframe"); if (!ifr) return null;
  const r = ifr.getBoundingClientRect(); if (!r.width) return null;
  return { fr, r, k: r.width / (fr.w.innerWidth || S.W) };
}
function feRect(el, g) { const b = el.getBoundingClientRect(); return { x: g.r.left + b.left * g.k, y: g.r.top + b.top * g.k, w: b.width * g.k, h: b.height * g.k }; }
function feOpacity(el, w) {
  if (el === (S.player && S.player.el) && el.tagName === "VIDEO") return 1;
  let o = 1;
  for (let a = el; a && a.nodeType === 1; a = a.parentElement) {
    const cs = w.getComputedStyle(a); if (cs.display === "none" || cs.visibility === "hidden") return 0;
    o *= +cs.opacity; if (o < 0.05) return 0;
  }
  return o;
}
// is this element something you'd move as one piece? (not the footage, not a full-screen layer)
function feUnit(el, g) {
  const main = mainClip(), root = feRoot(g.fr.d), b = el.getBoundingClientRect(), W = g.fr.w.innerWidth, H = g.fr.w.innerHeight;
  if (el === root || el === g.fr.d.body || (main && main.elId && el.id === main.elId)) return false;
  if (b.width * b.height > 0.8 * W * H || b.height > 1.15 * H || b.width > 1.15 * W) return false;
  return true;
}
// what's under a point (client coords): the smallest visible piece, and the unit to move (nearest timed/id'd ancestor that isn't full-screen)
function feHit(cx, cy) {
  const g = feGeom(); if (!g) return null;
  if (g.video) {   // a plain video file: the only thing to grab is the video
    const b = g.video.getBoundingClientRect();
    if (cx < b.left || cx > b.right || cy < b.top || cy > b.bottom) return null;
    return { g, leaf: g.video, el: g.video, key: "@main", r: feRect(g.video, g), main: true };
  }
  const px = (cx - g.r.left) / g.k, py = (cy - g.r.top) / g.k, d = g.fr.d;
  let best = null;
  for (const e of feRoot(d).querySelectorAll("*")) {
    if (e.closest("svg") && e.tagName.toLowerCase() !== "svg") continue;
    if (e.closest(".cutnote-live")) continue;   // library previews aren't part of the build: library.js moves those
    const b = e.getBoundingClientRect();
    if (b.width < 2 || b.height < 2 || px < b.left || px > b.right || py < b.top || py > b.bottom) continue;
    if (best && b.width * b.height >= best.a) continue;
    if (!feUnit(e, g) || feOpacity(e, g.fr.w) < 0.05) continue;
    best = { leaf: e, a: b.width * b.height };
  }
  if (!best) {   // nothing on top here: your own footage is what you grabbed
    const m = mainClip(), el = m && compEls(g.fr).get(m.key);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    if (px < b.left || px > b.right || py < b.top || py > b.bottom) return null;
    return { g, leaf: el, el, key: feKey(el, d), r: feRect(el, g), main: true };
  }
  let unit = best.leaf;
  for (let a = best.leaf; a && a !== feRoot(d); a = a.parentElement) {
    if (!feUnit(a, g)) break;
    if (a.hasAttribute("data-start") || a.id) { unit = a; break; }
  }
  return { g, leaf: best.leaf, el: unit, key: feKey(unit, d), r: feRect(unit, g) };
}
function feSelected() {
  if (!FE.sel) return null;
  const g = feGeom(); if (!g) return null;
  const el = feResolve(FE.sel, g.fr.d); if (!el || feOpacity(el, g.fr.w) < 0.05) return null;
  const r = feRect(el, g); return r.w >= 2 && r.h >= 2 ? { key: FE.sel, el, r, g } : null;
}
function feSelect(key) {
  FE.sel = key;
  // keep the timeline in step when the piece is also a clip there
  const c = key && key[0] === "#" ? S.clips.find(x => x.elId === key.slice(1)) : null;
  TL.sel = c ? { kind: "clip", key: c.key } : null; draw();
}
// selection box drawn over the frame each animation frame
const feBox = document.createElement("div"); feBox.id = "elsel";
feBox.innerHTML = '<i data-h="0"></i><i data-h="1"></i><i data-h="2"></i><i data-h="3"></i><span></span>';
function feDraw() {
  // a frame selection of a timeline clip lives only as long as that clip is selected on the timeline (undo, reset and
  // sync clear the timeline selection; a leftover frame selection would otherwise take the next ⌫ and hide the clip)
  if (FE.sel && !TL.sel && !FE.drag && FE.sel[0] === "#" && S.clips.some(x => x.elId === FE.sel.slice(1))) FE.sel = null;
  if (!FE.sel && TL.sel && TL.sel.kind === "clip") { const c = S.clips.find(x => x.key === TL.sel.key); if (c && c.elId && editable(c) && c.type !== "audio") FE.sel = "#" + c.elId; }
  if (FE.sel && TL.sel && TL.sel.kind === "clip") { const c = S.clips.find(x => x.key === TL.sel.key); if (c && c.elId && "#" + c.elId !== FE.sel && editable(c) && c.type !== "audio") FE.sel = "#" + c.elId; }
  const s = INK.tool === "select" ? feSelected() : null,   // on-frame pieces aren't drawings: hiding drawings keeps their selection box
  fr = $("#frame").getBoundingClientRect();
  if (!s) { if (FE.box) { feBox.style.display = "none"; FE.box = null; } return; }
  FE.box = { x: s.r.x, y: s.r.y, w: s.r.w, h: s.r.h };
  Object.assign(feBox.style, { display: "block", left: (s.r.x - fr.left) + "px", top: (s.r.y - fr.top) + "px", width: s.r.w + "px", height: s.r.h + "px" });
  feBox.classList.toggle("in", s.r.y - fr.top < 26);   // no room above: the name tag goes inside, never cut off
  const o = feEdits()[s.key] || {}, lbl = (isMainKey(s.key) ? "Your footage" : s.el.id || s.el.tagName.toLowerCase()) + (o.s && o.s !== 1 ? "  " + Math.round(o.s * 100) + "%" : "");
  const sp = feBox.querySelector("span"); if (sp.textContent !== lbl) sp.textContent = lbl;
}
function feCorner(cx, cy) {
  const b = FE.box; if (!b) return -1;
  const pts = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
  return pts.findIndex(([x, y]) => Math.abs(cx - x) <= 9 && Math.abs(cy - y) <= 9);
}
function feCursor(cx, cy) {
  const k = feCorner(cx, cy); if (k >= 0) return k % 2 ? "nesw-resize" : "nwse-resize";
  const now = performance.now(); if (now - FE.hoverT > 90) { FE.hoverT = now; FE.hoverC = feHit(cx, cy) ? "move" : null; }
  return FE.hoverC;
}
function feSet(key, patch, name) {
  S.ed = S.ed || { segments: null, clips: {} }; S.ed.frame = S.ed.frame || {};
  const o = Object.assign({}, S.ed.frame[key] || {}, patch);
  for (const k of Object.keys(o)) if (o[k] == null) delete o[k];
  if (name && !o.name) o.name = name;
  if (!o.dx && !o.dy && (!o.s || o.s === 1) && !o.hide && o.text == null && !o.color) delete S.ed.frame[key]; else S.ed.frame[key] = o;
}
// pointer down on the frame with the select tool, after no drawing mark was hit
function feDown(e) {
  if (!S.comp || (S.comp.kind !== "code" && S.comp.kind !== "video")) return false;
  libUnpick();
  const k = feCorner(e.clientX, e.clientY), sel = k >= 0 ? feSelected() : null;
  if (sel) {
    const o = feEdits()[sel.key] || {}, cx = sel.r.x + sel.r.w / 2, cy = sel.r.y + sel.r.h / 2;
    FE.drag = { kind: "scale", key: sel.key, name: sel.key === "@main" || (mainClip() && sel.el.id && sel.el.id === mainClip().elId) ? "Your footage" : feName(sel.el), cx, cy, d0: Math.max(4, Math.hypot(e.clientX - cx, e.clientY - cy)), s0: o.s || 1,
      hw: sel.r.w / 2 / (o.s || 1), hh: sel.r.h / 2 / (o.s || 1), lines: CutSnap.targets(feOthers(sel.el, sel.g)) };
  } else {
    const h = feHit(e.clientX, e.clientY);
    if (!h || !h.key) { if (FE.sel) feSelect(null); return false; }
    feSelect(h.key); if (!h.main) feTextPick(h); else { FE.textKey = null; FE.textFor = h.key; }
    const o = feEdits()[h.key] || {};
    FE.drag = { kind: "move", key: h.key, name: h.main ? "Your footage" : feName(h.el), x0: e.clientX, y0: e.clientY, dx0: o.dx || 0, dy0: o.dy || 0, k: h.g.video ? h.g.vk : h.g.k,
      box0: h.r, lines: CutSnap.targets(feOthers(h.el, h.g)) };
  }
  TL.drag = { kind: "frame" };   // hold back server syncs until the drag ends
  if (S.playing) pause();
  return true;
}
function feMove(e) {
  const d = FE.drag; if (!d) return false;
  if (!d.began) { if (d.kind === "move" && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 3) return true; tlBegin(); d.began = true; }
  if (d.kind === "move") {
    let mx = e.clientX - d.x0, my = e.clientY - d.y0, lockX = false, lockY = false;
    if (e.shiftKey) { if (Math.abs(mx) > Math.abs(my)) { my = 0; lockY = true; } else { mx = 0; lockX = true; } }   // ⇧ keeps it on one axis
    // soft snap: the piece's edges and centre to the frame's centre, thirds, quarters and edges (⌥ moves freely)
    const sn = d.box0 ? CutSnap.move({ left: d.box0.x + mx, top: d.box0.y + my, width: d.box0.w, height: d.box0.h }, e, { lines: d.lines, lockX, lockY }) : { dx: 0, dy: 0 };
    const q = (v, exact) => exact ? Math.round(v * 100) / 100 : Math.round(v);
    const dx = q(d.dx0 + (mx + sn.dx) / d.k, sn.x), dy = q(d.dy0 + (my + sn.dy) / d.k, sn.y);
    feSet(d.key, { dx, dy }, d.name);
  } else {
    let s = Math.max(0.1, Math.min(8, d.s0 * Math.hypot(e.clientX - d.cx, e.clientY - d.cy) / d.d0));
    if (d.hw) s = CutSnap.scale(d.cx, d.cy, d.hw, d.hh, s, e, { lines: d.lines });   // an edge lands softly on a line
    feSet(d.key, { s: Math.round(Math.max(0.1, Math.min(8, s)) * 10000) / 10000 }, d.name);
  }
  const fr = compFrame(); if (fr) applyFrameEdits(fr); else applyVideoFe();
  return true;
}
// other pieces showing now (client rects), so a dragged piece can line up with them; never the footage or full-screen layers
function feOthers(skip, g) {
  if (!g || g.video) return [];
  const out = [];
  try {
    for (const [, el] of compEls(g.fr)) {
      if (el === skip || el.contains(skip) || skip.contains(el) || !feUnit(el, g) || feOpacity(el, g.fr.w) < 0.05) continue;
      const r = feRect(el, g); if (r.w > 2 && r.h > 2) out.push({ left: r.x, top: r.y, width: r.w, height: r.h });
      if (out.length > 24) break;
    }
  } catch (err) {}
  return out;
}
function feUp() {
  const d = FE.drag; if (!d) return false; FE.drag = null; TL.drag = null; CutSnap.hide();
  if (d.began) { tlCommit(); toast(d.kind === "move" ? "Moved" : "Resized to " + Math.round(((feEdits()[d.key] || {}).s || 1) * 100) + "%"); }
  if (TL.needSync) setTimeout(tlSync, 0);
  return true;
}
// ⌫ on a selected piece that isn't a timeline clip hides it (undo brings it back)
function feDelete() {
  if (!FE.sel || TL.sel) return false;   // a timeline selection wins: ⌫ deletes that instead
  if (isMainKey(FE.sel)) { toast("That's your footage: hide it with the eye on its track instead"); return true; }
  const s = feSelected(); if (!s) return false;
  tlBegin(); feSet(FE.sel, { hide: true }, feName(s.el)); feSelect(null); tlCommit(); toast("Hidden (⌘Z brings it back)"); return true;
}
// the text piece under the pointer for a hit: a caption as one line, elsewhere the smallest block of text
function feTextPick(h) {
  const w = h.g.fr.w, isCap = el => /(^|[\s_-])cap/i.test((el.id || "") + " " + (typeof el.className === "string" ? el.className : ""));
  let leaf = h.leaf;
  while (leaf && !(leaf.textContent || "").trim() && leaf !== h.el) leaf = leaf.parentElement;
  for (let a = leaf; a && a !== h.el.parentElement; a = a.parentElement) if (isCap(a)) { leaf = a; break; }
  while (leaf && leaf !== h.el && w.getComputedStyle(leaf).display === "inline" && leaf.parentElement && (leaf.parentElement.textContent || "").trim().length < 200) leaf = leaf.parentElement;
  const key = leaf && (leaf.textContent || "").trim() ? feKey(leaf, h.g.fr.d) : null;
  FE.textKey = key; FE.textFor = h.key;
  return key;
}
// double-click: open the sidebar with the text ready to change
function feText(cx, cy) {
  const h = feHit(cx, cy); if (!h) return false;
  feSelect(h.key); const key = feTextPick(h); if (S.playing) pause();
  renderInsp();
  if (!key) { toast("No text there: use the sidebar to move or resize it"); return true; }
  const ta = $("#inspText"); setTimeout(() => { ta.focus(); ta.select(); }, 60);
  return true;
}

function applyClipEdits() {
  const fr = compFrame(); if (!fr) { applyVideoFe(); mainFx(true); return; }
  const { w, d } = fr;
  prewarm(fr);   // once per loaded version, after its player is ready
  const byKey = compEls(fr);
  for (const e of d.querySelectorAll("[data-hfr-lm]")) { e.muted = e.dataset.hfrLm === "1"; e.removeAttribute("data-hfr-lm"); }   // track mutes come off first, then deletes, then both go back on
  applyFrameEdits(fr);
  const tls = Object.values(w.__timelines || {}).filter(t => t && t.getChildren);
  const tweens = tls.flatMap(t => t.getChildren(true, true, false));
  // put back what we changed last time, then apply the current edits
  for (const tw of tweens) if (TWEEN0.has(tw)) tw.startTime(TWEEN0.get(tw));
  for (const [key, el] of byKey) {
    if (el.dataset.hfrStart != null) {
      el.setAttribute("data-start", el.dataset.hfrStart);
      if (el.dataset.hfrDur) el.setAttribute("data-duration", el.dataset.hfrDur); else el.removeAttribute("data-duration");
    }
    if (el.dataset.hfrZ != null) { el.style.zIndex = el.dataset.hfrZ; delete el.dataset.hfrZ; }
    if (el.dataset.hfrHid) { el.style.display = el.dataset.hfrDisp || ""; if ("muted" in el) el.muted = el.dataset.hfrMuted === "1"; delete el.dataset.hfrHid; }
  }
  const edits = (S.ed && S.ed.clips) || {};
  for (const [key, o] of Object.entries(edits)) {
    const el = byKey.get(key), c = S.clips.find(x => x.key === key); if (!el || !c) continue;
    if (el.dataset.hfrStart == null) { el.dataset.hfrStart = el.getAttribute("data-start"); el.dataset.hfrDur = el.getAttribute("data-duration") || ""; }
    if (o.del) {
      el.dataset.hfrHid = "1"; el.dataset.hfrDisp = el.style.display; el.style.display = "none";
      if ("muted" in el) { el.dataset.hfrMuted = el.muted ? "1" : "0"; el.muted = true; }
      continue;
    }
    el.setAttribute("data-start", o.start.toFixed(3));
    if (c.hasDur || Math.abs(o.dur - (c.end - c.start)) > 1e-4) el.setAttribute("data-duration", o.dur.toFixed(3));
    const delta = o.start - c.start;
    if (Math.abs(delta) > 1e-4) for (const tw of tweens) {
      const tg = tw.targets ? tw.targets() : [];
      if (tg.some(t => t && t.nodeType === 1 && (t === el || el.contains(t)))) {
        if (!TWEEN0.has(tw)) TWEEN0.set(tw, tw.startTime());
        tw.startTime(TWEEN0.get(tw) + delta);
      }
    }
  }
  // layer order preview: when any clip of a kind was moved to another row, order that kind by row (top row in front)
  const rowOf = new Map(); for (const ln of TL.lanes) if (ln.clips) for (const c of ln.clips) rowOf.set(c.key, ln.row);
  for (const type of ["video", "other", "cap", "audio"]) {
    const list = S.clips.filter(c => c.type === type && byKey.has(c.key) && rowOf.has(c.key));
    if (!list.some(c => eff(c).lane != null)) continue;
    const zs = list.map(c => parseInt(w.getComputedStyle(byKey.get(c.key)).zIndex, 10) || 0), rows = Math.max(...list.map(c => rowOf.get(c.key))) + 1;
    const base = Math.max(0, ...zs) + rows;
    for (const c of list) {
      const el = byKey.get(c.key); if (w.getComputedStyle(el).position === "static") continue;
      el.dataset.hfrZ = el.style.zIndex || ""; el.style.zIndex = String(base - rowOf.get(c.key));
    }
  }
  applyLanes(fr, byKey, rowOf);
  try { if (!S.playing) S.player.seek(S.t); } catch {}
}
const mediaIn = el => el.matches("video,audio") ? [el] : [...el.querySelectorAll("video,audio")];
// track switches: hidden tracks fade to nothing (their timing stays), muted tracks lose their sound
function applyLanes(fr, byKey, rowOf) {
  const d = fr.d;
  for (const e of d.querySelectorAll("[data-hfr-lh]")) e.removeAttribute("data-hfr-lh");
  for (const e of d.querySelectorAll("[data-hfr-lm]")) { e.muted = e.dataset.hfrLm === "1"; e.removeAttribute("data-hfr-lm"); }
  for (const e of d.querySelectorAll("[data-hfr-sp]")) e.removeAttribute("data-hfr-sp");
  const mute = el => { for (const m of mediaIn(el)) if (!m.hasAttribute("data-hfr-lm")) { m.dataset.hfrLm = m.muted ? "1" : "0"; m.muted = true; } };
  const main = mainClip();
  for (const [key, el] of byKey) {
    const c = S.clips.find(x => x.key === key); if (!c) continue;
    const k = c === main ? null : c.type + ":" + (rowOf.get(key) || 0);
    if (c === main ? laneSw("prog").hide : laneSw(k).hide) el.setAttribute("data-hfr-lh", "");
    if (c !== main && laneSw(k).mute) mute(el);
    const sp = eff(c).sp; if (sp !== 1) for (const m of mediaIn(el)) m.dataset.hfrSp = String(sp);
  }
  let st = d.getElementById("hfr-lane-style");
  if (!st) { st = d.createElement("style"); st.id = "hfr-lane-style"; (d.head || d.documentElement).appendChild(st); }
  // b-roll mirrored or cropped from the right-click menu
  for (const e of d.querySelectorAll("[data-hfr-fx]")) e.removeAttribute("data-hfr-fx");
  const fx = []; let n = 0;
  for (const [key, o] of Object.entries((S.ed && S.ed.clips) || {})) {
    if (!(o.flipH || o.flipV || o.crop)) continue;
    const el = byKey.get(key); if (!el) continue;
    const id = "x" + n++; el.setAttribute("data-hfr-fx", id);
    const rot = o.flipH && o.flipV ? "z 180deg" : o.flipH ? "y 180deg" : o.flipV ? "x 180deg" : "none", c = o.crop;
    fx.push(`[data-hfr-fx="${id}"]{rotate:${rot} !important;${c ? `clip-path:${insetFor(c, o.flipH, o.flipV)} !important;` : ""}}`);
  }
  st.textContent = "[data-hfr-lh]{opacity:0 !important}" + (laneSw("lib").hide ? ".cutnote-live{opacity:0 !important}" : "") + fx.join("");
  mainFx(true);
}

/* ---------- playback through the edited sequence ---------- */
// the player runs at the playback speed times the speed of the footage piece under the playhead
function rateTick() {
  if (!S.player) return;
  const sp = seqEdited() ? spOf(segs()[TL.playSeg != null && segs()[TL.playSeg] ? TL.playSeg : segAtE(toE(S.t))]) : 1;
  const want = Math.max(0.0625, Math.min(16, S.rate * sp));
  if (S.player._r !== want) { S.player._r = want; S.player.setRate(want); }
  TL.curSp = sp;
}
function seqTick() {
  rateTick(); sfxTick(); mainFx();
  if (!S.playing || !seqEdited() || TL.drag) return;
  const ss = segs(), t = S.t, eps = 0.5 / FPS, now = performance.now();
  if (TL.jumpUntil && now < TL.jumpUntil) return;   // a jump just happened: let the player land first
  let i = TL.playSeg;
  if (i == null || !ss[i] || t < ss[i].in - 2 * eps || t > ss[i].out + 2 * eps) i = ss.findIndex(s => t >= s.in - 2 * eps && t < s.out - eps);
  const jump = j => { TL.playSeg = j; TL.jumpUntil = now + 200; S.player.seek(ss[j].in + 0.5 / FPS); S.t = ss[j].in; };
  if (i < 0) { const E = toE(t); if (E >= progDur() - eps) { pause(); seekE(progDur()); } else jump(segAtE(E)); return; }
  TL.playSeg = i;
  if (t >= ss[i].out - eps) {
    const n = ss[i + 1];
    if (!n) { pause(); S.player.seek(ss[i].out - 1 / FPS); sfxTick(); return; }
    if (Math.abs(n.in - ss[i].out) < 1.5 / FPS) { TL.playSeg = i + 1; return; }   // back-to-back pieces: just keep playing
    jump(i + 1);
  }
}

// Watchdog: while the player plays, every video clip that should be on screen must be playing and in sync.
// (After seeks the HyperFrames player can resume its animations while a video element stays paused.)
let mwLast = 0;
function mediaWatch() {
  const now = performance.now(); if (now - mwLast < 250) return; mwLast = now;
  if (!S.playing || TL.drag) return;
  const fr = compFrame(); if (!fr) return;
  for (const m of fr.d.querySelectorAll("[data-hfr-lm]")) if (!m.muted) m.muted = true;   // the player can unmute on play
  { const el = mainEl(); if (el) el._mfx = null; } mainFx();
  const base = S.rate * (TL.curSp || 1);
  for (const v of fr.d.querySelectorAll("video[data-start]")) {
    const csp = +v.dataset.hfrSp || 1;
    if (v.dataset.hfrHid || (csp === 1 && (v.hasAttribute("data-media-start") || v.hasAttribute("data-playback-start")))) continue;
    const a = parseFloat(v.getAttribute("data-start")), d = parseFloat(v.getAttribute("data-duration"));
    if (!isFinite(a)) continue;
    const off = parseFloat(v.getAttribute("data-media-start") || v.getAttribute("data-playback-start") || "0") || 0;
    const local = S.t - a, at = off + local * csp;
    if (local < 0 || (isFinite(d) && local >= d) || (v.duration && at >= v.duration - 0.05)) continue;
    if (Math.abs(v.currentTime - at) > 0.3) { try { v.currentTime = at; } catch {} }
    if (v.paused) v.play().catch(() => {});
    if (Math.abs(v.playbackRate - base * csp) > 1e-3) v.playbackRate = base * csp;
  }
  // look-ahead: a clip starting within the next second that sits paused away from its first frame is parked there once,
  // so it is decoded when it starts (the window widens with the playback speed)
  const ahead = Math.max(1, base);
  for (const m of fr.d.querySelectorAll("video, audio")) {
    if (!m.paused) continue;
    const a = mediaStart(m); if (a == null || a <= S.t || a - S.t > ahead || m.closest("[data-hfr-hid]")) continue;
    const off = mediaOff(m); if (Math.abs((m.currentTime || 0) - off) <= 0.05) continue;
    const was = LOOK.get(m); if (was && now - was < 1500) continue;
    LOOK.set(m, now); try { m.currentTime = off; } catch {}
  }
}
const LOOK = new WeakMap();   // media element -> when the look-ahead last parked it

/* ---------- pre-warm: decode every later clip's first frame before the first play ----------
   On a version's first play, a clip that hasn't been decoded yet stalls playback for ~180 ms when it starts. Once the
   player is ready, walk the composition's video and audio, one every 120 ms (no burst), soonest first: each one that
   hasn't buffered (readyState < 3) gets preload="auto" and is parked at its media start. A clip that is playing or has
   already started is never touched. Another version or a seek stops the walk. */
const mediaOff = m => parseFloat(m.getAttribute("data-media-start") || m.getAttribute("data-playback-start") || "0") || 0;
function mediaStart(m) {
  const u = m.hasAttribute("data-start") ? m : m.closest("[data-start]"), a = u ? parseFloat(u.getAttribute("data-start")) : NaN;
  return isFinite(a) ? a : null;
}
const PW = { doc: null, timer: 0 };
function prewarmStop() { clearTimeout(PW.timer); PW.timer = 0; }
function prewarm(fr) {
  if (!fr || PW.doc === fr.d || !S.comp || S.comp.kind !== "code" || !(S.player && S.player.ready)) return;
  prewarmStop(); PW.doc = fr.d;
  const comp = S.comp, doc = fr.d;
  const list = [...doc.querySelectorAll("video, audio")].map(m => ({ m, a: mediaStart(m) })).filter(x => x.a != null && x.a > S.t).sort((x, y) => x.a - y.a);
  let i = 0, last = { t: S.t, at: performance.now(), playing: S.playing };
  const step = () => {
    PW.timer = 0;
    const f = compFrame(); if (S.comp !== comp || !f || f.d !== doc) return;   // another version
    const now = performance.now(), run = last.playing && S.playing ? (now - last.at) / 1000 * S.rate * (TL.curSp || 1) : 0;
    if (Math.abs(S.t - (last.t + run)) > (last.playing || S.playing ? 0.5 : 1.5 / FPS)) return;   // a seek: stop here
    last = { t: S.t, at: now, playing: S.playing };
    while (i < list.length) {
      const m = list[i++].m, a = mediaStart(m);
      if (!m.isConnected || !m.paused || a == null || a <= S.t || m.readyState >= 3 || m.closest("[data-hfr-hid]")) continue;
      if (m.preload !== "auto") m.preload = "auto";
      const off = mediaOff(m);
      if (m.readyState < 2 || Math.abs((m.currentTime || 0) - off) > 0.05) { try { m.currentTime = off; } catch {} }
      break;
    }
    if (i < list.length) PW.timer = setTimeout(step, 120);
  };
  PW.timer = setTimeout(step, 120);
}

/* sound effects play from the page (they aren't part of the composition) */
const SFXA = new Map();
// the footage's own media element and its source URL / clock (for extracted audio, mirror, crop and mute)
function mainEl() {
  if (S.comp && S.comp.kind === "video") return S.player && S.player.el;
  const fr = compFrame(), m = mainClip(); return fr && m ? compEls(fr).get(m.key) || null : null;
}
function mainMedia() { const el = mainEl(); return el ? (el.matches("video,audio") ? el : el.querySelector("video,audio")) : null; }
function mainSrc() { const v = mainMedia(); return v ? v.currentSrc || v.src || null : null; }
function mainMediaAt(t) {
  const m = mainClip(), v = mainMedia();
  const off = v ? parseFloat(v.getAttribute("data-media-start") || v.getAttribute("data-playback-start") || "0") || 0 : 0;
  return t - (m && S.comp && S.comp.kind === "code" ? m.start : 0) + off;
}
// what the piece under the playhead asks of the footage: mirrored, cropped, muted (its audio taken out)
function curSeg() { const ss = segs(); const i = TL.playSeg != null && ss[TL.playSeg] ? TL.playSeg : segAtE(toE(S.t)); return ss[i] || {}; }
function mainFx(force) {
  const el = mainEl(); if (!el) return;
  const s = curSeg(), c = s.crop;
  const rot = s.flipH && s.flipV ? "z 180deg" : s.flipH ? "y 180deg" : s.flipV ? "x 180deg" : "";
  const clip = c ? insetFor(c, s.flipH, s.flipV) : "";
  const muted = !!(laneSw("prog").mute || laneSw("wave").mute || s.mute);
  const sig = rot + "|" + clip + "|" + muted;
  if (!force && el._mfx === sig) return;
  el._mfx = sig;
  el.style.rotate = rot; el.style.clipPath = clip;
  muteMain(muted);
}
// crop sides as seen on screen -> inset() in the element's own (mirrored) coordinates
function insetFor(c, fh, fv) {
  const l = fh ? c.r : c.l, r = fh ? c.l : c.r, t = fv ? c.b : c.t, b = fv ? c.t : c.b;
  return `inset(${(t || 0) * 100}% ${(r || 0) * 100}% ${(b || 0) * 100}% ${(l || 0) * 100}%)`;
}
// silence the footage. A composition's player mixes media itself and reads data-volume every frame, so set that
// (and the element volume); a plain video file is just muted. Only ever undo what we did.
function muteMain(on) {
  const m = mainMedia(); if (!m) return;
  if (S.comp && S.comp.kind === "video") {
    if (on && !m._cnMute) { m._cnMute = { muted: m.muted }; m.muted = true; }
    else if (!on && m._cnMute) { m.muted = m._cnMute.muted; m._cnMute = null; }
    else if (on && !m.muted) m.muted = true;
    return;
  }
  if (on) {
    if (!m._cnMute) m._cnMute = { vol: m.getAttribute("data-volume") };
    if (m.getAttribute("data-volume") !== "0") m.setAttribute("data-volume", "0");
    if (m.volume !== 0) m.volume = 0;
  } else if (m._cnMute) {
    const v = m._cnMute.vol; m._cnMute = null;
    if (v == null) m.removeAttribute("data-volume"); else m.setAttribute("data-volume", v);
    m.volume = Math.min(1, v == null ? 1 : +v || 1);
  }
}
/* The player's clock moves in steps (a few times a second, about once a second in a background tab), while page
   audio runs smoothly. Between steps, run the clock on from its last change, so long sounds such as music aren't
   pulled back on every step (that made music stutter and sound muffled). */
const LT = { t: null, at: 0 };
function liveT() {
  const now = performance.now();
  if (S.t !== LT.t || !S.playing) { LT.t = S.t; LT.at = now; return S.t; }
  return S.t + Math.min(1.5, (now - LT.at) / 1000) * (S.rate || 1);
}
function sfxTick() {
  const keep = new Set(), E = toE(liveT()), run = S.playing && !(TL.drag && TL.drag.kind !== "click");
  for (const it of sfxItems()) {
    keep.add(it.u);
    const ext = it.kind === "ext", src = ext ? mainSrc() : sfxSrc(it); if (!src) continue;
    let a = SFXA.get(it.u);
    if (!a || a._f !== src) { if (a) a.pause(); a = new Audio(src); a.preload = "auto"; a._f = src; SFXA.set(it.u, a); }
    const local = E - toE(it.start);
    // (while a track from the Music tab is auditioned, placed music stays quiet so the two don't play over each other)
    const on = run && !laneSw((ext ? "ext:" : it.kind === "music" ? "music:" : "sfx:") + (it.row || 0)).mute && !it.mute && !(it.kind === "music" && TL.audition)
      && local >= -0.02 && local < it.dur - 0.01 && (it.kind !== "music" || E < progDur() - 0.01);
    if (!on) { if (!a.paused) a.pause(); continue; }
    const isp = ext && it.sp > 0 ? it.sp : 1;
    const want = ext ? mainMediaAt(it.off || 0) + Math.max(0, local) * isp : (it.off || 0) + Math.max(0, local);
    let gain = it.vol == null ? 1 : it.vol;
    if (it.fadeIn > 0 && local < it.fadeIn) gain *= Math.max(0, local / it.fadeIn);
    if (it.fadeOut > 0 && it.dur - local < it.fadeOut) gain *= Math.max(0, (it.dur - local) / it.fadeOut);
    a.volume = Math.max(0, Math.min(1, gain));
    { const r = S.rate * (ext && it.sp > 0 ? it.sp : 1); if (Math.abs(a.playbackRate - r) > 1e-3) a.playbackRate = r; }
    if (a.paused) { try { a.currentTime = want; } catch {} a.play().catch(() => {}); }
    else if (Math.abs(a.currentTime - want) > 0.25 * Math.max(1, S.rate)) { try { a.currentTime = want; } catch {} }
  }
  for (const [u, a] of SFXA) if (!keep.has(u)) { a.pause(); SFXA.delete(u); }
}
// add a sound from the Sounds tab at program time E (on a given Sound FX row, or the first free one)
function sfxAdd(snd, E, row) {
  if (!S.comp) { toast("Pick a version first"); return; }
  if (S.comp.kind === "video" && S.info.layout !== "folder") { toast("Sound effects need the live version or a plain video"); return; }
  E = Math.max(0, Math.min(Math.max(0, progDur() - 0.05), E));
  if (row == null) {
    const busy = r => sfxItems().some(it => (it.row || 0) === r && E < toE(it.start) + it.dur - 1e-3 && E + snd.dur > toE(it.start) + 1e-3);
    row = 0; while (row < 7 && busy(row)) row++;
  }
  tlBegin(); S.ed = S.ed || { segments: null, clips: {} }; S.ed.sfx = S.ed.sfx || [];
  const it = { u: Math.random().toString(36).slice(2, 10), id: snd.id, name: snd.name, file: snd.file, start: +toS(E).toFixed(4), dur: +snd.dur, len: +snd.dur, off: 0, vol: 1, row };
  S.ed.sfx.push(it); TL.sel = { kind: "clip", key: "sfx:" + it.u };
  tlCommit(); toast(`Added "${snd.name}" at ${fmt(E)}`);
}

/* ---------- actions ---------- */
function tlSetTool(t) {
  TL.tool = t; cv.dataset.tool = t; TL.hoverCut = null;
  document.querySelectorAll("#tlbar [data-ttool]").forEach(b => b.classList.toggle("on", b.dataset.ttool === t));
}
function canEdit() {
  if (S.comp && S.comp.kind === "code") return true;
  if (S.comp && S.comp.kind === "video" && S.info.layout === "folder") return true;
  toast(S.comp && S.comp.kind === "video" ? "Rendered files can't be edited here: pick the live version" : "Pick a version to edit first"); return false;
}
function tlSplitAt(E) {
  if (!canEdit()) return;
  const ss = segs(), i = segAtE(E), st = segStarts()[i], s = ss[i];
  const t = s.in + (E - st) * spOf(s);
  if (t - s.in < 2 / FPS || s.out - t < 2 / FPS) { toast("Too close to a cut"); return; }
  tlBegin();
  const n = clone(ss); n.splice(i, 1, Object.assign({}, s, { out: +t.toFixed(4) }), Object.assign({}, s, { in: +t.toFixed(4) }));
  S.ed = Object.assign(S.ed || { clips: {} }, { segments: n });
  TL.sel = { kind: "seg", i: i + 1 }; tlCommit(); toast("Split at " + fmt(E));
}
function tlDelete() {
  if (!canEdit()) return;
  const sel = TL.sel; if (!sel) { toast("Select a clip on the timeline first"); return; }
  if (sel.kind === "seg") {
    const ss = segs(); if (ss.length < 2) { toast("Split first (S) — that's the whole video"); return; }
    tlBegin(); const keep = holdPlaces(); const n = clone(ss); const [g] = n.splice(sel.i, 1);
    S.ed = Object.assign(S.ed || { clips: {} }, { segments: n }); restorePlaces(keep);
    TL.sel = null; tlCommit(); toast("Removed " + segLen(g).toFixed(2) + " s");
    return;
  }
  const c = clipBy(sel.key); if (!c) return;
  if (c.sfx && c.type === "music") { musicDelete(c.sfx); return; }
  if (c.sfx) { tlBegin(); S.ed.sfx = sfxItems().filter(it => it !== c.sfx); TL.sel = null; tlCommit(); toast("Removed " + c.id); return; }
  tlBegin(); const e = eff(c);
  S.ed = S.ed || { segments: null, clips: {} }; S.ed.clips = S.ed.clips || {};
  S.ed.clips[c.key] = { start: e.start, dur: e.end - e.start, del: true };
  TL.sel = null; FE.sel = null; tlCommit(); toast("Removed " + c.id);
}
/* ---------- music clips: blade and ripple delete ---------- */
// split a music clip at program time E into two clips that play on without a break (the second one starts further into the track)
function musicSplit(it, E) {
  if (!canEdit()) return false;
  const P = toE(it.start), local = E - P;
  if (local < 0.1 || it.dur - local < 0.1) { toast("Too close to the end of the music clip"); return false; }
  tlBegin();
  const b = Object.assign(clone(it), { u: Math.random().toString(36).slice(2, 10), start: +toS(E).toFixed(4), off: +((it.off || 0) + local).toFixed(4), dur: +(it.dur - local).toFixed(4) });
  it.dur = +local.toFixed(4);
  delete it.fadeOut; delete b.fadeIn;   // the join plays straight through: the fades stay at the outer ends
  if (it.fadeIn > it.dur / 2) it.fadeIn = +(it.dur / 2).toFixed(3);
  if (b.fadeOut > b.dur / 2) b.fadeOut = +(b.dur / 2).toFixed(3);
  const arr = S.ed.sfx; arr.splice(arr.indexOf(it) + 1, 0, b);
  TL.sel = { kind: "clip", key: "sfx:" + b.u }; tlCommit(); toast("Split the music at " + fmt(E));
  return true;
}
// blade at the playhead (⌘B): a selected music clip under the playhead is split, otherwise the footage
function tlBladeAt(E) {
  const c = TL.sel && TL.sel.kind === "clip" ? clipBy(TL.sel.key) : null;
  if (c && c.type === "music") { const P = toE(c.sfx.start); if (E > P && E < P + c.sfx.dur) { musicSplit(c.sfx, E); return; } }
  tlSplitAt(E);
}
// delete a piece of music; the music clips butted up after it on its row move up to close the gap (ripple)
function musicDelete(it) {
  if (!canEdit()) return;
  const row = it.row || 0, others = sfxItems().filter(x => x !== it && x.kind === "music" && (x.row || 0) === row);
  const chain = []; let end = toE(it.start) + it.dur;
  for (;;) { const n = others.find(x => !chain.includes(x) && Math.abs(toE(x.start) - end) < 0.02); if (!n) break; chain.push(n); end = toE(n.start) + n.dur; }
  tlBegin();
  const P0 = toE(it.start);
  let at = P0; for (const x of chain) { x.start = +toS(at).toFixed(4); at += x.dur; }
  S.ed.sfx = sfxItems().filter(x => x !== it); TL.sel = null; tlCommit();
  toast(chain.length ? "Removed that piece of music: the rest moved up to close the gap" : "Removed " + (it.name || "the music"));
}
// Q / W: ripple-trim the footage span under the playhead from its start (or to its end)
function tlTrimTo(which) {
  if (!canEdit()) return;
  const E = toE(S.t), ss = segs(), i = segAtE(E), s = ss[i], t = s.in + (E - segStarts()[i]) * spOf(s);
  if (which === "start" ? t - s.in < 2 / FPS : s.out - t < 2 / FPS) { toast("Nothing to trim here"); return; }
  if (ss.length === 1 && (which === "start" ? t >= s.out - 2 / FPS : t <= s.in + 2 / FPS)) return;
  tlBegin(); const keep = holdPlaces();
  const n = clone(ss);
  if (which === "start") n[i].in = +t.toFixed(4); else n[i].out = +t.toFixed(4);
  S.ed = Object.assign(S.ed || { clips: {} }, { segments: n }); restorePlaces(keep);
  tlCommit(); seekE(which === "start" ? segStarts()[i] : segStarts()[i] + segLen(n[i]) - 1 / FPS);
  toast(which === "start" ? "Trimmed the start to the playhead" : "Trimmed the end to the playhead");
}
function tlJumpEdit(dir) {
  const E = toE(S.t), pts = new Set([0, progDur(), ...segStarts()]);
  for (const c of allClips()) { const e = eff(c); if (!e.del && c.type !== "cap") for (const [a, b] of spansOf(c, e)) { pts.add(a); pts.add(b); } }
  const list = [...pts].sort((a, b) => a - b);
  const to = dir > 0 ? list.find(p => p > E + 0.5 / FPS) : [...list].reverse().find(p => p < E - 0.5 / FPS);
  if (to != null) { pause(); seekE(to); }
}
// speed of the selected footage piece or b-roll clip
function tlSetSpeed(v) {
  if (!canEdit()) return;
  v = +v; const sel = TL.sel;
  const label = v === 1 ? "Normal speed" : v < 1 ? `Slow motion ${v}×` : `Sped up ${v}×`;
  if (sel && sel.kind === "seg") {
    tlBegin(); const keep = holdPlaces(); const n = clone(segs());
    if (v === 1) delete n[sel.i].sp; else n[sel.i].sp = v;
    S.ed = Object.assign(S.ed || { clips: {} }, { segments: n }); restorePlaces(keep);
    tlCommit(); seekE(segStarts()[sel.i]); toast(label); return;
  }
  const c = sel && sel.kind === "clip" ? clipBy(sel.key) : null;
  if (c && c.type === "video" && editable(c)) {
    const e = eff(c); tlBegin();
    S.ed = S.ed || { segments: null, clips: {} }; S.ed.clips = S.ed.clips || {};
    const o = Object.assign({}, S.ed.clips[c.key] || {}, { start: e.start, dur: +((e.end - e.start) * e.sp / v).toFixed(4), del: false });
    if (v === 1) delete o.sp; else o.sp = v;
    S.ed.clips[c.key] = o; tlCommit(); toast(label); return;
  }
  toast("Select a footage piece or a b-roll clip first");
}
function tlSetVol(v) {
  const c = TL.sel && TL.sel.kind === "clip" ? clipBy(TL.sel.key) : null;
  if (!c || !c.sfx) { toast("Select a sound effect first"); return; }
  tlBegin(); c.sfx.vol = +v; tlCommit(); toast("Volume " + Math.round(v * 100) + "%");
}
function tlReset() {
  if (!edActive() || !confirm("Throw away all timeline edits on " + S.comp.label + "?")) return;
  tlBegin(); S.ed = null; TL.sel = null; FE.sel = null; libUnpick(); tlCommit(); fmtSync();
}
function zoomBy(f, aroundX) {
  const w = cv.clientWidth - G, D = progDur() || 10;
  const ax = aroundX == null ? (X(toE(S.t)) - G) : aroundX - G;
  const at = S.view.start + ax / w * S.view.len;
  const len = Math.max(1, Math.min(D, S.view.len * f));
  S.view.start = Math.max(0, Math.min(D - len, at - ax / w * len)); S.view.len = len; S.follow = false; draw();
}

/* ---------- layout ---------- */
// the Music track has two rows: a music clip pasted or duplicated onto a higher row moves to a free one of the two
function musicRows() {
  const ms = sfxItems().filter(x => x.kind === "music");
  for (const it of ms) {
    if ((it.row || 0) <= 1) continue;
    const P = toE(it.start), busy = r => ms.some(o => o !== it && (o.row || 0) === r && P < toE(o.start) + o.dur - 1e-3 && P + it.dur > toE(o.start) + 1e-3);
    it.row = busy(0) && !busy(1) ? 1 : 0;
  }
}
function layoutLanes() {
  const main = mainClip();
  musicRows();
  // rows of one kind of clip: clips dragged to a row stay there, the rest pack into the first row with room
  const rowsOf = (type, cap) => {
    const rows = [], mk = () => { const r = { type, clips: [], spans: [] }; rows.push(r); return r; };
    const list = allClips().filter(c => c.type === type && c !== main && !eff(c).del).map(c => ({ c, e: eff(c) })).sort((a, b) => a.e.start - b.e.start);
    for (const it of list.filter(it => it.e.lane != null)) {
      const L = Math.max(0, Math.min(type === "music" ? cap - 1 : 11, it.e.lane)); while (rows.length <= L) mk();
      rows[L].clips.push(it.c); rows[L].spans.push([it.e.start, it.e.end]);
    }
    for (const it of list.filter(it => it.e.lane == null)) {
      let r = rows.find(r => !r.spans.some(([a, b]) => it.e.start < b - 1e-3 && it.e.end > a + 1e-3));
      if (!r) r = rows.length >= cap ? rows[rows.length - 1] : mk();
      r.clips.push(it.c); r.spans.push([it.e.start, it.e.end]);
    }
    const dg = TL.drag && TL.drag.kind === "clipmove" && TL.drag.type === type;
    if (dg && rows.length < (type === "music" ? cap : type === "sfx" || type === "ext" ? 8 : 12)) mk().ghost = true;   // an empty row to drop into while dragging
    return rows;
  };
  TL.lanes = [
    // library components and caption styles placed from the sidebar (library.js draws their blocks over this lane)
    ...(window.LibDrawer && LibDrawer.hasLane() ? [{ type: "lib", label: "Library", h: LibDrawer.laneH(), clips: [] }] : []),
    ...(main ? [{ type: "prog", label: "Footage", h: PROG_H }, ...(TL.wave ? [{ type: "wave", label: "Waveform", h: WAVE_H }] : [])] : []),
    ...rowsOf("ext", 4).map((r, i) => ({ ...r, label: i ? "" : "Audio", h: ROW_H, row: i })),
    ...rowsOf("video", 3).map((r, i) => ({ ...r, label: i ? "" : "B-roll", h: ROW_H, row: i })),
    ...rowsOf("other", 6).map((r, i) => ({ ...r, label: i ? "" : "Overlays", h: ROW_H, row: i })),
    ...rowsOf("cap", 2).map((r, i) => ({ ...r, label: i ? "" : "Captions", h: CAP_H, row: i })),
    ...rowsOf("audio", 3).map((r, i) => ({ ...r, label: i ? "" : "Sound", h: SFX_H, row: i })),
    ...(() => { if (!S.comp) return []; const r = rowsOf("sfx", 8); if (!r.length) r.push({ type: "sfx", clips: [], spans: [] }); return r.map((x, i) => ({ ...x, label: i ? "" : "Sound FX", h: ROW_H, row: i })); })(),
    // Music: shown once a track is placed, or as a drop zone while one is dragged in from the Music tab
    ...(() => { if (!S.comp) return []; const r = rowsOf("music", 2); if (!r.length && TL.musicDrop) r.push({ type: "music", clips: [], spans: [] }); return r.map((x, i) => ({ ...x, label: i ? "" : "Music", h: ROW_H, row: i })); })(),
  ];
  // deleted clips leave the lanes; undo (⌘Z) or Reset brings them back
}
async function loadMedia() {
  TL.media = null; TL.img = null;
  const m = mainClip(); if (!m || !S.comp || !m.src) return;
  try {
    const info = await api("/api/media?comp=" + encodeURIComponent(S.comp.id) + "&src=" + encodeURIComponent(m.src));
    if (!info || info.error) return;
    TL.media = info;
    if (info.strip) { const img = new Image(); img.onload = () => { TL.img = img; draw(); }; img.src = info.strip.url; }
    draw();
  } catch {}
}

/* ---------- drawing ---------- */
const cv = $("#tl"), ctx = cv.getContext("2d");
function fitView() { S.view = { start: 0, len: progDur() || S.dur || 10 }; draw(); }
const X = E => G + (E - S.view.start) / S.view.len * (cv.clientWidth - G);
const T = x => S.view.start + (x - G) / (cv.clientWidth - G) * S.view.len;
const TC = {};
function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ["accent", "dim", "faint", "ink", "fix", "change", "remember", "done", "video", "audio", "cap", "cap-ink", "other", "tl-bg", "tl-ruler", "tl-grid", "tl-beyond", "tl-head",
    "tl-band", "tl-tick", "tl-line", "tl-prog", "tl-edge", "tl-label-bg", "tl-label", "playhead", "cut", "snap", "blade", "panel", "sfx", "music", "music-ink", "tl-fade", "warn"]) TC[k] = cs.getPropertyValue("--" + k).trim();
}
readTheme();
const css = v => TC[v.slice(2)] || getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)) : ctx.rect(x, y, w, h); }
function draw() {
  const dpr = devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = TC["tl-bg"]; ctx.fillRect(0, 0, w, h);
  if (!S.view.len) S.view = { start: 0, len: progDur() || 10 };
  const v0 = S.view.start, v1 = v0 + S.view.len, PD = progDur();
  ctx.font = "10px -apple-system, system-ui, sans-serif"; ctx.textBaseline = "alphabetic";

  // lanes
  let y = RULER + NOTES_H + 4; const geom = [];
  for (const ln of TL.lanes) { geom.push({ ln, y, h: ln.h }); y += ln.h + 3; }
  TL.geom = geom;
  ctx.save(); ctx.beginPath(); ctx.rect(G, 0, w - G, h); ctx.clip();
  // grid
  const steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120];
  const stp = steps.find(s => s / S.view.len * (w - G) >= 70) || 300;
  // lane bands
  for (const g of geom) { ctx.fillStyle = TC["tl-band"]; ctx.fillRect(G, g.y - 1, w - G, g.h + 2); }
  ctx.strokeStyle = TC["tl-grid"]; ctx.beginPath();
  for (let t = Math.ceil(v0 / stp) * stp; t <= v1; t += stp) { const x = Math.round(X(t)) + .5; ctx.moveTo(x, RULER); ctx.lineTo(x, h); }
  ctx.stroke();
  // beyond the end
  if (X(PD) < w) { ctx.fillStyle = TC["tl-beyond"]; ctx.fillRect(X(PD), RULER, w - X(PD), h); }
  // I–O range
  if (S.inT != null || S.outT != null) {
    const a = X(S.inT != null ? toE(S.inT) : v0), b = X(S.outT != null ? toE(S.outT) : v1);
    ctx.fillStyle = "rgba(198,244,50,.07)"; ctx.fillRect(a, RULER, b - a, h);
    ctx.fillStyle = css("--accent"); if (S.inT != null) ctx.fillRect(a, RULER, 2, h); if (S.outT != null) ctx.fillRect(b - 2, RULER, 2, h);
  }
  const starts = segStarts(), ss = segs();
  for (const g of geom) {
    const ln = g.ln, sw = laneSw(laneKey(ln));
    ctx.globalAlpha = sw.hide || sw.mute ? 0.38 : 1;
    if (ln.type === "prog") drawProgram(g, ss, starts, v0, v1);
    else if (ln.type === "wave") drawWave(g, ss, starts);
    else if (ln.clips) { for (const c of ln.clips) drawClip(c, g, ctx.globalAlpha); if (g.h >= 12) laneLabels(g); }
    ctx.globalAlpha = 1;
    if ((ln.type === "sfx" || ln.type === "music") && !ln.clips.length && g.ln.row === 0) {   // an empty Sound FX (or Music) track: a drop zone with its hint inside it
      const zx = Math.max(G, X(0)) + 2, zw = Math.min(w, X(PD)) - 2 - zx;
      if (zw > 60) {
        ctx.save(); ctx.strokeStyle = TC["tl-line"]; ctx.setLineDash([4, 3]); rr(zx + .5, g.y + .5, zw - 1, g.h - 1, 4); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.rect(zx, g.y, zw, g.h); ctx.clip();
        ctx.fillStyle = TC.faint; ctx.font = "11px -apple-system, system-ui, sans-serif";
        const t = fitText(ln.type === "music" ? "Drop the music here" : "Drag sounds here from the Sounds tab", zw - 20), tx = t ? dodgePlayhead(zx + 10, ctx.measureText(t).width, zx + 10, zx + zw - 10) : null;
        if (t && tx != null) ctx.fillText(t, tx, g.y + g.h / 2 + 4);
        ctx.restore();
      }
    }
  }
  // notes
  for (const n of S.notes) {
    if (!S.comp || n.comp !== S.comp.id) continue;
    if (n.status === "done" && !showDone()) continue;
    const col = n.status === "done" ? css("--done") : css("--" + (n.kind || "fix"));
    const x = X(toE(n.t)), ny = RULER;
    if (n.end != null) { ctx.fillStyle = col + "44"; ctx.fillRect(x, ny + 3, X(toE(n.end)) - x, NOTES_H - 6); }
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 5, ny + 2); ctx.lineTo(x + 5, ny + 2); ctx.lineTo(x, ny + NOTES_H - 1); ctx.fill();
    if (S.sel === n.id) { ctx.strokeStyle = TC.playhead; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1; }
  }
  // drag ghosts: insertion marker for reorder, snap line
  const d = TL.drag;
  if (d && d.kind === "segmove" && d.moved) {
    const ins = d.insertE; ctx.fillStyle = css("--accent"); ctx.fillRect(X(ins) - 1.5, RULER, 3, h);
  }
  if (d && d.snapE != null) { ctx.strokeStyle = TC.snap; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(d.snapE) + .5, RULER); ctx.lineTo(X(d.snapE) + .5, h); ctx.stroke(); ctx.setLineDash([]); }
  // roll: the cut you'd grab
  if (TL.tool === "roll" && TL.hoverCut != null) { const x = X(segStarts()[TL.hoverCut]); ctx.fillStyle = TC.accent; ctx.fillRect(x - 1.5, RULER, 3, h); }
  // where a dragged sound will land
  if (TL.dropE != null) { ctx.fillStyle = (TL.musicDrop ? TC.music : TC.sfx) || "#ffa53d"; ctx.fillRect(X(TL.dropE) - 1, RULER, 2, h); }
  // razor preview
  if (TL.tool === "razor" && TL.hoverX != null && TL.hoverX > G) { ctx.strokeStyle = TC.blade; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(TL.hoverX + .5, RULER); ctx.lineTo(TL.hoverX + .5, h); ctx.stroke(); }
  ctx.restore();
  if (window.LibDrawer) LibDrawer.paintLane();
  tlSelSync();

  // ruler
  ctx.fillStyle = TC["tl-ruler"]; ctx.fillRect(0, 0, w, RULER);
  ctx.strokeStyle = TC["tl-line"]; ctx.beginPath(); ctx.moveTo(0, RULER + .5); ctx.lineTo(w, RULER + .5); ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(G, 0, w - G, RULER); ctx.clip();
  ctx.fillStyle = TC.dim; ctx.strokeStyle = TC["tl-tick"]; ctx.beginPath(); ctx.font = "10px ui-monospace, SF Mono, Menlo, monospace";
  const sub = stp / 5;
  const phx = X(toE(S.t));
  for (let t = Math.ceil(v0 / sub) * sub; t <= v1; t += sub) {
    const x = Math.round(X(t)) + .5; const major = Math.abs(t / stp - Math.round(t / stp)) < 1e-6; ctx.moveTo(x, major ? 10 : 17); ctx.lineTo(x, RULER);
    if (major) { const lb = stp < 1 ? fmt(t) : fmt(t).replace(/\.00$/, ""), lw = ctx.measureText(lb).width; let lx = x + 3;
      if (lx < phx + 8 && lx + lw > phx - 8) lx = phx + 8;   // the playhead's head would cover it: step past it
      ctx.fillText(lb, lx, 11); }
  }
  ctx.stroke(); ctx.restore();
  // track headers
  const swNow = performance.now();
  ctx.fillStyle = TC["tl-ruler"]; ctx.fillRect(0, RULER, G, h - RULER);
  ctx.strokeStyle = TC["tl-line"]; ctx.beginPath(); ctx.moveTo(G - .5, 0); ctx.lineTo(G - .5, h); ctx.stroke();
  const head = (y, hh, col, label, sub2) => {
    ctx.fillStyle = TC["tl-head"]; rr(6, y, G - 12, hh, 5); ctx.fill();
    ctx.fillStyle = col; rr(9, y + 3, 3, hh - 6, 1.5); ctx.fill();
    if (!label) return;
    ctx.fillStyle = TC.ink; ctx.font = "600 11px -apple-system, system-ui, sans-serif";
    const ty = hh >= 30 ? y + 15 : y + hh / 2 + 4; ctx.fillText(label, 18, ty);
    if (sub2 && hh >= 30) { ctx.fillStyle = TC.faint; ctx.font = "10px -apple-system, system-ui, sans-serif"; ctx.fillText(sub2, 18, ty + 13); }
  };
  const noteCount = S.notes.filter(n => S.comp && n.comp === S.comp.id && n.status !== "done").length;
  head(RULER + 2, NOTES_H, TC.fix, "Notes" + (noteCount ? " · " + noteCount : ""));
  for (const g of geom) {
    const t = g.ln.type, col = t === "prog" ? TC.video : t === "wave" ? TC.audio : t === "cap" ? TC.cap : t === "lib" ? "#39ff88" : t === "sfx" ? TC.sfx : TC[t] || TC.dim;
    const sub2 = t === "prog" ? (segs().length > 1 ? segs().length + " pieces" : "1 piece") : "";
    head(g.y, g.h, col, g.ln.label, sub2);
    const sw = Object.assign({}, laneSw(laneKey(g.ln)));
    if (g.ln.type === "prog" && laneSw("wave").mute) sw.mute = true;
    const lk = laneKey(g.ln), hk = TL.hoverIcon ? laneKey(TL.hoverIcon.g) + TL.hoverIcon.what : "";   // by key: a toggle rebuilds the lanes
    for (const ic of laneIcons(g.ln)) laneIcon(ic.what, ic.x + 7, g.y + g.h / 2, g.h, swState(lk + ic.what, !!sw[ic.what], hk === lk + ic.what, TL.swPress === lk + ic.what, swNow));
  }
  // playhead + time readout
  const px = Math.round(X(toE(S.t))) + .5;
  ctx.fillStyle = TC.accent; rr(6, 4, G - 12, RULER - 8, 4); ctx.fill();
  ctx.fillStyle = "#141a00"; ctx.font = "600 10px ui-monospace, SF Mono, Menlo, monospace"; ctx.textAlign = "center"; ctx.fillText(fmt(toE(S.t)), G / 2, RULER - 8); ctx.textAlign = "left";
  if (px >= G) {
    ctx.strokeStyle = TC.playhead; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, 6); ctx.lineTo(px, h); ctx.stroke();
    ctx.fillStyle = TC.playhead; ctx.beginPath(); ctx.moveTo(px - 6, 2); ctx.lineTo(px + 6, 2); ctx.lineTo(px + 6, 9); ctx.lineTo(px, 14); ctx.lineTo(px - 6, 9); ctx.closePath(); ctx.fill();
  }
}
// eye / speaker switch in a track header: a round button, cx/cy its centre, lh the lane's height, st = swState(...).
// Off: the button takes a calm --warn tint, the eye's lid closes and a slash draws across it, the speaker's waves
// shrink away and an x draws in. All of it runs backwards when the switch goes back on.
function laneIcon(what, cx, cy, lh, st) {
  const p = st.p, h = st.h, dn = st.d, TAU = Math.PI * 2;
  const r = Math.max(5, Math.min(7.5, (lh - 2) / 2)), offC = TC.warn || TC.fix;
  ctx.save(); ctx.translate(cx, cy);
  const sc = 1 + 0.07 * h - 0.12 * dn; ctx.scale(sc, sc);
  // the button: a faint ink wash at rest that deepens on hover, crossfading to a warn wash and hairline ring when off
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
  ctx.globalAlpha = (0.045 + 0.085 * h) * (1 - p); ctx.fillStyle = TC.ink; ctx.fill();
  if (p > 0) {
    ctx.globalAlpha = (0.13 + 0.07 * h) * p; ctx.fillStyle = offC; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r - 0.5, 0, TAU); ctx.globalAlpha = (0.3 + 0.15 * h) * p; ctx.strokeStyle = offC; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // the glyph, drawn on a 15 px grid and scaled to the button
  const k = r / 7.5; ctx.scale(k, k);
  const col = rgbaS(mixRGB(mixRGB(rgbOf(TC.dim), rgbOf(TC.ink), h), rgbOf(offC), p));
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.35; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const seg = (x0, y0, x1, y1, t) => { if (t <= 0) return; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); ctx.stroke(); };
  if (what === "hide") {
    const s = 5.2, lid = easeOut(clamp01(p / 0.65)), sl = clamp01((p - 0.3) / 0.7);
    const up = -1.2 * s + 1.75 * s * lid, lo = 1.2 * s - 0.65 * s * lid;   // the upper lid sweeps down onto the lower one
    const ey = -0.75 * lid;   // and the shut lid rises a little to sit on the button's centre
    const eye = () => { ctx.beginPath(); ctx.moveTo(-s, ey); ctx.quadraticCurveTo(0, ey + up, s, ey); ctx.quadraticCurveTo(0, ey + lo, -s, ey); };
    ctx.save();
    if (sl > 0) {   // keep a clear gap either side of the slash: clip that band out of the eye
      const L = 4.6, x1 = -L + 2 * L * sl, w = 1.75 / Math.SQRT2;
      ctx.beginPath(); ctx.rect(-10, -10, 20, 20);
      ctx.moveTo(-L - w - 1, -L + w - 1); ctx.lineTo(x1 - w + 1, x1 + w + 1); ctx.lineTo(x1 + w + 1, x1 - w + 1); ctx.lineTo(-L + w - 1, -L - w - 1); ctx.closePath();
      ctx.clip("evenodd");
    }
    eye(); ctx.stroke();
    if (lid < 1) { ctx.save(); eye(); ctx.clip(); ctx.beginPath(); ctx.arc(0, 0, 2.05, 0, TAU); ctx.fill(); ctx.restore(); }   // the pupil hides behind the lid
    ctx.restore();
    seg(-4.6, -4.6, 4.6, 4.6, sl);
  } else {
    ctx.translate(-0.7, 0);   // optical centre of speaker + waves / speaker + x
    ctx.beginPath(); ctx.moveTo(-5, -1.9); ctx.lineTo(-2.7, -1.9); ctx.lineTo(0.3, -4.7); ctx.lineTo(0.3, 4.7); ctx.lineTo(-2.7, 1.9); ctx.lineTo(-5, 1.9); ctx.closePath(); ctx.fill();
    const wave = (r0, r1, a, t) => { if (t >= 1) return; ctx.globalAlpha = 1 - t; ctx.beginPath(); ctx.arc(1.4, 0, r0 + (r1 - r0) * t, -a, a); ctx.stroke(); ctx.globalAlpha = 1; };
    wave(5.4, 3.2, 0.8, easeOut(clamp01(p / 0.4)));          // the outer wave goes first
    wave(3.1, 1.6, 0.9, easeOut(clamp01((p - 0.1) / 0.4)));
    const xc = 4.1, xh = 2.05;
    seg(xc - xh, -xh, xc + xh, xh, easeOut(clamp01((p - 0.35) / 0.35)));
    seg(xc + xh, -xh, xc - xh, xh, easeOut(clamp01((p - 0.55) / 0.45)));
  }
  ctx.restore();
}
function drawProgram(g, ss, starts, v0, v1) {
  const m = TL.media, img = TL.img, st = m && m.strip, main = mainClip();
  for (let i = 0; i < ss.length; i++) {
    const s = ss[i], a = starts[i], b = a + segLen(s);
    if (b < v0 || a > v1) continue;
    const x0 = X(a) + (i ? 1 : 0), x1 = X(b) - 1, wv = x1 - x0; if (wv < 1) continue;
    ctx.save(); rr(x0, g.y, wv, g.h, 5); ctx.clip();
    ctx.fillStyle = TC["tl-prog"]; ctx.fillRect(x0, g.y, wv, g.h);
    if (img && st && TL.strip) {   // filmstrip: one thumbnail per tile, taken from the source time under it
      const th = g.h, tw = st.w * th / st.h;
      for (let x = Math.max(x0, G) - ((Math.max(x0, G) - x0) % tw); x < x1; x += tw) {
        const srcT = s.in + (T(x + tw / 2) - a) * spOf(s) - (main ? main.start : 0);
        const k = Math.max(0, Math.min(st.n - 1, Math.round(srcT * st.fps)));
        ctx.drawImage(img, k * st.w, 0, st.w, st.h, x, g.y, tw, th);
      }
      ctx.fillStyle = "rgba(10,14,24,.25)"; ctx.fillRect(x0, g.y, wv, g.h);
    }
    const sel = TL.sel && TL.sel.kind === "seg" && TL.sel.i === i;
    ctx.restore();
    ctx.lineWidth = sel ? 2 : 1; ctx.strokeStyle = sel ? TC.accent : TC["tl-edge"]; rr(x0 + .5, g.y + .5, wv - 1, g.h - 1, 5); ctx.stroke(); ctx.lineWidth = 1;
    ctx.save(); rr(x0, g.y, wv, g.h, 5); ctx.clip();   // a piece's labels and badges stay inside the piece
    { const lbl = fmt(s.in) + "–" + fmt(s.out), tw = ctx.measureText(lbl).width + 8;   // its source range, when it fits
      const lx = dodgePlayhead(Math.max(x0, G) + 4, tw, Math.max(x0, G) + 4, x1 - 4);   // never under the playhead line
      if (lx != null) { ctx.fillStyle = TC["tl-label-bg"]; rr(lx, g.y + 4, tw, 14, 3); ctx.fill(); ctx.fillStyle = TC["tl-label"]; ctx.fillText(lbl, lx + 4, g.y + 14); } }
    const fxs = [s.rev && "Reversed", (s.flipH || s.flipV) && "Mirrored", s.crop && "Cropped", s.mute && "Audio out"].filter(Boolean);
    if (fxs.length && wv > 60) {   // what's been done to this piece
      ctx.font = "600 9.5px -apple-system, system-ui, sans-serif"; let bx = x0 + 4;
      for (const f of fxs) { const w2 = ctx.measureText(f).width + 10; if (bx + w2 > x1 - 50) break; ctx.fillStyle = "rgba(10,14,24,.72)"; rr(bx, g.y + g.h - 18, w2, 14, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillText(f, bx + 5, g.y + g.h - 8); bx += w2 + 4; }
      ctx.font = "10px -apple-system, system-ui, sans-serif";
    }
    if (spOf(s) !== 1 && wv > 34) {   // speed badge
      const lbl = (spOf(s) < 1 ? "◀ " : "▶▶ ") + spOf(s) + "×", tw = ctx.measureText(lbl).width + 10;
      ctx.fillStyle = spOf(s) < 1 ? "#6ec1ff" : "#ffb340"; rr(Math.max(x0 + 4, x1 - tw - 4), g.y + g.h - 18, tw, 14, 7); ctx.fill();
      ctx.fillStyle = "#0b1020"; ctx.font = "600 10px -apple-system, system-ui, sans-serif"; ctx.fillText(lbl, Math.max(x0 + 4, x1 - tw - 4) + 5, g.y + g.h - 8); ctx.font = "10px -apple-system, system-ui, sans-serif";
    }
    ctx.restore();
  }
  // cut marks between spans
  ctx.fillStyle = TC.cut;
  for (let i = 1; i < ss.length; i++) { const x = X(starts[i]); if (x > G) { ctx.beginPath(); ctx.moveTo(x - 4, g.y - 3); ctx.lineTo(x + 4, g.y - 3); ctx.lineTo(x, g.y + 2); ctx.fill(); } }
}
function drawWave(g, ss, starts) {
  const m = TL.media, wv = m && m.wave, main = mainClip(); if (!wv) return;
  const mid = g.y + g.h / 2, w = cv.clientWidth;
  ctx.fillStyle = TC.audio;
  for (let x = G; x < w; x += 2) {
    const E = T(x); if (E < 0 || E > progDur()) continue;
    const t = toS(E) - (main ? main.start : 0), k = Math.floor(t * wv.rate);
    const v = wv.peaks[k] || 0, a = Math.max(1, v / 100 * (g.h / 2 - 1));
    ctx.fillRect(x, mid - a, 1.5, a * 2);
  }
  ctx.fillStyle = TC["tl-bg"]; for (let i = 1; i < ss.length; i++) ctx.fillRect(X(starts[i]) - 1, g.y, 2, g.h);
}
// where to put a label of width w (preferred x, allowed lo..hi) so the playhead line never runs through it; null = no room
function dodgePlayhead(x, w, lo, hi) {
  const px = X(toE(S.t)), gap = 5;
  if (x + w > hi + 0.5) return null;
  if (S.playing || px < x - 2 || px > x + w + 2 || px < G) return x;   // (while playing it stays put: the line only passes over it)
  if (px + gap + w <= hi) return px + gap;          // just after the playhead
  if (px - gap - w >= lo) return px - gap - w;      // or just before it
  return null;
}
// shorten a label with … so it fits a width ("" when not even two letters fit)
function fitText(t, w) { if (ctx.measureText(t).width <= w) return t; while (t.length > 1 && ctx.measureText(t + "…").width > w) t = t.slice(0, -1); return t.length > 1 && ctx.measureText(t + "…").width <= w ? t + "…" : ""; }
// clip names on one track: always inside their own block (never floating beside it), shortened with … when the block is
// short, and left out when there's no room at all (hovering shows the full name). Names never overlap each other.
function laneLabels(g) {
  const W = cv.clientWidth, items = [];
  for (const c of g.ln.clips || []) {
    const e = eff(c); if (e.del) continue;
    for (const [a, b] of spansOf(c, e)) { const x0 = X(a), x1 = Math.max(X(a) + 2, X(b)); if (x1 >= G && x0 <= W) items.push({ c, x0, x1 }); }
  }
  items.sort((u, v) => u.x0 - v.x0 || (u.c.key < v.c.key ? -1 : 1));
  ctx.save();
  let lastEnd = -Infinity;
  const y = g.y + g.h / 2 + 4;
  items.forEach((it, k) => {
    const c = it.c;
    const text = c.type === "cap" ? c.text : c.id + (c.type === "other" && c.text ? "  " + c.text : "") + (c.sfx && c.sfx.vol != null && c.sfx.vol !== 1 ? "  " + Math.round(c.sfx.vol * 100) + "%" : "");
    if (!text) return;
    ctx.font = (c.sfx ? "600 " : "") + (g.h >= 18 ? "11px" : "10px") + " -apple-system, system-ui, sans-serif";
    const inkIn = c.type === "cap" ? TC["cap-ink"] : c.type === "music" ? TC["music-ink"] : c.sfx ? "#2a1500" : "#fff";
    const nx = items.slice(k + 1).find(o => o.x0 > it.x0 + 0.5), nextX = nx ? nx.x0 : W;
    const sp = c.sfx ? 1 : eff(c).sp, badge = sp !== 1 && it.x1 - it.x0 > 40 && it.x1 <= nextX ? ctx.measureText(sp + "×").width + 12 : 0;   // leave the speed badge clear
    const x0 = Math.max(G, it.x0), start = Math.max(x0 + 5, lastEnd + 6), end = Math.min(it.x1 - badge, nextX, W) - 5, room = end - start;
    if (room < 14) return;
    const t = fitText(text, room); if (!t) return;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, g.y, Math.max(0, end + 5 - x0), g.h); ctx.clip();
    ctx.fillStyle = inkIn; ctx.fillText(t, start, y); ctx.restore();
    lastEnd = start + ctx.measureText(t).width;
  });
  ctx.restore();
}
function drawClip(c, g, alpha) {
  const e = eff(c); const col = c.type === "ext" ? TC.audio : css("--" + c.type) || "#888", A = alpha == null ? 1 : alpha;
  const sel = TL.sel && TL.sel.kind === "clip" && TL.sel.key === c.key;
  for (const [a, b] of spansOf(c, e)) {
    const x0 = X(a), x1 = X(b), wv = Math.max(2, x1 - x0);
    if (x1 < G || x0 > cv.clientWidth) continue;
    const E = toE(S.t), on = c.sfx ? a <= E && E < b : e.start <= S.t && S.t < e.end;
    ctx.globalAlpha = A * (e.del ? .2 : on ? 1 : .72);
    ctx.fillStyle = col; rr(x0, g.y, wv, g.h, 3); ctx.fill();
    if (c.sfx) {   // the sound's own waveform
      const wvs = TL.media && TL.media.wave, mstart = (mainClip() || {}).start || 0;
      const pk = c.type === "ext" ? (wvs ? { ext: true } : null) : c.type === "music" ? window.MusicDrawer && MusicDrawer.peaksFor(c.sfx.file) : window.SfxDrawer && SfxDrawer.peaksFor(c.sfx.id);
      if (pk && wv > 6) {
        ctx.save(); rr(x0, g.y, wv, g.h, 3); ctx.clip(); ctx.fillStyle = "rgba(0,0,0,.28)";
        const len = c.sfx.len || c.sfx.dur, mid = g.y + g.h / 2;
        for (let x = Math.max(x0, G); x < x1; x += 2) {
          const tt = (c.sfx.off || 0) + (x - x0) / (x1 - x0) * c.sfx.dur;
          const v = pk.ext ? (wvs.peaks[Math.floor((tt - mstart) * wvs.rate)] || 0) / 100 : pk[Math.min(pk.length - 1, Math.floor(tt / len * pk.length))] || 0, hh = Math.max(1, v * (g.h / 2 - 2));
          ctx.fillRect(x, mid - hh, 1.4, hh * 2);
        }
        ctx.restore();
      }
    }
    if (c.type === "music" && wv > 6) drawFades(c.sfx, x0, x1, g);
    if (e.sp !== 1 && wv > 40) { ctx.save(); rr(x0, g.y, wv, g.h, 3); ctx.clip(); ctx.fillStyle = "rgba(0,0,0,.35)"; const lbl = e.sp + "×", tw = ctx.measureText(lbl).width + 8; rr(x1 - tw - 3, g.y + 2, tw, g.h - 4, 3); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillText(lbl, x1 - tw + 1, g.y + g.h / 2 + 4); ctx.restore(); }
    ctx.globalAlpha = A;
    if (sel) { ctx.strokeStyle = TC.playhead; ctx.lineWidth = 2; rr(x0 + 1, g.y + 1, wv - 2, g.h - 2, 3); ctx.stroke(); ctx.lineWidth = 1; }

  }
}

// a music clip's fades as ramps: the faded-out corner is shaded, with a line from silence up to full level
function drawFades(it, x0, x1, g) {
  const pps = (x1 - x0) / Math.max(1e-6, it.dur), top = g.y + 1.5, bot = g.y + g.h - 1.5;
  const fi = Math.min(it.fadeIn || 0, it.dur / 2) * pps, fo = Math.min(it.fadeOut || 0, it.dur / 2) * pps;
  if (fi < 1.5 && fo < 1.5) return;
  ctx.save(); rr(x0, g.y, x1 - x0, g.h, 3); ctx.clip();
  ctx.fillStyle = TC["tl-fade"]; ctx.beginPath();
  if (fi >= 1.5) { ctx.moveTo(x0, top); ctx.lineTo(x0 + fi, top); ctx.lineTo(x0, bot); ctx.closePath(); }
  if (fo >= 1.5) { ctx.moveTo(x1, top); ctx.lineTo(x1 - fo, top); ctx.lineTo(x1, bot); ctx.closePath(); }
  ctx.fill();
  ctx.strokeStyle = TC["music-ink"]; ctx.lineWidth = 1.25; ctx.beginPath();
  if (fi >= 1.5) { ctx.moveTo(x0, bot); ctx.lineTo(x0 + fi, top); }
  if (fo >= 1.5) { ctx.moveTo(x1 - fo, top); ctx.lineTo(x1, bot); }
  ctx.stroke(); ctx.restore();
}

/* ---------- pointer ---------- */
function hitAt(x, y) {
  if (y < RULER) return { zone: "ruler" };
  if (y < RULER + NOTES_H + 2) return { zone: "notes" };
  const g = (TL.geom || []).find(g => y >= g.y - 1 && y < g.y + g.h + 2); if (!g) return { zone: "empty" };
  const E = T(x);
  if (g.ln.type === "prog" || g.ln.type === "wave") {
    const ss = segs(), st = segStarts(), n = ss.length;
    for (let i = 0; i < n; i++) {
      const xa = X(st[i]), xb = X(st[i] + segLen(ss[i]));
      const inBody = x >= xa && (x < xb || (i === n - 1 && x <= xb));
      if (inBody) return { zone: "seg", i, edge: x - xa < EDGE ? "L" : xb - x < EDGE ? "R" : "body", E, g };
    }
    if (n && x < X(0) && X(0) - x < EDGE) return { zone: "seg", i: 0, edge: "L", E, g };
    if (n) { const xe = X(progDur()); if (x > xe && x - xe < EDGE) return { zone: "seg", i: n - 1, edge: "R", E, g }; }
    return { zone: "empty", g };
  }
  for (const c of g.ln.clips || []) {
    const e = eff(c);
    for (const [a, b] of spansOf(c, e)) {
      const xa = X(a), xb = Math.max(xa + 2, X(b));
      if (x >= xa - 3 && x <= xb + 3) {
        const ez = Math.min(EDGE, (xb - xa) / 4);   // small clips keep a middle you can grab
        const edge = editable(c) && xb - xa > 14 ? (x - xa < ez ? "L" : xb - x < ez ? "R" : "body") : "body";
        return { zone: "clip", c, edge, E, g };
      }
    }
  }
  return { zone: "empty", g };
}
function snapE(E, ignore) {
  if (!TL.snap) return { E, s: null };
  const tol = 8 / (cv.clientWidth - G) * S.view.len, cands = [toE(S.t), 0, progDur(), ...segStarts()];
  for (const c of allClips()) if (!ignore || c.key !== ignore) { const e = eff(c); if (!e.del) for (const [a, b] of spansOf(c, e)) cands.push(a, b); }
  let best = null; for (const c of cands) if (Math.abs(c - E) <= tol && (!best || Math.abs(c - E) < Math.abs(best - E))) best = c;
  return best == null ? { E, s: null } : { E: best, s: best };
}
function cutNear(x) { const st = segStarts(); let best = null, bd = 10; for (let i = 1; i < st.length; i++) { const d = Math.abs(X(st[i]) - x); if (d < bd) { bd = d; best = i; } } return best; }
function iconAt(x, y) {
  if (x >= G) return null;
  const g = (TL.geom || []).find(g => y >= g.y - 1 && y < g.y + g.h + 2); if (!g) return null;
  const ic = laneIcons(g.ln).find(ic => x >= ic.x - 2 && x <= ic.x + 16);
  return ic ? { g: g.ln, what: ic.what } : null;
}
cv.addEventListener("pointerdown", e => {
  if (e.button !== 0) return;
  cv.setPointerCapture(e.pointerId);
  libUnpick();   // anything on the timeline canvas (a clip, a track switch, the ruler) takes over from a Library pick
  const x = e.offsetX, y = e.offsetY, h = hitAt(x, y);
  if (x < G) { const ic = iconAt(x, y); if (ic) { TL.swPress = laneKey(ic.g) + ic.what; laneToggle(laneKey(ic.g), ic.what); draw(); } return; }
  if (INK.sel) { INK.sel = null; inkBump(); }
  FE.sel = null;   // clicking the timeline moves the selection there
  if (h.zone === "notes") {
    const hit = S.notes.filter(n => S.comp && n.comp === S.comp.id && (n.status !== "done" || showDone())).find(n => Math.abs(X(toE(n.t)) - x) < 7);
    if (hit) { S.sel = hit.id; pause(); seek(hit.t); renderNotes(); const el = document.querySelector(`.note[data-id="${hit.id}"]`); el && el.scrollIntoView({ block: "nearest" }); return; }
  }
  if (TL.tool === "razor" && y >= RULER) {
    if (h.zone === "clip" && h.c.type === "music") { TL.sel = { kind: "clip", key: h.c.key }; musicSplit(h.c.sfx, snapE(T(x), h.c.key).E); return; }   // the blade on music cuts the music
    tlSplitAt(snapE(T(x)).E); return;
  }
  if (TL.tool === "roll" && y >= RULER + NOTES_H) {
    const k = cutNear(x);
    if (k == null) { toast("Roll: drag a cut between two footage pieces (split first)"); return; }
    if (!canEdit()) return;
    const ss = segs(); TL.sel = { kind: "seg", i: k };
    TL.drag = { kind: "roll", i: k, x0: x, E0: T(x), oa: clone(ss[k - 1]), ob: clone(ss[k]), moved: false, keep: holdPlaces() };
    pause(); draw(); return;
  }
  if (TL.tool === "slip" && h.zone === "seg") {
    if (!canEdit()) return;
    TL.sel = { kind: "seg", i: h.i };
    TL.drag = { kind: "slip", i: h.i, x0: x, E0: T(x), orig: clone(segs()[h.i]), moved: false, keep: holdPlaces() };
    pause(); draw(); return;
  }
  if (TL.tool === "slip" && h.zone === "clip" && h.c.sfx) {
    TL.sel = { kind: "clip", key: h.c.key };
    TL.drag = { kind: "sfxslip", key: h.c.key, x0: x, E0: T(x), off0: h.c.sfx.off || 0, moved: false };
    pause(); draw(); return;
  }
  if (TL.tool === "slip" && (h.zone === "clip")) { toast("Slip works on footage pieces and sound effects"); }
  if (h.zone === "seg") {
    TL.sel = { kind: "seg", i: h.i };
    const s = segs()[h.i];
    TL.drag = { kind: h.edge === "body" ? "segmove" : "segtrim", edge: h.edge, i: h.i, x0: x, E0: T(x), orig: clone(s), moved: false, wasPlaying: S.playing, keep: holdPlaces() };
    if (h.edge === "body") cv.style.cursor = "grab";
    pause(); draw(); return;
  }
  if (h.zone === "clip") {
    TL.sel = { kind: "clip", key: h.c.key };
    const ee = eff(h.c);
    TL.drag = editable(h.c) ? { kind: h.edge === "body" ? "clipmove" : "cliptrim", edge: h.edge, key: h.c.key, type: h.c.type, x0: x, y0: y, E0: T(x), orig: { start: ee.start, end: ee.end }, lane0: h.g.ln.row, lane: ee.lane, laneStored: ee.lane, moved: false, wasPlaying: S.playing,
                              sfx0: h.c.sfx ? { P: toE(h.c.sfx.start), dur: h.c.sfx.dur, off: h.c.sfx.off || 0, len: h.c.sfx.len || h.c.sfx.dur } : null }
                            : { kind: "click", x0: x, E0: T(x) };
    if (TL.drag.kind === "clipmove") cv.style.cursor = "grab";
    pause(); draw(); return;
  }
  TL.sel = null;
  TL.drag = { kind: "scrub", wasPlaying: S.playing }; pause(); S.follow = false; seekE(T(x));
});
// the cursor over the timeline: a pointer over any clip, its edges resize, and the blade / slip / roll tools show their own
// (holding the button on a clip shows grab, dragging it grabbing: see pointerdown and the drag below)
function tlCursor(x, y, h, hc) {
  h = h || hitAt(x, y);
  if (hc === undefined) hc = TL.tool === "roll" ? cutNear(x) : null;
  return x < G ? "default" : TL.tool === "razor" && y >= RULER ? BLADE_CURSOR
    : TL.tool === "roll" && y >= RULER + NOTES_H ? (hc != null ? "col-resize" : "not-allowed")
    : TL.tool === "slip" && (h.zone === "seg" || (h.zone === "clip" && h.c.sfx)) ? "ew-resize"
    : h.zone === "ruler" ? "col-resize" : h.zone === "notes" ? "pointer"
    : (h.zone === "seg" || h.zone === "clip") ? (h.edge === "L" || h.edge === "R" ? "ew-resize" : "pointer") : "default";
}
cv.addEventListener("pointermove", e => {
  const x = e.offsetX, y = e.offsetY, d = TL.drag;
  TL.hoverX = x;
  if (!d) {
    const h = hitAt(x, y), hv = $("#hover"), ic = iconAt(x, y);
    const hk = ic ? laneKey(ic.g) + ic.what : "", pk = TL.hoverIcon ? laneKey(TL.hoverIcon.g) + TL.hoverIcon.what : "";
    if (hk !== pk) { TL.hoverIcon = ic; draw(); }
    if (ic) {
      cv.style.cursor = "pointer"; const on = !!laneSw(laneKey(ic.g))[ic.what];
      hv.textContent = ic.what === "mute" ? (on ? "Unmute this track" : "Mute this track") : (on ? "Show this track" : "Hide this track");
      hv.style.display = "block"; hv.style.left = (x + 12) + "px"; return;
    }
    const hc = TL.tool === "roll" ? cutNear(x) : null; if (hc !== TL.hoverCut) { TL.hoverCut = hc; draw(); }
    cv.style.cursor = tlCursor(x, y, h, hc);
    let label = x >= G ? fmt(T(x)) : "";
    if (h.zone === "clip") { const ee = eff(h.c); label += "  ·  " + h.c.id + (h.c.text ? ": " + h.c.text : "") + (h.c.sfx ? "  (" + h.c.sfx.dur.toFixed(2) + (h.c.type === "music" ? " s of music, from " + fmt(h.c.sfx.off || 0) + " in the track)" : " s sound)") : "  (" + fmt(ee.start) + "–" + fmt(ee.end) + " source)") + (ee.del ? "  removed" : ""); }
    if (h.zone === "seg") { const s = segs()[h.i]; label += "  ·  footage " + fmt(s.in) + "–" + fmt(s.out) + " (" + segLen(s).toFixed(2) + " s" + (spOf(s) !== 1 ? " at " + spOf(s) + "×" : "") + ")"; }
    hv.textContent = label; hv.style.display = label ? "block" : "none";
    hv.style.left = Math.min(x + 12, cv.clientWidth - hv.offsetWidth - 4) + "px";
    if (TL.tool === "razor") draw();
    return;
  }
  if (d.kind === "slip" || d.kind === "roll" || d.kind === "sfxslip") {
    if (Math.abs(x - d.x0) > 2) d.moved = true; if (!d.moved) return;
    if (!d.began) { tlBegin(); d.began = true; S.ed = S.ed || { clips: {} }; if (!S.ed.segments) S.ed.segments = clone(segs()); }
    const dE = T(x) - d.E0, ss = segs(), min = 4 / FPS;
    if (d.kind === "slip") {   // same length and place, different moment of the footage
      const o = d.orig, k = spOf(o), others = ss.filter((_, j) => j !== d.i);
      const lo = Math.max(0, ...others.filter(q => q.out <= o.in + 1e-6).map(q => q.out)) - o.in;
      const hi = Math.min(S.dur, ...others.filter(q => q.in >= o.out - 1e-6).map(q => q.in)) - o.out;
      const sh = Math.max(lo, Math.min(hi, -dE * k));
      if (hi - lo < 1e-3) { hoverMsg(x, "Slip: no spare footage either side of this piece (trim it first)"); return; }
      ss[d.i].in = +(o.in + sh).toFixed(4); ss[d.i].out = +(o.out + sh).toFixed(4);
      seek(ss[d.i].in); hoverMsg(x, `Slip: footage ${fmt(ss[d.i].in)}–${fmt(ss[d.i].out)}`);
    } else if (d.kind === "roll") {   // move the cut: one piece gets longer, its neighbour shorter
      const a = ss[d.i - 1], b = ss[d.i], oa = d.oa, ob = d.ob, ka = spOf(oa), kb = spOf(ob), others = ss.filter((_, j) => j !== d.i && j !== d.i - 1);
      const hiA = Math.min(S.dur, ...others.filter(q => q.in >= oa.out - 1e-6).map(q => q.in));
      const loB = Math.max(0, ...others.filter(q => q.out <= ob.in + 1e-6).map(q => q.out));
      let dMax = Math.min((hiA - oa.out) / ka, (ob.out - min - ob.in) / kb), dMin = Math.max((oa.in + min - oa.out) / ka, (loB - ob.in) / kb);
      // when b's footage comes after a's, a's end must never pass b's start (pieces at different speeds close that gap)
      if (ob.in >= oa.out - 1e-6 && Math.abs(ka - kb) > 1e-9) { const lim = (ob.in - oa.out) / (ka - kb); if (ka > kb) dMax = Math.min(dMax, lim); else dMin = Math.max(dMin, lim); }
      let dd = Math.max(dMin, Math.min(dMax, dE));
      const sn = snapE(d.E0 + dd); if (sn.s != null && sn.E - d.E0 >= dMin && sn.E - d.E0 <= dMax) { dd = sn.E - d.E0; d.snapE = sn.s; } else d.snapE = null;
      a.out = +(oa.out + dd * ka).toFixed(4); b.in = +(ob.in + dd * kb).toFixed(4);
      seek(b.in); hoverMsg(x, `Roll: cut at ${fmt(a.out)} | ${fmt(b.in)}`);
    } else {
      const c = clipBy(d.key); if (!c) return;
      const it = c.sfx, len = it.len || it.dur;
      it.off = +Math.max(0, Math.min(len - it.dur, d.off0 - dE)).toFixed(4); hoverMsg(x, `Slip: sound from ${it.off.toFixed(2)} s`);
    }
    draw(); return;
  }
  if (d.kind === "scrub") { cv.style.cursor = "col-resize"; seekE(T(x)); return; }
  if (Math.abs(x - d.x0) > 3 || (d.y0 != null && Math.abs(y - d.y0) > 6)) d.moved = true;
  if (!d.moved) return;
  if (d.kind === "segmove" || d.kind === "clipmove") cv.style.cursor = "grabbing";
  if (!d.began && d.kind !== "click" && d.kind !== "segmove") {
    tlBegin(); d.began = true;
    if (d.kind === "segtrim") { S.ed = S.ed || { clips: {} }; if (!S.ed.segments) S.ed.segments = clone(segs()); }
    if (d.kind === "clipmove") { layoutLanes(); draw(); }   // shows an empty row to drop into
  }
  if (d.kind === "click") return;
  const dE = T(x) - d.E0;
  if (d.kind === "segtrim") {
    const ss = segs(), s = ss[d.i], o = d.orig, others = ss.filter((_, j) => j !== d.i), min = 4 / FPS;
    d.snapE = null;
    const segE0 = segStarts()[d.i];
    const sn = v => { const a = snapE(v); if (a.s != null) d.snapE = a.s; return a.E; };
    const k = spOf(o);
    if (d.edge === "L") {
      const lo = Math.max(0, ...others.filter(q => q.out <= o.in + 1e-6).map(q => q.out));
      s.in = Math.max(lo, Math.min(o.out - min, o.in + dE * k));
    } else {
      const hi = Math.min(S.dur, ...others.filter(q => q.in >= o.out - 1e-6).map(q => q.in));
      const E1 = sn(segE0 + (o.out - o.in) / k + dE);       // the right edge sits in program time: snap it there
      s.out = Math.min(hi, Math.max(o.in + min, o.in + (E1 - segE0) * k));
    }
    seek(d.edge === "L" ? s.in : Math.max(s.in, s.out - 1 / FPS));
  } else if (d.kind === "segmove") {
    const st = segStarts(), ss = segs(); let best = 0, bd = Infinity;
    const bounds = st.concat([progDur()]);
    bounds.forEach((b, k) => { const dd = Math.abs(X(b) - x); if (dd < bd) { bd = dd; best = k; } });
    d.insertK = best; d.insertE = bounds[best];
  } else if ((d.kind === "clipmove" || d.kind === "cliptrim") && d.sfx0) {   // sound effects: worked in program time
    const c = clipBy(d.key); if (!c) return;
    const it = c.sfx, o = d.sfx0; d.snapE = null;
    if (d.kind === "clipmove") {
      let P = o.P;
      if (d.xMoved || Math.abs(x - d.x0) > 3) {
        d.xMoved = true; P = o.P + dE;
        const a = snapE(P, c.key), b = snapE(P + o.dur, c.key);
        if (a.s != null) { P = a.E; d.snapE = a.s; } else if (b.s != null) { P = b.E - o.dur; d.snapE = b.s; }
        P = Math.max(0, Math.min(Math.max(0, progDur() - 0.05), P));
      }
      it.start = +toS(P).toFixed(4);
      const rows = (TL.geom || []).filter(g => g.ln.type === c.type);
      const g = rows.find(g => y >= g.y - 2 && y < g.y + g.h + 2) || (rows.length && (y > rows[rows.length - 1].y ? rows[rows.length - 1] : y < rows[0].y ? rows[0] : null));
      if (g && g.ln.row !== (it.row || 0)) { it.row = g.ln.row; layoutLanes(); }
    } else if (d.edge === "L") {
      let P = o.P + dE; const a = snapE(P, c.key); if (a.s != null) { P = a.E; d.snapE = a.s; }
      P = Math.max(o.P - o.off, Math.min(o.P + o.dur - 0.05, P));
      it.off = +(o.off + P - o.P).toFixed(4); it.dur = +(o.dur - (P - o.P)).toFixed(4); it.start = +toS(P).toFixed(4);
    } else {
      let P1 = o.P + o.dur + dE; const b = snapE(P1, c.key); if (b.s != null) { P1 = b.E; d.snapE = b.s; }
      it.dur = +Math.max(0.05, Math.min(o.len - o.off, P1 - o.P)).toFixed(4);
    }
  } else if (d.kind === "clipmove" || d.kind === "cliptrim") {
    const c = S.clips.find(q => q.key === d.key); if (!c) return;
    const o = d.orig, len = o.end - o.start;
    let ns = o.start, ne = o.end; d.snapE = null;
    if (d.kind === "clipmove" && !d.xMoved && Math.abs(x - d.x0) <= 3) { ns = o.start; ne = o.end; }   // straight up/down: only the row changes
    else if (d.kind === "clipmove") {
      d.xMoved = true;
      ns = o.start + dE;
      const a = snapE(toE(ns), c.key), b = snapE(toE(ns + len), c.key);
      if (a.s != null) { ns = toS(a.E); d.snapE = a.s; } else if (b.s != null) { ns = toS(b.E) - len; d.snapE = b.s; }
      ns = Math.max(0, Math.min(S.dur - len, ns)); ne = ns + len;
    } else if (d.edge === "L") {
      ns = o.start + dE; const a = snapE(toE(ns), c.key); if (a.s != null) { ns = toS(a.E); d.snapE = a.s; }
      ns = Math.max(0, Math.min(o.end - 0.05, ns));
    } else {
      ne = o.end + dE; const b = snapE(toE(ne), c.key); if (b.s != null) { ne = toS(b.E); d.snapE = b.s; }
      ne = Math.min(S.dur, Math.max(o.start + 0.05, ne));
    }
    // dragging up or down moves it to another row of the same kind (top row = in front)
    if (d.kind === "clipmove") {
      const rows = (TL.geom || []).filter(g => g.ln.type === c.type);
      const g = rows.find(g => y >= g.y - 2 && y < g.y + g.h + 2) || (rows.length && (y < rows[0].y ? rows[0] : y > rows[rows.length - 1].y ? rows[rows.length - 1] : null));
      if (g && g.ln.row !== (d.lane != null ? d.lane : d.lane0)) { d.lane = g.ln.row; d.relayout = true; }
    }
    S.ed = S.ed || { segments: null, clips: {} }; S.ed.clips = S.ed.clips || {};
    const lane = d.lane != null && d.lane !== d.lane0 ? d.lane : d.laneStored;
    const sp0 = eff(c).sp;
    S.ed.clips[c.key] = { start: +ns.toFixed(4), dur: +(ne - ns).toFixed(4), del: false };
    if (lane != null) S.ed.clips[c.key].lane = lane;
    if (sp0 !== 1) S.ed.clips[c.key].sp = sp0;
    if (Math.abs(ns - c.start) < 1e-4 && Math.abs(ne - c.end) < 1e-4 && lane == null && sp0 === 1) delete S.ed.clips[c.key];
    if (d.relayout) { d.relayout = false; layoutLanes(); draw(); }
    clearTimeout(TL.liveT); TL.liveT = setTimeout(applyClipEdits, 60);
  }
  draw();
});
cv.addEventListener("pointerleave", () => { $("#hover").style.display = "none"; TL.hoverX = null; TL.swPress = null; TL.hoverCut = null; if (TL.hoverIcon) TL.hoverIcon = null; draw(); });
function hoverMsg(x, m) { const hv = $("#hover"); hv.textContent = m; hv.style.display = "block"; hv.style.left = Math.min(x + 12, cv.clientWidth - hv.offsetWidth - 4) + "px"; }
function endDrag(e) {
  const d = TL.drag; if (!d) return; TL.drag = null;
  if (e && e.offsetX != null) cv.style.cursor = tlCursor(e.offsetX, e.offsetY);   // grab / grabbing ends with the drag
  if (TL.needSync) setTimeout(tlSync, 0);
  if (d.kind === "scrub") return;   // dragging the playhead leaves the video paused where you let go
  if (!d.moved || d.kind === "click") { if (d.E0 != null) seekE(d.E0); draw(); return; }   // a click: select + move the playhead there
  if (d.kind === "segmove" && d.insertK != null) {
    const n = clone(segs()); let k = d.insertK;
    if (k === d.i || k === d.i + 1) { draw(); return; }
    tlBegin(); const [g] = n.splice(d.i, 1); if (k > d.i) k--; n.splice(k, 0, g);
    S.ed = Object.assign(S.ed || { clips: {} }, { segments: n }); restorePlaces(d.keep);
    TL.sel = { kind: "seg", i: k }; tlCommit(); toast("Moved"); return;
  }
  if (d.kind === "slip" || d.kind === "roll" || d.kind === "sfxslip") { $("#hover").style.display = "none"; if (!d.began) { draw(); return; } }
  if (d.keep && (d.kind === "segtrim" || d.kind === "roll" || d.kind === "slip")) restorePlaces(d.keep);
  d.snapE = null; tlCommit();
}
cv.addEventListener("pointerup", endDrag);
cv.addEventListener("pointercancel", endDrag);
cv.addEventListener("pointerup", swRelease);
cv.addEventListener("pointercancel", swRelease);
cv.addEventListener("wheel", e => {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) zoomBy(Math.exp(e.deltaY * 0.01), e.offsetX);
  else {
    const D = progDur() || 10, dd = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / (cv.clientWidth - G) * S.view.len;
    S.view.start = Math.max(0, Math.min(D - S.view.len, S.view.start + dd)); S.follow = false; draw();
  }
}, { passive: false });
cv.addEventListener("dblclick", e => { if (e.offsetX < G || hitAt(e.offsetX, e.offsetY).zone === "ruler") fitView(); });
new ResizeObserver(draw).observe(cv);

/* ---------- toolbar + resizing the timeline ---------- */
$("#tlbar").addEventListener("mousedown", e => { if (e.target.closest("button")) e.preventDefault(); });
document.querySelectorAll("#tlbar [data-ttool]").forEach(b => b.onclick = () => tlSetTool(b.dataset.ttool));
$("#tlSplit").onclick = () => tlSplitAt(toE(S.t));
$("#tlDel").onclick = tlDelete;
$("#tlUndo").onclick = () => undoAny(true); $("#tlRedo").onclick = () => redoAny();
$("#tlReset").onclick = tlReset;
$("#tlExport").onclick = async () => {
  const b = $("#tlExport");
  if (!S.comp || S.comp.kind !== "video" || !edActive() || b.disabled) return;
  const comp = S.comp.id; b.disabled = true;
  try {
    clearTimeout(TL.saveT); TL.gen = (TL.gen || 0) + 1;   // save the latest cut first, after any save already on its way
    try { await TL.inflight; } catch {}
    await api("/api/notes", { op: "edits", comp, label: S.comp.label, kind: "video", summary: edSummary(),
      edits: { segments: seqEdited() ? clone(segs()) : null, clips: {}, format: fmtOf() ? clone(fmtOf()) : null, sfx: clone(sfxItems()), lanes: clone((S.ed && S.ed.lanes) || {}) } });
    TL.pending = false;
    let st = await api("/api/export", { comp });
    if (st.error) { toast(st.error); return; }
    while (st.state === "running") {
      b.innerHTML = '<svg><use href="#i-export"/></svg>Exporting ' + Math.round((st.progress || 0) * 100) + "%";
      await new Promise(r => setTimeout(r, 600));
      st = await api("/api/export?comp=" + encodeURIComponent(comp));
    }
    if (st.state === "done") { toast("Exported: " + st.out.split("/").pop()); S.info = await api("/api/info"); fillComps(); DD.comp.set(S.comp.id); }
    else toast("Export failed" + (st.error ? ": " + st.error : ""));
  } catch { toast("Lost touch with the server during export"); }
  finally { b.disabled = false; b.innerHTML = '<svg><use href="#i-export"/></svg>Export cut'; }
};
$("#tlTrimS").onclick = () => tlTrimTo("start"); $("#tlTrimE").onclick = () => tlTrimTo("end");
/* timeline settings menu */
const TLSET = [
  { k: "snap", label: "Snapping", hint: "S", sub: "Edges snap to the playhead, cuts and clips" },
  { k: "magnet", label: "Magnetic timeline", hint: "", sub: "Overlays, captions and sounds stay stuck to the footage when you cut or move it" },
  { k: "loop", label: "Loop playback", hint: "⌘L", sub: "Loops the I–O range, or the whole video" },
  { k: "follow", label: "Follow the playhead", hint: "", sub: "The timeline scrolls while it plays" },
  { k: "strip", label: "Filmstrip thumbnails", hint: "", sub: "Frames from the footage on its track" },
  { k: "wave", label: "Audio waveform", hint: "", sub: "Show the footage's sound as its own track" },
];
const tlSetGet = k => k === "loop" ? S.loop : TL[k];
function tlSetToggle(k) {
  if (k === "loop") { $("#loop").click(); }
  else { TL[k] = !TL[k]; store.set("hfr:" + k, TL[k] ? "1" : "0"); if (k === "follow") S.follow = TL.follow; if (k === "wave") layoutLanes(); }
  if (k === "snap") toast(TL.snap ? "Snapping on" : "Snapping off");
  if (k === "magnet") toast(TL.magnet ? "Magnetic: clips stick to the footage" : "Magnetic off: clips keep their place in time");
  tlSetPaint(); draw();
}
function tlSetPaint() {
  $("#tlSnap").classList.toggle("on", TL.snap);
  $("#tlSetPop").innerHTML = TLSET.map(o => `<button type="button" class="tls-o" role="menuitemcheckbox" aria-checked="${!!tlSetGet(o.k)}" data-k="${o.k}"><span class="tls-sw"></span><span class="tls-t"><b>${o.label}</b><small>${o.sub}</small></span>${o.hint ? `<kbd>${CnKeys.text(o.hint)}</kbd>` : ""}</button>`).join("");
}
$("#tlSetBtn").onclick = e => {
  e.stopPropagation(); const r = $("#tlSet"); r.classList.toggle("open");
  if (!r.classList.contains("open")) return;
  tlSetPaint();
  const b = $("#tlSetBtn").getBoundingClientRect(), pop = $("#tlSetPop");
  pop.style.left = Math.max(8, Math.min(innerWidth - 328, b.left)) + "px"; pop.style.bottom = (innerHeight - b.top + 8) + "px";
};
$("#tlSetPop").addEventListener("click", e => { const b = e.target.closest(".tls-o"); if (b) tlSetToggle(b.dataset.k); });
document.addEventListener("pointerdown", e => { if (!e.target.closest("#tlSet")) $("#tlSet").classList.remove("open"); });
$("#tlSnap").onclick = () => tlSetToggle("snap");
$("#loop").addEventListener("click", () => setTimeout(tlSetPaint, 0));
tlSetPaint();
/* speed of the selected piece, volume of the selected sound */
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const DDSP = Dropdown($("#ddClipSpeed"), { prefix: "Speed", onChange: v => tlSetSpeed(v) });
DDSP.setItems(SPEEDS.map(v => ({ value: v, label: v + "×", short: v + "×", hint: { 0.25: "super slow-mo", 0.5: "slow-mo", 1: "normal", 2: "fast", 4: "very fast" }[v] || "" })), 1);
const DDVOL = Dropdown($("#ddVol"), { prefix: "Volume", onChange: v => tlSetVol(v) });
DDVOL.setItems([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(v => ({ value: v, label: Math.round(v * 100) + "%", short: Math.round(v * 100) + "%", hint: v === 1 ? "as recorded" : v > 1 ? "louder in the build" : "" })), 1);
let selSig = "";
function tlSelSync() {
  const sel = TL.sel, c = sel && sel.kind === "clip" ? clipBy(sel.key) : null;
  const sp = sel && sel.kind === "seg" ? spOf(segs()[sel.i] || {}) : c && c.type === "video" && editable(c) ? eff(c).sp : null;
  const vol = c && c.sfx ? (c.sfx.vol == null ? 1 : c.sfx.vol) : null;
  const sig = sp + "|" + vol; if (sig === selSig) return; selSig = sig;
  $("#ddClipSpeed").classList.toggle("off", sp == null); $("#ddClipSpeed").title = sp == null ? "Select a footage piece or a b-roll clip to change its speed" : "Slow motion or speed up the selected clip";
  DDSP.set(sp == null ? 1 : sp);
  $("#ddVol").style.display = vol == null ? "none" : ""; if (vol != null) DDVOL.set(vol);
}
$("#tlZin").onclick = () => zoomBy(1 / 1.6); $("#tlZout").onclick = () => zoomBy(1.6); $("#tlFit").onclick = fitView;
// the timeline keeps the height you gave it, but never squeezes the video: on a short window (or at a high browser zoom)
// it gives way so the stage keeps at least ~40% of the room (the stored height comes back when there's space again)
function tlRoom() {
  if (matchMedia("(max-width: 900px)").matches) return Math.max(150, Math.round(innerHeight * 0.45));
  const fixed = ($("header") ? $("header").offsetHeight : 52) + $("#transport").offsetHeight + $("#tlbar").offsetHeight + $("#tlgrip").offsetHeight + 2;
  const free = innerHeight - fixed;
  return Math.max(150, Math.min(Math.round(innerHeight * 0.7), free - Math.max(170, Math.round(free * 0.42))));
}
function applyTlH() { const h = Math.max(150, Math.min(TL.h, tlRoom())); if ($("#tlwrap").style.height !== h + "px") { $("#tlwrap").style.height = h + "px"; draw(); } }
function setTlH(px, keep) { TL.h = Math.max(160, Math.min(Math.round(innerHeight * 0.7), px)); if (!keep) store.set("hfr:tlh", String(TL.h)); applyTlH(); draw(); }
setTlH(TL.h, true);
addEventListener("resize", applyTlH);
new ResizeObserver(() => { const b = $("#tlbar"); b.classList.toggle("compact", b.clientWidth < 980); requestAnimationFrame(applyTlH); }).observe($("#tlbar"));
$("#tlgrip").addEventListener("pointerdown", e => {
  const y0 = e.clientY, h0 = Math.min(TL.h, $("#tlwrap").offsetHeight || TL.h); e.target.setPointerCapture(e.pointerId);
  const mv = ev => setTlH(h0 - (ev.clientY - y0));
  const up = () => { e.target.removeEventListener("pointermove", mv); e.target.removeEventListener("pointerup", up); };
  e.target.addEventListener("pointermove", mv); e.target.addEventListener("pointerup", up);
});
document.querySelectorAll("#tlbar [data-ttool]").forEach(b => b.onclick = () => { tlSetTool(b.dataset.ttool); if (b.dataset.ttool !== "select") setTool("select"); });
tlSetTool("select");
