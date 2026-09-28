# Where the twenty-five images go

Drop the files here, named exactly as `docs/06-plan/image-prompts.md` names them —
`auth-panel.png`, `lp-capacities.svg`, `step-4-assumptions.svg`, and so on. A dark
variant is the same name with `-dark` before the extension.

**Nothing else needs editing.** `src/img.tsx` reads this directory with
`import.meta.glob` at build time, so a file that is here is used and a file that is
not here is silently absent — no element, no request, no 404 in the console. There
is no manifest to keep in step with the directory, which is deliberate: a list and a
directory are two records of one fact, and the list is the one that drifts.

`og-cover.png` is the single exception and belongs in `apps/web/public/` instead,
because a `<meta property="og:image">` needs a stable unhashed URL that a link
scraper can fetch without running the application.

The five hard rules in `image-prompts.md` are rejection criteria, not preferences.
Two of them are worth repeating here because they are the ones a generator breaks
without being asked to:

- **No legible digits, anywhere.** A decorative fake figure in an illustration is
  the same defect as a fake figure in a report.
- **No amber, orange or yellow**, except in `step-4-assumptions.svg` where amber is
  the subject. Amber means `ASSUMED` and nothing else, in the UI, the drawings, the
  3D model and the `.glb` palette.
