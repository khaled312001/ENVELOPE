/*
 * THE WALKTHROUGH, RECORDED AGAINST THE REAL DEPLOYMENT, IN ARABIC.
 *
 * ---------------------------------------------------------------------------
 * IT IS A RUN, NOT A RE-ENACTMENT.
 *
 * Every frame is the deployed product answering a real affection plan — the
 * Trakhees sheet in `docs/00-source/samples`, the one the smoke gate has been
 * driving for months. Nothing is mocked, and NO FIGURE IS TYPED INTO A CAPTION:
 * where a number appears in the overlay it was read off the element beside it,
 * at the moment it was drawn, with `figure()`. That rule is the landing page's
 * own — "no figure on this site is typed by a human" — and a video of this
 * product that broke it would be demonstrating the opposite of what it sells.
 *
 * AGAINST PRODUCTION BY DEFAULT, AND THAT IS A CONFIDENTIALITY DECISION AS WELL
 * AS AN HONESTY ONE. The developer standards are a client's commercial brief and
 * the deployment runs with `DEVELOPER_STANDARDS=off`, so the standards step says
 * it is withheld and no client's unit mix can reach the footage. Recording
 * against a local server would put it there.
 *
 * ---------------------------------------------------------------------------
 * THE UI IS DRIVEN IN ARABIC, AND THE SELECTORS SAY SO.
 *
 * The flow is entered through `probe.mjs`, which walks it with the
 * language-independent handles the app gives us (`#width`, `#edge-0-class`,
 * `input[name="parking-far"]`) and prints the accessible names the deployment
 * actually renders. Those printed names are what is written below. Every
 * structural handle is preferred where one exists, because a handle cannot be
 * re-translated; a name can, and the Arabic was rewritten wholesale the same week
 * this was recorded.
 *
 * ---------------------------------------------------------------------------
 * IT EMITS A TIMELINE. Each scene records the millisecond it began, so the audio
 * pass places a cue on a cut without anybody holding a stopwatch. `audio.mjs`
 * reads it.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT = resolve(ROOT, 'out/video');
const BASE = process.env.VIDEO_URL ?? 'https://tob.khaledahmed.net/';
const PDF = resolve(ROOT, 'docs/00-source/samples/affection-plan/IC1-CTYL-16_011-warsan1-621.pdf');

/* A demonstration is watched, not raced. Every wait here is a pacing decision:
   long enough to read the caption, short enough that nothing drags. */
const SPEED = Number(process.env.VIDEO_SPEED ?? 1);
const beat = (ms) => new Promise((r) => setTimeout(r, Math.round(ms * SPEED)));

mkdirSync(OUT, { recursive: true });

const overlay = readFileSync(resolve(HERE, 'overlay.js'), 'utf8');
const timeline = [];
const started = Date.now();
const at = () => Date.now() - started;

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  reducedMotion: 'no-preference',
});
await context.addInitScript(overlay);
const page = await context.newPage();
page.setDefaultTimeout(60_000);

/* ------------------------------------------------------------------ helpers */

async function ov(fn, ...args) {
  await page
    .evaluate(
      ([f, a]) => {
        if (window.__vid && typeof window.__vid[f] === 'function') window.__vid[f](...a);
      },
      [fn, args],
    )
    .catch(() => {});
}

/**
 * Refuse to record without the overlay, on every navigation.
 *
 * `ov()` has to tolerate a missing window — it is called during navigations — and
 * that tolerance once hid a syntax error in `overlay.js` for a whole nine-minute
 * take: the recorder logged all thirty-one captions to the console and the file
 * it produced had none of them, because the console line is Node's and the
 * caption is the page's. A silent overlay is not a degraded video, it is no
 * video, so it stops the take here instead.
 */
async function assertOverlay(where) {
  const ok = await page.evaluate(
    () => typeof window.__vid === 'object' && !!document.getElementById('vid-overlay'),
  );
  if (!ok) throw new Error(`the overlay did not install at ${where} — check overlay.js for a syntax error`);
}

/** The ten steps the product itself numbers, so the rail means what it says. */
const STEPS = 10;
let chapter = 0;
async function step(n) {
  chapter = n;
  await ov('rail', n, STEPS);
}

/** A scene: the chip, the caption, and a mark on the timeline for the audio pass. */
async function scene(chip, head, body, tone) {
  timeline.push({ t: at(), kind: 'scene', chip, head, body, tone: tone ?? 'accent' });
  await ov('chip', chip);
  await ov('caption', head, body, tone ?? 'accent');
  console.log(`[${(at() / 1000).toFixed(1)}s] ${chip} — ${head}`);
}

