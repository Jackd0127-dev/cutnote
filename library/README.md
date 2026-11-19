# Component library

Reusable animated overlays and caption styles, grouped into collections (Cinematic, Clean cards, Data & numbers, Photos & media, Series; captions: House, Bold, Character), for 1080×1920 talking-head videos, pulled out of real edits.
Each one plays live, can be dragged into a video in the review player, and can be mounted by any HyperFrames composition
or any AI that reads `SPEC.md`.

| Path | What it is |
| --- | --- |
| `components/` | One folder per component (`component.js`). Add a folder and it shows up everywhere |
| `SPEC.md` | The contract: how to write a component and how an AI or composition uses one |
| `runtime.js` | `VideoLibrary.register / mount / preview` |
| `editor.js` | Settings form + big preview, shared by the gallery and the review player |
| `gallery.html` | Standalone browser: run `python3 manifest.py`, serve this folder, open `gallery.html` |
| `manifest.py` | Writes `manifest.json` (the list of component folders) for the gallery |
| `fonts/` | Open-licence fonts (Archivo, IBM Plex Mono, Playfair Display) |
| `preview/` | Sample images the components show by default (before/after pairs, scenes, a product, a made-up wordmark) and the soft-focus room behind on-footage pieces. All rendered from our own mockups: no real brands or people |
| `vendor/` | GSAP |
| `sfx/` | 50 original sound effects (`sounds/*.mp3`, listed in `sounds.json`), synthesized by `make_sfx.py`. The review player's **Sounds** tab |

## Using it while editing

In the review player (Cutnote), the sidebar has **Notes**, **Library**, **Captions** and **Sounds** tabs:

- every card plays on loop; pick a collection from the dropdown; click a card to change its text, numbers and timings;
- drag it onto the video (placed there, at the playhead) or onto the timeline (at that time), or press **Add at playhead**. It is saved at once, plays live on the video inside a neon outline, and gets a neon block on the timeline's Library lane: drag the block to retime it, its right edge to change the length, the outline's chip (or the component, with the Select tool) to move it;
- a caption style dropped on the video applies to the whole video (magenta).

Each placement is a review note with the component attached, and Claude builds it into the edit properly on the next run.

## Going to the cloud later

Everything here is plain files with no build step. Cutnote ships it as `library/` next to `review.py`, so every install has
it and gets new components with each update. A hosted gallery or MCP server can serve the same folder: add an MCP server that lists `components/` and returns a component's `component.js` + `SPEC.md`.
