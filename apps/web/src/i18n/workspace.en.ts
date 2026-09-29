/**
 * `/workspace` — the firm, its people and what each of them may do, in English.
 *
 * `export type WorkspaceDictionary = typeof EN` is the contract `workspace.ar.ts`
 * is held to. NO `as const`, so every value widens to `string` and the SHAPE is
 * what the Arabic must match.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE PAGE WHERE A PRODUCT USUALLY OVERSTATES ITSELF.
 *
 * A members table with four role names on it implies an authorisation system, a
 * verified organisation and an audit trail somebody checks. This deployment has
 * exactly one of those three, so the copy has to say which. Four disclosures are
 * therefore ON THE PAGE rather than in a help centre:
 *
 *   1. The workspace name is a label its members chose. Nothing verified that a
 *      firm by that name exists, or that these people work there.
 *   2. Members see each other's work. That is what a workspace IS, and somebody
 *      accepting an invitation is consenting to it, so it is said before they do.
 *   3. A licence on a review is recorded and never verified — the same sentence
 *      `/settings` and `/refusals` carry, in the place a reader is about to make
 *      somebody a reviewer.
 *   4. Nothing stops an author signing their own review. A role that implies a
 *      second pair of eyes has to say where the second pair is not enforced.
 *
 * WHAT IS NOT IN HERE, AND WHY IT IS NOT A GAP:
 *
 *   Any server sentence. Every refusal on these routes was written to be read —
 *   "you are an admin of this workspace, and cannot change an owner's role" — and
 *   it is rendered in the server's own words inside `Ltr`. A translated copy of a
 *   refusal is a second record nobody issued; `docs/05-design/arabic-glossary.md`
 *   gives the rule.
 *
 *   The word "verified" anywhere near a licence, a name or an organisation.
 *
 *   Any count. The number of members is the length of the list.
 */

