# The Arabic vocabulary of refusal

This is the file every Arabic string on the site is checked against, and it is the
first artefact of the translation rather than a by-product of it.

`CLAUDE.md` states the reason in one sentence: *"the entire trust proposition lives
in labels… Getting that copy wrong undoes the engineering."* That is a claim about
English copy, and it is twice as true of a second language, because a translation
failure is invisible to everyone who reads only the original. An Arabic reader who
is told the engine says a scheme is **مطابق** has been told the opposite of what
this product exists to say, and no test written in English would catch it.

---

## 1. The rule that governs everything else

> **The engine's own strings are never translated.**

A basis string — *"the conservative end of the saleable-to-GFA range in the project
brief on file"* — is not interface copy. It is a **record of why a number was
assumed**, emitted by the engine, carried in the provenance graph, printed in the
report and signed at G4. Translating it manufactures a second version of a piece of
evidence that nobody issued and nobody signed, and there would then be two answers
to "what did the engine say", which is the exact failure mode
`verify-worked-example.mjs` exists to prevent for figures.

So the following are rendered **verbatim, in the language the engine produced them
in**, inside a `dir="ltr" lang="en"` span so they lay out correctly on an
RTL page and a screen reader switches voice for them:

| What | Example |
|---|---|
| Basis strings | *the conservative end of the saleable-to-GFA range…* |
| Formula strings off the provenance graph | `GFA ÷ gfa_per_unit_m2` |
| Rule identifiers and citations | `FR-DEF-002`, `DBC Table B.11` |
| Invariant identifiers | `INV-15` |
| Parameter identifiers | `parking.bay_area_factor` |
| Gate names | `G1`, `G4` |
| Plot, community and standard names as issued | `DJAZ1MED12RES011` |
| Provenance class names where shown as tokens | `DERIVED`, `ASSUMED` |

The **label** for a provenance class is interface copy and IS translated —
"Assumed" → «مُفترَض». The **token** `ASSUMED`, where the product shows the machine
value, is not. Both appear, and the difference is the point: one is what we call it,
the other is what the engine emitted.

Arabic numerals in the Western form (`1365.23`) throughout. Not a style preference:
a traced value must be byte-identical to what the engine produced, `IBM Plex Mono`
carries no Arabic-Indic digits, and every "the drawing and the number agree"
argument in this codebase compares strings.

---

## 2. The refusal vocabulary

The nine terms below carry the whole proposition. Each entry says what was rejected
and why, because the rejected option is usually the more natural Arabic.

> **These headwords are unvowelled, and that is not a typographic choice.** §5 bars
> diacritics from every shipped string, and a term that has to be vowelled to be read
> is a term written in the wrong words. Three of the entries below were therefore
> *replaced* rather than stripped — **لم يُقيَّم**, **يُدَّعى**, **مُشتَقّ** — and the
> replacements are the ones given here. §5b records the rest.

### NOT ASSESSED → **لم يخضع للتقييم**

It states the **absence of an act** — nobody assessed this. That is precisely what
the product means.

*Rejected:* **غير صالح** ("invalid") and **غير مطابق** ("non-compliant"). Both are
verdicts. The product's entire position is that it has not reached a verdict, and
either of these would convert a refusal to assess into an adverse finding — a
stronger claim than the affirmative one it refuses to make.

*Rejected:* **لم يُقيَّم**, which this glossary used to give. Unvowelled — which is how
it ships — **لم يقيم** reads as "he did not stay", and the one phrase the whole
proposition rests on became a sentence about lodging. The passive had to go, not its
vowelling.

*Rejected:* **لم يتم التقييم**. Correct but limp; the site's register is terse.

### Regulatory validity is never assessed and never claimed → **الصلاحية التنظيمية لا تخضع للتقييم إطلاقا ولا يؤكدها هذا النظام**

Present tense, not past: this is a permanent property of the product, not a fact
about one run. **إطلاقا** carries "never" without the ambiguity of **أبدا**, which
in some registers reads as "always".

*Rejected:* **يُدَّعى بها**. Unvowelled, **يدعيها** is read as "he invites her", and
the verb that denies the central claim stopped denying anything. **يؤكد** — to
assert — carries the same denial and needs no marks. It is now the verb everywhere
the English says *claim*, on the landing page and in the colophon as well as here.

