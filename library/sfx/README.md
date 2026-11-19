# Sound effects

50 short sound effects for video editing (whooshes, swipes, pops, clicks, UI sounds, impacts, risers, glitches, cartoon sounds, coins, camera), listed in `sounds.json` and stored as MP3s in `sounds/`.

Every sound is synthesized from maths by `make_sfx.py` (Python 3 and numpy only). There are no samples, downloads or third-party audio, so the sounds are original and free to use under the same licence as the rest of this repo.

## Regenerate

```
python3 make_sfx.py
```

Runs from any folder. It writes 48 kHz float WAVs to a scratch folder (set `SFX_BUILD_DIR` to change it), encodes each with ffmpeg (`libmp3lame`, `-q:a 2`, 44.1 kHz) into `sounds/`, rewrites `sounds.json`, and prints a table of duration, mean and max level. Noise is seeded from each sound's id, so re-runs give the same files. ffmpeg and ffprobe are expected at `/opt/homebrew/bin` (override with `FFMPEG` / `FFPROBE`).

## Add a sound

In `make_sfx.py`, add a function with the `@snd(id, name, category, tags)` decorator that returns a mono or stereo numpy array (it gets a seeded random generator `r`). Levels, trimming and fades are applied automatically; use `lvl=` for an extra gain offset in dB. If the category is new, add it to `CATEGORIES`. Run the script.
