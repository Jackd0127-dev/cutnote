# Cutnote

**Review, mark up and cut videos in your browser, then hand the notes to Claude.**

Cutnote is a small local video review player and editor. Open a folder, and it plays your videos and [HyperFrames](https://www.npmjs.com/package/hyperframes) compositions live, with no render step. You pause anywhere, write a note, draw on the frame, and cut the footage on a timeline. Everything is saved as plain files that an AI assistant such as Claude Code (or a human editor) can read and act on.

It runs on your machine and needs no account or upload. It is one Python file plus one page, and has no dependencies beyond Python and ffmpeg.

## What it does

- **Live review.** Plays HyperFrames compositions straight from their HTML and reloads by itself when the file is rebuilt, keeping your place. Also plays `.mp4`, `.mov`, `.m4v` and `.webm` files.
- **Timestamped notes.** Press <kbd>N</kbd>, type, press <kbd>Enter</kbd>. Notes are tagged *Fix*, *Change* or *Remember*, can cover an in/out range, and record what was on screen at that moment. They land in `review-notes.md` and `review-notes.json`.
- **Draw on any frame.** Scribble and box tools, any colour and three line widths. Marks can be selected, moved, resized and deleted. Each drawing is saved as a PNG next to the notes.
- **A real timeline.**
  - Blade tool: <kbd>B</kbd>, then click to cut.
  - Split at the playhead: <kbd>⌘B</kbd>.
  - Ripple delete: <kbd>⌫</kbd>.
  - Trim to the playhead: <kbd>Q</kbd> / <kbd>W</kbd>.
  - Drag pieces to reorder them, drag their edges to trim.
  - Move and trim overlays, captions and sound.
  - Snapping, undo and redo, zoom.
  - A filmstrip and waveform for the main footage.
- **Formats.** Reframe for 9:16, 4:5, 1:1, 16:9 or 4:3. Drag a crop window over the frame to choose what stays in the shot.
- **Export cut.** For plain video files, Cutnote renders your cut and reframe with ffmpeg as a new file next to the original: `name (edited).mp4`. It never overwrites anything.
- **Approval gate.** For compositions, an *Approve* button records the exact build you signed off. A render script can refuse anything that isn't approved.
- **Light and dark mode**, custom dropdowns, and editor-standard shortcuts. Press <kbd>?</kbd> in the app for the full list.

## Install

### With Claude Code (easiest)

Paste this into Claude Code:

```text
Install Cutnote from https://github.com/Jackd0127-dev/cutnote (follow its AGENTS.md), then open it on the folder with my video.
```

Claude clones the repo, checks for Python and ffmpeg, starts Cutnote and gives you the link. When you've left notes, say *"I've left notes"*. Claude reads `review-notes.md`, makes the changes and marks each note done with a reply. The player updates live.

### One command

```bash
curl -fsSL https://raw.githubusercontent.com/Jackd0127-dev/cutnote/main/install.sh | sh
```

This clones Cutnote to `~/.cutnote` and adds a `cutnote` command in `~/.local/bin`. Then:

```bash
cutnote ~/Videos/my-project
```

### By hand

```bash
git clone https://github.com/Jackd0127-dev/cutnote.git
```

```bash
python3 cutnote/review.py ~/Videos/my-project
```

### Requirements

- **Python 3.8+**, standard library only.
- **ffmpeg and ffprobe**, used for the filmstrip, the waveform and Export cut. Install with `brew install ffmpeg`, `sudo apt install ffmpeg` or `winget install ffmpeg`.
- **Node.js 18+**, only if you review HyperFrames compositions. Run `npx hyperframes --version` once so the player is on your machine. Cutnote finds it automatically, or you can point `HYPERFRAMES_DIST` at a `hyperframes/dist` folder.

## Using it

```text
cutnote [folder] [--port 4790] [--host 127.0.0.1] [--no-open]
```

Cutnote looks up to four levels down for:

- compositions: `.html` files with `data-composition-id`
- videos: `.mp4`, `.mov`, `.m4v` and `.webm` files

Pick one from the version menu. It saves these next to your files:

| File | What it holds |
| --- | --- |
| `review-notes.md` | Every note, with times, what was on screen, drawings, and any timeline edits still to apply. Written for people and AI assistants. |
| `review-notes.json` | The same data, used by the player. Set a note's `status` to `done` and add a `reply`, and the player shows it. |
| `review-drawings/` | One PNG per drawing, sized to the video's canvas. |
| `.review-cache/` | Filmstrip and waveform cache. Safe to delete. |

**Timeline edits on a composition** play live in the browser but don't change your HTML. They're written to `review-notes.md` as an edit list for whoever builds the composition (you or Claude) to rebuild from source. **Timeline edits on a video file** can be exported directly with *Export cut*.

### Studio layout

If the folder you open is inside a video folder that has a `Project/` folder, Cutnote uses the studio layout:

- compositions in `Project/`
- renders in `Exports/`
- notes in `Project/<name> Edit/edit/`

`python3 review.py --gate "<Edit folder>" <n>` exits 0 only when version `n` (`trial-<n>.html`) is approved and has no pending timeline edits. Call it from a render script to stop unreviewed renders.

## Keyboard

| Keys | Action |
| --- | --- |
| <kbd>Space</kbd> | Play or pause. |
| <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> | Back 1 s, stop, play (press <kbd>L</kbd> again to go faster). |
| <kbd>←</kbd> <kbd>→</kbd> | Step one frame (add <kbd>⇧</kbd> for 10). |
| <kbd>↑</kbd> <kbd>↓</kbd> | Jump to the previous or next cut. |
| <kbd>B</kbd> / <kbd>V</kbd> | Blade or select tool. |
| <kbd>⌘B</kbd> | Split at the playhead. |
| <kbd>⌫</kbd> | Delete. |
| <kbd>Q</kbd> <kbd>W</kbd> | Trim to the playhead. |
| <kbd>⌘Z</kbd> <kbd>⇧⌘Z</kbd> | Undo, redo. |
| <kbd>I</kbd> <kbd>O</kbd> <kbd>X</kbd> | Mark in, mark out, clear. |
| <kbd>⌘L</kbd> | Loop the in/out range. |
| <kbd>N</kbd> | New note. |
| <kbd>[</kbd> <kbd>]</kbd> | Previous or next note. |
| <kbd>P</kbd> <kbd>R</kbd> <kbd>H</kbd> | Scribble, box, hide drawings. |
| <kbd>=</kbd> <kbd>−</kbd> <kbd>\\</kbd> | Zoom in, zoom out, fit. |
| <kbd>⇧D</kbd> | Light or dark mode. |
| <kbd>?</kbd> | Show every shortcut. |

## Privacy and safety

- Cutnote listens on `127.0.0.1` only, unless you pass `--host`.
- It serves files from the folder you opened and nothing outside it.
- It refuses any path through a `Keys` or `private` folder, and any `.env` file.
- Nothing is uploaded anywhere.

## Project layout

| File | What it is |
| --- | --- |
| `review.py` | The local server: finds versions, serves the player, stores notes, builds filmstrips and waveforms, exports cuts. |
| `review.html` | The app: player, notes, drawing, dropdowns, themes. |
| `timeline.js` | The timeline editor. |
| `install.sh` | The one-command installer. |
| `AGENTS.md` | Instructions for AI agents installing, using or changing Cutnote. |

## License

MIT. See [LICENSE](LICENSE). HyperFrames is a separate project with its own license, and Cutnote is not affiliated with it.
