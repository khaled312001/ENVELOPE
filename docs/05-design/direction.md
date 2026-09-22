# Visual direction — Phase 1

**Status: proposed, 2026-09-22. Awaiting the client's approval**, which is Phase 1's
acceptance criterion. It is built and deployed so that it can be judged on the real
pages rather than on a mock-up; reverting it is a token edit.

**What it amends.** [`design-language.md`](design-language.md) stays authoritative for
everything not named here. The sections this document changes are §2.6 (radius and
elevation) and §6.10 (the primary control); each carries a pointer back to this file.

**Where it came from.** The client asked for the site to be developed with the design
systems on [Refero Styles](https://styles.refero.design/). Three were read — teenage
engineering, Vercel and Ramp — and their rules are recorded, with sources, in
[`references/`](references/README.md). They were read as references, not templates:
no logo, typeface, illustration or brand colour of theirs is used.

---

## What did not change, and why that is most of the answer

The design language's thesis is *a drawing of a plot, made by an instrument, printed on
paper*: graphite structure, hairline rules, one blue, and amber as the only coloured
surface. All three references turn out to be arguments for the same thing from different
markets — a hardware catalogue, a developer platform, a finance desk — and most of what
they teach was already here:

| Their rule | Source | Already true here |
|---|---|---|
| Mono, uppercase, tracked labels over headings | Vercel | `.eyebrow` is Plex Mono, uppercase, `--tracking-label` |
| Colour is never decoration; amber only for warning | teenage engineering | §13.1 is stricter: amber *only* for ASSUMED, gated by `pnpm contrast` and `pnpm amber` |
| Left-aligned, editorial, never centred body text | Ramp, teenage engineering | the rail (`--rail`), every page |
| Depth by tone and hairline, not by shadow | all three | one shadow was left in the whole language — see §2 |
| A light display weight | teenage engineering | `--weight-light` above `--text-3xl` |
| Motion only for state, no theatrics | Ramp | `site.css` §18, and the count-up refusal |

So the direction is four moves and a layer under them, not a redesign.

---

## §1 · Straight corners — from teenage engineering

`--radius-sm`, `--radius-md` and `--radius-lg` are **0**. `--radius-pill` is deleted and
its two consumers (`.chip`, `.lp-tag`) are square. `--radius-round` stays: a circle is
geometry, not rounding.

**Why.** Every drawing this product makes — a sheet's frame and title block, the plan in
the landing fold, a parking bay — has square corners, and they are the product. A plate
with a 4px corner beside a sheet with a square frame read as two instruments on one desk.
teenage engineering's reason is the same one in other words: *"sharp edges are
non-negotiable, they are what makes the system feel industrial."*

**This reverses a recorded judgement.** design-language §1 rejected zero radius because it
"reads dated more easily than 2px". That was a judgement, not a measurement, and it was
made before the product drew anything but a plot outline. Since Phases 3 and 4 the site
carries a drawing set and a 3D model; the page should be made of the same parts.

## §2 · No shadows — all three

The `--shadow-*` tokens are deleted. Their one consumer was the nav's shade when the page
scrolls under it; the nav's bottom edge now darkens to `--border-strong` instead, which is
measured at 3:1 on every ground and, unlike a shade, prints.

## §3 · The primary action is ink — from Vercel

`.button--primary` is filled with **`--action`** (the ink: `#14161c` in light, `#eef0f5` in
dark) under **`--text-on-action`**, and its hover is **`--action-hover`**, an existing
graphite one step lighter — no new ink was invented. The blue keeps every job that is
*affordance* rather than *action*: links, the focus ring, the current step, a selected
option, the binding band's letter.

**Why.** The blue's largest single area on the site was one button. Measured by
`pnpm amber` at 1440 × 1000, before and after:

| Route | Accent on the first screen | Amber : accent |
|---|---|---|
| `/` | 6,241 px² → **1,696 px²** | 16.7× → **61.4×** |
| `/work` | 50,829 px² → **0** | — |
| `/parking`, `/refusals`, `/app`, `/dashboard` | 4,545 px² → **0** | — |

§13.1 asks for amber to be the loudest thing on the page. Every chromatic pixel that is
not amber competes with it, and the nav's call to action was the one that appeared on
every route. Vercel's version of the rule is that the filled near-black button is "the
strongest visual weight in the system" and colour is not spent on it; here the reason is
stronger than taste.

**Measured, not asserted.** `scripts/contrast.mjs` now holds `--text-on-action` on
`--action` and on `--action-hover` at 4.5, and `--action` itself at 3:1 on all nine grounds
as the control's own boundary (1.4.11), in three themes. Worst cases: 10.94 (label under
the pointer, dark) and 11.41 (fill on the inset ground, dark). On the inverted bands —
the chassis `.section--contrast`, `/refusals` and `/parking` — the three action tokens are
rebound to the band's own inks, and the landing band answers its buttons directly as it
always has, so an ink button cannot stand on an ink ground.