### compliance → **مطابقة** · this is not a compliance check → **هذا ليس فحص مطابقة**

**مطابق** may never be applied to a run, an output, a figure or a scheme. It appears
on this site exactly once per surface, negated. Treat any Arabic sentence in which
**مطابق** is a predicate of the product's output as a defect of the same class as an
untraced value.

### ASSUMED → **مفترض** · assumed — you may edit this → **مفترض — لك أن تعدله**

The dash and the second clause are load-bearing. §13.1 makes the amber treatment
"the most important UI decision in the product" and the reason is that an assumption
is an **invitation**, not a warning. **مفترض** alone reads as a system statement;
the second clause hands it to the reader.

*Rejected:* **افتراضي**, which is "default" — the one thing this codebase forbids
having.

*Rejected:* the imperative **عدِّل** for the edit action. Unvowelled it is **عدل**,
which is also *justice* and *he turned away*; the button therefore takes the masdar,
**تعديل هذا الافتراض**. Every button whose imperative is ambiguous bare does the
same — استرجاعها، طي، إظهار، تصغير، الخروج من الحساب.

### DERIVED → **مشتق** · From a cited rule → **من قاعدة مستشهد بها**

The plain-language legend deliberately says "from a cited rule" rather than
"DERIVED", and the Arabic follows the plain language, not the token.

### USER_SET → **أنت أدخلته**

Second person, matching the English legend. Not **مدخل من المستخدم**, which is
about a user rather than to the reader — and which bare is **مدخل**, an *entrance*,
on a product whose parking page is full of them.

### governing band → **النطاق الحاكم** · binding limit → **القيد الملزم**

Two different ideas that English keeps apart and careless Arabic collapses:
**الحاكم** is the band the answer comes from; **الملزم** is the limit that produced
it. Never both **المحدد**. Where *binds* is a verb — a standard that bound the
envelope — it is **يقيد**, not **يلزم**, which bare also reads as "is necessary".

### basis → **الأساس** · sensitivity → **الحساسية**

`assumed()` refuses an assumption with no basis. **الأساس** carries "the ground on
which this rests"; **السبب** (reason) would weaken it to a rationale.

### setback → **ارتداد** · plot → **قطعة الأرض** · affection plan → **مخطط أفكشن (Affection Plan)**

**ارتداد** is the standard term in Gulf planning practice. The affection plan is a
**named instrument issued by Trakhees**, so it is glossed on first use and then
carried verbatim — a translated name would not match the document in the reader's
hand, which is the one thing a name has to do.

---

## 3. Register

The English copy is terse, declarative and unapologetic — *"It refuses"*, *"There is
no default"*, *"Absence is enforced by schema"*. Arabic marketing register is
warmer and more elaborated, and drifting into it would soften the refusals by tone
while translating them correctly word for word.

- Verbal sentences, present tense. **يرفض المحرّك** rather than **المحرّك يقوم برفض**.
- No **قد** or **ربما** in a refusal. A hedge in a refusal is a claim.
- No **نحن**. The product speaks about itself in the third person, as the English does.
- Numerals, units and identifiers stay LTR and unshaped.

---

---

## 5. الفصحى — Modern Standard Arabic, and what that excludes

Every string on this site is written in **Modern Standard Arabic**. This is a
technical document read by consultants, developers and a funder; a page that drifts
into dialect reads as a chat message, and a page that drifts into transliterated
English reads as a machine translation. Both undo the register the English copy
spent its whole vocabulary establishing.

**Not permitted, anywhere:**

| Not this | This | Why |
|---|---|---|
| مش · مفيش · مافي | ليس · لا يوجد | Egyptian and Gulf colloquial |
| عشان · علشان | لأنّ · كي · حتى | colloquial causal |
| دلوقتي · هلق | الآن | colloquial temporal |
| كده · هيك | هكذا · على هذا النحو | colloquial demonstrative |
| إزاي · ليه | كيف · لماذا | colloquial interrogative |
| بيحسب · بيقول | يحسب · يقول | colloquial present prefix |
| اللي | الذي · التي · ما | colloquial relative |
| السيت بلان · الليَي-آوت | مخطّط الموقع · التوزيع | transliteration where a term exists |
| كالكوليشن · فاليوز | حساب · قيم | same |

