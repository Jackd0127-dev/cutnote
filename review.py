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
VERSION = "1.7.0"
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
                sfx_ = clean_sfx(e.get("sfx")) if isinstance(e, dict) else []
                lanes_ = clean_lanes(e.get("lanes")) if isinstance(e, dict) else {}
                if comp and isinstance(e, dict) and (e.get("segments") or e.get("clips") or fmt_ or frame_ or sfx_ or lanes_):
                    eds[comp] = {"segments": e.get("segments"), "clips": e.get("clips") or {},
                                 "summary": [str(x) for x in (body.get("summary") or [])][:200],
                                 "label": body.get("label", comp), "updated": datetime.now().isoformat(timespec="seconds")}
                    if fmt_:
                        eds[comp]["format"] = fmt_
                    if frame_:
                        eds[comp]["frame"] = frame_
                    if sfx_:
                        eds[comp]["sfx"] = sfx_
                    if lanes_:
                        eds[comp]["lanes"] = lanes_
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
            info = json.loads(probe("-select_streams", "v:0", "-show_entries", "stream=width,height,avg_frame_rate:stream_tags=rotate:stream_side_data=rotation:format=duration", "-of", "json"))
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
                    segs.append((a, b, seg_speed(s_), s_ if isinstance(s_, dict) else {}))
            if not segs:
                raise ValueError("no valid segments")
            total = sum((b - a) / sp for a, b, sp, _ in segs)
            lanes = e.get("lanes") or {}
            sfx = [x for x in (e.get("sfx") or []) if not (lanes.get(f"sfx:{x.get('row', 0)}") or {}).get("mute")]
            sfx = [x for x in sfx if not x.get("mute") and (x.get("kind") == "ext" or os.path.isfile(os.path.join(LIB, x["file"])))]
            sfx = [x for x in sfx if not (x.get("kind") == "ext" and ((lanes.get(f"ext:{x.get('row', 0)}") or {}).get("mute") or not has_audio))]
            mute_main = bool((lanes.get("wave") or {}).get("mute") or (lanes.get("prog") or {}).get("mute"))
            parts = []
            for i, (a, b, sp, fx) in enumerate(segs):
                vf = f"[0:v]trim=start={a:.6f}:end={b:.6f},setpts=PTS-STARTPTS"
                if fx.get("rev"):
                    vf += ",reverse"
                if fx.get("flipH"):
                    vf += ",hflip"
                if fx.get("flipV"):
                    vf += ",vflip"
                c = fx.get("crop") if isinstance(fx.get("crop"), dict) else None
                if c:   # cropped edges go black; the frame keeps its size
                    g = lambda k: min(0.45, max(0.0, float(c.get(k, 0) or 0)))
                    l, r, t, bo = g("l"), g("r"), g("t"), g("b")
                    for box in ([f"0:0:iw*{l}:ih"] if l else []) + ([f"iw*(1-{r}):0:iw*{r}:ih"] if r else []) + ([f"0:0:iw:ih*{t}"] if t else []) + ([f"0:ih*(1-{bo}):iw:ih*{bo}"] if bo else []):
                        x_, y_, w_, h_ = box.split(":")
                        vf += f",drawbox=x={x_}:y={y_}:w={w_}:h={h_}:color=black:t=fill"
                if abs(sp - 1) > 1e-3:
                    vf += f",setpts=PTS/{sp:.6f}" + (",fps=30" if sp < 1 else "")
                parts.append(vf + f"[v{i}]")
                if has_audio:
                    af = f"[0:a]atrim=start={a:.6f}:end={b:.6f},asetpts=PTS-STARTPTS"
                    if fx.get("rev"):
                        af += ",areverse"
                    if abs(sp - 1) > 1e-3:
                        af += "," + atempo_chain(sp)
                    if fx.get("mute"):   # its audio was taken out onto the Audio track
                        af += ",volume=0"
                    parts.append(af + f"[a{i}]")
            ins = "".join(f"[v{i}]" + (f"[a{i}]" if has_audio else "") for i in range(len(segs)))
            parts.append(f"{ins}concat=n={len(segs)}:v=1:a={1 if has_audio else 0}[vc]" + ("[ac]" if has_audio else ""))
            # source time -> program time (for sound effects placed in source time)
            def to_prog(t):
                E, best = 0.0, None
                for a, b, sp, _ in segs:
                    if a - 1e-6 <= t < b - 1e-6:
                        return E + (t - a) / sp
                    if a >= t and (best is None or a < best[0]):
                        best = (a, E)
                    E += (b - a) / sp
                return best[1] if best else None
            mix = []
            if has_audio:
                parts.append("[ac]volume=0[am]" if mute_main else "[ac]anull[am]")
                mix.append("[am]")
            inputs, nin = {}, 1
            for k, x in enumerate(sfx):
                at = to_prog(float(x["start"]))
                if at is None or at >= total:
                    continue
                d = min(float(x["dur"]), total - at)
                if x.get("kind") == "ext":
                    src = "0:a"
                else:
                    if x["file"] not in inputs:
                        inputs[x["file"]] = nin; nin += 1
                    src = f"{inputs[x['file']]}:a"
                xsp = min(16.0, max(0.1, float(x.get("sp") or 1))) if x.get("kind") == "ext" else 1.0
                ch = f"[{src}]atrim=start={float(x.get('off', 0)):.4f}:duration={d * xsp:.4f},asetpts=PTS-STARTPTS"
                if x.get("kind") == "ext" and x.get("rev"):
                    ch += ",areverse"
                if abs(xsp - 1) > 1e-3:
                    ch += "," + atempo_chain(xsp)
                ch += f",volume={float(x.get('vol', 1)):.3f}"
                if x.get("denoise"):
                    ch += ",afftdn=nf=-25"
                if x.get("voice"):
                    ch += ",highpass=f=80,equalizer=f=3000:t=q:w=1.2:g=4"
                if x.get("norm"):
                    ch += ",loudnorm=I=-14:TP=-1.5:LRA=11"
                if x.get("fadeIn"):
                    ch += f",afade=t=in:d={min(float(x['fadeIn']), d / 2):.3f}"
                if x.get("fadeOut"):
                    fo = min(float(x["fadeOut"]), d / 2)
                    ch += f",afade=t=out:st={max(0.0, d - fo):.3f}:d={fo:.3f}"
                parts.append(ch + f",aresample=48000,aformat=channel_layouts=stereo,adelay={int(at * 1000)}:all=1[s{k}]")
                mix.append(f"[s{k}]")
            has_out_audio = bool(mix)
            if not has_audio and mix:
                parts.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={total:.4f}[sil]")
                mix.insert(0, "[sil]")
            if has_out_audio:
                parts.append(f"{''.join(mix)}amix=inputs={len(mix)}:duration=first:normalize=0[ao]" if len(mix) > 1 else f"{mix[0]}anull[ao]")
            mv = (clean_frame(e.get("frame")) or {}).get("@main") or {}
            if mv.get("dx") or mv.get("dy") or (mv.get("s") or 1) != 1:   # the footage moved or resized on its frame
                sc = min(8.0, max(0.1, float(mv.get("s") or 1)))
                try:
                    n_, d_ = (st0.get("avg_frame_rate") or "30/1").split("/")
                    fps_ = max(1.0, min(240.0, float(n_) / float(d_ or 1)))
                except (ValueError, ZeroDivisionError):
                    fps_ = 30.0
                parts.append(f"color=c=black:s={sw}x{sh}:r={fps_:.3f}:d={total:.4f}[bgm]")
                parts.append(f"[vc]scale=trunc(iw*{sc}/2)*2:trunc(ih*{sc}/2)*2[vsc]")
                parts.append(f"[bgm][vsc]overlay=x=(W-w)/2+{float(mv.get('dx') or 0):.1f}:y=(H-h)/2+{float(mv.get('dy') or 0):.1f}:shortest=1,setsar=1[vmv]")
                vin = "[vmv]"
            else:
                vin = "[vc]"
            fm = clean_format(e.get("format"))
            if fm:
                r = fm["w"] / fm["h"]
                cw, ch = (sh * r, sh) if sw / sh > r else (sw, sw / r)
                cw, ch = min(sw, int(cw) // 2 * 2), min(sh, int(ch) // 2 * 2)
                cx = int(min(max(fm["x"] * sw - cw / 2, 0), sw - cw)) // 2 * 2
                cy = int(min(max(fm["y"] * sh - ch / 2, 0), sh - ch)) // 2 * 2
                parts.append(f"{vin}crop={cw}:{ch}:{cx}:{cy},scale={fm['w'] // 2 * 2}:{fm['h'] // 2 * 2},setsar=1[vo]")
            else:
                parts.append(f"{vin}scale=trunc(iw/2)*2:trunc(ih/2)*2[vo]")
            if (lanes.get("prog") or {}).get("hide"):   # footage switched off: keep the timing, show black
                parts[-1] = parts[-1].replace("[vo]", ",drawbox=x=0:y=0:w=iw:h=ih:color=black:t=fill[vo]")
            stem, n = os.path.splitext(f)[0], 1
            while out is None:   # reserve a fresh name; never overwrite
                cand = f"{stem} (edited{'' if n == 1 else ' ' + str(n)}).mp4"
                try:
                    os.close(os.open(cand, os.O_CREAT | os.O_EXCL | os.O_WRONLY))
                    out = cand
                except FileExistsError:
                    n += 1
            cmd = ["ffmpeg", "-v", "error", "-nostdin", "-y", "-i", f]
            for f_ in sorted(inputs, key=inputs.get):
                cmd += ["-i", os.path.join(LIB, f_)]
            cmd += ["-filter_complex", ";".join(parts), "-map", "[vo]"]
            cmd += ["-map", "[ao]"] if has_out_audio else ["-an"]
            cmd += ["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p"]
            cmd += ["-c:a", "aac", "-b:a", "192k"] if has_out_audio else []
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


def clean_sfx(items):
    """Sound effects placed on the timeline: [{u, id, name, file, start, dur, off, vol, row}] (times in source seconds)."""
    out = []
    for it in items if isinstance(items, list) else []:
        if not isinstance(it, dict):
            continue
        try:
            ext = it.get("kind") == "ext"   # audio taken out of the footage: plays the footage's own sound from `off`
            f = "" if ext else str(it.get("file") or "")
            if not ext and not re.fullmatch(r"sfx/sounds/[a-z0-9-]+\.(mp3|m4a|wav|ogg)", f):
                continue
            x = {"u": str(it.get("u") or uuid.uuid4().hex[:8])[:16], "id": str(it.get("id") or "")[:60],
                        "name": str(it.get("name") or "")[:80], "file": f,
                        "start": round(max(0.0, float(it.get("start", 0))), 4), "dur": round(max(0.02, float(it.get("dur", 0.5))), 4),
                        "len": round(max(0.02, float(it.get("len", it.get("dur", 0.5)))), 4),
                        "off": round(max(0.0, float(it.get("off", 0) or 0)), 4), "vol": round(min(2.0, max(0.0, float(it.get("vol", 1)))), 3),
                        "row": int(min(7, max(0, int(it.get("row", 0) or 0))))}
            if ext:
                x["kind"] = "ext"
            for k in ("fadeIn", "fadeOut"):
                if it.get(k):
                    x[k] = round(min(10.0, max(0.0, float(it[k]))), 3)
            if ext and it.get("sp") and abs(float(it["sp"]) - 1) > 1e-3:
                x["sp"] = round(min(16.0, max(0.1, float(it["sp"]))), 4)
            for k in ("mute", "denoise", "voice", "norm", "rev"):
                if it.get(k) is True:
                    x[k] = True
            out.append(x)
        except (TypeError, ValueError):
            continue
    return out[:500]


def clean_lanes(d):
    """Per-track switches from the timeline headers: {"prog": {"hide": true}, "wave": {"mute": true}, "video:0": {...}}."""
    out = {}
    for k, v in (d or {}).items() if isinstance(d, dict) else []:
        if isinstance(k, str) and re.fullmatch(r"(prog|wave|lib|(video|other|cap|audio|sfx|ext):\d{1,2})", k) and isinstance(v, dict):
            o = {x: True for x in ("mute", "hide") if v.get(x) is True}
            if o:
                out[k] = o
    return out


def seg_speed(s_):
    try:
        v = float(s_.get("sp", 1) or 1)
    except (TypeError, ValueError):
        v = 1.0
    return min(16.0, max(0.1, v))


def atempo_chain(sp):
    """atempo takes 0.5–2 per stage: chain stages for anything outside that."""
    parts, r = [], sp
    while r > 2.0:
        parts.append("atempo=2.0"); r /= 2.0
    while r < 0.5:
        parts.append("atempo=0.5"); r /= 0.5
    parts.append(f"atempo={r:.6f}")
    return ",".join(parts)


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
                    try:
                        mv = (float(cp.get("dx") or 0), float(cp.get("dy") or 0), float(cp.get("scale") or 1))
                    except (TypeError, ValueError):
                        mv = (0.0, 0.0, 1.0)
                    if abs(mv[0]) > 1 or abs(mv[1]) > 1:
                        where += f"; the caption block was moved by ({round(mv[0])}, {round(mv[1])}) px from the style's own position (1080x1920 canvas)"
                    if abs(mv[2] - 1) > 0.01:
                        where += f"; captions at {round(mv[2] * 100)}% of the style's size"
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
                  "export the cut itself (next to the source, as \"<name> (edited).mp4\"), so no rebuild is needed.",
                  f"They can also hold speed changes (slow motion / speed up), sound effects (files in {LIB}) and muted or hidden tracks.", ""]
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
    gen = 0   # bumps when the Hub switches project, so open pages reload
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
        if path in ("/timeline.js", "/library.js", "/update.js", "/sfx.js", "/clipfx.js"):
            with open(os.path.join(HERE, path[1:]), "rb") as f:
                return self.send(200, f.read(), "text/javascript; charset=utf-8")
        if path == "/api/version":
            return self.jsend({"version": VERSION, "boot": f"{BOOT}/{H.gen}", "project": pid_of(st.video)})
        if path == "/hub.js":
            with open(os.path.join(HERE, "hub.js"), "rb") as f:
                return self.send(200, f.read(), "text/javascript; charset=utf-8")
        if path.startswith("/api/hub") and not self.loopback():
            return self.send(403, "the Hub only works on this computer")
        if path == "/api/hub":
            return self.jsend(hub_list(st.video))
        if path == "/api/hub/thumb":
            x = hub_find(q.get("id", [""])[0])
            t = hub_thumb(x["path"]) if x and x.get("exists") else None
            return self.file(t) if t else self.send(404, "no picture")
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
            return self.jsend({"version": VERSION, "video": os.path.basename(st.video), "name": hub_name(st.video), "project": pid_of(st.video), "edit": st.edit, "notes": st.notes_md,
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
        u = urlparse(self.path)
        path = u.path
        if path not in ("/api/notes", "/api/export", "/api/update", "/api/hub", "/api/hub/upload"):
            return self.send(404)
        org = self.headers.get("Origin")
        if org and urlparse(org).netloc != (self.headers.get("Host") or ""):
            return self.send(403, "forbidden")
        # a page on another site that points its own hostname at 127.0.0.1 (DNS rebinding) sends its own Host: refuse it
        host = (self.headers.get("Host") or "").rsplit(":", 1)[0].strip("[]").lower()
        if H.local and host not in ("127.0.0.1", "localhost", "::1"):
            return self.send(403, "forbidden")
        if path.startswith("/api/hub") and not self.loopback():
            return self.send(403, "the Hub only works on this computer")
        if path == "/api/hub/upload":
            # raw file body; a custom header forces a CORS preflight we never answer, so other sites can't send one
            if self.headers.get("X-Cutnote") != "1":
                return self.send(403, "forbidden")
            return self.hub_upload(parse_qs(u.query))
        # only the player's own page may write: JSON content type (forces a CORS preflight we never answer) and same origin
        if "application/json" not in (self.headers.get("Content-Type") or ""):
            return self.send(415, "json only")
        n = int(self.headers.get("Content-Length") or 0)
        try:
            body = json.loads(self.rfile.read(n) or b"{}")
        except ValueError:
            return self.send(400, "bad json")
        if not isinstance(body, dict):
            return self.send(400, "bad json")
        if path == "/api/hub":
            code, obj = hub_action(body)
            return self.send(code, json.dumps(obj), "application/json")
        st = self.st   # one project for the whole request, even if the Hub switches meanwhile
        pj = self.headers.get("X-Cutnote-Project")
        if pj and path in ("/api/notes", "/api/export") and pj != pid_of(st.video):
            return self.send(409, json.dumps({"error": "This tab was showing another project: reloading"}), "application/json", extra={"X-Cutnote-Stale": "1"})
        if path == "/api/export":
            code, obj = st.export_start(body.get("comp", ""))
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
        self.jsend(st.op(body))

    def loopback(self):
        return (self.client_address[0] if self.client_address else "") in ("127.0.0.1", "::1", "::ffff:127.0.0.1")

    def hub_upload(self, q):
        """Footage dropped on New project: copied into <project>/Footage, never overwriting anything."""
        x = hub_find((q.get("id") or [""])[0])
        name = os.path.basename((q.get("name") or [""])[0]).strip()
        try:
            n = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return self.send(400, "bad length")
        if not x or not x.get("exists"):
            return self.send(404, "no such project")
        if not name or name.startswith(".") or not name.lower().endswith(MEDIA_EXTS) or n <= 0:
            return self.send(400, "not a video, sound or picture")
        dest_dir = os.path.join(x["path"], "Footage")
        os.makedirs(dest_dir, exist_ok=True)
        stem, ext = os.path.splitext(name)
        out, k = os.path.join(dest_dir, name), 2
        while True:
            try:
                fd = os.open(out, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                break
            except FileExistsError:
                out = os.path.join(dest_dir, f"{stem} {k}{ext}"); k += 1
        try:
            with os.fdopen(fd, "wb") as fh:
                left = n
                while left > 0:
                    chunk = self.rfile.read(min(1 << 20, left))
                    if not chunk:
                        raise IOError("upload cut short")
                    fh.write(chunk); left -= len(chunk)
        except Exception:
            try:
                os.remove(out)
            except OSError:
                pass
            return self.send(500, "upload failed")
        return self.jsend({"ok": True, "file": os.path.basename(out)})

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
# ---------- Cutnote Hub: the projects this computer knows about ----------
# Kept in ~/.config/cutnote/projects.json: {"projects": [{path, name, added, opened}], "roots": [folders to watch], "hidden": [paths],
# "newIn": where New project makes folders, "stacks": [{id, name, paths, added}] (groups the person makes by hand: a project
# sits in at most one stack, and stacks only change what the Hub shows, never the folders)}. Every folder Cutnote opens is added; `review.py --add <folder>` adds one from a
# script (an AI making a new video calls it); folders under a watched root that hold a Project/ folder show up by themselves.
# Renaming only changes the name shown in the Hub: folders on disk are never renamed or moved.
PROJECTS = os.path.join(os.path.dirname(SETTINGS), "projects.json")
THUMBS = os.path.join(os.path.dirname(SETTINGS), "thumbs")
HUB_LOCK = threading.Lock()
CONTENT_HOME = os.environ.get("CUTNOTE_CONTENT_URL", "https://content.novasagency.com")   # Content OS: where finished videos are planned and posted
MEDIA_EXTS = VIDEO_EXTS + (".mkv", ".avi", ".mp3", ".wav", ".m4a", ".aac", ".png", ".jpg", ".jpeg", ".heic", ".webp", ".gif")


def pid_of(path):
    import hashlib
    return hashlib.sha1(os.path.realpath(path).encode()).hexdigest()[:12]


def hub_load():
    try:
        with open(PROJECTS) as fh:
            d = json.load(fh)
    except (OSError, ValueError):
        d = {}
    d = d if isinstance(d, dict) else {}
    d.setdefault("projects", []); d.setdefault("roots", []); d.setdefault("hidden", [])
    d["stacks"] = [k for k in d.get("stacks") or [] if isinstance(k, dict) and k.get("id") and k.get("name")]
    for k in d["stacks"]:
        k["paths"] = [x for x in k.get("paths") or [] if isinstance(x, str)]
    return d


def stack_of(d, path):
    rp = os.path.realpath(path)
    return next((k for k in d["stacks"] if any(os.path.realpath(x) == rp for x in k["paths"])), None)


def stack_put(d, path, sid):
    """Move a project into stack sid (None takes it out of any stack)."""
    rp = os.path.realpath(path)
    for k in d["stacks"]:
        k["paths"] = [x for x in k["paths"] if os.path.realpath(x) != rp]
        if k["id"] == sid:
            k["paths"].append(path)


class hub_file_lock:
    """HUB_LOCK for this process plus a lock file, so `review.py --add` and a running server don't overwrite each other."""
    def __enter__(self):
        HUB_LOCK.acquire()
        self.fh = None
        try:
            os.makedirs(os.path.dirname(PROJECTS), exist_ok=True)
            self.fh = open(PROJECTS + ".lock", "a+")
            try:
                import fcntl
                fcntl.flock(self.fh, fcntl.LOCK_EX)
            except ImportError:   # Windows: the in-process lock is what we have
                pass
        except OSError:
            pass
        return self

    def __exit__(self, *a):
        try:
            if self.fh:
                self.fh.close()
        finally:
            HUB_LOCK.release()
        HUB_CACHE.clear()


HUB_CACHE = {}


def hub_save(d):
    os.makedirs(os.path.dirname(PROJECTS), exist_ok=True)
    tmp = f"{PROJECTS}.{os.getpid()}.{threading.get_ident()}.tmp"
    with open(tmp, "w") as fh:
        json.dump(d, fh, indent=2)
    os.replace(tmp, PROJECTS)


def private_path(p):
    p = os.path.normpath(p)
    if sys.platform == "darwin" and (p + os.sep).startswith("/private/"):   # macOS's own /private/tmp, /private/var
        p = p[len("/private"):]
    return any(x.casefold() in {n.casefold() for n in PRIVATE_NAMES} for x in os.path.normpath(p).split(os.sep))


def clean_url(u):
    u = str(u or "").strip()
    return u if re.fullmatch(r"https?://[^\s<>\"']{3,500}", u) else None


def hub_add(path, name=None, opened=False, content=None):
    """Remember a project folder (the video folder, not a file inside it). Returns its entry."""
    path = os.path.abspath(path)
    if os.path.isfile(path):
        path = os.path.dirname(path)
    layout, video = find_video(path)
    path = video
    with hub_file_lock():
        d = hub_load()
        rp = os.path.realpath(path)
        e = next((x for x in d["projects"] if os.path.realpath(x.get("path", "")) == rp), None)
        now = datetime.now().isoformat(timespec="seconds")
        if not e:
            e = {"path": path, "name": name or os.path.basename(path), "added": now}
            d["projects"].append(e)
        elif name:
            e["name"] = name
        if opened:
            e["opened"] = now
        if content is not None:
            if content:
                e["content"] = content
            else:
                e.pop("content", None)
        d["hidden"] = [h for h in d["hidden"] if os.path.realpath(h) != rp]
        hub_save(d)
        return dict(e)


def hub_scan_roots(roots, limit=400):
    """Folders under the watched roots that look like video projects (they hold a Project/ folder)."""
    found = []
    for r in roots:
        if not os.path.isdir(r):
            continue
        base_depth = r.rstrip(os.sep).count(os.sep)
        for root, dirs, files in os.walk(r):
            if os.path.isdir(os.path.join(root, "Project")) and root != r:
                found.append(root); dirs[:] = []
                if len(found) >= limit:
                    return found
                continue
            if root.count(os.sep) - base_depth >= 4:
                dirs[:] = []
            dirs[:] = [x for x in dirs if not x.startswith(".") and x not in SKIP_DIRS and x not in ("Footage", "Exports", "B-roll", "node_modules")
                       and x.casefold() not in {n.casefold() for n in PRIVATE_NAMES} and not os.path.islink(os.path.join(root, x))]
    return found


def project_info(path):
    """What the Hub card shows: versions, open notes, last change. Cheap: no deep walks of footage."""
    info = {"exists": os.path.isdir(path)}
    if not info["exists"]:
        return info
    layout, video = find_video(path)
    info["layout"] = layout
    notes = None
    if layout == "studio":
        proj = os.path.join(video, "Project")
        try:
            eds = [x for x in sorted(os.listdir(proj)) if x.endswith("Edit")]
        except OSError:
            eds = []
        if eds:
            notes = os.path.join(proj, eds[0], "edit", "review-notes.json")
        exp = os.path.join(video, "Exports")
        try:
            info["versions"] = sum(1 for x in os.listdir(exp) if re.fullmatch(r"V\d+", x) and os.path.isdir(os.path.join(exp, x)))
        except OSError:
            info["versions"] = 0
    else:
        notes = os.path.join(video, "review-notes.json")
        n = 0
        for root, dirs, files in os.walk(video):
            dirs[:] = [x for x in dirs if not x.startswith(".") and x.casefold() not in {k.casefold() for k in PRIVATE_NAMES} and x not in ("review-drawings",)]
            if root.count(os.sep) - video.count(os.sep) >= 2:
                dirs[:] = []
            n += sum(1 for f in files if f.lower().endswith(VIDEO_EXTS))
        info["videos"] = n
    mt = os.path.getmtime(video)
    if notes and os.path.isfile(notes):
        try:
            with open(notes) as fh:
                nd = json.load(fh)
            info["open"] = sum(1 for x in nd.get("notes", []) if x.get("status") != "done")
            info["approved"] = len(nd.get("approved") or {})
            info["edits"] = len(nd.get("edits") or {})
        except (OSError, ValueError):
            pass
        mt = max(mt, os.path.getmtime(notes))
    info["changed"] = datetime.fromtimestamp(mt).isoformat(timespec="seconds")
    return info


def thumb_source(path):
    """A video to take the card picture from: footage first, then exports, then anything near the top."""
    layout, video = find_video(path)
    for sub in ("Footage", "Exports", ""):
        d = os.path.join(video, sub) if sub else video
        if not os.path.isdir(d):
            continue
        for root, dirs, files in os.walk(d):
            dirs[:] = sorted(x for x in dirs if not x.startswith(".") and x.casefold() not in {k.casefold() for k in PRIVATE_NAMES} and x not in ("Drafts", "node_modules"))
            if root.count(os.sep) - d.count(os.sep) >= 2:
                dirs[:] = []
            vids = sorted(f for f in files if f.lower().endswith(VIDEO_EXTS))
            if vids:
                return os.path.join(root, vids[0])
    return None


def hub_thumb(path):
    src = thumb_source(path)
    if not src:
        return None
    import hashlib
    key = hashlib.sha1(f"{src}|{os.path.getmtime(src)}".encode()).hexdigest()[:16]
    out = os.path.join(THUMBS, key + ".jpg")
    if not os.path.isfile(out):
        os.makedirs(THUMBS, exist_ok=True)
        tmp = out + ".tmp.jpg"
        for at in ("1", "0"):
            subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-y", "-ss", at, "-i", src, "-frames:v", "1",
                            "-vf", "scale=480:480:force_original_aspect_ratio=increase", "-q:v", "4", tmp], capture_output=True, timeout=30)
            if os.path.isfile(tmp) and os.path.getsize(tmp) > 0:
                os.replace(tmp, out)
                break
    return out if os.path.isfile(out) else None


def trash_refusal(path):
    """Why a folder must not go to the Trash from the Hub, or None. Only a single project folder may: never one that
    holds the open project, home, a watched folder, another project, or a Keys/private folder, and never a big tree."""
    rp = os.path.realpath(path)
    home = os.path.realpath(os.path.expanduser("~"))
    under = lambda a, b: a == b or a.startswith(b.rstrip(os.sep) + os.sep)   # a is inside b (or is b)
    d = hub_load()
    keep = [os.path.realpath(H.st.video), home] + [os.path.realpath(r) for r in d["roots"]]
    keep += [os.path.realpath(p.get("path", "")) for p in d["projects"] if os.path.realpath(p.get("path", "")) != rp]
    if os.path.ismount(rp) or rp.count(os.sep) < 3 or private_path(rp):
        return "Cutnote won't trash that folder"
    if any(under(k, rp) for k in keep if k):
        return "That folder holds other projects or folders the Hub uses: delete it in your file manager if you mean to"
    if rp in {os.path.realpath(os.path.join(home, x)) for x in ("Movies", "Videos", "Desktop", "Documents", "Downloads", "Pictures", "Music")}:
        return "Cutnote won't trash that folder"
    n = 0
    for root, dirs, files in os.walk(rp):
        if any(x.casefold() in {k.casefold() for k in PRIVATE_NAMES} for x in dirs):
            return "That folder holds a Keys or private folder: delete it in your file manager if you mean to"
        dirs[:] = [x for x in dirs if x not in ("node_modules", ".git")]
        n += len(files) + len(dirs)
        if n > 20000:
            return "That folder is too big to trash from here: use your file manager"
    return None


def move_to_trash(path):
    """Send a folder to the system Trash / Recycle Bin (never a permanent delete)."""
    if sys.platform == "darwin":
        if os.path.exists("/usr/bin/trash"):
            r = subprocess.run(["/usr/bin/trash", path], capture_output=True, text=True, timeout=120)
        else:
            r = subprocess.run(["osascript", "-e", f'tell application "Finder" to delete (POSIX file {json.dumps(path)} as alias)'], capture_output=True, text=True, timeout=120)
    elif os.name == "nt":
        ps = ("Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory("
              f"'{path.replace(chr(39), chr(39) * 2)}', 'OnlyErrorDialogs', 'SendToRecycleBin')")
        r = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True, timeout=120)
    else:
        r = subprocess.run(["gio", "trash", path], capture_output=True, text=True, timeout=120)
    if r.returncode != 0 or os.path.exists(path):
        raise RuntimeError((r.stderr or "couldn't move it to the Trash").strip()[:200])


