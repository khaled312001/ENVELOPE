/*
 * THE SOUNDTRACK, SYNTHESISED HERE, AND CUT TO THE RECORDER'S OWN TIMELINE.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS GENERATED RATHER THAN SOURCED.
 *
 * A demonstration that goes to a client and a funder cannot carry a music bed
 * whose licence nobody can produce, and "royalty free" on a download page is not
 * a licence. Everything audible in the output of this file is computed from the
 * numbers below, so there is nothing to clear and nothing to take down. It also
 * makes the bed reproducible: the same timeline gives the same score, which is
 * the same property the rest of this repository insists on for figures.
 *
 * ---------------------------------------------------------------------------
 * THE CUES ARE PLACED FROM `timeline.json`, NOT BY EAR.
 *
 * `record.mjs` writes the millisecond each caption and card appeared. A cue
 * placed from that lands on the cut in every take, including the take that ran
 * four seconds long because the engine was slower that morning. Placing them by
 * hand would be correct for exactly one recording — the same defect the overlay
 * exists to avoid on the picture side.
 *
 * ---------------------------------------------------------------------------
 * THERE IS NO VOICE-OVER, AND THAT IS A LIMITATION, NOT A CHOICE.
 *
 * This machine has no Arabic speech voice installed — the Windows speech stack
 * reports zero voices — so a spoken Arabic narration cannot be produced here
 * without sending the script to a third-party service, which is not something to
 * do with a client's material unasked. The video therefore carries its narration
 * as Arabic text on screen, and the audio is a bed plus cues. An Arabic voice
 * installed on the host, or a recorded read, drops straight into the same mux.
 *
 * ---------------------------------------------------------------------------
 * IT IS QUIET ON PURPOSE. The brief was «موسيقى تحفيزية منخفضة جدا», and a bed
 * under a technical walkthrough competes with reading. The music peaks around
 * -26 dBFS and the cues around -16; nothing is compressed up to meet a loudness
 * target, because there is no dialogue for it to sit under.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT = resolve(ROOT, 'out/video');

const SR = 48_000;
const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ the timeline */

const timelinePath = resolve(OUT, 'timeline.json');
if (!existsSync(timelinePath)) {
  console.error('no timeline.json — run scripts/video/record.mjs first');
  process.exit(1);
}
const timeline = JSON.parse(readFileSync(timelinePath, 'utf8'));
const RAW = process.env.VIDEO_RAW ?? timeline.raw;
if (!existsSync(RAW)) {
  console.error(`the recording is missing: ${RAW}`);
  process.exit(1);
}

/** The picture is the clock. The score is cut to it, never the other way round. */
const seconds = Number(
  execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    RAW,
  ])
    .toString()
    .trim(),
);
const N = Math.ceil(seconds * SR);
console.log(`picture ${(seconds / 60).toFixed(2)} min · ${timeline.marks.length} marks`);

/* Float32, not Float64: a ten-minute stereo bed is 26M samples a side, and the
   output is 16-bit anyway. The wider array doubles the allocation to buy
   precision that is thrown away at the quantiser. */
const L = new Float32Array(N);
const R = new Float32Array(N);

/* ------------------------------------------------------------------ the voices */

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

/**
 * vi–IV–I–V in A minor: the progression that reads as forward motion in every
 * market this will be shown in. Eight seconds a chord, so a 32-second cycle —
 * long enough that a ten-minute bed does not announce its own loop.
 */
const PROGRESSION = [
  { root: 45, notes: [57, 60, 64] }, // Am
  { root: 41, notes: [53, 57, 60] }, // F
  { root: 48, notes: [52, 55, 60] }, // C
  { root: 43, notes: [50, 55, 59] }, // G
];
const CHORD = 8; /* seconds */

