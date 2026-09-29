/**
 * `/refusals` — what it refuses.
 *
 * THE PERMALINK A READER FORWARDS TO THEIR LAWYER OR THEIR ARCHITECT.
 *
 * Every other public page argues that the engine is worth believing. This one is
 * the test of that argument, and it only works if it is written as BEHAVIOUR. A
 * refusal is a verb the software performs — a status code, a class the type system
 * will not construct, a page this site declines to print — and never an absence it
 * regrets. So the contract comes first, before a word of prose: a run with the
 * parking-in-FAR treatment undeclared answers 422, an export before its two gates
 * answers 409, and a run that fails a check is never stored at all. A reader who
 * stops after that table has already seen the shape of the whole page.
 *
 * FOUR THINGS THIS FILE MAY NOT DO, each recorded because each was reachable while
 * it was being written.
 *
 * 1. **It may not assert a control the software does not perform.** The reviewer
 *    gate is the strongest item here and the easiest to invert: "an export names a
 *    reviewer who is deliberately not the author" is one comfortable sentence away
 *    from what the handler does, and it is false. `canReview` tests that a licence
 *    string is non-empty; it is the only check the G4 handler makes; it never
 *    compares the signer to the run's author and it never verifies the licence with
 *    anybody. §06 says so in the same breath as what the gate DOES, because an
 *    asserted control is worse than a missing one — a missing control is visible.
 *
 * 2. **It may not name the gates that stand in front of export wrongly.**
 *    `EXPORT_GATES` in `apps/api/src/gates.ts` is the assumption register and the
 *    named reviewer, and nothing else; the handler computes two further subject
 *    hashes and never reads them. `README.md` says "G1–G4" and is wrong in exactly
 *    that way, which is why the status codes are taken from the README and the gate
 *    list from the file that enforces it. There is no transitive chain in the
 *    source, so a page implying one would be describing a control by inference.
 *
 * 3. **It may not print a figure a human typed, and it may not print a date.** The
 *    only number that reaches this page from outside is the realism discount, read
 *    from `worked-example.json` by its own key. The deferred constraints are read
 *    from the readiness snapshot. Everything else on the page is a status code or a
 *    name. No date appears anywhere: an owner is a plan and a date is a promise, and
 *    this product does not make those.
 *
 * 4. **It may not carry amber.** There is no ASSUMED value on this page, so there is
 *    no amber on it — the word appears in §02 describing what the massing does, and
 *    nothing here is painted with it. `refusals.css` makes the same argument from
 *    the stylesheet side: a refusal is never amber, never red and never a warning
 *    graphic, because painting a deliberate decision as a state would make it read
 *    as a fault. Typographic weight is the whole treatment.
 *
 * ---
 *
 * ON THE SHARED PARAGRAPHS. The five "does not" items, the IFC/glTF paragraph and
 * the optimiser heading come from `content/shared.tsx` — or, on the Arabic page,
 * from its twin `content/shared.ar.tsx` — and are rendered here as each section's
 * lede, never re-typed. A second copy diverges the first time somebody edits one,
 * and these are the paragraphs the whole proposition rests on.
 *
 * §07 IS NO LONGER AN EXCEPTION. `OPTIMISER_REFUSAL.body` used to end "…rather than
 * a limitation to apologise for", and `limitation` is in `BANNED_IN_ALL_COPY` —
 * asserted over the rendered markup of every route — so this page took the shared
 * heading and re-stated the argument in its own words rather than fail the gate on
 * one word it did not own. The word has been repaired in `content/shared.tsx`, the
 * body is imported like every other shared paragraph, and the second copy is gone
 * with it: two statements of one refusal diverge the first time somebody edits one.
 *
 * ---
 *
 * TWO LANGUAGES, AND THE ENGINE'S WORDS IN NEITHER DICTIONARY.
 *
 * Every hand-written sentence on this page comes from `i18n/refusals.en.ts` or its
 * Arabic counterpart, and the English module is the type the Arabic one is held
 * to, so a missing translation is a compile error rather than an English sentence
 * rendering under an Arabic heading. What stays here is what this page did not
 * write: the deferred rule records out of the readiness snapshot, the model file's
 * list of what it does not draw, every file path, status code and type name. On
 * the Arabic page each of those is rendered inside `Verbatim` — `dir="ltr"
 * lang="en"`, isolated — because a record translated is a second record nobody
 * issued, and an identifier laid out right-to-left is one a reader cannot check.
 *
 * `Verbatim` WRAPS ONLY ON THE ARABIC PAGE. The English render is byte-for-byte what
 * it was before the page had a second language: its tests grip that text, and on a
 * `lang="en"` document the wrapper would say nothing the document does not already
 * say. `Ident` and `AsEmitted` below are the two places that decision is made.
 */