def pick_folder(prompt="Choose a folder"):
    """The system's own folder picker (the browser can't give us a folder's path). None if cancelled or unavailable."""
    try:
        if sys.platform == "darwin":
            r = subprocess.run(["osascript", "-e", f'POSIX path of (choose folder with prompt {json.dumps(prompt)})'], capture_output=True, text=True, timeout=600)
        elif os.name == "nt":
            ps = ("Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; "
                  f"$d.Description = '{prompt}'; if ($d.ShowDialog() -eq 'OK') {{ $d.SelectedPath }}")
            r = subprocess.run(["powershell", "-NoProfile", "-STA", "-Command", ps], capture_output=True, text=True, timeout=600)
        else:
            r = subprocess.run(["zenity", "--file-selection", "--directory", "--title", prompt], capture_output=True, text=True, timeout=600)
    except (OSError, subprocess.TimeoutExpired):
        return None
    p = (r.stdout or "").strip()
    return p.rstrip("/") if r.returncode == 0 and p and os.path.isdir(p) else None


def default_new_in():
    home = os.path.expanduser("~")
    for d in ("Movies", "Videos"):
        if os.path.isdir(os.path.join(home, d)):
            return os.path.join(home, d, "Cutnote")
    return os.path.join(home, "Cutnote")


def clean_name(n):
    n = re.sub(r"\s+", " ", str(n or "")).strip()
    if not n or len(n) > 80 or n.startswith(".") or re.search(r'[/\\:*?"<>|\x00-\x1f]', n) or n.casefold() in {k.casefold() for k in PRIVATE_NAMES}:
        return None
    return n


