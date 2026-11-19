#!/usr/bin/env python3
"""Procedural sound-effect library for short-form video editing.

Every sound is generated from maths in this file (numpy only): no samples,
no downloads, no third-party audio. Run `python3 make_sfx.py` from anywhere.

Output: sounds/<id>.mp3 and sounds.json next to this script. Intermediate
48 kHz float WAVs go to a scratch dir (SFX_BUILD_DIR env var or the default
below). Noise is seeded from the sound id, so re-runs reproduce the files.

To add a sound: write a function decorated with @snd(...) below, put its
category in CATEGORIES if new, and re-run.
"""
import json
import os
import re
import struct
import subprocess
import sys
import zlib
from pathlib import Path

import numpy as np

SR = 48000
HERE = Path(__file__).resolve().parent
OUT_DIR = HERE / "sounds"
BUILD_DIR = Path(os.environ.get(
    "SFX_BUILD_DIR",
    "/private/tmp/claude-501/-Volumes-Extreme-Pro-Video-Editing/"
    "a6e3c26d-1ac4-4fe3-93cf-b0a2881ca42a/scratchpad/sfx-build"))
FFMPEG = os.environ.get("FFMPEG", "/opt/homebrew/bin/ffmpeg")
FFPROBE = os.environ.get("FFPROBE", "/opt/homebrew/bin/ffprobe")
TWO_PI = 2 * np.pi

CATEGORIES = ["Whoosh", "Swipe & slide", "Pop", "Click & tap", "UI & notification",
              "Impact & hit", "Riser & tension", "Transition & glitch",
              "Fun & cartoon", "Money & reward", "Camera & tech"]
REGISTRY = []


def snd(id, name, category, tags, lvl=0.0, peak=-1.4):
    """Register a sound. lvl = extra gain in dB on top of the standard level."""
    def deco(fn):
        REGISTRY.append(dict(id=id, name=name, category=category, tags=tags, lvl=lvl, peak=peak, fn=fn))
        return fn
    return deco


# ----------------------------------------------------------------- helpers
def N(d):
    return int(round(d * SR))


def tt(d):
    return np.arange(N(d)) / SR


def _arr(v, n):
    return np.full(n, float(v)) if np.isscalar(v) else np.asarray(v, float)


def lp(x, f):
    """One-pole lowpass (f may be an array for sweeps)."""
    n = len(x)
    a = (1 - np.exp(-TWO_PI * np.clip(_arr(f, n), 5, SR * 0.45) / SR)).tolist()
    y = [0.0] * n
    s = 0.0
    for i, xi in enumerate(x.tolist()):
        s += a[i] * (xi - s)
        y[i] = s
    return np.array(y)


def hp(x, f):
    return x - lp(x, f)


def biquad(x, kind, f, q=0.707):
    """RBJ biquad (bp / lp / hp), direct form I, per-sample coefficients."""
    n = len(x)
    f = np.clip(_arr(f, n), 20, SR * 0.45)
    q = _arr(q, n)
    w = TWO_PI * f / SR
    c, s = np.cos(w), np.sin(w)
    al = s / (2 * q)
    if kind == "bp":
        b0, b1, b2 = al, 0 * al, -al
    elif kind == "lp":
        b0, b1, b2 = (1 - c) / 2, 1 - c, (1 - c) / 2
    else:
        b0, b1, b2 = (1 + c) / 2, -(1 + c), (1 + c) / 2
    a0 = 1 + al
    B0, B1, B2 = (b0 / a0).tolist(), (b1 / a0).tolist(), (b2 / a0).tolist()
    A1, A2 = (-2 * c / a0).tolist(), ((1 - al) / a0).tolist()
    y = [0.0] * n
    x1 = x2 = y1 = y2 = 0.0
    for i, xi in enumerate(x.tolist()):
        yi = B0[i] * xi + B1[i] * x1 + B2[i] * x2 - A1[i] * y1 - A2[i] * y2
        x2, x1, y2, y1 = x1, xi, y1, yi
        y[i] = yi
    return np.array(y)


def osc(f, ph=0.0):
    return np.sin(TWO_PI * np.cumsum(f) / SR + ph)


def esweep(f0, f1, n, k=1.0):
    u = np.linspace(0, 1, n) ** k
    return f0 * (f1 / f0) ** u


def decay(n, tau, a=0.001):
    t = np.arange(n) / SR
    e = np.exp(-t / tau)
    na = max(1, N(a))
    e[:na] *= np.linspace(0, 1, na)
    return e


def bellenv(n, peak=0.5, width=0.25):
    u = np.linspace(0, 1, n)
    return np.exp(-((u - peak) / width) ** 2)


def sat(x, drive=2.0):
    return np.tanh(drive * x) / np.tanh(drive)


def bitcrush(x, bits=6, hold=4):
    y = np.repeat(x[::hold], hold)[:len(x)]
    q = 2 ** (bits - 1)
    return np.round(y * q) / q