/** A slow pad: the note, a fifth of a cent of detune, and a soft breath either side. */
function pad(t0, dur, freq, gain, pan = 0) {
  const a = 1.6, r = 2.2; /* attack, release — both long; nothing here should start */
  const i0 = Math.floor(t0 * SR);
  const i1 = Math.min(N, Math.floor((t0 + dur) * SR));
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const env =
      t < a ? (t / a) ** 1.6 : t > dur - r ? Math.max(0, (dur - t) / r) ** 1.4 : 1;
    /*
      Partials, a detuned twin, and a slow wobble on the twin.
      A single sine at pitch is a test tone; what makes a pad sound played is two
      voices a fraction apart, beating slowly against each other. The 0.17 Hz LFO
      is what keeps that beat from settling into one steady pulse.
    */
    const drift = 1.0013 + 0.0006 * Math.sin(TAU * 0.17 * t);
    const s =
      Math.sin(TAU * freq * t) * 0.58 +
      Math.sin(TAU * freq * drift * t) * 0.30 +
      Math.sin(TAU * freq * 2 * t) * 0.09 +
      Math.sin(TAU * freq * 3 * t) * 0.03;
    const v = s * env * gain;
    L[i] += v * (1 - Math.max(0, pan));
    R[i] += v * (1 + Math.min(0, pan));
  }
}

/** A plucked note, for the motion under the pad. Quiet, and short. */
function pluck(t0, freq, gain, pan = 0) {
  const dur = 1.1;
  const i0 = Math.floor(t0 * SR);
  const i1 = Math.min(N, i0 + Math.floor(dur * SR));
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const env = Math.exp(-t * 3.6) * (1 - Math.exp(-t * 260));
    const s = Math.sin(TAU * freq * t) + Math.sin(TAU * freq * 2 * t) * 0.22;
    const v = s * env * gain;
    L[i] += v * (1 - Math.max(0, pan));
    R[i] += v * (1 + Math.min(0, pan));
  }
}

/* The bed. It starts under the title card and runs to the end. */
const MUSIC_GAIN = 0.030;
for (let c = 0; c * CHORD < seconds + CHORD; c++) {
  const t0 = c * CHORD;
  const ch = PROGRESSION[c % PROGRESSION.length];
  pad(t0, CHORD + 1.2, midi(ch.root) / 2, MUSIC_GAIN * 0.85); /* the sub */
  ch.notes.forEach((n, k) => {
    pad(t0, CHORD + 1.2, midi(n), MUSIC_GAIN, (k - 1) * 0.35);
  });
  /* Eight plucks a chord, alternating across the stereo field. */
  for (let k = 0; k < 8; k++) {
    const n = ch.notes[[0, 2, 1, 2, 0, 1, 2, 1][k]] + (k === 7 ? 12 : 0);
    pluck(t0 + k * (CHORD / 8), midi(n), MUSIC_GAIN * 0.5, k % 2 ? 0.45 : -0.45);
  }
}

/* One echo, for a room. Cheap, and it stops the pad sounding pasted on. */
const D = Math.floor(0.23 * SR);
for (let i = D; i < N; i++) {
  L[i] += R[i - D] * 0.16;
  R[i] += L[i - D] * 0.16;
}

/*
 * One pole at 3.6 kHz, over the MUSIC ONLY — the cues are added after this.
 *
 * Summed sines keep every harmonic at full strength, which is what makes a
 * synthesised bed sound like a synthesiser. Rolling the top off puts it behind
 * the picture, where a bed belongs. The cues stay bright on purpose: they have
 * to be heard over it without being loud.
 */
const a = 1 - Math.exp((-TAU * 3600) / SR);
let yl = 0;
let yr = 0;
for (let i = 0; i < N; i++) {
  yl += a * (L[i] - yl);
  yr += a * (R[i] - yr);
  L[i] = yl;
  R[i] = yr;
}

/* ------------------------------------------------------------------ the cues */

const TONE = {
  /* A scene change: a tick, barely there. It marks the cut and says nothing. */
  scene: { freqs: [2200, 3300], dur: 0.09, decay: 34, gain: 0.030 },
  /* A chapter card: a fifth, rising. The only cue with any lift in it. */
  card: { freqs: [660, 990, 1320], dur: 0.9, decay: 3.4, gain: 0.085, rise: true },
  /* A figure pulled out of the page: a small bell on the number. */
  figure: { freqs: [1320, 1976], dur: 0.6, decay: 5.2, gain: 0.05 },
};
/* A refusal is the one thing that gets a low sound rather than a bright one. */
const REFUSAL = { freqs: [110, 165, 220], dur: 1.1, decay: 3.0, gain: 0.07 };