def hub_list(current, fresh=True):
    """fresh=False reuses a list made in the last few seconds (thumbnails and actions look projects up by id)."""
    c = HUB_CACHE.get("list")
    if not fresh and c and c[0] == current and time.time() - c[1] < 8:
        return c[2]
    out = _hub_list(current)
    HUB_CACHE["list"] = (current, time.time(), out)
    return out


def _hub_list(current):
    d = hub_load()
    seen, out = set(), []
    hidden = {os.path.realpath(h) for h in d["hidden"]}
    entries = list(d["projects"])
    for p in hub_scan_roots(d["roots"]):
        rp = os.path.realpath(p)
        if rp not in hidden and not any(os.path.realpath(e.get("path", "")) == rp for e in entries):
            entries.append({"path": p, "name": os.path.basename(p), "found": True})
    for e in entries:
        rp = os.path.realpath(e.get("path", ""))
        if rp in seen or not e.get("path"):
            continue
        seen.add(rp)
        x = {"id": pid_of(e["path"]), "path": e["path"], "name": e.get("name") or os.path.basename(e["path"]),
             "folder": os.path.basename(e["path"]), "added": e.get("added"), "opened": e.get("opened"), "found": bool(e.get("found")),
             "current": rp == os.path.realpath(current), "content": e.get("content")}
        k = stack_of(d, e["path"])
        x["stack"] = k["id"] if k else None
        x.update(project_info(e["path"]))
        out.append(x)
    stacks = [{"id": k["id"], "name": k["name"], "added": k.get("added"),
               "ids": [x["id"] for x in out if x["stack"] == k["id"]]} for k in d["stacks"]]
    return {"projects": out, "stacks": stacks, "roots": d["roots"], "newIn": d.get("newIn") or default_new_in(), "platform": sys.platform,
            "contentHome": d.get("contentHome") or CONTENT_HOME}


