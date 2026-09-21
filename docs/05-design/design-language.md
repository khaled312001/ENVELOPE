# ENVELOPE — the design language

Authoritative. Where this document and a stylesheet disagree, the stylesheet is wrong.

Every ratio quoted here was computed against the tokens as written, by a corrected
three-theme extractor, and is reproducible from §3. Nothing is asserted that was not
measured. Where a value is a judgement rather than a measurement, it says so.

---

## 1. The thesis

**A drawing of a plot, made by an instrument, printed on paper.** The page is set in
ink and structure — one datum rule per section, one rail every heading and numeral
starts on, one 1.25 ratio that holds at every viewport width above 500px, one meter
primitive instead of four, one status rail instead of seventeen — and *nothing* in
that structure is chromatic. Measured on the palette in §2, chroma spread being
max(R,G,B) − min(R,G,B): **every neutral sits at or below 12 out of 255**, most at 0–8,
and the widest are `--text-tertiary` at 12 in both themes. The amber ground measures
**29** in light and **36** in dark. So against a page whose structure is drawn entirely
in graphite, `--uncertain-surface` is the only *coloured surface* in the layout. The
four provenance inks are chromatic too — `--variance` is 137, marginally above amber's
133 — but they appear as strokes and short runs of text and never as a filled area,
which is the difference that matters at page scale. That is the
whole design: the honesty treatment does not survive the polish, it is what the polish
is *for*. Structure this rigid makes a 6px rail in the margin gutter — a width no other
state is permitted (§6.2) and a gutter where nothing else in the system is ever drawn —
legible at page scale before a word is read, and legible in greyscale as a *position and
a width*, not a hue. The commercial argument and the
product argument are the same argument, because the artefact this engine produces is
a drawing with dimension lines and a title block, and the page should be made of the
same parts. In 2026 a soft-shadow SaaS page is the cheapest thing on the internet;
precision is expensive because it cannot be pasted in — it has to be true all the way
down.

### What was rejected, and why

**The Product Console** — a dark chrome frame holding a live run, with a parallel
`--*-on-chrome` palette. Rejected on three counts, each fatal rather than a
preference. (a) Its signature object has no edge: `--chrome-base #1b1b22` on
`--surface-base #121215` measures **1.09:1**, so in dark mode the frame carrying the
entire thesis is separated from the page only by a 1.47:1 hairline and a shadow that
is `none` in print. (b) It duplicates 17 semantic tokens with identical light and dark
values, which is by construction a *second design*, not a token swap — and it turns
amber from one greppable token into four, quadrupling the surface area that
non-negotiable #1 has to police. (c) On paper it degrades to "a bordered white plate",
so its amber argument does not exist in the medium these reports are actually carried
into. Its diagnosis was the best in the set and is adopted in full (§7); its remedy
was aimed at the one surface that was never at risk.

**The Editorial Dossier** — the same register argued from typography. Not rejected so
much as absorbed: its three best mechanics are load-bearing here (the scale-linked
amber cue in §7, the two-lane contrast gate in §3, the margin tally in §7). Two things
were dropped. `--radius-plate: 0` on every document object is a severity that reads
dated more easily than 2px does. And its print theme collapses `--accent`,
`--uncertain`, `--variance` and `--derived` all to `#000000` — which deletes the
provenance colour system in the medium CLAUDE.md calls the highest-stakes one, and
would render an ASSUMED note and a BINDING note as the same 6px black rail on white.

**Everything the genre supplies by default** — see §9. Those are refusals, not gaps.

---

## 2. TOKENS — the complete diff to `apps/web/src/styles/tokens.css`

### 2.0 Read this first: the light theme had never been measured

