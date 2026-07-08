/**
 * Simulation time state: one master variable (years since epoch) advanced by
 * the crank, the play/pause time-lapse, or animated jumps to a target date.
 */

import { jdToYears, nowToJd } from './model/calendar';
import { RATES } from './model/kinematics';

const CRANK_TURNS_PER_YEAR = RATES.crank.valueOf();

export class Sim {
  /** master time: years since the 205 BC epoch */
  years = 0;
  playing = false;
  /** time-lapse speed in days per real second */
  speedDaysPerSec = 30;
  reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private targetYears: number | null = null;

  /** advance the simulation by dt real seconds */
  tick(dt: number) {
    if (this.targetYears !== null) {
      const diff = this.targetYears - this.years;
      // critically-damped approach, ~1.5 s to settle; snaps at the end
      const k = 1 - Math.exp(-dt * 3.2);
      this.years += diff * k;
      if (Math.abs(this.targetYears - this.years) < 1e-7) {
        this.years = this.targetYears;
        this.targetYears = null;
      }
    } else if (this.playing) {
      this.years += (dt * this.speedDaysPerSec) / 365.25;
    }
  }

  /** turn the crank by a number of turns (positive = forward in time) */
  crank(turns: number) {
    this.cancelJump();
    this.years += turns / CRANK_TURNS_PER_YEAR;
  }

  jumpToJd(jd: number) {
    const target = jdToYears(jd);
    if (this.reducedMotion) {
      this.years = target;
      this.targetYears = null;
    } else {
      this.targetYears = target;
    }
  }

  jumpToday() {
    this.jumpToJd(nowToJd());
  }

  get jumping(): boolean {
    return this.targetYears !== null;
  }

  cancelJump() {
    this.targetYears = null;
  }
}
