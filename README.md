# Antikythera Mechanism — Interactive 3D Web Simulation

A mechanically faithful, browser-based 3D reconstruction of the Antikythera
mechanism, the ~2nd-century BC Greek geared astronomical calculator. One hand
crank drives every dial through the **published gear ratios**, so the outputs
are exactly what the ancient device itself would compute — including its
small, historically real deviations from modern astronomy.

Built to the spec in
[`Antikythera-Mechanism-Web-Simulation-Requirements.md`](./Antikythera-Mechanism-Web-Simulation-Requirements.md).

**Features**

- Full front "Cosmos" display: Greek zodiac ring, movable 365-day Egyptian
  calendar ring, Sun pointer (doubling as date pointer), Moon pointer with a
  rotating phase ball and the pin-and-slot lunar anomaly, and the five
  classical planets (per the 2021 UCL reconstruction — labelled a hypothesis).
- All five back dials: Metonic (5-turn spiral, 235 cells), Callippic,
  Games/Olympiad (runs anticlockwise, as on the artefact), Saros (4-turn
  spiral with Σ/Η eclipse glyphs) and Exeligmos (0/8/16 h correction).
- Drive it by dragging the crank (or ← / → keys), jump to any date
  (astronomical BC/AD), play/pause an adjustable time-lapse, or snap to today.
- See inside: exploded view, movable cross-section slice, X-ray mode, and
  per-dial gear-train isolation (click a dial or use the *isolate* menu).
- Learn: 9-step guided tour with camera flights, hover tooltips on every part,
  a glossary and per-dial deep dives — all real, screen-readable HTML.
- Purely static client-side app (Vite + TypeScript + Three.js, all geometry
  procedural, no external requests). Fits the Netlify free tier; total
  transfer ≈ 160 kB gzipped.

## Run / build / test

```bash
npm install
npm run dev        # local dev server
npm test           # kinematics/calendar test suite (vitest)
npm run build      # typecheck + production bundle in dist/
npm run preview    # serve the production build locally
```

Deploy: push to the production branch with the included `netlify.toml`
(build command `npm run build`, publish `dist/`, security headers + CSP).
No functions, no environment variables, no secrets.

`scripts/screenshot.mjs` and `scripts/interact.mjs` are headless-Chromium
smoke tests used during development (`node scripts/screenshot.mjs <outdir>`
against `npm run preview`).

## Architecture

```
src/
  model/            the single kinematic model (no rendering)
    gearData.ts     gear scheme as data: tooth counts, mesh graph, citations
    kinematics.ts   exact rational gear rates; pin-and-slot geometry;
                    planet epicycles; full MechanismState per time value
    calendar.ts     JDN <-> Gregorian/Julian/Egyptian; epoch constants
    epoch.ts        pointer phases at the 205 BC epoch (Meeus mean elements)
  scene/            Three.js rendering, driven by MechanismState
    layout.ts       stylised axis positions; per-mesh tooth modules
    gearFactory.ts  procedural gear geometry + materials
    dials.ts        canvas-texture dial faces + pointers
    mechanism.ts    assembly, exploded view, x-ray, isolation
  content/text.ts   tour steps, glossary, deep dives (editable copy)
  ui/ui.ts          controls, readings panel, tour, modals, tooltips
  sim.ts            master time state (years since epoch)
  main.ts           renderer, camera, interaction, frame loop
tests/ratios.test.ts  verifies every published cycle EXACTLY (see below)
```

**Single source of truth for motion** (spec §5.10): `mechanismState(tYears)`
computes every gear angle *and* every numeric reading from one input. The
constant-ratio trains are solved over the mesh graph in `gearData.ts` using
exact BigInt rationals; the picture and the numbers cannot disagree. The
pin-and-slot (variable lunar speed) and the planets (epicycles) are computed
geometrically, since they are not constant ratios.

## The gear model and its sources

Tooth counts and topology follow the standard published reconstruction:

- Freeth, Bitsakis, Moussas, Seiradakis *et al.* (2006), *Nature* 444:587-591 —
  "Decoding the ancient Greek astronomical calculator known as the Antikythera
  Mechanism" (gear scheme, spiral back dials, pin-and-slot lunar anomaly).
- Freeth, Jones, Steele & Bitsakis (2008), *Nature* 454:614-617 — the
  Olympiad/Games dial and the Saros eclipse scheme.
- Freeth & Jones (2012), ISAW Papers 4 — "The Cosmos in the Antikythera
  Mechanism" (consolidated gearing table, front display).
- Freeth *et al.* (2021), *Scientific Reports* 11:5821 — "A Model of the Cosmos
  in the ancient Greek Antikythera Mechanism" (planet period relations:
  Mercury 1513:480, Venus 289:462, Mars 133:284, Jupiter 315:344,
  Saturn 427:442 — the planetary display is this paper's hypothesis).

