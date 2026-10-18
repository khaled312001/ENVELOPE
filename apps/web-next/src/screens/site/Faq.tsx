import { Plus } from 'lucide-react';

import { useLocale } from '../../lib/locale.js';
import { Link } from '../../lib/nav.js';
import FAQ from '../../site/faq.json';
import { Band, PageHero, SitePage, useSite } from '../../site/Site.js';

/*
  THE QUESTIONS. `faq.json` is read here and by the prerender, which writes the
  same entries as the page's FAQPage structured data — one source, so a search
  result can never quote an answer the page does not give.

  `<details>`, not a script-driven accordion: every answer is in the document
  whether or not JavaScript runs, opens with the keyboard, and prints.
*/
export function Faq(): JSX.Element {
  const s = useSite();
  const { locale } = useLocale();
  const items = FAQ[locale];
  return (
    <SitePage path="/faq">
      <PageHero crumb={s.nav.faq} title={s.faq.title} lede={s.faq.lede} />
      <Band tinted>
        <ul className="mx-auto max-w-3xl border-t border-line">
          {items.map((q, i) => (
            <li key={q.q} className="border-b border-line">
              <details className="group" {...(i === 0 ? { open: true } : {})}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-5 text-[16px] font-semibold text-fg [&::-webkit-details-marker]:hidden">
                  {q.q}
                  <Plus className="mt-1 size-4 shrink-0 text-secondary transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="pb-6 text-[15px] leading-relaxed text-secondary">{q.a}</p>
              </details>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-8 max-w-3xl text-[14px] text-secondary">
          {s.faq.more}{' '}
          <Link to="/method" className="font-medium text-accent underline-offset-4 hover:underline">
            {s.nav.method}
          </Link>
          {locale === 'ar' ? '، ' : ', '}
          <Link to="/limits" className="font-medium text-accent underline-offset-4 hover:underline">
            {s.footer.limits}
          </Link>
        </p>
      </Band>
    </SitePage>
  );
}