> **Status, 31 Aug 2026.** The comment-stripping half of this repair **has since landed
> on disk**. `scripts/contrast.mjs` now reads the stylesheet through
> `.replace(/\/\*[\s\S]*?\*\//g, '')` before any scan, `LIGHT` resolves to the light
> palette (`--text-primary on --surface-raised` prints 18.04, the light value, against
> the dark column's 15.19), and the run is `56 pass, 0 fail` over 28 pairs measured once
> per theme rather than twice against dark. The diagnosis below is kept because it is
> the reason for everything in §3, and because §10 Step 0 was written against the broken
> script and had to be rewritten around the repair — see Step 0.
>
> What has **not** landed: the `PRINT` theme, at-rule location by range, and the
> three-palette self-test. Those are still Step 0.

Before any token below is defended with a number, the instrument that produces the
numbers has to work. As shipped on 30 Aug, it did not.

`withoutAtRules()` finds at-rules with `src.indexOf('@media')`. The **first** `@media`
in `tokens.css` is at **line 138** — inside the comment celebrating the fix to the
*previous* merge bug:

```
     because the checker was merging the `@media print` :root over the light one
                                          ^^^^^^ char 6017, line 138
```

It brace-matches from there, deletes the tail of the light `:root` colour block along
with the dark `@media`, and `blockAt()` then runs past the missing brace and swallows
`:root[data-theme='dark']` into `LIGHT`. Verified by extracting the shipped script's
own bindings:

```
LIGHT['--surface-base']  === '#121215'   (the dark value)
LIGHT['--text-primary']  === '#f0f0ee'   (the dark value)
```

`node scripts/contrast.mjs` printed `56 pass, 0 fail` over 28 pairs measured
**twice against the dark palette**. Every light row in its output was byte-identical to
its dark row. The comment describing the fix is what broke the fix — which is the
exact failure mode the file's own header warns about, one level further in.

Fix in §3.0; its first half is now on disk (see the status note above). Until the rest
lands, print is still ungated, and the `56/56` that predates the repair is vacuous.

Note what the bug did *not* do: all 28 declared pairs pass in light, dark and print
when measured correctly. The failures below are real, they ship today, and every one
of them is in a pair **nobody declared** — a token painted on a ground the checker
never looked at. That is the more interesting failure, and §3 closes it by declaring
the grounds rather than by trusting them.

### 2.1 Changed — light theme

Each of these is a repair. The existing value is not a taste I disagree with; it is a
number that fails on a ground the checker never measured.

| Token | Was | Now | Why the old value was wrong |
|---|---|---|---|
| `--text-tertiary` | `#757581` | `#656571` | Tuned against `--surface-raised` only (4.55) and measured only there. It is a ground **24 times** across the three stylesheets. Measured: `--surface-sunken` **4.06**, `--surface-inset` **3.81**, `--surface-base` **4.39**, `--deferred-surface` **4.13** — four live 1.4.3 failures, and `--surface-sunken` is the ground under GOVERNING CAPACITY, BINDING CONSTRAINT, HEADROOM, LEVELS and LOST TO WHOLE FLOORS, the five labels around the product's hero number. New worst case **4.81** on `--surface-inset`. |
| `--border-control` | `#91918d` | `#838380` | The token's own comment argues it exists separately from `--border-default` "precisely so the exemption stays honest". That only works if it passes on the grounds it is painted on. Measured: sunken **2.82**, inset **2.65**, `--deferred-surface` **2.87** — the dashed `.dropzone` edge that `app.css` calls "the first thing a new user touches", and the dashed `.not-assessed` boundary that is one of two non-colour cues for the deferred state. New worst case **3.18**. |
| `--border-strong` | `#94948e` | `#7a7a72` | Passed at 3.05 on `--surface-raised`, the only ground checked; **2.55** on `--surface-inset`, **2.72** on sunken, **2.95** on base. `--surface-inset` is the non-governing capacity bar's own track — a meter whose entire job is "which of these three is smaller", the canonical 1.4.11 case. Also **promoted**: this is now *the* informative-structure token (§2.6). New worst case **3.62**. |
| `--deferred-hatch` | `#8d8d8a` | `#7f7f7c` | Its comment states it "is held to 1.4.11's 3:1 like any other informative graphic". On `--surface-sunken` it is **2.97** — and that is the ground of the hero drawing's setback hatch, the largest and most-viewed instance of the pattern, captioned *"what the setback rules take away"*. New worst case **3.36** on inset. |
| `--variance-border` | `#d98a84` | `#c0655e` | The largest failure in the shipped palette. §20.3 specifies VARIANCE as "Red border, evidence link" — the border **is** half the specification, and it measures **2.32** on its own surface, **2.65** on a panel. The same token draws the 6px rule on the landing page's fifth claim, NEVER CLAIMED. New worst case **3.49**. |
| `--uncertain` | `#a35c00` | `#854b00` | **The one that matters.** On every light ground the interactive blue out-contrasted the alarm: `--accent` **5.78** against `--uncertain` **5.14** on a panel, and because the ordering of two foregrounds is ground-independent (§7.4) that inversion held on all nine grounds (enumerated in §3.1). On a product whose named failure mode is a user mistaking an assumption for a fact, the loudest colour on the page was a link. New: **6.99**, leading `--accent` by **1.210×** on each of the nine. Also fixes 1.4.3 on `--surface-inset` (was **4.30**). Chroma 133; the darkening is 0.6 of a stop and it stays unmistakably amber. |
| `--uncertain-border` | `#b3843b` | `#a87a32` | 3.04 on its own amber surface against a 3.0 floor. That is not a margin, it is luck — and it is the dotted underline, one of ASSUMED's four non-colour cues. New **3.47**, and now measured on all nine grounds (§3.1); worst case **3.20** on `--surface-inset`. |
| `--uncertain-strong` | `#7a4400` | `#643800` | **The second half of the row above, and leaving it out was a defect.** `--uncertain-strong` and `--uncertain` are spent as TWO RANKS in §7.1 — the strong one on the value text, the other on the drawn pencil — and they measured **1.540×** apart. Darkening `--uncertain` alone collapsed that to **1.132×**: at 13% they are one ink, the rank disappears, and §7.1 is spending a distinction that no longer exists. Both channels of the RGB are scaled by the same 0.816 the other token took (163→133, 92→75; here 122→100, 68→56), which keeps the hue relationship and restores the separation to **1.425×**. Contrast only improves — new worst case **8.34** on `--surface-inset`, up from 6.62 — so this is the opposite of a softening, and it is exactly the two-tier collapse a palette edit hides when only one of a pair is touched. |

Unchanged in light, deliberately: `--uncertain-surface`
`#fdf3e0`, `--accent` `#2b5cd9`, `--derived` `#1f6b45`, every surface, `--text-primary`,
`--text-secondary`. Change what is wrong; nothing else.

**And `--variance` stays `#a8271f`.** An earlier draft of this section lightened it to
`#ad342b` — 7.06 → 6.36 on a panel — for one reason: so that amber would outrank it.
That was wrong twice over. It is a **softening of the token that paints NEVER CLAIMED
and REGULATORY VALIDITY — NOT ASSESSED**, which is the product's central refusal and is
under the same protection as the amber. And §3.3's own scope note forbids the trade by
name: it excludes the provenance peers from the rank assertion precisely because forcing
the rank would be "the same aesthetic-driven softening, arrived at from the other side",
and says the assertion "must not" depend on it. Performing the softening anyway, from
the other side, to win a comparison nothing checks, is the failure that note describes.

The consequence is stated rather than engineered away: **in light and in print,
`--variance` at 7.06 sits marginally above `--uncertain` at 6.99 — a lead of 1.010×.**
In dark, amber leads at 8.99 against 6.89. §7.4(a)'s claim is scoped to chrome
(`--accent`, `--accent-focus`) and never included the peers; §7.4 now says so in the
same words. Two inks 1% apart are not a rank a reader can perceive, and what separates
the two states at page scale is the amber's filled ground and its 6px gutter rail —
neither of which VARIANCE has.

`--variance-border` **is** repaired (above): that is a threshold failure at 2.32 against
a 3.0 floor, not a re-ranking.

### 2.2 Changed — dark theme

| Token | Was | Now | Why |
|---|---|---|---|
| `--surface-raised` | `#1a1a1f` | `#1e1e24` | The dark base→raised lift is **1.08:1**. With shadows that are `rgb(0 0 0 / .45)` on a `#121215` ground — invisible — and a 1.54:1 card edge, `.panel` (27 instances, the container the whole app is made of) has effectively no boundary. New lift **1.13:1**, and it works only because `--border-default` is repaired alongside it. Light is untouched: at 1.04:1 the light card lift never carried anything either, and there the honest fix was always the rule, not the fill. |
| `--surface-inset` | `#232329` | `#2b2b33` | Consequential. At `#232329` against a raised of `#1e1e24` the meter track, the chip and the hovered traced value measure 1.11:1 and disappear into the card. New **1.18:1**. |
| `--border-subtle` | `#2a2a31` | `#33333d` | 1.22:1 on the lifted raised — the interior rules of a schedule simply are not there, and a schedule whose rules vanish is a list. New **1.33:1**. Still decorative, still 1.4.11-exempt, now in the house lane (§3.2). |
| `--border-default` | `#3a3a43` | `#46464f` | 1.54:1. This is the plate edge, and shadow is not permitted to carry hierarchy (§9), so the edge is the entire depth model. New **1.78:1**. |
| `--border-control` | `#66666d` | `#7d7d85` | Fails 1.4.11 on `--surface-inset` (**2.74**), `--deferred-surface` (**2.95**) and `--accent-subtle` (**2.69**). New worst **3.44**. |
| `--border-strong` | `#66666f` | `#86868f` | Same failures (inset **2.75**), plus the promotion in §2.6. New worst **3.89**. |
| `--text-tertiary` | `#81818d` | `#9a9aa6` | Fails 1.4.3 on inset (**4.06**), `--deferred-surface` (**4.36**), `--uncertain-surface` (**4.00**) and `--accent-subtle` (**3.98**) — four grounds, none of them ever measured in either theme. New worst **5.04**. |
| `--deferred-hatch` | `#68686d` | `#818188` | Fails on inset (**2.82**) and `--uncertain-surface` (**2.77**). This is the sole surviving cue for NOT ASSESSED on paper, so it is the token with the highest stakes and, until now, the thinnest measurement. New worst **3.63**. |
| `--variance-border` | `#7d3a36` | `#ad6863` | **1.95:1** on its own surface, **2.09** on a panel. Fails on all nine grounds. New worst **3.81**. |
| `--uncertain-surface` | `#2e2313` | `#33260f` | Chroma 27, against `--accent-subtle`'s **38** — so in dark mode the *binding* tag had a more chromatic ground than an *assumption*. That is a §13.1 defect nobody had a way to see, because chroma was never measured. New chroma **36**. |
| `--accent-subtle` | `#1a2440` | `#1c2230` | The other half of the same fix. Chroma 38 → **20**. |
| `--uncertain-border` | `#8e6927` | `#9c7530` | 3.07 on the new amber ground — the same pass-by-luck as light. New **3.51**. |

Unchanged in dark: `--uncertain` `#f0b45c` (already leads `--accent` by 1.356×),
`--uncertain-strong`, `--variance`, `--derived`, `--accent`, `--surface-base`,
`--surface-sunken`, `--text-primary`, `--text-secondary`.

### 2.3 Print becomes a third measured theme

Print overrides six tokens today; every other token keeps its **screen** value while
sitting on white paper, and `contrast.mjs` iterates `[['light',LIGHT],['dark',DARK]]`
so the medium with the highest stakes is the only one with no gate. Ten raw hex values
live in `@media print` blocks — `app.css:1050`, `landing.css:987–988`,
`provenance.css:255–274` — which is exactly where a token would have been followed by a
checker. `provenance.css:270` hard-codes `#666` for the hatch that is the only thing
carrying NOT ASSESSED on a photocopy, and no checker has ever seen it.

Complete the block. These are all **additions**:

```css
@media print {
  :root {
    --surface-base: #ffffff;      /* existing */
    --surface-raised: #ffffff;    /* existing */
    --surface-sunken: #ffffff;    /* existing */
    --text-primary: #000000;      /* existing */
    --text-secondary: #333333;    /* existing */
    --shadow-sm: none; --shadow-md: none; --shadow-lg: none;  /* existing */

    --surface-inset: #ededed;     /* a 7% tint a laser can dither without banding */
    --text-tertiary: #545460;
    --border-subtle: #c8c8c8;
    --border-default: #a0a0a0;
    --border-control: #595959;
    --border-strong: #4a4a4a;
    --deferred: #333333;
    --deferred-surface: #ffffff;
    --deferred-hatch: #5e5e5e;    /* tokenises provenance.css:270's #666 */
    --surface-contrast: #ffffff;  /* the inverted band inverts back: a full-bleed
                                     black band costs a page of toner and
                                     photocopies to mud */
    --text-on-contrast: #000000;
    --text-on-contrast-dim: #333333;
    --border-on-contrast: #595959;

    /* Every state SURFACE goes white. Not an amber exception — a uniform rule.
       A cream fill dithers to a grey smudge, and the ASSUMED treatment already
       drops its ground on paper and carries on the other four channels (§7.3). */
    --uncertain-surface: #ffffff;
    --variance-surface: #ffffff;
    --derived-surface: #ffffff;
    --accent-subtle: #ffffff;
  }
}
```

**`--accent`, `--uncertain`, `--uncertain-strong`, `--uncertain-border`, `--variance`,
`--variance-border` and `--derived` are deliberately NOT overridden in print.** The
Dossier's instinct — collapse them all to `#000000` — would make an ASSUMED note and a
BINDING note the same 6px black rail on white, deleting the provenance system in the
medium that matters most. Keeping the inks chromatic means the ordering invariant of
§7.4 holds in all three themes rather than being suspended for the printed page.

**And the shipped sheet already does the thing this paragraph rejects.** That is the
part an earlier draft of this section missed, and it makes the whole print argument
unsound until it is fixed:

| where | what it does today |
|---|---|
| `provenance.css:255` | `.traced--assumed { text-decoration-color: #000 }` — the ASSUMED underline is **black on paper**, not `--uncertain-border` |
| `provenance.css:259` | `.traced--assumed .value { color: #000 }` — the amber value text is black |
| `provenance.css:263` | `.traced--variance { border-color: #000 }` — the VARIANCE frame is black |
| `provenance.css:270` | `.not-assessed` hatch hard-codes `#666`, border `#000`, colour `#000` |
| `app.css:1050` | `.panel { border: 1px solid #000 }` |
| `landing.css:987–989` | `.lp-status-band` `#ffffff` / `#000000` / `#333333` |

Twelve raw hex values, all inside `@media print`, all winning the cascade over any token
this section adds. So §7.3's claim that the dotted underline carries the treatment "in
`--uncertain-border` (3.82 on white)" is **false as the code stands**, and the four print
tokens above would be duplicated by the literals rather than replacing them. Adding
tokens without deleting the literals is worse than either: it produces a checker that
measures a palette the page does not use, which is exactly §2.0's failure in a new place.

**§10 Step 1b removes all twelve.** Every one has an exact token replacement in the block
above and none of them changes a rendered colour except the three that this section is
deliberately correcting (`--uncertain-border` 3.82, `--uncertain-strong` 9.96 and
`--variance-border` 3.99 on white, in place of black). `landing.css:987–989` is deleted
outright rather than tokenised: `--surface-contrast`, `--text-on-contrast` and
`--text-on-contrast-dim` already invert to `#ffffff` / `#000000` / `#333333` in the block
above, so the band's print rule becomes a token fact instead of a second copy of it.

### 2.4 Added — spacing, rhythm and the page

```css
:root {
  /* The scale said "Nothing between these steps", and then seven rules invented
     `gap: 2px` or `3px` for the tight label/value pairs in .field--compact,
     .kv > div, .choice > span, .comparison__side, .plot-legend, .sensitivity and
     .prov-branch__row. That is not seven mistakes; it is one missing token. */
  --space-hair: 0.125rem;  /* 2px */

  /* The scale stopped at 64px, so a major/minor section distinction was not
     merely unchosen — it was unwritable. app.css uses --space-7 ZERO times and
     --space-6 twice in 1,052 lines, which is why every engine screen reads as
     one continuous 16px-spaced list from header to footer while the landing
     page reads as designed. */
  --space-9: 6rem;   /*  96px */
  --space-10: 8rem;  /* 128px */

  /* Section rhythm, named semantically so a screen asks for "the gap that opens
     a section" instead of picking a number. Applied ASYMMETRICALLY (§5.1).
     Both ends of every clamp are scale steps, not literals — otherwise adding
     --space-9 and --space-10 above would have bought two tokens that nothing
     consumes while every rhythm rule kept its own `8rem`. */
  --rhythm-major: clamp(var(--space-7), 8vw, var(--space-10));  /*  48 → 128px */
  --rhythm-minor: clamp(var(--space-6), 6vw, var(--space-9));   /*  32 →  96px */
  --rhythm-block: clamp(var(--space-5), 3vw, var(--space-7));   /*  24 →  48px */

  /* Stacking. Two hand-picked literals (20 and 40) and no scale today. A pattern
     that references an UNDEFINED custom property is worse than a literal, because
     the declaration becomes invalid at computed-value time and the element
     silently loses its stacking — so the scale is declared here, in the token
     file, and not described in a sentence somewhere in §6. */
  --z-raised: 1;
  --z-sticky: 20;
  --z-overlay: 40;

  /* ONE page column. --content-max was 76rem for the app and a local --lp-max
     was 78rem for the landing, so crossing from the site into the engine shifted
     and re-measured the column by 32px for a reason no reader can name. */
  --page-max: 78rem;
  --page-gutter: clamp(1rem, 4vw, 3rem);

  /* The shared rail. There are six independent grid declarations today with no
     common column edge — auto-fit 23rem, 4.5rem+1fr, 17rem+1fr, 4.5rem+1fr,
     auto-fit 24rem, auto-fit 15rem — so nothing lines up down the page. One
     rail, and the section index, the numbered limit, the claim title, the
     table's rank column and the margin tally all begin on one invisible
     vertical the eye reads even though nothing draws it. This is the mechanic
     that most reads as "drawn" per unit of effort, because it is subtractive. */
  --rail: 4.5rem;
  --label-col: 9rem;   /* the re-emitted header column in a stacked schedule */
}
```

### 2.5 Added — sizing, because there is currently no sizing scale at all

Every width, height and control height in the product is a literal. Control height is
`2.5rem` in three rules, `2rem` in one, `3rem` in one and `44px` in two. The horizontal
meter — one conceptual object — exists at four heights (6/4/10/8px), four radii
(3/2/2/4px, only one of which coincides with a token and that by accident), two
different fill mechanisms and four fill colours.

```css
:root {
  --control-h-sm: 2rem;     /* 32px */
  --control-h: 2.5rem;      /* 40px */
  --control-h-lg: 3rem;     /* 48px */
  /* Named separately from --control-h because it is a WCAG 2.5.8 FLOOR, not a
     visual size. A 32px icon button keeps its visual size and gets its 44px hit
     area from min-block-size plus a minimum gap — never from an absolutely
     positioned overlay, which on a 4px gap steals its neighbour's target. */
  --tap-min: 2.75rem;       /* 44px */
  --tap-gap-min: 0.5rem;    /* 8px — the minimum gap between two tap targets */

  --meter-h: 0.5rem;        /*  8px */
  --meter-h-lg: 0.75rem;    /* 12px */

  /* The status rail is the most repeated device in the product: NINE components
     at SIX widths (1, 2, 3, 4, 6px), with the four state colours re-declared per
     component and two different corner treatments, so the same device reads as
     two shapes on two screens. Two widths, and the asymmetry is the design.

     THE EMPHASIS WIDTH IS SPENT ON ASSUMED, AND ON NOTHING ELSE. Not on BINDING,
     not on VARIANCE, not on the landing page's 2px `.lp-verdict` stripe. This is
     load-bearing rather than tidy: §7.4(c) rests the greyscale and photocopy
     argument on "a column of 6px marks reads as a POSITION, not a hue" — and
     position stops identifying ASSUMED the moment a second state shares the
     width. Amber and the accent separate by only 1.21x in light and 1.36x in
     dark (computed: Y 0.1002 against 0.1318 light, 0.5194 against 0.3700 dark),
     which on a photocopy is two mid-greys. Share the width and channel 5 — the
     one channel §7.4 calls robust against the failure the other two cannot
     cover — collapses back to colour alone. `pnpm contrast` cannot see that;
     only this rule can. */
  --rail-w: 3px;
  --rail-w-emphasis: 6px;   /* ASSUMED only. See [data-state] in §6.2. */
  /* WHAT THE RESERVATION COSTS, enumerated so it is not discovered at Step 5.
     Six literal widths ship today: 1, 2, 3, 4 and 6px. Four rules lose one:
       landing.css:394  .lp-band.is-binding        6px -> 3px  (gains the
                        --accent-subtle ground and a 25px figure, §4.1)
       landing.css:657  .lp-claim--never           6px -> 3px  (gains a 2px FRAME
                        on all four sides in --variance-border, §7.2 — which is
                        more edge at page scale, not less, and is what §20.3
                        actually specifies)
       landing.css:500  a --border-strong pull-out 2px -> 3px
       landing.css:518  .lp-verdict                2px -> 3px  (and loses its
                        amber entirely, §6.2)
       app.css:530      .banner                    4px -> 3px
       app.css:653      .band--governing           4px -> 3px
     The one documented exception is .margin-tally--none (§7.1): the ZERO state
     of the tally keeps the 6px, in --border-strong, because it is the same device
     saying "nothing is assumed here" and an absence only reads if it occupies the
     same column at the same width. It is not a state; it is the statement that
     there is no state. */

  --glyph: 0.875em;         /* the optical box for the drawn mark set (§7.5) */
  --glyph-stroke: 1.5;
  --tick: 0.5rem;           /* 8px — the datum tick at the rail edge */
  --tick-lg: 0.75rem;       /* 12px */
}
```

### 2.6 Changed — radius, elevation, focus

```css
:root {
  /* Re-pitched DOWN from 3/6/10. A large radius reads "app"; a small one reads
     "drawn", and this artefact is a drawing. The names are unchanged, so this
     is a value edit and not a 38-site rename. It absorbs the twelve radius
     literals: the meter family's 2/3/4px and the `999px` written twice for what
     is visually one pill. */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-pill: 999px;   /* the system's ONE documented exception, named the way
                             Carbon names its 24px tag — so it is a decision and
                             not a magic number written twice. Consumers: `.chip`
                             (§6.5, today app.css:473) and `.lp-tag`
                             (landing.css:431). */
  --radius-round: 50%;    /* replaces six `50%` literals. Two survive this pass —
                             `.stepper__num` (app.css:217) and `.edge-list__num`
                             (app.css:790). `.lp-eyebrow__dot` (landing.css:167)
                             is deleted by §9 and the three `.lp-status__glyph`
                             rules are replaced by the drawn marks in §7.5. */
  /* Depth. --shadow-lg was declared in three theme blocks and referenced ZERO
     times; --shadow-sm and --shadow-md had two uses each across 2,876 lines. All
     three resolve to `none` in print, which is the governing fact: any hierarchy
     carried by a shadow is hierarchy the printed report never receives, and the
     report is the artefact that goes into the room. So depth comes from the
     surface ladder plus the 2px ink cap on a plate (§6.5), both of which survive
     paper. Every rung of the ladder is doubled by a border or a ground; nothing
     is ever carried by elevation alone.

     --shadow-lg keeps its declaration and its zero references: it is what a
     derivation popover or a modal would use, and §9 refuses both, so neither is
     designed here. NO ALIAS IS ADDED FOR IT. An earlier draft added
     `--shadow-overlay: var(--shadow-lg)`, which is a token with no consumer,
     named after a component that does not exist. §9's sentence now says
     --shadow-lg. */

  /* --edge-lift is NOT ADDED, and the reason is the one that deleted --focus-ring
     four lines down. It was to be `inset 0 1px 0 rgb(255 255 255 / 0.06)` — a 1px
     inner top highlight for a raised object in dark, where a black shadow is
     invisible. It is a good effect and it is UNMEASURABLE BY CONSTRUCTION: the
     value is not a hex, so contrast.mjs's `rgb()` returns null, and this repo
     counts unresolvable as a failure rather than a skip. Composited over the new
     dark --surface-raised it would land near #2b2b31, which is a 1.10:1 lift the
     checker would never see. Deleting --focus-ring for exactly this reason and
     then adding --edge-lift in the same section is the inconsistency that makes a
     rule stop being a rule. The dark plate has an edge without it: --border-default
     is repaired to 1.78:1 in §2.2 and the 2px ink cap is measured at 4.60. */

  /* --focus-ring is DELETED — and the deletion is SEQUENCED, because it has three
     live consumers (app.css:44, the GLOBAL :focus-visible; app.css:920
     `.dropzone__label:focus-within`; provenance.css:72) and deleting the token
     without replacing them first makes all three declarations invalid at
     computed-value time: box-shadow unset, no ring, no focus indication, on every
     focusable element in the product. That is a 2.4.7 and 2.4.11 regression that
     none of typecheck, test, shots or smoke can see. §6.0 supplies the global
     replacement; §10 Step 3 lands the replacement and the deletion in ONE commit
     and gates it on a keyboard pass and a grep.

     Why an outline at all: --focus-ring hard-coded --surface-base as its inner
     halo, so on a raised, sunken, inset or amber ground it painted the wrong
     colour behind the ring — and it was structurally unmeasurable as a pair. An
     outline with an offset composites correctly over any ground and needs no
     knowledge of what it sits on, so --accent-focus can be measured as a single
     foreground against each of the nine grounds (§3.1). */
  --focus-width: 2px;
  --focus-offset: 2px;
}
```

**The border tokens are split by job, not by weight, and keep their names.** This is
the load-bearing structural decision in the palette, and renaming them was rejected as
53 edits of pure churn for no additional guarantee:

- `--border-subtle`, `--border-default` — **decorative only.** Panel edges, table body
  rules, the drafting graticule. Permanently exempt from 1.4.11, permanently in the
  house lane (§3.2), and **no information may ever be read off them.** Today this
  exemption is claimed dishonestly: the 3px left stripe on `.claim`, `.stat`,
  `.lp-band` and `.lp-claim` is `--border-default` in its neutral case and becomes
  `--uncertain` / `--variance` / `--derived` to signal state. A stripe that is
  informative when coloured is informative when neutral — "no state" is information.
- `--border-control` — **control boundaries.** 1.4.11, 3:1, on every ground.
- `--border-strong` — **informative structure.** Promoted. The datum rule, the rail
  gutter tick, the 2px plate cap, the meter's neutral fill and its datum tick, the
  table header rule and `tfoot` terminator, the eyebrow hairline, the **neutral case
  of the status rail**. 1.4.11, 3:1, on every ground.

The exemption on the first pair is only honest because the third exists and is
measured on nine grounds in three themes. Which is also why **the temptation this
language is most exposed to must be refused by name**: now that structure carries
hierarchy, it is tempting to raise every hairline to 3:1. That would turn every plate
into a wireframe, and `tokens.css:124–127` already argues it correctly. Split by job.
Move the texture; do not weaken it.

### 2.7 Added — type and motion tokens

Full type scale in §4. Motion tokens:

```css
:root {
  --duration-instant: 80ms;   /* existing — a value's hover ring */
  --duration-fast: 140ms;     /* existing — a control's border and background */
  --duration-base: 200ms;     /* NEW — plate hover, nav elevation */
  --duration-reveal: 420ms;   /* NEW — the hero copy settle and the drawing build */

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);        /* existing — entrances */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);    /* NEW — state changes */

  /* The ONLY distance anything in this product ever travels. Naming it as a
     single token is what stops a future contributor writing a 40px slide. */
  --motion-rise: 0.75rem;   /* 12px */
  --stagger-step: 60ms;
}
```

**Two motion tokens were proposed and are NOT added.** `--ease-in` was to be the exit
curve, on the argument that "one curve served both, which is why nothing ever felt like
it was leaving". Nothing in this language leaves: §9 refuses the modal, the toast, the
hamburger menu and the derivation popover, which are the four components that have an
exit. A curve with no consumer is decoration in a token file, and this document deletes
those wherever it finds them.

`--duration-slow` is left at its existing 240ms rather than re-pitched to 320ms "and
finally used" — the use named was the derivation inspector, which §6 never specifies. It
has **zero** consumers in the stylesheets today and zero here; §10 Step 3 deletes it
rather than giving it a purpose it does not have.

`--duration-reveal` and `--stagger-step` do have consumers, and §8 names them: the hero
copy settle (`lp-rise`, 460ms today) and the drawing build (`lp-draw`, 900ms). The scroll
reveal is **not** one of them — `lp-settle` runs on `animation-timeline: view()`, where
progress comes from the range and `animation-duration` is ignored. §8's table said
otherwise and is corrected there.

### 2.8 The font request

`apps/web/index.html` currently asks for `IBM+Plex+Sans:wght@400;500;600;700`.

```
IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400;1,500
IBM+Plex+Mono:wght@400;500;600
```

Three defects, one line. (1) Weight **700** is downloaded on every cold load and set
by no rule in 2,876 lines of CSS. Dropped. (2) There is no `ital` axis, so all
**seven** `font-style: italic` rules render as browser-synthesised obliques — wrong
sidebearings, wrong terminals, wrong stroke modulation. One of them is
`provenance.css:197 .not-assessed`, which means a rendering artefact is sitting inside
a §20.3 provenance treatment. (3) Weight **300** is added: Plex's characteristic
display move is Light at 42px and above, and the 61px headline is currently set at 600
— the convention Carbon and Stripe both explicitly reject. Here it does double duty,
because lowering the page's total ink weight raises amber's relative loudness. Net:
−1 face, +3 faces. The weight is declared as a token rather than described in this
sentence — a rule in §6 that references an undefined custom property becomes invalid at
computed-value time and the heading silently falls back to inherited weight:

```css
:root {
  --weight-light: 300;      /* NEW. --text-3xl and above ONLY: .hero h1,
                               .hero__lede, .section__head h2. Never below. */
  --weight-normal: 400;     /* existing */
  --weight-medium: 500;     /* existing */
  --weight-semibold: 600;   /* existing */
}
```

---

## 3. CONTRAST — the exact changes to `scripts/contrast.mjs`

### 3.0 First, make the instrument work

**Half of this has landed.** `scripts/contrast.mjs` on disk now strips comments before
any scan and merges every top-level `:root`, so `LIGHT` resolves to the light palette
(verified: `--text-primary on --surface-raised` prints 18.04 light against 15.19 dark)
and the run is `56 pass, 0 fail` over 28 pairs. The block below is written as the whole
repair because it is the record of why the file is shaped this way; what is still
**outstanding** is the last three paragraphs of it — at-rule location by RANGE rather
than by truncation, the `PRINT` palette, and the three-palette self-test.

```js
/**
 * Strip comments BEFORE looking for at-rules.
 *
 * `withoutAtRules` string-searched for '@media', and the first occurrence in
 * tokens.css was inside the comment at line 138 — the one describing the fix to
 * the previous merge bug. It brace-matched from mid-comment, truncated the light
 * `:root`, and `blockAt` then swallowed `:root[data-theme='dark']` into LIGHT. The
 * script reported "56 pass" over 28 pairs measured twice against the dark palette,
 * and the light theme was never resolved at all.
 *
 * A checker reporting 0 failures over a palette it never read is the vacuous pass
 * this codebase refuses everywhere else — and this is the second time this exact
 * class of bug has shipped in this file. Hence the belt-and-braces below: comments
 * are removed first, and at-rules are located by RANGE so a `:root` can be tested
 * for containment rather than screened by truncation.
 */
const SRC = readFileSync(TOKENS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

function atRuleRanges(src) {
  const out = [];
  for (const m of src.matchAll(/@media[^{]*\{/g)) {
    let depth = 0, j = src.indexOf('{', m.index);
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) break;
    }
    out.push([m.index, j]);
  }
  return out;
}
const AT = atRuleRanges(SRC);
const insideAtRule = (i) => AT.some(([a, b]) => i > a && i < b);

// LIGHT: every top-level `:root` that is not inside an at-rule.
const LIGHT = {};
for (const m of SRC.matchAll(/:root\s*\{/g)) {
  if (!insideAtRule(m.index)) Object.assign(LIGHT, blockAt(m.index, SRC));
}
// DARK: the explicit selector, not the media query — it is the one a `data-theme`
// toggle actually applies, and the two are kept identical by `pnpm test`.
const DARK = { ...LIGHT, ...blockAt(/:root\[data-theme=['"]dark['"]\]\s*\{/.exec(SRC).index, SRC) };
// PRINT: a third theme. CLAUDE.md says these reports are printed and taken into
// rooms, which makes it the medium with the highest stakes and, until now, the
// only one with no gate.
const printRange = AT.find(([a]) => /@media\s+print/.test(SRC.slice(a, a + 20)));
const PRINT = { ...LIGHT, ...blockAt(SRC.indexOf(':root', printRange[0]), SRC) };

const THEMES = [['light', LIGHT], ['dark', DARK], ['print', PRINT]];
```

**Self-test, and it is not optional.** The bug above was invisible because nothing
asserted that the three palettes differ. Add:

```js
// A parser that silently returns the same palette twice is worse than no parser.
for (const [a, b] of [['light', 'dark'], ['light', 'print'], ['dark', 'print']]) {
  const A = THEMES.find(t => t[0] === a)[1], B = THEMES.find(t => t[0] === b)[1];
  if (A['--surface-base'] === B['--surface-base'] && A['--text-primary'] === B['--text-primary']) {
    throw new Error(`${a} and ${b} resolved to the same palette — the extractor is broken.`);
  }
}
```

### 3.1 `PAIRS` — the WCAG lane, over grounds that are enumerated

**135 pairs × 3 themes = 405 rows. Every one computed; all pass.** The tightest is
`--deferred on --surface-sunken` in light at **4.77 against 4.5 — 6.03% headroom.** The
old list was 28 pairs over roughly 64 grounds the CSS actually paints.

The rule that produces this list: **a token is measured on every ground it can be
painted on, not on the ground it was designed against.**

An earlier draft stated that rule and then declared a subset. §2.2 personally names four
dark grounds where `--text-tertiary` fails, three where `--border-control` fails, two
where `--deferred-hatch` fails and "all nine" where `--variance-border` fails — and the
list that followed carried some of those grounds and not others, while the phrase "nine
grounds" was used four times without ever being enumerated. A hand-assembled list cannot
discharge a rule about completeness, and a claim measured over a set nobody can see is
the same defect as a palette the checker never read.

**So the nine grounds are enumerated once, in code, and the pairs are generated from
them.** A foreground measured on fewer than nine has to name the subset and the reason,
on the same line, where a reviewer reads it.

```js
/**
 * THE NINE GROUNDS. Every surface anything in this language is painted ON.
 * This array is the definition of the phrase "nine grounds" wherever it appears
 * in the design language; there is no second list, and no prose count.
 *
 * --surface-contrast is deliberately NOT here — see the note below the tables.
 * --accent and --accent-hover are not here either: they are FILLS under a label,
 * not page grounds, and their one pair each is pushed explicitly.
 */
const GROUNDS = [
  '--surface-raised', '--surface-base', '--surface-sunken', '--surface-inset',
  '--uncertain-surface', '--accent-subtle', '--variance-surface',
  '--derived-surface', '--deferred-surface',
];

/**
 * [foreground, floor, note, grounds?]
 *
 * `grounds` defaults to all nine. Passing a subset is permitted ONLY with the
 * reason in the note, and the excluded pairs are printed by the runner under
 * "recorded exclusions" with their measured ratios — an omission a reader cannot
 * see is how §2.0 happened.
 */
const INKS = [
  // --- Text. --surface-sunken was a ground 24 times and appeared in zero
  // measured pairs; it is the ground of `.governing`.
  ['--text-primary',   4.5, 'body text'],
  ['--text-secondary', 4.5, 'prose, help text, chip labels'],
  ['--text-tertiary',  4.5, 'column headers, eyebrows, the labels around the answer'],

  // --- The one blue. Interactive affordance and nothing else (§9). Declared at
  // 4.5 and not 3.0: --accent is also the DERIVED citation superscript, which is
  // 0.7em TEXT. The old list called it a graphic, so a palette nudge holding it
  // above 3.0 would have passed the gate while breaking a numeral.
  ['--accent',       4.5, 'links, the binds tag, the citation superscript'],
  ['--accent-focus', 3.0, 'the focus outline — a graphic, 1.4.11 and 2.4.11'],

  // --- ASSUMED. The product's whole trust proposition. See §7.
  ['--uncertain',        4.5, 'the drawn pencil, the rail, the meter fill'],
  ['--uncertain-strong', 4.5, 'ASSUMED value text and the margin tally'],
  ['--uncertain-border', 3.0, 'the dotted underline and the hover ring'],

  // --- The other three provenance states.
  ['--derived',         4.5, 'DERIVED value text and chip'],
  ['--variance',        4.5, 'NEVER CLAIMED text, the rail, the masthead validity strip'],
  ['--variance-border', 3.0, 'the VARIANCE frame — §20.3 is "red BORDER", so this is half the spec'],
  // NOT ASSESSED text brings its own ground: a deferred component always sets
  // --state-surface: var(--deferred-surface) (§6.2), so it is never painted on an
  // inset or on the amber ground. Both excluded pairs are under 4.5 and both are
  // printed by the runner rather than quietly dropped — see EXCLUDED below.
  ['--deferred', 4.5, 'not-assessed text; brings its own ground',
    ['--surface-raised', '--surface-base', '--surface-sunken', '--deferred-surface']],
  ['--deferred-hatch', 3.0, 'the hatch — the sole surviving cue on a photocopy'],

  // --- Boundaries (§2.6).
  ['--border-control', 3.0, 'input, button, radio card, the dashed dropzone and .not-assessed edges'],
  ['--border-strong',  3.0, 'the datum rule, the plate cap, the meter, the neutral rail, the header rule'],
];

const PAIRS = INKS.flatMap(([fg, floor, note, grounds = GROUNDS]) =>
  grounds.map((bg) => [fg, bg, floor, note]));

// Grounds that are not page surfaces: two fills under a label, and the one
// inverted band. Pushed explicitly so GROUNDS stays the list of SURFACES.
PAIRS.push(
  ['--text-inverse', '--accent',       4.5, 'primary button label'],
  ['--text-inverse', '--accent-hover', 4.5, 'primary button label under the pointer'],
  ['--text-on-contrast',     '--surface-contrast', 4.5, 'text on the band'],
  ['--text-on-contrast-dim', '--surface-contrast', 4.5, 'body text on the band'],
  ['--border-on-contrast',   '--surface-contrast', 3.0, 'control edge on the band'],
);

/**
 * RECORDED EXCLUSIONS. Printed on every run, in their own block, so a pair that
 * is out of the lane is visible rather than absent.
 *
 * Both are --deferred on a ground it is not painted on, and both would FAIL:
 *   --deferred on --surface-inset        4.48 light / 4.11 dark
 *   --deferred on --uncertain-surface    4.86 light / 4.32 dark
 * If a future pattern ever puts NOT ASSESSED text on an inset or inside an
 * assumed block, --deferred has to move BEFORE that pattern lands.
 */
const EXCLUDED = [
  ['--deferred', '--surface-inset',     4.5, 'NOT ASSESSED text never sits on an inset'],
  ['--deferred', '--uncertain-surface', 4.5, 'NOT ASSESSED text never sits on the amber ground'],
];
```

Every row, in every theme. `--text-inverse` on `--accent` measures 5.78 / 7.48 / 5.78 and
on `--accent-hover` **8.12 / 9.63 / 8.12**; the three band rows measure 16.39 / 17.54 /
21.00, 8.96 / 8.49 / 12.63 and 3.58 / 3.51 / 7.00.

**light**

| foreground | floor | raised | base | sunken | inset | amber | accent-sub | var-sur | der-sur | def-sur |
|---|---|---|---|---|---|---|---|---|---|---|
| `--text-primary` | 4.5 | 18.04 | 17.43 | 16.10 | 15.11 | 16.39 | 15.79 | 15.79 | 16.12 | 16.39 |
| `--text-secondary` | 4.5 | 7.37 | 7.11 | 6.57 | 6.17 | 6.69 | 6.45 | 6.45 | 6.58 | 6.69 |
| `--text-tertiary` | 4.5 | 5.75 | 5.55 | 5.13 | 4.81 | 5.22 | 5.03 | 5.03 | 5.14 | 5.22 |
| `--accent` | 4.5 | 5.78 | 5.58 | 5.15 | 4.84 | 5.25 | 5.06 | 5.05 | 5.16 | 5.25 |
| `--accent-focus` | 3.0 | 5.78 | 5.58 | 5.15 | 4.84 | 5.25 | 5.06 | 5.05 | 5.16 | 5.25 |
| `--uncertain` | 4.5 | 6.99 | 6.75 | 6.24 | 5.85 | 6.35 | 6.12 | 6.12 | 6.25 | 6.35 |
| `--uncertain-strong` | 4.5 | 9.96 | 9.62 | 8.89 | 8.34 | 9.05 | 8.72 | 8.72 | 8.90 | 9.05 |
| `--uncertain-border` | 3.0 | 3.82 | 3.69 | 3.41 | **3.20** | 3.47 | 3.35 | 3.34 | 3.41 | 3.47 |
| `--derived` | 4.5 | 6.47 | 6.25 | 5.77 | 5.41 | 5.87 | 5.66 | 5.66 | 5.78 | 5.87 |
| `--variance` | 4.5 | 7.06 | 6.82 | 6.30 | 5.91 | 6.41 | 6.18 | 6.18 | 6.31 | 6.41 |
| `--variance-border` | 3.0 | 3.99 | 3.85 | 3.56 | 3.34 | 3.62 | 3.49 | 3.49 | 3.56 | 3.62 |
| `--deferred` | 4.5 | 5.35 | 5.17 | **4.77** | — | — | — | — | — | 4.86 |
| `--deferred-hatch` | 3.0 | 4.02 | 3.88 | 3.58 | 3.36 | 3.65 | 3.52 | 3.51 | 3.59 | 3.65 |
| `--border-control` | 3.0 | 3.80 | 3.67 | 3.39 | **3.18** | 3.45 | 3.33 | 3.33 | 3.40 | 3.45 |
| `--border-strong` | 3.0 | 4.33 | 4.18 | 3.86 | 3.62 | 3.93 | 3.79 | 3.79 | 3.86 | 3.93 |

**dark**

| foreground | floor | raised | base | sunken | inset | amber | accent-sub | var-sur | der-sur | def-sur |
|---|---|---|---|---|---|---|---|---|---|---|
| `--text-primary` | 4.5 | 14.53 | 16.39 | 17.01 | 12.30 | 12.92 | 13.93 | 14.21 | 13.89 | 14.71 |
| `--text-secondary` | 4.5 | 7.03 | 7.93 | 8.23 | 5.95 | 6.25 | 6.74 | 6.88 | 6.73 | 7.12 |
| `--text-tertiary` | 4.5 | 5.96 | 6.72 | 6.97 | 5.04 | 5.30 | 5.71 | 5.83 | 5.70 | 6.03 |
| `--accent` | 4.5 | 6.63 | 7.48 | 7.76 | 5.61 | 5.89 | 6.36 | 6.49 | 6.34 | 6.71 |
| `--accent-focus` | 3.0 | 6.63 | 7.48 | 7.76 | 5.61 | 5.89 | 6.36 | 6.49 | 6.34 | 6.71 |
| `--uncertain` | 4.5 | 8.99 | 10.14 | 10.52 | 7.61 | 7.99 | 8.62 | 8.80 | 8.60 | 9.10 |
| `--uncertain-strong` | 4.5 | 11.56 | 13.04 | 13.53 | 9.79 | 10.28 | 11.08 | 11.31 | 11.05 | 11.70 |
| `--uncertain-border` | 3.0 | 3.95 | 4.45 | 4.62 | **3.34** | 3.51 | 3.79 | 3.86 | 3.77 | 4.00 |
| `--derived` | 4.5 | 7.80 | 8.80 | 9.13 | 6.61 | 6.94 | 7.48 | 7.63 | 7.46 | 7.90 |
| `--variance` | 4.5 | 6.89 | 7.77 | 8.07 | 5.84 | 6.13 | 6.61 | 6.74 | 6.59 | 6.98 |
| `--variance-border` | 3.0 | 3.90 | 4.40 | 4.56 | **3.30** | 3.46 | 3.74 | 3.81 | 3.73 | 3.95 |
| `--deferred` | 4.5 | **4.86** | 5.48 | 5.68 | — | — | — | — | — | 4.92 |
| `--deferred-hatch` | 3.0 | 4.29 | 4.83 | 5.02 | 3.63 | 3.81 | 4.11 | 4.19 | 4.10 | 4.34 |
| `--border-control` | 3.0 | 4.06 | 4.58 | 4.75 | 3.44 | 3.61 | 3.89 | 3.97 | 3.88 | 4.11 |
| `--border-strong` | 3.0 | 4.60 | 5.18 | 5.38 | 3.89 | 4.08 | 4.41 | 4.50 | 4.39 | 4.65 |

**print** — every state surface is white (§2.3), so eight of the nine columns collapse
onto one ground and only the 7% inset tint differs.

| foreground | floor | white (8 grounds) | inset |
|---|---|---|---|
| `--text-primary` | 4.5 | 21.00 | 17.94 |
| `--text-secondary` | 4.5 | 12.63 | 10.79 |
| `--text-tertiary` | 4.5 | 7.46 | 6.37 |
| `--accent` | 4.5 | 5.78 | 4.93 |
| `--accent-focus` | 3.0 | 5.78 | 4.93 |
| `--uncertain` | 4.5 | 6.99 | 5.97 |
| `--uncertain-strong` | 4.5 | 9.96 | 8.51 |
| `--uncertain-border` | 3.0 | 3.82 | **3.26** |
| `--derived` | 4.5 | 6.47 | 5.52 |
| `--variance` | 4.5 | 7.06 | 6.03 |
| `--variance-border` | 3.0 | 3.99 | 3.41 |
| `--deferred` | 4.5 | 12.63 | — |
| `--deferred-hatch` | 3.0 | 6.48 | 5.54 |
| `--border-control` | 3.0 | 7.00 | 5.98 |
| `--border-strong` | 3.0 | 8.86 | 7.57 |

**The three tightest rows, stated rather than left to be found.** All three are on
`--surface-inset` or `--surface-sunken`, the two grounds the old 28-pair list never
measured anything against:

| pair | measured | floor | headroom |
|---|---|---|---|
| `--deferred on --surface-sunken` (light) | 4.771 | 4.5 | **6.03%** |
| `--border-control on --surface-inset` (light) | 3.183 | 3.0 | **6.10%** |
| `--uncertain-border on --surface-inset` (light) | 3.200 | 3.0 | **6.65%** |

The amber row is declared because §7.1 lets an assumed value sit inside an inset chip,
and because a pair that is only nearly measured is the shape of the failure §2.0
describes. None of the three has enough headroom to survive a casual palette nudge, which
is the argument for measuring them rather than for widening them: a token moved to buy
margin here is a token moved for a reason nobody wrote down.

**`--surface-contrast` is the tenth surface, and it is excluded by name.** Not silently:
the numbers are the reason it has to be, and hiding them would be the exact failure this
section exists to close. On the inverted band in **light**, `--uncertain` measures
**2.58** and `--accent` measures **3.12** — the amber loses, so an unqualified
"amber outranks chrome on every ground" is false there. (In dark it is 10.85 against
8.00; in print the band inverts to white.)

The exclusion is safe because it is **enforced, not assumed.** `.lp-status-band`
overrides every ink on it to the band's own three tokens — `--text-on-contrast`,
`--text-on-contrast-dim`, `--border-on-contrast` — including its buttons
(landing.css:732). `assertAmberExclusive` (§3.3) restricts every `var(--uncertain*)`
declaration to five whitelisted selectors, none of which is the band, so the amber
half is checked by the build; `assertNoChromeOnBand` does the same for `var(--accent)` and
`var(--accent-focus)`. If either ever appears on the band the build fails, before the
rank claim can become false in a shipped page.

### 3.2 `HOUSE_PAIRS` — a second lane, in three themes, with a guard

`--border-subtle` and `--border-default` are 1.4.11-exempt decorative separators, so
they are absent from `PAIRS` and defended in prose. But "absent" is weaker than
"recorded": a token that is measured and declared cannot be silently weakened, and a
plate whose edge disappears in dark is a real defect that no WCAG threshold describes.

A **house** minimum is a design contract, never a conformance claim. It is printed in
its own table, under its own heading, and the word `pass` never appears next to it —
the verdict word is `held`.

**And it runs in all three themes.** An earlier draft ran house rows "in light and dark
only" and, three lines later, quoted a *print* ratio for one of them — `--border-default`
prints at 2.61 — which is a number produced by a lane that was told not to run. Print is
where these two tokens matter most: §2.3 gives them new values (`#a0a0a0` and `#c8c8c8`)
that exist in no other theme, so the theme in which they are new was the one theme
measuring nothing. The floors are per-theme, because a ladder rung that collapses on
paper by design is not the same thing as a rung that has quietly gone flat.

The obvious objection is that a second lane is a place to park failures. Closed
structurally:

```js
/**
 * House rows record a design contract — "a plate must have a visible edge" — and are
 * NEVER a WCAG claim. The guard below is what keeps this from becoming a lane where a
 * failing token can be parked: a FOREGROUND token is either informative (and lives in
 * PAIRS) or decorative (and lives here). It can never be both, so no pair can be
 * demoted out of the WCAG lane to make the build green.
 *
 * Floors are [light, dark, print]. `null` means the pair DOES NOT EXIST in that theme,
 * and every null carries `dischargedBy` — the row that does the same job there. A null
 * with no discharge is rejected by the runner: "not applicable" is a claim, and this
 * repo makes claims checkable.
 */
const HOUSE_PAIRS = [
  ['--border-subtle',  '--surface-raised', [1.25, 1.25, 1.50], 'interior rule inside a plate'],
  //                                        1.30 / 1.33 / 1.67
  ['--border-subtle',  '--surface-base',   [1.20, 1.20, 1.50], 'interior rule on the page'],
  //                                        1.25 / 1.50 / 1.67
  ['--border-default', '--surface-raised', [1.50, 1.50, 2.00], 'the plate edge'],
  //                                        1.56 / 1.78 / 2.61
  ['--border-default', '--surface-base',   [1.45, 1.45, 2.00], 'plate edge against the page'],
  //                                        1.51 / 2.00 / 2.61
  ['--border-default', '--surface-sunken', [1.35, 1.35, 2.00], 'plate edge on a zoned section'],
  //                                        1.39 / 2.08 / 2.61

  // The surface ladder. Two rungs go flat on paper BY DESIGN — §2.3 paints base,
  // raised and sunken all #ffffff, because a tinted plate on paper is a grey smudge.
  // The third does NOT: --surface-inset keeps a 7% tint, so it is measured in print
  // like any other row. An earlier draft said "in print every surface is white by
  // design and the ladder collapses to 1.00"; that is true of two rungs out of three,
  // and the one it is not true of is the meter track — the object the rung exists for.
  ['--surface-raised', '--surface-base',   [1.03, 1.12, null], 'the card lift',
    { dischargedBy: ['--border-default', '--surface-raised'] }],
  //                                        1.04 / 1.13 / 1.00
  ['--surface-inset',  '--surface-raised', [1.12, 1.12, 1.12], 'the meter track in its plate'],
  //                                        1.19 / 1.18 / 1.17
  ['--surface-sunken', '--surface-base',   [1.03, 1.03, null], 'a zoned section against the page',
    { dischargedBy: ['--border-default', '--surface-sunken'] }],
  //                                        1.08 / 1.04 / 1.00
];

const wcagFg  = new Set(PAIRS.map(p => p[0]));
const houseFg = new Set(HOUSE_PAIRS.map(p => p[0]));
for (const t of houseFg) {
  if (wcagFg.has(t)) {
    throw new Error(
      `${t} is a foreground in BOTH lanes. A token is informative or decorative, ` +
      `never both — this is how a WCAG pair gets quietly demoted to a house row.`,
    );
  }
}

// A null floor must name the row that does its job in that theme, and that row must
// exist and must hold. Otherwise "not applicable in print" is an unchecked assertion.
for (const [fg, bg, floors, , meta] of HOUSE_PAIRS) {
  floors.forEach((floor, i) => {
    if (floor !== null) return;
    const d = meta && meta.dischargedBy;
    if (!d) fail(`${fg} on ${bg} is null in ${THEMES[i][0]} with nothing discharging it.`);
    if (!HOUSE_PAIRS.some((h) => h[0] === d[0] && h[1] === d[1])) {
      fail(`${fg} on ${bg}: dischargedBy names a row that does not exist.`);
    }
  });
}
```

On paper a plate is defined by its rule and not by its fill, which is why
`--border-default` prints at **2.61** rather than 1.51, and why the two rungs that go to
1.00 there are a design decision rather than a gap. Both say so in code, and both name
the row that carries the job instead.

### 3.3 The five assertions, written out

The gate has always measured thresholds. Thresholds cannot express §13.1, which is a
statement about *rank* and about *exclusivity*. These can, and each is honest about what
it measures and what it does not.

**They are written out in full here, including the helpers.** An earlier draft invoked
`assertAmberExclusive` by name in three places and never defined it, gave
`assertAmberSurfaceMostChromatic` a body consisting of one comment, and used `ratioOf`,
`fail` and a `grounds` argument that appeared nowhere. The entire §13.1 guarantee was
delegated to a function that did not exist. It also proposed landing the assertion
"disabled with the failure printed as a `TODO`", which is the vacuous pass this codebase
refuses everywhere else — a disabled assertion is a `56/56` over a palette nobody read.

```js
// --- helpers, so nothing below is a name without a body ---------------------

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`FAIL  ${msg}`); };

/** Ratio of two token names in one resolved theme. Throws rather than skipping. */
function ratioOf(theme, fgToken, bgToken) {
  const fg = rgb(resolve(theme, theme[fgToken] ?? ""));
  const bg = rgb(resolve(theme, theme[bgToken] ?? ""));
  if (!fg || !bg) {
    // Unresolvable counts as a failure, not a skip. This is the line that makes
    // `transparent`, `rgb(... / 0.06)` and a missing token all loud instead of
    // absent — and it is why --edge-lift is not in this palette (§2.6).
    throw new Error(`unresolvable pair: ${fgToken} on ${bgToken}`);
  }
  return ratio(fg, bg);
}

/** max(R,G,B) - min(R,G,B) for a resolved token. Crude, and the right crudeness. */
function chromaOf(theme, token) {
  const c = rgb(resolve(theme, theme[token] ?? ""));
  if (!c) throw new Error(`unresolvable colour: ${token}`);
  return Math.max(...c) - Math.min(...c);
}

/** The three stylesheets, comments stripped, as one scannable string per file. */
const SHEETS = ["app.css", "landing.css", "provenance.css"].map((f) => [
  f,
  readFileSync(new URL(`../apps/web/src/styles/${f}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, ""),
]);