def fade(x, a=0.002, b=0.012):
    x = x.copy()
    na, nb = min(N(a), len(x)), min(N(b), len(x))
    if na:
        x[:na] *= np.linspace(0, 1, na)
    if nb:
        x[-nb:] *= np.linspace(1, 0, nb)
    return x


def place(total, items):
    """Mix [(signal, start_seconds, gain)] into a mono buffer."""
    buf = np.zeros(N(total))
    for sig, t0, g in items:
        i = N(t0)
        e = min(len(buf), i + len(sig))
        if e > i:
            buf[i:e] += g * sig[:e - i]
    return buf


def pan(x, p):
    p = _arr(p, len(x))
    th = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(th), x * np.sin(th)], axis=1)


def comb(x, d, g):
    y = x.copy()
    for s in range(d, len(x), d):
        e = min(s + d, len(x))
        y[s:e] += g * y[s - d:e - d]
    return y


def allpass(x, d, g):
    n = len(x)
    y = np.zeros(n)
    y[:d] = -g * x[:d]
    for s in range(d, n, d):
        e = min(s + d, n)
        y[s:e] = -g * x[s:e] + x[s - d:e - d] + g * y[s - d:e - d]
    return y


def _reverb_mono(x, mix, rt, tail, damp, spread):
    xi = np.pad(x, (0, N(tail)))
    delays = [0.0297, 0.0371, 0.0411, 0.0437, 0.0503, 0.0571]
    wet = np.zeros(len(xi))
    for d in delays:
        ds = int(d * spread * SR)
        wet += comb(xi, ds, 0.001 ** (d * spread / rt))
    wet /= len(delays)
    wet = allpass(allpass(wet, int(0.0051 * SR), 0.5), int(0.0017 * SR), 0.5)
    wet = lp(wet, damp)
    return xi + mix * wet * 2.5


def reverb(x, mix=0.25, rt=0.6, tail=0.5, damp=4500):
    """Schroeder reverb: 6 feedback combs + 2 allpasses, damped. Extends length."""
    if x.ndim == 1:
        return _reverb_mono(x, mix, rt, tail, damp, 1.0)
    return np.stack([_reverb_mono(x[:, 0], mix, rt, tail, damp, 1.0),
                     _reverb_mono(x[:, 1], mix, rt, tail, damp, 1.09)], axis=1)


def bell(f, dur, r=None, tau=None, parts=((1, 1, 1), (2.76, 0.45, 0.6), (5.4, 0.22, 0.35), (8.93, 0.1, 0.2))):
    t = tt(dur)
    tau = tau or dur / 4
    y = np.zeros(len(t))
    for ratio, amp, dk in parts:
        y += amp * np.sin(TWO_PI * f * ratio * t) * np.exp(-t / (tau * dk))
    y[:N(0.001)] *= np.linspace(0, 1, N(0.001))
    return y


def burst(r, d, kind, f, q, tau):
    """Filtered noise burst with exponential decay (clicks, ticks)."""
    n = N(d)
    nz = r.standard_normal(n)
    nz = biquad(nz, kind, f, q) if kind in ("bp", "lp", "hp") else nz
    return nz * decay(n, tau, 0.0003)


def thump(d, f0, f1, tau, k=0.5):
    n = N(d)
    return osc(esweep(f0, f1, n, k)) * decay(n, tau, 0.001)


# ---------------------------------------------------------------- whoosh
def whoosh(r, d, f0, f1, q, peak, width, p0=-0.6, p1=0.6, k=1.0, air=0.5):
    n = N(d)
    nz = r.standard_normal(n)
    f = esweep(f0, f1, n, k)
    y = biquad(nz, "bp", f, q) + air * biquad(nz, "bp", f * 1.9, q * 1.5)
    return pan(y * bellenv(n, peak, width), np.linspace(p0, p1, n))


@snd("whoosh-soft", "Soft whoosh", "Whoosh", ["transition", "air"])
def _(r):
    return whoosh(r, 0.62, 350, 2400, 0.9, 0.5, 0.25)


@snd("whoosh-fast", "Fast whoosh", "Whoosh", ["transition", "quick", "air"])
def _(r):
    return whoosh(r, 0.4, 700, 7000, 1.6, 0.6, 0.18, -0.8, 0.8, 1.3)


@snd("whoosh-deep", "Deep whoosh", "Whoosh", ["transition", "bass", "cinematic"])
def _(r):
    n = N(1.0)
    w = whoosh(r, 1.0, 110, 900, 1.3, 0.5, 0.26, -0.4, 0.4)
    sub = osc(esweep(70, 38, n)) * bellenv(n, 0.35, 0.25) * 0.5
    return sat(w * 0.9 + sub[:, None] * 0.6, 1.6)


@snd("whoosh-airy", "Airy whoosh", "Whoosh", ["transition", "air", "soft"])
def _(r):
    return whoosh(r, 0.9, 2000, 7500, 0.6, 0.5, 0.3, -0.5, 0.5, 0.8, 0.8)


