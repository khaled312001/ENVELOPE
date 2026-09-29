# The Arabic walkthrough

Three scripts that record the deployed product answering a real affection plan, in
Arabic, and cut a soundtrack to the recording's own timeline.

```
node scripts/video/probe.mjs     # what the deployment currently calls things
node scripts/video/record.mjs    # the take  → out/video/*.webm + timeline.json
node scripts/video/audio.mjs     # the score → out/video/top-ai-walkthrough-ar.mp4
```

`VIDEO_URL` picks the target (default `https://tob.khaledahmed.net/`).
`VIDEO_SPEED=0.12` scales every pacing beat, which is how the path is validated in
ninety seconds before a nine-minute take is committed to.

## The four rules this pipeline is under

**It records production, and that is a confidentiality decision.** The deployment
runs with `DEVELOPER_STANDARDS=off`, so the standards step says it is withheld and
no client's unit mix reaches the footage. A local server would put it there.

**No figure is typed into a caption.** Where a number appears in the overlay,
`figure()` read it off the element beside it at the moment it was drawn. This is the
landing page's own rule — "no figure on this site is typed by a human" — and a video
of this product that broke it would demonstrate the opposite of what it sells.

**The captions are drawn in the page, not burned on afterwards.** Playwright records
the viewport, so a caption raised by the script that just clicked the field cannot
drift from it. Burning them on in post means holding a second timeline that is
correct for exactly one take.

**Amber means uncertainty and nothing else.** `tone: 'assumed'` is available in the
overlay and is used only where the subject *is* an assumption — §13.1 applies to a
caption bar as much as to a screen, and a viewer who is taught that amber is a
highlight has been taught the opposite of every frame under it.

## What is not in it

There is no spoken narration. This machine has no Arabic speech voice installed, and
sending a client's script to a third-party synthesiser was not something to do
unasked. The narration is therefore Arabic text on screen. An Arabic voice on the
host, or a recorded read, drops into the same mux in `audio.mjs`: point it at a WAV
and mix it above the bed.

The music is synthesised in `audio.mjs` from the numbers in it — a vi–IV–I–V bed in
A minor with its cues placed from `timeline.json`. Nothing is licensed from anywhere,
so there is nothing to clear. It measures -32.4 dB mean and -17.8 dB peak on the
finished file, which is `ffmpeg -af volumedetect` over the mux and not an intention
written down: the bed is quiet enough to talk over, which is what was asked for.

## Look at the frames. The gates do not watch the video.

Everything here can exit 0 over footage nobody would send a client. Three things it
has already done, each caught only by extracting stills and reading them:

- **The overlay did not install at all.** A backtick inside a comment inside the CSS
  template literal in `overlay.js` ended the stylesheet mid-rule, `window.__vid` was
  `undefined`, and `ov()` swallowed every call — so all 31 captions went to Node's
  console and none to the picture. `record.mjs` now calls `assertOverlay()` after
  each navigation and throws instead of filming a silent take.
- **The derivation panel filmed clipped**, half off the left margin, under a caption
  promising the formula. It is a popover anchored to the value it explains, so the
  scene now measures the dialog against the viewport and moves to the next value
  rather than filming the overflow.
- **A caption taught the rule with the wrong example** — `G+2P+8` beside a screen
  showing this run's `1B+G+2P`, which reads as the engine miscounting.

```
ffmpeg -v error -y -ss <seconds> -i out/video/top-ai-walkthrough-ar.mp4 \
  -frames:v 1 -vf scale=1280:-1 out/video/frames/f<seconds>.png
```

Pull one still per chapter from the `scene` marks in `timeline.json` and read them.

## When it breaks

It breaks when the Arabic copy is rewritten, which has happened once and will happen
again. `probe.mjs` walks the flow with the handles that cannot be translated —
`#width`, `#edge-0-class`, `input[name="parking-far"]`, `.stepper__step` — and prints
the accessible names the deployment renders. Everything `record.mjs` matches on came
out of that, and every structural handle is preferred over a name where one exists.

Note that a probe prints `innerText` and `getByRole` matches the *accessible* name;
where an `aria-label` replaces the content the two differ. The language control is
the example: it reads «العربية» on screen and "Switch the site to Arabic" to the
locator.
