/**
 * The ten step primers, in English.
 *
 * `export type PrimerDictionary = typeof EN` is the contract `primer.ar.ts` is
 * held to, so a step added here fails the Arabic file at compile time rather than
 * shipping a screen that opens in the wrong language.
 *
 * ---------------------------------------------------------------------------
 * THE THREE LAYERS, AND WHAT BELONGS IN EACH.
 *
 * `fact` is one sentence saying what the screen is, with no caveat inside it. The
 * caveat is the next sentence's job. A fact that arrives already qualified is the
 * shape the flow had before — true, careful, and unreadable cold.
 *
 * `means` is what it costs the reader: what they have to do, what is refused,
 * what happens next. `ux-writing`'s what → why → how, with the how attached to
 * the reader rather than to the system.
 *
 * `why` is the argument, and it is the one place a long sentence is allowed,
 * because it is behind a closed disclosure and nobody is blocked on it.
 *
 * ---------------------------------------------------------------------------
 * NO DIGIT THAT THE ENGINE COULD PRODUCE.
 *
 * The 2% area tolerance and the 15–35% parking swing appear here as words, not
 * figures — `FR-PLT-001 AC2` owns the first and `FR-DEF-002` the second, both are
 * already printed by the panels that enforce them, and a second copy in a
 * dictionary is a number that can drift out of step with the rule it describes.
 * The one exception is none: there is no figure in this file.
 *
 * WHAT IS PROMISED HERE IS WHAT IS BUILT. Not what Phase B will do. `plot` says
 * a rectangle is what this version takes and says so in the disclosure, because
 * a primer that describes the roadmap is a primer that lies to the person reading
 * the screen in front of them.
 */

/** The ten steps of the flow, by the ids the engine and the URL both use. */
export type PrimerStep =
  | 'intake'
  | 'plot'
  | 'parameters'
  | 'rules'
  | 'assumptions'
  | 'capacity'
  | 'parking'
  | 'checks'
  | 'evidence'
  | 'export';

export interface Primer {
  /** Layer 1: what this screen is. One sentence, no caveat inside it. */
  readonly fact: string;
  /** Layer 2: what it costs the reader — what to do, or what is refused. */
  readonly means: string;
  /**
   * Amber, taught in words, on the three steps where an ASSUMED value is
   * actually on screen — the register, the capacity bands and the parking
   * figures.
   *
   * NOT ON THE OTHER SEVEN, and that is the point of it being optional. A
   * sentence explaining a colour that is not on the screen teaches the reader
   * that it is decoration, which is the precise opposite of what §13.1 reserves
   * it for. It is also the one line in the primer rendered WITH the colour it
   * names, so the claim and its referent arrive in the same eyeful.
   */
  readonly amber?: string;
  /** Layer 3, behind a closed disclosure: the label on it, and the argument. */
  readonly whySummary: string;
  readonly why: string;
}

