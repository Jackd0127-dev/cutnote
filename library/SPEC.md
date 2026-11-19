# Component library: the contract

A library of animated overlays for 1080×1920 talking-head videos. Any AI (Claude, Codex, Cursor…) or any HyperFrames
composition can use a component: load `vendor/gsap.min.js` (or the composition's own GSAP), `runtime.js`, and the
component's `components/<id>/component.js`, then mount it on the timeline.

```js
VideoLibrary.base = "library/";            // folder holding fonts/ and preview/, relative to the page
VideoLibrary.mount("kinetic-type", {
  root: document.querySelector("#overlays"),   // an element covering the 1080x1920 canvas
  tl,                                          // the composition's GSAP timeline
  start: 12.4,                                 // composition seconds
  params: { lines: ["no money", "[no risk]"], at: [0.1, 0.7] },
});
```

## Folder

| Path | What |
| --- | --- |
| `runtime.js` | `VideoLibrary.register / mount / preview / defaults / list` |
| `editor.js` | Shared settings form + big preview (gallery and the review player use it) |
| `gallery.html` | Browse every component live (`python3 manifest.py`, then serve this folder) |
| `components/<id>/component.js` | One component. Dropping a folder in adds it: nothing else to edit |
| `fonts/` | Open-licence fonts the components use: ArchivoXB / ArchivoSB / ArchivoM (Archivo), Typewriter (IBM Plex Mono), PlayfairI |
| `preview/` | Sample images for image params (scenes, before/after pairs, a product, a made-up wordmark) and the preview backdrop |
| `vendor/gsap.min.js` | GSAP 3.15 |

## Writing a component

```js
VideoLibrary.register({
  id: "price-slider",                 // = folder name, kebab-case
  name: "Price slider",               // plain name shown in the library
  category: "Data & numbers",         // Text | Data & numbers | Cards | Media | People | Series | Transitions | Captions
  collection: "Data & numbers",       // the one collection it is listed under; `order` sorts it inside (see below)
  order: 2,
  preview: { background: "photo" },   // library card backdrop: "light" (default) | "photo" | "dark"
  source: "Day 20",                   // where it was first used
  description: "One sentence: what it shows and how it moves.",
  tags: ["price", "money"],
  duration: 3.5,                      // default length (s); the user can change it
  params: [                           // every visible text, number, time and position is a param
    { key: "value", label: "Price", type: "number", default: 24 },
    { key: "rollAt", label: "Digits roll at (s)", type: "time", default: 0.4 },
  ],
  sfx: [{ file: "switch_003", at: "rollAt" }],   // suggestions only, never played by the runtime
  css: `.vl-price-slider .v{...}`,    // EVERY rule scoped under .vl-<id>
  html(p, c) { return `...`; },       // markup; ids via c.id("name")
  animate(tl, p, c) { ... },          // tweens at c.at(seconds-from-start); end with c.exit(tl, ...)
});
```

Collections: every component sets `collection` (exactly one) and a numeric `order` within it. Motion graphics use
Cinematic · Clean cards · Data & numbers · Photos & media · Series; caption styles use House · Bold · Character.

Previews: `VideoLibrary.preview` shows a component alone on a backdrop. The default is a clean near-white (`light`); pieces
made of white type or glow that sit on footage set `preview: { background: "photo" }` (a soft-focus dark room,
`preview/backdrop-scene.jpg`); `dark` is a plain dark gradient. Full-frame pieces fill the card.

Param types: `text`, `longtext`, `lines` (array of strings), `number`, `time` (seconds from the component's start;
`null` = skip that beat), `times` (array), `box` (`[x0, y0, x1, y1]` canvas px), `select` (+ `options`), `bool`,
`color`, `image` (a URL; default to a `preview/` placeholder), `json`.

The `c` helper: `c.id(name)` unique element id · `c.$(sel)` selector scoped to this instance · `c.at(s)` component
seconds → timeline seconds · `c.end` timeline time it ends · `c.exit(tl, sel, extra)` the house exit (fade + lift over the
last 0.28 s) · `c.scrim(top, strength, at)` soft dark gradient from `top` to the bottom of the canvas, faded in and out
automatically (call it inside `html`) · `c.rng(seed)` deterministic random · `c.esc(s)` · `c.marks(s)` escape and turn
`[word]` into a lime `<em>` · `c.lime` = `#c8ff3a` · `c.base` folder for `preview/` and `fonts/`.

Rules:
- Deterministic: no `Math.random`, no timers, no `requestAnimationFrame`. Everything is a tween on `tl` (HyperFrames seeks
  the timeline frame by frame). Counters use a tweened object with `onUpdate`.
- Use `fromTo` for anything that can be seeked backwards; later tweens on an already-tweened property pass
  `immediateRender: false`.
- Times inside a component are always relative to its start. Never hard-code composition times.
- Elements start hidden (`opacity: 0` in CSS) and are revealed by tweens; the runtime shows the wrapper at `start`
  and hides it after `end`.
- No external URLs: images come from params; fonts from `fonts/`.
- The house look (Day 17–20): white type with soft shadows, ArchivoXB headlines, Typewriter labels, lime `#c8ff3a`
  accents, clean white cards (`border-radius` 26–36px, deep soft shadow, ink `#17120e` text) or cinematic dark scrims.
  No paper notes, ink rings or risers.

## Captions

Caption styles are components in the `Captions` category with `captions: true`. Params: `text` (the words), `wordAt`
(seconds between words in the preview), `y` (caption centre line). Real edits feed word timings from the transcript;
the preview fakes them.
