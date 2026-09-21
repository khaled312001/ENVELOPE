# Source inventory

Everything received from the client, where it now lives, and what it is good for. The rule from
[`README.md`](README.md) still holds and is repeated because it is the one that gets broken:
**originals are never edited, and no threshold is ever quoted from extracted text.** Extraction
drops `≤ ≥ → Σ ± m²` and scrambles tables. Quote the PDF.

Large binaries (the recording, the three code PDFs, the developer archive) are on disk but
**git-ignored** — 2.1 GB has no business in a repository whose job is to be diffable. What the
repo reasons over is the extracted text beside it.

---

## Received 29 Aug 2026 — first contact

| File | Location | Notes |
|---|---|---|
| ENVELOPE deck, 12 slides | `client/ENVELOPE_Deck.pdf` | Slide 05's arithmetic does not reconcile — see `03-analysis/open-questions.md` |
| PRD v2, 78 pp | `client/ENVELOPE_PRD_v2.pdf` | Withdraws v1 as arithmetically invalid |
| Pipeline diagram | `client/pipeline-diagram.jpg` | Contradicts the PRD's own fixpoint |
| Sigma-PMO user guide | `reference/Sigma-PMO-User-Guide-AR.pdf` | **Khaled's own platform. Sent under a verbal confidentiality request. Not client material — do not redistribute.** |

## Received 30 Aug 2026 — second meeting

### The recording

| File | Location |
|---|---|
| Meeting recording, 59 m 22 s, 1280×720 | `client/meeting-02-2026-08-30/last-meeting.mp4` |
| Transcript, timestamped | `../01-extracted/meeting-02/transcript.txt` |
| 187 distinct screens | `../01-extracted/meeting-02/screens/` |
| Analysis | `../03-analysis/meeting-02-2026-08-30.md` |

Regenerate both with [`scripts/extract/transcribe-meeting.py`](../../scripts/extract/transcribe-meeting.py)
and [`scripts/extract/meeting-screens.py`](../../scripts/extract/meeting-screens.py).

> **The transcript is machine output and it has errors.** `faster-whisper medium`, Arabic,
> on dialect speech over a call. It is a finding aid, not a record. Quotations used in analysis
> were checked against the audio.

### Regulations — the constant the engine indexes

| File | Pages | TOC entries | Text |
|---|---|---|---|
| `regulations/Dubai Building Code_English_2021 Edition_compressed.pdf` | 843 | 1,671 | clean |
| `regulations/Dubai Building Code_Arabic_2021 Edition_compressed.pdf` | 882 | 1,671 | clean Arabic |
| `regulations/UAEFIRECODE_ENG.pdf` | 707 | 1,097 | clean |

All three are born-digital with real text and full bookmarks — no OCR needed, and a clause can
be cited to a page. Page-tagged extractions and TOC JSON are in `../01-extracted/regulations/`.

The Arabic edition extracts as genuine Arabic, not glyph soup — which is what makes a bilingual
rule index possible rather than aspirational. It does decompose lam-alef and hamza carriers into
presentation forms, so a search for `الغلاف` must normalise to find text stored as `الغالف`.

**Clauses encoded so far:** B.7.2.4 Table B.11 (bay and driveway dimensions),
B.7.2.6.1 Table B.13 (parking ratios), B.7.2.6.2 (preferred parking 5%), B.7.2.7 (bicycles).

**The precedence rule that governs all of them**, B.7.2.6.1 verbatim:

> "Parking requirements set out in the affection plan or DCR shall take precedent over
> Table B.13."

So the affection plan is a citable instrument that *outranks* the code, which is why intake
emits its fields as `DERIVED` against a citation rather than as user input.

### Samples — the inputs a real job arrives as

| File | What it is |
|---|---|
| `samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf` | Trakhees / Nakheel, Warsan 1. 1,365.23 m², FAR 3.50, G+2P+8. The sheet walked on screen. |
| `samples/rfp/D1005 RFP Residential Building Al Mamzar…pdf` | 235 pp. Full consultancy RFP incl. contract clauses. |
| `samples/rfp/Annexure A- Project Brief - CPT2-6468096-Z6-04.pdf` | Azizi Milan. **The target output spec** — see below. |