Every cycle is asserted exactly in `tests/ratios.test.ts`:

| Cycle | Train result | Test |
|---|---|---|
| Moon sidereal | 254/19 rev/yr | exact rational equality |
| Synodic months | 235/19 per yr | exact |
| Metonic pointer | 5/19 turn/yr (5 turns / 235 cells) | exact |
| Callippic | 1/76 turn/yr | exact |
| Games | 1/4 turn/yr, opposite sense | exact + sign |
| Saros | 940/4237 turn/yr (4 turns / 223 months) | exact |
| Exeligmos | 235/12711 turn/yr (1 turn / 3 Saros) | exact |
| Apsidal carrier e3 | 477/4237 rev/yr (~8.88 yr) | exact |
| Anomalistic month | ≈ 27.55 d | numeric |
| Crank | 1 turn ≈ 78 days (a1 48 : b1 224) | numeric |

## Design decisions (spec §7 open questions)

1. **Epoch** — the Saros-dial start-up of **28 April 205 BC** (new moon;
   proleptic Julian; JDN 1 646 665), per Carman & Evans (2014). At t = 0 the
   spiral pointers stand at cell 1 and the Sun/Moon/planet pointers are
   anchored to their *mean* longitudes on that date (computed from modern mean
   elements — Meeus — as the calibration an ancient maker would have set by
   observation). From there the simulation advances **only** by gear ratios,
   with the device's own year of 365¼ days, so readings drift from a modern
   ephemeris exactly as the artefact's would. Jumping to "today" shows the Sun
   about 17° behind the real sky — that is the genuine ~2,200-year error of
   the ancient calibration, deliberately preserved (spec §2 non-goals).
2. **Reconstruction variant** — Freeth *et al.* 2006/2008/2012 for the core,
   Freeth *et al.* 2021 for the planets. b1 is modelled with 224 teeth
   (223-226 possible from the fragments; noted in `gearData.ts`). The
   Callippic dial and the whole planetary display are flagged as conjectural
   in the UI copy.
3. **Eclipse glyphs** — generated from the Saros arithmetic (38 lunar + 38
   solar eclipse possibilities at 223/38-month node intervals; coincident
   cells carry both glyphs), *not* the epigraphic cell-by-cell dataset, which
   is fragmentary and debated (2008 vs. revised readings). Swapping in a
   literal dataset later only requires replacing `sarosGlyphs()` in
   `kinematics.ts`.
4. **Analytics** — none. No cookies, no external requests of any kind
   (enforced by the CSP in `netlify.toml`), hence no consent banner.
5. **Domain** — ships on the default `*.netlify.app` subdomain unless a custom
   domain is configured later.
6. **Subsystem isolation depth** — implemented for all eight display trains
   (click a dial or use the isolate menu); combines with explode/slice/x-ray.
7. **Timeline** — n/a.

Other documented choices:

- **Zodiac read tropically** (longitudes from the equinox of date at epoch);
  the dial's 12 × 30° signs are idealised (the artefact's ring has slightly
  uneven divisions).
- **Egyptian ring auto-alignment**: the real ring is manually movable to
  correct the ¼-day annual drift; the simulation performs that correction
  continuously, as a diligent ancient user would (`dials.ts`).
- **Sun pointer = mean Sun**, also serving as the date pointer.
- **Pin-and-slot** modelled with slot-offset ratio d/r = 0.0875, reproducing
  Hipparchos' first lunar anomaly (~±5°), zeroed at the apsides and phased by
  the Moon's mean anomaly at epoch; the carrier's 8.88-year precession comes
  from the real 477/4237 gearing.
- **Games dial phase**: Olympiad years run midsummer–midsummer; the epoch
  (April 205 BC) is placed in year 3 of its Olympiad. The 4-year rate is
  exact; the sector phase is cosmetic and documented in `epoch.ts`.
- **Layout is stylised**, not metrological: arbor positions echo the published
  drawings and every meshing pair's tooth module is derived from its real
  on-screen axis distance, so pitch circles touch and teeth interlock — but
  positions are not fragment measurements (spec §2 non-goals).

## Accuracy caveat (spec use case 14)

A persistent on-screen note, the About dialog and the "Accuracy" deep dive all
state: the dials show the **ancient device's own computations** — Metonic
arithmetic, Hipparchan lunar theory, Babylonian-derived planet cycles — not
modern astronomy, and the planetary display is a 2021 scholarly hypothesis.

## Accessibility

Keyboard: `←/→` crank (⇧ for a month), `Space` play/pause, `F/B/S` views,
`E` explode, `X` x-ray, `T` tour, `G` glossary, `Esc` close/clear. All
educational content is real HTML; `prefers-reduced-motion` disables camera
flights and animated date jumps.

## License

MIT (see `LICENSE`).