## §4 · The page shows what its sentence promises — teenage engineering's catalogue rule

teenage engineering puts the product in the hero and nothing else. On `/parking` the
product is one assumption, and the page's own lede says *"Here is the assumption, with the
basis it was recorded against"* — while the assumption sat 1,100px below the first screen,
which carried **no amber at all**. `pnpm amber` named the route on every run.

The opening now has two columns: the claim, and beside it the governing figure and the
assumption it rests on, in the full ASSUMED treatment with its basis. Both values are read
from `worked-example.json`, as everything else on the page is. The first screen of
`/parking` now carries **97,344 px²** of amber and no accent.

## §5 · The primitive layer

`tokens.css` now names every colour twice: once as what it **is** — `--graphite-73`, a cool
neutral at CIE L\* 7.3 — and once as what it is **for** — `--text-primary`. The step is L\*
× 10, so the number says where a value sits without a lookup. The themes choose among
primitives; the primitives never change with the theme. Introducing the layer changed no
value: the contrast report before and after was identical line for line.

**A primitive is read by the themes and by nothing else.** `contrast.mjs` assertion (9)
fails any stylesheet, or any drawing source, that reads one directly. It was made to fail
on a doctored rule before it was trusted.

**Near-duplicates are listed, not merged.** `#7d8087`, `#7f8187` and `#7f8289` round to the
same whole-number L\*, and so do four other pairs. Each was tuned to its own contrast
floor, so merging them would move a floor nobody re-measured. They sit side by side in
the primitive block, which is where a later pass can decide.

---

## Two defects found while applying it

Neither came from a reference; both were found by looking at the pages this direction
changed.

- **The landing page's prose links were the browser's default blue**, `rgb(0, 0, 238)` —
  every other page writes its own link rule and this one wrote none. In the dark theme
  that measures 1.89:1 on the page ground and 1.65:1 on a raised one, a 1.4.3 failure on
  the front door that
  `pnpm contrast` could not see because no rule painted it. `site.css` now carries a floor
  rule at zero specificity (`:where()`), painting the measured `--accent`.
- **Every `<a class="button">` outside the nav was underlined.** design-language §6.10
  specifies `text-decoration: none` on `.button`; the stylesheet had dropped it.

## Considered and not applied

- **teenage engineering's ruled catalogue grid** — cells separated by vertical hairlines.
  Its natural home on the landing page is §03, and it would be wrong there: §03 is a
  *connected chain* because its four stages run in sequence, and `landing.css` gives §03,
  §04 and §05 three deliberately different shapes. Vertical rules would turn a sequence
  into four parallel items and repeat §04's ledger. It is kept for a grid of genuinely
  parallel things — the file list on `/exports` (Phase 5) is the likely one.

## Refused, and why

| Rule | Source | Why not |
|---|---|---|
| Weight 100 for body text | teenage engineering | A traced figure set in a hairline cannot be read at 12–16px, and a figure is the product. |
| The highlighter yellow `#e4f222` on every action | Ramp | Yellow-green beside amber teaches a reader that yellow means *go*, on the one product where it must mean *assumed*. |
| Spectrum gradients, the triangle mark, Geist | Vercel | Brand marks, not rules; and Geist has no Arabic, which this product needs. |
| Display tracking of −0.06em | Vercel | Plex Light at 61px closes its counters at that tracking; `--tracking-banner` stays −0.035em. |
| Pill buttons and 10–16px card radii | Vercel, Ramp | Contradicts §1. |
| One weight for the whole hierarchy | Ramp | Plex carries the hierarchy with Light for display and Medium for labels; one weight would push it all onto size, and the size ramp is already a measured 1.25. |
| Product photography as the hero | teenage engineering | There is no product to photograph. The drawing is the product, and it already stands where their photograph does; Phase 5 puts the 3D model there too. |

## How it is verified

`pnpm contrast` (438 pairs, three themes, assertion 9 new), `pnpm check`, `pnpm smoke`,
`pnpm amber` before and after (the table in §3), and before/after screenshots of `/` and
`/parking` in light, dark and at 390px.
