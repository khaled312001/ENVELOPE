"""Transcribe the client meeting. CPU int8, VAD-gated, incremental write.

Model choice: `medium` is already cached locally and this is a 4-physical-core
mobile i7 -- large-v3 would mean a 3 GB download and roughly 3x the wall clock
for a recording we need today. Language is pinned to Arabic: the meeting is two
Egyptians talking, and auto-detect on a code-switched opening minute has a habit
of latching onto English and never recovering.
"""
import sys, time, json
from faster_whisper import WhisperModel

SRC = r"E:\ENVELOPE\last meating.mp4"
OUT = r"C:\Users\KHALE\AppData\Local\Temp\claude\e--ENVELOPE\b497bc93-60c6-4d45-8627-bc9aad1cb443\scratchpad\mtg"

t0 = time.time()
model = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=8)
print(f"[{time.time()-t0:.0f}s] model loaded", flush=True)

segments, info = model.transcribe(
    SRC,
    language="ar",
    beam_size=5,
    vad_filter=True,
    vad_parameters=dict(min_silence_duration_ms=500),
    condition_on_previous_text=False,   # long meetings drift into loops otherwise
)
print(f"duration={info.duration:.0f}s  after_vad={info.duration_after_vad:.0f}s", flush=True)

def ts(s):
    return f"{int(s//3600):02d}:{int(s%3600//60):02d}:{int(s%60):02d}"

rows = []
with open(f"{OUT}/transcript.txt", "w", encoding="utf-8") as f:
    for i, seg in enumerate(segments):
        line = f"[{ts(seg.start)} -> {ts(seg.end)}] {seg.text.strip()}"
        f.write(line + "\n"); f.flush()
        rows.append({"i": i, "start": seg.start, "end": seg.end, "text": seg.text.strip()})
        if i % 25 == 0:
            print(f"[{time.time()-t0:.0f}s] seg {i} @ {ts(seg.start)}", flush=True)

with open(f"{OUT}/transcript.json", "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=1)
print(f"DONE {len(rows)} segments in {time.time()-t0:.0f}s", flush=True)
