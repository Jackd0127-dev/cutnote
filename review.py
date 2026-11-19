#!/usr/bin/env python3
"""Live review player for video edits: plays HyperFrames compositions (HTML) and video files in the
browser with a timeline, no render needed. Pause anywhere, press N, write a note; notes are saved
as review-notes.md (and .json) for the editor (or an AI assistant) to work through.

Usage:
  python3 review.py [folder] [--port 4790] [--host 127.0.0.1] [--no-open]
  python3 review.py --version
  python3 review.py --doctor        check that everything Cutnote uses is installed

Two layouts, picked from the folder you give:
  studio  a folder with (or below) a video folder that has a Project/ folder: compositions are found in
          Project/, renders in Exports/, notes in <Project>/<name> Edit/edit/review-notes.{md,json}.
  folder  anything else: the folder (a file argument means its folder) is the root. Compositions
          (.html with data-composition-id) and videos (.mp4 .mov .m4v .webm) are found up to 4 levels
          down; notes go to <root>/review-notes.{md,json}, drawings to <root>/review-drawings/.
Video files can be cut in the player (segments, optional reframe/crop) and exported next to the
source as "<name> (edited).mp4"; nothing is ever overwritten.

The page reloads a version by itself when its HTML changes, keeping the playhead, so the loop is:
note -> fix -> page refreshes -> check.
"""
import argparse, base64, glob, html, json, mimetypes, os, re, subprocess, sys, tempfile, threading, time, uuid, webbrowser
from datetime import datetime
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote, quote

HERE = os.path.dirname(os.path.abspath(__file__))
# the component library: one folder per component, served at /lib/ for the library drawer. A Cutnote install ships it as
# ./library (a development checkout may keep it two folders up).
LIB = next((d for d in (os.environ.get("CUTNOTE_LIBRARY"), os.path.join(HERE, "library"),
                        os.path.normpath(os.path.join(HERE, "..", "..", "library"))) if d and os.path.isdir(d)),
           os.path.join(HERE, "library"))
VERSION = "1.2.5"
# updates: the published version.json on the main branch says what the newest version is and what changed
REPO = "Jackd0127-dev/cutnote"
UPDATE_URL = os.environ.get("CUTNOTE_UPDATE_URL", f"https://raw.githubusercontent.com/{REPO}/main/version.json")
SETTINGS = os.path.join(os.path.expanduser(os.environ.get("CUTNOTE_CONFIG", "~/.config/cutnote")), "settings.json")
CHECK_EVERY = 6 * 3600
BOOT = f"{os.getpid()}-{time.time():.3f}"   # changes whenever the server (re)starts, so open pages know to reload
VIDEO_EXTS = (".mp4", ".mov", ".m4v", ".webm")
PRIVATE_NAMES = ("Keys", "private")
SKIP_DIRS = {"node_modules", ".git", "snap", "s1", "s2", "s3", "qa-trial1", "qa-trial2", "qa-trial3", "Drafts"}
LOCK = threading.Lock()
MEDIA_LOCKS = {}
EXPORTS = {}   # comp id -> job status dict


def find_video(start):
    """('studio', video folder) when a Project/ folder sits at or above start, else ('folder', root)."""
    p = os.path.abspath(start)
    root = p if os.path.isdir(p) else os.path.dirname(p)
    while p != "/":
        if os.path.isdir(os.path.join(p, "Project")):
            return "studio", p
        p = os.path.dirname(p)
    return "folder", root


def find_edit(video):
    proj = os.path.join(video, "Project")
    eds = [d for d in sorted(os.listdir(proj)) if d.endswith("Edit") and os.path.isdir(os.path.join(proj, d))]
    if not eds:
        sys.exit(f"No '<name> Edit' folder in {proj}")
    return os.path.join(proj, eds[0])


def find_hf_dist(root=None):
    """The newest hyperframes install found (CLI cache, env, project, cwd, global npm) ships the player + runtime."""
    name = "hyperframes-player.global.js"
    cands = glob.glob(os.path.expanduser("~/.npm/_npx/*/node_modules/hyperframes/dist/" + name))
    if os.name == "nt":   # npm's cache lives in %LocalAppData%\npm-cache on Windows
        for base in (os.environ.get("LOCALAPPDATA"), os.environ.get("APPDATA")):
            if base:
                cands += glob.glob(os.path.join(base, "npm-cache", "_npx", "*", "node_modules", "hyperframes", "dist", name))
    cands += glob.glob("/opt/homebrew/lib/node_modules/hyperframes/dist/" + name)
    dirs = [os.environ.get("HYPERFRAMES_DIST"), root and os.path.join(root, "node_modules", "hyperframes", "dist"),
            os.path.join(os.getcwd(), "node_modules", "hyperframes", "dist")]
    npm = "npm.cmd" if os.name == "nt" else "npm"
    try:
        g = subprocess.run([npm, "root", "-g"], capture_output=True, text=True, timeout=5).stdout.strip()
        if g:
            dirs.append(os.path.join(g, "hyperframes", "dist"))
    except (OSError, subprocess.SubprocessError):
        pass
    try:   # npx keeps packages in npm's cache folder, wherever npm is configured to put it
        c = subprocess.run([npm, "config", "get", "cache"], capture_output=True, text=True, timeout=5).stdout.strip()
        if c and os.path.isdir(c):
            cands += glob.glob(os.path.join(c, "_npx", "*", "node_modules", "hyperframes", "dist", name))
    except (OSError, subprocess.SubprocessError):
        pass
    cands += [os.path.join(d, name) for d in dirs if d]
    cands = [c for c in cands if os.path.isfile(c)]
    if not cands:
        return None
    return os.path.dirname(max(cands, key=os.path.getmtime))


