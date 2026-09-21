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
 * the optimiser heading come from `content/shared.tsx` and are rendered here as each
 * section's lede, never re-typed. A second copy diverges the first time somebody
 * edits one, and these are the paragraphs the whole proposition rests on.
 *
 * §07 IS NO LONGER AN EXCEPTION. `OPTIMISER_REFUSAL.body` used to end "…rather than
 * a limitation to apologise for", and `limitation` is in `BANNED_IN_ALL_COPY` —
 * asserted over the rendered markup of every route — so this page took the shared
 * heading and re-stated the argument in its own words rather than fail the gate on
 * one word it did not own. The word has been repaired in `content/shared.tsx`, the
 * body is imported like every other shared paragraph, and the second copy is gone
 * with it: two statements of one refusal diverge the first time somebody edits one.
 */

import type { ReactNode } from 'react';

import { IFC_GLTF, LIMITS, OPTIMISER_REFUSAL, type Refusal } from '../content/shared.js';
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
 * ---------------------------------------------------------------------- */

function limit(id: string): Refusal {
  const found = LIMITS.find((l) => l.id === id);
  if (!found) throw new Error(`content/shared.tsx carries no refusal with id "${id}"`);
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

/** A file path, a status code or a type name, set as a specimen rather than as prose. */
function Ident({ children }: { readonly children: ReactNode }): JSX.Element {
  return <code className="rf-ident">{children}</code>;
}

/* -------------------------------------------------------------------------
 * The page.
 * ---------------------------------------------------------------------- */

export default function Refusals({ navigate }: PageProps): JSX.Element {
  return (
    <div className="rf">
      {/* ================= HERO ========================================= */}
      <section className="shell section section--opening" aria-labelledby="rf-hero-h">
        <h1 id="rf-hero-h">What it refuses</h1>
        <p className="rf__lede">
          Refusals here are things the software does, not things it lacks. If you are
          looking for the overclaim, start on this page.
        </p>
        <p className="rf__hero-note">
          Each item below is a status code the API returns, a class the type system will
          not construct, or a page this site declines to print. Where something is
          genuinely missing rather than refused, it is in the last section but one, next
          to the name of the person who closes it.
        </p>
      </section>

      {/* ================= 01 · THE REFUSAL CONTRACT ==================== */}
      <Section
        index={1}
        id="contract"
        major
        title="The refusal contract"
        lede={
          <>
            Before any of the prose: what the API does at runtime, and the file that does
            it. These are not policies written down somewhere. They are the responses.
          </>
        }
      >
        {/* R13: a wide table scrolls inside its own container rather than pushing
            the document sideways, and a scroller is keyboard-reachable because
            2.1.1 applies to a scroll region the same way it applies to a control.
            Below 40rem the chassis turns it into a stack of ruled records, so at
            320px there is nothing to scroll. */}
        <div
          className="schedule"
          role="region"
          aria-label="What the API refuses at runtime"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">
              Three requests the API refuses, the response each one receives, and the file
              that enforces it.
            </caption>
            <thead>
              <tr>
                <th scope="col">What is asked for</th>
                <th scope="col">What comes back</th>
                <th scope="col" className="schedule__fill">
                  Where it is enforced
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" data-label="Asked for">
                  A run with the parking-in-FAR treatment undeclared
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
                <td data-label="Response">
                  <span className="rf-cell">
                    <Ident>422</Ident>, and no guess
                  </span>
                </td>
                <td className="schedule__fill" data-label="Enforced in">
                  <Ident>packages/capacity/src/pipeline.ts</Ident>
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Asked for">
                  An export while the assumption gate or the reviewer gate is unsatisfied
                </th>
                <td data-label="Response">
                  <Ident>409</Ident>
                </td>
                <td className="schedule__fill" data-label="Enforced in">
                  <Ident>apps/api/src/gates.ts</Ident>
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Asked for">
                  A run that fails an invariant or a hard constraint
                </th>
                <td data-label="Response">
                  <span className="rf-cell">
                    <Ident>422</Ident>, and the run is never stored
                  </span>
                </td>
                <td className="schedule__fill" data-label="Enforced in">
                  <Ident>apps/api/src/server.ts</Ident>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          The third row is the one that is easy to soften, and it has not been. A run that
          fails a check does not become a stored artefact with a caveat attached to it; it
          does not become an artefact. The checks run before anything is written, there is
          no warning level, there is no configurable severity and there is no override
          flag — and adding one would be a defect rather than a feature.
        </p>

        <div className="callout">
          <div className="callout__body">
            <strong>Which gates stand where</strong>
            <p>
              Four gates exist. That count is safe to write down because the{' '}
              <Ident>Gate</Ident> type has four members and adding a fifth is a
              compile-time event rather than a copy edit. Two of them stand in front of
              export — the assumption register and the named reviewer — and an export
              attempted before either has been acknowledged answers <Ident>409</Ident>, as
              does one whose acknowledgement was given against different content and has
              lapsed. The other two name earlier steps, rule resolution and capacity
              computation, and that is where the file records them; the export door is not
              where they stand. There is no chain in the source that makes one gate wait on
              another, so a page telling you an export waits on all four would be
              describing a control by inference rather than by reading.
            </p>
          </div>
        </div>
      </Section>

      {/* ================= 02 · IT DOES NOT DRAW A BUILDING ============= */}
      <Section
        index={2}
        id="draw"
        title={limit('draw').heading}
        lede={limit('draw').body}
      >
        <p>
          The 3D view is the engine&rsquo;s own model of the building — each level at its
          floor, each car in its bay, the ramp between the levels it joins — and every
          object in it is coloured by the provenance class of the value it stands for
          rather than by a palette the renderer chose. A building assembled in the viewer
          would be a building nobody computed, drawn convincingly, on the most persuasive
          surface in the product — so it is built in the engine and the picture is
          downstream of the arithmetic.
        </p>
        <p>
          What the model does not contain is listed under the picture: slab thickness,
          cores, façades. A view with no cores reads as a building with no cores unless it
          says why.
        </p>
        <p>
          Where the podium stops and the tower starts is not derivable from a run. The
          affection plan states it. A run given no podium level count therefore carries an
          assumed one: it is amber, it is listed in the assumption register, and it is said
          in words as well as in colour, because a reader who cannot see the colour has to
          be told the same thing by the sentence.
        </p>
      </Section>

      {/* ================= 03 · IT DOES NOT CHECK LIFE SAFETY =========== */}
      <Section
        index={3}
        id="life-safety"
        title={limit('life-safety').heading}
        lede={limit('life-safety').body}
      >
        <p>
          A missing check reads as a check that passed. That is the whole reason the
          deferred constraints are named in every single output rather than dropped from
          it — a reader can argue with a list, and cannot argue with an omission.
        </p>

        {DEFERRED.length === 0 ? (
          /* NEVER AN EMPTY TABLE HERE. An empty list reads as "nothing is
             deferred", which is the precise inversion this section exists to
             prevent, and it would read that way loudest on the page that promises
             the opposite. So an absent or empty snapshot says it is absent. */
          <div className="empty" data-state="deferred">
            <p className="empty__title">The deferred list is not in this build.</p>
            <p>
              This section reads the deferred constraints from a generated readiness
              snapshot, and the snapshot this build carries names none. That is not the
              same statement as nothing being deferred, so nothing is listed rather than an
              empty table. Regenerating the snapshot from a real run restores it.
            </p>
          </div>
        ) : (
          <div
            className="schedule"
            role="region"
            aria-label="Constraints this engine defers"
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">
                Constraints this engine defers, the parameter each one governs, and the
                state of the citation behind it.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rule</th>
                  <th scope="col">Parameter</th>
                  <th scope="col" className="schedule__fill">
                    Clause reference
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
                      <th scope="row" data-label="Rule">
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
                              <span className="chip">Life safety</span>
                            ) : null}
                            <span className={sourced ? 'chip' : 'chip chip--deferred'}>
                              {sourced ? 'Citation on file' : 'Draft · not sourced'}
                            </span>
                          </span>
                        </span>
                      </th>
                      <td data-label="Parameter">
                        <Ident>{d.parameterId}</Ident>
                      </td>
                      <td className="schedule__fill" data-label="Clause reference">
                        {d.citation.clauseReference}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p>
          The chip beside each id reports the state of that record&rsquo;s own citation and
          nothing more. Every seed rule in this deployment names a placeholder instrument
          and clause text marked not sourced, so every chip says so — and it says so
          because the record does, not because this page was written while that was true.
          A clause reference on a page like this one is a promise; the chip is what keeps
          the promise honest until a licensed architect has read the instrument and put
          their name to the rule.
        </p>
      </Section>

      {/* ================= 04 · REALISTICALLY ACHIEVABLE ================ */}
      <Section
        index={4}
        id="realistic"
        title={limit('realistic').heading}
        lede={limit('realistic').body}
      >
        <p>
          There is no realistic band, no expected band and no likely band. The field does
          not exist in the schema, so one cannot be configured in, enabled for a customer
          or added by a deployment — the absence is structural rather than a setting
          somebody left off. Any number put there would arrive without a derivation, on a
          product where every other figure carries one, and there is nothing in the engine
          that could give it one.
        </p>

        <div className="plate">
          <div className="plate__header">
            <div>
              <p className="plate__title">
                Realism discount on the run this site publishes:{' '}
                <span className="value">{WORKED.input.run.realismDiscount}</span>
              </p>
              <p className="plate__subtitle">
                No discount, which is the default. It is <Ident>USER_SET</Ident> rather
                than assumed: it holds until a named person changes it, and whoever changes
                it is recorded beside the figure they chose. That is the honest substitute
                for a realism band — a haircut somebody signs, rather than one the engine
                applies on their behalf and calls achievable.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ================= 05 · THE PARKING-IN-FAR QUESTION ============= */}
      <Section
        index={5}
        id="parking-in-far"
        title={limit('parking-in-far').heading}
        lede={limit('parking-in-far').body}
      >
        <p>
          There is no default and there was never one to remove. The treatment is either{' '}
          <Ident>DERIVED</Ident> from a cited rule or <Ident>USER_SET</Ident> by a named
          person; with neither, the run is refused before a capacity band is computed at
          all. That refusal is the first row of the contract above.
        </p>
        <p>
          No range is quoted here, and that is a deliberate deletion rather than an
          omission. A range cited from a specification is a claim about documents; the
          spread between the two answers for a plot the engine actually ran is a
          measurement. So the measurement is what this site prints, on{' '}
          <Link to="/parking" navigate={navigate}>
            the parking page
          </Link>
          , where both answers for the same plot are set side by side and the difference
          between them is engine output rather than a sentence.
        </p>
      </Section>

      {/* ================= 06 · A PROFESSIONAL, AND THE REVIEWER ======== */}
      <Section
        index={6}
        id="professional"
        major
        title={
          <>
            {limit('professional').heading}{' '}
            <span className="rf-title__and">
              And it does not enforce that the reviewer is not the author.
            </span>
          </>
        }
        lede={limit('professional').body}
      >
        <div className="grid">
          <div className="plate">
            <h3 className="plate__title">What the reviewer gate does</h3>
            <p>
              It refuses the acknowledgement unless the actor asserts a professional
              licence number, and it writes that name, that licence and that timestamp onto
              the export. Nothing leaves the system unsigned, and the signature is a
              person&rsquo;s rather than the system&rsquo;s: the engine never reports that
              it decided anything.
            </p>
          </div>
          <div className="plate">
            <h3 className="plate__title">What it does not do</h3>
            <p>
              It does not verify the licence with anybody — no registry is consulted,
              because no such integration has been scoped. And it does not compare the
              person signing against the person who authored the run. The check is that a
              licence string is non-empty, and it is the only check the handler makes.
            </p>
          </div>
        </div>

        <div className="callout">
          <div className="callout__body">
            <strong>So one person can author a run and sign it.</strong>
            <p>
              One person, holding one licence number, can do both — and this deployment
              will record the result as a reviewed export. The gate is a signature line,
              and a signature line is worth exactly what the signature is worth.
            </p>
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
        <p>
          Scoping a run to its author was considered and rejected. The gate exists for
          the case where a different person signs, and an ownership check would refuse
          exactly that case — so the control was not built, and the reason it was not
          built is a good one. It is still not evidence that some other control took its
          place. An asserted control is worse than a missing one, because a missing one
          is visible, and saying so here is the reason a reader can believe the rest of
          the page.
        </p>
      </Section>

      {/* ================= 07 · THE OPTIMISER =========================== */}
      <Section
        index={7}
        id="optimiser"
        title={OPTIMISER_REFUSAL.heading}
        lede={OPTIMISER_REFUSAL.body}
      >
        {/* The shared paragraph states the mechanism; this page says what an optimiser
            would have had to claim in order to answer at all. The two do not overlap,
            which is the test for whether a page-side paragraph has earned its place
            beside an imported one. */}
        <p>
          An optimiser that ranked layouts would be answering a question about preference
          with the authority of a calculation, and every figure it produced would be a
          number the reader could not trace back to a rule — because there is no rule.
          There is a judgement, and the judgement is the architect&rsquo;s.
        </p>
      </Section>

      {/* ================= 08 · DEVELOPER STANDARDS ===================== */}
      <Section
        index={8}
        id="standards"
        title="A developer standard could not cut your envelope, however many it held"
        lede={
          <>
            A developer&rsquo;s brief is a commercial preference. A regulation binds. The
            type system is where the difference is enforced, because a sentence in a
            document is not enforcement.
          </>
        }
      >
        <p>
          <Ident>DeveloperStandard</Ident> and <Ident>ProjectBrief</Ident> are deliberately
          not <Ident>RuleRecord</Ident>s. That is the whole mechanism: a{' '}
          <Ident>RuleRecord</Ident> is resolvable by the parameter resolver and can
          therefore bind the envelope, and these are not resolvable by it, so they cannot
          bind anything. They are served from their own endpoint and are never merged into
          the rule set. A standard that bound the envelope would be reporting a
          client&rsquo;s brief as a legal limit — a private target printed with the
          authority of a code — and the screen that offers them says, above the picker,
          that a standard is not a regulation.
        </p>
        <p>
          No cap, target, benchmark or ratio out of any developer&rsquo;s brief appears on
          this site, in numbers or in prose, and no developer is named. Those figures are
          transcribed accurately, each carrying the page and the bounding box it came from
          so the transcription can be checked rather than trusted, and they are reachable
          through the signed-in application and nowhere else. A confidential figure
          rewritten as a sentence is still the figure.
        </p>
      </Section>

      {/* ================= 09 · NOT THE WHOLE CODE ====================== */}
      <Section
        index={9}
        id="coverage"
        title="It is not the whole code"
        lede={
          <>
            What is encoded is a fraction of what applies to a building, and the fraction is
            not quantified, because nothing in this build can quantify it honestly.
          </>
        }
      >
        <p>
          The clause families encoded here are parking, setback, dimension and access. The
          fire code is not read at all — not partially, not with the gaps flagged. It is
          not an input to this engine, which is why life safety appears above as a list of
          deferred constraints rather than as a set of checks with a caveat.
        </p>
        <p>
          No page count of the source codes appears on this site. A corpus figure comes
          from a generated inventory or it does not appear, and this build holds no such
          inventory — so the honest statement of coverage is the list of families in the
          sentence above, and the reader supplies their own sense of what is missing from
          it. A percentage typed by hand would read as measurement and would be the one
          number here nobody could trace.
        </p>
      </Section>

      {/* ================= 10 · A FILE IS NOT AN INTEGRATION ============ */}
      <Section index={10} id="files" title={IFC_GLTF.heading} lede={IFC_GLTF.body}>
        <p>
          What another program does with a file we write is that program&rsquo;s behaviour,
          and we make no claim about it. We do not test against a third-party application,
          we do not say a file works with one, and we will not name one on this site. A
          format is a thing we can be held to; a tool&rsquo;s behaviour is a thing somebody
          else ships.
        </p>
      </Section>

      {/* ================= 11 · NOT ON THIS SITE ======================== */}
      <Section
        index={11}
        id="not-on-this-site"
        major
        title="What is not on this site, and why"
        lede={
          <>
            Not one of these is declined for taste. Each is a page the genre supplies by
            default and this product has nothing true to put on.
          </>
        }
      >
        <div
          className="schedule"
          role="region"
          aria-label="Pages and claims this site does not carry"
          tabIndex={0}
        >
          <table>
            <caption className="sr-only">
              Standard pages and claims this site does not carry, and the reason for each.
            </caption>
            <thead>
              <tr>
                <th scope="col">Not here</th>
                <th scope="col" className="schedule__fill">
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" data-label="Not here">
                  An accuracy figure
                </th>
                <td className="schedule__fill" data-label="Why">
                  The inter-architect variance study that would produce one has not been
                  run, so there is no measured agreement to report. A rounded guess would
                  be the one figure on this site that could not answer where it came from.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  A customer count or a logo wall
                </th>
                <td className="schedule__fill" data-label="Why">
                  There are no customers.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  A case study
                </th>
                <td className="schedule__fill" data-label="Why">
                  Every real plot in the corpus belongs to somebody else. The material to
                  build one is confidential rather than merely absent.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  A comparison table
                </th>
                <td className="schedule__fill" data-label="Why">
                  We have evaluated no competitor. The only competitor material held
                  anywhere is a machine transcript of a private call, which is neither an
                  evaluation nor ours to publish.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  A price
                </th>
                <td className="schedule__fill" data-label="Why">
                  Nothing about the present engagement generalises, and a number that does
                  not generalise printed as if it did is the same defect as any other
                  untraceable figure.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  A certification badge
                </th>
                <td className="schedule__fill" data-label="Why">
                  No output of this engine is certified by any authority, and there is no
                  certification to badge.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  A security or trust page
                </th>
                <td className="schedule__fill" data-label="Why">
                  A badge is a claim about a deployment, made by whoever prints it. The
                  page that would state this deployment&rsquo;s posture is written when the
                  people who set that posture have settled it, and not before.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  An uptime page
                </th>
                <td className="schedule__fill" data-label="Why">
                  Nothing monitors availability, so there is nothing to report. The
                  readiness page counts what is not ready, which is a different question
                  and is named as one.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  A blog or a newsletter
                </th>
                <td className="schedule__fill" data-label="Why">
                  Neither would carry anything that is not already on this site, and a
                  publishing schedule is a promise about the future.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  An integrations page
                </th>
                <td className="schedule__fill" data-label="Why">
                  Exports travel as files, which is the section above. There is nothing to
                  list.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  A team or an about page
                </th>
                <td className="schedule__fill" data-label="Why">
                  There is no legal entity to describe.
                </td>
              </tr>
              <tr>
                <th scope="row" data-label="Not here">
                  Terms or a privacy policy
                </th>
                <td className="schedule__fill" data-label="Why">
                  There is no legal entity, and drafting a legal instrument in-house is not
                  a design task. It is written by a lawyer, for an entity, and neither of
                  those is in place.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="callout">
          <div className="callout__body">
            <strong>The rule that produced the list</strong>
            <p>
              No figure on this site is typed by a human. Every number on every public page
              reads from a fixture written by a script from a real run, and a build step
              re-runs the engine and diffs it — so a figure that drifted would fail a gate
              rather than sit on a page. A page that cannot cite a number does not print
              one, which is why this section carries none.
            </p>
          </div>
        </div>
      </Section>

      {/* ================= 12 · WHAT COULD CHANGE ======================= */}
      <Section
        index={12}
        id="who-changes"
        title="Which of these could change, and who changes them"
        lede={
          <>
            A gap with an owner is a plan; a gap without one is an excuse. So every item
            below names what closes it, and the permanent ones say plainly that nothing
            does.
          </>
        }
      >
        <div className="grid">
          <div className="plate">
            <h3 className="plate__title">Permanent by design</h3>
            <ul className="rf-owners">
              <li>
                <strong>The compliance claim.</strong> Regulatory validity is not assessed
                here and is never claimed, at any readiness, in any deployment. It is not a
                gap; it is what the product is.
              </li>
              <li>
                <strong>The realism band.</strong> No realistic, expected or likely
                capacity, and no field in the schema to hold one.
              </li>
              <li>
                <strong>The optimiser class.</strong> A <Ident>TRADEOFF</Ident> value sits
                outside the class set this phase emits, and the constructor throws on one.
              </li>
            </ul>
          </div>

          <div className="plate">
            <h3 className="plate__title">Awaiting a named human</h3>
            <ul className="rf-owners">
              <li>
                <strong>Rule approval.</strong> A licensed Dubai architect authors and
                approves each rule against the actual instrument. Until one has, every
                citation on every screen is a placeholder and says so.
              </li>
              <li>
                <strong>The annex signature.</strong> The metric definitions annex is
                reviewed and signed. That signature is what unblocks every area term in the
                product, which is most of them.
              </li>
              <li>
                <strong>The agreement study.</strong> A variance band needs architects
                under contract, measuring the plots this engine measured.
              </li>
            </ul>
          </div>

          <div className="plate">
            <h3 className="plate__title">Outside this phase of work</h3>
            <ul className="rf-owners">
              <li>
                <strong>Unit layouts.</strong> A capacity is not a plan, and this phase
                stops at the envelope.
              </li>
              <li>
                <strong>Further code coverage.</strong> Each family added is a set of rules
                authored, cited and approved by the same named architect.
              </li>
              <li>
                <strong>The dormant invariants.</strong> They read a unit and per-level
                schedule this phase does not generate. Synthesising one to wake them would
                be verifying the engine against its own output, which is not verification.
              </li>
            </ul>
          </div>
        </div>

        <p>
          No date appears in any of that, and none will. An owner is a plan; a date is a
          promise, and this product does not make those. A sentence that names the person
          who closes a gap does not need to say when.
        </p>
      </Section>

      {/* ================= 13 · WHAT THIS PAGE DID NOT PROVE ============ */}
      <Section
        index={13}
        id="unproven"
        title="What this page did not prove"
        lede={<>That the refusals above are the complete set.</>}
      >
        <p>
          This page was written by the people who built the engine, from the files that
          enforce each item on it. A refusal nobody thought to write down is not here, and
          no gate on this repository can find one — a prohibition test catches a sentence
          that says too much, and is blind to a sentence that was never written. So the
          list is as complete as its authors, which is exactly the standard this product
          refuses to accept from anybody else.
        </p>
        <p>
          The readiness page is the shorter route to an argument with this one. It counts
          what is not ready in this deployment rather than describing it, it leads with the
          figures that read zero, and it carries no composite score for a reader to stop
          at.
        </p>
        <div className="cta">
          <Link to="/dashboard" navigate={navigate} className="button">
            See what is not ready
          </Link>
          <p className="cta__note">
            Approved rules and signed definitions both read zero on this deployment.
          </p>
        </div>
      </Section>
    </div>
  );
}
