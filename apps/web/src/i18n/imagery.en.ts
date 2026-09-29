/**
 * What a screen reader says instead of each commissioned image, in English.
 *
 * ---------------------------------------------------------------------------
 * KEYED BY FILENAME, AND TRANSCRIBED FROM THE BRIEF RATHER THAN WRITTEN HERE.
 *
 * `docs/06-plan/image-prompts.md` commissions twenty-five images and writes the
 * alt text for each one in both languages, beside the prompt that will produce
 * the drawing. That is the right place for it to be decided: the person writing
 * "two of them are left unconnected" into a prompt is the person who knows what
 * the picture will show.
 *
 * So this file is a TRANSCRIPTION, and `imagery.test.ts` holds every line of it
 * to the brief - character for character, in both languages, for all twenty-five.
 * A drawing whose subject changes is re-briefed, and the test fails until the
 * description follows it. A dictionary that could drift from the brief would be
 * an image described as something it no longer is, which is worse than an image
 * with no description at all: the second is a gap and the first is a lie.
 *
 * ---------------------------------------------------------------------------
 * AN EMPTY STRING IS A DECISION, NOT AN OMISSION.
 *
 * Three of the twenty-five are decorative - the hero backdrop, the auth panel
 * and the dashboard band - and the brief says so in its own words. They carry
 * the empty string, which `Illustration` turns into `alt=""` plus `aria-hidden`,
 * so they are skipped rather than announced by filename. Every other name has a
 * sentence, and `ImageName` is a closed union, so a call site cannot name an
 * image nobody has described.
 */

import type { ImageName } from '../img.js';

export const EN: Readonly<Record<ImageName, string>> = {

  'og-cover': 'A plot outline with the buildable envelope offset inside it.',
  'mark': 'TOP.ai',
  'lp-capacities':
    'Three bands of different heights; the shortest one is picked out, and a line carries its height across the other two.',
  'lp-parking':
    'A parking level in plan: two rows of bays either side of an aisle, with a ramp crossing at a shallow angle.',
  'lp-guarantees':
    'A value at the top of a graph, resolving downward through the values it was derived from until every branch reaches a citation.',
  'lp-claims': 'Five statements of the same weight; the last is struck through.',
  'lp-limits':
    'A filled region inside a boundary that is open on one side; beyond the opening the field thins out.',
  'lp-hero-backdrop': '',
  'step-0-sheet':
    'A sheet with some of its values traced out to a list, and two entries in the list left unconnected.',
  'step-1-plot':
    'An irregular plot of eight edges, one of them curved, with roads on two sides and a neighbouring plot on a third.',
  'step-3-rules':
    'A measured band subdivided into parts, and a second band below it, detached and outside the measure.',
  'step-4-assumptions':
    'A list of values in which two are marked as assumed, by colour and by a second non-colour cue.',
  'step-5-capacity':
    'A stack of floor plates with a podium below and a tower above, and a core running through every level.',
  'step-6-parking':
    'A parking level: rows of bays, two aisles meeting in a T, a ramp entering from one edge, and cars standing in one row.',
  'step-7-checks': 'Eighteen checks; ten are solid and eight are dotted and empty.',
  'step-8-evidence': 'One branch of a derivation, opened down to the clause it cites.',
  'step-9-export': 'Six files a finished run produces.',
  'auth-panel': '',
  'empty-projects': 'An empty drawing sheet with a ruled, unfilled title block.',
  'empty-members': 'A signature block with one line used and two waiting.',
  'empty-shared': 'Two sheets with an unmade connection between them.',
  'dashboard-backdrop': '',
  'state-not-here': 'A grid of sheets with one position empty.',
  'state-refused':
    'A pipeline stopped at its third stage; the stages after it are drawn but not reached.',
  'guide-cover': 'A plot with its envelope, and a parking level drawn beneath it.',
};
