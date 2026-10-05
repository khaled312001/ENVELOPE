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
/* THE 2026 LANGUAGE, straight after the tokens and BEFORE the old chassis.
   Before, not after, because it declares its own `m*` prefix and never competes
   for a chassis selector — so the one thing its position decides is that the
   custom properties it adds (the display scale, the gradients, the glass) are
   defined by the time anything reads them. A property read before it is
   declared is invalid at computed-value time, which is silent. */
import './styles/modern.css';
import './styles/site.css';
/* Straight after the chassis, because it ADDS to the chrome's own link rules
   rather than replacing them — the nav's underline and press are `site.css`'s
   and stay its; this puts the mark beside the label and gives a panel a way to
   answer the pointer. Anything that must win over it is a page stylesheet, and
   every one of those is imported below. */
import './styles/marks.css';
import './styles/app.css';
/* After `app.css` on purpose: the sheet's rules are additions to the plot figure
   that file already defines, not a replacement for it. Nothing here DEPENDS on the
   order — the one rule that could have, the legend swatch, wins on specificity
   instead — but the reading order should match the layering. */
import './styles/drawing.css';
import './styles/drawn.css';
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
/* The 2026 shell. After every page stylesheet because it RESTYLES `.nav` and
   `.colophon` rather than defining a second shell, so its position is the whole
   of how it wins — and before `rtl.css`, which must stay last. */
import './styles/chrome.css';
/* The console: sign-in, the sidebar and the signed-in plates. Same argument as
   `chrome.css` and after it, because the auth card's submit is the nav's primary
   button and the later sheet is the one that may finish the sentence. */
import './styles/console.css';
/* The plot tracer's own surface. After `app.css`, because the map sits inside a
   `.panel` in step 1 and overrides that panel's padding for a full-bleed canvas;
   before `rtl.css`, like everything else. The canvas's own ink is NOT here — a
   WebGL paint cannot read a custom property, so `PlotMap` reads the semantic
   tokens off the document element and hands maplibre the computed strings. */
import './styles/map.css';
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