@snd("whoosh-reverse-swell", "Reverse swell whoosh", "Whoosh", ["transition", "reverse", "build"], lvl=-3, peak=-3.0)
def _(r):
    n = N(1.0)
    nz = r.standard_normal(n)
    f = esweep(300, 4500, n, 1.2)
    y = biquad(nz, "bp", f, 1.0) + 0.5 * biquad(nz, "bp", f * 1.8, 1.8)
    e = np.exp(4.0 * (np.linspace(0, 1, n) - 1))
    return pan(y * e, np.linspace(-0.4, 0.4, n))


@snd("whoosh-double-pass", "Double-pass whoosh", "Whoosh", ["transition", "stereo", "pass-by"])
def _(r):
    a = whoosh(r, 0.4, 500, 3500, 1.2, 0.5, 0.22, -0.9, 0.9)
    b = whoosh(r, 0.45, 2800, 350, 1.2, 0.5, 0.22, 0.9, -0.9)
    out = np.zeros((N(0.8), 2))
    out[:len(a)] += a
    out[N(0.3):N(0.3) + len(b)] += b * 0.9
    return out


# ---------------------------------------------------------- swipe & slide
@snd("swipe-up", "Swipe up", "Swipe & slide", ["swipe", "up", "ui"])
def _(r):
    n = N(0.28)
    f = esweep(500, 3600, n, 0.9)
    y = biquad(r.standard_normal(n), "bp", f, 2.0) * bellenv(n, 0.6, 0.28)
    g = osc(esweep(380, 900, n)) * bellenv(n, 0.6, 0.25) * 0.04
    return y + g


@snd("swipe-down", "Swipe down", "Swipe & slide", ["swipe", "down", "ui"])
def _(r):
    n = N(0.28)
    f = esweep(3600, 500, n, 1.1)
    y = biquad(r.standard_normal(n), "bp", f, 2.0) * bellenv(n, 0.4, 0.28)
    g = osc(esweep(900, 380, n)) * bellenv(n, 0.4, 0.25) * 0.04
    return y + g


@snd("card-slide", "Card slide", "Swipe & slide", ["slide", "card", "ui"])
def _(r):
    n = N(0.35)
    nz = r.standard_normal(n)
    y = lp(biquad(nz, "bp", esweep(900, 2600, n), 0.8), 3500) * bellenv(n, 0.45, 0.25)
    grit = lp(nz, 1200) * (0.5 + 0.5 * np.sin(TWO_PI * 38 * np.arange(n) / SR)) * bellenv(n, 0.45, 0.3) * 0.5
    end = np.zeros(n)
    tap = thump(0.06, 260, 130, 0.014) * 0.9 + burst(r, 0.06, "bp", 1800, 1.5, 0.004) * 0.4
    end[N(0.28):N(0.28) + len(tap)] = tap[:n - N(0.28)]
    return y * 0.8 + grit * 0.4 + end * 0.6


@snd("paper-flick", "Paper flick", "Swipe & slide", ["paper", "flick", "foley"])
def _(r):
    n = N(0.22)
    nz = r.standard_normal(n)
    crackle = (r.random(n) > 0.9).astype(float) * r.standard_normal(n)
    y = biquad(nz, "bp", esweep(2500, 5500, n), 0.9) * decay(n, 0.045, 0.002)
    y += hp(crackle, 2500) * decay(n, 0.07, 0.001) * 1.2
    return y


# ------------------------------------------------------------------- pop
@snd("bubble-pop", "Bubble pop", "Pop", ["pop", "bubble", "water"])
def _(r):
    n = N(0.15)
    f = esweep(420, 1700, n, 0.25)
    y = osc(f) * decay(n, 0.035, 0.001)
    y += burst(r, 0.15, "bp", 3000, 2, 0.004) * 0.3
    return y


@snd("cork-pop", "Cork pop", "Pop", ["pop", "bottle", "cork"])
def _(r):
    n = N(0.28)
    imp = np.zeros(n)
    imp[0] = 1
    ring = biquad(imp + 0.3 * r.standard_normal(n) * decay(n, 0.004, 0.0003), "bp", 640, 9) * 6
    body = osc(esweep(330, 190, n, 0.4)) * decay(n, 0.05, 0.001)
    air = burst(r, 0.28, "bp", 1500, 1.2, 0.012) * 0.8
    return sat(ring * 0.6 + body + air * 0.4, 1.5)


@snd("soft-pop", "Soft pop", "Pop", ["pop", "soft", "ui"])
def _(r):
    n = N(0.16)
    y = osc(esweep(650, 280, n, 0.3)) * decay(n, 0.04, 0.001)
    y += lp(r.standard_normal(n), 1800) * decay(n, 0.006, 0.0005) * 0.5
    return y


@snd("pop-up", "Pop-up", "Pop", ["pop", "rising", "ui"])
def _(r):
    n = N(0.25)
    f = esweep(280, 1000, n, 0.35)
    y = (osc(f) + 0.35 * osc(2 * f)) * decay(n, 0.07, 0.002)
    y += burst(r, 0.25, "bp", 2200, 2, 0.005) * 0.2
    return reverb(y, 0.12, 0.25, 0.1)


