import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import Root from './Root.js';
import { LocaleProvider } from './i18n/locale.js';
import { SessionProvider } from './session.js';
import { WorkspaceProvider } from './workspace.js';

/*
 * STYLESHEET ORDER IS LOAD-BEARING, AND NO PAGE AGENT EVER EDITS THIS FILE TO GET
 * ITS CSS LOADED.
 *
 * `tokens.css` first: everything below reads from it, and a custom property has to
 * be declared before the rule that reads it is evaluated at computed-value time.
 *
 * `site.css` second, because it is the chassis — the shared shell, the rail, the
 * section rhythm and the one state layer. Everything after it may override it, and
 * that ordering is deliberate: the engine's own sheet and the page sheets are the
 * specific cases, and the chassis is the general one.
 *
 * `app.css` then `provenance.css`: the provenance treatments must come after the
 * engine's components so that `.traced--assumed`'s hover, which is the same
 * specificity as the generic `.traced` hover, wins on source order. Written the
 * other way round, hovering an assumed value would silently delete the amber
 * ground and nothing would catch it.
 *
 * Then the page stylesheets, one per route, in route order. Each declares only
 * its own class prefix and never a chassis rule.
 */
import './styles/tokens.css';
import './styles/site.css';
import './styles/app.css';
/* After `app.css` on purpose: the sheet's rules are additions to the plot figure
   that file already defines, not a replacement for it. Nothing here DEPENDS on the
   order — the one rule that could have, the legend swatch, wins on specificity
   instead — but the reading order should match the layering. */
import './styles/drawing.css';
import './styles/provenance.css';
import './styles/landing.css';
import './styles/parking-page.css';
import './styles/exports-page.css';
import './styles/refusals.css';
import './styles/readiness.css';
import './styles/not-found.css';
import './styles/work.css';
import './styles/antechamber.css';
import './styles/workspace.css';
/* Last, and it is the only sheet whose position matters: it turns 235 logical
   properties into a right-to-left layout and overrides the Latin font stack for
   Arabic, so anything it touches has to already be defined. */
import './styles/rtl.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

createRoot(root).render(
  <StrictMode>
    <LocaleProvider>
      <SessionProvider>
        {/* Inside the session: a workspace belongs to an account, and this asks
            the server for the account's memberships as soon as there is one. */}
        <WorkspaceProvider>
          <Root />
        </WorkspaceProvider>
      </SessionProvider>
    </LocaleProvider>
  </StrictMode>,
);
