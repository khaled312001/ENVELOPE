#!/bin/sh
# Copy the finished meeting transcript into the repo.
#
# Transcription runs ~2x slower than real time on this machine, so a 59-minute
# recording takes about 110 minutes. Run this once it finishes to replace the
# partial copy under docs/01-extracted.
SRC="C:/Users/KHALE/AppData/Local/Temp/claude/e--ENVELOPE/b497bc93-60c6-4d45-8627-bc9aad1cb443/scratchpad/mtg/transcript.txt"
DST="docs/01-extracted/meeting-02/transcript.txt"
[ -f "$SRC" ] || { echo "no transcript at $SRC"; exit 1; }
cp "$SRC" "$DST"
echo "$(wc -l < "$DST") lines, last segment: $(tail -1 "$DST" | cut -c1-30)"