@snd("balloon-tick", "Balloon tick", "Pop", ["pop", "tick", "sharp"])
def _(r):
    n = N(0.12)
    y = burst(r, 0.12, "hp", 2500, 1, 0.006) * 0.6
    y += burst(r, 0.12, "bp", 2600, 3, 0.02) * 1.5
    return y


# --------------------------------------------------------------- click & tap
@snd("mouse-click", "Mouse click", "Click & tap", ["click", "mouse", "ui"], lvl=-4)
def _(r):
    def one(g):
        n = N(0.04)
        return g * (burst(r, 0.04, "bp", 3200, 3.5, 0.004) + 0.5 * osc(np.full(n, 1900)) * decay(n, 0.004, 0.0003)
                    + 0.3 * thump(0.04, 400, 250, 0.008))
    return place(0.14, [(one(1.0), 0.0, 1), (one(0.55), 0.075, 1)])


@snd("soft-tap", "Soft tap", "Click & tap", ["tap", "soft", "ui"], lvl=-5)
def _(r):
    y = thump(0.12, 230, 140, 0.03, 0.4)
    y += lp(r.standard_normal(N(0.12)), 2000) * decay(N(0.12), 0.004, 0.0005) * 0.4
    return y


def key_thock(r, f=1.0, d=0.12):
    n = N(d)
    body = np.sin(TWO_PI * np.cumsum(np.linspace(190 * f, 140 * f, n)) / SR) * decay(n, 0.022, 0.0005)
    top = burst(r, d, "bp", 1900 * f, 1.4, 0.006)
    click = burst(r, d, "hp", 3500, 1, 0.0015)
    return body * 0.9 + top * 0.9 + click * 0.35


@snd("keyboard-key", "Keyboard key", "Click & tap", ["key", "keyboard", "typing"], lvl=-4)
def _(r):
    return key_thock(r)


@snd("switch-toggle", "Switch toggle", "Click & tap", ["switch", "toggle", "ui"], lvl=-4)
def _(r):
    a = burst(r, 0.05, "bp", 2400, 3, 0.005) + 0.6 * thump(0.05, 500, 300, 0.008)
    b = burst(r, 0.07, "bp", 1500, 2.5, 0.008) + 0.8 * thump(0.07, 320, 180, 0.012)
    return place(0.16, [(a, 0, 1.0), (b, 0.05, 0.9)])


@snd("button-press", "Button press", "Click & tap", ["button", "press", "ui"], lvl=-4)
def _(r):
    n = N(0.12)
    y = osc(esweep(950, 600, n, 0.5)) * decay(n, 0.015, 0.0008)
    y += lp(r.standard_normal(n), 3000) * decay(n, 0.005, 0.0005) * 0.5
    y += thump(0.12, 180, 120, 0.02) * 0.5
    return y


# ------------------------------------------------------ UI & notification
@snd("notification-ding", "Notification ding", "UI & notification", ["notification", "bell", "alert"])
def _(r):
    return reverb(bell(1568, 0.7, tau=0.22), 0.15, 0.4, 0.2)


@snd("message-bubble", "Message bubble", "UI & notification", ["message", "chat", "bloop"])
def _(r):
    def blip(f0, f1, d):
        n = N(d)
        return (osc(esweep(f0, f1, n, 0.6)) + 0.2 * osc(2 * esweep(f0, f1, n, 0.6))) * decay(n, d / 3, 0.003)
    return reverb(place(0.34, [(blip(620, 940, 0.11), 0, 1), (blip(800, 1250, 0.14), 0.09, 0.9)]), 0.1, 0.3, 0.1)


@snd("success-chime", "Success chime", "UI & notification", ["success", "chime", "positive"])
def _(r):
    notes = [1046.5, 1318.5, 1568.0, 2093.0]
    items = [(bell(f, 0.9 if i == 3 else 0.5, tau=0.3 if i == 3 else 0.15), 0.085 * i, 0.8 if i < 3 else 1.0)
             for i, f in enumerate(notes)]
    return reverb(place(1.2, items), 0.22, 0.7, 0.4)


@snd("error-buzz", "Error buzz", "UI & notification", ["error", "buzz", "negative"])
def _(r):
    def pulse(d):
        n = N(d)
        t = np.arange(n) / SR
        saw = 2 * ((150 * t) % 1) - 1
        saw2 = 2 * ((151.5 * t) % 1) - 1
        y = lp(sat(saw + saw2, 2.0), 900) * np.where(t < d - 0.01, 1, np.linspace(1, 0, n))
        return y * np.minimum(1, t / 0.004)
    return place(0.36, [(pulse(0.13), 0, 1), (pulse(0.15), 0.18, 1)])


@snd("menu-open", "Menu open", "UI & notification", ["menu", "open", "ui"])
def _(r):
    n = N(0.22)
    y = biquad(r.standard_normal(n), "bp", esweep(500, 2200, n), 1.5) * bellenv(n, 0.55, 0.3)
    b = osc(esweep(480, 720, n)) * decay(n, 0.06, 0.004) * 0.3
    t = burst(r, 0.22, "bp", 2000, 2, 0.003) * 0.4
    return y * 0.8 + b + t