import type { ReactNode } from 'react';

import { IFC_GLTF, LIMITS, OPTIMISER_REFUSAL, type Refusal } from '../content/shared.js';
import {
  IFC_GLTF_AR,
  LIMITS_AR,
  OPTIMISER_REFUSAL_AR,
  type SharedParagraph,
} from '../content/shared.ar.js';
import { AR } from '../i18n/refusals.ar.js';
import { EN, type RefusalsDictionary } from '../i18n/refusals.en.js';
import { PageContents } from '../components/PageContents.js';
import { Figure } from '../img.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';
import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import SNAPSHOT from './readiness.json' with { type: 'json' };
import WORKED from './worked-example.json' with { type: 'json' };

/* -------------------------------------------------------------------------
 * The shared items, by id.
 *
 * `find` on the id rather than an index, because `LIMITS` is ordered for the
 * landing page and this page renders the same five under its own numbering — a
 * positional read would silently repaint one refusal with another's heading the
 * first time that order changed, and nothing would look broken. It throws rather
 * than returning a blank: a refusal that fails to render reads as a refusal the
 * product does not make, which is the one failure mode this page cannot have.
 *
 * The list is passed in because there are two of them, and the ids are shared:
 * `LIMITS_AR` carries the same five ids as `LIMITS`, so one id finds one refusal
 * in either language.
 * ---------------------------------------------------------------------- */

function limitIn(list: readonly Refusal[], id: string): Refusal {
  const found = list.find((l) => l.id === id);
  if (!found) throw new Error(`content/shared carries no refusal with id "${id}"`);
  return found;
}

/* -------------------------------------------------------------------------
 * The deferred constraints, out of the readiness snapshot.
 * ---------------------------------------------------------------------- */

interface DeferredRecord {
  readonly ruleId: string;
  readonly parameterId: string;
  readonly isLifeSafety: boolean;
  readonly citation: {
    readonly instrumentId: string;
    readonly clauseReference: string;
    readonly sourcePage: number;
    readonly sourceTextVerbatim: string;
  };
}

const DEFERRED = SNAPSHOT.deferred as readonly DeferredRecord[];

/**
 * What the model does not draw, read out of the worked example's model file.
 *
 * Not typed here and not imported from the engine: the list is the one the .glb
 * carries in its metadata, which `scripts/verify-worked-example.mjs` reads out of
 * the file the API wrote. The model's own list and the file's are the same by
 * construction (`pnpm parity` asserts it), and the file is what a reader holds.
 * It is the file's text, so it is never translated.
 */
const NOT_DRAWN: readonly string[] = WORKED.verified.exports.glb.notModelled;

/**
 * Whether a citation is a real one, READ OFF THE RECORD rather than asserted.
 *
 * Every seed rule in this deployment names `PLACEHOLDER-NOT-A-REAL-INSTRUMENT`,
 * a source page of zero and clause text marked not sourced. Hard-coding the chip
 * to say so would be a second copy of a fact the record already carries, and it
 * would go on saying it after the first real citation landed — which is the
 * inverse of the failure R9 exists to prevent, and equally untrue. Three
 * independent marks of a placeholder, because a record repaired in one of them
 * and not the others is still a placeholder.
 */
const isSourced = (c: DeferredRecord['citation']): boolean =>
  c.instrumentId !== 'PLACEHOLDER-NOT-A-REAL-INSTRUMENT' &&
  c.sourcePage > 0 &&
  !c.sourceTextVerbatim.startsWith('[NOT SOURCED]');

