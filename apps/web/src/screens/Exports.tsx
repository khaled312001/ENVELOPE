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
 *
 * ---------------------------------------------------------------------------
 * TWO LANGUAGES, AND THE FILE'S WORDS IN NEITHER DICTIONARY.
 *
 * The page's own sentences come from `i18n/exports.en.ts` or its Arabic twin. What
 * it read out of a file does not: on the Arabic page a sheet title, a workbook note
 * or the Status line is still what the FILE says, in the language the file says it,
 * set `Verbatim` (or in `code`, which `rtl.css` isolates). A translated sheet title
 * would be a title no drawing carries — the glossary's argument for basis strings,
 * applied to the files.
 */

import { Fragment, type ReactNode } from 'react';

import { IFC_GLTF } from '../content/shared.js';
import { IFC_GLTF_AR, type SharedParagraph } from '../content/shared.ar.js';
import { AR } from '../i18n/exports.ar.js';
import { EN } from '../i18n/exports.en.js';
import { PageContents } from '../components/PageContents.js';
import { useDict, useLocale, Verbatim } from '../i18n/locale.js';
import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import WORKED from './worked-example.json' with { type: 'json' };

const X = WORKED.verified.exports;

/**
 * The DXF release this page names, and the sheet size of the printed set.
 *
 * Named here once rather than in two dictionaries that could drift: `R12` is what
 * the file's own `AC1009` header means, and a translation that typed `R14` would be
 * a claim about the file nobody checked.
 */
const DXF_RELEASE = 'R12';
const SHEET_SIZE = 'A3';

/** The words the drawings and the model file carry, quoted — the file's, not ours. */
const NOT_FOR_CONSTRUCTION = 'not for construction';

/** A phrase opening a table row, with its first letter raised. A no-op on Arabic. */
const sentence = (phrase: string): string => phrase.charAt(0).toUpperCase() + phrase.slice(1);

/**
 * WHAT A FILE SAID, ISOLATED ON THE ARABIC PAGE AND UNTOUCHED ON THE ENGLISH ONE.
 *
 * A sheet title, a note or a version inside an Arabic paragraph is reordered by the
 * bidirectional algorithm at its boundaries; `Verbatim` sets `dir="ltr" lang="en"`
 * and `rtl.css` isolates it. On the English page the span would carry nothing, and
 * the English render is held unchanged — the choice `Antechamber.tsx` records.
 */
