/**
 * Pointer calibration at the mechanism's epoch (28 April 205 BC).
 *
 * The gear ratios fix every pointer's *rate* exactly; the epoch only fixes the
 * *phase* (where each pointer stands at t = 0). We anchor phases to the mean
 * astronomical longitudes on the epoch date, computed from modern mean
 * elements (Meeus, "Astronomical Algorithms", 2nd ed., ch. 31/47 and the
 * VSOP87-derived linear terms). From that instant onward the simulation moves
 * ONLY by the mechanism's own gear ratios, so its readings drift away from a
 * modern ephemeris exactly the way the ancient device's would — which is the
 * point (spec §2 non-goals, §4.1 use case 14).
 *
 * Angles here are tropical ecliptic longitudes (equinox of date), in degrees.
 * The zodiac ring is therefore read tropically; see README §Design decisions.
 */

import { EPOCH_JDN } from './calendar';

/** Julian centuries from J2000.0 at the epoch (about -22.04). */
export const T_EPOCH = (EPOCH_JDN - 0.5 - 2451545.0) / 36525;

const wrap360 = (x: number) => ((x % 360) + 360) % 360;

function meanLongitude(l0: number, ratePerCentury: number, t: number): number {
  return wrap360(l0 + ratePerCentury * t);
}

const T = T_EPOCH;

/** Geometric mean longitude of the Sun (Meeus 25.2). */
export const SUN_LONGITUDE_EPOCH = wrap360(
  280.46646 + 36000.76983 * T + 0.0003032 * T * T,
);

/** Mean longitude of the Moon (Meeus 47.1, leading terms). */
export const MOON_LONGITUDE_EPOCH = wrap360(
  218.3164477 + 481267.88123421 * T - 0.0015786 * T * T,
);

/** Mean longitude of the lunar perigee (Meeus, ch. 47 arguments). */
export const MOON_PERIGEE_EPOCH = wrap360(
  83.3532465 + 4069.0137287 * T - 0.0103200 * T * T,
);

/** Mean anomaly of the Moon at epoch — phases the pin-and-slot device. */
export const MOON_ANOMALY_EPOCH = wrap360(
  MOON_LONGITUDE_EPOCH - MOON_PERIGEE_EPOCH,
);

/** Planet mean longitudes at epoch (Meeus table 31.a, linear terms). */
export const PLANET_LONGITUDE_EPOCH = {
  mercury: meanLongitude(252.250906, 149472.6746358, T),
  venus: meanLongitude(181.979801, 58517.815676, T),
  mars: meanLongitude(355.433275, 19140.2993313, T),
  jupiter: meanLongitude(34.351484, 3034.9056746, T),
  saturn: meanLongitude(50.077471, 1222.1137943, T),
} as const;

/**
 * Games (Olympiad) dial phase. Olympiads count from 776 BC; games years are
 * 776, 772, ... BC. Olympiad years run midsummer to midsummer, so the epoch
 * (April 205 BC) falls in year 3 of the Olympiad that began in summer 206 BC
 * (the games of 208 BC opened that cycle's year 1... year 4 begins summer
 * 205 BC). We place the pointer 3/4 of the way through year 3 at epoch.
 * The phase is cosmetic — the 1-turn-per-4-years rate is exact.
 */
export const GAMES_DIAL_PHASE_TURNS = (2 + 0.75) / 4;
