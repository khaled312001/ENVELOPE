"""Sample the meeting video and keep only visually distinct screens.

The point is the screen-share, not the faces: sampling every 8s and keeping a
frame only when its dHash moves far from the last kept one collapses ~60 min of
mostly-static screen-share into the handful of actual slides/sites shown.
"""
import cv2, numpy as np, os

SRC = r"E:\ENVELOPE\last meating.mp4"
OUT = r"C:\Users\KHALE\AppData\Local\Temp\claude\e--ENVELOPE\b497bc93-60c6-4d45-8627-bc9aad1cb443\scratchpad\mtg\frames"
os.makedirs(OUT, exist_ok=True)

def dhash(img, s=16):
    g = cv2.cvtColor(cv2.resize(img, (s+1, s)), cv2.COLOR_BGR2GRAY)
    return (g[:, 1:] > g[:, :-1]).flatten()

cap = cv2.VideoCapture(SRC)
fps = cap.get(cv2.CAP_PROP_FPS)
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
STEP = int(fps * 8)

prev, kept = None, 0
manifest = []
for fi in range(0, total, STEP):
    cap.set(cv2.CAP_PROP_POS_FRAMES, fi)
    ok, frame = cap.read()
    if not ok:
        continue
    h = dhash(frame)
    dist = 256 if prev is None else int(np.count_nonzero(h != prev))
    if dist > 26:                       # ~10% of 256 bits changed = a new screen
        t = fi / fps
        name = f"{kept:03d}_{int(t//60):02d}m{int(t%60):02d}s.jpg"
        cv2.imwrite(os.path.join(OUT, name), frame, [cv2.IMWRITE_JPEG_QUALITY, 82])
        manifest.append(f"{name}\t{int(t//60):02d}:{int(t%60):02d}\tdist={dist}")
        kept += 1
        prev = h
cap.release()
open(os.path.join(OUT, "manifest.txt"), "w").write("\n".join(manifest))
print(f"kept {kept} distinct screens from {total} frames")
