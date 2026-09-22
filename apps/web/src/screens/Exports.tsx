/**
 * `/exports` — what comes out.
 *
 * EVERY NAME ON THIS PAGE WAS READ OUT OF A FILE. The layer table, the sheet list,
 * the workbook's sheet names and the notes above their tables, the DXF version,
 * the glTF version and extension lists, the sentences the model file carries, the
 * JSON's top-level fields and the answers the export gave before and after each
 * signature — all of it is `verified.exports` in `worked-example.json`, which
 * `scripts/verify-worked-example.mjs` writes by downloading the worked example's
 * files from the real API and opening them. A renamed layer therefore breaks
 * `pnpm example` rather than quietly making this page wrong. A hand-typed layer
 * name is the same defect as a hand-typed figure and harder to spot, because a
 * layer name looks like documentation rather than data.
 *
 * WHAT IT DOES NOT SAY, AND WHY (site-map §4.11):
 *
 * - Which programs open these files. "Writes DXF R12" is a fact about a file;
 *   a sentence naming a program that opens it is a claim about a tool somebody
 *   else ships. `dxf.ts` names programs in its header comment; a source comment is
 *   not public copy, and the distinction is the point.
 * - A count of formats. The list is the list.
 * - That two people sign. No code requires it: G4 records a name, an asserted
 *   licence and a timestamp, and compares the signer with nobody. The check that
 *   wrote this page's gate table signed its own run, and the export opened.
 * - That everything is stamped with everything. Every file says regulatory
 *   validity is not assessed — a field in the JSON, the sentence in the rest — and
 *   the check proves it file by file; the claim statement, the register and the
 *   signature travel in the report and the JSON, and the page says which file
 *   carries what rather than rounding up.
 *
 * NO SAMPLE FILE IS OFFERED. A file downloaded from a public page would have
 * skipped the two gates this page describes.
 */

import type { ReactNode } from 'react';

import { IFC_GLTF } from '../content/shared.js';
import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import WORKED from './worked-example.json' with { type: 'json' };

const X = WORKED.verified.exports;

/** A format's id in the check's output, and the name this page gives it. */
const FILE_NAME: Readonly<Record<string, string>> = {
  json: 'the JSON',
  html: 'the report',
  sheets: 'the drawing set',
  dxf: 'the drawing',
  xlsx: 'the workbook',
  glb: 'the model file',
};

/** What a gate's id is called in a sentence. */
const GATE_NAME: Readonly<Record<string, string>> = {
  G3_ASSUMPTIONS_ACKNOWLEDGED: 'the assumption register (G3)',
  G4_REVIEWER_NAMED: 'a named reviewer (G4)',
};

/** A phrase opening a table row, with its first letter raised. */
const sentence = (phrase: string): string => phrase.charAt(0).toUpperCase() + phrase.slice(1);

/**
 * The layer table, grouped by the part of the building each layer belongs to.
 *
 * `ENV-<part>-<element>`: the part is the second segment — the site, a level, a
 * ramp, the annotation — and never holds a hyphen (`SITE`, `B1`, `L00`, `R1`), so
 * the split is exact. Order is the file's.
 */
function layersByLevel(): readonly { readonly level: string; readonly layers: typeof X.dxf.layers }[] {
  const out: { level: string; layers: (typeof X.dxf.layers)[number][] }[] = [];
  for (const layer of X.dxf.layers) {
    const level = layer.name.split('-')[1] ?? layer.name;
    const row = out.find((r) => r.level === level);
    if (row) row.layers.push(layer);
    else out.push({ level, layers: [layer] });
  }
  return out;
}