@snd("sparkle", "Sparkle", "UI & notification", ["sparkle", "magic", "shimmer"])
def _(r):
    out = np.zeros(N(0.9))
    for i in range(22):
        t0 = r.random() ** 1.3 * 0.55
        f = 2400 * 2 ** (r.random() * 2.0) * (1 - 0.15 * t0)
        d = 0.12 + r.random() * 0.12
        s = np.sin(TWO_PI * f * tt(d)) * decay(N(d), d / 4, 0.001)
        s += 0.4 * np.sin(TWO_PI * f * 2.01 * tt(d)) * decay(N(d), d / 6, 0.001)
        i0 = N(t0)
        out[i0:i0 + len(s)] += s * (0.4 + 0.6 * r.random())
    return reverb(out, 0.3, 0.6, 0.3, 7000)


# ---------------------------------------------------------- impact & hit
@snd("deep-boom", "Deep boom", "Impact & hit", ["impact", "cinematic", "sub", "boom"])
def _(r):
    n = N(2.4)
    sub = osc(esweep(80, 32, n, 0.35)) * decay(n, 0.7, 0.002)
    mid = lp(r.standard_normal(n), 260) * decay(n, 0.25, 0.001)
    hit = burst(r, 2.4, "bp", 900, 0.8, 0.02) * 0.4
    y = sat(sub * 1.2 + mid * 4 + hit, 1.8)
    return reverb(y, 0.25, 1.4, 0.3, 2500)[:n]


@snd("thud", "Thud", "Impact & hit", ["impact", "thud", "low"])
def _(r):
    n = N(0.5)
    y = thump(0.5, 95, 48, 0.12, 0.4) + 3 * lp(r.standard_normal(n), 320) * decay(n, 0.03, 0.0005)
    return sat(y, 1.4)


@snd("punch-in", "Punch-in", "Impact & hit", ["impact", "zoom", "punch", "short"])
def _(r):
    n = N(0.35)
    y = thump(0.35, 130, 44, 0.09, 0.3) * 1.2
    y += burst(r, 0.35, "bp", 1400, 1.0, 0.004) * 0.7
    y += 2 * lp(r.standard_normal(n), 400) * decay(n, 0.025, 0.0004)
    return sat(y, 2.0)


@snd("bass-drop", "Bass drop", "Impact & hit", ["impact", "bass", "drop", "edm"])
def _(r):
    n = N(1.8)
    f = esweep(170, 36, n, 0.18)
    y = osc(f) * decay(n, 0.8, 0.002)
    y = sat(y * 1.5, 2.5) + 0.25 * osc(f * 2) * decay(n, 0.2, 0.002)
    y += burst(r, 1.8, "bp", 1000, 0.8, 0.01) * 0.3
    return y


@snd("tick-tock-stop", "Clock tick-tock stop", "Impact & hit", ["clock", "tick", "stop", "tension"])
def _(r):
    def tick(f, g):
        return g * (burst(r, 0.07, "bp", f, 4, 0.006) * 1.2 + 0.5 * thump(0.07, f * 0.25, f * 0.2, 0.012))
    items = [(tick(3600 if i % 2 == 0 else 2500, 1.0), 0.26 * i, 1) for i in range(4)]
    items.append((thump(0.8, 85, 40, 0.18, 0.4) + 0.8 * lp(r.standard_normal(N(0.8)), 300) * decay(N(0.8), 0.03), 1.18, 1.0))
    return reverb(place(2.0, items), 0.15, 0.6, 0.3, 3000)


# -------------------------------------------------------- riser & tension
@snd("riser-short", "Short riser", "Riser & tension", ["riser", "build", "short"])
def _(r):
    n = N(1.5)
    u = np.linspace(0, 1, n)
    nz = biquad(r.standard_normal(n), "bp", esweep(300, 7000, n, 1.3), 1.2)
    saw = osc(esweep(180, 1400, n, 1.2))
    tone = sat(saw, 3) * 0.3
    return pan((nz + tone) * (0.05 + u ** 2.2), np.linspace(-0.3, 0.3, n))


@snd("tension-riser", "Tension riser", "Riser & tension", ["riser", "tension", "cinematic"])
def _(r):
    n = N(3.0)
    u = np.linspace(0, 1, n)
    f = esweep(70, 520, n, 1.5)
    y = sum(osc(f * (1 + d)) for d in (-0.012, 0, 0.011, 0.5 * 0.02)) / 4
    y = sat(y * 1.5, 2) * (0.6 + 0.4 * np.sin(TWO_PI * np.cumsum(3 + 14 * u ** 2) / SR))
    nz = biquad(r.standard_normal(n), "bp", esweep(200, 4500, n, 1.4), 1.0) * 0.8
    return (y + nz) * (0.04 + u ** 2.0)


