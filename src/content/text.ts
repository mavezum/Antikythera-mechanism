/**
 * All educational copy, separate from engine code (spec §5.1, §5.10).
 * Content is real HTML text in the DOM (never baked into the canvas), so a
 * screen reader gets the full substance (spec §5.11).
 */

export interface TourStep {
  title: string;
  html: string;
  /** camera position + look-at target, mechanism millimetres */
  camera: { pos: [number, number, number]; target: [number, number, number] };
  isolate?: string | null;
  explode?: number;
  xray?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: 'The world’s first computer',
    html: `<p>Around 2,100 years ago, a Greek workshop built a shoebox-sized bronze machine
      that <em>computed the heavens</em>. Recovered from a shipwreck off the island of
      Antikythera in 1901, it is the most sophisticated device known from antiquity —
      nothing of comparable complexity appears again for over a thousand years.</p>
      <p>This is a working reconstruction. Everything you'll see is driven by one hand
      crank through the very gear ratios found inside the original.</p>`,
    camera: { pos: [180, 60, 300], target: [0, 10, 0] },
    isolate: null,
    explode: 0,
  },
  {
    title: 'One crank drives everything',
    html: `<p>The only input is this small hand crank. One turn advances time by about
      78 days. It spins the four-spoked <strong>great wheel b1</strong> — one revolution
      per year — and from there, gear trains branch out to every display.</p>
      <p><strong>Try it later:</strong> drag the crank, or press the ← → arrow keys.</p>`,
    camera: { pos: [220, 60, 160], target: [60, 52, 20] },
    isolate: 'sun',
    explode: 0,
  },
  {
    title: 'The front: a mechanical cosmos',
    html: `<p>The front dial shows the sky. Two rings: the Greek <strong>zodiac</strong>
      (inner, fixed) and the movable 365-day <strong>Egyptian calendar</strong> (outer).
      Pointers carry the <strong>Sun</strong>, the <strong>Moon</strong> — with a little
      half-black ball that turns to show its phase — and the five planets known to
      antiquity: Mercury, Venus, Mars, Jupiter and Saturn.</p>
      <p>The planetary layout follows the 2021 UCL "Cosmos" reconstruction; it is a
      scholarly hypothesis, marked as such throughout.</p>`,
    camera: { pos: [0, 60, 260], target: [0, 52, 30] },
    isolate: null,
    explode: 0,
  },
  {
    title: 'The Moon’s clever gearing',
    html: `<p>The Moon train multiplies the year by <strong>254/19</strong> — exactly the
      number of sidereal months in the 19-year cycle — using a 127-tooth gear: 127 is
      half of 254, a prime the builders had to cut tooth by tooth.</p>
      <p>Better still, the Moon doesn't move uniformly. A <strong>pin-and-slot</strong>
      pair of gears on slightly offset axes speeds the Moon up near perigee and slows it
      near apogee — the first lunar anomaly, in bronze, 2,000 years before calculus.</p>`,
    camera: { pos: [120, -40, 160], target: [0, 20, 0] },
    isolate: 'moon',
    explode: 0.35,
    xray: true,
  },
  {
    title: 'Inside: the epicyclic platform',
    html: `<p>The pin-and-slot pair rides on a big 223-tooth carrier wheel that itself
      turns once every ~8.85 years — the precession of the Moon's orbit — so the
      anomaly stays keyed to the Moon's true perigee. This "gears riding on gears"
      trick (epicyclic gearing) wasn't seen again until medieval clockwork.</p>
      <p>Use the <strong>Explode</strong> slider and <strong>Slice</strong> anytime to
      look inside like this.</p>`,
    camera: { pos: [60, -80, 140], target: [0, 15, -5] },
    isolate: 'moon',
    explode: 0.75,
    xray: true,
  },
  {
    title: 'The back: calendars…',
    html: `<p>The upper back dial is the <strong>Metonic spiral</strong>: 235 months
      spiral through five turns, because 235 lunar months fit 19 solar years almost
      perfectly. It kept lunar and solar calendars in step.</p>
      <p>Inside it: the <strong>Callippic</strong> dial (a 76-year refinement) and the
      <strong>Games</strong> dial — which Olympiad year it is, and which Panhellenic
      games are on. Yes: the machine that predicted eclipses also told you when the
      Olympics were.</p>`,
    camera: { pos: [-60, 140, -260], target: [0, 100, -30] },
    isolate: 'metonic',
    explode: 0,
    xray: false,
  },
  {
    title: '…and eclipses',
    html: `<p>The lower back dial is the <strong>Saros spiral</strong>: 223 months, the
      period after which eclipses repeat. Cells marked <strong>Σ</strong> warn of a
      lunar eclipse that month; <strong>Η</strong> of a solar one.</p>
      <p>Because a Saros is 8 hours longer than a whole number of days, the small
      <strong>Exeligmos</strong> dial says how many hours to add (0, 8 or 16) — a
      correction of astonishing subtlety for the era.</p>`,
    camera: { pos: [60, -140, -260], target: [0, -80, -30] },
    isolate: 'saros',
    explode: 0,
  },
  {
    title: 'Ancient answers, ancient errors',
    html: `<p>Important: this simulation shows what the <em>device itself</em> computes —
      not the modern sky. Its cycles are excellent but not perfect: the Metonic relation
      drifts a few hours per cycle, the pin-and-slot is an approximation of the Moon's
      true motion, and the planetary models are ancient period relations.</p>
      <p>Over centuries the pointers slowly drift from reality — exactly as the real
      mechanism's would have. That drift is part of the history, so we show it honestly
      rather than correcting it.</p>`,
    camera: { pos: [-160, 40, 280], target: [0, 30, 0] },
    isolate: null,
    explode: 0,
  },
  {
    title: 'Explore!',
    html: `<p>You have the whole machine:</p>
      <ul>
        <li><strong>Drag the crank</strong> (or ← →) to move time by hand.</li>
        <li><strong>Play</strong> a time-lapse and watch the Moon's phase cycle.</li>
        <li><strong>Jump to a date</strong> — try your birthday, or today.</li>
        <li><strong>Explode / Slice / X-ray</strong> to see the trains.</li>
        <li><strong>Click any dial</strong> to isolate the gears that drive it.</li>
        <li>Open the <strong>Glossary</strong> for deep dives on every dial.</li>
      </ul>`,
    camera: { pos: [180, 60, 300], target: [0, 10, 0] },
    isolate: null,
    explode: 0,
    xray: false,
  },
];