**Required:**

- **Verbal sentences in the present tense.** *يرفض المحرك أن يفترض* rather than
  *المحرك يقوم بعملية رفض الافتراض*. The English is terse; nominalised Arabic is not.
- **Hamza written correctly**: الإجابة not الاجابة · أدخلت not ادخلت. (This bullet
  used to end "· مُفترَض not مفترض where the vowelling disambiguates", which the
  no-diacritics rule below retired: **مفترض** is the shipped spelling.)
- **ة and ه distinguished**: المساحة not المساحه. **ي and ى distinguished**: على not
  علي · إلى not الي. These two are the most common defects in Arabic web copy and
  they are the two a reader in this market notices first.
- **No diacritics. None.** This rule replaces an earlier one that allowed them
  "where they disambiguate", and the replacement is the whole point: that licence
  was taken 5,341 times across 87,000 Arabic characters, which is a mark every
  sixteen letters. The client read the result and said it was not comprehensible —
  «عاوزه عربي طبيعي بدون تشكيل للحروف». A professional reading a planning document
  does not read vowelled text, and the density itself was the defect, not any one
  mark.

  **Where a word was ambiguous without its marks, the word is wrong — change the
  word, not the vowelling.** That is the part that matters and the part the old
  rule let us avoid. `لم يُقيَّم` unvowelled is `لم يقيم`, which a reader takes as
  "he did not stay"; the answer is not to restore the shadda but to write
  **لم يخضع للتقييم**, which cannot be misread by anybody. Vowelling is a way of
  propping up a word that is not carrying its own meaning.
- **No transliteration where an Arabic term exists**, and the transliteration in
  brackets after the Arabic where the term is a proper name the reader will meet in
  English on the document in their hand.

---

## 5b. The terms that were translated literally, and what they become

The first Arabic pass translated word for word and produced terms no Dubai
consultant says out loud. A literal translation is not a neutral choice: it makes
the reader stop and decode, and a reader who is decoding is not reading the
refusal the sentence carries. Each row below was wrong in the same way — the
English word had an Arabic cognate, and the cognate was taken instead of the term
the market actually uses.

| English | Was | Is | Why the first one failed |
|---|---|---|---|
| a run | التشغيلة | **الدراسة** | «تشغيلة» is a manufacturing batch. A consultant runs a *study* on a plot; that is the word on the fee proposal. |
| runs | التشغيلات | **الدراسات** | same |
| Run a plot | شغّل قطعة | **ابدأ دراسة** | «شغّل» is operate a machine. Nobody "operates" a plot. |
| capacity | الطاقة | **السعة** | «الطاقة» is energy first. «السعة التطويرية» is the term in a feasibility study. |
| governing capacity | الطاقة الحاكمة | **السعة الحاكمة** | follows the above |
| encoded rules | القواعد المُرمَّزة | **القواعد المسجلة في المحرك** | «مُرمَّزة» reads as *encrypted*, which is the opposite of what this product claims about its rules. |
| it reports | يُبلِّغ | **يعرض** · **يبيّن** | «يُبلِّغ» is to notify an authority — exactly the claim the product refuses. |
| not assessed | لم تُقيَّم | **لم يخضع للتقييم** | unvowelled it reads "did not stay". See §5. |
| a bay | حيّز | **موقف** | «حيّز» is abstract space. A parking bay is a «موقف سيارة» on every drawing. |
| a boundary | الضلع | **الحد** | «ضلع» is a geometric side. An affection plan prints «الحدود». |
| a level | المنسوب | **الدور** | «منسوب» is a datum ELEVATION — a number in metres, which this product also prints. Using it for a storey makes two different things one word. |
| ramp | المنحدر | **المنحدر (الرامب)** first, then المنحدر | The client says «الرامب». Naming it once in both keeps the formal term and lands the meaning. |
| workspace | مساحة العمل | **مساحة العمل** | kept — it is already the term |
| signed in as | داخل باسم | **مسجل الدخول باسم** | «داخل» alone is "inside" |

