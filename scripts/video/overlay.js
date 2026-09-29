/*
 * THE ON-SCREEN LAYER, INJECTED INTO THE REAL PAGE.
 *
 * ---------------------------------------------------------------------------
 * WHY THE CAPTIONS ARE IN THE PAGE AND NOT ADDED AFTERWARDS.
 *
 * Playwright records the viewport, so anything drawn in the document is in the
 * footage at the moment it was drawn. Burning captions on in post means holding
 * a second timeline — "at 01:42 the podium field is at x=812" — that is correct
 * for exactly one recording and silently wrong for the next, because a run that
 * takes a second longer moves every cue after it. A caption raised by the script
 * that just clicked the field cannot drift from it.
 *
 * It is installed with `addInitScript`, so it survives every navigation in the
 * flow rather than being re-injected at each step and losing its state.
 *
 * ---------------------------------------------------------------------------
 * IT IS DRAWN IN THE PRODUCT'S OWN LANGUAGE.
 *
 * IBM Plex, square corners, the ink and the amber. The one colour rule that
 * matters is the product's own §13.1: AMBER MEANS UNCERTAINTY AND NOTHING ELSE.
 * A caption highlight in amber, or a title card with an amber rule under it
 * because it looked good, would teach a viewer the opposite of what every screen
 * in the footage is teaching them. So amber is available here as `tone: 'assumed'`
 * and is used only where the subject IS an assumption.
 *
 * ---------------------------------------------------------------------------
 * THE PAGE UNDERNEATH IS RTL, AND THAT IS WHY THE RING USES left/top.
 *
 * The recording drives the product in Arabic, so `document.dir` is `rtl` and
 * every logical property in here resolves mirrored — which is right for the chip,
 * the caption rule and the chapter rail, and WRONG for the focus ring, whose
 * coordinates come from `getBoundingClientRect()` and are physical. The ring is
 * therefore positioned with `left`/`top` and nothing else. Reading a rect in
 * physical pixels and writing it back through a logical property put the ring on
 * the opposite side of the screen from the field it was pointing at.
 *
 * ---------------------------------------------------------------------------
 * THE POINTER IS DRAWN BECAUSE THE RECORDING HAS NONE.
 *
 * A screen recording of a browser shows the system cursor; Playwright's video
 * does not, so a viewer sees fields fill themselves and buttons depress with
 * nothing touching them — which reads as a screen-capture of a script, not a
 * demonstration of a product. `pointer()` moves a drawn one and `tap()` rings
 * it, and the recorder calls both immediately before the real click, at the real
 * element's own centre.
 */
