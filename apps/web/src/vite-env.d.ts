/**
 * The one Vite runtime API this application uses, declared here rather than
 * referenced from `vite/client`.
 *
 * `/// <reference types="vite/client" />` is the usual line and it resolves fine
 * from `apps/web`, where Vite is a dependency. It does NOT resolve from
 * `tsconfig.tests.json`, which sits at the repository root — and the test config
 * typechecks `apps/web/src` transitively, so the reference version produced an
 * error in a config that has nothing to do with the cause. `CLAUDE.md` records
 * why that config exists at all: test files sit outside every package's
 * `rootDir`, so for a long time nothing typechecked them.
 *
 * So this declares the single member `src/img.tsx` reads, with the two options it
 * passes. Narrower than `vite/client` on purpose: a declaration that promised the
 * whole API would let a future call compile against something this build does not
 * actually configure.
 */

/**
 * A worker Vite bundles as its own entry, imported for the url it was emitted
 * at. `PlotMap` hands this to maplibre's `setWorkerUrl`, because maplibre's own
 * guess — a sibling file next to itself — does not survive bundling.
 *
 * Declared for exactly this suffix rather than for `?worker` or `?url` alone, so
 * the two other forms stay unavailable until something needs one.
 */
declare module '*?worker&url' {
  const url: string;
  export default url;
}

interface ImportMeta {
  /**
   * Vite's build-time directory read. Eager with `query: '?url'` and
   * `import: 'default'` returns a record of served paths, keyed by the source
   * path relative to the importing module.
   */
  glob(
    pattern: string,
    options: { eager: true; query: '?url'; import: 'default' },
  ): Record<string, string>;
}