def hub_name(path):
    rp = os.path.realpath(path)
    e = next((x for x in hub_load()["projects"] if os.path.realpath(x.get("path", "")) == rp), None)
    return (e or {}).get("name") or os.path.basename(path)


def hub_find(pid):
    for x in hub_list(H.st.video, fresh=False)["projects"]:
        if x["id"] == pid:
            return x
    return None


def hub_stack(act, body):
    """Stacks: groups of projects made by hand in the Hub. Deleting a stack keeps its projects (they go back to the grid)."""
    known = {x["id"]: x["path"] for x in hub_list(H.st.video, fresh=False)["projects"]} if act == "stackCreate" else {}
    with hub_file_lock():
        d = hub_load()
        if act == "stackCreate":
            name = clean_name(body.get("name"))
            if not name:
                return 400, {"error": "Use a name without / \\ : * ? \" < > |"}
            if any(k["name"].casefold() == name.casefold() for k in d["stacks"]):
                return 409, {"error": f"There's already a stack called {name}"}
            k = {"id": uuid.uuid4().hex[:10], "name": name, "paths": [], "added": datetime.now().isoformat(timespec="seconds")}
            d["stacks"].append(k)
            for pid in body.get("ids") or []:
                if pid in known:
                    stack_put(d, known[pid], k["id"])
            hub_save(d)
            return 200, {"id": k["id"]}
        k = next((k for k in d["stacks"] if k["id"] == str(body.get("stack") or "")), None)
        if not k:
            return 404, {"error": "That stack isn't there any more"}
        if act == "stackRename":
            name = clean_name(body.get("name"))
            if not name:
                return 400, {"error": "Use a name without / \\ : * ? \" < > |"}
            if any(o is not k and o["name"].casefold() == name.casefold() for o in d["stacks"]):
                return 409, {"error": f"There's already a stack called {name}"}
            k["name"] = name
        else:
            d["stacks"] = [o for o in d["stacks"] if o is not k]
        hub_save(d)
        return 200, {"ok": True}


