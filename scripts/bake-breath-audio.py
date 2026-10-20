#!/usr/bin/env python3
"""Bake Atrium's breath tracks: one 70 s round per pattern, looped by the app.

The voice and melody are ported from the macOS Breathe app
(breathwork-v2/swift/BreathCore/Sources/BreathCore/ChimeVoice.swift), so the
phone sounds like the Mac: a soft marimba in F natural minor. Each inhale
climbs the F minor chord one note per second (F A♭ C F …); each exhale steps
back down the scale and always arrives D♭ → C, a fifth below home, so the next
inhale rises out of the dominant into the tonic. 60 s of breathing, then 10 s
of rest (the room tail of the last note fades by ~62 s).

Rendering mirrors ChimeVoice.render: per-partial decays (shorter and softer
above home), a small seeded room convolved in with Web Audio's convolver
normalization, and successive notes alternating gently left and right.
Loudness is matched to the previous pluck track, so the volume doesn't jump.

    python3 scripts/bake-breath-audio.py
"""

import math
import wave
from pathlib import Path

import numpy as np

SR = 22050
ROUND_SEC = 70
BREATH_SEC = 60
PATTERNS = {"breath-loop.wav": (4, 6), "breath-loop-55.wav": (5, 5)}
AUDIO = Path(__file__).resolve().parent.parent / "assets" / "audio"
# The pluck these tracks replace sets the level: RMS of its first 0.35 s.
REFERENCE_RMS = 0.20214  # measured from the 11.025 kHz pluck track

# ChimeVoice.softMarimba
HOME = 349.23  # F4
DURATION, ATTACK, RELEASE = 1.4, 0.004, 0.05
PARTIALS = [(1, 1, 3.6), (2, 0.04, 8), (3.99, 0.18, 11), (9.9, 0.05, 22)]  # ratio, weight, decay
ROOM_SEC, ROOM_DAMPING, ROOM_MIX = 1.4, 0.7, 0.2
PAN_WIDTH = 0.15
SCALE = [0, 2, 3, 5, 7, 8, 10]  # F G A♭ B♭ C D♭ E♭
CHORD = [0, 2, 4]  # F A♭ C
LOWEST, HIGHEST = -3, 9  # C4 … A♭5


def frequency(degree):
    octave = math.floor(degree / len(SCALE))
    semis = 12 * octave + SCALE[degree - octave * len(SCALE)]
    return HOME * 2 ** (semis / 12)


def ascent(beats):
    tones, position = [], 0
    while True:
        degree = len(SCALE) * (position // len(CHORD)) + CHORD[position % len(CHORD)]
        if degree > HIGHEST:
            break
        tones.append(degree)
        position += 1
    return [tones[min(i, len(tones) - 1)] for i in range(beats)]


def descent(beats, peak, rng):
    if beats <= 1:
        return [LOWEST] * beats
    approach = LOWEST + 1
    moves = beats - 2
    start = max(approach, min(peak - 1, approach + 2 * moves))
    span = start - approach
    sizes = [1 if span >= moves else 0] * moves
    order = list(range(moves))
    rng.shuffle(order)
    for i in order[: (span - moves if span >= moves else span)]:
        sizes[i] += 1
    notes = [start]
    for s in sizes:
        notes.append(notes[-1] - s)
    return notes + [LOWEST]


def dry(freq, decay_scale=1.0):
    t = np.arange(int(DURATION * SR)) / SR
    out = np.zeros_like(t)
    for ratio, weight, decay in PARTIALS:
        f = freq * ratio
        if f >= SR / 2:
            continue
        env = np.where(t < ATTACK, t / ATTACK, np.exp(-(t - ATTACK) * decay * decay_scale))
        out += np.sin(2 * np.pi * f * t) * weight * env
    r = max(1, int(RELEASE * SR))
    out[-r:] *= (r - np.arange(r)) / r
    return out


class Mulberry32:
    """The Tone Lab's seeded PRNG, bit for bit."""

    def __init__(self, seed):
        self.s = seed & 0xFFFFFFFF

    def next(self):
        self.s = (self.s + 0x6D2B79F5) & 0xFFFFFFFF
        t = ((self.s ^ (self.s >> 15)) * (1 | self.s)) & 0xFFFFFFFF
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) & 0xFFFFFFFF) ^ t
        return (t ^ (t >> 14)) / 4294967296


