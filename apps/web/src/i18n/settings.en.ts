/**
 * `/settings` — the account's own three panels, in English.
 *
 * `export type SettingsDictionary = typeof EN` is the contract `settings.ar.ts`
 * is held to. NO `as const`, so every value widens to `string` and the SHAPE is
 * what the Arabic must match.
 *
 * WHAT IS NOT IN HERE, AND WHY IT IS NOT A GAP:
 *
 *   The email address. It is rendered as the server sent it, inside `Ltr`, and a
 *   translated email is a different address.
 *
 *   Any figure. The password minimum is written in WORDS and enforced only by
 *   the server — see `password.next.help` for the argument. A digit here would
 *   be a second copy of a rule, and it is the copy nothing runs that drifts.
 *
 *   A word for "verified" anywhere near the licence. Nothing verifies it. See
 *   `licence.help`, which is the whole reason that field carries a sentence.
 */

export const EN = {
  title: 'Settings',
  lede: 'Your name, your licence and your password. Three things, and what each one does to a run you sign.',

  /* ---------------------------------------------------------------- profile */
  profile: {
    heading: 'Who you are',
    /**
     * THE SENTENCE THIS PANEL EXISTS FOR.
     *
     * A name on this product is not a display preference. Every `USER_SET` value
     * carries the name of whoever entered it, and `G4` records the name and the
     * licence of whoever signed the review. So the form has to say what changing
     * a name does and — more importantly — what it does NOT do to runs already
     * signed, because the obvious assumption is that it rewrites them.
     */
    lede: 'This name goes on every value you set by hand and on every review you sign.',
    retro:
      'Changing it does not change a run you have already signed. A signature records the name that was current when it was made, and a run is never rewritten — so an older run will go on showing the older name, which is what it said.',

    name: {
      label: 'Name',
      help: 'As it should appear beside a value you entered.',
      missing: 'A run signed by nobody is a run with no author. Enter the name to record.',
    },
    licence: {
      label: 'Licence number',
      optional: 'optional',
      /**
       * THE DISCLOSURE THAT MAKES THIS FIELD HONEST.
       *
       * `CLAUDE.md` lists it among the things still to be disclosed in writing:
       * *"the licence on `G4` is recorded and never verified"*. A field that
       * takes a licence number and says nothing teaches a reader that something
       * checked it. Nothing did, and nothing here can.
       */
      help: 'Recorded on a review you sign, and never verified. No registry is connected, so this is your assertion and it is stored as one.',
      clear: 'Leave it empty to withdraw it.',
    },
    email: {
      label: 'Email',
      /**
       * WHY THE FIELD IS READ-ONLY, in the place a reader will ask.
       *
       * Not "coming soon". The reason is a property of how sharing works and it
       * is worth a reader knowing: a run is shared TO an address, so an address
       * that could move without proof would move somebody else's shared runs.
       */
      help: 'This cannot be changed here. A run is shared to an address, so moving one needs an email that proves you hold the new inbox — and this deployment sends no email.',
    },
    save: 'Save name and licence',
    saving: 'Saving…',
    saved: 'Saved.',
  },

  /* --------------------------------------------------------------- password */
  password: {
    heading: 'Password',
    lede: 'Changing it signs out every other device. This one stays signed in.',
    /**
     * WHY THAT IS THE HEADLINE RATHER THAN A FOOTNOTE.
     *
     * The commonest reason to change a password is that somebody else may hold
     * it. A reader needs to know before they start that this ends the other
     * sessions — both because it is the outcome they want, and because if they
     * are on a second device of their own they are about to be signed out of it.
     */
    current: {
      label: 'Current password',
      help: 'Asked for so that an unlocked browser cannot take the account permanently.',
      wrong: 'That is not the current password. Nothing was changed.',
    },
    next: {
      label: 'New password',
      /**
       * THE RULE IS WRITTEN IN WORDS, AND THE FORM DOES NOT ENFORCE IT.
       *
       * `AccountPanel` makes the same choice one component over and the reason is
       * the same: a numeral here is a second copy of `PASSWORD_MIN`, and the copy
       * that drifts is always the one nothing runs. The FORM does not pre-check
       * the length either — it submits, and a password the server refuses is
       * refused in the server's own sentence, rendered verbatim. One authority on
       * what the rule is, and it is the one that enforces it.
       *
       * `settings.test.tsx` asserts `PASSWORD_MIN` is still twelve and names both
       * dictionaries, so changing the constant fails loudly rather than leaving
       * two pages quoting a rule nobody applies.
       */
      help: 'At least twelve characters. Length is the only rule — a long ordinary sentence is stronger than a short one with punctuation in it, and this does not pretend otherwise.',
    },
    confirm: {
      label: 'New password again',
      mismatch: 'These two do not match.',
    },
    submit: 'Change password',
    submitting: 'Changing…',
    done: 'Password changed. Every other device has been signed out.',
  },

  /* -------------------------------------------------------------- sessions */
  sessions: {
    heading: 'Devices',
    lede: 'A session lasts 30 days and is held in a cookie this site set. Signing out everywhere ends all of them, including this one.',
    /**
     * NO DEVICE LIST, and saying so is better than an empty table.
     *
     * The store holds sessions but records nothing about where each came from,
     * so a list would be a column of identical rows. `site-map.md` refuses a
     * greyed "coming soon" in the footer for the same reason: a promise with no
     * date attached is worse than an absence.
     */
    noList:
      'There is no list of your devices. Nothing records where a session was opened from, and a list of rows that all say the same thing would look like information.',
    signOutEverywhere: 'Sign out everywhere',
    signingOut: 'Signing out…',
  },

  /* ------------------------------------------------------------- appearance */
  appearance: {
    heading: 'Appearance',
    lede: 'Theme and language are held in this browser, not on your account — so they follow the machine rather than the person.',
    theme: {
      label: 'Theme',
      help: 'Both themes are checked against WCAG 2.2 contrast on every build, including the amber that marks an assumed value.',
    },
    density: {
      label: 'Row height',
      /**
       * WHAT THE CONTROL IS FOR, in terms of the thing it changes.
       *
       * Not "compact / comfortable / spacious" with no explanation, which is the
       * category default and tells a reader nothing. A table in this product is a
       * schedule — levels, bays, rules, checks — and the choice is between reading
       * one row and comparing forty. That is the sentence.
       */
      help: 'Every schedule in the product: the levels, the bays, the rules, the checks. Comfortable reads one row at a time; compact fits forty on a screen to compare them.',
      compact: 'Compact',
      comfortable: 'Comfortable',
      spacious: 'Spacious',
    },
    language: {
      label: 'Language',
      help: 'The engine and the site are in both. What the engine computed — a plot number, a rule citation, a figure — stays as it was recorded, in either language.',
    },
  },

  /* ----------------------------------------------------------- signed out */
  signedOut: {
    heading: 'There is no account signed in.',
    body: 'Settings belong to an account. You can use the engine without one — your runs are then held against a key in this browser, and clearing it loses them.',
    cta: 'Go to the engine',
  },

  /** A call that failed for a reason the server did not explain. */
  failed: 'That did not save. Nothing was changed.',
};

export type SettingsDictionary = typeof EN;
