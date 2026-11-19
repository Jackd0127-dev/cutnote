# Cutnote: instructions for agents

Cutnote is a local review player and timeline editor for videos and HyperFrames compositions. The person reviews and marks up their video in the browser, and you (the agent) act on what they leave.

## Installing it for someone

1. Check the tools:
   - `python3 --version` must be 3.8 or newer.
   - `ffmpeg -version` and `ffprobe -version` must work. If they're missing, give the install command for their system (`brew install ffmpeg`, `sudo apt install ffmpeg`, `winget install ffmpeg`) and ask before running it.
2. Get the code:
   - `git clone https://github.com/Jackd0127-dev/cutnote.git ~/.cutnote`, or run `install.sh`, which also adds a `cutnote` command.
   - Don't install anything system-wide without asking.
3. If they review HyperFrames compositions (HTML files with `data-composition-id`), run `npx hyperframes --version` once so the player files are on the machine.
4. Start it in the background on their folder: `python3 ~/.cutnote/review.py "<folder>" --no-open`.
5. Give them the URL it prints (usually http://localhost:4790). If that port is busy it moves to the next free one.

## The review loop

1. They review in the browser and leave notes. When they say they're done, read `review-notes.md`.
   - Folder layout: it sits in the folder they opened.
   - Studio layout: it's in `Project/<name> Edit/edit/`.
2. Each open note has:
   - a time, in seconds of that version
   - a kind: *fix*, *change* or *remember*
   - their words
   - what was on screen at that moment
   - sometimes a drawing (✎), which lists boxes and scribbles in canvas pixels and points to a PNG in `review-drawings/`
3. For a drawing on a composition, the PNG holds the marks only. Lay it over a frame grab of that moment to see what they meant.
4. Make the change, then:
   - rebuild the composition, or re-export the video
   - in `review-notes.json`, set that note's `status` to `"done"` and add a short `"reply"` saying what you did
   - the player picks up both changes live
5. Notes of kind *remember* are lasting preferences. Save them wherever durable rules live for this person or project.
6. **Timeline edits**: the `edits` entries in the JSON, shown as "Timeline edits to bake" in the `.md`.
   - On a composition they are an edit list: the spans of the main footage to keep, in order; overlay and caption moves or retimes; removals; optionally a delivery format with a crop window; and on-frame changes. On-frame changes move an element by dx/dy canvas pixels, scale it around its centre, hide it, or change its text, and name the element by `#id` or by its child path from the composition root. Re-cut and rebuild from the source footage so it plays like that, then delete that version's entry from `edits`.
   - On a plain video file the person can press **Export cut** themselves.
7. Never render a final version they haven't approved in the player, if the project uses the approval gate (`review.py --gate`).

## Working on Cutnote's code

- `review.py` is the HTTP server. It uses the standard library only; ffmpeg and ffprobe are called as subprocesses.
- `review.html` holds the page, the player adapters, notes, drawing, dropdowns and themes.
- `timeline.js` is the canvas timeline editor. It loads after the inline script.
- Colours are CSS variables, with one set for dark and one for light. The canvas reads them through `readTheme()`, so never hard-code a colour in canvas code.
- Edits are stored in source time (the version's own clock). The timeline shows program time, after the edits. `toE()` and `toS()` convert between the two.
- Keep it dependency-free: no build step, no npm packages in the page.

### Checks before you commit

1. `python3 -m py_compile review.py`
2. Make a test clip:

   ```bash
   ffmpeg -f lavfi -i testsrc2=size=1080x1920:rate=30 -f lavfi -i sine -t 6 -c:v libx264 -pix_fmt yuv420p -c:a aac /tmp/ct/clip.mp4
   ```

3. Run `python3 review.py /tmp/ct --no-open` and, in a browser:
   - split, delete, reorder and trim the footage
   - pick a format and drag the crop window
   - export, and check the output with ffprobe
   - add a note with a drawing
   - switch between light and dark mode
4. Make sure the browser console shows no errors.

## Safety rules the code keeps

- It serves only files inside the opened folder. It never serves anything under a `Keys` or `private` folder, or a `.env` file.
- It never overwrites a video. Exports get a new `(edited N)` name.
- It binds to 127.0.0.1 by default.
