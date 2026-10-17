/**
 * THE PARKING A SHEET REQUIRES, READ INTO A TYPE.
 *
 * Dubai Building Code B.7.2.6.1 (p. B69): "Parking requirements set out in the
 * affection plan or DCR shall take precedent over Table B.13". Two of the three
 * generators on file print one:
 *
 *   - the Municipality's Parking row, in Arabic:
 *     «موقف لكل شقة و لكل استوديو و موقفين لكل شقة تزيد مساحتها عن 150 متر مربع
 *      و موقف لكل 70 متر مربع من الاستعمال التجاري و موقف لكل 50 متر مربع
 *      للإستعمال المكتبي»
 *   - the DDA's general note: "PARKING: FOR APARTMENT, ONE BAY FOR EACH UNIT LESS
 *     THAN OR EQUAL TO 150 SQ.M GFA AND TWO BAYS FOR EACH UNIT EXCEEDING 150 SQ.M
 *     GFA; FOR RETAIL, ONE BAY FOR EACH 70 SQ.M OF RETAIL NET AREA."
 *
 * The first was kept as a string and bound nowhere; the second was not read at
 * all, and the sheet step said the plot's parking authority was unknown. A run on
 * plot 1341556 produced 312 bays against Table B.13's placeholder where the sheet's
 * own row gives 208.
 *
 * WHAT THIS DOES NOT DO. It does not turn a 150 m² threshold into a bedroom
 * count, and it does not decide whether «مساحتها» ("its area") means GFA or
 * saleable area: the DDA says GFA in words, the Municipality does not, and that
 * is a question to the client. Every clause it cannot type is returned in
 * `unread` in the sheet's words, so the binder can say what it did not bind.
 */

import { AreaParkingUse, Decimal, type AreaParkingRule, type DwellingParkingRule, type ParkingRequirement, UnitAreaMeasure } from '@envelope/core';

const WORD_NUMBER: Readonly<Record<string, number>> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4 };
const count = (w: string): number => WORD_NUMBER[w.toUpperCase()] ?? Number(w);

/** What each pattern consumed, so that what is left can be reported as unread. */
interface Hit {
  readonly start: number;
  readonly end: number;
}

/**
 * The DDA's English note.
 *
 * "ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA AND TWO BAYS FOR EACH
 * UNIT EXCEEDING 150 SQ.M GFA" — both thresholds must be printed and equal, or
 * the clause is a rule this type does not describe and is left unread.
 */
function readEnglish(text: string, hits: Hit[]): { dwelling?: DwellingParkingRule; byArea: AreaParkingRule[] } {
  const out: { dwelling?: DwellingParkingRule; byArea: AreaParkingRule[] } = { byArea: [] };
  const SQM = String.raw`SQ\.?\s*M\.?`;
  const dwelling = new RegExp(
    String.raw`(ONE|TWO|\d+)\s+BAYS?\s+FOR\s+EACH\s+UNIT\s+LESS\s+THAN\s+OR\s+EQUAL\s+TO\s+(\d+(?:\.\d+)?)\s*${SQM}\s*(GFA)?\s+AND\s+(ONE|TWO|\d+)\s+BAYS?\s+FOR\s+EACH\s+UNIT\s+EXCEEDING\s+(\d+(?:\.\d+)?)\s*${SQM}\s*(GFA)?`,
    'i',
  ).exec(text);
  if (dwelling && dwelling[2] === dwelling[5]) {
    out.dwelling = {
      baysAtOrBelow: count(dwelling[1] ?? ''),
      baysAbove: count(dwelling[4] ?? ''),
      thresholdM2: new Decimal(dwelling[2] ?? '0'),
      // GFA only where the sheet says it of both thresholds.
      measure: dwelling[3] && dwelling[6] ? UnitAreaMeasure.GFA : UnitAreaMeasure.UNSTATED,
    };
    hits.push({ start: dwelling.index, end: dwelling.index + dwelling[0].length });
  }
  const perArea = new RegExp(
    String.raw`(ONE|TWO|\d+)\s+BAYS?\s+FOR\s+EACH\s+(\d+(?:\.\d+)?)\s*${SQM}\s+OF\s+(RETAIL|OFFICE|COMMERCIAL)\s*(NET\s+AREA|GFA)?`,
    'gi',
  );
  for (const m of text.matchAll(perArea)) {
    const use = (m[3] ?? '').toUpperCase();
    out.byArea.push({
      use: use === 'OFFICE' ? AreaParkingUse.OFFICE : use === 'COMMERCIAL' ? AreaParkingUse.COMMERCIAL : AreaParkingUse.RETAIL,
      bays: count(m[1] ?? ''),
      perM2: new Decimal(m[2] ?? '0'),
      measure: /NET/i.test(m[4] ?? '') ? 'NET_AREA' : /GFA/i.test(m[4] ?? '') ? 'GFA' : 'UNSTATED',
    });
    hits.push({ start: m.index, end: m.index + m[0].length });
  }
  return out;
}