def hub_action(body):
    act = body.get("action")
    if act == "pick":
        p = pick_folder("Choose a folder of projects" if body.get("prompt") == "roots" else "Choose where new projects go")
        return 200, {"path": p}
    if act in ("addRoot", "removeRoot"):
        path = os.path.abspath(os.path.expanduser(str(body.get("path") or "")))
        if act == "addRoot" and (not os.path.isdir(path) or private_path(path)):
            return 400, {"error": "That folder doesn't exist"}
        with hub_file_lock():
            d = hub_load()
            d["roots"] = [r for r in d["roots"] if os.path.realpath(r) != os.path.realpath(path)] + ([path] if act == "addRoot" else [])
            hub_save(d)
        return 200, {"ok": True}
    if act == "newIn":
        path = os.path.abspath(os.path.expanduser(str(body.get("path") or "")))
        if private_path(path):
            return 400, {"error": "Pick another folder"}
        with hub_file_lock():
            d = hub_load(); d["newIn"] = path; hub_save(d)
        return 200, {"ok": True}
    if act == "addPath":
        path = os.path.abspath(os.path.expanduser(str(body.get("path") or "")))
        if not os.path.isdir(path) or private_path(path):
            return 400, {"error": "That folder doesn't exist"}
        e = hub_add(path)
        return 200, {"id": pid_of(e["path"])}
    if act == "create":
        name = clean_name(body.get("name"))
        if not name:
            return 400, {"error": "Use a name without / \\ : * ? \" < > |"}
        where = os.path.abspath(os.path.expanduser(str(body.get("where") or "") or (hub_load().get("newIn") or default_new_in())))
        if private_path(where):
            return 400, {"error": "Pick another place for it"}
        if find_video(where)[0] == "studio":
            return 409, {"error": "That place is inside another project: pick a folder outside it"}
        path = os.path.join(where, name)
        if os.path.exists(path):
            return 409, {"error": f"There's already a folder called {name} there"}
        try:
            os.makedirs(os.path.join(path, "Footage"))
            os.makedirs(os.path.join(path, "Exports"))
        except OSError as ex:
            return 409, {"error": f"Couldn't make the folder: {ex.strerror or ex}"}
        with hub_file_lock():
            d = hub_load(); d["newIn"] = where; hub_save(d)
        e = hub_add(path, name=name)
        return 200, {"id": pid_of(e["path"]), "path": e["path"]}
    if act in ("stackCreate", "stackRename", "stackDelete"):
        return hub_stack(act, body)
    pid = str(body.get("id") or "")
    x = hub_find(pid)
    if not x:
        return 404, {"error": "That project isn't in the Hub any more"}
    if act == "open":
        if not x["exists"]:
            return 409, {"error": "Its folder is missing (is the drive connected?)"}
        try:
            st = State(*find_video(x["path"]))
        except SystemExit as ex:
            return 409, {"error": str(ex) or "Couldn't open it"}
        except Exception as ex:
            return 409, {"error": (str(ex) or ex.__class__.__name__)[:200]}
        H.st = st
        H.gen += 1
        hub_add(x["path"], opened=True)
        return 200, {"ok": True}
    if act == "content":   # link this project to its page in Content OS (empty removes the link)
        u = str(body.get("url") or "").strip()
        if u and not clean_url(u):
            return 400, {"error": "Paste a link that starts with https://"}
        hub_add(x["path"], content=clean_url(u) or "")
        return 200, {"ok": True}
    if act == "stack":   # move this project into a stack ("" or null takes it out)
        sid = str(body.get("stack") or "") or None
        with hub_file_lock():
            d = hub_load()
            if sid and not any(k["id"] == sid for k in d["stacks"]):
                return 404, {"error": "That stack isn't there any more"}
            stack_put(d, x["path"], sid)
            hub_save(d)
        return 200, {"ok": True}
    if act == "rename":
        name = clean_name(body.get("name"))
        if not name:
            return 400, {"error": "Use a name without / \\ : * ? \" < > |"}
        hub_add(x["path"], name=name)
        return 200, {"ok": True}
    if act in ("remove", "trash"):
        if act == "trash":
            if x["current"]:
                return 409, {"error": "That's the project open now: open another one first"}
            why = trash_refusal(x["path"])
            if why:
                return 409, {"error": why}
            try:
                move_to_trash(os.path.realpath(x["path"]))
            except Exception as ex:
                return 500, {"error": str(ex)}
        with hub_file_lock():
            d = hub_load()
            rp = os.path.realpath(x["path"])
            d["projects"] = [p for p in d["projects"] if os.path.realpath(p.get("path", "")) != rp]
            stack_put(d, x["path"], None)
            if act == "remove":   # so a watched folder doesn't bring it straight back
                d["hidden"] = sorted(set(d["hidden"]) | {x["path"]})
            hub_save(d)
        return 200, {"ok": True}
    if act == "reveal":
        if x["exists"]:
            cmd = ["open", "-R", x["path"]] if sys.platform == "darwin" else ["explorer", x["path"]] if os.name == "nt" else ["xdg-open", x["path"]]
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return 200, {"ok": True}
    return 400, {"error": "unknown action"}


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
    if len(sys.argv) >= 3 and sys.argv[1] == "--add":   # remember a project in the Cutnote Hub (for scripts and AI agents)
        if not os.path.isdir(sys.argv[2]) or sys.argv[2].startswith("--"):
            sys.exit(f"No such folder: {sys.argv[2]}")
        args = sys.argv[2:]
        link = None
        if "--content" in args:   # review.py --add <folder> [name] --content <Content OS link>
            k = args.index("--content"); link = clean_url(args[k + 1] if k + 1 < len(args) else ""); del args[k:k + 2]
        e = hub_add(args[0], name=args[1] if len(args) > 1 else None, content=link)
        print(f"Added to the Cutnote Hub: {e['name']} ({e['path']})")
        sys.exit(0)
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("folder", nargs="?", default=".")
    ap.add_argument("--port", type=int, default=4790)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--version", action="version", version=f"review {VERSION}")
    ap.add_argument("--no-open", action="store_true")
    a = ap.parse_args()
    st = State(*find_video(a.folder))
    H.st = st
    H.gen = 0
    try:
        hub_add(st.video, opened=True)
    except OSError:
        pass
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