export const EN: { readonly steps: Readonly<Record<PrimerStep, Primer>> } = {
  steps: {
    intake: {
      fact: 'This step reads an affection plan — the sheet the authority issues for a plot.',
      means:
        'You do not need it. Skip this and type the plot in by hand — the run is the same run. What the sheet buys you is that the figures came off a document instead of out of memory.',
      whySummary: 'Why it reports what the sheet leaves out',
      why: 'Every sheet omits something, and the omission is the dangerous part rather than the inconvenient part. A plot whose sheet prints a height code and no plot ratio has no plot ratio: the nearest plot in the same community almost certainly has one, it is almost certainly close, and borrowing it is the exact mistake this product exists to prevent — the answer would look identical and rest on a limit nobody issued for this plot. So a missing limit is reported as missing, the run stops rather than filling it in, and you are asked for the document that states it.',
    },

    plot: {
      fact: 'This is the plot’s shape, and what each of its edges faces.',
      means:
        'Every edge needs a classification, because the setback on an edge is chosen by what that edge faces and there is no default for it. The area your dimensions compute is then checked against the area the sheet prints, and a disagreement larger than the tolerance is reported rather than absorbed.',
      whySummary: 'Why the shape is entered and not traced',
      why:
        'This version takes a plot two ways: a frontage and a depth, or a length and a direction for each boundary, as the affection plan states them. The second is what a plot of more than four sides needs, and the corners are computed from those numbers rather than traced over a satellite tile — a hand trace lands a few per cent out, which is enough to fail the area check the trace was meant to satisfy. Nothing is adjusted to make the boundaries close: where they do not return to the corner they started from, the gap is reported, the last boundary is drawn at the length that closes it, and both figures are on screen. Curved boundaries are still entered as the straight line between their ends, and the area your dimensions compute, checked against the area the sheet prints, is what keeps that approximation honest.',
    },

    parameters: {
      fact: 'Nothing is computed until you confirm this screen.',
      means:
        'Everything after it is derived from what is on it — the shape, the areas, the classification of every edge. Check it here, where changing it is free.',
      whySummary: 'Why confirming is a gate rather than a button',
      why: 'The value of this gate is not the click; it is that you see the area your dimensions compute beside the area the sheet prints, and the classification of every edge, at the one moment when changing any of them costs nothing. Afterwards the run is a record: editing it produces a new run and leaves the original intact, because a study somebody has already been shown may not change under them. So this is the last cheap moment, and it is made to look like one.',
    },

    rules: {
      fact: 'These are the rules that will be applied, and the two questions no rule answers.',
      means:
        'Whether parking counts toward the plot ratio, and how much of the floor area is saleable. Neither has a default anywhere in this product, both move the answer by more than the difference you are studying, and the run will not start until you have answered them.',
      whySummary: 'Why the engine refuses to choose for you here',
      why: 'A default here is not a convenience, it is an invisible decision with your name on the output. The parking treatment alone swings the permitted floor area by more than the margin most schemes are decided on, and it is a practice’s reading of the regulation rather than a line in it — so it is recorded against the person who answered, with the reading they used. Saleable efficiency is the same failure in a quieter form: the engine used to take every square metre of floor area as saleable, which is what dividing by unit area assumes, and reported a few per cent too many units on every run. There was no number in the code to argue with, which is exactly what made it survive.',
    },

    assumptions: {
      fact: 'An assumption is a number no document stated and no rule supplied.',
      means:
        'The engine chose one so the run could finish, wrote down why, measured how far the answer moves if the choice is wrong, and put it in this list. Change any of them and the answer moves with it.',
      amber:
        'Amber means assumed. It is not a warning and nothing has gone wrong — it is the engine naming the figures that rest on its judgement rather than on a document.',
      whySummary: 'Why the engine assumes anything at all',
      why: 'A value with no governing rule has three possible fates: stop the run, pick a number in silence, or pick a number and say so. Stopping is right where the missing value is a limit the plot itself must state — an affection plan that omits a plot ratio gets none, and the run blocks rather than borrowing one from a neighbouring plot. Everywhere else, a silent choice is the failure this product exists to prevent, because it produces a plausible answer nobody can audit. So the engine picks, records the basis, measures how far the answer would move if the choice were wrong, and puts it in this list before anything can be exported.',
    },

    capacity: {
      fact: 'Three capacities are computed, and the smallest one is the answer.',
      means:
        'What the regulation permits, what the massing can hold, and what the parking can serve. The one that binds is the one that decides the scheme; the gap to the next one is your headroom, and knowing which band you are against tells you what there is any point changing.',
      amber:
        'Amber here means assumed, and it is not a warning: it marks a figure no document stated, which the engine chose and wrote a reason for. Where it sits on this screen it is telling you the band above rests on a judgement — including, where nobody has entered a podium level count, the split between podium and tower.',
      whySummary: 'Why there is no fourth, “realistic” band',
      why: 'A realistic or expected capacity is the number everybody wants and nobody can derive. It would be a judgement about how a scheme is likely to be received, dressed as an output of the engine, and it would be the figure every reader took away — so it is refused by the shape of the data rather than by policy, and there is no field for it to be added to. What replaces it is a discount you set yourself, with your name on it, which is the same judgement made where it belongs: with the person who is accountable for it.',
    },

    parking: {
      fact: 'The bays are placed as rectangles on a level, not divided out of an area.',
      means:
        'What you see is where each car stands and which way it faces: bays that were placed, not divided out. The drawings, the exported CAD file and the 3D view all render that one placement rather than each making its own, so a car in the model is a car on the sheet.',
      amber:
        'Amber here means assumed, not unsafe. The area one bay is taken to consume is the clearest case: no cited rule fixes it, so the engine chose a figure, said which range it came from, and ranked it in the assumption register because the parking band moves roughly in proportion to it.',
      whySummary: 'What this layout does not yet include',
      why: 'The level is packed into the largest rectangle that fits inside the podium, never its bounding box, so the count errs low and the shortfall on an irregular plot is reported in square metres rather than hidden inside a ratio. What is not in it yet: the core is not placed, so the bays it would displace are still counted; the aisles are not checked for whether every bay can actually be reached; and the ramp is drawn as plan area with its gradient stated rather than checked against the run it is given. Each of those makes the count optimistic, each is named on this screen rather than left to be discovered, and each is scheduled.',
    },

    checks: {
      fact: 'This is where the run is checked — by code that cannot see the engine that produced it.',
      means:
        'A check with no data to work on reports itself dormant rather than passing. Nothing on this screen is a compliance verdict: this product never claims regulatory validity, and a check that passed would not be one.',
      whySummary: 'Why a validator agreeing with the engine proves less than it looks like',
      why: 'Two pieces of software written by the same people from the same reading of the same regulation will agree with each other, and their agreement says nothing about whether the reading was right. That is self-consistency, and calling it validation is the single most tempting dishonest move available to a product like this. So the checks are built where they cannot reach the engine at all — not discouraged from reaching it, unable to — and what they can honestly report is that the answer is internally coherent and that these particular constraints were tested. Whether the result is permissible is a question for the authority, and it stays one.',
    },

    evidence: {
      fact: 'Every number in this run, with the derivation behind it.',
      means:
        'Open any one of them and the derivation opens with it — a rule with a citation, a document, a person who entered it, or an assumption with its basis.',
      whySummary: 'Why every value carries this, and not the headline figures alone',
      why: 'Provenance on the headline figures alone is provenance that fails exactly where an argument gets difficult, because the number somebody disputes is never the one at the top. It is carried in the type of every emitted value instead: there is no way to construct a number in this engine without saying where it came from, which is a cost paid on every function signature rather than a feature that could be switched on later. That is why this screen can be a complete list rather than a selection.',
    },

    export: {
      fact: 'What leaves this screen carries its own limits with it.',
      means:
        'The report, the drawing set, the CAD file, the 3D model and the workbook all carry the assumption register and the line saying regulatory validity was not assessed — every format, not the ones where it happens to be convenient.',
      whySummary: 'Why the gates are before the download rather than on it',
      why: 'A file that has left is a file somebody else will read without the screen it came from. Attaching the caveat to the interface and not to the document means the caveat is the first thing lost, and what circulates is a number with an authoritative-looking drawing around it. So the limits travel inside every format, including the CAD file, where they are text on the sheet rather than a property in the header. The gates sit before the download for the same reason: afterwards is too late to have read anything.',
    },
  },
};

/**
 * Kept as the name the other dictionaries use for their contract, though the
 * shape here is declared rather than inferred: `Record<PrimerStep, Primer>` is
 * what makes a MISSING step fail, which `typeof EN` cannot do — it would simply
 * infer the nine that were there.
 */
export type PrimerDictionary = typeof EN;