/**
 * Every declaration in a sheet, as [selectorText, declaration, lineNumber].
 * Deliberately not a CSS parser: a rule is "the text since the last } or {"
 * followed by a block, which is enough for a whitelist scan and has no
 * dependency. A construct it cannot read (a nested @supports selector) is
 * reported as UNSCANNED and fails the run — silence is not a pass here either.
 */
function declarations(css) { /* ... 30 lines, one regex over `sel { body }` ... */ }

// --- (1) Amber outranks chrome, on every ground, in every theme -------------

/**
 * SCOPE, stated rather than assumed. It covers --accent and --accent-focus: the
 * tokens painted as INK or STROKE on a page ground. It excludes:
 *
 *  - --accent-hover, which is only ever a FILL under a pointer. Its ratio against
 *    the page measures nothing a reader reads; what matters is its label, and
 *    --text-inverse on it is 8.12 light / 9.63 dark — now a declared pair (§3.1),
 *    because a number quoted in a comment is a number nothing re-runs.
 *  - --derived, --variance and --deferred, which are provenance PEERS. Within that
 *    family differentiation is by cue, by fill and by area, not by luminance rank.
 *    Forcing amber above a dark green would push it to a brown that carries less
 *    warning — aesthetic-driven softening arrived at from the other side.
 *  - --text-* and --border-*, which are achromatic and carry no colour signal.
 *
 * THE PEER EXCLUSION IS LOAD-BEARING, AND THE NUMBERS SAY WHY. --variance is
 * #a8271f and measures 7.06 on a panel in light and in print, against amber's
 * 6.99. Amber does NOT lead it there; it leads in dark, 8.99 against 6.89. An
 * earlier draft lightened --variance to #ad342b — a 10% reduction on the token
 * that paints NEVER CLAIMED — for no reason except to win this comparison. That
 * is the softening this note forbids, performed on the note. The value is
 * reverted (§2.1) and the assertion is scoped to chrome, out loud, here and in
 * §7.4(a). Two inks 1.010x apart are not a rank a reader perceives; what
 * separates ASSUMED from VARIANCE at page scale is the amber's filled ground and
 * its 6px gutter rail, and VARIANCE has neither.
 *
 * Because ratio(fg, ground) = (L_ground + 0.05) / (L_fg + 0.05) for any dark
 * foreground on a light ground, the ratio BETWEEN two foregrounds is independent
 * of the ground. So the rank is one luminance comparison and cannot hold on one
 * surface and fail on another. It is checked per ground anyway, because that
 * argument is only true while both tokens sit on the same side of the ground.
 */
function assertAmberOutranksChrome(themes, grounds = GROUNDS) {
  for (const [name, T] of themes) {
    for (const g of grounds) {
      for (const c of ["--accent", "--accent-focus"]) {
        const amber = ratioOf(T, "--uncertain", g);
        const chrome = ratioOf(T, c, g);
        if (!(amber > chrome)) {
          fail(`§13.1: ${c} (${chrome.toFixed(2)}) is at least as loud as ` +
               `--uncertain (${amber.toFixed(2)}) on ${g} in ${name}.`);
        }
      }
    }
  }
}
// Measured margin with this palette: light >= 1.210x, dark >= 1.356x, print >= 1.210x,
// on each of the nine grounds. --surface-contrast is not one of them: see §3.1.

// --- (2) No state ink and no chrome ink on the inverted band ----------------

/**
 * The tenth surface. --surface-contrast is excluded from GROUNDS because on it, in
 * light, --uncertain measures 2.58 against --accent's 3.12 — assertion (1) would
 * fail there. An exclusion that rests on "nothing is painted there" is worth
 * exactly as much as the check that nothing is. So here is the check.
 *
 * The band already overrides its own inks (landing.css:709-736). This asserts it
 * stays that way: inside any rule whose selector contains `contrast` or
 * `status-band`, the only colour tokens permitted are the band's own three.
 */
const BAND_OK = /^--(text-on-contrast|text-on-contrast-dim|border-on-contrast|surface-contrast)$/;
function assertNoChromeOnBand() {
  for (const [file, css] of SHEETS) {
    for (const [sel, decl, line] of declarations(css)) {
      if (!/contrast|status-band/.test(sel)) continue;
      for (const m of decl.matchAll(/var\((--[\w-]+)\)/g)) {
        if (/^--(uncertain|accent|variance|derived|deferred)/.test(m[1]) && !BAND_OK.test(m[1])) {
          fail(`${file}:${line} paints ${m[1]} on the inverted band (${sel}). ` +
               `§3.1 excludes --surface-contrast from the nine grounds on the ` +
               `strength of this never happening.`);
        }
      }
    }
  }
}

// --- (3) The amber ground is the most chromatic surface in the system -------

/**
 * Ratio is a luminance measure and says nothing about area or saturation, and at
 * page scale the ASSUMED treatment's loudness comes from its FILLED GROUND — the
 * only coloured ground in the language. Chroma spread is crude and it is the right
 * crudeness here: it caught a defect nothing else could see, that dark
 * --accent-subtle (38) was more chromatic than dark --uncertain-surface (27), so a
 * BINDING tag had a stronger colour ground than an assumption.
 *
 * Screen themes only: in print EVERY state surface is white (§2.3), which is a
 * uniform rule and not an amber exception.
 */
function assertAmberSurfaceMostChromatic(themes, surfaces = GROUNDS) {
  for (const [name, T] of themes) {
    const amber = chromaOf(T, "--uncertain-surface");
    for (const s of surfaces) {
      if (s === "--uncertain-surface") continue;
      const other = chromaOf(T, s);
      if (other >= amber) {
        fail(`§13.1: ${s} (chroma ${other}) is at least as chromatic as ` +
             `--uncertain-surface (${amber}) in ${name}.`);
      }
    }
  }
}
// Measured: light 29 vs next-highest 19 (--accent-subtle); dark 36 vs 26
// (--variance-surface). Widest NEUTRAL in either theme is --text-tertiary at 12.

// --- (4) Amber is used for uncertainty and nothing else ---------------------

/**
 * "Nothing else in the system is permitted to use it" was a rule a reviewer had to
 * remember. There are 24 `var(--uncertain*)` declarations across the three
 * stylesheets, spread over FIFTEEN distinct selector names for what §6.2 shows is
 * a handful of states. `.chip--assumed` (app.css:480) and `.chip--warn`
 * (app.css:482) are byte-identical and both in live use, so an edit to "the amber
 * chip" changes one and misses the other — and the one it misses is the one
 * carrying §13.1's meaning.
 *
 * After the [data-state] consolidation (§6.2) every amber declaration lives in a
 * selector matching this whitelist. Anything else fails the build.
 */
