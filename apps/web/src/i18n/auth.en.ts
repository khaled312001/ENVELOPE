/**
 * `/sign-in` and `/sign-up`, in English.
 *
 * `export type AuthDictionary = typeof EN` is the contract `auth.ar.ts` is held
 * to. NO `as const`, so every value widens to `string` and the SHAPE is what the
 * Arabic must match.
 *
 * ---------------------------------------------------------------------------
 * WHAT AN ACCOUNT IS FOR, AND THE SENTENCE THAT HAS TO BE ON BOTH SCREENS.
 *
 * An account changes exactly two things: the run is kept, and what you typed is
 * saved as you typed it. It does not make a run reviewed, verified, approved or
 * compliant, and it does not check the licence number beside it. Every product in
 * this category treats its sign-up screen as the place to promise, and this one
 * is the place where the promise would be least visible and most damaging.
 *
 * So `aside.what` is the whole offer and `aside.not` is what it is not, and both
 * are on both screens. `AccountPanel` makes the same argument for the panel
 * inside the antechamber; these are the standalone pages of the same offer.
 *
 * ---------------------------------------------------------------------------
 * NOTHING HERE PROMISES AN EMAIL. This deployment sends none — there is no
 * mailer — so there is no "forgot your password", no "verify your address" and no
 * "we have sent you a link". `noRecovery` says so, in the place a reader will
 * look for the link that is not there. A greyed-out "Forgot password?" would be a
 * promise with no date attached, which `site-map.md` refuses for the footer and
 * this refuses for the same reason.
 */

export const EN = {
  in: {
    title: 'Sign in',
    lede: 'Your runs, kept as they were computed.',
    submit: 'Sign in',
    busy: 'Signing in…',
    switchPrompt: 'No account yet?',
    switchCta: 'Create one',
  },
  up: {
    title: 'Create an account',
    lede: 'Two things change: your runs are kept, and what you type is saved as you type it.',
    submit: 'Create the account',
    busy: 'Creating…',
    switchPrompt: 'Already have an account?',
    switchCta: 'Sign in',
  },

  fields: {
    email: {
      label: 'Email',
      /**
       * NOT "we will never spam you", which is a promise about a thing that does
       * not exist. The address is what a run is SHARED to, which is the only
       * reason the field is here and the fact a reader actually needs.
       */
      help: 'This is the address a run is shared to. It cannot be changed later without an email that proves the new inbox, and this deployment sends none.',
    },
    password: {
      label: 'Password',
      help: 'At least twelve characters. Length is the only rule — a long ordinary sentence is stronger than a short one with punctuation in it, and this does not pretend otherwise.',
      show: 'Show the password',
      hide: 'Hide the password',
    },
    name: {
      label: 'Name',
      help: 'This goes on every value you set by hand and on every review you sign.',
      missing: 'A run signed by nobody is a run with no author. Enter the name to record.',
    },
    licence: {
      label: 'Licence number',
      optional: 'optional',
      /** The disclosure, in the place the assertion is first made. */
      help: 'Recorded on a review you sign, and never verified. No registry is connected, so this is your assertion and it is stored as one.',
    },
  },

  /**
   * NO RECOVERY, AND IT IS SAID RATHER THAN OMITTED.
   *
   * A reader who cannot sign in will look for a link. Its absence with no
   * explanation reads as a bug; its absence with a sentence reads as a deployment
   * that has not connected a mailer, which is what it is.
   */
  noRecovery:
    'There is no password reset. This deployment sends no email, so a reset link would be a link to nothing — and the honest version of that is this sentence rather than a form that fails.',

  /**
   * THE DOOR'S OWN COLUMN — what is behind this page, in three lines.
   *
   * Every line names something the engine DOES, in the engine's own terms, and
   * none of them is a benefit, a percentage or a time saved. The limit is not
   * here: it is `aside.not`, which sits under these at full weight, because a
   * panel that listed three capabilities and no refusal would be the sales page
   * this product spends its landing page arguing against.
   */
  gate: {
    /** The product's name. Not copy — it is the same word in both languages. */
    mark: 'TOP.ai',
    headline: 'Everything it works out, and everywhere the figure came from.',
    points: [
      'Reads the affection plan and cites every figure to the box it was printed in.',
      'Lays the parking out as bays, aisles and a ramp — never an area divided by a factor.',
      'Marks every assumption, and blocks rather than quietly filling a gap.',
    ],
  },

  aside: {
    what: 'An account keeps your runs, exactly as they were computed, with their inputs, their assumptions and their provenance graph.',
    not: 'It does not make a run reviewed, verified, approved or compliant. Regulatory validity is never assessed, with an account or without one.',
    guest:
      'You can use the engine without an account. Your runs are then held against a key in this browser: whoever holds the key holds the runs, and clearing the browser loses them.',
    guestCta: 'Use it without an account',
  },

  /** Where a reader lands after signing in, when they were sent here from a page. */
  returning: 'You will go back to where you were.',

  signedIn: {
    /** The name sits between these. */
    before: 'You are signed in as ',
    after: '.',
    cta: 'Go to your work',
    settings: 'Settings',
  },

  /** A call that failed with no sentence from the server. */
  failed: 'That did not work. Nothing was changed.',
};

export type AuthDictionary = typeof EN;
