import { MessageCircleQuestion, Plus } from 'lucide-react';

import { useLocale } from '../../lib/locale.js';
import { Link } from '../../lib/nav.js';
import FAQ from '../../site/faq.json';
import { Band, PageHero, SitePage, useSite } from '../../site/Site.js';
import { Item, Stagger } from '../../ui/motion.js';

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
      <PageHero icon={MessageCircleQuestion} tone="violet" crumb={s.nav.faq} eyebrow={s.faq.eyebrow} title={s.faq.title} lede={s.faq.lede} />
      <Band glow="violet">
        <Stagger className="mx-auto grid max-w-3xl gap-3" gap={0.04}>
          {items.map((q, i) => (
            <Item key={q.q}>
              <details className="group rounded-xl border border-line bg-panel shadow-soft transition-colors open:border-strong" {...(i === 0 ? { open: true } : {})}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 text-[15.5px] font-medium text-fg [&::-webkit-details-marker]:hidden">
                  {q.q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-secondary transition-transform duration-300 group-open:rotate-45 group-open:border-accent group-open:text-accent">
                    <Plus className="size-4" aria-hidden="true" />
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[14px] leading-relaxed text-secondary">{q.a}</p>
              </details>
            </Item>
          ))}
        </Stagger>
        <p className="mx-auto mt-8 max-w-3xl text-[13.5px] text-secondary">
          {s.faq.more}{' '}
          <Link to="/method" className="font-medium text-accent hover:underline">
            {s.nav.method}
          </Link>
          {' · '}
          <Link to="/limits" className="font-medium text-accent hover:underline">
            {s.footer.limits}
          </Link>
        </p>
      </Band>
    </SitePage>
  );
}