export interface GlossaryEntry {
  term: string;
  def: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: 'Synodic month', def: 'New moon to new moon: the Moon’s phase cycle, about 29.53 days. The unit counted by the Metonic and Saros dials.' },
  { term: 'Sidereal month', def: 'The Moon’s return to the same stars, about 27.32 days. There are exactly 254 of these in the mechanism’s 19-year cycle.' },
  { term: 'Anomalistic month', def: 'Perigee to perigee, about 27.55 days — the period of the Moon’s speeding up and slowing down, reproduced by the pin-and-slot device.' },
  { term: 'Metonic cycle', def: '19 years = 235 synodic months (Meton of Athens, 432 BC), accurate to a couple of hours. Basis of Greek lunisolar calendars — and the upper back spiral.' },
  { term: 'Callippic cycle', def: '4 Metonic cycles minus one day = 76 years (Callippos, ~330 BC): a refinement that fixes the Metonic cycle’s quarter-day error.' },
  { term: 'Saros', def: '223 synodic months ≈ 18 years 11⅓ days. Sun, Moon and lunar nodes nearly realign, so eclipses repeat. Known to Babylonian astronomers centuries earlier.' },
  { term: 'Exeligmos', def: '"Turning of the wheel": three Saros = 54 years and about 1 month. Because each Saros carries a ⅓-day remainder, the Exeligmos brings eclipses back to roughly the same local time.' },
  { term: 'Lunar anomaly', def: 'The Moon moves up to ~6° ahead of or behind its average position because its orbit is eccentric. Hipparchos modelled this; the mechanism computes it with the pin-and-slot gears.' },
  { term: 'Pin-and-slot', def: 'Two gears on axes offset ~1 mm; a pin on one rides in a radial slot of the other. Uniform rotation in, periodically varying rotation out.' },
  { term: 'Epicyclic gearing', def: 'Gears mounted on a wheel that itself rotates (here: k1/k2 riding the 223-tooth carrier e3). Reappears in Western technology only ~1,300 years later.' },
  { term: 'Zodiac', def: 'The 12 constellations along the ecliptic, each assigned 30° on the front dial. The mechanism labels Libra "ΧΗΛΑΙ" — the Claws (of the Scorpion).' },
  { term: 'Egyptian calendar', def: 'Exactly 365 days: twelve 30-day months plus 5 "epagomenal" days. No leap years, so it wanders ¼ day per year — the front ring is movable to compensate.' },
  { term: 'Ecliptic longitude', def: 'Position along the Sun’s apparent path, measured in degrees from the first point of Aries. What the front pointers display.' },
  { term: 'Node', def: 'Where the Moon’s orbit crosses the ecliptic. Eclipses only happen when new/full moon occurs near a node — the rhythm encoded in the Saros dial’s glyphs.' },
  { term: 'Period relation', def: 'A statement like "Venus: 289 synodic cycles in 462 years". Babylonian astronomy perfected these; the mechanism turns them into gear ratios.' },
  { term: 'Olympiad', def: 'The 4-year cycle of the Olympic games, used by Greeks as a calendar era. The back Games dial counts it: ΟΛΥΜΠΙΑ, ΝΕΜΕΑ, ΙΣΘΜΙΑ, ΠΥΘΙΑ (and local games at Dodona and Rhodes).' },
  { term: 'Parapegma', def: 'A star calendar. Inscribed plates flanking the front dial listed star risings/settings through the year (not modelled in 3D here; see the deep dives).' },
  { term: 'Great wheel (b1)', def: 'The four-spoked ~224-tooth wheel behind the front dial: one turn per year, the mechanical "mean Sun" from which every train is derived.' },
];