def room_impulse():
    n = int(ROOM_SEC * SR)
    pre = int(0.012 * SR)
    chans = []
    for seed in (17, 118):
        rng, out, lp = Mulberry32(seed), np.zeros(n), 0.0
        for i in range(pre, n):
            t = (i - pre) / SR
            x = rng.next() * 2 - 1
            a = min(0.97, 0.25 + ROOM_DAMPING * 0.7 * (t / ROOM_SEC))
            lp += (1 - a) * (x - lp)
            out[i] = lp * math.exp(-6.9 * t / ROOM_SEC) * min(1, t / 0.005)
        chans.append(out)
    return chans


def convolver_normalization(chans):
    power = sum(float(np.sum(c * c)) for c in chans)
    rms = math.sqrt(power / sum(len(c) for c in chans))
    if not math.isfinite(rms) or rms < 0.000125:
        rms = 0.000125
    return 0.00125 / rms * 44100 / SR


def chimes(degrees):
    """degree -> [left-panned (L, R), right-panned (L, R)]"""
    impulse = room_impulse()
    wet_gain = ROOM_MIX * convolver_normalization(impulse)
    dry_gain = 1 - ROOM_MIX / 2
    home = dry(HOME)
    level = REFERENCE_RMS / math.sqrt(np.mean(home[: int(0.35 * SR)] ** 2))
    taper = int(0.005 * SR)
    pans = []
    for pan in (-PAN_WIDTH, PAN_WIDTH):
        x = (pan + 1) / 2 * math.pi / 2
        pans.append((math.cos(x), math.sin(x)))
    out = {}
    for d in degrees:
        f = frequency(d)
        ratio = f / HOME
        note = dry(f, math.sqrt(ratio))
        wet = [np.convolve(note, ch) for ch in impulse]
        length = len(wet[0])
        g0 = level * ratio ** -0.25
        out[d] = []
        for gains in pans:
            channels = []
            for c in range(2):
                g = gains[c] * g0
                ch = wet_gain * g * wet[c]
                ch[: len(note)] += dry_gain * g * note
                ch[-taper:] *= (taper - np.arange(taper)) / taper
                channels.append(ch)
            out[d].append(channels)
    return out


def bake(name, inhale, exhale, voices, rng):
    up = ascent(inhale)
    down = descent(exhale, up[-1], rng)
    cycle = up + down
    names = "C D♭ E♭ F G A♭ B♭".split()
    print(f"{name}: {' '.join(names[(d + 3) % 7] for d in cycle)}")
    buf = np.zeros((2, ROUND_SEC * SR))
    for beat in range(BREATH_SEC):
        L, R = voices[cycle[beat % len(cycle)]][beat % 2]
        at = beat * SR
        n = min(len(L), buf.shape[1] - at)
        buf[0, at : at + n] += L[:n]
        buf[1, at : at + n] += R[:n]
    peak = float(np.max(np.abs(buf)))
    if peak > 0.98:
        buf *= 0.98 / peak
    pcm = np.clip(np.round(buf.T * 32767), -32768, 32767).astype("<i2")
    with wave.open(str(AUDIO / name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    last = np.nonzero(np.abs(buf).max(axis=0) > 1e-4)[0][-1] / SR
    print(f"  peak {peak:.3f}, sound ends at {last:.2f} s")


def main():
    import random

    rng = random.Random(7)
    voices = chimes(range(LOWEST, HIGHEST + 1))
    for name, (inhale, exhale) in PATTERNS.items():
        bake(name, inhale, exhale, voices, rng)


if __name__ == "__main__":
    main()