function Ltr({ children }: { readonly children: ReactNode }): JSX.Element {
  const { locale } = useLocale();
  return locale === 'ar' ? <Verbatim>{children}</Verbatim> : <>{children}</>;
}

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
  const t = useDict(EN, AR);
  const ifc = useDict<SharedParagraph>(IFC_GLTF, IFC_GLTF_AR);

  /*
    ONE RECORD FOR THE ORDER, THE ORDINALS AND THE CONTENTS LIST. The ordinals
    were typed into each `<Section index={n}>`; a section inserted in the middle
    renumbered by hand is a renumbering somebody eventually does not finish, and
    the contents would then disagree with the page in the one place a reader
    checks it against.
  */
  const order: readonly { readonly id: string; readonly label: string }[] = [
    { id: 'drawing', label: t.drawing.title },
    { id: 'model', label: t.model.title },
    { id: 'workbook', label: t.workbook.title },
    { id: 'json', label: t.json.title },
    { id: 'stamped', label: t.stamped.title },
    { id: 'gates', label: t.gates.title },
    { id: 'files', label: ifc.heading },
    { id: 'not-proved', label: t.notProved.title },
  ];
  const idx = (id: string): number => order.findIndex((s) => s.id === id) + 1;
  const unsigned = X.gateSequence[0];

  const fileName = (id: string): string => (t.fileNames as Readonly<Record<string, string>>)[id] ?? id;

  /**
   * A gate as a sentence names it: what it is called, and its id in brackets. The
   * id is the first segment of the token the check recorded (`G3_ASSUMPTIONS_…`), so
   * it is read rather than typed. A token the dictionary does not name is printed
   * as recorded.
   */
  const gate = (token: string, first: boolean): ReactNode => {
    const name = (t.gateNames as Readonly<Record<string, string>>)[token];
    if (name === undefined) return <Ltr>{token}</Ltr>;
    return (
      <>
        {first ? sentence(name) : name} (<Ltr>{token.split('_')[0]}</Ltr>)
      </>
    );
  };

  return (
    <div className="rf ex">
      <section className="shell section section--opening" aria-labelledby="ex-h">
        <h1 id="ex-h">{t.hero.title}</h1>
        <p className="rf__lede">{t.hero.lede}</p>
        <p className="rf__hero-note">{t.hero.note}</p>
      </section>

      {/* ================= 01 · THE DRAWING ============================== */}
      <PageContents entries={order} />

      <Section
        index={idx('drawing')}
        id="drawing"
        title={t.drawing.title}
        lede={
          <>
            DXF {DXF_RELEASE}
            {t.drawing.lede.afterFormat}
            <Ident>{X.dxf.version}</Ident>
            {t.drawing.lede.afterVersion}
            {DXF_RELEASE}
            {t.drawing.lede.afterRelease}
          </>
        }
      >
        <p>
          {t.drawing.body}
          {SHEET_SIZE}
          {t.drawing.bodyAfterSize}
        </p>

        <div className="schedule" role="region" aria-label={t.drawing.sheets.region} tabIndex={0}>
          <table>
            <caption className="sr-only">{t.drawing.sheets.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.drawing.sheets.sheet}</th>
                <th scope="col" className="schedule__fill">
                  {t.drawing.sheets.title}
                </th>
              </tr>
            </thead>
            <tbody>
              {X.drawingSheets.map((s) => (
                <tr key={s.id}>
                  <th scope="row" data-label={t.drawing.sheets.sheet}>
                    <Ident>{s.number}</Ident>
                  </th>
                  <td className="schedule__fill" data-label={t.drawing.sheets.title}>
                    {/* The drawing's own title, as its title block prints it. */}
                    <Ltr>{s.title}</Ltr>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="rf-sub" id="layers">
          {t.drawing.layersTitle}
        </h3>
        <p>
          {t.drawing.layersBefore}
          <Ident>ENV-&lt;level&gt;-&lt;element&gt;</Ident>
          {t.drawing.layersAfter}
        </p>

        <div className="schedule" role="region" aria-label={t.drawing.layers.region} tabIndex={0}>
          <table>
            <caption className="sr-only">{t.drawing.layers.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.drawing.layers.part}</th>
                <th scope="col" className="schedule__fill">
                  {t.drawing.layers.inFile}
                </th>
              </tr>
            </thead>
            <tbody>
              {layersByLevel().map((row) => (
                <tr key={row.level}>
                  <th scope="row" data-label={t.drawing.layers.part}>
                    <Ident>{row.level}</Ident>
                  </th>
                  <td className="schedule__fill" data-label={t.drawing.layers.cellLabel}>
                    <ul className="ex-layers">
                      {row.layers.map((l) =>
                        l.assumedInk ? (
                          <li key={l.name}>
                            <span className="traced--assumed" data-state="assumed">
                              <code className="value">{l.name}</code>
                            </span>
                            <span className="sr-only">{t.drawing.layers.assumedNote}</span>
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
          {t.drawing.marked.before}{' '}
          <span className="traced--assumed" data-state="assumed">
            <span className="value">{t.drawing.marked.sample}</span>
          </span>{' '}
          {t.drawing.marked.after}
        </p>
        <p>{t.drawing.outline}</p>
      </Section>

      {/* ================= 02 · THE MODEL FILE =========================== */}
      <Section
        index={idx('model')}
        id="model"
        title={t.model.title}
        lede={
          <>
            {t.model.ledeBefore}
            <Ltr>{X.glb.assetVersion}</Ltr>
            {t.model.ledeAfter}
          </>
        }
      >
        <p>
          {t.model.namesBefore}{' '}
          {X.glb.extensionsUsed.map((e, i) => (
            <span key={e}>
              {i > 0 ? t.listSeparator : ''}
              <Ident>{e}</Ident>
            </span>
          ))}{' '}
          {t.model.namesAfter}
        </p>
        <p>
          {t.model.unitsBefore}
          <Ltr>{X.glb.units}</Ltr>
          {t.model.unitsAfter}
          <Link to="/refusals#not-drawn" navigate={navigate}>
            {t.model.notDrawn}
          </Link>
          {t.model.notDrawnAfter}
        </p>
        <ul className="ex-notice">
          {X.glb.notice.map((line) => (
            <li key={line}>
              <Ident>{line}</Ident>
            </li>
          ))}
        </ul>
        <p>{t.model.server}</p>
      </Section>

      {/* ================= 03 · THE WORKBOOK ============================= */}
      <Section index={idx('workbook')} id="workbook" title={t.workbook.title} lede={<>{t.workbook.lede}</>}>
        <div className="schedule" role="region" aria-label={t.workbook.region} tabIndex={0}>
          <table>
            <caption className="sr-only">{t.workbook.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.workbook.sheet}</th>
                <th scope="col" className="schedule__fill">
                  {t.workbook.says}
                </th>
              </tr>
            </thead>
            <tbody>
              {X.workbookSheets.map((s, i) => (
                <tr key={s.name}>
                  <th scope="row" data-label={t.workbook.sheet}>
                    <Ltr>{s.name}</Ltr>
                  </th>
                  <td className="schedule__fill" data-label={t.workbook.saysLabel}>
                    {s.note !== null ? (
                      <Ltr>{s.note}</Ltr>
                    ) : i === 0 ? (
                      /* `Status` is the label cell of the file's own row, and the sentence
                         beside it is the file's: both stay as the workbook has them. */
                      <span className="rf-cell">
                        <Ltr>Status: {X.workbookStatus}</Ltr>
                      </span>
                    ) : (
                      <span className="muted rf-cell">{t.workbook.nothing}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ================= 04 · THE RUN AS DATA, AND THE REPORT ========== */}
      <Section index={idx('json')} id="json" title={t.json.title} lede={<>{t.json.lede}</>}>
        <p>{t.json.fields}</p>
        <ul className="ex-fields">
          {X.jsonFields.map((f) => (
            <li key={f}>
              <Ident>{f}</Ident>
            </li>
          ))}
        </ul>
        <p>
          {t.json.validityBefore}
          <Ident>regulatoryValidity.status</Ident>
          {t.json.validityIs}
          <Ident>{X.jsonValidity.status}</Ident>
          {t.json.detailBefore}
          <Ltr>{X.jsonValidity.detail}</Ltr>
          {t.json.detailAfter}
        </p>
        <p>{t.json.report}</p>
      </Section>

      {/* ================= 05 · WHAT EVERY FILE CARRIES =================== */}
      <Section
        index={idx('stamped')}
        id="stamped"
        title={t.stamped.title}
        lede={
          <>
            {t.stamped.ledeBefore}
            {X.stampedIn.map(fileName).join(t.listSeparator)}
            {t.stamped.ledeMiddle}
            <Ident>REGULATORY VALIDITY: NOT ASSESSED</Ident>
            {t.stamped.ledeAfter}
          </>
        }
      >
        <p>
          {t.stamped.restBefore}
          <Ltr>{NOT_FOR_CONSTRUCTION}</Ltr>
          {t.stamped.restAfter}
        </p>
        <p>{t.stamped.signature}</p>
      </Section>

      {/* ================= 06 · THE GATES ================================ */}
      <Section index={idx('gates')} id="gates" title={t.gates.title} lede={<>{t.gates.lede}</>}>
        <div className="schedule" role="region" aria-label={t.gates.region} tabIndex={0}>
          <table>
            <caption className="sr-only">{t.gates.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{t.gates.signed}</th>
                <th scope="col" className="schedule__fill">
                  {t.gates.answered}
                </th>
              </tr>
            </thead>
            <tbody>
              {X.gateSequence.map((step) => (
                <tr key={step.signed.join('+') || 'none'}>
                  <th scope="row" data-label={t.gates.signedLabel}>
                    {step.signed.length === 0
                      ? t.gates.nothing
                      : step.signed.map((g, i) => (
                          <Fragment key={g}>
                            {i > 0 ? t.gateJoin : ''}
                            {gate(g, i === 0)}
                          </Fragment>
                        ))}
                  </th>
                  <td className="schedule__fill" data-label={t.gates.answeredLabel}>
                    <span className="rf-cell">
                      <Ident>{step.status}</Ident>
                      {step.status === 200 ? t.gates.file : t.gates.refused}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          {t.gates.lapsedBefore}
          <Ident>{unsigned?.status}</Ident>
          {t.gates.lapsedAfter}
        </p>
        <p>
          {t.gates.separationBefore}
          <Link to="/refusals#professional" navigate={navigate}>
            {t.gates.separationLink}
          </Link>
          {t.gates.separationAfter}
        </p>
      </Section>

      {/* ================= 07 · A FILE IS NOT AN INTEGRATION ============= */}
      <Section index={idx('files')} id="files" title={ifc.heading} lede={ifc.body}>
        <p>
          {t.files.before}
          {DXF_RELEASE}
          {t.files.after}
        </p>
      </Section>

      {/* ================= 08 · WHAT THIS PAGE DID NOT PROVE ============= */}
      <Section index={idx('not-proved')} id="not-proved" title={t.notProved.title}>
        <p>{t.notProved.first}</p>
        <p>{t.notProved.second}</p>
        <div className="cta">
          <Link to="/app?demo=worked-example" navigate={navigate} className="button button--primary">
            {t.notProved.cta}
          </Link>
        </div>
      </Section>
    </div>
  );
}
