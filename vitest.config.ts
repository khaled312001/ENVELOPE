import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const pkg = (name: string) =>
  new URL(`./packages/${name}/src/index.ts`, import.meta.url).pathname;

export default defineConfig({
  // The web screens are rendered in a test (`apps/web/test`), so JSX has to
  // transform. Everything else in the suite is plain TypeScript and unaffected.
  plugins: [react()],
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: false,
    // Several suites build a whole run, or load pdfjs, once in `beforeAll`. Alone
    // that takes 2–4 s; with 35 files collecting in parallel it passed 10 s, and the
    // suite failed on how busy the laptop was rather than on anything it tests.
    // Per-test timeouts stay at the default — only the one-off setup is allowed longer.
    hookTimeout: 60_000,
    server: {
      deps: {
        // `node:sqlite` shipped in Node 22.5 and is not yet in Vite's builtin
        // list, so Vite strips the `node:` prefix and then fails to resolve a
        // bare `sqlite`. Marking it external hands it back to Node's resolver.
        external: [/node:sqlite/],
      },
    },
  },
  resolve: {
    alias: {
      '@envelope/core': pkg('core'),
      '@envelope/geometry': pkg('geometry'),
      '@envelope/rules': pkg('rules'),
      '@envelope/capacity': pkg('capacity'),
      '@envelope/invariants': pkg('invariants'),
      '@envelope/validation': pkg('validation'),
      '@envelope/report': pkg('report'),
      '@envelope/intake': pkg('intake'),
      '@envelope/exports': pkg('exports'),
      '@envelope/sheets': pkg('sheets'),
    },
  },
});
