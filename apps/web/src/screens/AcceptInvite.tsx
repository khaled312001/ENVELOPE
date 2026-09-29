/**
 * `/accept-invite` — the other end of the link somebody carried by hand.
 *
 * ---------------------------------------------------------------------------
 * IT NEVER TELLS THE READER WHY AN INVITATION WAS REFUSED.
 *
 * Expired, withdrawn, already used, addressed to a different person, or never a
 * real token at all — the server answers all five with one identical sentence, and
 * `org-routes.ts` explains at length why: distinguishing them turns this URL into
 * an oracle answering "is that person a member of that firm" to anybody who has it.
 *
 * So this page renders the server's sentence and adds nothing. There is no "the
 * link has expired" branch, no "sign in as somebody else" hint keyed off the
 * failure, and no retry that would let a reader tell the cases apart by timing.
 * The only thing offered alongside is the general advice that applies in every
 * case: this link works for one account, sign in as that account.
 *
 * ---------------------------------------------------------------------------
 * IT DOES NOT ACCEPT ON LOAD.
 *
 * The preview is a read; joining is an act with a disclosure attached — everybody
 * in the workspace will read your work and you will read theirs. A page that
 * joined somebody to a firm because they clicked a link in a message would have
 * taken that consent without asking for it. So the link shows what it is, and a
 * button does it.
 *
 * ---------------------------------------------------------------------------
 * THE TOKEN IS IN THE QUERY, WHICH IS A COMPROMISE AND IS NAMED AS ONE.
 *
 * A query string reaches server logs, browser history and any referrer a later
 * click sends. The alternative — a fragment, which never leaves the browser —
 * cannot be posted by a plain form and would make the link fragile in exactly the
 * messaging clients that rewrite URLs. The mitigations are that the token is
 * single-use, expires in seven days, is bound to one email address, and grants no
 * access on its own: a person who picks it out of a log still has to hold the
 * invited account. That is the reasoning, recorded rather than implied.
 */

import { useEffect, useState } from 'react';

import { workspaces, WorkspaceFailure, type WorkspaceRole } from '../api/workspace.js';
import { useDict, useLocale } from '../i18n/locale.js';
import { AR } from '../i18n/workspace.ar.js';
import { EN } from '../i18n/workspace.en.js';
import type { PageProps } from '../Root.js';
import { Link } from '../router.js';
import { useSession } from '../session.js';
import { useWorkspace } from '../workspace.js';

function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

interface Preview {
  readonly orgId: string;
  readonly organisation: string;
  readonly role: WorkspaceRole;
}

export default function AcceptInvite({ navigate, search }: PageProps): JSX.Element {
  const t = useDict(EN, AR);
  const { locale } = useLocale();
  const rtl = locale === 'ar';
  const { state: sessionState, account } = useSession();
  const { refresh, setActive } = useWorkspace();

  const token = new URLSearchParams(search).get('token') ?? '';

  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(true);
  /* The server's sentence, verbatim. This file writes none of its own. */
  const [refusal, setRefusal] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState<{ organisation: string; already: boolean } | null>(null);

  useEffect(() => {
    if (sessionState === 'checking') return;
    if (!token || sessionState !== 'signed-in') {
      setChecking(false);
      return;
    }
    let live = true;
    void (async () => {
      try {
        const found = await workspaces.preview(token);
        if (live) setPreview(found);
      } catch (e) {
        if (live) setRefusal(e instanceof WorkspaceFailure ? e.message : t.state.offlineHelp);
      } finally {
        if (live) setChecking(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [token, sessionState, t.state.offlineHelp]);

  const join = async (): Promise<void> => {
    setJoining(true);
    setRefusal(null);
    try {
      const result = await workspaces.accept(token);
      await refresh();
      /* Land them inside the workspace they just joined — the one place where
         choosing on the reader's behalf is what they asked for. */
      setActive(result.orgId);
      setJoined({ organisation: result.organisation, already: result.alreadyMember });
    } catch (e) {
      setRefusal(e instanceof WorkspaceFailure ? e.message : t.state.offlineHelp);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="ws ws--invite">
      <section className="shell section section--opening" aria-labelledby="inv-title">
        <h1 id="inv-title">{t.accept.title}</h1>
      </section>

      <div className="shell section">
        <section className="ws__panel plate">
          {!token ? (
            <>
              <h2 className="ws__panel-heading">{t.accept.noToken}</h2>
              <p className="ws__panel-lede">{t.accept.noTokenHelp}</p>
            </>
          ) : sessionState === 'checking' ? (
            <p className="ws__empty">{t.accept.checking}</p>
          ) : /*
               SIGNED OUT IS ANSWERED BEFORE "READING THE INVITATION…", and the
               order is the fix rather than a preference. `checking` starts true
               and the effect that clears it never runs for a signed-out reader —
               it returns early, because there is nobody to preview the invitation
               as. Tested the other way round, the page sat on a loading line
               forever for exactly the reader who most needed the next instruction.
             */
          sessionState !== 'signed-in' || !account ? (
            <>
              <h2 className="ws__panel-heading">{t.accept.signInFirst}</h2>
              <p className="ws__panel-lede">{t.accept.signInWhy}</p>
              <Link to="/sign-in" navigate={navigate} className="button button--primary">
                {t.state.signIn}
              </Link>
            </>
          ) : checking ? (
            <p className="ws__empty">{t.accept.checking}</p>
          ) : joined ? (
            <>
              <h2 className="ws__panel-heading">
                {fill(joined.already ? t.accept.already : t.accept.joined, {
                  organisation: joined.organisation,
                })}
              </h2>
              <Link to="/workspace" navigate={navigate} className="button button--primary">
                {t.accept.continue}
              </Link>
            </>
          ) : preview ? (
            <>
              <h2 className="ws__panel-heading">
                {fill(t.accept.heading, { organisation: preview.organisation })}
              </h2>
              <p className="ws__panel-lede">
                {fill(t.accept.asRole, { role: t.roles[preview.role].name })}
              </p>
              {/* The consent, before the button that gives it. */}
              <p className="ws__prose">{t.accept.lede}</p>
              <p className="ws__note">{t.members.disclosure}</p>
              <button
                type="button"
                className="button button--primary"
                disabled={joining}
                onClick={() => void join()}
              >
                {joining
                  ? t.accept.submitting
                  : fill(t.accept.submit, { organisation: preview.organisation })}
              </button>
              {refusal ? (
                <p className="ws__error" role="alert">
                  {rtl ? (
                    <span dir="ltr" lang="en">
                      {refusal}
                    </span>
                  ) : (
                    refusal
                  )}
                </p>
              ) : null}
            </>
          ) : (
            <>
              {/*
                THE SERVER'S ONE SENTENCE, AND NOTHING ADDED TO IT. Five different
                causes arrive here and the page cannot tell them apart either — see
                the file header for why that is the design and not a limitation.
              */}
              <h2 className="ws__panel-heading">{t.accept.title}</h2>
              <p className="ws__panel-lede" role="alert">
                {refusal ? (
                  rtl ? (
                    <span dir="ltr" lang="en">
                      {refusal}
                    </span>
                  ) : (
                    refusal
                  )
                ) : (
                  t.accept.noTokenHelp
                )}
              </p>
              <p className="ws__note">{t.accept.signInWhy}</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