function Section({
  index,
  id,
  title,
  lede,
  children,
}: {
  readonly index: number;
  readonly id: string;
  readonly title: ReactNode;
  readonly lede?: ReactNode;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <section id={id} className="shell section" aria-labelledby={`${id}-h`}>
      <div className="railed">
        <p className="index railed__margin" aria-hidden="true">
          {String(index).padStart(2, '0')}
        </p>
        <div className="railed__body">
          <div className="section__head">
            <h2 id={`${id}-h`}>{title}</h2>
            {lede ? <p className="rf__lede">{lede}</p> : null}
          </div>
          <div className="section__body">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Ident({ children }: { readonly children: ReactNode }): JSX.Element {
  return <code className="rf-ident">{children}</code>;
}

export default function Exports({ navigate }: PageProps): JSX.Element {
  const unsigned = X.gateSequence[0];
  return (
    <div className="rf ex">
      <section className="shell section section--opening" aria-labelledby="ex-h">
        <h1 id="ex-h">What comes out</h1>
        <p className="rf__lede">
          Every file this engine writes says its regulatory validity is not assessed, and
          none of them leaves until the assumption register is acknowledged and someone puts
          their name and licence on the export.
        </p>
        <p className="rf__hero-note">
          Every layer, sheet, note and version below was read out of the files the engine
          wrote for the worked example on the landing page, by the check that runs before
          this site is built. None of them is typed here: a file that changes changes this
          page, or stops the build.
        </p>
      </section>

      {/* ================= 01 · THE DRAWING ============================== */}
      <Section
        index={1}
        id="drawing"
        title="The drawing"
        lede={
          <>
            DXF R12 — the file&rsquo;s own header says <Ident>{X.dxf.version}</Ident>. R12
            predates the object model later revisions add, so it is the simplest complete
            DXF, and this drawing uses nothing it lacks.
          </>
        }
      >
        <p>
          It comes two ways. The whole building in one file, in three dimensions: the site
          plan at grade, each parking level at its own floor, each slab at its level, the
          massing as faces and the ramp as the slope it is. And each sheet of the drawing
          set as a file of its own, flat and at true size, for referencing into a drawing of
          your own. A section comes only as a sheet; drawn into the model, it would stand in
          the car park. The same sheets also come as one document to print, A3, one sheet to
          a page.
        </p>

        <div className="schedule" role="region" aria-label="The sheets of the drawing set" tabIndex={0}>
          <table>
            <caption className="sr-only">
              The sheets the worked example&rsquo;s drawing set contains, each also written as a
              DXF of its own.
            </caption>
            <thead>
              <tr>
                <th scope="col">Sheet</th>
                <th scope="col" className="schedule__fill">
                  Title
                </th>
              </tr>
            </thead>
            <tbody>
              {X.drawingSheets.map((s) => (
                <tr key={s.id}>
                  <th scope="row" data-label="Sheet">
                    <Ident>{s.number}</Ident>
                  </th>
                  <td className="schedule__fill" data-label="Title">
                    {s.title}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="rf-sub" id="layers">
          The layers
        </h3>
        <p>
          One layer per level per element, named <Ident>ENV-&lt;level&gt;-&lt;element&gt;</Ident>.
          A reviewer&rsquo;s first move on receiving the file is to switch things off — bays
          off to check the aisle runs, the ramp off to see what it costs, every level but one
          off to read it alone. One layer for all the parking would make all of those
          arguments happen at once.
        </p>

        <div className="schedule" role="region" aria-label="The layers of the building DXF" tabIndex={0}>
          <table>
            <caption className="sr-only">
              Every layer the worked example&rsquo;s building DXF declares, grouped by the
              second part of its name — the site, a level, a ramp or the annotation — in the
              file&rsquo;s own order. A marked layer holds something the engine assumed.
            </caption>
            <thead>
              <tr>
                <th scope="col">Part</th>
                <th scope="col" className="schedule__fill">
                  Layers in the file
                </th>
              </tr>
            </thead>
            <tbody>
              {layersByLevel().map((row) => (
                <tr key={row.level}>
                  <th scope="row" data-label="Part">
                    <Ident>{row.level}</Ident>
                  </th>
                  <td className="schedule__fill" data-label="Layers">
                    <ul className="ex-layers">
                      {row.layers.map((l) =>
                        l.assumedInk ? (
                          <li key={l.name}>
                            <span className="traced--assumed" data-state="assumed">
                              <code className="value">{l.name}</code>
                            </span>
                            <span className="sr-only"> (holds something assumed)</span>
                          </li>
                        ) : (
                          <li key={l.name}>
                            <code>{l.name}</code>
                          </li>
                        ),
                      )}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p>
          A layer marked{' '}
          <span className="traced--assumed" data-state="assumed">
            <span className="value">like this</span>
          </span>{' '}
          holds something the engine assumed. In the file, those elements are inked in the
          orange nearest the screen&rsquo;s amber that a DXF colour index holds, on the layer
          of the element they are — so the assumption survives the export as colour, and
          there is no separate layer to switch off to hide it.
        </p>
        <p>
          Levels drawn as outline only are height the rules permit and the answer leaves
          unused: a grey outline on a layer of its own, with no mass.
        </p>
      </Section>

      {/* ================= 02 · THE MODEL FILE =========================== */}
      <Section
        index={2}
        id="model"
        title="The model file"
        lede={
          <>
            It writes binary glTF {X.glb.assetVersion} and lists no extension a reader is
            required to support. That sentence is the whole claim.
          </>
        }
      >
        <p>
          The file names{' '}
          {X.glb.extensionsUsed.map((e, i) => (
            <span key={e}>
              {i > 0 ? ', ' : ''}
              <Ident>{e}</Ident>
            </span>
          ))}{' '}
          as an extension it uses, and none as one it requires, so a reader that does not
          know it can still draw the building. The cars are written as ordinary meshes for
          the same reason: the instancing extension would have made the file smaller, and it
          is marked required, so a reader without it would have to refuse the whole file.
        </p>
        <p>
          A model file has no title block, so it carries its own, in the scene&rsquo;s
          metadata: the units ({X.glb.units}), the point of the plot its coordinates are
          measured from, the list of{' '}
          <Link to="/refusals#not-drawn" navigate={navigate}>
            what the model does not draw
          </Link>
          , and these two sentences, word for word:
        </p>
        <ul className="ex-notice">
          {X.glb.notice.map((line) => (
            <li key={line}>
              <Ident>{line}</Ident>
            </li>
          ))}
        </ul>
        <p>
          It is written by the server, past the same two gates as every other file. The
          browser holds the same model and could write the same bytes, and a file it wrote
          for itself would have passed the gates only because it said so.
        </p>
      </Section>

      {/* ================= 03 · THE WORKBOOK ============================= */}
      <Section
        index={3}
        id="workbook"
        title="The workbook"
        lede={
          <>
            It writes XLSX, for the reader who takes the numbers into a pro forma. Every value
            row carries its provenance class and its citation or its basis, and an assumed row
            keeps an amber fill and a dashed edge.
          </>
        }
      >
        <div className="schedule" role="region" aria-label="The sheets of the workbook" tabIndex={0}>
          <table>
            <caption className="sr-only">
              The workbook&rsquo;s sheets in order, and the sentence each one sets above its
              table.
            </caption>
            <thead>
              <tr>
                <th scope="col">Sheet</th>
                <th scope="col" className="schedule__fill">
                  What it says above the table
                </th>
              </tr>
            </thead>
            <tbody>
              {X.workbookSheets.map((s, i) => (
                <tr key={s.name}>
                  <th scope="row" data-label="Sheet">
                    {s.name}
                  </th>
                  <td className="schedule__fill" data-label="Says">
                    {s.note ??
                      (i === 0 ? (
                        <span className="rf-cell">Status: {X.workbookStatus}</span>
                      ) : (
                        <span className="muted rf-cell">Nothing. The table starts on the first row.</span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ================= 04 · THE RUN AS DATA, AND THE REPORT ========== */}
      <Section
        index={4}
        id="json"
        title="The run as data, and the report"
        lede={
          <>
            The JSON is the whole run, provenance graph included, so a tool downstream can
            walk every derivation again rather than trust the figure at the end of it.
          </>
        }
      >
        <p>Its top-level fields, as the file has them:</p>
        <ul className="ex-fields">
          {X.jsonFields.map((f) => (
            <li key={f}>
              <Ident>{f}</Ident>
            </li>
          ))}
        </ul>
        <p>
          In the JSON the regulatory claim is a field rather than a sentence:{' '}
          <Ident>regulatoryValidity.status</Ident> is <Ident>{X.jsonValidity.status}</Ident>,
          and its detail reads &ldquo;{X.jsonValidity.detail}&rdquo;
        </p>
        <p>
          The report is the same run as a document to read and print: the five-way claim
          statement, the assumption register with every basis, the deferred constraints by
          name, the engine and rule-set versions with the rule set&rsquo;s content hash, and
          the name, asserted licence and time of whoever signed the review gate.
        </p>
      </Section>

      {/* ================= 05 · WHAT EVERY FILE CARRIES =================== */}
      <Section
        index={5}
        id="stamped"
        title="What every file carries"
        lede={
          <>
            Each of them says regulatory validity is not assessed, and the check that wrote
            this page looked in each: {X.stampedIn.map((f) => FILE_NAME[f] ?? f).join(', ')}. In
            the JSON it is the field above; in the rest, the sentence{' '}
            <Ident>REGULATORY VALIDITY: NOT ASSESSED</Ident>.
          </>
        }
      >
        <p>
          The rest does not travel everywhere, and this page does not round it up. The
          drawings and the model file carry that sentence and &ldquo;not for
          construction&rdquo; — in the title block, or in the model&rsquo;s metadata — and
          not the register or the signature. The workbook adds the assumption register. The
          report and the JSON carry all of it: the claim statement, the register, the
          deferred constraints, the versions and the signature.
        </p>
        <p>
          The signature is described as what it is: a name, a licence number the signer
          typed, and a time. The licence is recorded and never checked with anybody.
        </p>
      </Section>

      {/* ================= 06 · THE GATES ================================ */}
      <Section
        index={6}
        id="gates"
        title="Which gates stand in front of export"
        lede={
          <>
            Four gates exist. Two stand in front of export; the other two name earlier steps,
            rule resolution and capacity computation, and stand there. This is what the export
            answered for the worked example, asked before, between and after the two
            signatures:
          </>
        }
      >
        <div className="schedule" role="region" aria-label="What the export answered at each step" tabIndex={0}>
          <table>
            <caption className="sr-only">
              The export requested three times for the same run, with the gates signed so far,
              and the status code each request received.
            </caption>
            <thead>
              <tr>
                <th scope="col">Signed so far</th>
                <th scope="col" className="schedule__fill">
                  The export answered
                </th>
              </tr>
            </thead>
            <tbody>
              {X.gateSequence.map((step) => (
                <tr key={step.signed.join('+') || 'none'}>
                  <th scope="row" data-label="Signed">
                    {step.signed.length === 0
                      ? 'Nothing'
                      : sentence(step.signed.map((g) => GATE_NAME[g] ?? g).join(', and '))}
                  </th>
                  <td className="schedule__fill" data-label="Answered">
                    <span className="rf-cell">
                      <Ident>{step.status}</Ident>
                      {step.status === 200 ? ' — the file' : ' — refused, and nothing is written'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          An acknowledgement is given against the content it was shown. If that content has
          changed since, the gate has lapsed and the export answers{' '}
          <Ident>{unsigned?.status}</Ident> again. A stored run is never edited: changing an
          assumption computes a new run, and the new run starts with nothing signed.
        </p>
        <p>
          The review gate does not require a second person. It records who signed, and it
          does not compare them with the run&rsquo;s author — the check behind the table above
          signed its own run, and the export opened. Separation of duties is a control this
          software does not have, and it is on{' '}
          <Link to="/refusals#professional" navigate={navigate}>
            what it refuses
          </Link>
          .
        </p>
      </Section>

      {/* ================= 07 · A FILE IS NOT AN INTEGRATION ============= */}
      <Section index={7} id="files" title={IFC_GLTF.heading} lede={IFC_GLTF.body}>
        <p>
          &ldquo;Writes DXF R12&rdquo; and &ldquo;writes binary glTF&rdquo; are facts about a
          file, and this page can be held to them. A sentence naming a program that opens the
          file would be a claim about a tool somebody else ships, and none is made here.
        </p>
      </Section>

      {/* ================= 08 · WHAT THIS PAGE DID NOT PROVE ============= */}
      <Section index={8} id="not-proved" title="What this page did not prove">
        <p>
          That any of these files may be relied on. The sentence on each one says why.
        </p>
        <p>
          No sample file is offered here, because a file downloaded from a public page would
          have skipped the two gates this page describes. To get the same files, run the
          worked example, acknowledge its register and sign its review gate.
        </p>
        <div className="cta">
          <Link to="/app?demo=worked-example" navigate={navigate} className="button button--primary">
            Run the worked example
          </Link>
        </div>
      </Section>
    </div>
  );
}
