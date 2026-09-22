/**
 * `/app` — the antechamber, and the account panel it renders.
 *
 * ONE MODULE FOR BOTH, because `AccountPanel` renders nowhere else. A component
 * that appears on one screen and has its own dictionary file would be a second
 * place to look for a string on the same page, and the split would be by
 * implementation rather than by what a reader meets. The `account` branch below is
 * that component's copy; everything else is the screen's.
 *
 * NO `as const`. `export type AntechamberDictionary = typeof EN` is the contract,
 * and without the assertion every value widens to `string`, so the SHAPE is what
 * `antechamber.ar.ts` is held to. A missing key, a misspelled key or a key nobody
 * removed from one side is a compile error rather than a sentence that silently
 * renders in the wrong language — the argument is in `chrome.en.ts` and it is the
 * same one `packages/invariants` makes about its dependencies.
 *
 * WHAT IS NOT IN HERE, AND MAY NEVER BE.
 *
 *   No figure. Not a count, not a ratio, not a dimension. This screen reads no
 *   fixture and `antechamber.test.tsx` asserts the rendered text carries no digit
 *   at all — which is why the password rule below is written "twelve characters"
 *   rather than with a numeral, and why "exactly two things" is a word. A digit in
 *   a dictionary is a number with no provenance, and a dictionary is the one place
 *   on the site where nothing checks it.
 *
 *   No engine string. The step ids the unrecognised-step line prints are the
 *   engine's own names for its steps, and the sentence that carries them is split
 *   into `lead`, `between` and `tail` for exactly that reason: the identifiers pass
 *   through the component untranslated and, on the Arabic page, isolated. The
 *   server's own sentence for a failed sign-in is likewise not in this file —
 *   `error.unknown` is the fallback for the case where there is no server sentence
 *   to show.
 *
 * THE THREE REFUSALS THIS SCREEN EXISTS TO MAKE — the licence is recorded and NOT
 * verified, separation of duties is NOT enforced, and without an account nothing is
 * saved as you type and your runs open only from this browser — are `hero.lede.licence`, `hero.lede.account` and the sentences
 * that restate them at the field and in the panel. A translation that carries the
 * meaning of one of those and drops a qualifier has weakened the product's whole
 * position in a language nobody who wrote the English can read.
 */