**Annexure A is the most useful single document received.** It states, as client requirements,
exactly the numbers the engine must produce:

- Plot 48,075 ft²; GFA 21,604.61 m²
- Unit mix — Studio 70% @ 320 ft², 1BR 25% @ 550–650, 2BR 3% @ 1,100, 3BR 2% @ 1,400
- Sellable area ≥ 100% of GFA
- Balcony 20% of unit sellable area, capped 25%
- **Basement car park efficiency ≥ 37.5 m² per car**
- 3 basements + ground + 5 podium levels; up to G+5P+45
- Retail on ground at 6 m clear; amenities 3% of GFA
- Cantilevered balconies ≤ 2 m

### Developer standards

`developer-standards/azizi/OneDrive_2025-07-30.zip` — 1.8 GB, 202 files, "Starting Kit".
Nine rule-bearing documents were extracted alongside it; the ~800 MB Design Guide picture books
were left in the archive.

| Extracted | Why it matters |
|---|---|
| `Annexure A- Project Brief_ 178.pdf`, `_ 196.pdf` | Two more briefs, same shape |
| `Plot DJAZ1MED12RES011-178.pdf` | **The sheet that omits its own limits** — see below |
| `Plot DJAZ1TRE10RES022-196.pdf` | 1,740.56 m², FAR 5.05, G+3P+6, conditional setback |
| `DJA-Z0B0-CA-DEVELOPMENT CODE-May08.pdf` | Dubai Development Authority code |
| `Tarakhees Building Regulation Architecture Book_CD 1.pdf` | Trakhees — the authority on the Warsan sheet |
| `250617_UNIT AREAS, AMENITIES,.pdf` | Unit and amenity schedules |
| `360-GEN-DOC_PROPOSED BALCONY STRATEGIES…pdf` | Balcony rules — conflicts with the RFP's 10%, see the meeting analysis |
| `250620_Residential, Office & Retail Numbering.pdf` | Numbering convention |

The archive also holds unit prototypes at **6.5, 6.7, 8.0, 8.6 and 8.7 m structural grids**,
each with 300/400/600 mm columns. That is a parametric unit library, and it explains the grids:
at 8.0 m a run of three 2.5 m bays plus a 400 mm column lands almost exactly on grid.

---

## The three affection plans, side by side

This table is the reason the parser is written the way it is.

| Field | IC1-CTYL-16_011 | DJAZ1TRE10RES022 | DJAZ1MED12RES011 |
|---|---|---|---|
| Total area | 1,365.23 m² | 1,740.56 m² | 2,365.87 m² |
| FAR | 3.50 | 5.05 | **not printed** |
| GFA | 4,778.31 m² | 8,796.46 m² | **not printed** |
| Height | G+2P+8 | G+3P+6 | G+11 |
| Setback | 0 m all sides / tower 3 m | conditional on wall type | **not printed** |
| Coverage | 100% / tower 60% | **not printed** | **not printed** |
| Authority | Trakhees | Trakhees | Trakhees |
| Developer | Nakheel | Limitless | Limitless |

Three things follow, and all three are enforced in code:

1. **FAR × area reproduces the printed GFA** on both sheets that print one, to the rounding
   shown. That is a check the engine runs, not a coincidence it relies on.
2. **`DJAZ1MED12RES011` prints a height and nothing else.** No FAR, no GFA, no setback, no
   coverage. Borrowing 3.50 from the neighbouring plot would be the precise failure this
   product exists to prevent, so intake reports the gaps and refuses to compute.
3. **`DJAZ1TRE10RES022` has a setback that is not a number** — "0 m to solid wall and 4.0 m to
   window wall". It depends on a façade decision nobody has made. It is preserved as
   conditional rather than collapsed to one value.

There is also a NUL byte inside `G+3P+6` on the TRE10 sheet. Any pattern for `G+nP+n` misses it
and the plot silently reports no permitted height, until control characters are stripped.
