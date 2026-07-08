/**
 * Calendar utilities: proleptic Gregorian/Julian <-> Julian Day Number (JDN),
 * the Egyptian civil calendar (exact 365-day wandering year), and the
 * mechanism's reference epoch.
 *
 * Epoch decision (spec §7, Open Question 1):
 * We anchor the simulation at the start-up date of the Saros dial proposed by
 * Carman & Evans (2014), "On the epoch of the Antikythera mechanism and its
 * eclipse predictor" (Archive for History of Exact Sciences 68), also adopted
 * in later AMRP work: the new moon of 28 April 205 BC (proleptic Julian
 * calendar; astronomical year -204). At the epoch all spiral pointers stand at
 * the start of their first cell. See README §Epoch for the full rationale.
 *
 * All "year" arithmetic in the simulation uses 1 year = 365.25 days, the
 * Callippic-cycle year the mechanism itself embodies (76 yr = 27,759 days).
 */

/** Astronomical year numbering: 1 BC = year 0, 205 BC = year -204. */
export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

const floorDiv = (a: number, b: number) => Math.floor(a / b);

/** Proleptic Gregorian calendar date -> Julian Day Number (integer, at noon). */
export function gregorianToJdn(d: CalendarDate): number {
  const a = floorDiv(14 - d.month, 12);
  const y = d.year + 4800 - a;
  const m = d.month + 12 * a - 3;
  return (
    d.day +
    floorDiv(153 * m + 2, 5) +
    365 * y +
    floorDiv(y, 4) -
    floorDiv(y, 100) +
    floorDiv(y, 400) -
    32045
  );
}

/** Proleptic Julian calendar date -> Julian Day Number (integer, at noon). */
export function julianToJdn(d: CalendarDate): number {
  const a = floorDiv(14 - d.month, 12);
  const y = d.year + 4800 - a;
  const m = d.month + 12 * a - 3;
  return d.day + floorDiv(153 * m + 2, 5) + 365 * y + floorDiv(y, 4) - 32083;
}

/** Julian Day Number -> proleptic Gregorian calendar date. */
export function jdnToGregorian(jdn: number): CalendarDate {
  const a = jdn + 32044;
  const b = floorDiv(4 * a + 3, 146097);
  const c = a - floorDiv(146097 * b, 4);
  const d = floorDiv(4 * c + 3, 1461);
  const e = c - floorDiv(1461 * d, 4);
  const m = floorDiv(5 * e + 2, 153);
  return {
    day: e - floorDiv(153 * m + 2, 5) + 1,
    month: m + 3 - 12 * floorDiv(m, 10),
    year: 100 * b + d - 4800 + floorDiv(m, 10),
  };
}

/** Julian Day Number -> proleptic Julian calendar date. */
export function jdnToJulian(jdn: number): CalendarDate {
  const c = jdn + 32082;
  const d = floorDiv(4 * c + 3, 1461);
  const e = c - floorDiv(1461 * d, 4);
  const m = floorDiv(5 * e + 2, 153);
  return {
    day: e - floorDiv(153 * m + 2, 5) + 1,
    month: m + 3 - 12 * floorDiv(m, 10),
    year: d - 4800 + floorDiv(m, 10),
  };
}

/** Saros-dial start-up: new moon of 28 April 205 BC (Julian) = JDN 1646665. */
export const EPOCH_JDN = julianToJdn({ year: -204, month: 4, day: 28 });

/** The mechanism's own year length: the Callippic year of 365 1/4 days. */
export const DAYS_PER_YEAR = 365.25;

/** Continuous JDN (fractional days allowed) -> years since epoch. */
export function jdToYears(jd: number): number {
  return (jd - EPOCH_JDN) / DAYS_PER_YEAR;
}

/** Years since epoch -> continuous JDN. */
export function yearsToJd(years: number): number {
  return EPOCH_JDN + years * DAYS_PER_YEAR;
}

/** Current wall-clock time -> continuous JDN (UTC). */
export function nowToJd(date: Date = new Date()): number {
  // Unix epoch 1970-01-01T00:00Z = JD 2440587.5
  return date.getTime() / 86400000 + 2440587.5;
}

// ---------------------------------------------------------------------------
// Egyptian civil calendar (the front dial's movable ring)
// ---------------------------------------------------------------------------

/**
 * The Egyptian wandering year: exactly 365 days — 12 months of 30 days plus 5
 * epagomenal days. Anchored on the era of Nabonassar:
 * 1 Thoth year 1 = 26 February 747 BC (Julian) = JDN 1448638 (Ptolemy,
 * Almagest; standard chronological anchor).
 */
export const NABONASSAR_JDN = julianToJdn({ year: -746, month: 2, day: 26 });

export const EGYPTIAN_MONTHS = [
  'Thoth',
  'Phaophi',
  'Hathyr',
  'Choiak',
  'Tybi',
  'Mecheir',
  'Phamenoth',
  'Pharmouthi',
  'Pachon',
  'Payni',
  'Epeiph',
  'Mesore',
] as const;

export interface EgyptianDate {
  /** Year of the Nabonassar era (1-based). */
  year: number;
  /** 0-11 for the twelve months, 12 for the epagomenal days. */
  monthIndex: number;
  monthName: string;
  /** 1-30 (1-5 in the epagomenal "month"). */
  day: number;
  /** Day within the 365-day year, 0-364. */
  dayOfYear: number;
}

export function jdnToEgyptian(jdn: number): EgyptianDate {
  const days = Math.floor(jdn) - NABONASSAR_JDN;
  const year = floorDiv(days, 365);
  const dayOfYear = days - year * 365;
  const monthIndex = Math.min(12, floorDiv(dayOfYear, 30));
  const day = dayOfYear - monthIndex * 30 + 1;
  return {
    year: year + 1,
    monthIndex,
    monthName: monthIndex === 12 ? 'Epagomenai' : EGYPTIAN_MONTHS[monthIndex],
    day,
    dayOfYear,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Format an astronomical-year date for display, e.g. "28 April 205 BC". */
export function formatDate(d: CalendarDate): string {
  const era = d.year <= 0 ? ' BC' : d.year < 1000 ? ' AD' : '';
  const displayYear = d.year <= 0 ? 1 - d.year : d.year;
  return `${d.day} ${MONTH_NAMES[d.month - 1]} ${displayYear}${era}`;
}

/** Format a JDN in both calendars, choosing Julian before 1582. */
export function formatJdn(jdn: number): string {
  const n = Math.round(jdn);
  if (n < 2299161) {
    // before 15 Oct 1582 Gregorian: historians use the Julian calendar
    return `${formatDate(jdnToJulian(n))} (Julian cal.)`;
  }
  return formatDate(jdnToGregorian(n));
}
