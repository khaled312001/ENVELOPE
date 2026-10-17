/**
 * The one Vite import suffix the site's sheet reader uses, for the test typecheck.
 *
 * `apps/web-next/src/lib/sheet-raster.ts` imports pdf.js's worker with `?url`,
 * and its `vite-env.d.ts` gets that from `/// <reference types="vite/client" />`,
 * which does not resolve from `tsconfig.tests.json` at the repository root (see
 * `apps/web/src/vite-env.d.ts` for the same problem, met first). No test reached
 * that module until `apps/web-next/test/sheet-facts.test.tsx` rendered step 0.
 * Declared for this suffix alone, so nothing else compiles against an API the
 * test program does not have.
 */
declare module '*?url' {
  const url: string;
  export default url;
}
