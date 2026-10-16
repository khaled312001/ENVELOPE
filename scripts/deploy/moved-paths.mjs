import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
  MOVED PATHS, ONE LIST.

  `build.mjs` writes these into `.htaccess` as real 301s and `smoke-next.mjs`
  asks the deployment for each. Two copies would agree the day they were
  written and part the first time a page moved, and the smoke would then go on
  passing over the paths it still knew.

  The base is the classic router's own `redirects.json`, so the server and that
  application cannot disagree about where a moved path went.
*/
export function movedPaths(root) {
  const redirects = JSON.parse(readFileSync(join(root, 'apps', 'web', 'src', 'redirects.json'), 'utf8'));
  // The classic site's "what it refuses" is this site's "what it does not do".
  redirects['/refusals'] = '/limits';
  /*
    THE CLASSIC STUDIO'S DOORS LEAD INTO THIS ONE. The owner, 14 Oct 2026: nothing
    of the old site is to be seen. Its engine, its studies, its sign-in and its
    readiness page each have a page here now, so their addresses — bookmarked,
    shared, printed in an old report — land on it rather than on the previous
    front end. What is left on the classic shell (settings, workspace, an
    invitation link) has no page here yet and is linked from nowhere on this site.
  */
  Object.assign(redirects, {
    '/app': '/studio',
    '/work': '/studies',
    '/sign-in': '/enter',
    '/sign-up': '/enter?mode=up',
    '/readiness': '/limits',
    '/dashboard': '/limits',
  });
  return redirects;
}