/**
 * The rows of §11, in the one order both languages render them in.
 *
 * The dictionary keys the rows rather than listing them, so the Arabic cannot drop
 * one and still compile; this list is the order. `_EVERY_ROW` fails to compile if a
 * row is added to the dictionary and not to this list, which is the other half: a
 * translated row that is never rendered is a refusal the page stopped stating.
 */
type NotHereId = keyof RefusalsDictionary['notOnSite']['rows'];
const NOT_HERE = [
  'accuracy',
  'customers',
  'caseStudy',
  'comparison',
  'price',
  'certification',
  'security',
  'uptime',
  'blog',
  'integrations',
  'team',
  'terms',
] as const satisfies readonly NotHereId[];
const _EVERY_ROW: Exclude<NotHereId, (typeof NOT_HERE)[number]> extends never ? true : false =
  true;
void _EVERY_ROW;

/* -------------------------------------------------------------------------
 * The section chassis.
 *
 * One shape for every section on the page, composed from `site.css` and adding
 * nothing: the shell column, the section rhythm and its datum rule, the margin
 * index on the shared rail, the heading and the lede. R3 sends this page to the
 * feature-page chassis precisely because it is the longest one on the site —
 * length reads as thoroughness only when the layout treats it as content, and a
 * page of bare paragraphs under one rule reads as an errata sheet.
 *
 * THE INDEX CARRIES NO DENOMINATOR, and the omission is deliberate. The design
 * language offers one as "a fact about the page, never a claim about the engine";
 * here most of the sections it would be counting are refusals, so `01 / 13` in the
 * margin of this page in particular is a count of refusals at page scale, which is
 * the one figure this page is forbidden. The landing page's index carries no
 * denominator either, so this also matches the reference implementation.
 * ---------------------------------------------------------------------- */

function Section({
  index,
  id,
  title,
  lede,
  children,
  major = false,
}: {
  readonly index: number;
  readonly id: string;
  readonly title: ReactNode;
  readonly lede?: ReactNode | undefined;
  readonly children: ReactNode;
  readonly major?: boolean | undefined;
}): JSX.Element {
  return (
    <section
      id={id}
      className={`shell section${major ? ' section--major' : ''}`}
      aria-labelledby={`${id}-h`}
    >
      <div className="railed">
        {/* `aria-hidden`: "07" read out before a heading is noise, and the heading
            already carries the section's identity. */}
        <p className="index railed__margin" aria-hidden="true">
          {String(index).padStart(2, '0')}
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id={`${id}-h`}>{title}</h2>
            {lede ? <p className="rf__lede">{lede}</p> : null}
          </div>
          {/* The reveal moves and does not fade. A scroll-driven animation holds
              its start state for anything that has never entered a viewport, and
              "has never entered a viewport" is the permanent condition of a
              printed page — so an opacity reveal on a page this long would print
              most of it blank. `transform` only. */}
          <div className="section__body reveal">{children}</div>
        </div>
      </div>
    </section>
  );
}

/**
 * What the engine, the API or a fixture emitted, rendered as it was emitted.
 *
 * Bare on the English page and inside `Verbatim` on the Arabic one — see the
 * docblock. A clause reference such as `UAE FLS Code, Chapter 2` is a citation off
 * a rule record: under an Arabic column heading it keeps its words, its direction
 * and an English voice, or the reader is handed a citation nobody can look up.
 */
function AsEmitted({ children }: { readonly children: ReactNode }): JSX.Element {
  return useLocale().locale === 'ar' ? <Verbatim>{children}</Verbatim> : <>{children}</>;
}

/**
 * A file path, a status code or a type name, set as a specimen rather than as prose.
 *
 * `AsEmitted` sits OUTSIDE the `code`, as `Readiness.tsx` does it, so `.rf-ident`
 * keeps its mono face on both pages rather than inheriting `.verbatim`'s family.
 */
function Ident({ children }: { readonly children: ReactNode }): JSX.Element {
  return (
    <AsEmitted>
      <code className="rf-ident">{children}</code>
    </AsEmitted>
  );
}

/* -------------------------------------------------------------------------
 * The page.
 * ---------------------------------------------------------------------- */

