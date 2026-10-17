/**
 * The parking an affection plan requires, typed — B.7.2.6.1 puts it above
 * Table B.13. These are the sentences the sheets on file print, word for word,
 * and what the type must say of each; and what it must refuse to say.
 */
import { describe, expect, it } from 'vitest';

import { parseParkingRequirement } from '../src/parking.js';

/** A value with its Decimals as the strings they print as. */
const plain = (v: unknown): unknown => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

describe('parseParkingRequirement', () => {
  it('reads the DDA dwelling rule, measured in GFA because the sheet says so of both thresholds', () => {
    const p = parseParkingRequirement(
      'ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA AND TWO BAYS FOR EACH UNIT EXCEEDING 150 SQ.M GFA.',
    );
    expect(plain(p?.dwelling)).toEqual({ baysAtOrBelow: 1, baysAbove: 2, thresholdM2: '150', measure: 'GFA' });
    expect(p?.byArea).toEqual([]);
    expect(p?.unread).toEqual([]);
  });

  /* The second line of the note ("SQ.M OF RETAIL NET AREA.") is what makes the 70 a rate. */
  it('reads a dwelling rule and a retail rate from one note', () => {
    const p = parseParkingRequirement(
      'FOR APARTMENT, ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA AND TWO BAYS FOR EACH UNIT EXCEEDING 150 SQ.M GFA; FOR RETAIL, ONE BAY FOR EACH 70 SQ.M OF RETAIL NET AREA.',
    );
    expect(plain(p?.dwelling)).toMatchObject({ thresholdM2: '150', measure: 'GFA' });
    expect(plain(p?.byArea)).toEqual([{ use: 'RETAIL', bays: 1, perM2: '70', measure: 'NET_AREA' }]);
    expect(p?.unread).toEqual([]);
  });

  /* «مساحتها» — "its area" — is not GFA in words. Which area it is, is the client's question. */
  it('reads the Municipality row, its threshold measure left unstated', () => {
    const p = parseParkingRequirement(
      'موقف لكل شقة و لكل استوديو و موقفين لكل شقة تزيد مساحتها عن 150 متر مربع و موقف لكل 70 متر مربع من الاستعمال التجاري و موقف لكل 50 متر مربع للإستعمال المكتبي',
    );
    expect(plain(p?.dwelling)).toEqual({ baysAtOrBelow: 1, baysAbove: 2, thresholdM2: '150', measure: 'UNSTATED', studioBays: 1 });
    expect(plain(p?.byArea)).toEqual([
      { use: 'COMMERCIAL', bays: 1, perM2: '70', measure: 'UNSTATED' },
      { use: 'OFFICE', bays: 1, perM2: '50', measure: 'UNSTATED' },
    ]);
    expect(p?.unread).toEqual([]);
  });

  it('says GFA only where the sheet says it of both thresholds', () => {
    const p = parseParkingRequirement('ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M AND TWO BAYS FOR EACH UNIT EXCEEDING 150 SQ.M GFA');
    expect(p?.dwelling?.measure).toBe('UNSTATED');
  });

  it('does not type a rule whose two thresholds differ', () => {
    expect(
      parseParkingRequirement('ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA AND TWO BAYS FOR EACH UNIT EXCEEDING 200 SQ.M GFA'),
    ).toBeUndefined();
  });

  /* An empty requirement would read to a binder as "no parking required". */
  it('returns nothing, rather than an empty requirement, for words it cannot type', () => {
    expect(parseParkingRequirement('AS PER THE APPROVED MASTER PLAN.')).toBeUndefined();
  });

  it('keeps every clause about bays it could not type, in the sheet’s words', () => {
    const p = parseParkingRequirement(
      'FOR APARTMENT, ONE BAY FOR EACH UNIT LESS THAN OR EQUAL TO 150 SQ.M GFA AND TWO BAYS FOR EACH UNIT EXCEEDING 150 SQ.M GFA; FOR OFFICE, ONE BAY FOR EACH 4 EMPLOYEES.',
    );
    expect(p?.dwelling).toBeDefined();
    expect(p?.unread).toEqual(['ONE BAY FOR EACH 4 EMPLOYEES']);
  });
});
