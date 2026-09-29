/**
 * The level schedule — what a building is made of, level by level.
 *
 * Eng. Mohamed, 2026-09-28: *"هو المفروض تكون ground floor, Bassment كام دور,
 * Podium كام دور"* — it should be the ground floor, how many basements, how many
 * podium levels. He is right, and until this type the whole level model was one
 * integer (`parkingLevelsAvailable`, 0–8) plus a second one for the massing.
 *
 * The three are not interchangeable and each behaves differently:
 *
 * - a **basement** has no setback and no coverage limit, and costs ramp length;
 * - the **ground floor** is bound by coverage and carries the vehicle entrance;
 * - a **podium level** is bound by the podium setback, and may or may not count
 *   against the height allowance — **Q27, open, and this type does not answer it.**
 *
 * The tower is not stated here. It comes out of the setback↔floor fixpoint, and
 * a stated tower count would be an input competing with a computed answer.
 *
 * ---
 *
 * **THE GROUND FLOOR IS PART OF THE PODIUM, AND `podiumAboveGround` SAYS SO BY
 * NOT COUNTING IT.**
 *
 * A Dubai height code reads `G+2P+8`: ground, two podium levels, eight typical.
 * That is **three** levels standing on the podium footprint, not two. The engine
 * read the `2` and drew two — the ground floor and one podium level — which is
 * one podium level short of what the sheet says, on every plot whose sheet
 * states a podium. It moved the picture and the section; it moved no capacity
 * figure, which is why it survived.
 *
 * So the field is named for the part of the code it holds, and the level count
 * on the podium footprint is `1 + podiumAboveGround` wherever there is a podium
 * at all. A field called `podiumLevels` invited exactly the arithmetic that went
 * wrong.
 */
export interface LevelSchedule {
  /**
   * Levels below grade. All parking: Phase 0 models nothing else below grade,
   * and a basement of storage or plant would be floor area this engine has not
   * computed.
   */
  readonly basements: number;
  /**
   * Whether the ground floor is given over to parking.
   *
   * Its own field rather than the first of `podiumParkingLevels`, because the
   * ground floor is the one level that can be something else entirely — retail
   * or a lobby under parking above is an ordinary Dubai scheme — and because it
   * is the level that carries the vehicle entrance whatever is on it.
   */
  readonly groundIsParking: boolean;
  /** Podium levels **above** the ground floor — the `2` in `G+2P+8`. */
  readonly podiumAboveGround: number;
  /**
   * How many of those above-ground podium levels hold parking.
   *
   * Counted from the ground up: the client's own description of a Dubai podium
   * is "all garage and core". Never more than `podiumAboveGround`, and the
   * engine refuses a schedule that says otherwise rather than clamping it — a
   * clamp would silently answer a question about the building that the person
   * filling the form got wrong.
   */
  readonly podiumParkingLevels: number;
}

/**
 * Levels standing on the podium footprint, the ground floor included.
 *
 * Always at least one. The ground floor is bound by the coverage cap, and the
 * podium ring *is* the coverage-capped footprint — so a scheme with no podium
 * above ground still has one level on it.
 */
export function podiumFootprintLevels(s: LevelSchedule): number {
  return 1 + s.podiumAboveGround;
}

/**
 * Levels of parking the scheme provides.
 *
 * The figure the parking solver has always taken, now derived from a schedule
 * that says where those levels are rather than only how many there are.
 */
export function parkingLevels(s: LevelSchedule): number {
  return s.basements + (s.groundIsParking ? 1 : 0) + s.podiumParkingLevels;
}

/**
 * The height code, written the way a Dubai architect writes it: `2B+G+3P+35`.
 *
 * The same form the Warsan affection plan prints (`G+2P+8`), so the display and
 * the source document finally agree — and the same form the one open-source
 * Dubai peer uses. Parts with a count of zero are left out rather than written
 * as `0B`, because `G+35` is how somebody says "no basement".
 *
 * `towerLevels` is the answer's own count and is passed in rather than held on
 * the schedule: it is computed, and a schedule that carried it could disagree
 * with the run that produced it.
 */
export function levelCode(s: LevelSchedule, towerLevels: number): string {
  const parts: string[] = [];
  if (s.basements > 0) parts.push(`${s.basements}B`);
  parts.push('G');
  if (s.podiumAboveGround > 0) parts.push(`${s.podiumAboveGround}P`);
  if (towerLevels > 0) parts.push(String(towerLevels));
  return parts.join('+');
}

/** What is wrong with a schedule, or `null`. One sentence, for a person. */
export function scheduleRefusal(s: LevelSchedule): string | null {
  const whole = (n: number): boolean => Number.isInteger(n) && n >= 0;
  if (!whole(s.basements)) return 'the basement count must be a whole number, zero or more.';
  if (!whole(s.podiumAboveGround)) {
    return 'the podium level count must be a whole number, zero or more.';
  }
  if (!whole(s.podiumParkingLevels)) {
    return 'the podium parking level count must be a whole number, zero or more.';
  }
  if (s.podiumParkingLevels > s.podiumAboveGround) {
    return (
      `${s.podiumParkingLevels} podium level(s) of parking were entered, and the schedule ` +
      `has ${s.podiumAboveGround} podium level(s) above the ground floor. Add podium ` +
      'levels, put the parking on the ground floor, or put it below grade.'
    );
  }
  if (parkingLevels(s) === 0) {
    return (
      'this schedule provides no parking at all. Enter a basement, put the parking on the ' +
      'ground floor, or give a podium level to it — a scheme with no parking is one the ' +
      'engine will refuse further down for a less obvious reason.'
    );
  }
  return null;
}