export interface DeepDive {
  id: string;
  title: string;
  html: string;
}

export const DEEP_DIVES: DeepDive[] = [
  {
    id: 'front',
    title: 'Front dial — the Cosmos',
    html: `<p>The front face is a planetarium in two rings. The fixed inner ring is the
      <strong>zodiac</strong>, divided into twelve 30° signs with Greek names. The outer
      ring is the <strong>Egyptian civil calendar</strong> of exactly 365 days — the
      astronomers' calendar of the Hellenistic world. Because the real year is about
      365¼ days, the ring was made movable: pull it out, rotate a quarter of a day's
      worth, and the calendar is corrected. (This simulation keeps it aligned for you.)</p>
      <p>Against these rings move the <strong>Sun pointer</strong> (which also reads the
      date), the <strong>Moon pointer</strong> with its rotating two-tone phase ball, and
      — following the 2021 reconstruction — beads for <strong>Mercury, Venus, Mars,
      Jupiter and Saturn</strong> on concentric rings, computed by ancient period
      relations (e.g. Venus: 289 synodic cycles in 462 years, a relation actually
      inscribed on the front cover).</p>
      <p class="cite">Freeth &amp; Jones 2012; Freeth et al. 2021 (planets — hypothesis).</p>`,
  },
  {
    id: 'moon',
    title: 'The Moon: 254/19 and the pin-and-slot',
    html: `<p>The lunar train turns the Moon pointer 254 times per 19 years — the exact
      sidereal relation of the Metonic cycle — through gears of 64, 38, 48, 24, 127 and
      32 teeth: (64/38)·(48/24)·(127/32) = 254/19. The 127-tooth wheel is half of 254.</p>
      <p>The stroke of genius is the <strong>pin-and-slot</strong>: gears k1/k2 ride on
      the slowly turning 223-tooth carrier e3. k1 carries a pin engaging a radial slot
      in k2, whose axis is offset about a millimetre. The output therefore runs fast,
      then slow, once per <em>anomalistic</em> month (~27.55 d) — Hipparchos' first
      lunar anomaly (~±5°). And because the carrier itself revolves once per ~8.85
      years, the anomaly's slow drift (the precession of the lunar apsides) is built in
      too. The phase ball near the pointer tip rotates once per synodic month:
      black = new, bright = full.</p>
      <p class="cite">Freeth et al. 2006, Nature 444.</p>`,
  },
  {
    id: 'metonic',
    title: 'Metonic dial — 235 months in five turns',
    html: `<p>19 solar years and 235 lunar months differ by only about two hours, a
      coincidence (known in Babylon, formalised by Meton in 432 BC) that underpins every
      Greek lunisolar calendar. The upper back dial spends it beautifully: the pointer's
      rider crawls along a five-turn spiral of 235 month cells (one cell ≈ one lunar
      month, labelled with Corinthian month names on the original), then is reset to the
      start.</p>
      <p>The drive is exact: b2(64)→l1(38), l2(53)→m1(96), m2(15)→n1(53) gives
      5/19 of a turn per year — five full turns in 19 years.</p>
      <p class="cite">Freeth et al. 2006; month names Freeth et al. 2008.</p>`,
  },
  {
    id: 'callippic',
    title: 'Callippic dial — the 76-year refinement',
    html: `<p>The Metonic cycle is 1/76 of a day too long per year. Callippos of Cyzicus
      (~330 BC) fixed it: take four Metonic cycles (76 years) and drop one day. The
      small dial inside the Metonic spiral counts which 19-year quarter of the 76-year
      cycle you are in, turning once per 76 years via n3(15)→p1(60), p2(12)→q1(60).</p>
      <p><em>Honesty note:</em> no fragment of this dial survives; it is restored from
      the inscriptions' references and the surviving gearing. Like the planets, it is a
      well-argued hypothesis.</p>
      <p class="cite">Freeth et al. 2006/2012.</p>`,
  },
  {
    id: 'games',
    title: 'Games dial — the Olympiad clock',
    html: `<p>Decoded only in 2008: a little four-sector dial whose pointer turns once
      every four years — <em>anticlockwise</em>, uniquely in the mechanism — naming the
      Panhellenic festivals of each year: <strong>ΟΛΥΜΠΙΑ</strong> (Olympia),
      <strong>ΝΕΜΕΑ</strong> (Nemea), <strong>ΙΣΘΜΙΑ</strong> (Isthmia),
      <strong>ΠΥΘΙΑ</strong> (Delphi), plus ΝΑΑ (Dodona) and ΑΛΙΕΙΑ (Rhodes).</p>
      <p>Its presence tells us the device wasn't a dry ephemeris: it tied the heavens to
      civic life. The Greeks dated history itself in Olympiads.</p>
      <p class="cite">Freeth, Jones, Steele &amp; Bitsakis 2008, Nature 454.</p>`,
  },
  {
    id: 'saros',
    title: 'Saros dial — predicting eclipses',
    html: `<p>If an eclipse happens today, wait 223 lunar months (18 years 11⅓ days) and
      a near-identical one recurs. The lower back spiral counts those 223 months in four
      turns. A month cell marked <strong>Σ</strong> (ΣΕΛΗΝΗ, Moon) predicts a lunar
      eclipse; <strong>Η</strong> (ΗΛΙΟΣ, Sun) a solar one; original glyphs also gave
      the predicted hour.</p>
      <p>The distribution of glyphs in this simulation is generated from the eclipse-year
      arithmetic (38 eclipse possibilities of each kind per Saros) rather than copied
      cell-by-cell from the fragmentary inscriptions — see the README for the
      difference.</p>
      <p>The drive runs through the 223-tooth wheel e3 — the same wheel that carries the
      lunar anomaly gears: one wheel, two jobs, zero waste.</p>
      <p class="cite">Freeth et al. 2006; eclipse scheme Freeth et al. 2008.</p>`,
  },
  {
    id: 'exeligmos',
    title: 'Exeligmos dial — the 8-hour correction',
    html: `<p>A Saros is 6585⅓ days: the ⅓ matters. An eclipse that repeats after one
      Saros happens 8 hours later in the day; after two, 16 hours; after three
      (the 54-year <em>Exeligmos</em>), it's back to roughly the original hour. The tiny
      three-sector dial inside the Saros spiral supplies exactly that correction: add
      0, 8 (Η) or 16 (ΙϚ) hours to the glyph's stated time.</p>
      <p>Think about what this means: the builders tracked their prediction error in
      <em>hours across half a century</em>.</p>
      <p class="cite">Freeth et al. 2006/2008.</p>`,
  },
  {
    id: 'planets',
    title: 'Planets — the 2021 “Cosmos” hypothesis',
    html: `<p>Only about a third of the mechanism survives, and no planetary gearing is
      among the fragments. But the front-cover inscription counts planet cycles —
      <strong>462 years for Venus, 442 for Saturn</strong> — and fittings on the main
      wheel point to lost epicyclic assemblies. Freeth et al. (2021) proposed a compact
      pin-and-slot design driving all five planets on concentric ring displays; that is
      what this simulation follows, using their period relations
      (Mercury 1513:480, Venus 289:462, Mars 133:284, Jupiter 315:344, Saturn 427:442).</p>
      <p>The pointers reproduce each planet's mean motion <em>and</em> retrograde loops,
      anchored to real mean longitudes at the 205 BC epoch — then left to run on the
      ancient ratios. It is clearly labelled a hypothesis: a plausible, source-based
      reconstruction, not a fact about the artefact.</p>
      <p class="cite">Freeth et al. 2021, Scientific Reports 11:5821.</p>`,
  },
  {
    id: 'accuracy',
    title: 'Accuracy — what this simulation shows (and doesn’t)',
    html: `<p>Every reading here is <strong>the ancient machine's own output</strong>,
      driven purely by its gear ratios from a documented epoch (the new moon of
      28 April 205 BC, the proposed start-up date of its Saros dial). It is
      <em>not</em> a modern ephemeris:</p>
      <ul>
        <li>The device's year is 365¼ days; its months come from the Metonic relation.
        Both are excellent, and both drift over centuries.</li>
        <li>The Moon's variable speed is Hipparchos' first anomaly only; the planets are
        ancient period relations with idealised epicycles.</li>
        <li>Eclipse glyphs mark <em>possibilities</em> in the Saros arithmetic, not
        certainties for your location.</li>
      </ul>
      <p>So if you jump to today, you'll see roughly the right sky — plus the honest
      accumulated error of two thousand years of ancient arithmetic. That error is the
      most historically truthful thing on screen.</p>`,
  },
];

export const ABOUT_HTML = `
  <p><strong>An interactive reconstruction of the Antikythera mechanism</strong> — the
  geared astronomical calculator built in the Greek world around the 2nd century BC and
  recovered from a Roman-era shipwreck in 1901.</p>
  <p>The simulation is mechanically faithful: a single crank input drives every pointer
  through the published gear ratios (Freeth et al. 2006/2008/2012; planets per Freeth
  et al. 2021 — a labelled hypothesis). Readings are the ancient device's own
  computations, including its historical inaccuracies; they are not modern astronomical
  data.</p>
  <p>Built with Three.js. All geometry is procedural; no external services, no tracking,
  no cookies.</p>`;

export const CAVEAT_SHORT =
  'Shows the ancient device’s own computations — not the modern sky. Planets: 2021 reconstruction (hypothesis).';