**The second pass — the rest of the site, settled the same way.** The rows above came
from the parking and dashboard screens; these came from taking every remaining
dictionary through the same two questions: *would a consultant say this out loud*,
and *can it be read with no marks on it*.

| English | Was | Is | Why the first one failed |
|---|---|---|---|
| podium | المصطبة | **البوديوم** | «مصطبة» is a bench or a mastaba. The trade says «بوديوم». |
| tower plate | لوح البرج · بلاطة البرج | **مسطح البرج** | «بلاطة» is a floor *slab* — a structural element this engine does not model. «المسطح» is the plate area, which is what the value is. |
| podium footprint | مسطح المصطبة | **مسطح البوديوم** | follows the above |
| output (singular) | المخرَج | **الناتج** | unvowelled, **المخرج** is an *exit* — on a site whose drawings are full of them. |
| outputs · exports | المخرَجات | **النواتج** · **مخرجات JSON** | the plural is safe; the singular is not |
| the Export step | التصدير | **التصدير** | kept |
| theme (light/dark) | السمة | **الوضع** | «سمة» is a trait. The control switches a *mode*. |
| the Parameters step | الوسائط | **المعطيات** | «وسيط» is a broker or an intermediary first; «معطى» is the given a study starts from. |
| parameter (one) | الوسيط | **المعطى** | same |
| checks | الفحوص | **الفحوصات** | «الفحوص» is a correct plural nobody uses; the market says «الفحوصات». |
| invariants | ثوابت التحقُّق | **فحوصات الحفظ** | «ثابت» is a *constant* — a number. These are checks that a property is preserved. |
| to claim | يدّعي | **يؤكد** | see §2. Unvowelled **يدعيه** reads "he invites him". |
| not measured | لم يُقَس | **لم يخضع للقياس** | bare **لم يقس** is unreadable; same failure as لم يُقيَّم |
| ACCESS road | طريق وصول | **طريق خدمة** | an ACCESS road in the hierarchy is the service tier, not "the road you arrive by" |
| serialiser | المُسلسِل | **وحدة كتابة البيانات (serialiser)** | unvowelled **المسلسل** is a TV serial. Where no trade Arabic exists, describe it and gloss the English once. |
| optimiser output | اختاره المُحسِّن | **ناتج مفاضلة بين بدائل ممكنة** | **المحسن** bare is "the benefactor" |
| USER_SET | مُدخَل من المستخدم | **أنت أدخلته** | see §2 |
| bay area factor | معامل الحيّز | **المساحة الإجمالية لكل موقف** | names the quantity instead of the symbol |
| supply (bays) | العرض | **سعة المواقف** | «العَرض» is also *width*, and the parking page is a column of widths |
| exact (geometry) | مطابق | **يملؤها تماما** · **ينطبق** | «مطابق» is reserved and may appear only negated — §2 |

---

## 6. The domain — Dubai and Gulf planning practice

These are the terms a Dubai consultant uses. Where the market itself uses the English
word on drawings and in submissions, the Arabic is given first and the English is
kept in brackets **on first use in a page** — because a reader holding a Trakhees
sheet needs to match the word on the sheet.

### The plot and the instrument

| English | Arabic |
|---|---|
| plot | قطعة الأرض · القطعة |
| plot number | رقم القطعة |
| community | المجتمع العمراني |
| affection plan | مخطط أفكشن (Affection Plan) |
| title deed | سند الملكية |
| plot area | مساحة القطعة |
| boundary · edge | الحد · الحدود |
| chamfer | الركن المشطوف |
| survey point · vertex | نقطة مساحية · رأس |

### The envelope

| English | Arabic |
|---|---|
| setback | ارتداد (ج. ارتدادات) |
| building line | خط البناء |
| buildable envelope | الغلاف البنائي |
| footprint | مسطح البناء |
| site coverage | نسبة التغطية |
| FAR · floor area ratio | معامل البناء |
| GFA · gross floor area | إجمالي المساحة الطابقية |
| BUA · built-up area | المساحة المبنية |
| net saleable area | صافي المساحة القابلة للبيع |
| height limit | حد الارتفاع |
| storey · level | الدور (ج. الأدوار) — **never «طابق» and never «منسوب»**: «منسوب» is a datum elevation in metres, which this product also prints |
| G+11 | أرضي + 11 |
| podium | البوديوم |
| tower | البرج |
| tower plate | مسطح البرج |
| capacity | السعة |
| massing | الكتلة البنائية |
| unit mix | توزيع الوحدات |
| efficiency | الكفاءة |

