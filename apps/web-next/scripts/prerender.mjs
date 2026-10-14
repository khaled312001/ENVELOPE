/**
 * THE HEADS, WRITTEN AT BUILD TIME.
 *
 * A search engine may run the page's JavaScript; a link preview in WhatsApp,
 * LinkedIn or Slack never does. So every public route gets its own
 * `index.html` here — the same shell, with that page's title, description,
 * canonical address, `hreflang` pair, Open Graph card and structured data
 * already in the head. The words come from `src/site/seo.json` and
 * `src/site/faq.json`, which the pages themselves read, so the head a crawler
 * sees and the head the running page keeps can never say different things.
 *
 * Also written:
 *   app.html     the shell for every working screen (studio, studies, sign-in):
 *                `noindex`, because a study is somebody's work, not a page.
 *   sitemap.xml  every public page in both languages, each with its pair.
 *   robots.txt   for the site root; the deploy copies it there.
 *
 *   node scripts/prerender.mjs        (run by `pnpm build`, after vite)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SEO = JSON.parse(readFileSync(join(ROOT, 'src', 'site', 'seo.json'), 'utf8'));
const FAQ = JSON.parse(readFileSync(join(ROOT, 'src', 'site', 'faq.json'), 'utf8'));
const shell = readFileSync(join(DIST, 'index.html'), 'utf8');

const LOCALES = ['en', 'ar'];
const local = (path, locale) => (locale === 'ar' ? (path === '/' ? '/ar' : `/ar${path}`) : path);
const url = (path, locale) => {
  const l = local(path, locale);
  return SEO.origin + SEO.base + (l === '/' ? '/' : l);
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Inside <script>, only `<` can end the block early; JSON escapes it without changing the value.
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

function structured(page, locale) {
  const words = page[locale];
  const home = SEO.pages.find((p) => p.path === '/')[locale];
  const org = { '@type': 'Organization', '@id': `${SEO.origin}${SEO.base}/#org`, name: SEO.siteName, url: url('/', 'en') };
  if (page.path === '/') {
    return [
      {
        '@context': 'https://schema.org',
        '@graph': [
          org,
          { '@type': 'WebSite', '@id': `${SEO.origin}${SEO.base}/#site`, name: SEO.siteName, url: url('/', locale), inLanguage: locale, publisher: { '@id': org['@id'] } },
          {
            // No price, no rating, no review: none exists, and a structured-data field is still a claim.
            '@type': 'SoftwareApplication',
            name: SEO.siteName,
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            url: url('/', locale),
            description: words.description,
            inLanguage: ['en', 'ar'],
            publisher: { '@id': org['@id'] },
          },
        ],
      },
    ];
  }
  const blocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: home.title.split(' — ')[0], item: url('/', locale) },
        { '@type': 'ListItem', position: 2, name: words.title.split(' — ')[0], item: url(page.path, locale) },
      ],
    },
  ];
  if (page.path === '/faq') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: locale,
      mainEntity: FAQ[locale].map((q) => ({ '@type': 'Question', name: q.q, acceptedAnswer: { '@type': 'Answer', text: q.a } })),
    });
  }
  return blocks;
}

function head({ title, description, robots, canonical, alternates, locale, og, blocks }) {
  return [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    canonical ? `<link rel="canonical" href="${canonical}" />` : '',
    ...(alternates ?? []).map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}" />`),
    og
      ? [
          `<meta property="og:type" content="website" />`,
          `<meta property="og:site_name" content="${SEO.siteName}" />`,
          `<meta property="og:title" content="${esc(title)}" />`,
          `<meta property="og:description" content="${esc(description)}" />`,
          `<meta property="og:url" content="${canonical}" />`,
          `<meta property="og:image" content="${SEO.origin}${SEO.image}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:locale" content="${locale === 'ar' ? 'ar_AE' : 'en_GB'}" />`,
          `<meta property="og:locale:alternate" content="${locale === 'ar' ? 'en_GB' : 'ar_AE'}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${esc(title)}" />`,
          `<meta name="twitter:description" content="${esc(description)}" />`,
          `<meta name="twitter:image" content="${SEO.origin}${SEO.image}" />`,
        ].join('\n    ')
      : '',
    ...(blocks ?? []).map(ld),
  ]
    .filter(Boolean)
    .join('\n    ');
}

function page(locale, tags) {
  const html = shell
    .replace(/<html lang="[^"]*" dir="[^"]*">/, `<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}">`)
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, '')
    .replace('</head>', `  ${tags}\n  </head>`);
  if (html === shell || !html.includes(tags)) throw new Error('the shell did not take the head: index.html changed shape');
  return html;
}

const written = [];
for (const p of SEO.pages) {
  for (const locale of LOCALES) {
    const words = p[locale];
    const tags = head({
      title: words.title,
      description: words.description,
      robots: 'index, follow',
      canonical: url(p.path, locale),
      alternates: [
        ['en', url(p.path, 'en')],
        ['ar', url(p.path, 'ar')],
        ['x-default', url(p.path, 'en')],
      ],
      locale,
      og: true,
      blocks: structured(p, locale),
    });
    const rel = local(p.path, locale);
    const file = rel === '/' ? join(DIST, 'index.html') : join(DIST, ...rel.split('/').filter(Boolean), 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, page(locale, tags));
    written.push(rel);
  }
}

// The working screens' shell. English and left-to-right until the module reads the address.
const home = SEO.pages.find((p) => p.path === '/').en;
writeFileSync(join(DIST, 'app.html'), page('en', head({ title: SEO.siteName, description: home.description, robots: 'noindex, nofollow' })));

const today = new Date().toISOString().slice(0, 10);
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${SEO.pages
  .flatMap((p) =>
    LOCALES.map(
      (locale) => `  <url>
    <loc>${url(p.path, locale)}</loc>
    <lastmod>${today}</lastmod>
    <priority>${p.priority}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${url(p.path, 'en')}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${url(p.path, 'ar')}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${url(p.path, 'en')}" />
  </url>`,
    ),
  )
  .join('\n')}
</urlset>
`,
);

writeFileSync(
  join(DIST, 'robots.txt'),
  `# Plotlogic. Generated by apps/web-next/scripts/prerender.mjs.
User-agent: *
Allow: /
# The engine, and the screens that hold somebody's work — this site's and the classic studio's.
Disallow: /api/
Disallow: /studio
Disallow: /studies
Disallow: /enter
Disallow: /ar/studio
Disallow: /ar/studies
Disallow: /ar/enter
Disallow: /app
Disallow: /work
Disallow: /settings
Disallow: /workspace
Disallow: /accept-invite

Sitemap: ${SEO.origin}${SEO.base}/sitemap.xml
`,
);

console.log(`prerendered ${written.length} pages (${written.join(' ')}), app.html, sitemap.xml, robots.txt`);
