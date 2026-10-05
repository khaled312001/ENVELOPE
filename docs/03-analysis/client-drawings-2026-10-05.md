# What the client's own drawings specify — 5 October 2026

He sent four images with one sentence: the A-101 parking sheet TOP.ai produces is
*«مش مظبوط»*, and it should look like these.

> *"فى طريقة التوزيع والرسم ground floor وتوضح الرامب والمدخل والـcore، فى أى رسم أو ثلاثى
> أبعاد احترافى مش معقد — podium — Calculations"*

This is the most precise brief received so far. It is a **worked scheme with real numbers**,
which is what makes it testable rather than aspirational.

---

## 1. The scheme

One plot, four drawings, all consistent:

| | |
|---|---|
| Plot area | **1,365.23 m²** |
| Footprint | **50.85 m × 26.65 m** (= 1,355.15 m², so the plot is very slightly larger) |
| Setback marks | **1.00 m** at each corner |
| Permitted GFA | **4,778.305 m²** → FAR **3.50** |
| Proposed GFA | **4,777.53 m²** — 99.98% of permitted |

The scheme is a ground floor plus two podium levels plus seven typical floors plus a roof
level, and it reaches the permitted GFA almost exactly. That is a real consultant's output,
not a demo, and it is the right thing to test the engine against.

---

## 2. What the ground floor drawing contains, and what ours does not

His ground floor (image 2) carries, inside the same 50.85 × 26.65 rectangle:

| Element | Ours today |
|---|---|
| Parking bays along the top edge and down the right edge | ✅ drawn, but as two flat rows in the middle |
| **A sloped parking ramp at 4%, curved, wrapping the core** | ❌ ours is a straight rectangle, and §2.2 of the meeting note says it climbs the wrong way |
| **ENTRANCE** — a labelled pedestrian lobby on the street side | ❌ nothing |
| **LIFT LOBBY** with two lifts and two staircases, drawn as a linear bar through the middle | ⚠️ we draw a core OUTLINE with no lift, stair, riser or wall, and say so under the drawing |
| **GENERATOR RM** | ❌ |
| **LV ROOM** and the substation, together in the top-left corner on the street | ❌ — now citable, see the DEWA note |
| **TEL. RM**, **MN RM**, **CONTROL RM** | ❌ |
| **PUMP ROOM**, **WATER TANK** | ❌ |
| **GARBAGE** | ❌ |
| **SHOP** — a commercial tenancy at the street corner | ❌, and the GFA table prices it separately |
| Dimension strings on all four sides | ✅ |

The plant rooms are §3.4 of the meeting note. The **SHOP** is new and it is not decoration:
the GFA table splits commercial from residential, which means a ground-floor tenancy changes
which cap a level is measured against.

**The ramp is the single biggest difference.** His is a continuous sloped surface that cars
drive along while parked bays sit either side of it — the ramp *is* the circulation. Ours
treats the ramp as a separate rectangle and the aisles as another. That is why the two
drawings do not look alike even where the bay count agrees.

## 3. The podium level is a racetrack

Image 3 is a typical podium parking level, and it is a different animal from the ground floor:

- Bays line **all four edges**, continuous.
- The middle is a **sloped parking ramp at 4%, drawn as a closed oval** — a racetrack. Cars
  circulate around it and it climbs the full floor-to-floor over one lap.
- The core sits inside the oval, with bays packed into the island around it (numbered 33, 34,
  35 …).
- Every bay is numbered, continuing the sequence from the level below.

This is a **ramped-floor** car park, not a flat floor with a ramp attached to it. The two are
different enough that the engine's current model — a rectangle packed with modules plus an
aisle network plus a ramp — cannot produce it by adjusting parameters. It would need the
level's floor to be a helical surface and the bays to sit on it.

That is a significant piece of work and it should be scoped as one, not slipped in.

---

## 4. The calculation table

Image 4 is three stacked tables, and this is the *«Calculations»* in his message. It is the
closest thing received to a specification of what the capacity output should look like.

**Commercial G.F.A.**

| | |
|---|---|
| Plot area | 1,365.23 m² |
| Gross floor area allowed | 60.00 m² |
| Total proposed | 60.00 m² |

**Residential G.F.A.** — allowed 4,718.305 m²

| # | Description | Area |
|---|---|---|
| 1 | Ground floor | 118.00 m² |
| 2 | Podium floor area | 50.54 × 2 = 101.08 m² |
| 3 | 1st floor | 652.23 m² |
| 4 | Typical floor 02/04/06 | 625.55 × 3 = 1,876.66 m² |
| 5 | Typical floor 03/05/07 | 625.55 × 3 = 1,876.66 m² |
| 6 | Roof floor | 92.90 m² |
| | **Total** | **4,717.53 m²** |

**Total G.F.A.** — allowed 4,778.305, proposed 4,777.53 (60.00 + 4,717.53).

Five things follow, and they are the actionable part of this document:

1. **GFA is reported per level, not as one figure.** Ours publishes a governing capacity and
   a plate; his publishes a schedule that sums to it. `LevelSchedule` already names the
   levels — `B2, B1, G, P1, L03` — so the data exists and the output does not.
2. **Levels are grouped, and the grouping is the drawing's.** "Typical floor 02/04/06" is one
   row for three identical plates. Ours would print seven rows.
3. **Commercial and residential are capped separately and summed at the end.** This is a
   second cap the engine does not model, and the ground floor is where the two meet.
4. **The ground floor contributes 118.00 m² of residential GFA** out of a 1,355 m² footprint.
   The rest is parking, plant and the shop — none of which counts. That number is the clearest
   statement yet of what the ground floor actually *is* in a Dubai residential scheme, and it
   is nothing like a full plate.
5. **The roof floor counts.** 92.90 m², which is a stair head and lift motor room. Ours has no
   roof level at all.

He also showed, on 4 Oct at 31:49–32:36, that he wants efficiency expressed as saleable over
built-up — and this table is the denominator he means. That is still open question §7.1 and
this does not close it, because the table states GFA per level and not saleable area.

---

## 5. What his A-101 critique actually is

Reading image 1 against image 2, the gap is not bay count or dimensioning — those are right.
It is that our sheet draws **four things** (bays, aisles, a ramp, a core outline) on an empty
rectangle, and his draws **a building**: rooms with names, an entrance somebody walks through,
a ramp that is also the driveway, and a core with lifts in it.

The honest reading of *«مش مظبوط»* is therefore **not** "the geometry is wrong". It is "this
is not yet a ground floor plan". Two of the missing pieces are now buildable with citations
(the substation and the LV room, from DEWA §11.3/§11.4), one needs rules he has not sent (the
refuse room), and one is a model change rather than a drawing change (the ramp).

---

## 6. Priority this sets

1. **The ramp direction defect** (meeting §2.2) — it is wrong in the DXF, not only on screen.
2. **The per-level GFA schedule** (§4 above). Pure output work over data the engine already
   has, and it is the thing he called *«Calculations»*.
3. **The ground-floor plant rooms**, starting with the two DEWA now lets us place correctly.
4. **The entrance and the core's lifts and stairs** — currently `notModelled`, and he named
   the core *«الأهم»* on 4 Oct.
5. **The racetrack podium** — the largest, and the one to scope separately rather than
   approximate.