const AMBER_OK = [
  /\[data-state=['"]assumed['"]\]/,   // the state layer (§6.2)
  /\.traced--assumed/,                 // the inline treatment (§7.1)
  /\.margin-tally/,                    // channel 5, the rail-gutter tally (§7.1)
  /\[data-state=['"]partial['"]\]/,   // the five-way claim statement's PARTIALLY
                                       //  SUPPORTED verdict — an uncertainty ABOUT
                                       //  A CLAIM, which is what tokens.css means
                                       //  by "reserved exclusively for uncertainty".
                                       //  It is NOT mapped onto `assumed`: that
                                       //  would relabel a verdict as an assumption,
                                       //  a copy change to §16.5's own sentence.
  /\.sensitivity__bar/,                // a sensitivity magnitude. Sensitivity is a
                                       //  property of an ASSUMED entry and of
                                       //  nothing else — see the structural test
                                       //  below, which is what admits this entry.
];

function assertAmberExclusive() {
  for (const [file, css] of SHEETS) {
    for (const [sel, decl, line] of declarations(css)) {
      if (!/var\(--uncertain/.test(decl)) continue;
      if (AMBER_OK.some((re) => re.test(sel))) continue;
      fail(`${file}:${line} paints amber outside the whitelist: ${sel}`);
    }
  }
}

// --- (5) Every rail width is one of the two, and 6px is ASSUMED alone -------

/**
 * §7.4(c) rests the greyscale and photocopy argument on "a column of 6px marks
 * reads as a POSITION, not a hue". That is only true while ASSUMED is the only
 * state at 6px. An earlier draft gave BINDING the same width; amber and the accent
 * separate by 1.21x in light and 1.36x in dark, which on a photocopy is two mid-
 * greys, so sharing the width collapses channel 5 back to colour alone. No ratio
 * check can see that, which is why it is an assertion and not a review note.
 *
 * ONE exception, and it is the same device rather than a second one:
 * .margin-tally--none keeps the 6px in --border-strong, because "nothing is
 * assumed in this section" only reads as a statement if it occupies the same
 * column at the same width (§2.5, §7.4c).
 */
const EMPHASIS_OK = /\[data-state=['"]assumed['"]\]|\.margin-tally/;
function assertRailWidths() {
  for (const [file, css] of SHEETS) {
    for (const [sel, decl, line] of declarations(css)) {
      // Both spellings: the custom property, and the shorthand that reads it.
      const usesEmphasis =
        /--rail-width:\s*var\(--rail-w-emphasis\)/.test(decl) ||
        /border-inline-start(?:-width)?:\s*var\(--rail-w-emphasis\)/.test(decl);
      if (usesEmphasis && !EMPHASIS_OK.test(sel)) {
        fail(`${file}:${line} gives ${sel} the 6px rail. It is ASSUMED-only (§2.5).`);
      }
      // And no third width. Both widths are TOKENS, so any literal is a third one:
      // six ship today (1, 2, 3, 4, 6px) and §2.5 enumerates the six rules that go.
      for (const b of decl.matchAll(/border-inline-start(?:-width)?:\s*(\d+)px/g)) {
        fail(`${file}:${line} draws a literal ${b[1]}px rail on ${sel}.`);
      }
    }
  }
}
```

**A whitelist is the weaker of two available tests, and the stronger one is also
landed.** The rule "every whitelist entry must carry a comment naming the uncertainty it
represents" makes *prose* the qualifying test for the one colour whose whole value is a
1:1 mapping to a provenance class. That is backwards. So `assertAmberExclusive` is paired
with a rendering test in `apps/web/test/amber.test.tsx`, run against **real engine
output** the way the other screen tests are, asserting the mapping in both directions:

- every rendered node carrying `provenanceClass === 'ASSUMED'` has `[data-state="assumed"]`
  or `.traced--assumed`, and
- every node with a computed amber declaration is one of: `[data-state="assumed"]`,
  `.traced--assumed`, `.margin-tally`, `[data-state="partial"]`, or a `.sensitivity__bar`
  **whose closest `[data-state]` ancestor is `assumed`**.

The second half is what admits `.sensitivity__bar` on evidence rather than on its
comment: `AssumptionRegister.tsx:227` renders it only inside `entry.sensitivity`, i.e.
only inside an assumption row, and the test asserts that rather than believing it.

**And one grandfathered entry does not survive the stronger test.**
`.parking-legend__swatch--ramp` (app.css:1003) paints the ramp rectangle amber. Its own
comment says why: *"Only its plan area is reserved; gradient, transitions and headroom
under B.7.2.2 are **not assessed**."* That is NOT ASSESSED — which has its own ink, its
own hatch and its own italic in this system. Amber there is not an assumption; it is a
deferred fact wearing the assumption's colour, on the one drawing the client cares most
about. **The ramp moves to `[data-state="deferred"]`** — `--deferred`, hatched, captioned
"gradient, transitions and headroom: NOT ASSESSED" — and the legend keeps its stripe, so
no non-colour cue is lost. The comment's worry, that drawing it "in the same ink as a
cited setback would claim they were" assessed, is answered better by the deferred
treatment than by the amber one. This is not a softening: it removes an amber that was
never an assumption, which is what makes the remaining amber mean something.

The two rules that stay, restated so neither can be waived by prose alone:

1. Every whitelist entry carries a comment naming the uncertainty it represents. An entry
   without one is a colour looking for an excuse.
2. **And every whitelist entry is also proved by `amber.test.tsx`.** An entry that only
   rule 1 admits is not admitted.

## 4. TYPE

### 4.1 The ramp: one ratio, one anchor, one deliberate hole

Today four sizes are packed inside 12–16px — steps of **1.083** (13/12) and **1.067**
(16/15) — and both are below roughly 1.12, the point at which a size step reads as a
decision rather than as two people editing the same file. Then there is a hole from 20
to 28, precisely where a section heading belongs. Three sizes carry 90% of the product
and five are near-singletons, which is why every rank below a panel title is built
from a 1–2px difference and the screens fall back to UPPERCASE + tracking for all of
them — five near-identical small-caps treatments using **eight** different
letter-spacing literals, while `--tracking-label`, the token written to prevent
exactly this, is referenced twice in the codebase and **zero times in `app.css`**.

Major Third, 1.25, above a 16px anchor. Linear −2px below it, because 1.25 downward
gives 12.8 and 10.24 and 12px is this product's stated floor.

```css
:root {
  --text-xs:   0.75rem;    /* 12px — the floor. Nothing smaller carries meaning. */
  --text-sm:   0.875rem;   /* 14px    ×1.167 from xs  (was 13px, a 1.083 non-step) */
  --text-base: 1rem;       /* 16px    ×1.143 — THE ANCHOR (was 15px)               */
  --text-md:   var(--text-base);  /* RETIRED ALIAS. 9 references. It was a 1px
                                     "step" used as a hierarchy level in five places
                                     on the landing page, and the eye cannot read
                                     1px as a level. Delete after one release. */
  --text-lg:   1.25rem;    /* 20px    ×1.25   panel title, .note title             */
  /* 25px  ×1.25²  FOUR live call sites, enumerated because a ramp re-pitch that
     silently resizes a figure on the landing page is how a "type change" becomes
     a content change:
       app.css:115     .app-header__mark          28 → 25   brand mark, fine
       app.css:754     .comparison__value         28 → 25   a figure; see below
       landing.css:469 .lp-band.is-binding
                         .lp-band__number         28 → 25   THE BINDING BAND'S
                         FIGURE on the landing page. It sits against the other two
                         bands at --text-lg (20px). At 28 the step was 1.40 off a
                         ramp it was not on; at 25 it is exactly 1.25, one rung.
                         The binding band reads MORE clearly ranked, not less.
       landing.css:879 .stat__value               28 → 25   stat row figure
     Both figures (comparison__value, stat__value) stay on --text-xl rather than
     moving to --text-figure: --text-figure is the GOVERNING number's size and
     giving it to a comparison row would flatten the one rank §15.3 protects. */
  --text-xl:   1.5625rem;
  /* 31.25px  ×1.25³  A RUNG WITH NO CONSUMER, DECLARED ANYWAY, AND THAT IS SAID
     PLAINLY. Its only call site today is app.css:642 .traced-display .value — the
     governing figure — which moves to --text-figure below, after which nothing
     references this token. An earlier draft justified it as "fixed, not clamped,
     because a 31px HEADING wraps rather than overflows"; there is no heading on
     it and there never was. It is kept because a geometric ramp with a missing
     rung is not a ramp, and the next heading that needs a size between 25 and 39
     must find one already named rather than inventing 32px. That is a different
     argument from --radius-pill's (an exception, not a rung) and from
     --measure-quote's (deleted below, because a pull-quote is a PATTERN and this
     document specifies none). */
  --text-2xl:  1.9531rem;
  --text-3xl:  clamp(1.5rem, 4.8vw, 2.4414rem);   /* 24 → 39.06px  ×1.25⁴   H2     */

  /*        ×1.25⁵ = 48.83px is DELIBERATELY EMPTY.
     H1 sits TWO rungs above H2, not one. Today --text-4xl and --text-3xl clamp to
     57.6 and 52 — a ratio of 1.108 — and share --tracking-display and
     --weight-semibold, so an H1 differs from an H2 by 11% in size and by nothing
     else at all. One step makes an H1 a slightly larger H2; two makes it
     unmistakable. This hole is the single most visible line in this section.       */

  --text-4xl:  clamp(2.25rem, 7.5vw, 3.8147rem);  /* 36 → 61.04px  ×1.25⁶   H1     */

  /* OFF the ramp, between ⁴ (39.06) and ⁵ (48.83). A RESULT IS NOT A HEADING and
     must never be confusable with one, and it must outrank every heading it can
     appear beneath. Giving the figure its own name is also what stops the ramp
     re-numbering from silently shrinking the product's hero number from the
     shipped 40px to 31.25px — which is what happens if it stays on --text-2xl.
     The floor stays 1.75rem/28px, unchanged: --text-2xl's own comment records a
     fixed 40px figure measuring 250px and scrolling a 320px page sideways.        */
  --text-figure: clamp(1.75rem, 5.4vw, 2.75rem);  /* 28 → 44px */
}
```

**The clamps are engineered so the ratio survives resize.** `--text-3xl` and
`--text-4xl` reach their ceilings at the same viewport width — 39.06/0.048 = **813.8px**
and 61.04/0.075 = **813.9px** — so H1:H2 is *exactly* 1.5625 through the whole scaling
band and at the ceiling. Computed at real widths:

| viewport | H1 | H2 | H1/H2 | figure | figure/H2 |
|---|---|---|---|---|---|
| 320 | 36.0 | 24.0 | 1.500 | 28.0 | 1.167 |
| 480 | 36.0 | 24.0 | 1.500 | 28.0 | 1.167 |
| 500 | 37.5 | 24.0 | 1.5625 | 28.0 | 1.167 |
| 640 | 48.0 | 30.7 | 1.5625 | 34.6 | 1.125 |
| 768 | 57.6 | 36.9 | 1.5625 | 41.5 | 1.125 |
| 1024 | 61.0 | 39.1 | 1.5625 | 44.0 | 1.126 |
| 1440 | 61.0 | 39.1 | 1.5625 | 44.0 | 1.126 |

Below 500px the two-rung gap compresses to 1.500 and that is stated rather than
hidden: a 61px headline does not belong on a 320px phone, and pretending the ratio
holds at a width that physically cannot carry it would be a claim, not a scale. The
figure never drops below the H2 at any width, and never overflows: twelve mono
characters at 28px measure **202px** plus a ~34px unit inside the 288px available at
320px.

### 4.2 Sans and Mono — the pairing rules

Plex Sans and Plex Mono share metrics and a skeleton. That is not a preference, it is
the mechanism: it is what lets a mono figure sit inside a sans sentence at the same
`font-size` without looking pasted in, and a traced value *is* precisely a figure
quoted inside a sentence. Any replacement family must beat that property, not merely
look good.

1. **Sans is the voice, Mono is the record.** Prose, headings, buttons and eyebrows in
   Sans. Every number, unit, identifier, citation and index numeral in Mono, without
   exception — a number set in Sans is a number the page is treating as prose.
2. **They set at the same size.** If you are reaching for `0.95em` on the mono, the
   sizes are wrong, not the faces.
3. **Weight inverts across the two.** Sans display runs Light (300) and body 400; Mono
   runs 500 and 600 and never 300. *Prose whispers, numbers state.* This is the
   pairing rule that carries the product's thesis typographically, and it is also why
   dropping the headline from 600 to 300 makes the page quieter and the amber louder
   in the same edit.
4. **Mono never sets more than one line of running prose.** A mono paragraph reads as
   a terminal, which is the register the numeral has to escape.
5. **One micro-label treatment.** Mono, `--text-xs`, uppercase, `--tracking-label`,
   `--text-tertiary`. It replaces fifteen. And it is the same on both surfaces: the
   landing sets its micro-labels in mono and the app sets them in sans at a different
   tracking, and that single divergence is why the two read as two products — the
   drawing-sheet language is announced on the marketing page and abandoned the moment
   the user clicks "Open the engine".
6. **Tabular in stacks, proportional in sentences.** Tables, schedules and key/value
   stacks get `tabular-nums`; a single figure mid-sentence gets `proportional-nums`,
   which is the one case rule 2 exists for. `.value` currently sets `tnum`
   unconditionally, including inline in `.lp-figure__foot`.
7. **`slashed-zero` on identifiers only.** A zero in a GFA does not need a slash; a
   zero in `DJAZ1MED12RES011` photocopied twice does.
8. **`lining-nums` stated explicitly everywhere.** CLAUDE.md says the site is opened
   on a plot with no wifi, so the fallback face is a real rendering path — and a
   fallback with old-style figures drops a 3 below the baseline in a numeric column.
9. **Italic is Sans only, and must be real** (§2.8).

### 4.3 Tracking, leading, measure

```css
:root {
  --tracking-display: -0.028em;  /* existing — --text-3xl                          */
  --tracking-banner:  -0.035em;  /* NEW — --text-4xl only; -0.028 is not tight
                                    enough at 61px                                  */
  --tracking-tight:   -0.015em;  /* existing — --text-lg .. --text-2xl, figures     */
  --tracking-normal:   0;        /* NEW — body, and what a mono figure resets to.
                                    Its absence is why a global h1–h4 rule invented
                                    a FOURTH unnamed tight value, -0.011em          */
  --tracking-label:    0.09em;   /* existing — uppercase micro-labels at --text-xs  */
  /* --tracking-label-lg: 0.06em is NOT ADDED. It was justified as "the principled
     reason there are exactly TWO label tracks" — but §4.2 rule 5 unifies the micro-
     label onto ONE treatment at --text-xs, and every uppercase run in §6 is at that
     size. A second track with no consumer does not make the first one principled;
     it makes the count wrong. One track, until a pattern needs the second. */

  --leading-flat:    1;      /* NEW — glyph boxes and index numerals, which are
                                currently centred to a line box rather than a
                                cap line                                            */
  --leading-display: 1.04;   /* NEW — --text-4xl and --text-figure. The three
                                largest headings hard-code 1.02 and 1.08 because
                                nothing in the system said what leading a 61px
                                headline should have                                */
  --leading-head:    1.1;    /* NEW — --text-2xl, --text-3xl                        */
  --leading-tight:   1.2;    /* existing — --text-lg, --text-xl                     */
  --leading-normal:  1.5;    /* existing */
  --leading-relaxed: 1.65;   /* existing */

  /* --measure was 68ch applied at FOUR different font sizes, so "the measure"
     produced four physical columns spanning roughly 100px under one name — which
     is why `.panel__subtitle` wraps at ~430px inside an 1,150px panel and reads
     as a wrapping fault rather than a decision. Sized so prose, lede and fine
     print all land on a ~590px column. */
  --measure-prose:  62ch;   /* --text-base 16px */
  --measure-lede:   50ch;   /* --text-lg   20px */
  --measure-fine:   70ch;   /* --text-sm   14px */
  --measure-banner: 15ch;   /* the H1, capped in characters rather than pixels.
                               It is NOT what prevents the 320px overflow — see
                               §6.3, where that claim is corrected with the
                               arithmetic. */
  /* --measure-quote: 38ch is NOT ADDED. A pull-quote is a pattern, and §6 does not
     specify one. A measure token for a component that does not exist is a width
     waiting for a component to be invented around it. */

  /* --measure ITSELF IS KEPT, as a deprecated alias, and deleted in Step 7 — not
     at Step 3. It has THIRTEEN live call sites (app.css 6, landing.css 7), and a
     custom property that is referenced but no longer declared makes every one of
     those max-width: var(--measure) declarations invalid at computed-value time:
     max-width resolves to none and thirteen paragraphs run the full 78rem
     column. That is the same class of failure as deleting --focus-ring before its
     replacement lands (§2.6), and it is invisible to typecheck, test and smoke —
     nothing measures a line length. Same treatment as --text-md. */
  --measure: var(--measure-prose);   /* RETIRED ALIAS. 13 references. */
}
```

The rule that comes with them: **a container is never full-bleed around prose that is
capped.** Either the prose fills the container or the container narrows. The
recommended-frontage callout is a full-width green box holding a 40%-width paragraph;
that is the shape this rule exists to prevent.

The global `h1, h2, h3, h4 { letter-spacing: -0.011em }` rule is **deleted**. Tracking
is a property of the step, and a fourth unnamed tight value applied to every heading
is how eight literals happen.

### 4.4 How a traced value is set inline in a sentence

The numeral is the one element in a product about numbers with no typographic
specification, and it is the loudest possible tell. `.shots/05-capacity.png` prints a
governing capacity of `3512.8506 m²`; `.shots/07-checks.png` prints
`SATISFIED: 0.15141242937853107344632766836 ratio`. No separator policy, no
significant figures, no decimal alignment down a column. Everything else on the page
can be beautifully argued and a reader still sees a console.

**Display precision is a surface policy. It changes no provenance and no computed
value.** The engine holds `Decimal`; the UI formats only at the leaf; the rounded
string never re-enters a computation, which is structurally true because
`TracedValue` is the only place a figure is rendered and it has no path back into the
engine.

| unit | decimals | separator |
|---|---|---|
| `m2`, `m` | 1 | grouped |
| `ratio`, `far` | 3 | — |
| count, levels, bays, units | 0 | grouped |
| percent | 1 | — |

Full precision is not thrown away and is not hidden in a `title` (unreachable by
keyboard, unread by touch): it is carried in `data-full` and printed in the derivation
panel, which is already the disclosure mechanism the product is built around.

**The policy applies to VALUES and never to formula strings.** CLAUDE.md requires the
formula shown when a figure is expanded to be the engine's own `formula` string off the
provenance graph, "not re-typed explanations — a re-typed formula drifts exactly as
easily as a re-typed value and less visibly". `worked-example.json` carries
`formulas.bandA = "FAR 5 × plot area 3200.00 m² (parking excluded from FAR)"`, so after
this change a plot area displayed as **3,200.0** will sit beside an engine formula saying
**3200.00**. That mismatch is the correct outcome and is left visible: reformatting the
engine's string to match the display would be re-typing it, which is the one thing that
rule forbids. If the two are to agree, the engine emits the formula differently — a
change in `packages/`, not in `TracedValue.tsx`.

**And it breaks a test, which Step 10 has to name.** `apps/web/test/landing.test.tsx:193`
asserts `html` contains `group(WORKED.verified.governingGfaM2)` — `"6,774.194"`. Under
`m2 → 1 decimal` the page prints `6,774.2` and that assertion fails. The gate for it is
**`pnpm test`**, not `pnpm example`: `verify-worked-example.mjs` diffs the fixture
against the API and would still pass, because nothing about the engine has changed. The
fix is not a literal in the test — the fixture stays the only source of the number — it
is to route the assertion through the same formatter the component uses:

```ts
// was: group(WORKED.verified.governingGfaM2)
expect(html).toContain(formatTraced(WORKED.verified.governingGfaM2, 'm2'));
```

which makes the test track the precision policy instead of a hand-grouped string, and
keeps the property the test exists for: the page quotes the fixture, and the fixture
comes from a real run.

```css
/* Sans and Mono share metrics, so the mono figure sets at 1em inside the sentence. */
.value {
  font-family: var(--font-mono);
  font-size: 1em;
  font-weight: var(--weight-medium);
  font-variant-numeric: proportional-nums lining-nums;
  letter-spacing: var(--tracking-normal);
  white-space: nowrap;  /* a figure never breaks mid-number */
}
/* Stacks and schedules, not sentences. */
.schedule .value, .plate__spec .value, .kv .value, .traced-display .value {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
}
.ident {                 /* rule ids, plot numbers, citations */
  font-family: var(--font-mono);
  font-variant-numeric: slashed-zero lining-nums;
  overflow-wrap: anywhere;
}
.value__unit {
  font-family: var(--font-sans);
  font-size: 0.85em;
  font-weight: var(--weight-normal);
  color: var(--text-tertiary);
  margin-inline-start: 0.15em;
}
```

Right alignment plus `tabular-nums` does **not** align decimal points across rows of
differing integer width. A fixed decimal count per unit is what makes it true, which
is the second reason the precision policy is a typographic decision and not a
formatting convenience. In a schedule the value is an `inline-grid` with the unit in
its own track, so decimals and units both line up down the column (§6.6).

---

## 5. LAYOUT

### 5.1 Section rhythm — three tiers, asymmetric, and one horizon

Today each section draws **two** competing horizontals: a full-width 1px
`--border-subtle` at its top edge, and then 32–64px below it a 2px near-black rule
spanning only 4.5rem. The heavier line is the shorter and the later one, so neither
reads as the section's opening and the eye gets two starts. And the padding is
symmetric, so the dividing rule sits at the exact midpoint of the gap between two
sections and belongs to neither — nothing on the page announces that a section is
*opening*.

One horizon, full width, in `--border-strong`, owned by the section it opens. Padding
biased to the top, which binds the rule to the heading beneath it.

```css
/* Breakpoints. Custom properties are not valid inside an @media condition, so the
   five values are written as literals throughout and carried here as the single
   place they are named. Pretending otherwise would be a token that does not work,
   which is worse than a literal that does.
     --bp-xs 30rem/480   --bp-sm 40rem/640   --bp-md 48rem/768
     --bp-lg 64rem/1024  --bp-xl 80rem/1280
   Only three carry structural change: sm stacks a schedule, md folds the rail,
   lg moves the hero figure alongside. */

.section {
  /* The horizon. Nothing else on the page draws a rule at this weight, which is
     what makes it read as one. --border-strong, not --text-primary: a datum is
     informative structure and is measured as such (4.18 light / 5.18 dark on the
     page ground), where near-black would be a fifth text rank nobody declared. */
  border-block-start: var(--border-width-emphasis) solid var(--border-strong);
  /* 128 / 96 at desktop, 48 / 32 at the floor — 1.33:1 and 1.5:1. A section opens
     rather than ends. */
  padding-block: var(--rhythm-major) var(--rhythm-minor);
  scroll-margin-block-start: calc(var(--control-h-lg) + var(--space-4));
}

/* The tier is assigned by ARGUMENT WEIGHT, not by position. The five-way claim
   statement and "what it does not do" take the major tier, because those are the
   two sections a reader must not skim — which is the opposite of the SaaS
   convention, where the feature grid gets the air. */
.section--major { --rhythm-major: clamp(3.5rem, 10vw, 8rem); }
.section--minor {
  border-block-start-width: var(--border-width);
  border-block-start-color: var(--border-default);
  padding-block: var(--rhythm-minor) var(--rhythm-block);
}
/* The first section after the frontispiece needs no rule: the masthead gave it one. */
.section--opening { border-block-start: none; padding-block-start: var(--rhythm-block); }

/* Zoning by ground, used sparingly and ALONGSIDE the datum rather than instead of
   it. A change of ground says "this is a different part of the argument" without
   adding a graphic element that carries no meaning — and unlike a shadow it
   survives print. Every token on --surface-sunken is measured. */
.section--zoned { background: var(--surface-sunken); }

.section__head { margin-block-end: var(--rhythm-block); }
.section__body > * + * { margin-block-start: var(--space-5); }
/* A plate or a refusal is a break in the argument and gets a block interval. */
.section__body > .plate + *, .section__body > * + .plate,
.section__body > .refusal + *, .section__body > * + .refusal {
  margin-block-start: var(--rhythm-block);
}
```

> `.section--zoned` is deliberately **not** called `.band`. `app.css:647` already owns
> `.band`, `.band__bar`, `.band__head`, `.band__letter`, `.band--governing` for the
> three capacity bands, and a silent collision there would restyle the one thing
> §15.3 says must never be averaged or made to look like a menu.

### 5.2 The shell — one column, one gutter, and no component sets its own inset

Four unaligned left edges are stacked on every engine screen: `.stepper ol` at 16px,
`.app-header` and `.banner` at 24px, `.layout` at 136px on a 1440px viewport. The
alert banner saying "These numbers are not an assessment" runs visibly wider than the
panels beneath it. Misalignment is read before anything else on a page, and a
full-bleed alert above a centred 76rem column is the canonical signature of a page
assembled rather than laid out.

```css
.shell {
  inline-size: 100%;
  max-inline-size: var(--page-max);
  margin-inline: auto;
  padding-inline: var(--page-gutter);
}

/* Full-bleed ground, contained content. The ground paints edge to edge; the text
   inside still begins on the one column.
   This replaces `.banner { margin: 0 var(--space-5) }` — a component that sets its
   own outer margin cannot be placed twice, and that one is placed three ways: as a
   sibling of .layout it is full-bleed-minus-48px, inside .layout__main it is 48px
   narrower than the panels it stacks with, and inside a .panel that already has
   24px of padding it is double-inset. PLACEMENT OWNS INSET; COMPONENTS NEVER DO. */
.bleed { inline-size: 100%; background: var(--bleed-ground, transparent); }
```

### 5.3 The rail — one grid, and everything is a span of it

```css
.railed {
  display: grid;
  grid-template-columns: var(--rail) minmax(0, 1fr);
  column-gap: var(--space-5);
  align-items: start;
}
.railed > * { min-inline-size: 0; }   /* the single declaration whose absence causes
                                         almost all horizontal overflow */
.railed__margin { grid-column: 1; }
.railed__body   { grid-column: 2; }
.railed__full   { grid-column: 1 / -1; }

/* Rule-separated rows on the same rail, so a limits list, a claims list and a
   schedule all share one column edge. */
.railed--rows > .railed__row {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
  padding-block: var(--space-5);
  border-block-start: var(--border-width) solid var(--border-subtle);
}
.railed--rows > .railed__row:last-child {
  border-block-end: var(--border-width) solid var(--border-subtle);
}
@supports not (grid-template-columns: subgrid) {
  .railed--rows > .railed__row {
    grid-template-columns: var(--rail) minmax(0, 1fr);
  }
}

/* --bp-md 48rem. The rail FOLDS rather than shrinking: a 4.5rem rail beside a
   288px sheet leaves a 216px measure, which is not a column, it is a gutter. */
@media (max-width: 48rem) {
  .railed, .railed--rows > .railed__row { grid-template-columns: minmax(0, 1fr); }
  .railed__margin, .railed__body, .railed__full { grid-column: 1; }
}
```

Everything is a span of this grid — the section index, the numbered limit, the claim
title, the schedule's rank column, the figure caption's label and the margin tally.
Six independent grid declarations become one, and a vertical line runs the length of
the page that nothing actually draws. This is the mechanic that most reads as "drawn"
per unit of effort, because it removes rather than adds.

### 5.4 Logical properties are the house convention

Every rule in this document uses `border-inline-start`, `padding-block`,
`inline-size`, `margin-inline`. This product reads Arabic affection plans, the
governing meeting record is in Arabic, and the client is in Dubai. A status rail that
appears on the wrong edge under `dir="rtl"` is a defect the 320px smoke test will
never catch, and retrofitting logical properties across 2,876 lines later is a rewrite.

---

## 6. PATTERNS

All CSS below is production, uses tokens only, and writes no hex value. Each pattern
states what it is for and how it reflows at 320px, where `--page-gutter` is at its
16px floor and the content column is **288px**.

### 6.0 The global focus indicator, which has to exist before a token can be deleted

`--focus-ring` has **three live consumers**: `app.css:44` (the global `:focus-visible`,
which is every focusable element in the product), `app.css:920`
(`.dropzone__label:focus-within`), and `provenance.css:72` (`.traced:focus-visible`).
§2.6 deletes the token. An earlier draft of §10 scheduled that deletion at Step 3 and
supplied `outline` rules only for `.nav a`, `.button`, `.input`, `.traced`, `.schedule`
and `.margin-tally` — there was **no global rule anywhere in the document**. Deleting the
token without this section makes all three declarations invalid at computed-value time:
`box-shadow` unset, no ring, no focus indication, on a form-heavy nine-step flow. That is
a 2.4.7 and a 2.4.11 regression, and none of `typecheck`, `test`, `shots` or `smoke` can
see it. So the replacement is written first and lands in the same commit.

```css
/* Removing focus rings is the single most common accessibility regression, so this
   is stated at the top of the pattern set rather than left implicit — and it is a
   plain `outline`, not a two-ring box-shadow whose inner halo hard-codes a ground.
   An outline with an offset composites correctly over ANY of the nine grounds, so
   --accent-focus is measurable as a single foreground against each of them (§3.1),
   which is the whole reason --focus-ring goes. */
:focus-visible {
  outline: var(--focus-width) solid var(--accent-focus);
  outline-offset: var(--focus-offset);
  border-radius: var(--radius-sm);
}
/* A label wrapping an input: the ring belongs on the label, not the invisible file
   input inside it. Replaces app.css:920. */
.dropzone__label:focus-within {
  outline: var(--focus-width) solid var(--accent-focus);
  outline-offset: var(--focus-offset);
  border-radius: var(--radius-lg);
}
/* The per-component `:focus-visible` rules in §6.1, §6.7, §6.10 and §6.11 are
   REDUNDANT with this one and are kept anyway: each of those elements changes its
   own border-radius, and a ring that follows the corner is the difference between
   a focus indicator and a rectangle drawn near one. None of them removes the
   outline; a rule that sets `outline: none` without replacing it fails Step 3. */
```

The gate is not a screenshot. **Tab through every route with `pnpm dev`, confirm a
visible ring on every focusable element in both themes, and then `grep -r "focus-ring"
apps/web/src` must return nothing.** A grep that still finds it means the token was
deleted and a consumer was not, which is the exact failure this section prevents.

### 6.1 Nav — sticky, opaque, and it earns the space

The current bar sets `color-mix(in srgb, var(--surface-raised) 82%, transparent)` with
`backdrop-filter: blur(10px)`, so its effective ground is whatever scrolls underneath.
Its `--text-secondary` links have **no measurable background at all** — a self-declared
unresolvable pair, and this repo's own rule is that unresolvable counts as a failure
and not a skip. Refusing the effect *removes* an unmeasurable pair rather than adding
one. A drawing passes behind a title block at a hard edge; it does not dissolve into it.

```css
.nav {
  position: sticky;
  inset-block-start: 0;
  z-index: var(--z-sticky);
  background: var(--surface-raised);
  border-block-end: var(--border-width) solid transparent;
}
/* The one piece of scroll-driven state in the product, and it moves nothing: a
   nav that resizes on scroll moves every link out from under the cursor. */
.nav[data-scrolled='true'] { border-block-end-color: var(--border-default); }
@media (prefers-reduced-motion: no-preference) {
  .nav { transition: border-color var(--duration-base) var(--ease-standard); }
}

.nav__inner {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: var(--space-3) var(--space-5);
  min-block-size: var(--control-h-lg);
  padding-block: var(--space-2);
}
.nav a {
  display: inline-flex; align-items: center;
  min-block-size: var(--tap-min);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-decoration: none;
  border-block-end: var(--border-width-emphasis) solid transparent;
}
.nav a:hover { color: var(--text-primary); border-block-end-color: var(--border-strong); }
.nav a[aria-current] { color: var(--text-primary); border-block-end-color: var(--accent); }
.nav a:focus-visible {
  outline: var(--focus-width) solid var(--accent-focus);
  outline-offset: var(--focus-offset);
  border-radius: var(--radius-sm);
}

/* The masthead: the deployment's own state, permanently, in the most-repeated
   position on the site. This is the rare case where the premium editorial ornament
   and the product's central refusal are the same element — a metadata strip whose
   honest content is RULES APPROVED 0 / DEFINITIONS SIGNED 0 / REGULATORY VALIDITY
   NOT ASSESSED. Counted over SEED_RULES, never over loadSeedRulesForDevelopment,
   which stamps every rule APPROVED / DEVELOPMENT-ONLY-NOT-A-REAL-APPROVER and
   reported 13 of 13 on a deployment whose real number is zero. */
.masthead {
  background: var(--surface-base);
  border-block-end: var(--border-width) solid var(--border-subtle);
}
.masthead__inner {
  display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-5);
  padding-block: var(--space-1);
  font-family: var(--font-mono); font-size: var(--text-xs);
  text-transform: uppercase; letter-spacing: var(--tracking-label);
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums lining-nums;
}
.masthead dd { margin: 0; color: var(--text-primary); }
/* NOT ASSESSED never drops, at any width. */
.masthead__validity { margin-inline-start: auto; color: var(--variance); }
/* The crossed square, drawn in §7.5. It is not an empty rule with a comment: the
   <svg class="mark"> is in the markup and its path is specified. --variance is
   never alone here, on screen or on a photocopy. */
.masthead__validity .mark { margin-inline-end: var(--space-2); }

@media (max-width: 48rem) {          /* --bp-md */
  .nav__links { display: none; }     /* dropped, not hamburgered — see §9 */
  .masthead__inner > :nth-child(n+3):not(.masthead__validity) { display: none; }
}
@media print { .nav { display: none; } }
```

**Z-index.** `--z-raised`, `--z-sticky` and `--z-overlay` are declared in the §2.4
token block, not described here. That is the point of the sentence this paragraph used
to be: a pattern that references an *undefined* custom property is worse than a literal,
because the declaration becomes invalid at computed-value time and the element silently
loses its stacking — and a token file is the only place a declaration counts. The same
correction applies to `--weight-light`, now declared in §2.8 rather than described in a
sentence, and used by `.hero h1`, `.hero__lede` and `.section__head h2`.

**`data-scrolled` needs eight lines of JavaScript, and here they are.** Calling it "the
one piece of scroll-driven state in the product" without saying what sets it leaves a
pattern that cannot be built. It goes in `<Shell>`, next to the nav it belongs to:

```tsx
// A 1px sentinel above the nav. IntersectionObserver rather than a scroll
// listener: no per-frame work, and no layout read on the main thread.
const sentinel = useRef<HTMLDivElement>(null);
useEffect(() => {
  const el = sentinel.current;
  if (!el) return;
  const io = new IntersectionObserver(
    ([e]) => navRef.current?.setAttribute('data-scrolled', String(!e.isIntersecting)),
  );
  io.observe(el);
  return () => io.disconnect();
}, []);
```

If the effect never runs — no JS, an error before hydration — the attribute is absent,
the border stays `transparent`, and the nav looks exactly as it does today. The failure
mode of this feature is the current design, which is the only acceptable failure mode
for a decoration (§8).

**320px:** links hidden, masthead wraps to two rows rather than compressing targets
below `--tap-min`, `NOT ASSESSED` survives.

### 6.2 One state layer — eight states, and every legacy name has a home

Five naming systems collapse into one vocabulary. `--uncertain` is currently reached
through modifiers called `warn`, `blocked`, `partial`, `assumed`, `pending` and
`uncertain`; `--variance` through `danger`, `never` and `blocked`; `--derived` through
`ok`, `supported` and `done`. This is what makes the amber rule verifiable **once**
instead of auditable per component, and it is the precondition for
`assertAmberExclusive` (§3.3).

An earlier draft supplied six states for fifteen names, and four of the nine unhoused
amber declarations were the five-way claim statement's `partial` verdict. A consolidation
that cannot absorb the names it is consolidating is a seventh naming system. So: eight
states, and a migration table below in which every one of the fifteen has a target and a
reason.

```css
/* `transparent` is never written as a state surface. A foreground on a transparent
   ground is an unresolvable pair, and this repo counts unresolvable as a FAILURE and
   not a skip (§3.3, ratioOf). A state that has no fill names the ground it inherits
   instead, so the checker resolves it and §3.1 declares it. */
[data-state] {
  --rail-color: var(--state);
  --rail-width: var(--rail-w);
  --state-surface: var(--surface-inset);
}

/* ASSUMED, and the 6px rail is its alone. See §2.5 for why this is not a
   preference: §7.4(c) rests the greyscale and photocopy argument on 6px reading as
   a POSITION, and position stops identifying ASSUMED the moment a second state
   shares the width. assertRailWidths (§3.3) fails the build on any other selector
   reaching for --rail-w-emphasis. */
[data-state='assumed'] {
  --state: var(--uncertain);
  --state-strong: var(--uncertain-strong);
  --state-surface: var(--uncertain-surface);
  --state-border: var(--uncertain-border);
  --rail-width: var(--rail-w-emphasis);
}
/* PARTIALLY SUPPORTED — the claim-statement verdict, and the ONLY other amber in
   the system. It is a state of its own rather than an alias of `assumed`: mapping
   it onto `assumed` would relabel a claim verdict as an assumption, which is a copy
   change to §16.5's own sentence; mapping it onto `deferred` would take the amber
   off a verdict that is literally an uncertainty. It shares the ink and NOT the
   6px rail — 3px, so ASSUMED keeps the width to itself. */
[data-state='partial'] {
  --state: var(--uncertain);
  --state-strong: var(--uncertain-strong);
  --state-surface: var(--uncertain-surface);
  --state-border: var(--uncertain-border);
}
[data-state='derived']  { --state: var(--derived);  --state-strong: var(--derived);
                          --state-surface: var(--derived-surface);
                          --state-border: var(--derived); }
[data-state='variance'] { --state: var(--variance); --state-strong: var(--variance);
                          --state-surface: var(--surface-raised);
                          --state-border: var(--variance-border); }
/* BLOCKED — the engine refusing to compute, and the new state that takes amber off
   four live declarations. See the table. Same ink as VARIANCE, different name,
   because "we will not claim this" and "we cannot answer this" are different
   sentences and the report says both. */
[data-state='blocked']  { --state: var(--variance); --state-strong: var(--text-primary);
                          --state-surface: var(--surface-raised);
                          --state-border: var(--variance-border); }
[data-state='deferred'] { --state: var(--deferred);  --state-strong: var(--deferred);
                          --state-surface: var(--deferred-surface);
                          --state-border: var(--deferred-hatch); }
/* BINDING keeps the 3px rail. It is the loudest non-uncertainty state and it is
   still narrower than ASSUMED, by design and by assertion. */
[data-state='binding']  { --state: var(--accent);   --state-strong: var(--text-primary);
                          --state-surface: var(--accent-subtle);
                          --state-border: var(--accent); }
/* The neutral rail is --border-strong at 3:1, NOT --border-default at 1.5:1. A
   stripe that is informative when coloured is informative when neutral, because
   "no state" is information. */
[data-state='neutral']  { --state: var(--border-strong);
                          --state-strong: var(--text-secondary);
                          --state-surface: var(--surface-raised);
                          --state-border: var(--border-default); }

/* The three fill-less states inherit their ground, so on a sunken block they have to
   be told which ground that is — otherwise --state-surface names a white that is
   not there. Both grounds are declared for every state ink in §3.1. */
.section--zoned [data-state='variance'], .plate--flush [data-state='variance'],
.section--zoned [data-state='blocked'],  .plate--flush [data-state='blocked'],
.section--zoned [data-state='neutral'],  .plate--flush [data-state='neutral'] {
  --state-surface: var(--surface-sunken);
}
```

#### The migration table — all fifteen names

The default when a mapping is genuinely a product question is **not amber**. NN#1 reserves
amber for uncertainty and nothing else, so painting it on a node that is not an
uncertainty dilutes the one signal §13.1 exists to protect. Erring away from amber
strengthens the rule; erring toward it is the softening, one call site at a time.

| legacy | where | becomes | why |
|---|---|---|---|
| `.chip--assumed` | app.css:480 | `assumed` | — |
| `.chip--warn` | app.css:482 | **deleted** | byte-identical to `.chip--assumed`, both live |
| `.banner--assumed` | app.css:969 | `assumed` | `role="note"` about assumptions ×4 call sites |
| `.prov-assumption` | app.css:876 | `assumed` | an ASSUMED entry in the derivation panel |
| `.traced--assumed` | provenance.css | `assumed` | the canonical case |
| `.claim--partial` | app.css:711 | `partial` | five-way claim verdict |
| `.lp-claim--partial` | landing.css:648 | `partial` | same verdict, landing |
| `.lp-status--partial` | landing.css:633 | `partial` | same verdict, glyph row |
| `.stat--partial` | landing.css:899 | `partial` | same verdict, status page |
| `.banner--blocked` | app.css:536 | `blocked` | **amber comes off.** Three call sites: "The engine stopped here" (App.tsx:568), "The status page could not load" (Dashboard.tsx:54), "The two areas disagree by more than 2%" (ParametersStep.tsx:42). None is an ASSUMED value; two are refusals and one is an error. |
| `.gate-status--pending` | app.css:722 | `blocked` | **amber comes off.** "Rules cannot resolve until this is confirmed" (ParametersStep.tsx:105) and "Read these before exporting" (AssumptionRegister.tsx:122). An unmet gate is a step not taken, not a value assumed — and the assumptions themselves are already amber in the rows below it, so the banner was duplicating the cue and diluting it. |
| `.edge-list__item.is-unset` | app.css:789 | `blocked` | **amber comes off.** `edge.classification === ''` (PlotForm.tsx:243). ParametersStep says it in words: "Rules cannot resolve until this is confirmed — they key on the edge classifications above." An unclassified edge blocks; it does not assume. |
| `.reason-list--uncertain` | app.css:964 | `deferred` | **amber comes off, and this one was mislabelled in its own comment** — "Amber for what was not assessed". It renders `levelPlan.notAssessed` (ParkingPlan.tsx:372, AffectionPlanIntake.tsx:326, RulesStep.tsx:479). NOT ASSESSED has its own ink, its own hatch and its own italic. |
| `.lp-verdict` | landing.css:518 | `neutral` | **amber comes off, and a third rail width goes with it** — it draws a **2px** amber stripe, which §2.5 says does not exist. Landing.tsx:453 is an editorial conclusion drawn from the run ("Parking governs this plot, not the code"), not an uncertainty. It becomes a `--border-strong` 3px pull-out. |
| `.callout--warn` | app.css:546 | **per call site** | one class over four meanings, which is the defect this section closes. `ChecksStep.tsx:107` (the self-consistency notice) → `variance`. `ParkingPlan.tsx:327` ("No frontage on this plot can take a vehicle access… a finding about the plot, not a failure of the run") → `blocked`. `App.tsx:728` (`podiumImplication` when the parking does not fit) → `blocked`. `RulesStep.tsx:471` (`scenario.rangeNote` — a rule that states a RANGE) → `assumed`, because a range resolved to a working value is exactly what `assumed()` is for; **confirm this one at the call site before Step 5**, and if the engine does not resolve it, it is `deferred`. |

`.parking-legend__swatch--ramp` and `.sensitivity__bar` are the two amber declarations
that are not modifier names; both are settled in §3.3, one kept and one moved.

### 6.3 Hero (frontispiece)

Of the six conventional premium hero parts, four survive — eyebrow, headline, lede,
CTA pair. The product screenshot in a device frame is replaced by the plan drawing
rendered in the kernel's own coordinates, because the artefact of this product **is** a
drawing and a device frame would advertise an app when the deliverable is a document.
The logo wall is refused outright: there are no customers, and a logo row is a claim.

`repeat(auto-fit, minmax(23rem, 1fr))` gives two equal columns and therefore no entry
point. Committed asymmetry: 0.85fr of argument against 1.15fr of artefact.

```css
.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: clamp(var(--space-5), 4vw, var(--space-8));
  align-items: center;
  padding-block: var(--rhythm-major) var(--rhythm-minor);
}
.hero__copy, .hero__figure { min-inline-size: 0; }
.hero h1 {
  font-size: var(--text-4xl);
  font-weight: var(--weight-light);          /* Carbon's and Stripe's display
                                                register; 600 is the convention
                                                both explicitly reject (§2.8) */
  line-height: var(--leading-display);
  letter-spacing: var(--tracking-banner);
  /* 15ch. It caps the headline at desktop, where an uncapped 61px H1 would run
     the full 78rem column and read as a banner rather than a sentence. It is NOT
     what prevents the 320px overflow, and saying so was wrong by arithmetic:
     Plex Sans's digit advance is 0.6em, so 15ch at the H1's 36px floor computes
     to 15 x 0.6 x 36 = 324px against a 288px column. The cap is INACTIVE below a
     viewport of about 356px (column = v - 32 >= 324). What actually holds the
     line at 320px is the grid track — minmax(0, 1fr) plus min-inline-size: 0
     on .hero__copy — and normal wrapping. §4.1 does this arithmetic correctly
     for the figure (twelve mono characters at 28px = 201.6px); the method was
     available here and simply was not applied. */
  max-inline-size: var(--measure-banner);
  text-wrap: balance;
  overflow-wrap: break-word;                 /* backstop for a pathological token */
  margin-block-end: var(--rhythm-block);
}
.hero__lede {
  font-size: var(--text-lg); font-weight: var(--weight-light);
  line-height: var(--leading-relaxed);
  color: var(--text-secondary);
  max-inline-size: var(--measure-lede);
  text-wrap: pretty;
}
.hero__lede + .hero__lede { margin-block-start: var(--space-4); }

@media (max-width: 64rem) {   /* --bp-lg */
  .hero { grid-template-columns: minmax(0, 1fr); }
  /* THE ARTEFACT GOES FIRST ON A PHONE. It is the thing that proves the claim,
     and a reader who has scrolled past three paragraphs to reach it has already
     decided. */
  .hero__figure { order: -1; }
}
```

**320px:** one column, drawing first, H1 at its 36px floor. The 15ch cap computes to
324px there and is therefore inactive; the 288px grid track is what holds it, and the
headline wraps rather than overflowing.

### 6.4 Section head — eyebrow and index

The margin index is the strongest editorial mechanic already on the site. Three things
finish it: a **denominator** (a fact about the page, never a claim about the engine, so
it is safe to state), `tabular-nums` which its structural twin `.lp-limit__n` already
has 300 lines away, and cap-height alignment instead of a guessed `padding-top: 0.35em`.

It also **loses its own 2px rule**, because the section now owns the only horizon (§5.1).

```css
.eyebrow {
  display: inline-flex; align-items: center; gap: var(--space-3);
  font-family: var(--font-mono); font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase; letter-spacing: var(--tracking-label);
  color: var(--text-tertiary);
  margin-block-end: var(--space-4);
}
/* A hairline, not a dot, and NOT in the interactive colour. tokens.css states its
   own rule — "One blue. Interactive affordance and nothing else" — and a
   non-interactive decoration painted in the interactive colour is the same
   category of error as an amber logo, one register quieter. Where a section index
   exists the eyebrow is deleted entirely: the number is the marker. */
.eyebrow::before {
  content: ''; flex: none;
  inline-size: var(--space-5); block-size: var(--border-width);
  background: var(--border-strong);
}

.index {                              /* lives in .railed__margin; aria-hidden,
                                         because "01" read before a heading is noise */
  display: block;
  font-family: var(--font-mono); font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  font-variant-numeric: tabular-nums lining-nums slashed-zero;
  line-height: var(--leading-flat);
  letter-spacing: var(--tracking-normal);
  color: var(--text-tertiary);
  padding-block-start: 0.18em;        /* fallback; removed under text-box */
}
.index__of { color: var(--border-strong); font-weight: var(--weight-normal); }

.section__head h2 {
  font-size: var(--text-3xl);
  font-weight: var(--weight-light);
  line-height: var(--leading-head);
  letter-spacing: var(--tracking-display);
  text-wrap: balance;
}
/* A text box is taller than the caps inside it, so a numeral or rule aligned to
   the box always sits visibly low against the letterforms it is meant to align
   with. Trimming it puts the index's cap-line and the heading's cap-line on one
   horizon. Invisible individually; it is most of what makes a page look drawn. */
@supports (text-box: trim-both cap alphabetic) {
  .index { padding-block-start: 0; text-box: trim-both cap alphabetic; }
  .section__head h2 { text-box: trim-both cap alphabetic; }
}

@media (max-width: 48rem) {
  .index { font-size: var(--text-sm); margin-block-end: var(--space-2); }
}
```

**320px:** the rail folds; the index sits inline above the heading, still reading
`04 / 07`.

### 6.5 Plate (card) and feature grid

`.panel` is the only container in the product — 27 instances, one 1px edge, one
radius, one padding, no shadow — used for the governing capacity, a 3D massing view, a
ten-row check table and a two-line note alike. `.shots/07-checks.png` is five identical
grey blocks in which "Regulatory validity — NEVER CLAIMED" has the same visual mass as
"INV-14 pass". A premium theme varies container weight with content weight.

Depth without shadow: a 2px ink cap. It works identically in light, in dark (where a
black shadow on `#121215` is invisible) and on paper (where every shadow is `none`).

```css
.plate {
  position: relative;
  display: flex; flex-direction: column; gap: var(--space-4);
  padding: clamp(var(--space-4), 3vw, var(--space-5));
  background: var(--surface-raised);
  border: var(--border-width) solid var(--border-default);
  border-radius: var(--radius-lg);
  min-inline-size: 0;
  break-inside: avoid;
  /* No box-shadow, and no inner highlight either. --edge-lift is not in the
     palette (§2.6): it was unmeasurable by construction, which is the same
     reason --focus-ring goes. The dark plate has an edge without it —
     --border-default is repaired to 1.78:1 and the cap below measures 4.60. */
}
.plate::before {                       /* the cap */
  content: '';
  position: absolute;
  inset-block-start: calc(var(--border-width) * -1);
  inset-inline: calc(var(--border-width) * -1);
  block-size: var(--border-width-emphasis);
  background: var(--border-strong);
  border-start-start-radius: var(--radius-lg);
  border-start-end-radius: var(--radius-lg);
}
.plate--quiet::before { background: var(--border-default); }
.plate--flush {                        /* a sub-block inside a plate */
  background: var(--surface-sunken); border-color: transparent;
  padding: var(--space-4);
}
.plate--flush::before { content: none; }

/* The status rail: ONE primitive replacing seventeen implementations at six
   widths with two corner treatments. */
.plate[data-state] {
  border-inline-start-width: var(--rail-width);   /* [data-state] sets the default */
  border-inline-start-color: var(--rail-color);
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
.plate[data-state]::before { border-start-start-radius: 0; }

/* The panel header, hand-written verbatim in TWENTY places with an anonymous
   load-bearing <div> that nothing can style — which is why
   `.panel__header-actions > .chip:first-child { margin-left: 0 }` had to exist
   as a patch. */
.plate__header {
  display: grid; grid-template-columns: minmax(0, 1fr) auto;
  align-items: start; gap: var(--space-3) var(--space-4);
}
.plate__title {
  font-size: var(--text-lg); font-weight: var(--weight-medium);
  line-height: var(--leading-tight); letter-spacing: var(--tracking-tight);
  text-wrap: balance;                 /* app.css has ZERO text-wrap declarations
                                         today, so every panel title in the
                                         nine-step flow still makes the two-word
                                         orphans the landing page already fixed */
}
.plate__subtitle {
  margin-block-start: var(--space-1);
  font-size: var(--text-sm); color: var(--text-secondary);
  max-inline-size: var(--measure-fine); text-wrap: pretty;
}
.plate__actions { display: flex; flex-wrap: wrap; gap: var(--tap-gap-min); min-inline-size: 0; }
.plate__footer {
  display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3);
  padding-block-start: var(--space-4);
  border-block-start: var(--border-width) solid var(--border-subtle);
}

/* The feature grid. min(...) is the part that matters: a bare minmax(20rem, 1fr)
   forces a 320px track into a 288px column and pushes a horizontal scrollbar. */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
  gap: var(--space-4);
}
.grid--lead { grid-template-columns: repeat(auto-fit, minmax(min(17rem, 100%), 1fr)); }
.grid--lead > .plate--lead { grid-column: span 2; }
@media (max-width: 48rem) {
  /* `span 2` on a one-column grid is an overflow, not a span. */
  .grid--lead > .plate--lead { grid-column: span 1; }
}

/* The chip. Referenced in §3.3, §6.7 and §10 and previously never specified — it is
   the component --state-surface, --state-strong and --state-border exist for, so
   three tokens had no consumer and one pattern had no definition. It is the ONE
   documented use of --radius-pill.
   Every state that has no fill resolves --state-surface to the ground it inherits
   (§6.2), so a "fill-less" chip is a ruled chip and not a transparent one, and the
   pair the checker measures is real. */
.chip {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: 0.1em 0.5em;
  font-size: var(--text-xs); font-weight: var(--weight-medium);
  white-space: nowrap;
  color: var(--state-strong, var(--text-secondary));
  background: var(--state-surface);
  border: var(--border-width) solid var(--state-border, transparent);
  border-radius: var(--radius-pill);
}
/* No margin. A chip is placed by .plate__header or .plate__actions, never by
   itself — which is what `.panel__header-actions > .chip:first-child` was patching
   around. PLACEMENT OWNS INSET (§5.2). */
.chip .mark { color: var(--state); }

/* The refusal block. Named in §5.1's sibling selectors and, until now, nowhere
   else. It is what §9 is made of and what CLAUDE.md requires the landing page to
   carry: "what it does not do" as a section longer than the feature list. It is
   NOT a callout — a callout interrupts an argument, a refusal IS the argument —
   so it takes a plate's weight and a datum rule rather than a rail. */
.refusal {
  display: grid; gap: var(--space-3);
  padding-block: var(--space-5);
  border-block-start: var(--border-width-emphasis) solid var(--border-strong);
  break-inside: avoid;
}
.refusal__title {
  font-size: var(--text-lg); font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-tight); text-wrap: balance;
}
.refusal p {
  font-size: var(--text-sm); line-height: var(--leading-relaxed);
  color: var(--text-secondary);
  max-inline-size: var(--measure-fine); text-wrap: pretty;
}
/* A refusal is never amber, never red and never a warning graphic. It is a
   decision the product made on purpose, set in ink, and typographic weight is the
   whole treatment. Painting it as a state would make a deliberate choice read as
   a fault. */

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .plate--interactive {
    transition: border-color var(--duration-base) var(--ease-standard),
                background-color var(--duration-base) var(--ease-standard);
  }
  /* Hover changes border and ground only. A plate that LIFTS is a shadow
     argument, and this language does not make one. */
  .plate--interactive:hover { border-color: var(--border-strong); background: var(--surface-base); }
}
@media print { .plate { box-shadow: none; border-color: var(--text-secondary); } }
```

**320px:** padding drops to 16px; the 2px cap is unchanged and is what still
distinguishes a plate from the ground; every grid collapses to one column.

### 6.6 Data figure — caption, spec and source

"A drawing in a frame" is framed four different ways: `.plot-svg` (sunken, radius-md,
padded, **no border**), `.parking-plan__svg` (sunken, bordered, **no padding**),
`.massing-viewer` (bordered, clamped height), `.lp-figure` (raised, radius-lg,
bordered, shadowed, inner plate). Four radius/border/padding/elevation combinations for
one job, which is why the four figures do not read as one family. The landing's version
is the good one, and naming it carries the drawing-sheet register into the engine at
close to zero risk.

```css
.figure {
  margin: 0;
  background: var(--surface-raised);
  border: var(--border-width) solid var(--border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  /* The same figure appears full-width in the hero and half-width in a contained
     demo, so it reflows to its FRAME and not to the viewport. */
  container-type: inline-size;
  break-inside: avoid;
}
/* PADDING IS SYMMETRIC IN THE BLOCK AXIS, and that is not a taste. The corners
   below are absolutely positioned pseudo-elements, so they paint ABOVE the
   non-positioned <svg> — a positioned descendant is painted in step 8 of the
   painting order and in-flow content in steps 4-7. Any part of a corner that
   reaches inside the content box therefore lands ON THE DRAWING.
   THE INVARIANT, on every edge, at every container width:  inset + size <= padding.
   An earlier draft had 32/24/16 with a 12px inset and a 12px corner: 12 + 12 = 24
   against a 16px bottom padding, an 8px intrusion into a plan view. */
.figure__plate {
  position: relative;
  padding: var(--space-6) var(--space-5);   /* 32 block, 24 inline */
  background: var(--surface-sunken);
  border-block-end: var(--border-width) solid var(--border-subtle);
}
/* Registration corners. Two L-shaped ticks that tell a reader this rectangle is a
   drawing rather than a card. They cost no colour, they print, they survive
   greyscale, and no icon package is involved. */
.figure__plate::before, .figure__plate::after {
  content: ''; position: absolute;
  inline-size: var(--tick-lg); block-size: var(--tick-lg);   /* 12 */
  border: var(--border-width) solid var(--border-strong);
}
.figure__plate::before {
  /* 12 + 12 = 24 <= 32 block, <= 24 inline. */
  inset-block-start: var(--space-3); inset-inline-start: var(--space-3);
  border-inline-end-color: transparent; border-block-end-color: transparent;
}
.figure__plate::after {
  inset-block-end: var(--space-3); inset-inline-end: var(--space-3);
  border-inline-start-color: transparent; border-block-start-color: transparent;
}
.figure__plate > svg, .figure__plate > canvas {
  display: block; inline-size: 100%; block-size: auto;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums lining-nums;
}

.figure__caption { padding: var(--space-4) var(--space-5) var(--space-5); }
.figure__label {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-2) var(--space-4);
  padding-block-end: var(--space-3);
  border-block-end: var(--border-width-emphasis) solid var(--border-strong);
  font-family: var(--font-mono); font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase; letter-spacing: var(--tracking-label);
  color: var(--text-tertiary);
}
.figure__label .figure__no { color: var(--text-primary); }

.figure__spec { margin: var(--space-3) 0 0; }
.figure__spec > div {
  display: grid; grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline; gap: var(--space-4);
  padding-block: var(--space-2);
  border-block-end: var(--border-width) solid var(--border-subtle);
}
/* A separator separating nothing. Exactly ONE :last-child rhythm rule exists in
   the codebase today and it is the one that deliberately ADDS a closing rule; every
   other trailing interior rule draws against the container's own padding. This is
   the class of detail a reader cannot name and can see. */
.figure__spec > div:last-child { border-block-end: none; padding-block-end: 0; }
.figure__spec dt { font-size: var(--text-sm); color: var(--text-secondary); min-inline-size: 0; }
.figure__spec dd { margin: 0; font-size: var(--text-sm); }

/* The source line. A plate in a real report cites where its numbers came from, and
   so does this one: engine build, annex version, and REGULATORY VALIDITY —
   NOT ASSESSED. The one piece of mandatory ornament whose honest content is the
   product's central refusal. */
.figure__source {
  display: block;
  margin-block-start: var(--space-4); padding-block-start: var(--space-3);
  border-block-start: var(--border-width) solid var(--border-subtle);
  font-family: var(--font-mono); font-size: var(--text-xs);
  text-transform: uppercase; letter-spacing: var(--tracking-label);
  color: var(--text-tertiary);
  overflow-wrap: anywhere;
}

@container (max-width: 26rem) {
  .figure__plate { padding: var(--space-4); }                    /* 16 */
  /* The corners step down AND move in, so the invariant holds at the narrow width
     too: 8 + 8 = 16 <= 16. Stepping the size down while leaving the inset at 12
     gives 20 against 16 — a 4px intrusion on all four sides, which is the same
     defect as the first version and harder to see. */
  .figure__plate::before, .figure__plate::after {
    inline-size: var(--tick); block-size: var(--tick);           /* 8 */
  }
  .figure__plate::before { inset-block-start: var(--space-2); inset-inline-start: var(--space-2); }
  .figure__plate::after  { inset-block-end: var(--space-2);   inset-inline-end: var(--space-2); }
  .figure__caption { padding: var(--space-4); }
  .figure__spec > div { grid-template-columns: minmax(0, 1fr); gap: var(--space-hair); }
}
```

**320px:** the SVG scales by `viewBox`; the existing per-breakpoint SVG user-unit type
sizes are retained, which keeps the drawing's own labels above the 12px floor at the
cost of a chunkier drawing — the right trade.

### 6.7 Table (schedule)

Three defects close here. (a) `.panel > .data-table { display: block }` makes the
element a block box whose *internal* table box shrink-wraps, so `width: 100%` applies
to the block and not to the table — which is why the assumption register's table stops
at x≈836 inside a panel whose inner edge is at x≈1280, leaving **444px of dead space**
with a full-width footer rule running beneath it. The overflow guard for a wide table
was preventing a narrow one from filling. (b) The last body row draws an interior rule
against the panel's own padding. (c) The numbers are not aligned down the column.

```css
.schedule { overflow-x: auto; }        /* the FRAME scrolls; the table stays a table */
.schedule:focus-visible {
  outline: var(--focus-width) solid var(--accent-focus); outline-offset: var(--focus-offset);
}
.schedule > table {
  inline-size: 100%; border-collapse: collapse; font-size: var(--text-sm);
}
.schedule th, .schedule td {
  padding: var(--space-3) var(--space-4);
  text-align: start; vertical-align: baseline;
  border-block-end: var(--border-width) solid var(--border-subtle);
}
/* The header sits under an ink rule and the body rules are hairlines, so the
   table has a TOP rather than a uniform grid. */
.schedule thead th {
  font-family: var(--font-mono); font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase; letter-spacing: var(--tracking-label);
  color: var(--text-tertiary); white-space: nowrap;
  border-block-end: var(--border-width-emphasis) solid var(--border-strong);
}
.schedule tbody tr:last-child > * { border-block-end: none; }
.schedule tfoot > tr > * {
  border-block-start: var(--border-width-emphasis) solid var(--border-strong);
  border-block-end: none;
}
/* Flush to the sheet, so the first column sits on the rail the prose above it uses. */
.schedule th:first-child, .schedule td:first-child { padding-inline-start: 0; }
.schedule th:last-child,  .schedule td:last-child  { padding-inline-end: 0; }

.schedule__rank { color: var(--text-tertiary); font-family: var(--font-mono); }
.schedule__fill { inline-size: 100%; color: var(--text-secondary); }
.schedule__fill p { max-inline-size: var(--measure-fine); text-wrap: pretty; }
/* The rank column is EXCLUDED here rather than fighting for it. Written as
   `.schedule__rank { inline-size: var(--rail) }` the rank rule is (0,1,0) against
   this rule's (0,2,1) and loses, and it loses silently: the column shrink-wraps to
   two digits and the one item §5.3 names as proof of the shared rail — "the
   schedule's rank column" — is not on the rail at all. Excluding it makes the
   width declaration below (0,1,0) the only one that applies. */
.schedule th:not(.schedule__fill):not(.schedule__rank),
.schedule td:not(.schedule__fill):not(.schedule__rank) { inline-size: 1%; }
.schedule__rank { inline-size: var(--rail); }

/* With a fixed decimal count per unit (§4.4), the unit gets its own track and both
   the decimals and the units line up down the column. */
.schedule__num { text-align: end; }
.schedule__num .value {
  display: inline-grid; grid-template-columns: 1fr auto; gap: 0.15em; justify-items: end;
}

/* NOT ASSESSED rows. THE HATCH IS NOT USED HERE, and the reason is geometric
   rather than aesthetic: a hatch is a leading BAND and a leading band needs
   leading PADDING, but the first cell of this table is flush to the rail
   (padding-inline-start: 0) so that the rank column sits on it. Restoring the
   padding for one row indents that row's first column by 24px while every other
   row stays flush — and `.schedule tr[data-state='deferred'] > *:first-child`
   (0,3,1) beats `.schedule td:first-child` (0,2,1), so it wins silently. The
   flush rail breaks on exactly the rows a reader is being asked to trust least.

   The row keeps FOUR channels and three of them are non-colour: its own ground,
   real italic, a DASHED rule instead of a hairline, and the hollow-ring mark in
   the rank cell. That is one more non-colour cue than the hatch version had, not
   one fewer. The hatch stays where there is padding for it — `.empty` (§6.12) and
   `.not-assessed` — and §7.2's cue table says so. */
.schedule tr[data-state='deferred'] > * {
  background-color: var(--deferred-surface);
  color: var(--text-secondary);
  font-style: italic;
  border-block-end-style: dashed;
  border-block-end-color: var(--border-control);   /* 3.45 / 4.11 / 7.00 on this ground */
}
.schedule tr[data-state='deferred'] .schedule__rank .mark { color: var(--deferred); }

/* --bp-sm 40rem. A schedule becomes a stack of ruled records. NOT a sideways
   scroll: a horizontal scrollbar at 320px is where every accessibility defect in
   this project has been found. */
@media (max-width: 40rem) {
  /* `th` is in this list, and its absence was a real defect. Two paragraphs below,
     this section MANDATES <th scope="row"> on the row header. Left as a table-cell
     inside a block `tr` it generates an anonymous table box, never becomes a
     labelled grid row, and `td::before` does not match it — so at <=40rem the one
     cell that names the record is the one cell with no label. */
  .schedule > table, .schedule tbody, .schedule tr,
  .schedule tbody th, .schedule td { display: block; inline-size: 100%; }
  /* The repo's own .sr-only recipe, not the textbook one: an absolutely positioned
     hidden element at its static position inside a scrolled region is not clipped
     and silently extends scrollWidth. */
  .schedule thead {
    position: absolute; inset: 0 auto auto 0;
    inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%);
  }
  .schedule tbody tr {
    padding-block: var(--space-4);
    border-block-end: var(--border-width) solid var(--border-default);
  }
  .schedule tbody tr:last-child { border-block-end: none; }
  .schedule tbody th, .schedule td {
    display: grid;
    grid-template-columns: minmax(0, var(--label-col)) minmax(0, 1fr);
    gap: var(--space-hair) var(--space-4);
    padding: var(--space-1) 0; border: none;
    text-align: start;
  }
  .schedule tbody th { font-weight: var(--weight-medium); }
  .schedule tbody th::before, .schedule td::before {
    content: attr(data-label);
    font-family: var(--font-mono); font-size: var(--text-xs);
    text-transform: uppercase; letter-spacing: var(--tracking-label);
    color: var(--text-tertiary);
  }
  /* The dashed row rule moves to the record boundary, where it is still the cue. */
  .schedule tbody tr[data-state='deferred'] { border-block-end-style: dashed; }
  .schedule__num { text-align: start; }
  .schedule__num .value { display: inline; }
}
```

`data-label` is a **visual** re-emission only. The programmatic association is
unchanged and mandatory: `<th scope="col">` on every header, `<th scope="row">` on the
row header, and `<caption class="sr-only">` on every table — all of which the DOM
already gets right across all nine steps, and none of which `display: block` disturbs
in any current screen reader.

**320px:** `9rem` label + `16px` gap + `128px` value = 288px. No horizontal scrollbar
at any width; the `.schedule` wrapper survives only for the single-unbreakable-cell case.

### 6.8 Callout

Fixes the two `.banner` defects. It sets **no outer margin** (§5.2). And it does not use
`justify-content: space-between`, which currently treats a `<strong>` and the text node
after it as the two ends of a row — so on every engine screen the bold lead-in is
squeezed into a 185px column and wraps onto two lines while the paragraph beside it
runs 1130px.

**It has no fill.** That is the decision that leaves the one filled block on any page to
amber (§7.2).

```css
.callout {
  display: grid; grid-template-columns: auto minmax(0, 1fr);
  align-items: start; gap: var(--space-3);
  margin: 0;                                     /* placement owns inset */
  padding: var(--space-4) var(--space-5);
  background: var(--surface-raised);
  border-block: var(--border-width) solid var(--border-default);
  border-inline-start: var(--rail-width, var(--rail-w)) solid var(--rail-color, var(--border-strong));
  font-size: var(--text-base); line-height: var(--leading-relaxed);
  color: var(--text-secondary);
}
.callout__mark { color: var(--state); }
.callout__body { min-inline-size: 0; max-inline-size: var(--measure-prose); }
.callout__body > strong {              /* on its own line: it is a lead-in, not a
                                          second column */
  display: block; margin-block-end: var(--space-2);
  color: var(--text-primary); font-weight: var(--weight-medium);
}
.callout__body p { text-wrap: pretty; }

/* VARIANCE is a 2px frame and a drawn mark. §20.3 says "Red border, evidence link"
   and says nothing about a fill; dropping it is CLOSER to the specification, not a
   softening — and it is what makes the one filled block on the page unambiguous. */
.callout[data-state='variance'] {
  border: var(--border-width-emphasis) solid var(--variance-border);
  border-inline-start-width: var(--rail-w);
  border-inline-start-color: var(--variance);
}
/* The exception, and the reason the rest have none. */
.callout[data-state='assumed'] {
  background: var(--uncertain-surface);
  border-block-color: var(--uncertain-border);
  color: var(--uncertain-strong);
}
.callout[data-state='assumed'] .callout__body > strong { color: var(--uncertain-strong); }

@media (max-width: 40rem) { .callout { padding: var(--space-4); } }
@media print { .callout { break-inside: avoid; border-color: var(--text-primary); background: none; } }
```

**320px:** two-column grid holds (the mark is `auto`, the body `minmax(0,1fr)`), so the
prose column can reach zero without pushing.

### 6.9 Meter

One primitive replacing four implementations at four heights, three radii, two fill
mechanisms and four fill colours — for one conceptual object: the magnitude of a
capacity band against the governing one.

```css
.meter {
  --meter-fill: var(--border-strong);
  position: relative;
  display: block; inline-size: 100%;
  block-size: var(--meter-h);
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
}
.meter__fill {
  display: block; block-size: 100%;
  inline-size: var(--meter-value, 0%);
  background: var(--meter-fill);
  border-radius: inherit;
  /* No transition. A magnitude that grows from zero on first paint is a number
     being performed (§8). */
}
/* The datum — where the governing value sits — so the bar answers "how far short"
   and not only "how long".
   It is a tick in the GUTTER ABOVE the track, drawn on the plate ground, NOT a
   line over the fill. A --border-strong tick crossing an --accent or --uncertain
   fill measures 1.34–1.96:1 (light 1.34 on the accent, 1.62 on the amber; dark
   1.44 and 1.96) and is invisible at exactly the position the reader is being
   asked to read. It is unmeasurable as well: no token pair can express "a stroke
   over a variable-width fill", so no checker would ever see it fail. In the gutter
   it is --border-strong on --surface-raised — 4.33 light, 4.60 dark, already in
   PAIRS. */
.meter__datum {
  position: absolute;
  inset-inline-start: var(--meter-datum, 100%);
  inset-block-end: 100%;
  inline-size: var(--border-width-emphasis);
  block-size: var(--tick);
  background: var(--border-strong);
}
.meter--lg { block-size: var(--meter-h-lg); }
.meter[data-state='binding'] { --meter-fill: var(--accent); }
.meter[data-state='assumed'] { --meter-fill: var(--uncertain); }

/* THE ASSUMED FILL IS STRIPED AS WELL AS AMBER, and this is the non-colour cue
   the meter was missing. An earlier draft separated assumed, binding and neutral
   by HUE ALONE — --uncertain against --accent against --border-strong, same
   height, same radius, no texture, no glyph — which fails 1.4.1, fails in
   greyscale, and fails for the ~8% of men with a colour vision deficiency, on the
   one graphic in the product that answers "how far short". §7.2's cue table had no
   row for it, which is how it went unnoticed.
   The pattern is the one this repo already uses at app.css:1003 for the ramp
   swatch: amber AND striped. --uncertain-surface over --uncertain measures 6.35 in
   light and 7.99 in dark, so the stripe is legible rather than a texture nobody
   can resolve at 8px. */
.meter[data-state='assumed'] .meter__fill {
  background-image: repeating-linear-gradient(135deg,
    var(--uncertain-surface) 0 2px, transparent 2px 5px);
}

/* On paper a grey fill inside a grey track is a fill a photocopier loses — and a
   SINGLE hatch for every fill is worse: it repaints assumed, binding and neutral
   to one texture, so three states print identically. The earlier draft did exactly
   that. Three fills, three textures, no colour required. */
@media print {
  .meter { border: var(--border-width) solid var(--text-primary); background: none; }
  /* neutral: open hatch */
  .meter__fill { background: repeating-linear-gradient(135deg,
    var(--text-primary) 0 1px, transparent 1px 5px); }
  /* binding: solid */
  .meter[data-state='binding'] .meter__fill { background: var(--text-primary); }
  /* assumed: dense hatch, AND the drawn pencil sits beside the printed value */
  .meter[data-state='assumed'] .meter__fill { background: repeating-linear-gradient(135deg,
    var(--text-primary) 0 2px, transparent 2px 4px); }
}
```

The value is **always printed as text beside the bar**, so the graphic is redundant
rather than load-bearing — and where that value is ASSUMED it carries `.traced--assumed`
and all five of its channels, which is the fifth cue on an assumed meter.

`--meter-value` and `--meter-datum` are per-element and come from a JSX inline `style`,
the same as `--motion-order` in §8. There is no way to feed a custom property from an
attribute — typed `attr()` is not shipped in any engine — so this is a component change
and not a stylesheet one, and it is stated here rather than left for whoever builds it:

```tsx
<span className="meter" data-state={state} style={{
  '--meter-value': `${pct}%`,
  '--meter-datum': `${datumPct}%`,
} as React.CSSProperties} />
```

With neither set the fill is 0% and the datum sits at 100%, which is a bar at rest and
not a broken one.

**320px:** full width, height unchanged; it cannot overflow.

### 6.10 CTA and the control family

```css
.button {
  display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
  min-block-size: var(--control-h);
  min-inline-size: var(--tap-min);      /* the 44px floor is a PROPERTY of the
                                           control, not an overlay: an absolutely
                                           positioned 44px expander on a 32px
                                           button overhangs 6px and, at a 4px gap,
                                           steals its neighbour's target — a 2.5.8
                                           regression introduced by a 2.5.8 fix */
  padding-inline: var(--space-4);
  font: inherit; font-size: var(--text-sm); font-weight: var(--weight-medium);
  color: var(--text-primary);
  background: var(--surface-raised);
  border: var(--border-width) solid var(--border-control);
  border-radius: var(--radius-md);
  text-decoration: none; cursor: pointer;
}
.button--sm { min-block-size: var(--control-h-sm); padding-inline: var(--space-3); }
.button--lg { min-block-size: var(--control-h-lg); padding-inline: var(--space-5);
              font-size: var(--text-base); }
.button--primary { background: var(--accent); border-color: var(--accent); color: var(--text-inverse); }
.button:focus-visible {
  outline: var(--focus-width) solid var(--accent-focus); outline-offset: var(--focus-offset);
}
/* WCAG 1.4.3 exempts inactive components. The comment that used to sit here said
   "Contrast stays above 4.5:1 because a disabled control still has to be
   readable" — a ratio nobody measured, and not the ratio the tokens produce (it
   was 3.81 light / 4.06 dark). It is now 4.81 / 5.04, but the claim is deleted
   rather than repaired: this repo does not state ratios in comments. */
.button:disabled {
  color: var(--text-tertiary);            /* 4.81 light / 5.04 dark on the inset */
  background: var(--surface-inset);
  /* THE BOUNDARY IS KEPT AT --border-control, not dropped to --border-default. An
     earlier draft used --border-default here, which measures 1.31 light / 1.50
     dark on an inset — in neither lane, and the disabled control ends up with no
     visible edge at all. 1.4.11 exempts inactive components, so nothing would have
     failed; the comment above celebrates deleting an unmeasured ratio claim from
     exactly this rule, and replacing it with an unmeasured pair is the same error
     with the number removed. --border-control on --surface-inset is 3.18 / 3.44 /
     5.98 and is declared in §3.1. Disabled is signalled by the ground, the tertiary
     label and the slashed circle — never by taking the edge away. */
  border-color: var(--border-control);
  cursor: not-allowed;
}
/* The slashed circle, drawn in §7.5 — not an empty rule with a comment in it.
   Disabled is never colour alone, and `cursor: not-allowed` does not exist for a
   touch user or a screen reader. `aria-disabled` carries the semantics; this
   carries the sight of it. */
.button:disabled .mark { color: var(--text-tertiary); }

/* Control state. §8's motion table lists this row and an earlier draft declared no
   transition for it anywhere, so the row described nothing. */
@media (prefers-reduced-motion: no-preference) {
  .button, .input {
    transition: background-color var(--duration-fast) var(--ease-standard),
                border-color var(--duration-fast) var(--ease-standard);
  }
}

.input {
  font: inherit; min-block-size: var(--control-h);
  padding: var(--space-2) var(--space-3);
  background: var(--surface-base); color: var(--text-primary);
  border: var(--border-width) solid var(--border-control);
  border-radius: var(--radius-md);
}
.input:focus-visible {
  border-color: var(--accent);
  outline: var(--focus-width) solid var(--accent-focus); outline-offset: var(--focus-offset);
}
.input--num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums lining-nums; text-align: end;
}

.cta {
  display: flex; flex-wrap: wrap; align-items: center;
  gap: var(--space-3) var(--space-4);
  margin-block-start: var(--rhythm-block);
}
.cta__note { font-size: var(--text-sm); color: var(--text-tertiary); max-inline-size: var(--measure-fine); }

@media (hover: hover) {
  .button:hover:not(:disabled) { background: var(--surface-inset); border-color: var(--border-strong); }
  .button--primary:hover:not(:disabled) { background: var(--accent-hover); border-color: var(--accent-hover); }
}
@media (max-width: 30rem) {          /* --bp-xs */
  .cta > .button { flex: 1 1 100%; }
  .cta__note { flex: 1 1 100%; }
}
@media print { .button { display: none; } }
```

One filled button and one ruled button on a baseline, and never a third.
**320px:** each button takes a full row at `--control-h`, comfortably above `--tap-min`.

### 6.11 Inline traced value

Full uncertainty treatment in §7. The chrome of the control:

```css
.traced {
  display: inline-flex; align-items: baseline; gap: 0.15em;
  border: none; background: none; font: inherit; color: inherit; text-align: inherit;
  padding: 0.05em 0.2em; margin: -0.05em -0.2em;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.traced:focus-visible {
  outline: var(--focus-width) solid var(--accent-focus); outline-offset: var(--focus-offset);
}
/* The DERIVED citation superscript stays in the one blue: it opens the derivation,
   so it IS an interactive affordance and not decoration. */
.traced--derived .traced__cite {
  font-family: var(--font-sans); font-size: 0.7em;
  vertical-align: super; font-weight: var(--weight-semibold);
  line-height: var(--leading-flat);
  color: var(--accent);
}
/* The result at figure scale. Off the heading ramp (§4.1). */
.traced-display .value {
  font-size: var(--text-figure);
  font-weight: var(--weight-semibold);
  line-height: var(--leading-display);
  letter-spacing: var(--tracking-tight);
}
.traced-display .value__unit { font-size: 0.34em; }

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .traced {
    transition: background-color var(--duration-instant) var(--ease-standard),
                box-shadow var(--duration-instant) var(--ease-standard);
  }
  .traced:hover { background-color: var(--surface-inset); }
}
```

`white-space: nowrap` on `.value` is why `min-inline-size: 0` is mandatory on every
flex and grid ancestor: a grid item defaults to `min-width: auto` and refuses to shrink
below its content, which is exactly how "Mixed Use (Residential with Retail)" landed on
top of the plot area and how `.band__head` overflowed the document by 2px.

### 6.12 Empty state

Grepping all screens for `loading`, `skeleton`, `aria-busy`, empty-state or toast
returns two hits. Every moment the product is not in its finished state is undesigned —
and on this product the empty state is not a gap to apologise for, it is frequently
**the answer**: `blockingGaps()` stopping a run, a check returning `DORMANT`, an
affection plan that omits a limit. `DJAZ1MED12RES011` prints `G+11` and no FAR, and the
screen that says so is doing the most important work in the product.

```css
.empty {
  display: grid; justify-items: start; gap: var(--space-3);
  padding: var(--rhythm-block) var(--space-5);
  background: var(--surface-sunken);
  border: var(--border-width) dashed var(--border-control);
  border-radius: var(--radius-lg);
  /* The hatch is a LEADING BAND, never under the prose. */
  background-image: repeating-linear-gradient(135deg,
    var(--deferred-hatch) 0 2px, transparent 2px 5px);
  background-repeat: no-repeat;
  background-size: var(--tick) 100%;
  padding-inline-start: calc(var(--space-5) + var(--tick));
}
.empty__title {
  font-size: var(--text-lg); font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-tight); text-wrap: balance;
}
.empty p {
  font-size: var(--text-sm); color: var(--text-secondary);
  max-inline-size: var(--measure-fine); text-wrap: pretty;
}
/* Deliberately empty is not the same as broken, and neither is the same as
   pending. Three states, three treatments, all with a drawn mark. */
.empty[data-state='deferred'] { border-color: var(--deferred-hatch); }
.empty[data-state='assumed']  { border-color: var(--uncertain-border);
                                background-color: var(--uncertain-surface); }
.empty--loading { border-style: solid; background-image: none; padding-inline-start: var(--space-5); }

@media (max-width: 40rem) { .empty { padding-inline: var(--space-4); } }
```

Copy rule, and it is the `ux-writing` half of the pattern: an empty state says **what
is absent, why, and what would resolve it** — "No FAR is printed on this affection
plan. The run is blocked until one is entered or a project brief supplies it." Never
"No data", never "Nothing here yet", and never an illustration of an empty box. The
one thing it must not do is imply the absence is a temporary condition of the software
when it is a permanent property of the document.

### 6.13 Footer (colophon)

The five-way claim statement is written out in **three files** — `App.tsx:383`,
`Root.tsx:93`, `Landing.tsx:736` — differing only in two interpolated version strings,
with only one of the three guarded by a test, for a sentence CLAUDE.md makes a
permanent, non-negotiable disclosure. Three copies of a permanent disclosure is three
places for it to drift. One exported `ClaimStatement`, one `<Shell>`.

```css
.colophon {
  margin-block-start: var(--rhythm-major);
  padding-block: var(--rhythm-block) var(--rhythm-minor);
  /* The same 2px ink rule that opens every section, so the sheet has a bottom edge
     in the same weight as its top. */
  border-block-start: var(--border-width-emphasis) solid var(--border-strong);
  background: var(--surface-sunken);
}
.colophon p {
  font-size: var(--text-sm); line-height: var(--leading-relaxed);
  color: var(--text-secondary); max-inline-size: var(--measure-fine); text-wrap: pretty;
}
.colophon p + p { margin-block-start: var(--space-3); }
.colophon__claims {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(15rem, 100%), 1fr));
  gap: var(--space-4); margin-block-start: var(--space-5);
  padding-block-start: var(--space-4);
  border-block-start: var(--border-width) solid var(--border-subtle);
}
.colophon__claim {
  display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-2) var(--space-3);
  padding-inline-start: var(--space-3);
  border-inline-start: var(--rail-w) solid var(--rail-color, var(--border-strong));
}
.colophon__claim dt {
  font-family: var(--font-mono); font-size: var(--text-xs);
  text-transform: uppercase; letter-spacing: var(--tracking-label);
  color: var(--text-tertiary);
}
.colophon__claim dd { margin: 0; text-wrap: pretty; }
.colophon__build {
  margin-block-start: var(--space-4);
  font-family: var(--font-mono); font-size: var(--text-xs);
  font-variant-numeric: tabular-nums lining-nums slashed-zero;
  color: var(--text-tertiary);
}
```

The five claims stack in §16.5's own order at every width, and NEVER CLAIMED is last.

---

## 7. UNCERTAINTY

This section is not a trade-off surface. Everything above it may be argued with; this
may not.

### 7.1 ASSUMED — five channels, four of them non-colour

The existing treatment is stronger than anything in the 138-system reference library
and it is preserved **verbatim** except where a channel is strengthened. Nothing here
is softened, in any theme, at any scale, for any reason.

```css
.traced--assumed {
  background-color: var(--uncertain-surface);        /* 1. the amber ground        */
  text-decoration: underline;                        /* 2. the dotted underline    */
  text-decoration-style: dotted;
  /* SCALE-LINKED, and this is the most important single declaration in the
     document. The underline was pinned at a fixed 2px. This language introduces a
     61px headline and a 44px figure — so a 2px cue becomes PROPORTIONALLY
     INVISIBLE with no colour edited, no token softened and nothing for a design
     review to catch. That is precisely how a beautiful redesign lets §13.1's
     treatment recede. Expressed as max(floor, em) the cue grows with the type:
     2px at 16px body (unchanged, so nothing regresses), 2.4px on the 44px
     governing figure, 3.4px on a 61px display value. The bigger this language
     gets, the bigger the amber gets. */
  text-decoration-thickness: max(var(--border-width-emphasis), 0.055em);
  text-underline-offset: max(0.1875rem, 0.09em);
  text-decoration-color: var(--uncertain-border);
  padding: 0.1em 0.3em; margin: -0.1em -0.3em;
  font-weight: var(--weight-medium);                 /* 3. the weight step         */
}
/* TWO RANKS, and §2.1 had to move --uncertain-strong to keep them two. The value
   text is the darker ink and the pencil is the lighter one; at 1.132x apart — which
   is what darkening --uncertain alone produced — they are one ink and this
   distinction is spent on nothing. 1.425x, restored. */
.traced--assumed .value,
.traced--assumed .value__unit { color: var(--uncertain-strong); }
.traced--assumed .mark { color: var(--uncertain); }  /* 4. the drawn pencil, always
                                                           visible — never on hover */
/* HOVER ADDS. IT NEVER TAKES A CHANNEL AWAY.
   Two things are wrong with the obvious hover and only one of them ships today.
   (a) provenance.css:112 repaints `text-decoration-color: var(--uncertain)` on
   hover — a hover that mutates a NON-COLOUR CUE is a cue that changes meaning
   under a pointer, and the resulting pair was never declared. That is deleted.
   (b) An earlier draft of THIS document replaced the whole rule with
   `background-color: var(--surface-inset)`, which deletes channel 1 — the amber
   ground, the one §13.1 says must never recede — under the pointer, at the exact
   moment a reader is inspecting the value. It also moved --uncertain-strong and
   the dotted underline onto a ground §3.1 did not declare. That is worse than
   what ships, and it was written four paragraphs above an argument that
   --uncertain-surface "is the only state surface that is ever FILLED".
   So the ground does not move. Hover adds a 1px inset ring in the token that
   already draws the underline: --uncertain-border on --uncertain-surface, 3.47
   light / 3.51 dark / 3.82 print, declared in §3.1 and unchanged by the hover. No
   channel is spent to produce feedback. */
@media (hover: hover) {
  .traced--assumed:hover {
    background-color: var(--uncertain-surface);
    box-shadow: inset 0 0 0 var(--border-width) var(--uncertain-border);
  }
}
/* The generic .traced hover (provenance.css:66) swaps in --surface-inset. It still
   applies to DERIVED, USER_SET and the rest, whose foregrounds are declared on an
   inset in §3.1. It does NOT lose to the rule above on specificity — both are
   (0,2,0) — so the rule above must come LATER IN SOURCE, and it is the only
   ordering dependency in this section. Written the other way round, hover would
   silently delete the amber ground and nothing would catch it. */
```

**Channel 5 — the margin tally.** The rail gutter carries the section index in quiet
mono tertiary and nothing else, ever. Except this. Where a section rests on
assumptions, a 6px amber rail, a drawn pencil, a tabular count and a caps label sit in
the same column, above the numeral. In a printed dossier the marginal note is the
loudest thing on a page of grey text; that is a typographic fact about margins, and
this language spends the whole of it on the one signal §13.1 says must never recede. It
recurs down the left edge, so a reader scrolling past prose they are not reading still
**counts** the assumptions.

It is per-section, not per-value: a per-value flag is O(n) in assumptions, opt-in at
every call site so a missed one silently drops the cue, and has no home inside a table
— which is exactly where a twenty-assumption register renders.

```css
.margin-tally {
  display: block; margin-block-end: var(--space-4);
  padding-inline-start: var(--space-3);
  border-inline-start: var(--rail-w-emphasis) solid var(--uncertain);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums lining-nums;
  font-size: var(--text-lg); font-weight: var(--weight-semibold);
  line-height: var(--leading-tight);
  color: var(--uncertain-strong);
  text-decoration: none;
}
.margin-tally__label {
  display: block; margin-block-start: var(--space-1);
  font-size: var(--text-xs); font-weight: var(--weight-medium);
  text-transform: uppercase; letter-spacing: var(--tracking-label);
  color: var(--uncertain-strong);
}
.margin-tally:focus-visible {
  outline: var(--focus-width) solid var(--accent-focus); outline-offset: var(--focus-offset);
}
/* When nothing is assumed, the margin says so — in ink, quietly. The ABSENCE of
   amber has to be a statement too, or its presence means less. */
.margin-tally--none {
  border-inline-start-color: var(--border-strong);
  color: var(--text-tertiary);
  font-size: var(--text-sm); font-weight: var(--weight-normal);
}
.margin-tally--none .margin-tally__label { color: var(--text-tertiary); }

/* --bp-md. The rail folds, so the tally becomes an inline row and stays ABOVE the
   heading. This is the responsive decision the whole amber argument depends on:
   folding the tally below the fold on a phone would be exactly the recession
   §13.1 forbids, so on a phone it is the first thing in the section. */
@media (max-width: 48rem) {
  .margin-tally {
    display: flex; align-items: baseline; gap: var(--space-2);
    margin-block-end: var(--space-3);
  }
  .margin-tally__label { display: inline; margin-block-start: 0; }
}
@media print { .margin-tally { break-inside: avoid; } }
```

### 7.2 VARIANCE, DERIVED, NOT ASSESSED — and every graphic that carries a state

The table covers **every** surface a state is drawn on, not only the inline value. An
earlier draft had four rows and no row for the meter — and the meter turned out to be
separating three states by hue alone, on screen and on paper. A cue table that does not
enumerate the graphics is a cue table that cannot find that.

| state | colour | non-colour cue, inline | non-colour cue, as a graphic | fill |
|---|---|---|---|---|
| **ASSUMED** | `--uncertain` | dotted underline at ≥2px **scaling with type**, drawn pencil, weight step | **6px rail — the only 6px in the system**; striped meter fill; margin tally in the rail gutter | **amber ground — the only state fill in the language** |
| **PARTIAL** | `--uncertain` | drawn half-disc glyph | 3px rail | amber ground |
| **VARIANCE** | `--variance` | drawn wedge | 2px frame in `--variance-border`, 3px rail | none — see below |
| **BLOCKED** | `--variance` | drawn wedge | 2px frame, 3px rail | none |
| **DERIVED** | `--derived` | drawn tick, `--accent` citation superscript | 3px rail | chip only |
| **NOT ASSESSED** | `--deferred` | real italic, drawn hollow ring | hatch **leading band** where a block has padding (`.empty`, `.not-assessed`); **dashed rule** where it does not (`.schedule`); dashed edge | none |
| **BINDING** | `--accent` | — (not an uncertainty) | 3px rail, solid meter fill | `--accent-subtle` chip |
| **NEUTRAL** | `--border-strong` | — | 3px rail, open meter fill | none |

**VARIANCE gives up its background, and the trade is stated rather than sold.** §20.3
specifies "Red border, evidence link" and says nothing about a fill, so dropping it is
closer to the specification — and it is what leaves exactly one filled block on any page.
On a page of ruled blocks, one filled block is a shout. But it is a channel removed from
the treatment that carries NEVER CLAIMED, so it is paid for in the same edit: the frame
goes from 1px to **2px** in `--variance-border` (repaired from 2.32 to 3.49 on its own
surface, §2.1), and the drawn wedge becomes mandatory rather than a dingbat that Segoe UI
Emoji may or may not resolve (§7.5). Two channels in, one out.

**And `--variance` itself is NOT touched.** An earlier draft lightened it 7.06 → 6.36 so
that amber would outrank it. Taking a fill *and* 10% of the contrast off the product's
central refusal, in one document, for a comparison nothing checks, is two reductions
where the argument justified at most one. §2.1 reverts the value and §3.3 scopes the rank
claim to chrome.

**The hatch is a leading band, and where there is no room for a leading band it is not
used.** It is raised to 3:1 for 1.4.11 and is never run under prose, because a texture at
3:1 beneath body text has traded 1.4.3 for 1.4.11 — a swap, not a fix. The corollary is
the part an earlier draft missed: in a schedule the first cell is flush to the rail and
has no leading padding, so a band there either sits under the numeral or indents the row
off the rail. §6.7 uses a dashed rule and the hollow-ring mark instead. Moving a texture
is the fix; weakening it, or running it under something, is not.

### 7.3 On paper

The amber ground drops (§2.3) and the other four channels carry it: the dotted underline
in `--uncertain-border` (**3.82** on white), the drawn pencil, the semibold weight, and
the margin rail at 6px. `--uncertain` keeps its chromatic value on paper, so it separates
by value at **6.99:1** against a page whose neutrals sit at 12.63 and 21.00, while the
mark, the dots and the rail survive as shape.

**This is only true once §2.3's Step 1b lands.** As the code stands,
`provenance.css:255` sets `.traced--assumed { text-decoration-color: #000 }` and
`provenance.css:259` sets `.traced--assumed .value { color: #000 }` inside `@media
print` — so on paper today the underline is **black, not `--uncertain-border`**, and the
value text is black rather than `--uncertain-strong`. The 3.82 above is a property of
the palette, not of the shipped page, and the paragraph said otherwise. Twelve raw hex
values across the three sheets have to be removed before any of this section is a
description rather than an intention; they are listed in §2.3 and removed in Step 1b.

The other claim this section used to make — that amber is "the one pigment event" on
paper — is narrowed to what is measurable. In print every state surface is white, so
amber has no ground there and the pigment argument (§7.4(b)) is screen-only, which
§7.4(b) already says. On paper the treatment rests on the four remaining channels, and
the 6px rail is the one that survives a photocopier.

### 7.4 What "the loudest element" claims, and on which surfaces

Three independent arguments, none of which depends on the others, and each scoped to
exactly what it was measured over. The heading used to read "on every surface"; it is
narrowed here because one surface falsifies it and the honest move is to name the
surface, not to keep the adjective.

**(a) Rank against CHROME, on the nine grounds, in three themes.** The shipped light
theme had it backwards: `--accent` **5.78** against `--uncertain` **5.14** on a panel.
Because ratio(fg, ground) = (L_ground + 0.05)/(L_fg + 0.05) for a dark foreground on a
light ground, the ratio *between* two foregrounds does not depend on the ground — so
that inversion held identically on all nine, and one luminance edit fixes all nine. Now:

| theme | `--uncertain` | `--accent` | lead |
|---|---|---|---|
| light | 6.99 | 5.78 | **1.210×** |
| dark | 8.99 | 6.63 | **1.356×** |
| print | 6.99 | 5.78 | **1.210×** |

Minimum lead over `--accent` and `--accent-focus` on each of the nine grounds: **1.210×
light, 1.356× dark, 1.210× print.** Enforced by `assertAmberOutranksChrome` (§3.3),
which fails the build rather than the review, and which now takes `GROUNDS` as its
default argument instead of an undefined `grounds` parameter.

**Two things this claim does NOT say, both of which an earlier draft implied.**

*It is not "every ground".* `--surface-contrast` is a tenth surface, and on it, in light,
`--uncertain` measures **2.58** against `--accent`'s **3.12** — the amber loses. The
grounds are enumerated by token name in §3.1 rather than counted in a sentence, and the
band is excluded there with the numbers printed and with two build assertions
(`assertAmberExclusive`, `assertNoChromeOnBand`) keeping any ink off it. A set chosen so
that a claim comes out true, and never written down, is the same failure as a palette the
checker never read.

*It is not a claim over the provenance peers.* §3.3 excludes `--derived`, `--variance`
and `--deferred` by name and says the assertion "must not" depend on them. In light and
in print `--variance` measures **7.06** against amber's **6.99** — variance leads, by
1.010×. In dark amber leads, 8.99 to 6.89. That is recorded rather than engineered away:
the earlier draft lightened `--variance` specifically to invert it, which is the
aesthetic-driven softening §3.3 forbids, arrived at from the other side and applied to
NEVER CLAIMED. Two inks 1% apart are not a rank anyone perceives. What separates ASSUMED
from VARIANCE at page scale is (b) and (c) below, and VARIANCE has neither.

**(b) Area, measured as chroma. Screen only.** `--uncertain-surface` is the most
chromatic surface in the system — **29 against a next-highest of 19** in light, **36
against 26** in dark — and after §7.2 it is the only state surface that is ever *filled*.
Every neutral in the palette holds a chroma spread of at most **12** out of 255 (§1), so
on a page whose structure is drawn entirely in graphite the amber ground is the only
coloured surface in the layout. Enforced by `assertAmberSurfaceMostChromatic`, whose body
is now written out in §3.3 rather than being a comment. This assertion caught a defect
that no ratio could see: dark `--accent-subtle` (38) was more chromatic than the amber
ground (27), so a *binding* tag had a stronger colour ground than an assumption.

In **print** every state surface is white (§2.3). That is a uniform rule and not an amber
exception, and it means this argument does not run on paper. §7.3 says what does.

**(c) Position AND width, which survive greyscale and need no colour at all.** Nothing
else in this system is ever drawn in the rail gutter, and **no other state is ever 6px.**
The single exception is the same device's zero state, `.margin-tally--none`, which keeps
the width in `--border-strong` because "nothing is assumed in this section" only reads as
a statement if it occupies the same column at the same width — an absence in a column of
marks, not a different mark. §2.5 enumerates the six live rules that give the width up.
A column of 6px marks down the left edge of a long page is legible before
a word is read, and in a greyscale print or to a reader with any colour vision deficiency
it reads as a *position and a width*, not a hue.

The second half of that sentence is load-bearing and was missing. An earlier draft gave
`[data-state="binding"]` the same `--rail-w-emphasis`, and then rested this argument on
position alone. Amber and the accent separate by only **1.21× in light and 1.36× in
dark** (Y 0.1002 against 0.1318; 0.5194 against 0.3700) — on a photocopy that is two
mid-greys. Share the width and channel (c), the one channel this section calls robust
against the failure the other two cannot cover, collapses back into colour alone. §2.5
reserves the width, §6.2 spends it once, and `assertRailWidths` (§3.3) fails the build on
any other selector reaching for it — because no contrast checker can see this, and a rule
only a reviewer remembers is the rule §13.1 already lost once.

**And the failure mode to name in advance.** A reviewer who has internalised the
accent-scarcity discipline of Carbon or Linear will look at this page and reach for the
loudest colour to reduce. That colour is the amber. Reducing it is the one change that
fails the product rather than the review. **That the amber now looks louder than it did
is the objective, not a side effect to be corrected in a balancing pass.** The scarcity
budget in this system belongs to the *blue*, and §9 spends it.

### 7.5 Marks are drawn, not typed — and here are the paths

`✎`, `⚠`, `◍`, `✓`, `✗`, `▸`, `⌗` are resolved by whatever face the OS supplies. On
Windows, `U+26A0` commonly resolves through Segoe UI Emoji and renders as a filled colour
glyph at a different weight and baseline — and it is carrying the **VARIANCE non-colour
cue** that §20.3 exists to guarantee. A rendering artefact is sitting inside a trust
signal.

The answer is not an icon package (forbidden) and not a dingbat. It is a hand-drawn set in
one optical box from `currentColor` — the pattern already in this repo 400 lines away at
`.lp-status__glyph`, where four claim verdicts are drawn in CSS as a filled disc, a half
disc, a hollow ring and a crossed square. They theme, they print, they survive greyscale
and photocopying, and they need no dependency.

**They are drawn here.** An earlier draft named six marks in prose and gave none of them
a path, while §6.1 and §6.10 carried empty rules whose entire body was a comment saying
which mark went there — and §10 Step 8's gate was a greyscale screenshot of marks that
did not exist. These are the declared non-colour cue for four provenance states; a cue
specified only in prose is a cue that ships as nothing.

```css
.mark {
  display: inline-block; flex: none;
  inline-size: var(--glyph); block-size: var(--glyph);
  vertical-align: -0.12em;
  fill: none; stroke: currentColor; stroke-width: var(--glyph-stroke);
  stroke-linecap: square; stroke-linejoin: miter;
}
.mark--filled { fill: currentColor; stroke: none; }
.mark__ink    { fill: currentColor; stroke: none; }   /* the inner dot of a ringed dot */
```

**One 16×16 viewBox for all seven.** At `--glyph` 0.875em on 16px body that is a 14px box
and a 1.5/16 stroke ≈ 1.3px — the same optical weight as `--border-width-emphasis` at
display sizes, which is why the marks sit with the rails rather than beside them. Every
one is `aria-hidden="true"`: the state is already in the text (`ASSUMED`, `NOT ASSESSED`,
`NEVER CLAIMED`) and a mark that also announced itself would double every row for a
screen-reader user.

```tsx
/* ASSUMED — a pencil. The one mark that must read at 14px on a photocopy, so the
   body is a plain wedge and the detail is one ferrule line. */
<svg className="mark" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M2 14 L3 10.5 L10.5 3 L13 5.5 L5.5 13 Z" />
  <path d="M9.5 4 L12 6.5" />
</svg>

/* VARIANCE and BLOCKED — a wedge. Not U+26A0: this is the mark Segoe UI Emoji was
   repainting as a yellow-and-black colour glyph inside a red treatment. */
<svg className="mark" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M8 2 L15 14 L1 14 Z" />
  <path d="M8 6.5 L8 10" />
  <path d="M8 12 L8 12.01" />
</svg>

/* DERIVED — a tick. */
<svg className="mark" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M2.5 8.5 L6.5 12.5 L13.5 4" />
</svg>

/* NOT ASSESSED — a hollow ring. Empty on purpose: the state IS an absence, and an
   empty circle is the only mark in the set with nothing inside it. */
<svg className="mark" viewBox="0 0 16 16" aria-hidden="true">
  <circle cx="8" cy="8" r="5.5" />
</svg>

/* USER_SET — a ringed dot. A named person put a value here: the ring is the field,
   the dot is the answer. */
<svg className="mark" viewBox="0 0 16 16" aria-hidden="true">
  <circle cx="8" cy="8" r="5.5" />
  <circle className="mark__ink" cx="8" cy="8" r="1.75" />
</svg>

/* disabled — a slashed circle. Used by .button:disabled (§6.10). */
<svg className="mark" viewBox="0 0 16 16" aria-hidden="true">
  <circle cx="8" cy="8" r="5.5" />
  <path d="M4.1 11.9 L11.9 4.1" />
</svg>

/* NEVER CLAIMED — a crossed square. Used by .masthead__validity (§6.1) and by the
   fifth claim in the five-way statement. A square rather than a circle because it
   is the one verdict that is not on the supported/partial/deferred scale, and a
   different SHAPE FAMILY says that before the colour does. */
<svg className="mark" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M2.5 2.5 H13.5 V13.5 H2.5 Z" />
  <path d="M2.5 2.5 L13.5 13.5" />
  <path d="M13.5 2.5 L2.5 13.5" />
</svg>
```

Seven marks, not six — the earlier count omitted the crossed square, which is the one
§6.1 puts in the masthead, in the most-repeated position on the site, on the sentence
`REGULATORY VALIDITY — NOT ASSESSED`. One family, one optical size, one stroke weight.

PARTIALLY SUPPORTED keeps the existing CSS half-disc at `.lp-status__glyph` rather than
joining this set: it is drawn with a `linear-gradient` and no SVG, it already works, and
converting it would be churn. It is the one documented exception, named here so it is a
decision rather than an omission.

## 8. MOTION

### What moves

Six things, and nothing else. Every row names a rule that exists in this document; an
earlier version of this table had six rows of which **four described no CSS anywhere** —
a table of intentions, which is how `--duration-reveal`, `--motion-rise`, `--ease-in` and
`--stagger-step` all ended up with no consumer.

| what | property | duration | curve | where the rule is |
|---|---|---|---|---|
| scroll reveal | `transform: translateY(var(--motion-rise)) → none` | none — `animation-timeline: view()` drives it from the range | linear | landing.css `lp-settle`, kept |
| hero copy settle | `transform` | `--duration-reveal` 420ms | `--ease-out` | landing.css `lp-rise`, opacity track deleted |
| hero drawing build | `stroke-dashoffset` | 900ms | `--ease-out` | landing.css `lp-draw`, kept |
| control state | `background-color`, `border-color` | `--duration-fast` 140ms | `--ease-standard` | §6.10, `.button`/`.input` |
| plate hover | `border-color`, `background-color` | `--duration-base` 200ms | `--ease-standard` | §6.5, `.plate--interactive` |
| nav elevation | `border-color` | `--duration-base` | `--ease-standard` | §6.1, `.nav` |

The **derivation inspector** row is deleted. No pattern for it exists in §6, so the row
described nothing, and it was the only justification for re-pitching `--duration-slow` to
320ms and for adding `--ease-in`. Both are dropped in §2.7 rather than kept as tokens
waiting for a component. If the inspector is designed later it brings its own row and its
own curve; nothing here has to be reserved for it.

`--motion-rise` (12px) is the only distance anything travels, ever, and it replaces the
14px in `lp-rise` and the 16px in `lp-settle`. Naming it as a single token is what stops a
future contributor writing a 40px slide.

### Nothing is ever at zero opacity

The scroll reveal already animates `transform` only, behind `@supports
(animation-timeline: view())`, with a comment recording the failure that produced it —
three whole sections blank in a full-page screenshot and on paper. That implementation is
correct and is kept verbatim.

But **two** time-based animations still hold `opacity: 0`, and only one of them has ever
been noticed:

```css
/* landing.css:829-833 — the drawing */
.lp-plan__podium { animation: lp-fade 500ms var(--ease-out) 620ms both; }
.lp-plan__tower  { animation: lp-fade 500ms var(--ease-out) 820ms both; }
.lp-plan__dim text, .lp-plan__overall text,
.lp-plan__rule line { animation: lp-fade 400ms var(--ease-out) 980ms both; }

/* landing.css:835-839 — the HERO COPY. Nobody has flagged this one. */
.lp-hero__copy > * { animation: lp-rise 460ms var(--ease-out) both; }   /* opacity:0 */
```

`animation-fill-mode: both` applies the `from` state **through the delay**, so the two
shapes that make the hero drawing legible are at `opacity: 0` for the first 0.6–1.4
seconds, and the headline, lede and CTA are invisible until their turn. Print re-locks
opacity to 1, so the documented three-blank-sections failure does not recur — but a slow
device, an early screenshot, or a font-swap reflow that delays animation start yields a
plot outline with nothing in it and a hero with no words. It is the same class of defect.

**`@keyframes lp-fade` is deleted, and the shapes it animated get NO animation at all.**
Not a transform-only settle. This is the correction of a sentence that contradicted the
one before it: an earlier draft said "`lp-fade` is deleted" and then "both become
`transform`-only settles", which are different instructions and only the first is right.
`.lp-plan__podium` and `.lp-plan__tower` are **shapes inside the drawing**, rendered — as
§6.3 says — in the kernel's own coordinates. A transform-only settle puts the podium
12–16px off the plot outline it sits inside, for 500ms, on the landing page's only
geometry. §9 refuses count-ups because "animating a traced value would put dozens of
numbers on screen that the engine never produced"; a plan whose podium is briefly in the
wrong place is that same refusal applied to a drawing. Geometry does not move.

**`lp-rise` drops its opacity track and keeps its transform.** It animates the hero copy,
which is text in normal flow and not geometry, and 12px of settle on a paragraph is not a
claim about anything. Between the two changes, **no element in this product is ever at
zero opacity** — which is a property you can assert rather than a habit you have to keep.

The `:nth-child(2)…(5)` stagger is replaced by `animation-delay: calc(var(--motion-order,
0) * var(--stagger-step))`: a stagger bound to DOM position silently re-times the whole
hero the moment someone inserts a paragraph. **`--motion-order` comes from a per-element
inline `style`, not from an attribute** — that was stated as "with the order set as an
attribute", which cannot work: typed `attr()` is not shipped in any engine, so a custom
property cannot be fed from `data-order`. It is a JSX change, the same one `--meter-value`
needs (§6.9):

```tsx
{items.map((item, i) => (
  <p key={item.id} style={{ '--motion-order': i } as React.CSSProperties}>…</p>
))}
```

With no inline style the fallback `0` applies and every element settles together, which is
the correct no-JS outcome. Total choreography ≤ **240ms** from first element to last,
because `pnpm shots` is how this repo runs design review and a stagger long enough to
catch a page mid-state produces a screenshot that lies about the design.

### Reduced motion is opt-in, not opt-out

Every `animation` and every `transition` in this language sits inside `@media
(prefers-reduced-motion: no-preference)`. Not a blanket `animation: none` override under
`reduce` — the base state **is** the final state, so under `reduce` there is no override
to forget and no component needs to know the preference exists. This is why the hero
drawing needs no JavaScript to be correct, and it is the one structural guarantee in this
section rather than a rule someone has to remember.

The patterns in §6 obey this literally: not one of them writes a bare `transition:`
declaration at the top level. Where a pattern above shows a transition, it is inside a
`no-preference` block.

### Print

```css
@media print {
  .lp *, .lp *::before, .lp *::after,
  .app *, .app *::before, .app *::after {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    stroke-dashoffset: 0 !important;   /* `animation: none` already reverts this;
                                          stated so a future keyframe cannot
                                          reintroduce it */
  }
}
```

**Three corrections to the block this replaces, each of which made it worse than the rule
it was extending.**

*The pseudo-element selectors come back.* landing.css:966–976 already covers `.lp *, .lp
*::before, .lp *::after`. An earlier draft rewrote it as `.lp *, .app *, .doc *`, dropping
`::before` and `::after` **in the same document that introduces four load-bearing
pseudo-element decorations** — the `.plate::before` ink cap, the `.figure__plate`
registration corners, the `.eyebrow::before` hairline, and the stacked-schedule
`td::before` labels. Narrowing a lock while adding four things for it to hold is not an
extension.

*`.doc` is deleted.* It matches nothing: zero hits across `apps/web` and
`packages/report`. A selector for a class that does not exist is a lock on a door that is
not there.

*`transform: none !important` is gone, and that is the substantive fix.* It was in the
shipped `.lp` block and it is a live defect there: `Landing.tsx:237` sets
`transform="rotate(-90 …)"` as an **SVG presentation attribute** on a dimension label, and
a CSS declaration beats a presentation attribute — so printing the landing page today
snaps that rotated label horizontal, inside the drawing. Extended over `.app *` it would
also null `app.css:998 .parking-legend__swatch { transform: translateY(2px) }`. `transform`
is a layout property here as well as a motion one, and it does not need to be in this
block: every moving transform in this language is animation- or transition-driven, and
`animation: none` and `transition: none` revert both. The lock keeps what only it can
do — and stops nulling geometry.

Two independent locks on the same door remain, as now: the `@supports` guard and this
block, extended to the engine screens, which currently have no such lock.

## 9. WHAT THIS LANGUAGE REFUSES

Each of these is a decision with a cost that was paid deliberately, not a feature that
has not been built yet.

**The fake dashboard, and any product screenshot in a device frame.** The genre's
defining move, and the most damaging one here: a mocked-up UI with invented numbers, on
a site whose entire proposition is that no number appears which the engine did not
return. The hero is the real worked-example run read from `worked-example.json`, which
`scripts/verify-worked-example.mjs` writes from a live API call and `pnpm check`
re-verifies — including, deliberately, one ASSUMED value in amber. A hero that shows the
product's uncertainty is a stronger asset than one that hides it, because the buyer's
problem is that nobody else shows theirs.

**The count-up animation on any figure, and any bar that grows from zero.** Refused by
name, because it is the single most common "premium" motion on a numbers-led page and
the one this product can least afford. Animating a traced value would put dozens of
numbers on screen per page load that the engine never produced, each briefly
indistinguishable from a result.

**A logo wall, testimonials, a big-number stat row, any accuracy or confidence figure,
pricing tiers with a "Most popular" badge, and a composite health score.** Each is a
claim. There are no customers; §22.2's variance study has not been run; a single health
number is something a reader stops at; and a highlight badge is exactly the
amber-adjacent emphasis §13.1 forbids anything but uncertainty from using.

**Glassmorphism, gradients, mesh, aurora, neon, and every translucent surface —
including the one that ships today.** A `color-mix` + `backdrop-filter` bar has no
measurable ground by construction: its effective background is whatever scrolls under
it, so its links form an unresolvable pair, and unresolvable counts as a failure here,
not a skip. Refusing the effect *removes* an unmeasurable pair rather than adding one.

**A parallel dark "chrome" palette, and dark-mode-first as an identity.** The dark
theme is a token swap, not a second design. A layer that is dark in *both* themes is by
construction a third design, it multiplies amber from one greppable token into four,
and it evaporates into "a bordered white plate" in the medium these reports are carried
into.

**Shadow as the quality signal.** Every shadow token is `none` in print, so any
hierarchy carried by elevation alone is hierarchy the printed report never receives.
`--shadow-lg` is what a derivation popover or a modal would use, and this language
designs neither, so it keeps its zero references and gets no alias (§2.6). Every rung of
the ladder is doubled by a border or a ground. The dark theme gets no inner-highlight
substitute either: `--edge-lift` would have been `rgb(255 255 255 / 0.06)`, which
`contrast.mjs` cannot parse at all, and an unmeasurable decoration is what this document
deleted `--focus-ring` for.

**Raising every hairline to 3:1 now that structure carries hierarchy.** The temptation
this language is most exposed to. It would turn every plate into a wireframe. Split by
job (§2.6); move the texture, do not weaken it.

**A bento grid.** It would render the three capacity bands as feature tiles of unequal
size — and A, B and C are not features, they are three answers that §15.3 says must
never be averaged. A layout that gives one of them a bigger box has averaged them by
implication.

**Large-radius cards, and pill-everything.** 2/4/6px, with `--radius-pill` named as the
system's one documented exception and spent on exactly one component, `.chip` (§6.5). A
large radius reads "app"; this artefact is a drawing.

**An icon package, and Unicode dingbats.** Refused for the same reason from opposite
directions: a dependency is forbidden, and a dingbat is resolved by whatever font the OS
supplies while carrying a §20.3 cue (§7.5).

**A hamburger menu below `--bp-md`.** The section links are *dropped*, not collapsed:
they are duplicated by the section rules one scroll away and by the footer at every
width, and a menu is a component with eight states, a focus trap and an escape handler
that this product has not designed. An undesigned menu is worse than four missing links.

**Roman numerals on the section index**, despite the editorial reference systems that
mandate them. Every other numeral on this page and in every report is Arabic, and a
Roman `IV` beside a mono `04` is two counting systems on one page — in a product whose
whole proposition is that a reader can trace a number without translating it.

**Blue as decoration.** `tokens.css` says "One blue. Interactive affordance and nothing
else", and blue currently paints a decorative eyebrow dot, plan labels, a podium fill, a
tag, a bar fill and a citation superscript. The scarcity budget every premium reference
spends on its brand accent belongs *here*, not on the amber — importing that discipline
backwards is the predictable way this review fails. Blue is cut to: links, the focus
ring, the primary CTA fill, the current nav item, the DERIVED citation superscript
(which opens the derivation and so is an affordance), the binding indicator, and the
brand mark (which is a link home). The eyebrow dot becomes a `--border-strong` hairline;
the plan's podium fill becomes a stroke — which is also more correct as a drawing, and
removes the largest non-amber chromatic area on the page.

**Softening the amber, in any theme, at any scale, for any reason** — including the
reason that everything else is now quiet enough to make it look louder. See §7.4.

---

## 10. IMPLEMENTATION ORDER

Each step is independently verifiable. Do not start the next one until the named gate is
green.

**Step 0 — `scripts/contrast.mjs`. Nothing else may start first.**

The comment-stripping half of §3.0 **has already landed on disk** (see §2.0). What
remains: locate at-rules by RANGE rather than by truncation, add the `PRINT` palette as a
third theme, and add the three-palette self-test.

→ **`pnpm contrast` stays GREEN.** `56 pass, 0 fail` becomes `84 pass, 0 fail` — 28 pairs
× 3 themes — and the self-test passes because the three palettes now differ.

An earlier version of this step said the opposite: *"`pnpm contrast` must now FAIL,
loudly, on the light theme. That failure is the deliverable… If it passes, the parser is
still broken."* **That instruction is wrong and an implementer following it literally
would conclude a working parser is broken and keep editing it.** Measured over the
*shipped* palette and the 28 declared pairs there are **0 failures in light, 0 in dark and
0 in print**; the tightest light row is `--deferred-hatch on --deferred-surface` at 3.022
against a 3.0 floor, and the tightest dark row is `--text-tertiary on --surface-raised` at
4.505 against 4.5. §2.0 says this itself — "all 28 declared pairs pass in light, dark and
print when measured correctly" — and the two sentences could not both be true. The
shipped palette's failures are all in pairs **nobody declared**, which is why they appear
at Step 2 and not here.

The real deliverable of Step 0 is that the three columns stop being identical. Assert it,
do not eyeball it:

```
light  --text-primary on --surface-raised   18.04
dark   --text-primary on --surface-raised   15.19
print  --text-primary on --surface-raised   21.00
```

Do **not** touch a token yet.

**Step 1 — `tokens.css`, palette only.**
§2.1, §2.2, §2.3. Values only; no new tokens, no CSS elsewhere. `--variance` is NOT among
them: §2.1 reverts that change.
→ `pnpm contrast` green at 28 pairs × 3 themes. → `pnpm shots` and diff: expect visibly
darker amber, and a dark theme whose cards finally have an edge. Nothing else should move.

**Step 1b — delete the twelve raw print hex values. Same commit as Step 1, or the print
tokens are decoration.**
§2.3 adds sixteen tokens inside `@media print`. Twelve literals already inside `@media
print` blocks win the cascade over them: `provenance.css:255` (`text-decoration-color:
#000`), `:259` (`.traced--assumed .value { color: #000 }`), `:263`
(`.traced--variance { border-color: #000 }`), `:270–274` (the `.not-assessed` hatch `#666`,
`#fff`, border `#000`, colour `#000`), `app.css:1050` (`.panel { border: 1px solid #000 }`),
and `landing.css:987–989` (`#ffffff` / `#000000` / `#333333`). Adding tokens without
removing these produces a checker measuring a palette the page does not use — §2.0's
failure in a new place.
`landing.css:987–989` is **deleted**, not tokenised: §2.3 already inverts the band.
→ Print one page of a run to PDF, in greyscale. **The ASSUMED underline must be amber
(`--uncertain-border`, 3.82 on white) and not black, and the ASSUMED value must be
`--uncertain-strong` (9.96) and not black.** If either prints black, a literal survived.
→ `grep -rn "#[0-9a-fA-F]\{3,6\}" apps/web/src/styles` returns only `tokens.css`.

**Step 2 — `scripts/contrast.mjs`, the full gate.**
§3.1 (`GROUNDS` + `INKS` → 135 pairs), §3.2 (house lane in three themes, the both-lanes
guard, the `dischargedBy` check), §3.3 (all five assertions, written out).
→ `pnpm contrast`: **405 WCAG rows, 0 fail; 22 house rows held and 2 discharged in
print; 2 recorded exclusions printed; five assertions pass.**
→ `assertAmberExclusive`, `assertRailWidths` and `assertNoChromeOnBand` **will fail here**,
because they describe the CSS after Step 5 and Step 7. **Do not land them disabled with a
`TODO`** — that was the earlier instruction and a disabled assertion is precisely the
vacuous pass this codebase refuses everywhere else. Land the three of them **after Step 7**,
passing on their own merits, and land assertions (1) and (3) here. A step whose gate is
"the check is switched off" has no gate.

**Step 3 — `tokens.css`, the new tokens.**
§2.4–§2.7, §4.1, §4.3. Additions and the radius/type re-pitch. `--text-md` and `--measure`
become aliases. `--z-*` and `--weight-light` are added. `--duration-slow` is deleted (zero
consumers). `--shadow-overlay`, `--edge-lift`, `--ease-in`, `--measure-quote` and
`--tracking-label-lg` are **not added**.
**`--focus-ring` is deleted in this step and §6.0 lands in the same commit.** It has three
consumers — `app.css:44` (the global `:focus-visible`), `app.css:920`, `provenance.css:72`
— and deleting the token without the replacement makes all three invalid at
computed-value time: no ring, anywhere, on a form-heavy nine-step flow. None of typecheck,
test, shots or smoke can see that.
→ `pnpm typecheck`, `pnpm test` green. → `pnpm shots`: type sizes shift (13→14, 15→16),
radii tighten, and **`.lp-band.is-binding .lp-band__number` goes 28→25px** — expected,
enumerated in §4.1, and the only figure on the landing page this step resizes.
→ `pnpm smoke` at 320px: `scrollWidth === clientWidth` on every route.
→ **The focus gate, which is manual because nothing automates it:** tab every route in both
themes and confirm a visible ring on every focusable element, then `grep -rn "focus-ring"
apps/web/src` returns nothing and `grep -rn "var(--measure)" apps/web/src` still resolves
(the alias is live). This is the step most likely to break something silently.

**Step 4 — `index.html`, the font request.** §2.8.
→ `pnpm shots`: the headline should now be visibly Light, and the seven italic rules should
render as real italics rather than obliques. Compare `.not-assessed` before and after; if
it looks identical, the `ital` axis did not load.

**Step 5 — the state layer, and it is the one that protects §13.1.**
§6.2. Convert all 24 `var(--uncertain*)` declarations and the fifteen modifier names to
`[data-state]`, using the migration table row by row. Delete `.chip--warn` (byte-identical
to `.chip--assumed`). **Amber comes off `.banner--blocked`, `.gate-status--pending`,
`.edge-list__item.is-unset`, `.reason-list--uncertain` and `.lp-verdict`** — five
declarations that were never ASSUMED values, one of which (`.reason-list--uncertain`) says
"not assessed" in its own comment. `.lp-verdict`'s 2px rail goes with it.
Answer the one open row first: `RulesStep.tsx:471`'s `scenario.rangeNote` is `assumed` if
the engine resolves the range to a working value and `deferred` if it does not. Read the
engine, do not guess.
→ `pnpm test`: the landing prohibitions must still hold, and `apps/web/test/amber.test.tsx`
(new, §3.3) must pass in **both** directions — every `ASSUMED` node is amber, and every
amber node is one of the five whitelisted kinds.

**Step 6 — layout: shell, rail, rhythm.** §5.
`.shell`, `.bleed`, `.railed`, `.section`. Delete `.banner`'s own margin. Unify
`--content-max` / `--lp-max` onto `--page-max`.
→ `pnpm shots`: **the header, the banner and the first panel now begin at the same x.**
That single diff is the step's proof. → `pnpm smoke` at 320/390/768.

**Step 7 — patterns.** §6.0, §6.1, §6.5–§6.13, in that order. `.plate` last among the
containers, because 27 instances depend on it. `.chip` and `.refusal` are new components,
not renames. Migrate the 13 `var(--measure)` call sites and then delete the alias.
→ After the schedule: the assumption register's table fills its plate, the 444px void is
gone, **and the rank column is 4.5rem wide** — if it still shrink-wraps, the
`:not(.schedule__rank)` exclusion did not land. → After the figure: all four drawings share
one frame, **and no registration corner touches an SVG** at any container width; check at
both sides of the 26rem container query. → `pnpm smoke`, `pnpm shots` after each.
→ Now land `assertAmberExclusive`, `assertRailWidths` and `assertNoChromeOnBand` from Step 2.

**Step 8 — uncertainty.** §7.
The scale-linked underline; the hover that **adds a ring and does not move the ground**;
the margin tally with its zero state; the **seven** drawn marks with the paths in §7.5;
VARIANCE's 2px frame in place of its fill; the striped ASSUMED meter fill.
→ `pnpm shots` **in greyscale**, and print one page. Every uncertainty state must remain
identifiable with the colour removed. Specifically: an ASSUMED meter must be
distinguishable from a BINDING meter and from a NEUTRAL meter **on paper**, and an ASSUMED
rail must be distinguishable from a BINDING rail **by width**. A state that is only
findable in colour has failed this step regardless of what the checker says.

**Step 9 — motion.** §8.
Delete `lp-fade` and give the plan shapes **no animation** — not a transform settle. Strip
opacity from `lp-rise`. Move every transition inside `no-preference`. Replace the
`nth-child` stagger with `--motion-order` set from an inline `style` in JSX. Extend the
print lock to `.app`, keep the `::before`/`::after` selectors, drop `.doc`, and **remove
`transform: none !important`** — it snaps `Landing.tsx:237`'s rotated dimension label
horizontal on paper today.
→ `pnpm shots` is the gate: a full-page screenshot with **no section blank and no shape
missing**. Then again with `prefers-reduced-motion: reduce`, which must be identical.
→ Print the landing page: the `-90°` dimension label must still be rotated.

**Step 10 — display precision.** §4.4, in `TracedValue.tsx`.
→ **`pnpm test` is the gate, not `pnpm example`.** `apps/web/test/landing.test.tsx:193`
asserts `group(WORKED.verified.governingGfaM2)` = `"6,774.194"`; under `m2 → 1 decimal`
the page prints `6,774.2` and that assertion fails. Route it through the same formatter
the component uses (§4.4) rather than hard-coding either string.
→ `pnpm example` must **also** still pass: `verify-worked-example.mjs` re-runs the real API
and diffs it against `worked-example.json`. It compares engine output, so a display change
cannot move it. If it fails here, rounding has leaked into a computation, which is the one
outcome this step is not allowed to have.
→ Formula strings are **not** reformatted (§4.4): `formulas.bandA` keeps `3200.00 m²` while
the figure beside it reads `3,200.0`. That is CLAUDE.md's rule, not an oversight.

**Step 11 — the shared components.** One `<Shell>` (which also carries the `data-scrolled`
observer from §6.1), one `<PanelHeader>`, one `<ClaimStatement>` — removing the three-file
duplication of a permanent disclosure.
→ `pnpm test`: extend `apps/web/test/landing.test.tsx` so the claim-statement prohibitions
cover **all three** mount points, not one.

**Finally — `pnpm check`.** Boundaries, contrast, tests, typecheck, example, smoke.
None of the work above adds a dependency, and none of it touches `packages/`. If
`pnpm boundaries` has anything to say after a design pass, something has gone badly wrong.

---

## Review — 31 Aug 2026

This document was reviewed against the four stylesheets, `scripts/contrast.mjs`, the
component sources and `worked-example.json`, and every ratio in it was recomputed from the
WCAG relative-luminance formula. The verdict was **reject as written**: the arithmetic was
sound — every stated ratio reproduces to the last printed digit, and so does every "was"
diagnosis in §2.1 and §2.2 — but the document weakened **five** honesty treatments while
arguing it was strengthening them, its gate did not cover its own CSS, and several of the
mechanisms it delegated its central guarantee to did not exist.

**Treatments restored.**

- **The 6px rail is ASSUMED's alone again.** §6.2 had given `binding` the same
  `--rail-w-emphasis`, which voids §7.4(c): amber and the accent are 1.21× apart in light
  and 1.36× in dark, so on a photocopy two mid-greys would have carried the channel that
  section calls robust. §2.5 reserves the width, §6.2 spends it once, `assertRailWidths`
  (§3.3) enforces it.
- **Hover no longer deletes the amber ground.** §7.1 had `.traced--assumed:hover`
  swapping in `--surface-inset`. Hover now *adds* a 1px `--uncertain-border` ring and
  leaves all five channels intact. (The critic attributed this to `provenance.css:111`;
  that is wrong — the shipped rule keeps the amber ground and repaints the
  `text-decoration-color`, which is the *other* defect §7.1 correctly diagnosed. This
  document had introduced the ground swap itself.)
- **`--variance` is reverted to `#a8271f`.** §2.1 had lightened it 7.06 → 6.36 so amber
  would outrank it — a 10% softening of the token that paints NEVER CLAIMED, to win a
  comparison §3.3 says the assertion must not depend on. §7.4(a) now states plainly that
  the rank is asserted against `--accent`/`--accent-focus` only, and that `--variance`
  leads amber by 1.010× in light and print.
- **The ASSUMED meter has a non-colour cue.** It was separated from binding and neutral by
  hue alone, and the print block repainted all three to one hatch. §6.9 stripes the amber
  fill on screen and gives the three states three textures on paper; §7.2's cue table has
  a meter column.
- **VARIANCE's fill removal is paid for** rather than presented as pure gain: the frame
  goes to 2px in a repaired `--variance-border` and the drawn wedge becomes mandatory.
- **The two-tier amber is restored.** §2.1 darkened `--uncertain` and left
  `--uncertain-strong` under "unchanged, deliberately", collapsing the pair from
  **1.540×** to **1.132×** — one ink, while §7.1 went on spending it as two ranks.
  `--uncertain-strong` moves to `#643800` by the same 0.816 scale factor, restoring
  **1.425×**. Every ratio it appears in goes up.

**Gate widened.** §3.1 was rewritten so the **nine grounds are enumerated in code** and
the pairs are generated from them — 28 pairs became **135**, 405 rows, 0 failures. That
absorbs all 24 pairs the review found unmeasured. `--surface-contrast` is excluded **by
name with its numbers printed** (amber 2.58 against accent 3.12 in light) and the
exclusion is enforced by two assertions rather than assumed. `--state-surface:
transparent` is gone — an unresolvable ground is a failure here, not a skip — and
`--edge-lift` is not added, for the same reason `--focus-ring` is deleted. House rows now
run in **three** themes, so the print border values §3.2 quoted are measured by the lane
that quotes them.

**Mechanisms written.** `assertAmberExclusive`, `assertNoChromeOnBand`,
`assertAmberSurfaceMostChromatic`, `assertRailWidths`, `ratioOf`, `chromaOf` and `fail`
now have bodies; the seven drawn marks have paths; `.chip` and `.refusal` are specified;
`--z-*` and `--weight-light` are declared in token blocks rather than in prose; the
`data-scrolled` observer, `--motion-order`, `--meter-value` and `--meter-datum` are shown
as the JSX they have to be. `[data-state]` gained `partial` and `blocked`, and §6.2 now
carries a migration table covering **all fifteen** legacy names — which took amber off five
declarations that were never assumptions, including the ramp swatch, whose own comment
says its gradient and headroom are *not assessed*.

**Corrections of fact.** §1's chroma sentence said 0–6; the measured range is **0–12**
(`--text-tertiary` in both themes), and the sentence is restated around what the number
actually supports. §10 Step 0 demanded a failure that cannot occur — the shipped palette
passes all 28 pairs in all three themes — and the parser repair it was written against has
since landed on disk. §3.2's "in print the ladder collapses to 1.00" is true of two rungs
and false of the third (inset/raised is 1.17). §6.3's claim that a 15ch cap prevents the
320px overflow is wrong by arithmetic: 15ch at 36px is **324px** against a 288px column, so
the cap is inactive below ≈356px. (The review said "roughly 480px"; the correct figure is
≈356px, and the substantive point stands.) §8's two adjacent sentences about `lp-fade`
contradicted each other; the plan shapes now get no animation at all, because geometry
does not move.

**Sequencing fixed.** Deleting `--focus-ring` at Step 3 stripped focus rings from three
live sites with no replacement and no gate; §6.0 supplies the global rule and Step 3 lands
both in one commit behind a keyboard pass and a grep. Deleting `--measure` at Step 3 would
have invalidated 13 live `max-width` declarations; it is a deprecated alias until Step 7.
Step 1b removes the twelve raw print hex values that §7.3's paper argument depends on and
that no step previously touched. Step 10 names `pnpm test` — `landing.test.tsx:193` breaks
under the precision policy and `pnpm example` would not have caught it.

**What the review got wrong, recorded rather than silently corrected.** Two things. The
hover attribution above. And `--tracking-label-lg`, `--measure-quote`, `--shadow-overlay`,
`--ease-in` and `--duration-slow` were listed as tokens needing consumers; on inspection
the honest fix for all five was deletion, not invention — `--space-9`/`--space-10` and
`--radius-pill`/`--radius-round` were the ones that earned consumers instead.