export const EN = {
  title: 'Workspace',
  lede: 'A firm, the people in it, and what each of them may do. Nothing here is verified by anybody — it is what you and your colleagues have told this product about yourselves.',

  /* ------------------------------------------------------------- no workspace */
  empty: {
    heading: 'You are working on your own',
    /* Empty state: value first, then the one action. */
    lede: 'Everything you compute is yours alone. Nobody else can open it, and nobody else can be asked to review it — a run is shared one at a time, to one address, by you.',
    value:
      'A workspace changes that. Colleagues in it open each other’s runs without being granted one at a time, a departure is one act rather than a search through every run somebody was ever sent, and the review that signs an export can come from the person sitting next to you.',
    create: 'Name your firm',
    help: 'Whatever your colleagues would recognise. You can change it later, and nothing checks it.',
    submit: 'Create the workspace',
    creating: 'Creating…',
    missing: 'Give the workspace a name your colleagues will recognise.',
  },

  /* ---------------------------------------------------------------- switching */
  picker: {
    label: 'Working inside',
    personal: 'On my own',
    /**
     * THE SENTENCE UNDER THE SWITCHER, and it is the most consequential one on the
     * page. A run is filed where the reader was standing when it was computed, and
     * it cannot be moved afterwards — the scope is written at creation and never
     * inferred. Somebody who does not know that will file a client's plot under
     * the wrong name and find out weeks later.
     */
    effect:
      'New plots and runs are filed here. A run keeps the workspace it was computed in — it cannot be moved afterwards, so check this before you start.',
    personalEffect:
      'New plots and runs are yours alone. Nobody in your workspaces will see them unless you share one.',
    another: 'Create another workspace',
  },

  /* ------------------------------------------------------------------ members */
  members: {
    heading: 'People',
    lede: 'Everybody here can open every plot and every run computed in this workspace, including ones they did not make.',
    /* The disclosure a person accepting an invitation is consenting to. */
    disclosure:
      'That includes the plot number, the assumptions somebody entered by hand and the reasons they typed for them. A workspace is a shared file, not a shared folder.',
    columns: {
      person: 'Person',
      role: 'Role',
      since: 'In the workspace since',
      actions: 'Change',
    },
    you: 'you',
    missingAccount: 'This account no longer exists',
    noLicence: 'No licence asserted',
    licenceLabel: 'Licence',
    remove: 'Remove',
    removing: 'Removing…',
    leave: 'Leave this workspace',
    leaving: 'Leaving…',
    /* Confirmation restates the action and the object — never "OK". */
    confirmRemove: 'Remove {name} from the workspace?',
    confirmRemoveBody:
      'They lose access to every plot and every run in it, including ones they made. Runs they authored stay — a run is never deleted — and they keep them in their own work.',
    confirmRemoveAction: 'Remove {name}',
    confirmLeave: 'Leave this workspace?',
    confirmLeaveBody:
      'You lose access to every plot and every run in it, including ones you made. To come back, somebody here has to invite you again.',
    confirmLeaveAction: 'Leave the workspace',
    cancel: 'Cancel',
    roleSaving: 'Saving…',
  },

  /* -------------------------------------------------------------------- roles */
  roles: {
    heading: 'What each role may do',
    /* A role name means nothing until somebody says what it buys. */
    owner: {
      name: 'Owner',
      can: 'Everything an admin can, and can rename the workspace, change anybody’s role, and make another owner.',
    },
    admin: {
      name: 'Admin',
      can: 'Invite people, change the role of anybody below them, and remove them. Cannot touch an owner.',
    },
    member: {
      name: 'Member',
      can: 'Enter plots, run the engine, sign a review. Reads everything in the workspace.',
    },
    viewer: {
      name: 'Viewer',
      can: 'Reads everything in the workspace and exports it. Cannot enter a plot or start a run.',
    },
    lastOwner:
      'The last owner cannot leave or be removed. A workspace with no owner cannot be renamed, cannot invite anybody, and cannot be repaired from inside TOP.ai.',
    /* Disclosures 3 and 4, at the moment somebody is choosing who reviews. */
    reviewNote:
      'Anybody in the workspace can sign the review gate on a run, if they have put a licence number on their account. That number is recorded and never verified — no registry is connected — and nothing here stops the person who computed a run from signing it themselves. A role is not a second pair of eyes; it only says who is allowed to be one.',
  },

  /* -------------------------------------------------------------- invitations */
  invites: {
    heading: 'Invitations',
    lede: 'An invitation is a link. TOP.ai sends no email and does not claim to, so you carry the link to the person yourself.',
    emailLabel: 'Their email address',
    emailHelp:
      'It has to be the address on their TOP.ai account. The link only works for that account — otherwise anybody who opened it would be in.',
    roleLabel: 'Role',
    submit: 'Make an invitation',
    submitting: 'Making the link…',
    missingEmail: 'Enter the email address on their account.',

    /* The one-time link. The copy has to say plainly that there is no second look. */
    madeHeading: 'The link, once',
    madeLede:
      'Copy it now and send it to them. It is not stored and cannot be shown again — if you lose it, make another invitation, which also withdraws nothing: the first link keeps working until it expires or you withdraw it.',
    copy: 'Copy the link',
    copied: 'Copied.',
    copyFailed: 'Select the link and copy it.',
    expires: 'Expires',

    listHeading: 'Outstanding',
    none: 'Nobody has been invited yet.',
    noneAdmin: 'When you invite somebody, the link appears here until it is used.',
    columns: { person: 'Invited', role: 'As', state: 'State', expires: 'Expires', actions: '' },
    withdraw: 'Withdraw',
    withdrawing: 'Withdrawing…',
    confirmWithdraw: 'Withdraw the invitation to {email}?',
    confirmWithdrawBody: 'The link stops working. You can make a new one at any time.',
    confirmWithdrawAction: 'Withdraw the invitation',
    state: {
      open: 'Waiting',
      accepted: 'Accepted',
      withdrawn: 'Withdrawn',
      expired: 'Expired',
    },
    hiddenFromMembers:
      'Only owners and admins see who has been invited. You are a member of this workspace.',
  },

  /* ------------------------------------------------------------------ renaming */
  rename: {
    heading: 'The workspace name',
    lede: 'A label your members chose. Nothing checked that a firm by this name exists, or that the people here work there — and no output from TOP.ai says otherwise.',
    label: 'Name',
    submit: 'Save the name',
    saving: 'Saving…',
    saved: 'Saved.',
    missing: 'A workspace needs a name.',
    ownerOnly: 'Only an owner can rename the workspace.',
  },

  /* --------------------------------------------------------------------- audit */
  audit: {
    heading: 'What has happened here',
    lede: 'Every change to this workspace, in the order it happened. Nothing here can be edited or deleted, by anybody, including an owner.',
    adminOnly: 'Owners and admins can read this.',
    none: 'Nothing has happened in this workspace yet.',
    renamed:
      'A person who changes their name later still appears here under the name they had at the time. A log that rewrote itself would not be a log.',
    then: 'then known as',
    /**
     * ACTIONS ARE STABLE KEYS, TURNED INTO SENTENCES HERE.
     *
     * The server stores `member.role_changed`, never a rendered sentence: a
     * sentence written at the time cannot be translated, and this product ships in
     * two languages. The keys and their values are the whole reason `detail` is
     * structured rather than prose.
     */
    actions: {
      'org.created': 'created the workspace',
      'org.renamed': 'renamed the workspace',
      'invite.created': 'invited',
      'invite.revoked': 'withdrew the invitation to',
      'invite.accepted': 'joined the workspace',
      'member.role_changed': 'changed a role',
      'member.removed': 'removed',
      'member.left': 'left the workspace',
      'run.created': 'computed a run',
      'gate.signed': 'signed a gate',
      unknown: 'did something this version does not have a name for',
    },
    roleChange: 'from {from} to {to}',
    onPlot: 'on plot {plot}',
    gate: 'gate {gate}',
    licenceAsserted: 'licence asserted: {licence}',
    noLicence: 'no licence asserted',
    more: 'Show more',
  },

  /* ------------------------------------------------------------- accept-invite */
  accept: {
    title: 'An invitation',
    checking: 'Reading the invitation…',
    heading: 'You have been invited to {organisation}',
    asRole: 'as {role}',
    lede: 'Joining means everybody in this workspace can open every plot and every run in it, and you can open theirs.',
    submit: 'Join {organisation}',
    submitting: 'Joining…',
    joined: 'You are in {organisation}.',
    already: 'You were already in {organisation}.',
    continue: 'Go to the workspace',
    signInFirst: 'Sign in to the account this invitation was sent to',
    signInWhy:
      'The link only works for the account holding the address it was sent to. Sign in, or create an account with that address, and open the link again.',
    noToken: 'This address has no invitation in it.',
    noTokenHelp:
      'An invitation link carries a token. Ask whoever invited you to send the whole link, exactly as they were given it.',
  },

  /* --------------------------------------------------------------------- state */
  state: {
    loading: 'Loading the workspace…',
    offline: 'The workspace could not be loaded',
    offlineHelp:
      'That is the request failing, not an answer about your membership. Try again; nothing has changed.',
    retry: 'Try again',
    signedOut: 'A workspace belongs to an account',
    signedOutHelp:
      'Sign in to see the firms you are in. A guest identity is a key kept in one browser — it cannot hold a membership, and clearing the browser would lose it.',
    signIn: 'Sign in',
  },
};

export type WorkspaceDictionary = typeof EN;