def clean_format(f):
    """Delivery format from the page: {aspect, w, h, x, y}; None if it isn't valid."""
    if not isinstance(f, dict):
        return None
    num = lambda v: isinstance(v, (int, float)) and not isinstance(v, bool) and v == v and abs(v) != float("inf")
    asp, w, h, x, y = (f.get(k) for k in ("aspect", "w", "h", "x", "y"))
    if not isinstance(asp, str) or not all(isinstance(v, int) and not isinstance(v, bool) and 16 <= v <= 8192 for v in (w, h)):
        return None
    if not (num(x) and num(y)):
        return None
    return {"aspect": asp[:16], "w": w, "h": h, "x": min(1.0, max(0.0, float(x))), "y": min(1.0, max(0.0, float(y)))}


class State:
    def __init__(self, layout, video):
        self.layout = layout
        self.root = self.video = video
        if layout == "studio":
            self.edit = find_edit(video)
            base = os.path.join(self.edit, "edit")
            self.notes_json = os.path.join(base, "review-notes.json")
            self.notes_md = os.path.join(base, "review-notes.md")
        else:
            self.edit = base = video
            self.notes_json = os.path.join(base, "review-notes.json")
            self.notes_md = os.path.join(base, "review-notes.md")
        self.drawings = os.path.join(base, "review-drawings")
        self.cache = os.path.join(base, ".review-cache")
        self.hf = find_hf_dist(video)

    # ---------- versions ----------
    def comps(self):
        out = []
        studio = self.layout == "studio"
        proj = os.path.join(self.video, "Project") if studio else self.video
        skip = SKIP_DIRS | {"review-drawings", ".review-cache"}
        for root, dirs, files in os.walk(proj):
            dirs[:] = [d for d in dirs if d not in skip and not d.startswith(".") and d.casefold() not in {n.casefold() for n in PRIVATE_NAMES}
                       and not os.path.islink(os.path.join(root, d))]
            if root.count(os.sep) - proj.count(os.sep) > 3:
                dirs[:] = []
            for f in files:
                if not studio and f.lower().endswith(VIDEO_EXTS):
                    full = os.path.join(root, f)
                    rel = os.path.relpath(full, self.video)
                    try:
                        out.append({"id": rel, "label": "Video: " + rel, "kind": "video", "mtime": os.path.getmtime(full)})
                    except OSError:
                        pass
                    continue
                if not f.endswith(".html") or "template" in f:
                    continue
                full = os.path.join(root, f)
                try:
                    with open(full, "rb") as fh:
                        head = fh.read(200000)
                    if b"data-composition-id" not in head:
                        continue
                    if head.lstrip().startswith(b"<template"):
                        continue  # a scene file mounted by another composition, not playable on its own
                    if os.path.getsize(full) < 4000 and b"data-composition-src" not in head and b"<audio" not in head and b"<video" not in head:
                        continue  # the empty starter index.html
                except OSError:
                    continue
                rel = os.path.relpath(full, self.video)
                m = re.match(r"trial-(\d+)\.html$", f)
                label = f"V{m.group(1)}" if m else os.path.relpath(full, proj)
                if f == "index.html" and root.endswith(" - Versions"):
                    label = "Last rendered version (index.html)"
                out.append({"id": rel, "label": label, "kind": "code", "mtime": os.path.getmtime(full)})
        exp = os.path.join(self.video, "Exports")
        for full in sorted(glob.glob(os.path.join(exp, "**", "*"), recursive=True)) if studio else []:
            if not full.lower().endswith(VIDEO_EXTS) or not os.path.isfile(full):
                continue
            rel = os.path.relpath(full, self.video)
            out.append({"id": rel, "label": "Render: " + os.path.relpath(full, exp), "kind": "video", "mtime": os.path.getmtime(full)})
        out.sort(key=lambda c: (c["kind"] != "code", not c["label"].startswith("V"), c["label"]))
        return out

    def safe(self, rel):
        rel = (rel or "").lstrip("/")
        base = os.path.realpath(self.video)
        full = os.path.realpath(os.path.join(self.video, rel))
        ok = full == base or full.startswith(base + os.sep)
        if self.layout == "studio":
            # assets are symlinked into the Versions folder; allow what they point to inside the workspace
            ws = os.path.realpath(os.path.join(self.video, "..", "..", ".."))
            ok = ok or full.startswith(ws + os.sep)
        if not ok:
            return None
        parts = {x.casefold() for x in os.path.normpath(rel).split(os.sep) + os.path.relpath(full, base).split(os.sep)}
        if parts & {n.casefold() for n in PRIVATE_NAMES} or os.path.basename(full).casefold().startswith(".env") or os.path.basename(rel).casefold().startswith(".env"):
            return None
        return full

    # ---------- notes ----------
    def load(self):
        try:
            with open(self.notes_json) as f:
                return json.load(f)
        except (OSError, ValueError):
            return {"video": os.path.basename(self.video), "notes": []}

    def save(self, data):
        os.makedirs(os.path.dirname(self.notes_json), exist_ok=True)
        tmp = self.notes_json + ".tmp"
        with open(tmp, "w") as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, self.notes_json)
        with open(self.notes_md, "w") as f:
            f.write(render_md(data, self))

    def op(self, body):
        with LOCK:
            data = self.load()
            notes = data.setdefault("notes", [])
            kind = body.get("op")
            n = body.get("note") or {}
            if kind == "add":
                n["id"] = uuid.uuid4().hex[:8]
                n["created"] = datetime.now().isoformat(timespec="seconds")
                n.setdefault("status", "open")
                self.save_drawing(n)
                notes.append(n)
            elif kind == "update":
                for x in notes:
                    if x["id"] == n.get("id"):
                        old = x.get("drawing") if isinstance(x.get("drawing"), dict) else None
                        if "drawing" in n and old and old.get("image"):
                            self.drop_drawing({"drawing": old})   # the new PNG (if any) is written below
                        x.update({k: v for k, v in n.items() if k not in ("id", "created")})
                        x["updated"] = datetime.now().isoformat(timespec="seconds")
                        if "drawing" in n:
                            dr = x.get("drawing")
                            if not (isinstance(dr, dict) and dr.get("shapes")):
                                self.drop_drawing(x)
                            else:
                                self.save_drawing(x)
            elif kind == "delete":
                gone = [x for x in notes if x["id"] == n.get("id")]
                data["notes"] = [x for x in notes if x["id"] != n.get("id")]
                for x in gone:
                    self.drop_drawing(x)
            elif kind == "edits":
                comp = body.get("comp", "")
                eds = data.setdefault("edits", {})
                e = body.get("edits")
                fmt_ = clean_format(e.get("format")) if isinstance(e, dict) else None
                frame_ = clean_frame(e.get("frame")) if isinstance(e, dict) else None
                if comp and isinstance(e, dict) and (e.get("segments") or e.get("clips") or fmt_ or frame_):
                    eds[comp] = {"segments": e.get("segments"), "clips": e.get("clips") or {},
                                 "summary": [str(x) for x in (body.get("summary") or [])][:200],
                                 "label": body.get("label", comp), "updated": datetime.now().isoformat(timespec="seconds")}
                    if fmt_:
                        eds[comp]["format"] = fmt_
                    if frame_:
                        eds[comp]["frame"] = frame_
                    if body.get("kind") in ("code", "video"):
                        eds[comp]["kind"] = body["kind"]
                else:
                    eds.pop(comp, None)
                if not eds:
                    data.pop("edits", None)
            elif kind in ("approve", "unapprove"):
                comp = body.get("comp", "")
                appr = data.setdefault("approved", {})
                f = self.safe(comp)
                if kind == "approve" and f and os.path.isfile(f):
                    appr[comp] = {"sha1": sha1(f), "at": datetime.now().isoformat(timespec="seconds"),
                                  "label": body.get("label", comp)}
                else:
                    appr.pop(comp, None)
            self.save(data)
            return data

    def drop_drawing(self, n):
        img = (n.get("drawing") or {}).get("image") if isinstance(n.get("drawing"), dict) else None
        f = self.safe(img) if img else None
        if f and f.startswith(os.path.realpath(self.drawings) + os.sep) and os.path.isfile(f):
            os.remove(f)
        n.pop("drawing", None)

    # ---------- filmstrip + waveform for the timeline ----------
    def comp_base(self, comp):
        f = self.safe(comp)
        if not f or not os.path.isfile(f):
            return None
        d = os.path.dirname(comp)
        if os.path.basename(d) == "out" and not os.path.exists(os.path.join(os.path.dirname(f), "assets")):
            d = os.path.dirname(d)
        return d

    def media(self, comp, src):
        import hashlib
        base = self.comp_base(comp)
        k = hashlib.sha1(f"{base}|{src}".encode()).hexdigest()
        with LOCK:
            lk = MEDIA_LOCKS.setdefault(k, threading.Lock())
        with lk:   # one ffmpeg run per source at a time
            try:
                return self._media(comp, src)
            except Exception as e:  # never leave the page without an answer
                return {"error": f"media: {e.__class__.__name__}"}

    def _media(self, comp, src):
        import hashlib, array, math
        base = self.comp_base(comp)
        if base is None or not src or "://" in src:
            return {"error": "no source"}
        rel = os.path.normpath(os.path.join(base, src))
        f = self.safe(rel)
        if not f or not os.path.isfile(f):
            return {"error": "missing"}
        cache = self.cache
        os.makedirs(cache, exist_ok=True)
        key = hashlib.sha1(f"{f}|{os.path.getmtime(f)}|{os.path.getsize(f)}".encode()).hexdigest()[:16]
        meta = os.path.join(cache, key + ".json")
        if os.path.isfile(meta):
            try:
                return json.load(open(meta))
            except ValueError:
                pass
        try:
            dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                                       capture_output=True, text=True, timeout=30).stdout.strip() or 0)
        except (OSError, ValueError, subprocess.SubprocessError):
            dur = 0
        out = {"src": rel, "duration": dur}
        if dur > 0:
            fps = max(0.25, min(2.0, 240 / dur))
            n = int(math.ceil(dur * fps)) + 1
            jpg = os.path.join(cache, key + "-strip.jpg")
            tw, th = 54, 96
            r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f, "-vf",
                                f"fps={fps},scale={tw}:{th}:force_original_aspect_ratio=increase,crop={tw}:{th},tile={n}x1",
                                "-frames:v", "1", "-q:v", "6", jpg], capture_output=True, timeout=300)
            if r.returncode == 0 and os.path.isfile(jpg):
                out["strip"] = {"url": "/f/" + quote(os.path.relpath(jpg, self.video)), "fps": fps, "n": n, "w": tw, "h": th}
            rate = 100
            p = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vn", "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
                               capture_output=True, timeout=300)
            if p.returncode == 0 and p.stdout:
                a = array.array("h"); a.frombytes(p.stdout[: len(p.stdout) // 2 * 2])
                step = 8000 // rate
                peaks = []
                for i in range(0, len(a), step):
                    m = max((abs(v) for v in a[i:i + step]), default=0)
                    peaks.append(int(round(100 * math.sqrt(m / 32768))))
                out["wave"] = {"rate": rate, "peaks": peaks}
        if out.get("strip") or out.get("wave"):   # only cache a result worth keeping
            with open(meta, "w") as fh:
                json.dump(out, fh)
        return out

    # ---------- video export ----------
    def export_status(self, comp):
        j = EXPORTS.get(comp)
        if not j:
            return {"state": "idle", "progress": 0}
        return {k: j[k] for k in ("state", "progress", "out", "error") if k in j}

    def export_start(self, comp):
        """(http code, status dict). One ffmpeg job per comp at a time."""
        f = self.safe(comp) if comp else None
        if not f or not os.path.isfile(f) or not f.lower().endswith(VIDEO_EXTS):
            return 404, {"error": "not a video file"}
        if self.layout != "folder":
            return 403, {"error": "export is only for plain video folders; studio renders come from the render script"}
        if comp not in {c["id"] for c in self.comps() if c["kind"] == "video"}:
            return 404, {"error": "not a video in this folder"}
        with LOCK:
            j = EXPORTS.get(comp)
            if j and j["state"] == "running":
                return 200, self.export_status(comp)
            try:
                with open(self.notes_json) as fh:
                    e = (json.load(fh).get("edits") or {}).get(comp)
            except (OSError, ValueError):
                e = None
            if not isinstance(e, dict):
                return 400, {"error": "no edits stored for this video"}
            EXPORTS[comp] = job = {"state": "running", "progress": 0}
        threading.Thread(target=self._export, args=(job, f, e), daemon=True).start()
        return 200, self.export_status(comp)

    def _export(self, job, f, e):
        out = None
        try:
            def probe(*args):
                return subprocess.run(["ffprobe", "-v", "error", *args, f], capture_output=True, text=True, timeout=60).stdout
            info = json.loads(probe("-select_streams", "v:0", "-show_entries", "stream=width,height:stream_tags=rotate:stream_side_data=rotation:format=duration", "-of", "json"))
            st0 = info["streams"][0]
            sw, sh = st0["width"], st0["height"]
            rot = (st0.get("tags") or {}).get("rotate") or next((d.get("rotation") for d in st0.get("side_data_list") or [] if "rotation" in d), 0)
            try:
                if abs(int(float(rot))) % 180 == 90:   # ffmpeg autorotates before the filters: crop in display orientation
                    sw, sh = sh, sw
            except (TypeError, ValueError):
                pass
            dur = float(info["format"]["duration"])
            has_audio = bool(probe("-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0").strip())
            segs = []
            for s_ in (e.get("segments") or [{"in": 0, "out": dur}]):
                try:
                    a, b = max(0.0, float(s_["in"])), min(dur, float(s_["out"]))
                except (KeyError, TypeError, ValueError):
                    continue
                if b - a > 0.01:
                    segs.append((a, b))
            if not segs:
                raise ValueError("no valid segments")
            total = sum(b - a for a, b in segs)
            parts = []
            for i, (a, b) in enumerate(segs):
                parts.append(f"[0:v]trim=start={a:.6f}:end={b:.6f},setpts=PTS-STARTPTS[v{i}]")
                if has_audio:
                    parts.append(f"[0:a]atrim=start={a:.6f}:end={b:.6f},asetpts=PTS-STARTPTS[a{i}]")
            ins = "".join(f"[v{i}]" + (f"[a{i}]" if has_audio else "") for i in range(len(segs)))
            parts.append(f"{ins}concat=n={len(segs)}:v=1:a={1 if has_audio else 0}[vc]" + ("[ao]" if has_audio else ""))
            fm = clean_format(e.get("format"))
            if fm:
                r = fm["w"] / fm["h"]
                cw, ch = (sh * r, sh) if sw / sh > r else (sw, sw / r)
                cw, ch = min(sw, int(cw) // 2 * 2), min(sh, int(ch) // 2 * 2)
                cx = int(min(max(fm["x"] * sw - cw / 2, 0), sw - cw)) // 2 * 2
                cy = int(min(max(fm["y"] * sh - ch / 2, 0), sh - ch)) // 2 * 2
                parts.append(f"[vc]crop={cw}:{ch}:{cx}:{cy},scale={fm['w'] // 2 * 2}:{fm['h'] // 2 * 2},setsar=1[vo]")
            else:
                parts.append("[vc]scale=trunc(iw/2)*2:trunc(ih/2)*2[vo]")
            stem, n = os.path.splitext(f)[0], 1
            while out is None:   # reserve a fresh name; never overwrite
                cand = f"{stem} (edited{'' if n == 1 else ' ' + str(n)}).mp4"
                try:
                    os.close(os.open(cand, os.O_CREAT | os.O_EXCL | os.O_WRONLY))
                    out = cand
                except FileExistsError:
                    n += 1
            cmd = ["ffmpeg", "-v", "error", "-nostdin", "-y", "-i", f, "-filter_complex", ";".join(parts), "-map", "[vo]"]
            cmd += ["-map", "[ao]"] if has_audio else ["-an"]
            cmd += ["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p"]
            cmd += ["-c:a", "aac", "-b:a", "192k"] if has_audio else []
            cmd += ["-movflags", "+faststart", "-progress", "pipe:1", out]
            with tempfile.TemporaryFile() as err:
                p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err, text=True)
                for line in p.stdout:
                    if line.startswith("out_time_us="):
                        try:
                            job["progress"] = max(0.0, min(0.99, int(line.split("=")[1]) / 1e6 / total))
                        except ValueError:
                            pass
                p.wait()
                if p.returncode != 0:
                    err.seek(0)
                    tail = err.read().decode(errors="replace").strip().splitlines()
                    raise RuntimeError(tail[-1][:200] if tail else f"ffmpeg exit {p.returncode}")
            job.update(state="done", progress=1, out=os.path.relpath(out, self.video))
        except Exception as ex:
            if out and os.path.isfile(out):
                try:
                    os.remove(out)
                except OSError:
                    pass
            job.update(state="error", error=(str(ex) or ex.__class__.__name__)[:200])

    def save_drawing(self, n):
        """The page sends the drawing as a PNG data URL; keep it as a file next to the notes, not inside the JSON."""
        dr = n.get("drawing")
        if not isinstance(dr, dict):
            n.pop("drawing", None)
            return
        png = dr.pop("png", None)
        prefix = "data:image/png;base64,"
        if isinstance(png, str) and png.startswith(prefix):
            try:
                raw = base64.b64decode(png[len(prefix):], validate=True)
            except ValueError:
                raw = b""
            if raw.startswith(b"\x89PNG"):
                os.makedirs(self.drawings, exist_ok=True)
                f = os.path.join(self.drawings, f"{n['id']}.png")
                with open(f, "wb") as fh:
                    fh.write(raw)
                dr["image"] = os.path.relpath(f, self.video)


def clean_frame(fr):
    """On-frame edits from the player: {element key: {dx, dy, s, text, was}} (canvas pixels, scale factor, new text)."""
    if not isinstance(fr, dict):
        return None
    out = {}
    for k, o in list(fr.items())[:500]:
        if not isinstance(k, str) or len(k) > 200 or not isinstance(o, dict):
            continue
        x = {}
        for n in ("dx", "dy", "s"):
            v = o.get(n)
            if isinstance(v, (int, float)) and not isinstance(v, bool) and abs(v) < 1e5:
                x[n] = round(float(v), 4)
        if o.get("hide") is True:
            x["hide"] = True
        if isinstance(o.get("color"), str) and re.fullmatch(r"#[0-9a-fA-F]{6}", o["color"]):
            x["color"] = o["color"]
        for n in ("text", "was", "name"):
            if isinstance(o.get(n), str):
                x[n] = o[n][:2000]
        if x.get("dx") or x.get("dy") or x.get("s", 1) != 1 or "text" in x or x.get("hide") or x.get("color"):
            out[k] = x
    return out or None


def sha1(f):
    import hashlib
    h = hashlib.sha1()
    with open(f, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def gate(edit_dir, trial):
    """Used by render-trials.sh: exit 0 only if the reviewer approved exactly this build of trial-<n>.html."""
    edit_dir = os.path.abspath(edit_dir)
    html_rel = os.path.join("Project", os.path.basename(edit_dir) + " - Versions", "out", f"trial-{trial}.html")
    video = os.path.dirname(os.path.dirname(edit_dir))
    f = os.path.join(video, html_rel)
    try:
        data = json.load(open(os.path.join(edit_dir, "edit", "review-notes.json")))
    except (OSError, ValueError):
        data = {}
    if (data.get("edits") or {}).get(html_rel):
        print(f"V{trial}: has timeline edits from the player that aren't in the build yet. Apply them (see review-notes.md), rebuild, then get it approved.")
        return 1
    a = (data.get("approved") or {}).get(html_rel)
    open_n = sum(1 for n in data.get("notes", []) if n.get("comp") == html_rel and n.get("status") != "done")
    if a and os.path.isfile(f) and a.get("sha1") == sha1(f):
        print(f"V{trial}: approved in live review {a.get('at', '')}" + (f" ({open_n} notes still open)" if open_n else ""))
        return 0
    why = "changed since it was approved" if a else "not approved yet"
    print(f"V{trial}: {why} in live review ({open_n} open notes). Review it first:\n"
          f"  python3 \"{os.path.abspath(__file__)}\" \"{video}\"\n"
          f"  then press Approve in the player (REVIEWED=1 skips this only when the reviewer says so).")
    return 1


def fmt(t):
    if t is None:
        return ""
    m, s = divmod(float(t), 60)
    return f"{int(m)}:{s:05.2f}"


def render_md(data, st):
    lines = [f"# Review notes: {data.get('video', '')}", "",
             "Written by the review player (review.py).",
             "Work through the open notes, then set each one's status to `done` in review-notes.json",
             "(add a short `reply`); the player picks the change up live. Times are composition time of that version.",
             "Notes marked ✎ have a drawing the reviewer made on that frame (scribbles and boxes, in their chosen colours): open its PNG",
             "to see it. Positions are pixels on the composition canvas (see each drawing's size). A drawing on live code is marks only (transparent), so",
             "lay it over a snapshot of that frame to see exactly what was marked; on a rendered file the frame is already under it.", ""]
    notes = data.get("notes", [])
    by = {}
    for n in notes:
        by.setdefault(n.get("label") or n.get("comp", "?"), []).append(n)
    for label in sorted(by):
        group = sorted(by[label], key=lambda n: (n.get("status") == "done", n.get("t", 0)))
        lines += [f"## {label}  ({sum(1 for n in group if n.get('status') != 'done')} open)", ""]
        for n in group:
            box = "x" if n.get("status") == "done" else " "
            when = fmt(n.get("t")) + (f"–{fmt(n['end'])}" if n.get("end") is not None else "")
            lines.append(f"- [{box}] **{when}** `{n.get('kind', 'fix')}` {n.get('text', '').strip()}  (id {n['id']})")
            ctx = n.get("context") or {}
            if ctx.get("captions"):
                lines.append(f"  - on screen: \"{ctx['captions']}\"")
            if ctx.get("clips"):
                lines.append(f"  - clips: {', '.join(ctx['clips'][:12])}")
            cp = n.get("component")
            if isinstance(cp, dict) and re.fullmatch(r"[a-z0-9][a-z0-9-]{0,60}", str(cp.get("id") or "")):
                where = f" at x {cp['x']}, y {cp['y']} (canvas px: the centre of where it should sit)" if cp.get("x") is not None else ""
                if cp.get("dx") or cp.get("dy"):
                    where += f", shown in the player moved by ({cp.get('dx', 0)}, {cp.get('dy', 0)}) px from the component's own position"
                try:
                    if cp.get("scale") and abs(float(cp["scale"]) - 1) > 0.01:
                        where += f", at {round(float(cp['scale']) * 100)}% of its default size"
                except (TypeError, ValueError):
                    pass
                if cp.get("layer") is not None and not cp.get("captions"):
                    where += f", on layer {int(cp['layer']) + 1} from the top of the Library lane (the top layer plays in front)"
                if cp.get("captions"):
                    where = " for the WHOLE video: restyle every caption in this style (keep the real word timings)"
                lines.append(f"  - library component: `{cp['id']}` ({cp.get('name', '')}){where}. Build it from "
                             f"`{os.path.join(LIB, 'components', cp['id'], 'component.js')}` (contract: `{os.path.join(LIB, 'SPEC.md')}`), "
                             f"retimed onto the speaker's words and restyled to this video; params chosen: `{json.dumps(cp.get('params') or {})}`")
            lines += drawing_md(n, st)
            if n.get("reply"):
                lines.append(f"  - reply: {n['reply']}")
        lines.append("")
    eds = data.get("edits") or {}
    for rel, e in sorted(eds.items()):
        lines += [f"## Timeline edits to bake: {e.get('label', rel)}", "",
                  "The reviewer cut/moved/trimmed this version in the player (times are this build's composition time).",
                  "Rebuild it to play like this: re-cut the footage from source (clean joins), retime captions, overlays and sound,",
                  "then rebuild and remove this version's entry from `edits` in review-notes.json. Render stays blocked until then.",
                  "Edits can also include a delivery format (reframe/crop: aspect, size, centre x/y). For video files the player can",
                  "export the cut itself (next to the source, as \"<name> (edited).mp4\"), so no rebuild is needed.", ""]
        lines += [f"- {x}" for x in e.get("summary") or []]
        lines.append("")
    appr = data.get("approved") or {}
    if appr:
        lines += ["## Approved for render", ""]
        lines += [f"- {a.get('label', rel)}: {a.get('at', '')}" for rel, a in sorted(appr.items())]
        lines.append("")
    return "\n".join(lines)


COLOUR_NAMES = {"#ff3b30": "red", "#ffcc00": "yellow", "#c6f432": "lime", "#34c7ff": "blue", "#ff4fd8": "pink",
                "#ffffff": "white", "#111111": "black"}


def drawing_md(n, st):
    try:
        return _drawing_md(n, st)
    except Exception:  # a hand-edited drawing must never stop the notes file being written
        return ["  - ✎ drawing (couldn't read its marks)"]


def _drawing_md(n, st):
    dr = n.get("drawing") or {}
    shapes = dr.get("shapes") or []
    if not shapes:
        return []
    W, H = (dr.get("canvas") or [1080, 1920])[:2]
    img = dr.get("image")
    where = "frame + marks" if dr.get("withFrame") else "marks only, transparent"
    out = [f"  - ✎ drawing: `{os.path.join(st.video, img)}` ({where})" if img else "  - ✎ drawing (no image saved)"]
    for s in shapes[:15]:
        col = COLOUR_NAMES.get(str(s.get("color", "")).lower(), s.get("color", "?"))
        try:
            if s.get("type") == "box":
                x0, y0 = s["x"] * W, s["y"] * H
                x1, y1 = x0 + s["w"] * W, y0 + s["h"] * H
                out.append(f"    - {col} box: x {x0:.0f}–{x1:.0f}, y {y0:.0f}–{y1:.0f}")
            else:
                xs = [p[0] * W for p in s["pts"]]
                ys = [p[1] * H for p in s["pts"]]
                out.append(f"    - {col} scribble across x {min(xs):.0f}–{max(xs):.0f}, y {min(ys):.0f}–{max(ys):.0f}")
        except (KeyError, TypeError, IndexError, ValueError):
            continue
    if len(shapes) > 15:
        out.append(f"    - …and {len(shapes) - 15} more marks (see the image)")
    return out


def inject(src_html, base_href):
    shim = (f'<base href="{base_href}">'
            '<script>window.__timelines = window.__timelines || {};</script>'
            '<script src="/_hf/hyperframe.runtime.iife.js"></script>')
    m = re.search(r"<head[^>]*>", src_html, re.I)
    if m:
        return src_html[:m.end()] + shim + src_html[m.end():]
    return shim + src_html


class H(BaseHTTPRequestHandler):
    st: State = None
    srv = None
    port = None
    local = True   # listening on loopback only (no --host)

    def log_message(self, *a):
        pass

    def send(self, code, body=b"", ctype="text/plain; charset=utf-8", extra=None):
        if isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def jsend(self, obj):
        self.send(200, json.dumps(obj), "application/json")

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        st = self.st
        u = urlparse(self.path)
        path = unquote(u.path)
        q = parse_qs(u.query)
        if path in ("/", "/index.html"):
            with open(os.path.join(HERE, "review.html"), "rb") as f:
                return self.send(200, f.read(), "text/html; charset=utf-8")
        if path == "/version.json":   # this install's own release notes (the What's new screen reads them)
            with open(os.path.join(HERE, "version.json"), "rb") as f:
                return self.send(200, f.read(), "application/json")
        if path in ("/timeline.js", "/library.js", "/update.js"):
            with open(os.path.join(HERE, path[1:]), "rb") as f:
                return self.send(200, f.read(), "text/javascript; charset=utf-8")
        if path == "/api/version":
            return self.jsend({"version": VERSION, "boot": BOOT})
        if path == "/api/update":
            if q.get("check"):
                UPD.check(force=True)
            return self.jsend(UPD.status())
        if path == "/api/library":
            comps = []
            cdir = os.path.join(LIB, "components")
            for name in sorted(os.listdir(cdir)) if os.path.isdir(cdir) else []:
                f = os.path.join(cdir, name, "component.js")
                if os.path.isfile(f):
                    comps.append({"id": name, "script": f"/lib/components/{quote(name)}/component.js", "mtime": int(os.path.getmtime(f))})
            return self.jsend({"base": "/lib/", "components": comps, "available": os.path.isdir(LIB)})
        if path.startswith("/lib/"):
            f = os.path.normpath(os.path.join(LIB, path[len("/lib/"):]))
            if not f.startswith(LIB + os.sep) or not os.path.isfile(f):
                return self.send(404, "not found")
            return self.file(f)
        if path == "/api/media":
            return self.jsend(st.media(q.get("comp", [""])[0], q.get("src", [""])[0]))
        if path == "/api/info":
            return self.jsend({"version": VERSION, "video": os.path.basename(st.video), "edit": st.edit, "notes": st.notes_md,
                               "comps": st.comps(), "hf": bool(st.hf), "layout": st.layout, "root": st.root})
        if path == "/api/export":
            return self.jsend(st.export_status(q.get("comp", [""])[0]))
        if path == "/api/stat":
            out = {}
            for rel in q.get("id", []):
                f = st.safe(rel)
                out[rel] = os.path.getmtime(f) if f and os.path.exists(f) else None
            try:
                out["__notes"] = os.path.getmtime(st.notes_json)
            except OSError:
                out["__notes"] = None
            return self.jsend(out)
        if path == "/api/notes":
            with LOCK:
                data = st.load()
            # is each approval still for the current build?
            for rel, a in (data.get("approved") or {}).items():
                f = st.safe(rel)
                a["current"] = bool(f and os.path.isfile(f) and sha1(f) == a.get("sha1"))
            return self.jsend(data)
        if path.startswith("/_hf/"):
            if not st.hf:
                return self.send(404, "HyperFrames CLI not found: run `npx hyperframes --version` once")
            f = os.path.join(st.hf, os.path.basename(path))
            return self.file(f)
        if path.startswith("/comp/"):
            rel = path[len("/comp/"):]
            f = st.safe(rel)
            if not f or not os.path.isfile(f):
                return self.send(404, "not found")
            d = os.path.dirname(rel)
            # trial-N.html lives in "<Edit> - Versions/out/" but its asset paths are relative to the Versions folder
            if os.path.basename(d) == "out" and not os.path.exists(os.path.join(os.path.dirname(f), "assets")):
                d = os.path.dirname(d)
            with open(f, encoding="utf-8", errors="replace") as fh:
                body = inject(fh.read(), "/f/" + (quote(d) + "/" if d else ""))
            return self.send(200, body, "text/html; charset=utf-8")
        if path.startswith("/f/"):
            f = st.safe(path[3:])
            if not f or not os.path.isfile(f):
                return self.send(404, "not found")
            return self.file(f)
        self.send(404, "not found")

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in ("/api/notes", "/api/export", "/api/update"):
            return self.send(404)
        # only the player's own page may write: JSON content type (forces a CORS preflight we never answer) and same origin
        if "application/json" not in (self.headers.get("Content-Type") or ""):
            return self.send(415, "json only")
        org = self.headers.get("Origin")
        if org and urlparse(org).netloc != (self.headers.get("Host") or ""):
            return self.send(403, "forbidden")
        # a page on another site that points its own hostname at 127.0.0.1 (DNS rebinding) sends its own Host: refuse it
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0].strip("[]").lower()
        if H.local and host not in ("127.0.0.1", "localhost", "::1"):
            return self.send(403, "forbidden")
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return self.send(400, "bad json")
        if not isinstance(body, dict):
            return self.send(400, "bad json")
        if path == "/api/export":
            code, obj = self.st.export_start(body.get("comp", ""))
            return self.send(code, json.dumps(obj), "application/json")
        if path == "/api/update":
            act = body.get("action")
            if act == "auto":
                d = load_settings(); d["autoUpdate"] = bool(body.get("on")); save_settings(d)
            elif act == "check":
                UPD.check(force=True)
            elif act == "apply":
                ok, why = UPD.apply()
                if not ok:
                    return self.send(409, json.dumps({"error": why}), "application/json")
            return self.jsend(UPD.status())
        self.jsend(self.st.op(body))

    def file(self, f):
        """Static file with byte ranges (needed for video seeking)."""
        try:
            size = os.path.getsize(f)
        except OSError:
            return self.send(404, "not found")
        ctype = mimetypes.guess_type(f)[0] or "application/octet-stream"
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        code = 200
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                    if m.group(2):
                        end = min(int(m.group(2)), size - 1)
                elif m.group(2):
                    start = max(0, size - int(m.group(2)))
                if start >= size:
                    return self.send(416, "", extra={"Content-Range": f"bytes */{size}"})
                code = 206
        length = end - start + 1
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        if code == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        if self.command == "HEAD":
            return
        try:
            with open(f, "rb") as fh:
                fh.seek(start)
                left = length
                while left > 0:
                    chunk = fh.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
        except (BrokenPipeError, ConnectionResetError):
            pass


# ---------- updates ----------
def vtuple(v):
    return tuple(int(x) for x in re.findall(r"\d+", str(v))[:3]) or (0,)


def load_settings():
    try:
        with open(SETTINGS) as fh:
            d = json.load(fh)
        return d if isinstance(d, dict) else {}
    except (OSError, ValueError):
        return {}


def save_settings(d):
    os.makedirs(os.path.dirname(SETTINGS), exist_ok=True)
    tmp = SETTINGS + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(d, fh, indent=2)
    os.replace(tmp, SETTINGS)


def git(*args, timeout=60):
    return subprocess.run(["git", "-C", HERE, *args], capture_output=True, text=True, timeout=timeout)


class Updater:
    """Checks version.json on GitHub every few hours. 'Update now' (or auto-update) pulls the install's git checkout
    (fast-forward only) and restarts the server on the same port; the page then reloads itself."""

    def __init__(self):
        self.latest, self.notes, self.date, self.error, self.checked = None, [], None, None, 0
        self.state = "idle"   # idle | checking | updating | restarting
        self.lock = threading.Lock()

    def install(self):
        """Can this copy update itself? Only a clean git clone of the Cutnote repo whose root is this folder."""
        try:
            top = git("rev-parse", "--show-toplevel", timeout=10)
            if top.returncode != 0:
                return False, "This copy isn't a git install. Run the installer again to update."
            if os.path.realpath(top.stdout.strip()) != os.path.realpath(HERE):
                return False, "This is a development copy inside another repo; update it from there."
            url = git("remote", "get-url", "origin", timeout=10).stdout.strip()
            if REPO.lower() not in url.lower():
                return False, "This copy doesn't come from the Cutnote repo."
            if git("status", "--porcelain", "--untracked-files=no", timeout=20).stdout.strip():
                return False, "This copy has local changes, so it won't be overwritten. Commit or discard them, then update."
            return True, ""
        except (OSError, subprocess.SubprocessError):
            return False, "git isn't available, so Cutnote can't update itself here."

    def check(self, force=False):
        if not force and time.time() - self.checked < CHECK_EVERY:
            return
        import urllib.request
        self.state = "checking"
        try:
            req = urllib.request.Request(UPDATE_URL, headers={"User-Agent": f"Cutnote/{VERSION}", "Cache-Control": "no-cache"})
            with urllib.request.urlopen(req, timeout=8) as r:
                d = json.loads(r.read(200_000).decode("utf-8"))
            self.latest = str(d.get("version") or "") or None
            self.notes = [str(x)[:300] for x in (d.get("notes") or [])][:20]
            self.date = str(d.get("date") or "")[:20] or None
            self.error = None
        except Exception as ex:   # offline, GitHub down, bad JSON: try again later, never break the player
            self.error = (str(ex) or ex.__class__.__name__)[:160]
        self.checked = time.time()
        self.state = "idle"

    def available(self):
        return bool(self.latest) and vtuple(self.latest) > vtuple(VERSION)

    def status(self):
        can, why = self.install()
        return {"current": VERSION, "latest": self.latest, "available": self.available(), "notes": self.notes,
                "date": self.date, "auto": bool(load_settings().get("autoUpdate")), "can": can, "reason": why,
                "checked": self.checked, "error": self.error, "state": self.state, "repo": f"https://github.com/{REPO}"}

    def apply(self):
        with self.lock:
            if self.state in ("updating", "restarting"):
                return False, "Already updating"
            can, why = self.install()
            if not can:
                return False, why
            self.state = "updating"
            try:
                r = git("pull", "--ff-only", "--quiet", timeout=120)
                if r.returncode != 0:
                    self.state = "idle"
                    return False, (r.stderr.strip() or "git pull failed")[:200]
            except (OSError, subprocess.SubprocessError) as ex:
                self.state = "idle"
                return False, str(ex)[:200]
            self.state = "restarting"
            threading.Timer(0.6, restart).start()
            return True, ""

    def loop(self):
        time.sleep(3)
        while True:
            self.check()
            if self.available() and load_settings().get("autoUpdate") and self.install()[0]:
                ok, why = self.apply()
                print(f"  auto-update to {self.latest}: {'restarting' if ok else why}")
            time.sleep(600)


def restart():
    """Run the (updated) review.py again in this process, same folder and port, without opening another tab."""
    args = [a for a in sys.argv]
    if "--no-open" not in args:
        args.append("--no-open")
    if H.port and "--port" not in args:
        args += ["--port", str(H.port)]
    sys.stdout.flush()
    try:
        if H.srv:
            H.srv.server_close()
    except OSError:
        pass
    os.execv(sys.executable, [sys.executable] + args)


UPD = Updater()


def doctor():
    """`cutnote --doctor`: is everything Cutnote uses installed? Exit 1 if something required is missing."""
    def ver(cmd, pat=r"(\d+\.\d+(?:\.\d+)?)"):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
            m = re.search(pat, (r.stdout or "") + (r.stderr or ""))
            return m.group(1) if r.returncode == 0 and m else None
        except (OSError, subprocess.SubprocessError):
            return None
    node = ver(["node", "--version"])
    rows = [
        ("Python", ".".join(map(str, sys.version_info[:3])), True, sys.version_info >= (3, 8), "3.8 or newer"),
        ("git", ver(["git", "--version"]), False, None, "updates"),
        ("ffmpeg", ver(["ffmpeg", "-version"]), False, None, "filmstrip, waveform, Export cut"),
        ("ffprobe", ver(["ffprobe", "-version"]), False, None, "reading video files"),
        ("Node.js", node, False, bool(node) and vtuple(node) >= (18,), "18+ for HyperFrames compositions"),
        ("HyperFrames player", "found" if find_hf_dist() else None, False, None, "run: npx hyperframes --version"),
        ("Component library", f"{len(glob.glob(os.path.join(LIB, 'components', '*', 'component.js')))} components" if os.path.isdir(LIB) else None, False, None, "the Library and Captions tabs"),
    ]
    bad = False
    print(f"Cutnote {VERSION} ({HERE})")
    for name, v, required, ok, what in rows:
        good = bool(v) and (ok is None or ok)
        mark = "ok " if good else ("!! " if required else "-- ")
        print(f"  {mark} {name:<19} {v or 'missing':<14} {what}")
        bad |= required and not good
    if not bad:
        print("Ready." if all(bool(r[1]) for r in rows) else "Ready (lines marked -- are optional extras).")
    return 1 if bad else 0


def main():
    if len(sys.argv) == 4 and sys.argv[1] == "--gate":
        sys.exit(gate(sys.argv[2], sys.argv[3]))
    if len(sys.argv) == 2 and sys.argv[1] == "--doctor":
        sys.exit(doctor())
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", nargs="?", default=".")
    ap.add_argument("--port", type=int, default=4790)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--version", action="version", version=f"review {VERSION}")
    ap.add_argument("--no-open", action="store_true")
    a = ap.parse_args()
    st = State(*find_video(a.folder))
    H.st = st
    srv = None
    for port in range(a.port, a.port + 20):
        try:
            srv = ThreadingHTTPServer((a.host, port), H)
            break
        except OSError:
            continue
    if not srv:
        sys.exit("No free port")
    url = f"http://{'localhost' if a.host == '127.0.0.1' else a.host}:{srv.server_address[1]}/"
    if a.host not in ("127.0.0.1", "localhost", "::1"):
        print(f"  warning: listening on {a.host}: anyone who can reach this address can read the folder's videos and notes")
    print(f"Review: {os.path.basename(st.video)} ({st.layout} layout)\n  {url}\n  notes -> {st.notes_md}")
    if not st.hf:
        print("  warning: HyperFrames player not found; run `npx hyperframes --version` once")
    H.srv, H.port = srv, srv.server_address[1]
    H.local = a.host in ("127.0.0.1", "localhost", "::1")
    if os.environ.get("CUTNOTE_NO_UPDATE_CHECK") != "1":
        threading.Thread(target=UPD.loop, daemon=True).start()
    if not a.no_open:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