export const EN = {
  hero: {
    title: 'Before the engine opens',

    /** Three paragraphs, in this order: why we ask · the licence · what an account is. */
    lede: {
      /* Why the name is asked for at all, and that there is no way around it. */
      record:
        'Every value you set is recorded against the name you give here, and that name is ' +
        'printed on the export and written against each gate — so any figure in the output ' +
        'can be traced back to whoever entered it. There is no anonymous mode, and that is ' +
        'a design decision rather than an oversight.',

      /*
        "NOT VERIFIED", IN THOSE WORDS, AND THE SEPARATION REFUSAL WITH IT.

        The sentence once read "not confirmed with any authority", which is true and
        reads softer: verification is the control a reader assumes a licence field
        implies, so the denial has to use the reader's own word or it is answering a
        question nobody asked. `scripts/smoke.mjs` asserts the phrase on this screen.
      */
      licence:
        'The licence field is recorded and nothing further happens to it. It is not ' +
        'verified with any authority, and it is not compared with the person who authored ' +
        'the run, so authoring a run and signing it yourself is something this deployment ' +
        'permits and records. What the reviewer gate does is write a name, an asserted ' +
        'licence number and a timestamp onto the export. Separation of duties is a control ' +
        'this software does not have, and an asserted control is worse than a missing one, ' +
        'because a missing one is visible.',

      /* The offer, with both refusals restated rather than assumed to carry over. */
      account:
        'An account is a password and a session, and it changes exactly two things: your ' +
        'runs are kept against your name, and what you type is saved as you go, so closing ' +
        'the tab does not lose it. It changes nothing about the licence — still recorded, ' +
        'still not verified with anybody — and nothing about separation of duties, which ' +
        'this software still does not enforce. You may also continue with a name alone: ' +
        'the engine behaves identically, nothing is saved as you type, and the runs you ' +
        'make open only from this browser — clear it, or use another, and they are out of ' +
        'reach.',
    },
  },

  /** `components/AccountPanel.tsx`. */
  account: {
    checking: 'Checking whether you are signed in…',
    offline:
      'The accounts service could not be reached, so whether you are signed in is ' +
      'unknown. Entering a name below still opens the engine; nothing is saved as you ' +
      'type, and your runs open only from this browser.',

    signedIn: {
      heading: 'Signed in',
      terms:
        'Runs you author are kept against this account, and what you type on the way is ' +
        'saved as you type it. The licence recorded on an export is still not verified with ' +
        'anybody.',
      signOut: 'Sign out',
      licence: 'Licence number on this account: ',
      noLicence: 'This account has no licence number, so it cannot sign a review.',
    },

    /*
      THE HEADING AND THE BUTTON ARE SEPARATE KEYS THOUGH THE ENGLISH IS ONE WORD.

      "Sign in" names the panel in the h2 and commands an action on the button, and
      English spells both the same. Most other languages do not — a heading is a
      noun and a button is an imperative — so collapsing them to one key would force
      every translation to pick which of the two to get wrong. The English rendering
      is unchanged either way.
    */
    heading: {
      in: 'Sign in',
      up: 'Create an account',
    },

    terms:
      'An account keeps your runs and saves what you type as you type it. Without one the ' +
      'engine behaves identically, nothing is saved as you type, and your runs open only ' +
      'from this browser.',

    fields: {
      name: {
        label: 'Your name',
        help: 'This is the name printed on an export and written beside every value you set.',
      },
      email: {
        label: 'Email',
        /* A fact about the field, never a repeat of its label: the email signs you in
           and is not what appears on an export, and a reader is entitled to know which
           of the two it is. */
        help: 'Used to sign in. It is not what appears on an export — the name is.',
      },
      password: {
        label: 'Password',
        /* "twelve characters", not "12" — see the note at the head of this file. */
        helpUp:
          'At least twelve characters. Length is the only rule — there are no requirements ' +
          'about capitals or symbols, because they produce weaker passwords rather than ' +
          'stronger ones.',
        helpIn: 'Only a hash of it is kept, so it cannot be recovered — only replaced.',
      },
      /*
        THE ONLY WAY AN ACCOUNT CARRIES A LICENCE, and for a long time it was not on
        the form. The API took one at sign-up and the panel never sent it, so every
        account made on this screen held none — and the review gate asks for one, so
        no signed-in account could sign a review at all. The field says what it is
        for, and says in the same clause that the number is checked with nobody.
      */
      licence: {
        label: 'Professional licence number (optional)',
        help:
          'Needed to sign a review. Recorded as you type it, and not confirmed with anybody. ' +
          'It cannot be added later.',
      },
    },

    submit: {
      busy: 'Working…',
      in: 'Sign in',
      up: 'Create the account',
    },

    toggle: {
      toUp: 'Create an account instead',
      toIn: 'I already have one',
    },

    error: {
      /* THE FALLBACK ONLY. A failure the server explained is rendered in the server's
         own sentence, verbatim — it is the only party that knows why, and its wording
         for a failed sign-in is deliberately one message for both a wrong password and
         an unknown email. This string is what there is to say when there was no
         sentence at all. */
      unknown: 'that did not work, and the reason is unknown',
    },
  },

  form: {
    heading: 'The name this run will carry',

    name: {
      label: 'Your name',
      help: 'Required. It is printed on the export and written beside every value you set.',
      error: {
        lead: 'No name entered.',
        body:
          'Every value the run records carries a name, so the engine does not open ' +
          'without it.',
      },
    },

    licence: {
      label: 'Professional licence number (optional)',
      /* The reader who skips the prose above still meets the fact at the field, in
         one clause, because the field is where the assertion is made. */
      help: 'Recorded as you type it, and not confirmed with anybody.',
    },

    hints: {
      /* Describes the request and the pass-through, and stops short of promising that
         the recorded run loads — nothing in `App.tsx` parses `demo` today. */
      demo:
        'This address asks for the recorded worked example — the run whose figures the ' +
        'home page quotes. It is carried through to the engine exactly as you followed it, ' +
        'and starting from your own plot instead is a choice on the first step.',

      /*
        THREE FRAGMENTS, AND THE SPLIT IS THE POINT.

        Two runs of text the component supplies sit between them: the step id the
        VISITOR typed, echoed back, and the engine's own list of step ids. Neither is
        interface copy and neither may be translated, so neither is in this file —
        the sentence is written around them instead. On the Arabic page each is
        isolated, without which the closing quotation mark and the full stop migrate
        to the wrong end of the line.

        The quotation marks live in `lead` and `between` rather than in the component
        because a language chooses its own.
      */
      unknownStep: {
        lead: 'There is no step called “',
        between: '”. The steps are: ',
        tail:
          '. The engine opens at the first of them rather than substituting a different ' +
          'screen for the one this address named.',
      },
    },

    cta: {
      /* The button names its outcome. "Continue" names the click. */
      submit: 'Open the engine with this name recorded',
      refusals: 'What it refuses',
      note:
        'That page sets out in full what the reviewer gate records and what it does not ' +
        'check.',
    },
  },

  /** R5 — every page ends on a limit, never on a call to action. */
  closing: {
    heading: 'What entering a name does not do',
    body:
      'It does not check you against anything, and it moves none of the figures. The same ' +
      'plot, the same rules and the same declared assumptions return the same answer ' +
      'whoever is at the keyboard. What the name changes is the record: the export carries ' +
      'it, and each value you set carries it beside the value.',
    readiness: {
      lead: 'What is not ready in this deployment is counted on the ',
      link: 'readiness page',
      tail: ', and no name entered here moves any of it.',
    },
  },
};

export type AntechamberDictionary = typeof EN;