@snd("reverse-cymbal", "Reverse cymbal", "Riser & tension", ["riser", "reverse", "cymbal", "swell"], lvl=-3, peak=-3.0)
def _(r):
    n = N(1.6)
    nz = r.standard_normal(n)
    y = np.zeros(n)
    for f in (3100, 4400, 5900, 7300, 9100):
        y += biquad(nz, "bp", f, 6)
    y += hp(nz, 5000) * 0.7
    e = np.exp(-4.5 * (1 - np.linspace(0, 1, n)))
    return pan(y * e, np.linspace(-0.2, 0.2, n))


@snd("suspense-hum", "Suspense hum", "Riser & tension", ["tension", "drone", "hum", "dark"])
def _(r):
    n = N(2.5)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f, a, rate in ((55, 1.0, 0.31), (58.3, 0.9, 0.23), (82.4, 0.5, 0.17), (87.3, 0.4, 0.41)):
        saw = 2 * ((f * t) % 1) - 1
        y += a * (0.7 * np.sin(TWO_PI * f * t) + 0.3 * lp(saw, 260)) * (0.75 + 0.25 * np.sin(TWO_PI * rate * t))
    y += lp(r.standard_normal(n), 180) * 0.4
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 0.7
    return sat(y * 0.5, 1.5) * e


# --------------------------------------------------- transition & glitch
@snd("glitch-stutter", "Glitch stutter", "Transition & glitch", ["glitch", "stutter", "digital"])
def _(r):
    src = sat(osc(esweep(180, 520, N(0.3), 0.8)) * 1.2 + 0.4 * r.standard_normal(N(0.3)) * decay(N(0.3), 0.1), 2.5)
    out, pos = [], N(0.04)
    for L in (0.06, 0.06, 0.05, 0.035, 0.03, 0.02, 0.02, 0.012, 0.012, 0.008, 0.008):
        seg = fade(src[pos:pos + N(L)], 0.001, 0.001)
        out.append(seg)
        out.append(np.zeros(N(0.006)))
        pos += N(0.012)
    y = bitcrush(np.concatenate(out), 6, 3)
    return y


@snd("digital-zap", "Digital zap", "Transition & glitch", ["zap", "digital", "laser", "glitch"])
def _(r):
    n = N(0.28)
    t = np.arange(n) / SR
    f = esweep(3500, 160, n, 0.35)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    y = saw * (0.6 + 0.4 * np.sin(TWO_PI * 90 * t))
    y = bitcrush(y, 7, 2) + 0.15 * r.standard_normal(n)
    return sat(lp(y, 6000), 2) * decay(n, 0.12, 0.001)


