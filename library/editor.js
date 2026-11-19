/* Shared settings panel for one component: a big looping preview, a form for its params, and the JSON an AI needs
 * to drop it into a video. Used by gallery.html and by the review player's library drawer. */
(function (g) {
  "use strict";
  const L = g.VideoLibrary;
  const E = (g.VLEditor = {});

  function fieldValue(p, raw) {
    switch (p.type) {
      case "number": case "time": return raw === "" ? (p.type === "time" ? null : p.default) : +raw;
      case "bool": return !!raw;
      case "lines": return raw.split("\n").map(s => s.trim()).filter(Boolean);
      case "times": case "box": return raw.split(/[\s,]+/).filter(Boolean).map(Number);
      case "json": try { return JSON.parse(raw); } catch { return p.default; }
      default: return raw;
    }
  }
  function show(p, v) {
    if (v == null) return "";
    if (p.type === "lines") return v.join("\n");
    if (p.type === "times" || p.type === "box") return v.join(", ");
    if (p.type === "json") return JSON.stringify(v);
    return String(v);
  }
  function input(p, v) {
    const id = "vlf-" + p.key;
    if (p.type === "bool") return `<input id="${id}" data-k="${p.key}" type="checkbox" ${v ? "checked" : ""} style="width:auto">`;
    if (p.type === "select") return `<select id="${id}" data-k="${p.key}">${p.options.map(o => `<option ${o === v ? "selected" : ""}>${L.esc(o)}</option>`).join("")}</select>`;
    if (p.type === "lines" || p.type === "json" || p.type === "longtext") return `<textarea id="${id}" data-k="${p.key}">${L.esc(show(p, v))}</textarea>`;
    if (p.type === "color") return `<input id="${id}" data-k="${p.key}" type="color" value="${L.esc(v)}">`;
    const t = p.type === "number" || p.type === "time" ? "number" : "text";
    const step = p.type === "time" ? ' step="0.05"' : "";
    return `<input id="${id}" data-k="${p.key}" type="${t}"${step} value="${L.esc(show(p, v))}">`;
  }

  /* open(host, id, opts) -> { params(), destroy() }
   *   opts.width     preview width (px)
   *   opts.actions   extra HTML for the button row (e.g. "Add at playhead")
   *   opts.onAction  (name, params) => void for buttons with data-act */
  E.open = function (host, id, opts) {
    const o = opts || {};
    const def = L.components[id];
    if (!def) return null;
    const params = L.defaults(id);
    if (host._vlEd) host._vlEd.destroy();
    host.innerHTML = `<div class="big"></div><h2>${L.esc(def.name)}</h2><p>${L.esc(def.description || "")}</p>
      <div class="f"><label for="vlf-duration">Length (s)</label><input id="vlf-duration" data-k="duration" type="number" step="0.1" value="${params.duration}"></div>
      ${def.params.map(p => `<div class="f"><label for="vlf-${p.key}">${L.esc(p.label || p.key)}</label>${input(p, params[p.key])}</div>`).join("")}
      <div class="row">${o.actions || ""}<button class="g" data-act="copy">Copy for AI</button></div>
      <pre class="snip"></pre>`;
    const big = host.querySelector(".big");
    let pv = null;
    const render = () => {
      if (pv) pv.destroy();
      pv = L.preview(big, id, { width: o.width || 240, params, radius: 14 });
      host.querySelector(".snip").textContent = E.snippet(id, params);
    };
    host.addEventListener("input", onInput);
    host.addEventListener("click", onClick);
    let h = 0;
    function onInput(e) {
      const k = e.target.dataset && e.target.dataset.k; if (!k) return;
      const p = k === "duration" ? { type: "number", default: def.duration } : def.params.find(x => x.key === k);
      params[k] = fieldValue(p, e.target.type === "checkbox" ? e.target.checked : e.target.value);
      clearTimeout(h); h = setTimeout(render, 250);
    }
    function onClick(e) {
      const b = e.target.closest("[data-act]"); if (!b) return;
      if (b.dataset.act === "copy") {
        navigator.clipboard && navigator.clipboard.writeText(E.snippet(id, params));
        b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy for AI"), 1200);
        return;
      }
      o.onAction && o.onAction(b.dataset.act, JSON.parse(JSON.stringify(params)));
    }
    render();
    const api = {
      params: () => JSON.parse(JSON.stringify(params)),
      destroy() { if (pv) pv.destroy(); host.removeEventListener("input", onInput); host.removeEventListener("click", onClick); host._vlEd = null; },
    };
    host._vlEd = api;
    return api;
  };

  // what an AI (or a composition) needs to use it: the component id and the changed params
  E.snippet = function (id, params) {
    const d = L.defaults(id), out = {};
    for (const k of Object.keys(params)) if (JSON.stringify(params[k]) !== JSON.stringify(d[k])) out[k] = params[k];
    return `VideoLibrary.mount(${JSON.stringify(id)}, { root, tl, start: <seconds>, params: ${JSON.stringify(out)} });`;
  };
})(window);