export default function Refusals({ navigate }: PageProps): JSX.Element {
  const t = useDict(EN, AR);
  const limits = useDict(LIMITS, LIMITS_AR);
  const limit = (id: string): Refusal => limitIn(limits, id);
  const files = useDict<SharedParagraph>(IFC_GLTF, IFC_GLTF_AR);
  const optimiser = useDict<SharedParagraph>(OPTIMISER_REFUSAL, OPTIMISER_REFUSAL_AR);

  /*
    ONE RECORD FOR THE ORDER, THE ORDINALS AND THE CONTENTS LIST — see the same
    note on `/exports`. `professional` is the one entry whose heading is assembled
    in the markup rather than taken whole from a dictionary, so the label is
    assembled the same way here: the contents line and the `<h2>` are two renders
    of one sentence rather than two sentences that happen to agree today.
  */
  const order: readonly { readonly id: string; readonly label: string }[] = [
    { id: 'contract', label: t.contract.title },
    { id: 'draw', label: limit('draw').heading },
    { id: 'life-safety', label: limit('life-safety').heading },
    { id: 'realistic', label: limit('realistic').heading },
    { id: 'parking-in-far', label: limit('parking-in-far').heading },
    {
      id: 'professional',
      label: `${limit('professional').heading} ${t.professional.titleAnd}`,
    },
    { id: 'optimiser', label: optimiser.heading },
    { id: 'standards', label: t.standards.title },
    { id: 'coverage', label: t.coverage.title },
    { id: 'files', label: files.heading },
    { id: 'not-on-this-site', label: t.notOnSite.title },
    { id: 'who-changes', label: t.whoChanges.title },
    { id: 'unproven', label: t.unproven.title },
  ];
  const idx = (id: string): number => order.findIndex((s) => s.id === id) + 1;

  return (
    <div className="rf">
      {/* ================= HERO ========================================= */}
      <section
        className="shell section section--opening figured"
        aria-labelledby="rf-hero-h"
      >
        <div className="figured__text">
          <h1 id="rf-hero-h">{t.hero.title}</h1>
          <p className="rf__lede">{t.hero.lede}</p>
          <p className="rf__hero-note">{t.hero.note}</p>
        </div>
        {/*
          THE PIPELINE THAT STOPS AT ITS THIRD STAGE — `image-prompts.md` #24, and
          the one image the brief permits red.

          It is described rather than decorative, and the description is the
          careful part: "stopped", not "failed". A refusal in this product is a
          computation that declined to answer, which is the whole subject of this
          page; a picture that reads as an error would argue the opposite of every
          sentence beside it.
        */}
        <Figure name="state-refused" className="figured__figure" />
      </section>

      {/* ================= 01 · THE REFUSAL CONTRACT ==================== */}
      <PageContents entries={order} />

      <Section index={idx('contract')} id="contract" major title={t.contract.title} lede={t.contract.lede}>
        {/* R13: a wide table scrolls inside its own container rather than pushing
            the document sideways, and a scroller is keyboard-reachable because
            2.1.1 applies to a scroll region the same way it applies to a control.
            Below 40rem the chassis turns it into a stack of ruled records, so at
            320px there is nothing to scroll. */}
        <div
          className="schedule"
          role="region"
          aria-label={t.contract.regionLabel}
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">{t.contract.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.contract.columns.asked}</th>
                <th scope="col">{t.contract.columns.response}</th>
                <th scope="col" className="schedule__fill">
                  {t.contract.columns.enforced}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" data-label={t.contract.cells.asked}>
                  {t.contract.undeclared}
                </th>
                {/*
                  ONE ELEMENT PER CELL, and it is not tidiness. Below 40rem the
                  chassis turns every cell into a two-column grid — the re-emitted
                  label, then the value — and grid blockifies each inline-level
                  ELEMENT child into its own item while wrapping the loose text
                  around it into another. A cell holding `<code>422</code>, and no
                  guess` therefore lays out as THREE items in two columns, and the
                  trailing clause drops into the label column on a second row. It
                  looks like a wrapping fault rather than a layout one, which is why
                  it survives a screenshot.
                */}
                <td data-label={t.contract.cells.response}>
                  <span className="rf-cell">
                    <Ident>422</Ident>
                    {t.contract.noGuess}
                  </span>
                </td>
                <td className="schedule__fill" data-label={t.contract.cells.enforced}>
                  <Ident>packages/capacity/src/pipeline.ts</Ident>
                </td>
              </tr>
              <tr>
                <th scope="row" data-label={t.contract.cells.asked}>
                  {t.contract.exportGate}
                </th>
                <td data-label={t.contract.cells.response}>
                  <Ident>409</Ident>
                </td>
                <td className="schedule__fill" data-label={t.contract.cells.enforced}>
                  <Ident>apps/api/src/gates.ts</Ident>
                </td>
              </tr>
              <tr>
                <th scope="row" data-label={t.contract.cells.asked}>
                  {t.contract.failsCheck}
                </th>
                <td data-label={t.contract.cells.response}>
                  <span className="rf-cell">
                    <Ident>422</Ident>
                    {t.contract.neverStored}
                  </span>
                </td>
                <td className="schedule__fill" data-label={t.contract.cells.enforced}>
                  <Ident>apps/api/src/server.ts</Ident>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>{t.contract.thirdRow}</p>

        <div className="callout">
          <div className="callout__body">
            <strong>{t.contract.gatesTitle}</strong>
            <p>{t.contract.gatesBody(<Ident>Gate</Ident>, <Ident>409</Ident>)}</p>
          </div>
        </div>
      </Section>

      {/* ================= 02 · IT DOES NOT DRAW A BUILDING ============= */}
      <Section index={idx('draw')} id="draw" title={limit('draw').heading} lede={limit('draw').body}>
        <p>{t.draw.model}</p>
        <h3 className="rf-sub" id="not-drawn">
          {t.draw.notDrawnTitle}
        </h3>
        <p>{t.draw.notDrawnLede}</p>
        <ul className="rf-list">
          {NOT_DRAWN.map((n) => (
            <li key={n}>
              <AsEmitted>{n}</AsEmitted>
            </li>
          ))}
        </ul>
        <p>{t.draw.neighbours}</p>
        <p>{t.draw.podium}</p>
      </Section>

      {/* ================= 03 · IT DOES NOT CHECK LIFE SAFETY =========== */}
      <Section
        index={idx('life-safety')}
        id="life-safety"
        title={limit('life-safety').heading}
        lede={limit('life-safety').body}
      >
        <p>{t.lifeSafety.omission}</p>

        {DEFERRED.length === 0 ? (
          /* NEVER AN EMPTY TABLE HERE. An empty list reads as "nothing is
             deferred", which is the precise inversion this section exists to
             prevent, and it would read that way loudest on the page that promises
             the opposite. So an absent or empty snapshot says it is absent. */
          <div className="empty" data-state="deferred">
            <p className="empty__title">{t.lifeSafety.emptyTitle}</p>
            <p>{t.lifeSafety.emptyBody}</p>
          </div>
        ) : (
          <div
            className="schedule"
            role="region"
            aria-label={t.lifeSafety.regionLabel}
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">{t.lifeSafety.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">{t.lifeSafety.columns.rule}</th>
                  <th scope="col">{t.lifeSafety.columns.parameter}</th>
                  <th scope="col" className="schedule__fill">
                    {t.lifeSafety.columns.clause}
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEFERRED.map((d) => {
                  const sourced = isSourced(d.citation);
                  return (
                    /* The row carries the DEFERRED state, which is its own ground,
                       real italic and a dashed rule — three cues before colour. */
                    <tr key={d.ruleId} data-state="deferred">
                      {/* R9: the id and the state of its citation are in ONE cell, so
                          they stay in one eyeful in the stacked view at 320px as well
                          as in the table. A rule id set beside a clause reference
                          reads as a regulation unless something adjacent says
                          otherwise, and a footnote is not adjacent. */}
                      <th scope="row" data-label={t.lifeSafety.columns.rule}>
                        <span className="rf-cell">
                          <Ident>{d.ruleId}</Ident>
                          <span className="rf-chips">
                            {d.isLifeSafety ? (
                            /* A neutral chip, and that is a ruling rather than an
                               oversight. "Life safety" classifies the clause; it is
                               not a status. The status is the row's own deferred
                               treatment and the heading above it. Painting a taxonomy
                               label in the ink reserved for NEVER CLAIMED would spend
                               the product's loudest colour on a category. */
                              <span className="chip">{t.lifeSafety.chips.lifeSafety}</span>
                            ) : null}
                            <span className={sourced ? 'chip' : 'chip chip--deferred'}>
                              {sourced
                                ? t.lifeSafety.chips.sourced
                                : t.lifeSafety.chips.notSourced}
                            </span>
                          </span>
                        </span>
                      </th>
                      <td data-label={t.lifeSafety.columns.parameter}>
                        <Ident>{d.parameterId}</Ident>
                      </td>
                      <td className="schedule__fill" data-label={t.lifeSafety.columns.clause}>
                        <AsEmitted>{d.citation.clauseReference}</AsEmitted>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p>{t.lifeSafety.chipNote}</p>
      </Section>

      {/* ================= 04 · REALISTICALLY ACHIEVABLE ================ */}
      <Section
        index={idx('realistic')}
        id="realistic"
        title={limit('realistic').heading}
        lede={limit('realistic').body}
      >
        <p>{t.realistic.schema}</p>

        <div className="plate">
          <div className="plate__header">
            <div>
              <p className="plate__title">
                {t.realistic.discountLabel}{' '}
                <span className="value">{WORKED.input.run.realismDiscount}</span>
              </p>
              <p className="plate__subtitle">
                {t.realistic.discountNote(<Ident>USER_SET</Ident>)}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ================= 05 · THE PARKING-IN-FAR QUESTION ============= */}
      <Section
        index={idx('parking-in-far')}
        id="parking-in-far"
        title={limit('parking-in-far').heading}
        lede={limit('parking-in-far').body}
      >
        <p>{t.parking.noDefault(<Ident>DERIVED</Ident>, <Ident>USER_SET</Ident>)}</p>
        <p>
          {t.parking.spreadBefore}
          <Link to="/parking" navigate={navigate}>
            {t.parking.spreadLink}
          </Link>
          {t.parking.spreadAfter}
        </p>
      </Section>

      {/* ================= 06 · A PROFESSIONAL, AND THE REVIEWER ======== */}
      <Section
        index={idx('professional')}
        id="professional"
        major
        title={
          <>
            {limit('professional').heading}{' '}
            <span className="rf-title__and">{t.professional.titleAnd}</span>
          </>
        }
        lede={limit('professional').body}
      >
        <div className="grid">
          <div className="plate">
            <h3 className="plate__title">{t.professional.doesTitle}</h3>
            <p>{t.professional.doesBody}</p>
          </div>
          <div className="plate">
            <h3 className="plate__title">{t.professional.doesNotTitle}</h3>
            <p>{t.professional.doesNotBody}</p>
          </div>
        </div>

        <div className="callout">
          <div className="callout__body">
            <strong>{t.professional.calloutTitle}</strong>
            <p>{t.professional.calloutBody}</p>
          </div>
        </div>

        {/*
          THIS PARAGRAPH IS PHRASED AROUND ITS OWN TEST, and deliberately so. Written
          the obvious way it contains the noun phrase "a reviewer who is not the
          author" — describing the flow the gate exists for, one careless skim away
          from reading as the control this software does not perform, and caught by
          the pattern in `refusals.test.tsx`. The blunt regex is the right instrument
          and the sentence is what moves: a phrase a reader can misread as a control
          is a phrase this page should not contain, whichever clause it sits in.
        */}
        <p>{t.professional.share}</p>
      </Section>

      {/* ================= 07 · THE OPTIMISER =========================== */}
      <Section index={idx('optimiser')} id="optimiser" title={optimiser.heading} lede={optimiser.body}>
        {/* The shared paragraph states the mechanism; this page says what an optimiser
            would have had to claim in order to answer at all. The two do not overlap,
            which is the test for whether a page-side paragraph has earned its place
            beside an imported one. */}
        <p>{t.optimiser.judgement}</p>
      </Section>

      {/* ================= 08 · DEVELOPER STANDARDS ===================== */}
      <Section index={idx('standards')} id="standards" title={t.standards.title} lede={t.standards.lede}>
        <p>
          {t.standards.mechanism(
            <Ident>DeveloperStandard</Ident>,
            <Ident>ProjectBrief</Ident>,
            <Ident>RuleRecord</Ident>,
          )}
        </p>
        <p>{t.standards.confidential}</p>
      </Section>

      {/* ================= 09 · NOT THE WHOLE CODE ====================== */}
      <Section index={idx('coverage')} id="coverage" title={t.coverage.title} lede={t.coverage.lede}>
        <p>{t.coverage.families}</p>
        <p>{t.coverage.noPageCount}</p>
      </Section>

      {/* ================= 10 · A FILE IS NOT AN INTEGRATION ============ */}
      <Section index={idx('files')} id="files" title={files.heading} lede={files.body}>
        <p>{t.files.behaviour}</p>
      </Section>

      {/* ================= 11 · NOT ON THIS SITE ======================== */}
      <Section
        index={idx('not-on-this-site')}
        id="not-on-this-site"
        major
        title={t.notOnSite.title}
        lede={t.notOnSite.lede}
      >
        <div
          className="schedule"
          role="region"
          aria-label={t.notOnSite.regionLabel}
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">{t.notOnSite.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.notOnSite.columns.notHere}</th>
                <th scope="col" className="schedule__fill">
                  {t.notOnSite.columns.why}
                </th>
              </tr>
            </thead>
            <tbody>
              {NOT_HERE.map((id) => (
                <tr key={id}>
                  <th scope="row" data-label={t.notOnSite.columns.notHere}>
                    {t.notOnSite.rows[id].what}
                  </th>
                  <td className="schedule__fill" data-label={t.notOnSite.columns.why}>
                    {t.notOnSite.rows[id].why}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="callout">
          <div className="callout__body">
            <strong>{t.notOnSite.ruleTitle}</strong>
            <p>{t.notOnSite.ruleBody}</p>
          </div>
        </div>
      </Section>

      {/* ================= 12 · WHAT COULD CHANGE ======================= */}
      <Section
        index={idx('who-changes')}
        id="who-changes"
        title={t.whoChanges.title}
        lede={t.whoChanges.lede}
      >
        <div className="grid">
          <div className="plate">
            <h3 className="plate__title">{t.whoChanges.permanent.title}</h3>
            <ul className="rf-owners">
              <Owner item={t.whoChanges.permanent.compliance} />
              <Owner item={t.whoChanges.permanent.realism} />
              <Owner
                item={{
                  label: t.whoChanges.permanent.optimiser.label,
                  body: t.whoChanges.permanent.optimiser.body(<Ident>TRADEOFF</Ident>),
                }}
              />
            </ul>
          </div>

          <div className="plate">
            <h3 className="plate__title">{t.whoChanges.awaiting.title}</h3>
            <ul className="rf-owners">
              <Owner item={t.whoChanges.awaiting.approval} />
              <Owner item={t.whoChanges.awaiting.annex} />
              <Owner item={t.whoChanges.awaiting.study} />
            </ul>
          </div>

          <div className="plate">
            <h3 className="plate__title">{t.whoChanges.outside.title}</h3>
            <ul className="rf-owners">
              <Owner item={t.whoChanges.outside.units} />
              <Owner item={t.whoChanges.outside.coverage} />
              <Owner item={t.whoChanges.outside.dormant} />
            </ul>
          </div>
        </div>

        <p>{t.whoChanges.noDate}</p>
      </Section>

      {/* ================= 13 · WHAT THIS PAGE DID NOT PROVE ============ */}
      <Section
        index={idx('unproven')}
        id="unproven"
        title={t.unproven.title}
        lede={<>{t.unproven.lede}</>}
      >
        <p>{t.unproven.authors}</p>
        <p>{t.unproven.readiness}</p>
        <div className="cta">
          <Link to="/readiness" navigate={navigate} className="button">
            {t.unproven.cta}
          </Link>
          <p className="cta__note">{t.unproven.ctaNote}</p>
        </div>
      </Section>
    </div>
  );
}

/** One item of §12: the bold label, then the sentence that says what closes it. */
function Owner({
  item,
}: {
  readonly item: { readonly label: string; readonly body: ReactNode };
}): JSX.Element {
  return (
    <li>
      <strong>{item.label}</strong> {item.body}
    </li>
  );
}