### Parking and access — the part the client is buying

| English | Arabic |
|---|---|
| parking | المواقف |
| parking bay | موقف (ج. مواقف) |
| aisle | ممر المناورة |
| cross aisle | الممر العرضي |
| two-way driveway | ممر مركبات ثنائي الاتجاه |
| ramp | المنحدر (الرامب) |
| ramp landing | بسطة المنحدر |
| basement | البدروم · الدور السفلي |
| vehicular access | مدخل المركبات |
| junction | تقاطع |
| road hierarchy | تصنيف الطرق |
| collector road | طريق تجميعي |
| local road | طريق محلي |
| access road | طريق خدمة |
| visitor parking | مواقف الزوار |
| bay area factor | المساحة الإجمالية لكل موقف |
| junction clearance | مسافة الابتعاد عن التقاطع |

### The instruments and the process

| English | Arabic |
|---|---|
| Dubai Building Code | كود دبي للمباني |
| Development Control Regulations | لوائح ضبط التطوير |
| Trakhees | تراخيص |
| professional licence · licence number | الرخصة المهنية · رقم الرخصة — **never «الترخيص»**: «تراخيص» is the authority, and a field named with its word reads as though the number had been checked with it. It has not |
| developer standard | معيار المطور |
| project brief | موجز المشروع |
| rule · encoded rule | قاعدة · قاعدة مسجلة في المحرك |
| clause | بند |
| clause reference | الإشارة إلى البند |
| citation | استشهاد · مرجع |
| regulatory instrument | الوثيقة النظامية |
| gate (G1–G4) | بوابة |
| invariant | فحص الحفظ (ج. فحوصات الحفظ) |
| run | الدراسة |
| export (the file) · to export | الناتج · التصدير |
| provenance | مصدر الاشتقاق |
| derivation | الاشتقاق |
| life safety | سلامة الأرواح |
| egress | مسارات الإخلاء |
| travel distance | مسافة الانتقال |

**Where a term is not in this table and no settled Arabic exists**, use the Arabic
description and put the English in brackets once. Do not invent a neologism, and do
not transliterate silently — a reader who cannot map the word back to the drawing in
front of them has been given a word rather than a meaning.

---

## 7. What a reviewer checks — the full list

1. Does any Arabic sentence predicate **مطابق** of an output? → defect.
2. Is **افتراضي** used anywhere for ASSUMED? → defect; it means "default".
3. Is a basis string, formula, rule id or parameter id translated, or rendered
   outside `Verbatim`? → defect.
4. Does a refusal carry a hedge (**قد**، **ربما**، **عادة**)? → defect.
5. Are digits Arabic-Indic anywhere? → defect.
5b. **Does any shipped string carry a diacritic** (U+064B–U+0652, U+0670)? → defect,
   with no exceptions. Count it with a Unicode-aware matcher — a GNU `grep` bracket
   expression gives false positives on UTF-8 Arabic and once reported 169 marked
   lines in a file that had none. U+0640 (tatweel) is **not** a diacritic: it is the
   connector in `الـ${value}` and is allowed.
6. Does the Arabic omit a clause the English carries? → defect. This is the one that
   is hardest to see and worst to ship.
7. **Is any word colloquial rather than فصحى?** Check §5's table by name. → defect.
8. **Is a domain term translated by its dictionary meaning rather than its trade
   meaning?** *ارتداد* is not *تراجع*; *معامل البناء* is not *نسبة الأرضية*; a
   *موقف* is not a *مكان وقوف*. A consultant reading the wrong term concludes the
   product does not know the field, and stops reading. → defect.
9. **ة/ه and ي/ى**, everywhere. → defect.
10. **Does a sentence a test grips span a string break?** A concatenated literal is
   one string at runtime and two in the source, and `arabic.test.ts` and the page
   tests read the source. Keep a negation and the word it negates — and any phrase
   asserted by `toContain` — on one line.