@snd("static-burst", "Static burst", "Transition & glitch", ["static", "noise", "glitch", "tv"])
def _(r):
    n = N(0.4)
    gate = np.repeat(r.random(n // 96 + 1) > 0.35, 96)[:n].astype(float)
    nz = biquad(r.standard_normal(n), "bp", 3200, 0.5)
    crack = hp((r.random(n) > 0.995) * r.standard_normal(n) * 6, 1500)
    return (nz * gate + crack) * np.exp(-1.5 * np.linspace(0, 1, n)) * (1 + 0.5 * np.sin(TWO_PI * 17 * np.arange(n) / SR))


@snd("tape-stop", "Tape stop", "Transition & glitch", ["tape", "stop", "slowdown", "pitch"])
def _(r):
    n = N(0.9)
    u = np.linspace(0, 1, n)
    f = 330 * (1 - u) ** 1.7 + 12
    ph = np.cumsum(f) / SR
    y = sum(np.sin(TWO_PI * k * ph) / k for k in range(1, 9))
    y = lp(y, 3000 * (1 - u) ** 1.5 + 200)
    y += 0.1 * lp(r.standard_normal(n), 2500)
    return y * (1 - u) ** 0.7


@snd("warp", "Warp dive", "Transition & glitch", ["warp", "pitch", "dive", "sci-fi"])
def _(r):
    n = N(0.7)
    f = esweep(2000, 55, n, 0.45)
    y = (osc(f) + 0.7 * osc(f * 1.007) + 0.3 * osc(f * 2.01)) / 2
    y += 0.5 * biquad(r.standard_normal(n), "bp", f * 1.5, 2)
    y = sat(y, 1.8) * decay(n, 0.3, 0.003)
    return reverb(pan(y, np.linspace(-0.5, 0.5, n)), 0.25, 0.5, 0.25, 3500)


# -------------------------------------------------------- fun & cartoon
@snd("boing-spring", "Boing spring", "Fun & cartoon", ["boing", "spring", "cartoon"])
def _(r):
    n = N(0.8)
    t = np.arange(n) / SR
    f = 190 * (1 + 0.9 * np.exp(-3.5 * t) * np.sin(TWO_PI * 11 * t * (1 + 0.5 * np.exp(-3 * t))) + 0.5 * np.exp(-6 * t))
    y = sat(osc(f) + 0.5 * osc(2 * f) + 0.2 * osc(3 * f), 1.6)
    return y * decay(n, 0.3, 0.003)


def whistle(r, f0, f1, d):
    n = N(d)
    t = np.arange(n) / SR
    u = np.linspace(0, 1, n)
    base = f0 + (f1 - f0) * (u * u * (3 - 2 * u))
    f = base * (1 + 0.012 * np.sin(TWO_PI * 6 * t) * np.minimum(1, t / 0.15))
    y = osc(f) + 0.12 * osc(2 * f)
    breath = biquad(r.standard_normal(n), "bp", f, 8) * 0.25
    return (y + breath) * np.minimum(1, t / 0.02) * np.where(u > 0.9, (1 - u) * 10, 1)


@snd("slide-whistle-up", "Slide whistle up", "Fun & cartoon", ["whistle", "slide", "up", "cartoon"])
def _(r):
    return whistle(r, 400, 1900, 0.7)


@snd("slide-whistle-down", "Slide whistle down", "Fun & cartoon", ["whistle", "slide", "down", "cartoon"])
def _(r):
    return whistle(r, 1900, 350, 0.7)


@snd("cartoon-blip", "Cartoon blip", "Fun & cartoon", ["blip", "boop", "cartoon"])
def _(r):
    n = N(0.18)
    f = esweep(480, 880, n, 0.5)
    y = osc(f) + 0.3 * osc(2 * f) + 0.1 * osc(3 * f)
    return reverb(y * decay(n, 0.05, 0.002), 0.1, 0.25, 0.08)


@snd("rubber-squeak", "Rubber squeak", "Fun & cartoon", ["squeak", "rubber", "toy"])
def _(r):
    n = N(0.3)
    t = np.arange(n) / SR
    f0 = esweep(900, 1500, n, 0.8) * (1 + 0.04 * np.sin(TWO_PI * 33 * t))
    pulse = 2 * ((np.cumsum(f0) / SR) % 1) - 1
    y = biquad(pulse, "bp", esweep(2200, 3200, n), 14) * 3
    y *= (0.6 + 0.4 * np.sin(TWO_PI * 72 * t + 2 * np.sin(TWO_PI * 9 * t)))
    y *= bellenv(n, 0.4, 0.4)
    return sat(y, 1.5)


# --------------------------------------------------------- money & reward
@snd("coin", "Coin", "Money & reward", ["coin", "money", "pickup"])
def _(r):
    a = bell(1975, 0.5, tau=0.1, parts=((1, 1, 1), (2.4, 0.4, 0.5), (4.1, 0.2, 0.3)))
    b = bell(2637, 0.5, tau=0.12, parts=((1, 1, 1), (2.4, 0.4, 0.5), (4.1, 0.2, 0.3)))
    tick = burst(r, 0.03, "hp", 4000, 1, 0.002) * 0.3
    return reverb(place(0.6, [(tick, 0, 1), (a, 0, 0.6), (b, 0.07, 1.0)]), 0.12, 0.3, 0.1)


@snd("cash-register-ding", "Cash register ding", "Money & reward", ["cash", "register", "money", "ding"])
def _(r):
    clack = burst(r, 0.12, "bp", 1400, 1.2, 0.015) + 0.9 * thump(0.12, 220, 110, 0.03) + 0.4 * burst(r, 0.12, "hp", 3500, 1, 0.003)
    t = tt(1.0)
    ding = (np.sin(TWO_PI * 3520 * t) + np.sin(TWO_PI * 3532 * t) + 0.35 * np.sin(TWO_PI * 5280 * t) * np.exp(-t / 0.2)) * np.exp(-t / 0.28)
    ding[:N(0.001)] *= np.linspace(0, 1, N(0.001))
    return reverb(place(1.1, [(clack, 0, 0.8), (ding, 0.11, 0.7)]), 0.12, 0.35, 0.15)


@snd("level-up-arpeggio", "Level-up arpeggio", "Money & reward", ["level-up", "arpeggio", "reward", "game"])
def _(r):
    def pluck(f, d):
        t = tt(d)
        y = np.sin(TWO_PI * f * t) + 0.4 * np.sin(TWO_PI * 2 * f * t) * np.exp(-t / 0.08) + 0.2 * np.sin(TWO_PI * 3 * f * t) * np.exp(-t / 0.05)
        return y * np.exp(-t / (d / 3.5)) * np.minimum(1, t / 0.003)
    base = 523.25
    steps = [1, 5 / 4, 3 / 2, 2, 5 / 2, 3]
    items = [(pluck(base * s, 0.35 if i < 5 else 0.7), 0.075 * i, 0.7 + 0.06 * i) for i, s in enumerate(steps)]
    items += [(pluck(base * s, 0.7), 0.075 * 5, 0.5) for s in (2, 5 / 2)]
    return reverb(place(1.3, items), 0.2, 0.6, 0.4)


# ---------------------------------------------------------- camera & tech
@snd("camera-shutter", "Camera shutter", "Camera & tech", ["camera", "shutter", "photo"], lvl=-2)
def _(r):
    def clack(f, g):
        return g * (burst(r, 0.06, "bp", f, 2, 0.006) + 0.8 * thump(0.06, 260, 140, 0.01) + 0.3 * burst(r, 0.06, "hp", 4000, 1, 0.002))
    rattle = lp(r.standard_normal(N(0.05)), 2500) * decay(N(0.05), 0.02) * 0.2
    return place(0.25, [(clack(2400, 1.0), 0, 1), (rattle, 0.03, 1), (clack(1700, 0.8), 0.065, 1)])


@snd("typing-burst", "Typing burst", "Camera & tech", ["typing", "keyboard", "keys"], lvl=-3)
def _(r):
    items, t = [], 0.0
    for i in range(14):
        items.append((key_thock(r, 0.85 + 0.35 * r.random(), 0.1), t, 0.55 + 0.45 * r.random()))
        t += 0.05 + 0.045 * r.random() + (0.04 if i in (4, 9) else 0)
    return place(t + 0.12, items)


# ----------------------------------------------------------- mastering
def finish(x, lvl=0.0, rms_db=-18.0, peak_db=-1.4):
    x = np.asarray(x, float)
    x = x - x.mean(axis=0)
    pk = np.abs(x).max()
    x = x / pk * 0.89
    win = N(0.01)
    mono = np.abs(x).max(axis=1) if x.ndim == 2 else np.abs(x)
    m = mono[:len(mono) // win * win].reshape(-1, win).max(axis=1)
    idx = np.nonzero(m > 10 ** (-60 / 20) * 0.89)[0]
    end = (idx[-1] + 1) * win if len(idx) else len(x)
    x = x[:min(len(x), end + N(0.02))]
    # fades on every channel
    if x.ndim == 2:
        x = np.stack([fade(x[:, c], 0.002, 0.012) for c in range(x.shape[1])], axis=1)
    else:
        x = fade(x, 0.002, 0.012)
    rms = np.sqrt(np.mean(x ** 2))
    g = 10 ** ((rms_db + lvl) / 20) / rms
    y = x * g
    thr = 0.55
    a = np.abs(y)
    over = a > thr
    y = np.where(over, np.sign(y) * (thr + (1 - thr) * np.tanh((a - thr) / (1 - thr))), y)
    y *= min(1.0, 10 ** (peak_db / 20) / np.abs(y).max())
    return y


def write_wav(path, x):
    x = np.asarray(x, "<f4")
    ch = 1 if x.ndim == 1 else x.shape[1]
    data = x.tobytes()
    hdr = b"RIFF" + struct.pack("<I", 36 + len(data)) + b"WAVE"
    hdr += b"fmt " + struct.pack("<IHHIIHH", 16, 3, ch, SR, SR * ch * 4, ch * 4, 32)
    hdr += b"data" + struct.pack("<I", len(data))
    Path(path).write_bytes(hdr + data)
    return ch


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    ids = [s["id"] for s in REGISTRY]
    assert len(ids) == len(set(ids)), "duplicate ids"
    entries, report = [], []
    for s in REGISTRY:
        r = np.random.default_rng(zlib.crc32(s["id"].encode()))
        x = finish(s["fn"](r), s["lvl"], peak_db=s["peak"])
        wav = BUILD_DIR / f"{s['id']}.wav"
        ch = write_wav(wav, x)
        mp3 = OUT_DIR / f"{s['id']}.mp3"
        p = run([FFMPEG, "-y", "-v", "error", "-i", str(wav), "-ar", "44100", "-ac", str(ch),
                 "-c:a", "libmp3lame", "-q:a", "2", "-map_metadata", "-1", str(mp3)])
        if p.returncode:
            sys.exit(f"ffmpeg failed for {s['id']}: {p.stderr}")
        dur = float(run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                         "-of", "csv=p=0", str(mp3)]).stdout.strip())
        vd = run([FFMPEG, "-hide_banner", "-i", str(mp3), "-af", "volumedetect", "-f", "null", "-"]).stderr
        mean = float(re.search(r"mean_volume: (-?[\d.]+)", vd).group(1))
        mx = float(re.search(r"max_volume: (-?[\d.]+)", vd).group(1))
        ok = dur > 0 and mx <= -0.5 and mean >= -40
        report.append((s["id"], s["category"], dur, mean, mx, ok))
        entries.append(dict(id=s["id"], name=s["name"], category=s["category"], dur=round(dur, 2),
                            file=f"sounds/{s['id']}.mp3", tags=s["tags"]))
    cats = [c for c in CATEGORIES if any(e["category"] == c for e in entries)]
    assert all(e["category"] in CATEGORIES for e in entries)
    (HERE / "sounds.json").write_text(json.dumps(dict(version=1, categories=cats, sounds=entries), indent=1) + "\n")
    print(f"{'id':24}{'category':22}{'dur s':>7}{'mean dB':>9}{'max dB':>8}  ok")
    for i, c, d, m, x, ok in report:
        print(f"{i:24}{c:22}{d:7.2f}{m:9.1f}{x:8.1f}  {'ok' if ok else 'CHECK'}")
    total = sum(f.stat().st_size for f in OUT_DIR.glob("*.mp3"))
    print(f"{len(entries)} sounds, {total / 1e6:.2f} MB, {sum(not r[-1] for r in report)} flagged")


if __name__ == "__main__":
    main()
