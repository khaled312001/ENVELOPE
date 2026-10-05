/**
 * Practice statements — the third kind of instrument, and the weakest.
 *
 * A regulation says what may be built. A developer standard says what a client
 * will pay for. A **practice statement** says what a named practitioner says the
 * practice is — and that is a different, weaker thing again, which is why it
 * gets its own type rather than a flag on either of the other two.
 *
 * It exists because of one line in the client's written reply of 2026-09-28:
 *
 *   "الباركنج مش بيتحسب في ال FAR دا منفصل"
 *   — parking is not counted in FAR; it is separate.
 *
 * That answers `FR-DEF-002`'s blocking question, which swings capacity by
 * 15–35%. It is worth taking seriously. It is also not a citation of the Dubai
 * Building Code, and turning it into one would be the single most consequential
 * piece of laundering this codebase could do.
 *
 * **So: deliberately not a `RuleRecord`, and deliberately not `DERIVED`.**
 *
 * - Not a `RuleRecord`, for the same reason a `DeveloperStandard` is not one: a
 *   `RuleRecord` is resolvable by `resolveParameter` and can bind the envelope.
 *   Nothing here may reach `resolveParameter`, and there is no path for it to.
 * - Not `DERIVED`, because `DERIVED` in this system means a value reached a
 *   cited regulatory instrument. A value backed by a practitioner's statement is
 *   `USER_SET` — by that named practitioner, not by whoever happens to be
 *   running the study. `FR-DEF-002` allows exactly that: "`USER_SET` by a named
 *   person". What it forbids is a default, and this is not one — it is an answer
 *   with a name, a date and the words it was given in attached to it.
 *
 * **A pre-filled answer is not a hidden default, but only if it says so.** The
 * screen that pre-selects one of these must show whose statement it is, quote
 * it, and say that it is not a regulation — the same treatment the developer
 * standard picker gets. A pre-selection the reader cannot see the source of is
 * exactly the failure `FR-DEF-002` exists to prevent, whatever the type system
 * says about it.
 *
 * **On the name.** `docs/03-analysis/meeting-02-2026-08-30.md` records it as
 * *"Mohamed or Ahmed Amin"* — the meeting note is itself unsure of the surname.
 * So the statement carries the form the project uses everywhere else, "Eng.
 * Mohamed", and the document it came from, which is certain. Inventing a
 * surname to make a record look complete would be putting a fact in a field
 * that has none.
 */

/** What a statement can speak to. One per blocking question, at most. */
export const StatementSubject = {
  /**
   * `FR-DEF-002`'s blocking question. The value is a `ParkingInFar` treatment.
   *
   * Named as a subject rather than as a `parameterId` because these never reach
   * `resolveParameter` — a dotted parameter id would suggest they could.
   */
  PARKING_IN_FAR: 'PARKING_IN_FAR',
  /**
   * The core's share of the tower plate, as a fraction — `"0.18"`, `"0.20"`.
   *
   * A RANGE IS NOT A SUBJECT, which is why the value is a single fraction. The
   * practitioner gave 18–20%; the engine needs one number to size a core and the
   * other end of his range is a **sensitivity**, measured by running it. Storing
   * "0.18–0.20" here would put an interval in a field the composition root has to
   * hand the engine as a scalar, and the parse that pulled one end out of it would
   * be choosing for him in a place nobody looks. So the statement carries the end
   * he named first, and `limits` carries the other end in his own words.
   *
   * It is not a `parameterId` for the same reason as above: `building.core_area_m2`
   * is resolvable by `resolveParameter` and this must never reach it.
   */
  CORE_PLATE_FRACTION: 'CORE_PLATE_FRACTION',
} as const;
export type StatementSubject = (typeof StatementSubject)[keyof typeof StatementSubject];

/** Who said it. Both fields are what is actually known, never filled to look complete. */
export interface Stator {
  /** As the project records it. See the note on names in this file's header. */
  readonly name: string;
  /** Their standing — what makes the statement worth anything. */
  readonly role: string;
}

export interface PracticeStatement {
  readonly statementId: string;
  readonly subject: StatementSubject;
  /**
   * The answer, as the subject's own type spells it.
   *
   * A string rather than a union, because `@envelope/rules` must not import the
   * engine's vocabulary to hold a quotation. The composition root checks it
   * against the engine's type; a statement carrying a value the engine does not
   * recognise is refused there rather than silently ignored here.
   */
  readonly value: string;
  readonly statedBy: Stator;
  /** ISO date. The day the statement was made, not the day it was recorded. */
  readonly statedOn: string;
  /** The document it was made in — a reply, a meeting, a letter. */
  readonly source: string;
  /** Their own words, in their own language, unedited. */
  readonly verbatim: string;
  /** A translation, marked as one. Never a substitute for the verbatim. */
  readonly translation: string;
  /**
   * What the statement does **not** cover.
   *
   * Required, and the reason this type earns its keep. A practitioner's answer
   * is true of the cases they have worked on; the run it is applied to may not
   * be one of them, and the reader has to be able to see the edge of the claim.
   */
  readonly limits: string;
}