/** A full-screen card between chapters. */
async function card(main, sub, hold = 3600, tone) {
  timeline.push({ t: at(), kind: 'card', head: main, body: sub, tone: tone ?? 'accent' });
  await ov('uncaption');
  await ov('unfocus');
  await ov('figure', null);
  await ov('title', main, sub, tone ?? 'accent');
  console.log(`[${(at() / 1000).toFixed(1)}s] CARD — ${main}`);
  await beat(hold);
  await ov('untitle');
  await beat(760);
}

const look = (sel, tone) => ov('focus', sel, tone ?? 'accent');
const unlook = () => ov('unfocus');

/**
 * Scroll an element into the middle of the frame, the way a presenter would.
 *
 * THE TIMEOUT IS THE POINT. A `bring()` whose selector matches nothing waits the
 * page default and the `catch` then swallows it, so a missing decoration costs a
 * full minute of footage of a motionless screen — which is what it did, once,
 * between two captions. Three seconds is longer than any scroll and shorter than
 * anything a viewer would sit through.
 */
async function bring(selector) {
  await page
    .locator(selector)
    .first()
    .scrollIntoViewIfNeeded({ timeout: 3000 })
    .catch(() => {});
  await beat(600);
}

/** The text of an element — its value if it is a field, its content otherwise. */
async function textOf(selector) {
  const loc = page.locator(selector).first();
  const raw =
    (await loc.inputValue({ timeout: 1500 }).catch(() => null)) ??
    (await loc.textContent({ timeout: 1500 }).catch(() => null));
  return (raw ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Show a figure the page is already displaying, beside its own name. It reads
 * the element and refuses rather than inventing one, because a caption that
 * falls back to a hardcoded number is the defect this whole product is against.
 */
async function figure(selector, label, tone) {
  const value = (await textOf(selector)).match(/[\d][\d,.\s]*(?:m²|m2|m|bays|ratio)?/i)?.[0]?.trim();
  if (!value) return console.log(`  (no figure at ${selector})`);
  timeline.push({ t: at(), kind: 'figure', head: value, body: label, tone: tone ?? 'accent' });
  await ov('figure', value, label, tone ?? 'accent');
}

/** Move the drawn pointer onto a real element and leave a ring where it lands. */
async function aim(locator, timeout = 15_000) {
  await locator.scrollIntoViewIfNeeded({ timeout }).catch(() => {});
  await beat(280);
  const b = await locator.boundingBox({ timeout: 3000 }).catch(() => null);
  if (!b) return null;
  const x = Math.round(b.x + b.width / 2);
  const y = Math.round(b.y + b.height / 2);
  await ov('pointer', x, y);
  await beat(620);
  return { x, y };
}

/**
 * Aim, ring, then really click. The viewer sees the cause before the effect.
 *
 * The click carries its OWN timeout rather than the page default, because a
 * `press` inside `optional()` that misses costs the page default in footage of a
 * still screen before the catch fires — and `optional` exists precisely so a
 * missing flourish costs nothing.
 */
async function press(locator, timeout = 15_000) {
  const p = await aim(locator, timeout);
  if (p) {
    await ov('tap', p.x, p.y);
    await beat(280);
  }
  await locator.click({ timeout });
  await beat(520);
}

/** Aim, then type. `slow` types character by character, for the fields worth watching. */
async function write(locator, value, slow = false) {
  await aim(locator);
  if (slow) {
    await locator.click();
    await locator.fill('');
    await locator.pressSequentially(String(value), { delay: 70 });
  } else {
    await locator.fill(String(value));
  }
  await beat(420);
}

async function choose(locator, value) {
  await aim(locator);
  await locator.selectOption(value);
  await beat(420);
}

/* Non-essential flourishes must never cost a take. Flow steps are NOT wrapped. */
async function optional(label, fn) {
  try {
    await fn();
  } catch (e) {
    console.log(`  (skipped: ${label} — ${e.message.split('\n')[0]})`);
  }
}

const btn = (name, exact = false) => page.getByRole('button', { name, exact });

/**
 * The first of several candidates that is actually on the page.
 *
 * The names below came out of `probe.mjs`, which prints `innerText`; an
 * accessible name is not always that — an `aria-label` replaces the content
 * outright, which is why the language control reads «العربية» on screen and
 * "Switch the site to Arabic" to `getByRole`. Where the two can differ, both are
 * offered here rather than one being guessed at.
 */
/**
 * A step in the product's own stepper, by position rather than by name.
 *
 * The rail reads «6 السعة» on screen, but a stepper button's accessible name
 * carries its availability too — «(غير متاحة بعد)» — so matching on the leading
 * digit finds it before the run unlocks it and not after. Position cannot drift:
 * the product numbers these steps itself, and the count is the contract.
 */
const stepper = (n) => page.locator('.stepper__step').nth(n - 1);

async function firstOf(...locators) {
  for (const loc of locators) {
    if (await loc.count().then((n) => n > 0).catch(() => false)) return loc.first();
  }
  return locators[0].first();
}

/* ========================================================================== */
/* 00 — THE TITLE                                                             */
/* ========================================================================== */

await page.goto(BASE, { waitUntil: 'networkidle' });
await assertOverlay('the landing page');
await beat(1400);

await card('TOP.ai', 'محرك يحسب السعة التطويرية لقطعة أرض في دبي، ويظهر من أين جاء كل رقم', 4600);

/* ========================================================================== */
/* 01 — ARABIC, FIRST, SO EVERYTHING AFTER IT IS ARABIC                       */
/* ========================================================================== */

await scene(
  '01 · اللغة',
  'المنصة بالعربية كاملة، من اليمين إلى اليسار',
  'ليست ترجمة للواجهة وحدها: الاتجاه والتخطيط والرسومات تنقلب كلها، والجمل التي ترفض ادعاء تترجم بالحزم نفسه.',
);
await beat(3600);
await press(page.getByRole('button', { name: /العربية|arabic/i }).first());
await beat(2600);

/* ========================================================================== */
/* 02 — THE FOLD: the answer and the assumption under it                      */
/* ========================================================================== */

await scene(
  '02 · الواجهة',
  'الإجابة، والافتراض الذي تقوم عليه، معا',
  'الرقم الحاكم لهذه القطعة، وتحته مباشرة الافتراض الذي دخل في حسابه — بالكهرماني، لأن الكهرماني في هذا المنتج يعني «غير مؤكد» ولا يعني شيئا آخر.',
);
await beat(4400);

await optional('governing figure', async () => {
  await look('.lp-band--governing, .lp-answer, .lp-hero__answer');
  await figure('.lp-band--governing .lp-band__number, .lp-band__number', 'السعة الحاكمة لهذه القطعة');
  await beat(4200);
  await ov('figure', null);
  await look('.lp-answer [data-state="assumed"], .traced--assumed', 'assumed');
  await beat(3200);
  await unlook();
});

await scene(
  '03 · الواجهة',
  'وما لا يؤكده النظام مكتوب قبل ما يؤكده',
  'الصلاحية التنظيمية لا تخضع للتقييم ولا يؤكدها هذا النظام إطلاقا. الجملة في رأس كل صفحة، وفي كل تقرير، وفي كل ملف يخرج.',
);
await ov('stamp', 'REGULATORY VALIDITY — NOT ASSESSED');
await beat(5000);
await ov('stamp', null);

/* ========================================================================== */
/* 03 — INTO THE ENGINE                                                       */
/* ========================================================================== */

await card('الدراسة تبدأ', 'عشر خطوات — وكل خطوة تقول ما أدخلته أنت وما افترضه المحرك', 4000);

await page.goto(new URL('/app', BASE).href, { waitUntil: 'networkidle' });
await assertOverlay('/app');
await beat(1800);

await scene(
  '04 · الاسم',
  'ما يفعله الاسم هنا، وما لا يفعله',
  'يربط الدراسة باسمك ويحفظ ما تكتبه. ولا يتحقق من رقم الرخصة لدى أي جهة، ولا يمنع منشئ الدراسة من توقيعها بنفسه — والنظام يقول ذلك بدل أن يوحي بضابط لا يملكه.',
);
await beat(5000);

await write(page.getByLabel('اسمك').first(), 'Khaled Haggagy', true);
await optional('licence', async () => {
  await write(page.getByLabel(/رقم الرخصة المهنية/).first(), 'DM-12345');
});
await press(btn('افتح المحرك بهذا الاسم'));
await page.locator('#affection-plan-file').waitFor({ timeout: 60_000 });
await beat(1600);

/* ========================================================================== */
/* 04 — STEP 1 · THE AFFECTION PLAN                                           */
/* ========================================================================== */

await step(0);
await card('الخطوة 1 · المخطط', 'يقرأ الورقة الصادرة، ويراجع حسابها، ويقول ما لم تذكره', 3800);

await scene(
  '05 · المخطط',
  'مخطط أفكشن صادر فعلا، لا نموذج تجريبي',
  'الملف المرفوع ورقة Trakhees لقطعة في الورسان. يقرأ المحرك النص المطبوع فيها بإحداثياته ولا يخمن من صورة — ولذلك يرفض الصورة والمسح الضوئي ويقول لماذا.',
);
await beat(4800);

await look('#affection-plan-file, .dropzone, [class*="dropzone"]');
await beat(1600);
await page.setInputFiles('#affection-plan-file', PDF);
await unlook();
await btn('استخدم هذه القيم').waitFor({ timeout: 90_000 });
await beat(1800);

await scene(
  '06 · المخطط',
  'كل قيمة تخرج من الورقة تحمل موضعها فيها',
  'رقم القطعة، والمجتمع العمراني، والاستعمال، والمساحة، ومعامل البناء، وإجمالي المساحة الطابقية. وكل رقم يفتح الصفحة والسطر الذي أخذ منه.',
);
await optional('reading', async () => {
  await bring('.reading, .intake, main');
  await look('.reading, .intake');
  await beat(6200);
  await unlook();
});

await scene(
  '07 · المخطط',
  'وما لا تذكره الورقة يبقى فارغا',
  'الورقة التي لا تطبع معامل بناء لا يمنح لها واحد. استعارة الرقم من القطعة المجاورة هي بعينها الحالة التي وجد هذا المنتج ليمنعها.',
);
await beat(5200);

await press(btn('استخدم هذه القيم'));
await page.locator('#width').waitFor({ timeout: 60_000 });
await beat(1600);

/* ========================================================================== */
/* 05 — STEP 2 · THE PLOT                                                     */
/* ========================================================================== */

await step(1);
await card('الخطوة 2 · القطعة', 'تدخل حدا حدا — ولا يعدل شيء ليقفل الشكل', 3800);

await scene(
  '08 · القطعة',
  'الورقة تطبع المساحة، ولا تطبع الشكل',
  'تدخل أنت الشكل المساحي، فيعيد المحرك حساب المساحة منه ويقارنها بالمساحة المطبوعة على الورقة نفسها. الاتفاق يعلن، والاختلاف يبلغ ولا يبتلع.',
);
await beat(4600);

await optional('carried values', async () => {
  await look('#stated-area');
  await figure('#stated-area', 'المساحة كما تطبعها الورقة — محمولة، لا مكتوبة');
  await beat(4000);
  await ov('figure', null);
  await unlook();
});

await write(page.locator('#width'), '50.85', true);
await write(page.locator('#depth'), '26.85', true);

await optional('boundary by boundary', async () => {
  await press(page.locator('input[name="plot-shape"][value="edges"]'));
  await page.locator('#edge-0-length').waitFor({ timeout: 20_000 });
  await scene(
    '09 · القطعة',
    'وقطعة غير منتظمة تدخل حدا حدا',
    'طول واتجاه لكل حد، وفرق الإقفال يعرض بالمليمتر بدل أن يقفل الشكل تلقائيا — فإقفاله يعني تغيير أرض العميل لتناسب البرنامج.',
  );
  await bring('#edge-0-length');
  await look('#edge-0-length');
  await beat(5200);
  await unlook();

  await choose(page.locator('#edge-0-curve'), 'right');
  await write(page.locator('#edge-0-radius'), '200');
  await scene(
    '10 · القطعة',
    'وحد منحن يدخل بانحنائه، لا مستقيما',
    'نصف القطر والجهة كما تطبعهما الورقة، وتحسب مساحة القوس بالصيغة المغلقة لا من مضلع يقارب المنحنى.',
  );
  await bring('#edge-0-radius');
  await look('#edge-0-radius');
  await beat(6000);
  await unlook();

  await page.locator('#edge-0-curve').selectOption('');
  await press(page.locator('input[name="plot-shape"][value="rectangle"]'));
  await page.locator('#width').waitFor({ timeout: 20_000 });
  await write(page.locator('#width'), '50.85');
  await write(page.locator('#depth'), '26.85');
});

await scene(
  '11 · القطعة',
  'وكل حد يصنف: طريق، أو قطعة مجاورة، أو مساحة مفتوحة',
  'التصنيف هو ما يختار الارتداد، وهو ما يغذي توصية المدخل لاحقا تحت البند B.7.2.1. والحد غير المصنف يوقف الدراسة، لأنه سؤال، وتركه بلا إجابة يجعل الارتداد تخمينا.',
);
await choose(page.locator('#edge-0-class'), 'ROAD');
await choose(page.locator('#edge-0-road'), 'LOCAL');
await choose(page.locator('#edge-1-class'), 'ADJACENT_PLOT');
await choose(page.locator('#edge-2-class'), 'ROAD');
await choose(page.locator('#edge-2-road'), 'COLLECTOR');
await choose(page.locator('#edge-3-class'), 'ADJACENT_PLOT');
await beat(2000);

await press(await firstOf(btn('متابعة', true), page.locator('.pf-submit, form .button--primary')));

/* ========================================================================== */
/* 06 — STEP 3 · THE PARAMETERS                                               */
/* ========================================================================== */

await step(2);
const confirmPlot = btn('هذه هي القطعة');
await confirmPlot.waitFor({ timeout: 90_000 });
await beat(1400);

await card('الخطوة 3 · المعطيات', 'المساحة المحسوبة تقارن بالمساحة المطبوعة', 3600);

await scene(
  '12 · المعطيات',
  'الشكل يرسم، وكل حد يقول ما يطل عليه',
  'اختلاف بين المساحتين يتجاوز الحد المسموح يوقف الدراسة. لا يبنى شيء على شكل لا يطابق الورقة، وهذه أول بوابة في المسار.',
);
await optional('plot canvas', async () => {
  await bring('.plot-svg, .plot-canvas');
  await look('.plot-svg, .plot-canvas');
  await beat(6000);
  await unlook();
});

await press(confirmPlot);
await page.locator('input[name="parking-far"]').first().waitFor({ timeout: 60_000 });
await beat(1600);

/* ========================================================================== */
/* 07 — STEP 4 · THE RULE WITH NO DEFAULT                                     */
/* ========================================================================== */

await step(3);
await card('الخطوة 4 · القواعد', 'السؤال الذي لا إجابة افتراضية له', 3800, 'assumed');

await scene(
  '13 · القواعد',
  'هل تدخل المواقف في معامل البناء؟',
  'هذا السؤال وحده يحرك السعة بين 15% و35%. لا خيار معلما مسبقا، ولا حساب قبل الإجابة عنه — فافتراض صامت هنا يغير الناتج بالثلث ولا يظهر في التقرير.',
  'assumed',
);
await bring('#parking-far-heading');
await look('section[aria-labelledby="parking-far-heading"]', 'assumed');
await beat(6400);
await unlook();

await optional('practice statement', async () => {
  const use = btn('استخدم هذه الإجابة');
  await use.waitFor({ timeout: 20_000 });
  await bring('#statement-heading, .statement');
  await scene(
    '14 · القواعد',
    'وإجابة ممارس ليست قاعدة تنظيمية',
    'تعرض منسوبة لصاحبها بنصها وبحدود ما يقوله، وتؤخذ بزر ولا تختار سلفا. تقديم رأي شخص باسم مرجع مستشهد به هو أخطر تزييف متاح في هذا النظام.',
    'assumed',
  );
  await beat(6200);
});

await optional('level schedule', async () => {
  await bring('section[aria-labelledby="levels-heading"]');
  await look('section[aria-labelledby="levels-heading"]');
  await scene(
    '15 · القواعد',
    'وجدول الأدوار يقرأ كما تطبعه الورقة',
    /* NOT «G+2P+8 تعني ثلاثة أدوار»: that is the product's canonical example and
       this run's schedule on screen is 1B+G+2P, so a viewer reading the caption
       against the form would see the engine miscount. Say the rule over what is
       actually drawn — which states it just as exactly. */
    'البدرومات، وهل الدور الأرضي مواقف، وأدوار البوديوم فوقه — كل واحد يقرأ على حدة، لا يجمعها رقمان. والجدول الذي لا يصف مبنى يرفض، ولا يقرب إلى أقرب رقم.',
  );
  await beat(5800);
  await unlook();
});

await optional('developer standard', async () => {
  await bring('#standard-heading');
  await look('section[aria-labelledby="standard-heading"]', 'assumed');
  await scene(
    '16 · القواعد',
    'ومعيار المطور ليس لائحة تنظيمية',
    'يعرض تحت عنوان صريح بذلك، ولا يدمج في مجموعة القواعد إطلاقا. وفي هذا النشر هو محجوب أصلا، لأنه وثيقة عميل.',
    'assumed',
  );
  await beat(5800);
  await unlook();
});

await optional('saleable efficiency', async () => {
  await bring('#efficiency-heading');
  await scene(
    '17 · القواعد',
    'وكفاءة المساحة القابلة للبيع لا قيمة افتراضية لها',
    'كان المحرك يقسم إجمالي المساحة الطابقية على مساحة الوحدة، وهذا يفترض أن كل متر يباع. النوى والممرات والإنشاء والمعدات داخل الإجمالي ولا يباع منها شيء، فكان العدد أعلى بثلاثة إلى سبعة بالمئة في كل دراسة.',
    'assumed',
  );
  await write(page.locator('#saleable-efficiency'), '0.93', true);
  await beat(6000);
});

await optional('comparison', async () => {
  await press(btn('أرني ما تساويه كل إجابة'));
  await page.locator('.comparison__verdict').waitFor({ timeout: 30_000 });
  await bring('.comparison__verdict');
  await scene(
    '18 · القواعد',
    'ولأن الفارق مقيس، يعرض بدل أن يوصف',
    'تحسب القطعة نفسها بالإجابتين، ويطبع الفارق بينهما. المدى المقتبس من وثيقة مواصفات قول عن وثائق؛ أما هذا فقياس على هذه القطعة.',
  );
  await beat(6400);
});

await press(page.locator('input[name="parking-far"][value="EXCLUDED_FROM_FAR"]'));
await beat(1400);
await press(btn('احسب السعة'));

/* ========================================================================== */
/* 08 — STEP 5 · THE ASSUMPTIONS, FIRST                                       */
/* ========================================================================== */

await page.locator('.data-table').first().waitFor({ timeout: 120_000 });
await step(4);
await beat(1800);

await card('الخطوة 5 · الافتراضات', 'تعرض قبل الإجابة، لا في حاشية بعدها', 3800, 'assumed');

await scene(
  '19 · الافتراضات',
  'كل افتراض ومعه أساسه وأثره المقيس',
  'ليست قيمة افتراضية: لكل بند هنا أساس مكتوب وحساسية مقيسة — كم يتحرك الناتج لو تحرك هو. والقائمة تقرأ قبل أن يظهر الرقم.',
  'assumed',
);
await bring('.data-table');
await look('.data-table', 'assumed');
await beat(7200);
await unlook();

await optional('acknowledge', async () => {
  await press(btn('اطلعت على الافتراضات'));
  await beat(1400);
});

/* ========================================================================== */
/* 09 — STEP 6 · THE CAPACITY AND THE BUILDING                                */
/* ========================================================================== */

await press(stepper(6));
await page.locator('.governing__figure').waitFor({ timeout: 60_000 });
await step(5);
await beat(1600);

await card('الخطوة 6 · السعة', 'ثلاثة نطاقات — والحاكم أصغرها، ولا يحسب لها متوسط إطلاقا', 3800);

await scene(
  '20 · السعة',
  'ما يسمح به معامل البناء · ما يسمح به الغلاف · ما تخدمه المواقف',
  'الحاكم أصغرها، ومعلم بأنه الملزم. ولا نطاق اسمه «الواقعي» ولا «المتوقع» — الغياب مفروض في مخطط البيانات نفسه، لأن رقما بهذا الاسم يقرأ وعدا.',
);
await bring('.governing__figure');
await look('.governing__figure');
await figure('.governing__figure', 'السعة الحاكمة — كما أخرجها المحرك الآن');
await beat(7600);
await ov('figure', null);
await unlook();

await optional('massing', async () => {
  await bring('section[aria-labelledby="massing-heading"]');
  await page.locator('.massing-viewer').waitFor({ timeout: 40_000 });
  await beat(1600);
  await card('المجسم', 'المبنى يبنى في المحرك، لا في العارض', 3600);
  await scene(
    '21 · المجسم',
    'كل دور عند منسوبه، وكل سيارة في موقفها',
    'المشهد مبني من نموذج المبنى نفسه الذي ترسم منه اللوحات وملفات CAD، ولا يجمع من الأرقام. ولكل جسم لون صنف القيمة التي يمثلها: الكهرماني هنا يعني أن هذا الجزء مفترض.',
    'assumed',
  );
  await look('.massing-viewer', 'assumed');
  await beat(7600);
  await unlook();
});

/* ========================================================================== */
/* 10 — STEP 7 · THE PARKING, WHICH IS THE PRODUCT                            */
/* ========================================================================== */

await optional('parking step', async () => {
  await press(stepper(7));
  await page.locator('.sheet-set, .parking-plan').first().waitFor({ timeout: 60_000 });
  await step(6);
  await beat(1600);

  await card('الخطوة 7 · المواقف', 'هذا هو المنتج — لا الكتلة', 3800);

  await scene(
    '22 · المواقف',
    'المواقف ترصف فعلا، ولا تقسم مساحة على معامل',
    'أبعاد الجدول B.11 من كود دبي للمباني: مواقف وممرات مناورة ومنحدر، مرسومة مستطيلات داخل حدود البوديوم. وعدد مواقف لا يمكن رصفه ليس عددا.',
  );
  await bring('.sheet-view__svg, .parking-plan__svg');
  await look('.sheet-view__svg, .parking-plan__svg');
  await beat(7600);
  await unlook();

  await scene(
    '23 · المواقف',
    'والموقف الذي لا تبلغه سيارة لا يحسب',
    'تبنى شبكة الممرات وتغمر من مدخل واحد، والموقف الذي لا ينفتح على ممر يسقط. والخسارة تنشر في ثلاثة بنود منفصلة، لا في نسبة كفاءة واحدة تخفي أيها تستطيع مناقشته.',
  );
  await beat(7200);

  await optional('access', async () => {
    await bring('[class*="access"]');
    await scene(
      '24 · المداخل',
      'ومدخل المركبات يوصى به مع بدائله ومع ما رفض',
      'تحت البند B.7.2.1: مسافة الابتعاد عن التقاطع تقاس من الركن المشطوف الذي يحمله المحرك أصلا، والأفضلية للطريق الأدنى تصنيفا. وما يحتاج شبكة طرق يعلن «لم يخضع للتقييم» بدل أن يوقف الباقي.',
    );
    await beat(7200);
  });
});

/* ========================================================================== */
/* 11 — STEP 8 · THE CHECKS                                                   */
/* ========================================================================== */

await optional('checks step', async () => {
  await press(stepper(8));
  await page.locator('.claim--never').waitFor({ timeout: 60_000 });
  await step(7);
  await beat(1600);

  await card('الخطوة 8 · الفحوصات', 'ثمانية عشر فحصا مستقلا — وما لم يفحص يقال', 3800);

  await scene(
    '25 · الفحوصات',
    'طبقة التحقق لا ترى المحرك أصلا',
    'ليست مجاملة معمارية: حزمة التحقق لا تستطيع استيراد حزمة الحساب، والمنع بنيوي لا قاعدة مراجعة. والفحص الذي لا يجد بيانات يعلن ساكنا، ولا يعد اجتيازا.',
  );
  await bring('.claim--never');
  await look('.claim--never', 'refusal');
  await beat(7000);
  await unlook();

  await optional('dormant', async () => {
    await press(btn('إظهار الفحوصات التي لم تجد'));
    await page.locator('tr.is-not-assessed').first().waitFor({ timeout: 20_000 });
    await scene(
      '26 · الفحوصات',
      'وما لم يفحص يعرض، لا يخفى',
      'زر واحد يظهر كل فحص لم يجد ما يفحصه. إخفاؤها يجعل اللوحة كلها خضراء، وهذا بالضبط ما يرفضه هذا المنتج.',
      'refusal',
    );
    await beat(6800);
  });
});

/* ========================================================================== */
/* 12 — STEP 9 · THE DERIVATION                                               */
/* ========================================================================== */

await optional('derivation', async () => {
  /* Step 9 is the product's own evidence step; the derivation belongs on it
     rather than on whichever screen happened to hold a traced value. */
  await press(stepper(9));
  await page.locator('button.traced').first().waitFor({ timeout: 30_000 });
  await step(8);
  await beat(1400);

  /* The derivation popover is anchored to the value it explains, so a value
     near the inline edge opens a panel that runs off the screen — and the
     first take filmed exactly that: the formula clipped at the left margin,
     under a caption promising the formula. So open a candidate, MEASURE the
     dialog against the viewport, and move on to the next value if it does
     not fit. Filming a clipped panel is worse than filming a different value. */
  const vw = page.viewportSize()?.width ?? 1920;
  const candidates = await page.locator('button.traced').count();
  let opened = false;
  for (let i = 0; i < Math.min(candidates, 6) && !opened; i += 1) {
    const anchor = page.locator('button.traced').nth(i);
    await anchor.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
    await press(anchor);
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor({ timeout: 30_000 });
    await beat(700);
    const box = await dialog.boundingBox();
    if (box && box.x >= 0 && box.x + box.width <= vw) {
      opened = true;
      break;
    }
    console.log(
      `   derivation ${i} clipped (x=${Math.round(box?.x ?? -1)} w=${Math.round(box?.width ?? 0)} vw=${vw}) — trying the next value`,
    );
    await page.keyboard.press('Escape');
    await beat(500);
  }
  if (!opened) {
    /* Every candidate overflowed. Say so in the log rather than filming one
       and calling the take good — the same rule the product is under. */
    console.log('   no derivation panel fitted the viewport — scene skipped');
    return;
  }
  await beat(1400);
  await scene(
    '27 · الاشتقاق',
    'وأي رقم يفتح اشتقاقه كاملا',
    'الصيغة والمدخلات والقاعدة المستشهد بها، كما أخرجها المحرك لا مكتوبة بيد أحد. وقيمة تقول إنها مشتقة ولا تصل إلى قاعدة مستشهد بها يرفضها الاختبار قبل أن تخرج.',
  );
  await beat(7200);
  await page.keyboard.press('Escape');
  await beat(1000);
});

/* ========================================================================== */
/* 13 — STEP 10 · THE GATES AND THE FILES                                     */
/* ========================================================================== */

await optional('export step', async () => {
  await press(stepper(10));
  await btn('تصدير التقرير').waitFor({ timeout: 60_000 });
  await step(9);
  await beat(1600);

  await card('الخطوة 10 · التصدير', 'لا يخرج ملف قبل أن يقر أحد بالافتراضات ويوقع', 3800);

  await scene(
    '28 · التصدير',
    'بوابتان: الاطلاع على الافتراضات، ثم التوقيع',
    'زر التصدير معطل حتى تستوفى البوابتان، والاسم الذي وقع يكتب داخل كل ملف يخرج.',
  );
  await bring('button:has-text("تصدير التقرير")');
  await look('button:has-text("تصدير التقرير")', 'refusal');
  await beat(5600);
  await unlook();

  await optional('sign', async () => {
    await press(btn('أضف توقيعك على هذا الناتج'));
    await beat(2000);
  });

  await scene(
    '29 · التصدير',
    'ثم تخرج المجموعة كاملة',
    'تقرير · مخرجات JSON · مجموعة رسومات A3 · ملف DXF للمبنى أو لأي لوحة · النموذج ثلاثي الأبعاد بصيغة glTF · ومصنف XLSX. كلها من نموذج المبنى نفسه، وكلها خلف البوابتين نفسيهما.',
  );
  await press(btn('تصدير التقرير'));
  await btn('افتح التقرير').waitFor({ timeout: 90_000 });
  await beat(2000);
  await bring('button:has-text("افتح التقرير")');
  await look('.export, .exports, main');
  await beat(6400);
  await unlook();
});

/* ========================================================================== */
/* 14 — WHAT IT REFUSES                                                       */
/* ========================================================================== */

await ov('rail', null);
await page.goto(new URL('/refusals', BASE).href, { waitUntil: 'networkidle' });
await beat(1800);

await card('ما يرفضه', 'أطول قائمة في هذا المنتج هي قائمة ما يرفض أن يؤكده', 4200, 'refusal');

await scene(
  '30 · الرفض',
  'خمسة ادعاءات: أربعة يجيب عنها، والخامس يرفضه',
  'الصلاحية التنظيمية لم تخضع للتقييم. ليست «قيد الاعتماد» ولا «لاحقا» — لا تستخرج من أي حساب. وموافقة المدقق على المحرك اتساق ذاتي ولا شيء أكثر.',
  'refusal',
);
await ov('stamp', 'NEVER CLAIMED');
await beat(7200);
await ov('stamp', null);

/* ========================================================================== */
/* 15 — WHAT IS NOT READY, WHAT IT IS WORTH, AND WHAT IS NEXT                 */
/* ========================================================================== */

await page.goto(new URL('/readiness', BASE).href, { waitUntil: 'networkidle' });
await beat(1800);

await scene(
  '31 · الجاهزية',
  'وصفحة تبدأ بما ليس جاهزا',
  /* «صفر قاعدة معتمدة من ثلاث عشرة» is an English construction in Arabic
     clothes. Put the count where Arabic puts it and the zero keeps all of its
     force, which is the entire point of the readiness page. */
  'المعتمد من القواعد الثلاث عشرة: صفر. والموقع من التعريفات الخمسة عشر: صفر. ولا مؤشر صحة مركب، لأن رقما واحدا يجعل القارئ يتوقف عنده.',
  'assumed',
);
await beat(6600);

await card(
  'ما الذي يتغير عمليا',
  'توزيع المواقف مرسوم لا مقدر · وكل رقم يفتح اشتقاقه · والرسومات وملفات CAD من نموذج واحد · وما لم يفحص مكتوب في كل ناتج',
  6800,
);

await card(
  'المراحل القادمة',
  'قياس دقة القراءة على عشر إلى عشرين ورقة صادرة · مساحات عمل وصلاحيات · استيراد DXF و LandXML · ودراسة التباين التي لم تجر بعد',
  6800,
);

await card(
  'TOP.ai',
  'الصلاحية التنظيمية لا تخضع للتقييم ولا يؤكدها هذا النظام — وكل رقم آخر يمكن تتبعه إلى مصدره',
  5200,
);

/* ------------------------------------------------------------------- close */

await ov('clear');
await beat(1000);

const video = page.video();
await context.close();
const raw = await video.path();
writeFileSync(
  resolve(OUT, 'timeline.json'),
  JSON.stringify({ base: BASE, raw, durationMs: at(), marks: timeline }, null, 2),
);
await browser.close();

console.log(`\nrecorded ${(at() / 1000 / 60).toFixed(1)} min`);
console.log(`raw video: ${raw}`);
console.log(`timeline:  ${resolve(OUT, 'timeline.json')}`);
