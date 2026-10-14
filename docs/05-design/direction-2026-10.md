# Design direction — October 2026

Supersedes the 5 Oct "2026 language" (`modern.css`, `chrome.css`, `console.css`,
all deleted) and the parts of [`direction.md`](direction.md) it contradicts. The
measured rules in `direction.md` — semantic tokens only, no colour literals, every
pair measured, ASSUMED kept in words when the amber colour went — still hold.

## 1. Why

The client's test is blunt: open `/` and `/app`, and if they look the same, the
redesign failed. The 5 Oct pass changed colours and kept a web product's shape —
a gradient hero, a glowing pill button, icon cards that lifted on hover. This
product is an engineering tool for architects, so it now looks like one: the
category is Autodesk Forma and TestFit. The drawing is the subject, and the
interface around it stays quiet.

## 2. Corners

Use **4px** on anything you operate (inputs, buttons, chips) and **8px** on anything
that holds other things (panels, plates, the viewport). Tags take 2px. The five
radius names are unchanged and only their values moved, so no rule had to be
found. Pills survive only where a shape *is* a pill, such as a meter's track.

## 3. The workspace: three regions

```
┌ top bar (--toolbar) ──────────────────────────────────────────┐
├ step bar (--toolbar), sticky under the top bar ────────────────┤
│ canvas (--canvas, 24px dot lattice)       │ inspector          │
│   the step's panels stand on it           │ (--inspector)      │
│                                           │ plot · answer ·    │
│                                           │ gates · derivation │
├ step footer: back · continue (sticky) ────┘                    │
```

- **The step bar sticks** at `--header-h`. The nav is held to exactly that height on
  wide screens, so the two bars cannot overlap. This is what made the earlier
  sticky attempt fail.
- **The inspector is always present.** It used to exist only while a value was being
  inspected, so on nine screens out of ten the work had nothing beside it. It
  restates the engine's `TracedWire` values through `TracedValue`. It computes
  nothing, and the derivation still opens inside it.
- **The inspector has a section that changes with the step** (`engine/StepFacts.tsx`).
  - **Capacity:** the three bands sit beside the building. The governing band says
    "governs" in words and is ruled with the accent, so it is never marked by
    colour alone.
  - **Parking:** the bays on one level, the bays the whole building needs, and the
    three losses kept separate. The two counts are labelled as different
    quantities, because read side by side they look like a shortfall that nobody
    computed.
  - **Checks:** the two counts.

  Because those figures sit beside the work, the middle of the step can open on
  the drawing itself: the 3D view leads the capacity step, and the drawing set
  leads the parking step.
- **The rules step opens on what Compute needs.** It shows four rows, each with
  a short name, a state in words and a jump to its panel. The rows are driven by
  the same booleans the button reads. Three answers are counted. An empty core
  is not counted, because the engine answers it with a stated assumption.
- **A state is a word, so it is set in the sans.** Plex Mono is for figures and
  identifiers. An Arabic word set in mono keeps Plex Mono's wide word spaces.
- **The sidebar is a strip of marks** while the engine is open (`data-engine-open`),
  because the canvas needs the width. Its labels are clipped rather than removed,
  so every list keeps its accessible name.
- **The lattice** sits behind the panels and never under text. It is drawn in the
  decorative rung, which was never measured under prose.

All three roles alias existing rungs and are measured grounds in `contrast.mjs`
under their own names.

## 4. Elevation

There is one shadow, `--shadow-float`, used only for what floats over the drawing:
the phone nav's drop panel, a menu, a dialog. A surface on the page is marked by
its hairline. `--shadow-sm`, `--shadow-md` and `--shadow-glow` resolve to nothing,
and they were kept as names so that sixty rules became correctly flat without
being edited. Nothing rises on hover; a hovered plate answers with its edge.

## 5. Colour

- **Grounds are true neutrals.** They come from the `--grey-*` primitives, chroma
  0–2, where they used to be blue-grey. Inks keep their graphite.
- **The surface ladder is unchanged as a contract.** Every `HOUSE_PAIRS` floor
  holds in all three themes.
- **One accent, `--accent`.** It marks links, focus, the current place (step,
  nav item, sidebar tile) and the primary action. It is flat: no gradient, no glow.
- **State colours stay reserved for state.** Green is DERIVED and red is VARIANCE.
  ASSUMED has no colour, by the client's 5 Oct decision; it carries the word, the
  dotted underline and the tag.
- **Drawing fallbacks follow the palette.** When a light-theme value moves, the
  matching `var(--token, #hex)` fallbacks in `packages/sheets/src/svg.ts` and
  `packages/massing/src/palette.ts` move with it. `pnpm contrast` fails if they
  drift.

## 6. Type

IBM Plex Sans and Mono, unchanged. Headings are set at semibold with tight
tracking, and run smaller than the 5 Oct display scale: a tool's headline states
something rather than shouting it. Figures are mono and tabular. Section heads on
the landing page carry a two-digit index (`01`, `02`), the way a drawing set
numbers its sheets.

## 7. The landing page

- **Hero:** the words on one side, and the run standing in a *viewport* on the
  other: a bar naming the view, then the model on the canvas ground.
- **Order on a phone:** the words come first in source order, so a phone opens on
  the headline.
- **Figures:** shown in a schedule strip, four cells divided by hairlines like a
  title block. Governing capacity carries the accent rule along its top edge.
- **Workflow:** six numbered steps.
- **Claims:** a ruled list.
- **Limits:** a ruled list of refusals.
- **Close:** the readiness band.
- **Motion:** none. There is no scroll reveal.

## 8. What did not change

None of these was touched by this pass:

- `REGULATORY VALIDITY — NOT ASSESSED` is in the fold, measured by `pnpm amber`.
- The five claims stay in §16.5 order.
- "What it does not do" stays on the page.
- Every figure comes from `worked-example.json`.
- The assumption is printed open beside the figures it moves.