function cue(t0, spec) {
  const i0 = Math.floor(t0 * SR);
  const i1 = Math.min(N, i0 + Math.floor(spec.dur * SR));
  for (let i = i0; i < i1; i++) {
    const t = (i - i0) / SR;
    const env = Math.exp(-t * spec.decay) * (1 - Math.exp(-t * 420));
    let s = 0;
    spec.freqs.forEach((f, k) => {
      /* `rise` staggers the partials so the card cue reads as two notes, not one chord. */
      const delay = spec.rise ? k * 0.085 : 0;
      if (t < delay) return;
      s += Math.sin(TAU * f * (t - delay)) / (k + 1.6);
    });
    const v = s * env * spec.gain;
    L[i] += v;
    R[i] += v;
  }
}

let placed = 0;
for (const m of timeline.marks) {
  const t = m.t / 1000;
  if (t >= seconds) continue;
  const spec = m.tone === 'refusal' && m.kind !== 'scene' ? REFUSAL : TONE[m.kind];
  if (!spec) continue;
  cue(t, spec);
  placed += 1;
}
console.log(`placed ${placed} cue(s) from the recorder's own timeline`);

/* ------------------------------------------------------------------ the master */

/* Fade the bed in under the title card and out under the last one. */
const fadeIn = 3.0 * SR;
const fadeOut = 4.0 * SR;
for (let i = 0; i < N; i++) {
  let g = 1;
  if (i < fadeIn) g = i / fadeIn;
  if (i > N - fadeOut) g = Math.min(g, (N - i) / fadeOut);
  L[i] *= g;
  R[i] *= g;
}

/* No limiter and no make-up gain: if this needs either, the numbers above are
   wrong. The check is a ceiling, not a compressor. */
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
console.log(`peak ${(20 * Math.log10(peak || 1e-9)).toFixed(1)} dBFS`);
const scale = peak > 0.9 ? 0.9 / peak : 1;

const pcm = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * scale * 32767))), i * 4);
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * scale * 32767))), i * 4 + 2);
}
const head = Buffer.alloc(44);
head.write('RIFF', 0);
head.writeUInt32LE(36 + pcm.length, 4);
head.write('WAVEfmt ', 8);
head.writeUInt32LE(16, 16);
head.writeUInt16LE(1, 20);
head.writeUInt16LE(2, 22);
head.writeUInt32LE(SR, 24);
head.writeUInt32LE(SR * 4, 28);
head.writeUInt16LE(4, 32);
head.writeUInt16LE(16, 34);
head.write('data', 36);
head.writeUInt32LE(pcm.length, 40);

mkdirSync(OUT, { recursive: true });
const score = resolve(OUT, 'score.wav');
writeFileSync(score, Buffer.concat([head, pcm]));
console.log(`score: ${score}`);

/* ------------------------------------------------------------------ the mux */

const mp4 = resolve(OUT, 'top-ai-walkthrough-ar.mp4');
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-i', RAW,
    '-i', score,
    /* Playwright writes VP8 at a variable rate; a fixed 30 is what a player and a
       phone both expect, and what makes the file scrub properly. */
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    mp4,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);

console.log(`video: ${mp4}`);

/*
 * A second file, 720p, for sending.
 *
 * The master is 1080p at CRF 20 because it will be shown on a screen in a room.
 * That file is too large to put through a messaging app, and re-encoding it on
 * the way through one is how a demonstration ends up looking like a demonstration
 * of compression. This is the copy to send; the master is the copy to present.
 */
const share = resolve(OUT, 'top-ai-walkthrough-ar-720p.mp4');
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-i', mp4,
    '-vf', 'scale=1280:720:flags=lanczos',
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '28',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', '128k',
    share,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'] },
);
console.log(`share: ${share}`);