(() => {
  if (window.__vid) return;

  const NS = 'vid-overlay';
  const ready = () => document.body || document.documentElement;

  /* ---------------------------------------------------------------- styles */
  function install() {
    if (document.getElementById(NS + '-style')) return;
    const css = document.createElement('style');
    css.id = NS + '-style';
    css.textContent = `
      .${NS} {
        position: fixed; inset: 0; z-index: 2147483000;
        pointer-events: none;
        /* The page already loads Plex Arabic (apps/web/index.html), so the
           caption is set in the product's own face rather than in whatever the
           system falls back to, which on this host is a different typeface
           entirely and reads as a subtitle burned on by someone else.
           NO BACKTICKS ANYWHERE IN THIS BLOCK, INCLUDING IN THE COMMENTS: it is
           one template literal, so a backtick in a comment ends the stylesheet
           mid-rule and the whole module stops parsing. That happened twice while
           this was being written, and both times the recorder went on reporting
           every caption it had asked for, because the report is Node's console
           and the caption is the page's. See assertOverlay in record.mjs. */
        font-family: 'IBM Plex Sans Arabic', 'IBM Plex Sans', system-ui, sans-serif;
      }
      .${NS} * { box-sizing: border-box; }

      /* --- the title card ------------------------------------------------ */
      .${NS}__card {
        position: absolute; inset: 0;
        display: flex; flex-direction: column; gap: 1.25rem;
        align-items: center; justify-content: center;
        background: #14161c; color: #f4f5f7;
        opacity: 0; transition: opacity 520ms cubic-bezier(.4,0,.2,1);
        text-align: center; padding: 4rem;
      }
      .${NS}__card[data-on='1'] { opacity: 1; }
      .${NS}__card h1 {
        margin: 0; font-size: 4rem; font-weight: 300; line-height: 1.15;
        letter-spacing: -0.02em; max-width: 26ch;
      }
      .${NS}__card p {
        margin: 0; font-size: 1.5rem; font-weight: 300; line-height: 1.55;
        color: #b9bcc4; max-width: 48ch;
      }
      .${NS}__rule {
        inline-size: 6rem; block-size: 2px; background: #4f8bf5;
        transform: scaleX(0); transform-origin: center;
        transition: transform 620ms cubic-bezier(.16,1,.3,1) 160ms;
      }
      .${NS}__card[data-on='1'] .${NS}__rule { transform: scaleX(1); }
      .${NS}__card[data-tone='assumed'] .${NS}__rule { background: #f0b45c; }
      .${NS}__card[data-tone='refusal'] .${NS}__rule { background: #e0705f; }

      /* --- the chapter rail, along the top -------------------------------- */
      .${NS}__rail {
        position: absolute; inset-block-start: 0; inset-inline: 0;
        display: flex; gap: 2px; padding: 0;
        opacity: 0; transition: opacity 320ms ease;
      }
      .${NS}__rail[data-on='1'] { opacity: 1; }
      .${NS}__rail i {
        display: block; flex: 1; block-size: 3px; background: rgba(244,245,247,.18);
      }
      .${NS}__rail i[data-done='1'] { background: #4f8bf5; }
      .${NS}__rail i[data-now='1'] { background: #4f8bf5; box-shadow: 0 0 10px #4f8bf5; }

      /* --- the step chip -------------------------------------------------- */
      .${NS}__chip {
        position: absolute; inset-block-start: 1.6rem; inset-inline-start: 1.6rem;
        display: inline-flex; align-items: center; gap: .6rem;
        padding: .5rem .9rem;
        background: #14161c; color: #f4f5f7;
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: .95rem; letter-spacing: .06em;
        opacity: 0; transform: translateY(-6px);
        transition: opacity 320ms cubic-bezier(.4,0,.2,1), transform 320ms cubic-bezier(.4,0,.2,1);
      }
      .${NS}__chip[data-on='1'] { opacity: 1; transform: none; }

      /* --- the caption bar ------------------------------------------------ */
      .${NS}__cap {
        position: absolute; inset-inline: 0; inset-block-end: 0;
        padding: 1.6rem 3rem 2rem;
        background: linear-gradient(to top, rgba(20,22,28,.97) 60%, rgba(20,22,28,0));
        color: #f4f5f7;
        opacity: 0; transform: translateY(12px);
        transition: opacity 360ms cubic-bezier(.4,0,.2,1), transform 360ms cubic-bezier(.4,0,.2,1);
      }
      .${NS}__cap[data-on='1'] { opacity: 1; transform: none; }
      .${NS}__cap-in {
        /* 62rem, not 78: at 78 a body line ran 1,227px across a 1080p frame in
           one unbroken line, which is a measure nobody reads at a glance. Two
           shorter lines are read; one long one is skimmed. */
        max-width: 62rem; margin-inline: auto;
        display: flex; flex-direction: column; gap: .5rem;
        border-inline-start: 3px solid #4f8bf5; padding-inline-start: 1.1rem;
      }
      .${NS}__cap[data-tone='assumed'] .${NS}__cap-in { border-inline-start-color: #f0b45c; }
      .${NS}__cap[data-tone='refusal'] .${NS}__cap-in { border-inline-start-color: #e0705f; }
      .${NS}__cap h2 {
        margin: 0; font-size: 1.95rem; font-weight: 400; line-height: 1.35;
      }
      .${NS}__cap p {
        margin: 0; font-size: 1.28rem; font-weight: 300; line-height: 1.6;
        color: #cdd0d7;
      }

      /* --- the figure pulled out of the page ------------------------------- */
      .${NS}__fig {
        position: absolute; inset-block-end: 12rem; inset-inline-end: 3rem;
        display: flex; flex-direction: column; gap: .3rem; align-items: flex-end;
        padding: 1rem 1.4rem;
        background: #14161c; color: #f4f5f7;
        /* inline-START, like the caption's rule: both accents then sit on the
           side the reading starts from, which in this footage is the right. */
        border-inline-start: 3px solid #4f8bf5;
        opacity: 0; transform: translateY(10px);
        transition: opacity 360ms cubic-bezier(.4,0,.2,1), transform 360ms cubic-bezier(.4,0,.2,1);
      }
      .${NS}__fig[data-on='1'] { opacity: 1; transform: none; }
      .${NS}__fig[data-tone='assumed'] { border-inline-start-color: #f0b45c; }
      .${NS}__fig b {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 2.6rem; font-weight: 500; line-height: 1; letter-spacing: -0.01em;
        direction: ltr;
      }
      .${NS}__fig span { font-size: 1.05rem; font-weight: 300; color: #b9bcc4; }

      /* --- the focus ring. left/top, never logical. See the note above. ---- */
      .${NS}__ring {
        position: absolute; border: 2px solid #4f8bf5;
        opacity: 0;
        transition: opacity 260ms ease, left 420ms cubic-bezier(.4,0,.2,1),
                    top 420ms cubic-bezier(.4,0,.2,1), width 420ms cubic-bezier(.4,0,.2,1),
                    height 420ms cubic-bezier(.4,0,.2,1);
        box-shadow: 0 0 0 9999px rgba(20,22,28,.45);
      }
      .${NS}__ring[data-on='1'] { opacity: 1; }
      .${NS}__ring[data-tone='assumed'] { border-color: #f0b45c; }
      .${NS}__ring[data-tone='refusal'] { border-color: #e0705f; }

      /* --- the stamp, for a refusal ---------------------------------------- */
      .${NS}__stamp {
        position: absolute; inset-block-start: 1.6rem; inset-inline-end: 1.6rem;
        padding: .55rem 1rem; border: 2px solid #e0705f; color: #e0705f;
        background: rgba(20,22,28,.9);
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: .9rem; letter-spacing: .08em; text-transform: uppercase;
        opacity: 0; transform: scale(.96);
        transition: opacity 320ms ease, transform 320ms cubic-bezier(.16,1,.3,1);
      }
      .${NS}__stamp[data-on='1'] { opacity: 1; transform: none; }

      /* --- the drawn pointer, and the ring a click leaves ------------------- */
      .${NS}__ptr {
        position: absolute; inline-size: 22px; block-size: 22px;
        margin-left: -2px; margin-top: -2px;
        opacity: 0;
        transition: opacity 240ms ease, left 620ms cubic-bezier(.33,1,.68,1),
                    top 620ms cubic-bezier(.33,1,.68,1);
      }
      .${NS}__ptr[data-on='1'] { opacity: 1; }
      .${NS}__ptr svg { display: block; filter: drop-shadow(0 1px 2px rgba(0,0,0,.55)); }
      .${NS}__tap {
        position: absolute; inline-size: 14px; block-size: 14px;
        margin-left: -7px; margin-top: -7px;
        border: 2px solid #4f8bf5; border-radius: 50%;
        opacity: 0;
      }
      .${NS}__tap[data-on='1'] { animation: ${NS}-tap 620ms cubic-bezier(.16,1,.3,1); }
      @keyframes ${NS}-tap {
        0%   { opacity: 1; transform: scale(.4); }
        100% { opacity: 0; transform: scale(3.4); }
      }
    `;
    document.head.appendChild(css);

    const root = document.createElement('div');
    root.className = NS;
    root.id = NS;
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="${NS}__ring" data-on="0"></div>
      <div class="${NS}__rail" data-on="0"></div>
      <div class="${NS}__chip" data-on="0"></div>
      <div class="${NS}__stamp" data-on="0"></div>
      <div class="${NS}__fig" data-on="0" dir="rtl" lang="ar"><b></b><span></span></div>
      <div class="${NS}__cap" data-on="0" dir="rtl" lang="ar">
        <div class="${NS}__cap-in"><h2></h2><p></p></div>
      </div>
      <div class="${NS}__tap" data-on="0"></div>
      <div class="${NS}__ptr" data-on="0">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M2 1.6 L2 17.4 L6.3 13.4 L9 19.8 L11.7 18.6 L9.1 12.4 L15 12.2 Z"
                fill="#f4f5f7" stroke="#14161c" stroke-width="1.3" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="${NS}__card" data-on="0" dir="rtl" lang="ar">
        <div class="${NS}__rule"></div><h1></h1><p></p>
      </div>
    `;
    ready().appendChild(root);
  }

  const q = (s) => document.querySelector(`#${NS} ${s}`);
  const on = (el, v) => el && el.setAttribute('data-on', v ? '1' : '0');

  window.__vid = {
    install,

    /** A full-screen card. `tone` recolours the rule that draws itself under it. */
    title(main, sub, tone) {
      install();
      const c = q(`.${NS}__card`);
      c.querySelector('h1').textContent = main;
      c.querySelector('p').textContent = sub || '';
      c.setAttribute('data-tone', tone || 'accent');
      on(c, true);
    },
    untitle() {
      install();
      on(q(`.${NS}__card`), false);
    },

    /** The persistent step marker. */
    chip(text) {
      install();
      const c = q(`.${NS}__chip`);
      if (!text) return on(c, false);
      c.textContent = text;
      on(c, true);
    },

    /** Ten ticks along the top: where in the flow the viewer is. */
    rail(now, total) {
      install();
      const r = q(`.${NS}__rail`);
      if (now == null) return on(r, false);
      if (r.children.length !== total) {
        r.innerHTML = Array.from({ length: total }, () => '<i></i>').join('');
      }
      [...r.children].forEach((el, i) => {
        el.setAttribute('data-done', i < now ? '1' : '0');
        el.setAttribute('data-now', i === now ? '1' : '0');
      });
      on(r, true);
    },

    /** The caption bar. */
    caption(head, body, tone) {
      install();
      const c = q(`.${NS}__cap`);
      c.querySelector('h2').textContent = head;
      c.querySelector('p').textContent = body || '';
      c.setAttribute('data-tone', tone || 'accent');
      on(c, true);
    },
    uncaption() {
      install();
      on(q(`.${NS}__cap`), false);
    },

    /**
     * A figure lifted out of the page and shown large. The recorder reads the
     * text off the real element and passes it here; nothing is typed.
     */
    figure(value, label, tone) {
      install();
      const f = q(`.${NS}__fig`);
      if (!value) return on(f, false);
      f.querySelector('b').textContent = value;
      f.querySelector('span').textContent = label || '';
      f.setAttribute('data-tone', tone || 'accent');
      on(f, true);
    },

    /** A ring around a real element, dimming everything else. */
    focus(selector, tone) {
      install();
      const el = document.querySelector(selector);
      const r = q(`.${NS}__ring`);
      if (!el) return on(r, false);
      const b = el.getBoundingClientRect();
      if (!b.width && !b.height) return on(r, false);
      const pad = 8;
      r.style.left = `${b.left - pad}px`;
      r.style.top = `${b.top - pad}px`;
      r.style.width = `${b.width + pad * 2}px`;
      r.style.height = `${b.height + pad * 2}px`;
      r.setAttribute('data-tone', tone || 'accent');
      on(r, true);
    },
    unfocus() {
      install();
      on(q(`.${NS}__ring`), false);
    },

    /** The stamp — used only for what the product refuses to claim. */
    stamp(text) {
      install();
      const s = q(`.${NS}__stamp`);
      if (!text) return on(s, false);
      s.textContent = text;
      on(s, true);
    },

    /** Move the drawn pointer. Physical pixels, like the ring. */
    pointer(x, y) {
      install();
      const p = q(`.${NS}__ptr`);
      if (x == null) return on(p, false);
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      on(p, true);
    },

    /** The ring a click leaves behind, at the point the click lands. */
    tap(x, y) {
      install();
      const t = q(`.${NS}__tap`);
      t.style.left = `${x}px`;
      t.style.top = `${y}px`;
      on(t, false);
      void t.offsetWidth; /* restart the animation */
      on(t, true);
    },

    clear() {
      install();
      this.uncaption();
      this.unfocus();
      this.chip(null);
      this.stamp(null);
      this.figure(null);
      this.rail(null);
      this.pointer(null);
      this.untitle();
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
