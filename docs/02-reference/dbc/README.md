# Dubai Building Code 2021 — rule reference

Every clause of DBC 2021 Part B that a plot study can touch, plus the Part C
supplement B.7 cross-refers to, transcribed **verbatim in English and Arabic** with
the page each sentence is printed on. Eng. Mohamed asked for it on 16 Oct 2026:
«اعمل ملف كمرجع فيه كل القواعد بالتفاصيل الدقيقه كلها سواء عربي او انجليزي من ملفين
كود دبي ويكون زي مرجع دايما فى النتائج مينفعش يغلط تاني».

**This is a reference, not a rule base.** Nothing here binds a computation. A clause
reaches the engine only as a typed record or a cited constant, with its page and
verbatim text in the citation and a test that fails if its figure changes — and a
seed rule stays `DRAFT` until a named person approves it. A transcription that
silently became a rule would be exactly the laundering `CLAUDE.md` forbids.

Sources: `docs/00-source/regulations/Dubai Building Code_English_2021 Edition_compressed.pdf`
and its Arabic edition. The two editions share page numbers throughout this range
(offset 0).

## Files

| File | Clauses | PDF pages (EN = AR) | Entries |
|---|---|---|---|
| [B.1–B.3](B.1-B.3-performance-definitions-references.md) | Performance statements, definitions, references | 21–37 | 28 |
| [B.4](B.4-general-architectural-provisions.md) | General architectural provisions — development limits, setbacks (Table B.1), plant | 38–54 | 112 |
| [B.5](B.5-minimum-space-requirements.md) | Minimum space requirements — occupant loads, room sizes | 55–59 | 14 |
| [B.6](B.6-circulation-and-openings.md) | Circulation and openings — corridors, stairs, doors, lifts | 60–77 | 78 |
| [B.7](B.7-building-access-and-vehicular-requirements.md) | Building access and vehicles — access (B.7.2.1), ramps (B.7.2.2, Tables B.9–B.10), bays and aisles (Table B.11), parking ratios (Table B.13), loading and service ramps (B.7.3) | 78–98 | 169 |
| [B.8](B.8-communal-provisions.md) | Communal provisions — sanitary, waste (Tables B.27–B.30) | 99–119 | 197 |
| [B.9](B.9-specific-building-types-and-spaces.md) | Specific building types and spaces | 120–139 | 217 |
| [B.10](B.10-buildings-interaction-with-outdoor-environment.md) | Interaction with the outdoor environment | 140–144 | 46 |
| [B.11](B.11-wayfinding-in-buildings.md) | Wayfinding | 145–150 | 53 |
| [C.6](C.6-accessible-vehicular-supplement.md) | Accessible parking and vehicular access (Part C) | 190–196 | 54 |

"Entries" counts `####` headings — one clause, paragraph, table or figure each.
Every entry carries its obligation as printed (DBC A.3.2: *shall* = mandatory يجب,
*should* = recommended يُفضل, *may* = permitted يمكن) and whether it can be
mechanised from plot geometry and the study's inputs.

## How it was checked

- **Extraction.** pdfjs-dist for B.1–B.11 and C.6; PyMuPDF for B.7.3, whose Arabic
  text layer splits the lam-alef ligature in the wrong order. Figures were read from
  page renders. Tables were resolved by x-coordinate against their headers in both
  editions, because a naive extraction of a right-to-left table swaps columns — the
  same defect that once read Azizi's 340 ft² studio cap as 500.
- **Audit (16 Oct 2026), mechanical rather than sampled,** over B.1–B.3, B.4, B.7.1–B.7.2,
  B.8, B.9, B.10, B.11 and C.6:
  - every English quote must appear on its stated page, ignoring only whitespace and
    case (1,000 quotes);
  - every Arabic quote must have each word and each adjacent word pair on its stated
    page (1,032 quotes);
  - every figure in quotes, values, table cells and figure labels must be on its
    page, and table rows must keep the PDF's figure order, which exposes a column
    swap;
  - the checker was first fed doctored quotes and caught each one.

  It found one error: «متتاليين» for the PDF's «متتالين» in the Arabic definition of
  floor height (B.2, p26). The file now reads as printed.
- **Not covered by that audit:** B.5 and B.6, and B.7.3, which was added the same
  day and checked by its own extraction against 400 dpi renders. Ordering inside
  Arabic lines that carry Latin text or figures could only be checked loosely,
  because the text layer reorders them. Prose describing what a figure draws was not
  compared with the renders; only the figures' printed labels were.

## Where the source disagrees with itself

Recorded as printed, never resolved silently:

- **Figure B.73** labels a service ramp "≥8%" in both editions, while B.7.3.2 says
  "not more than 8%". The text governs; the entry carries a `FIGURE/TEXT CONFLICT` tag.
- **Figure B.57's "≥6.0 m"** is in the text layer but clipped off the visible page.
- **B.9** prints some figures differently in the two editions (3:1 against 1:3 on
  p121; 1,000 mm against 1,000 m on p139). Each is listed in the file.
- **Table B.17's** 800 mm width is not reconciled with B.7.3.3 b)'s 500 mm between
  handrails.

## What the engine reads from here today

| Clause | Used in |
|---|---|
| B.7.2.1 ¶4, Figures B.49–B.50 — 15 m from a junction | `packages/capacity/src/access.ts` |
| Tables B.9, B.10 — ramp gradients and transitions | `packages/capacity/src/ramp-rules.ts` |
| B.7.2.3.1 — a ramped parking floor at no more than 4% | `packages/capacity/src/ramp-rules.ts` |
| Table B.11 — bay and aisle dimensions | `packages/capacity/src/layout.ts` (`TABLE_B11`) |
| B.7.2.6.1 ¶1, Table B.13 — residential parking ratios, no visitor allowance | `packages/rules/src/seed/dubai-residential.ts` (`TABLE_B13`) |
| B.4.2.3 ¶12 — plant on the street | `packages/capacity/src/ground-program.ts` |

Anything else here is available to cite and is not yet encoded. Encoding one means a
record with this file's page and verbatim text, a test, and — for a seed rule — a
named approver.