const AR_COUNT: Readonly<Record<string, number>> = { موقف: 1, موقفين: 2, موقفان: 2 };

/** The Municipality's Arabic row. Narrow, as `parseArabicHeight` is: a sentence of another shape is left unread. */
function readArabic(text: string, hits: Hit[]): { dwelling?: DwellingParkingRule; byArea: AreaParkingRule[] } {
  const out: { dwelling?: DwellingParkingRule; byArea: AreaParkingRule[] } = { byArea: [] };
  const perFlat = /(موقف|موقفين|موقفان)\s+لكل\s+شقة(?!\s+تزيد)/.exec(text);
  const above = /(موقف|موقفين|موقفان)\s+لكل\s+شقة\s+تزيد\s+مساحتها\s+عن\s+(\d+(?:\.\d+)?)\s+متر\s+مربع/.exec(text);
  const studio = /و\s*لكل\s+استوديو/.exec(text);
  if (perFlat && above) {
    out.dwelling = {
      baysAtOrBelow: AR_COUNT[perFlat[1] ?? ''] ?? 1,
      baysAbove: AR_COUNT[above[1] ?? ''] ?? 2,
      thresholdM2: new Decimal(above[2] ?? '0'),
      /* «مساحتها» — "its area". Not GFA in words; which area it is, is the client's answer. */
      measure: UnitAreaMeasure.UNSTATED,
      // «موقف لكل شقة و لكل استوديو»: the studio takes the per-flat count it is joined to.
      ...(studio ? { studioBays: AR_COUNT[perFlat[1] ?? ''] ?? 1 } : {}),
    };
    hits.push({ start: perFlat.index, end: perFlat.index + perFlat[0].length });
    hits.push({ start: above.index, end: above.index + above[0].length });
    if (studio) hits.push({ start: studio.index, end: studio.index + studio[0].length });
  }
  /* «من الاستعمال التجاري» and «للإستعمال المكتبي»: the article and the hamza both vary. */
  const area = /(موقف|موقفين|موقفان)\s+لكل\s+(\d+(?:\.\d+)?)\s+متر\s+مربع\s+(?:من\s+)?(?:ال|لل)[إا]ستعمال\s+(التجاري|المكتبي)/g;
  for (const m of text.matchAll(area)) {
    const word = m[1] ?? '';
    const per = m[2] ?? '0';
    const use = m[3] ?? '';
    out.byArea.push({
      use: use === 'المكتبي' ? AreaParkingUse.OFFICE : AreaParkingUse.COMMERCIAL,
      bays: AR_COUNT[word] ?? 1,
      perM2: new Decimal(per),
      measure: 'UNSTATED',
    });
    hits.push({ start: m.index, end: m.index + m[0].length });
  }
  return out;
}

/**
 * The sheet's parking text, typed.
 *
 * `undefined` when nothing in it could be typed at all — the caller then keeps
 * the words and says the requirement is unread, rather than publishing an empty
 * requirement that a binder would read as "no parking required".
 */
export function parseParkingRequirement(raw: string): ParkingRequirement | undefined {
  const text = raw.replace(/\s+/g, ' ').trim();
  const hits: Hit[] = [];
  const en = readEnglish(text, hits);
  const ar = readArabic(text, hits);
  const dwelling = en.dwelling ?? ar.dwelling;
  const byArea = [...en.byArea, ...ar.byArea];
  if (!dwelling && byArea.length === 0) return undefined;

  /* What no pattern consumed, cut at the sheet's own clause breaks, and kept
     where it still says something about bays or areas. */
  let rest = text;
  for (const h of [...hits].sort((a, b) => b.start - a.start)) rest = `${rest.slice(0, h.start)} | ${rest.slice(h.end)}`;
  const unread = rest
    .split(/\s*(?:\||;|\.(?:\s|$)|،|,)\s*/)
    .map((s) => s.replace(/^(?:PARKING:|FOR\s+APARTMENT|FOR\s+RETAIL|AND|و)\s*/i, '').trim())
    .filter((s) => /\d|BAYS?\b|موقف/i.test(s));

  return {
    ...(dwelling ? { dwelling } : {}),
    byArea,
    unread,
    raw: text,
  };
}
