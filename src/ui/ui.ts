/**
 * DOM chrome: control bar, readings panel, tooltip, guided tour, glossary /
 * deep-dive / about modals, persistent accuracy caveat. All content is real
 * HTML for screen-reader access (spec §5.11).
 */

import {
  ABOUT_HTML,
  CAVEAT_SHORT,
  DEEP_DIVES,
  GLOSSARY,
  TOUR_STEPS,
} from '../content/text';
import { formatJdn, jdnToGregorian, gregorianToJdn } from '../model/calendar';
import type { MechanismState } from '../model/kinematics';
import { SUBSYSTEMS } from '../model/gearData';
import { PLANETS } from '../model/gearData';
import type { Sim } from '../sim';

export interface AppControls {
  goToView(name: 'front' | 'back' | 'side'): void;
  tweenCamera(pos: [number, number, number], target: [number, number, number]): void;
  setExplode(f: number): void;
  setSlice(f: number): void;
  setXray(on: boolean): void;
  isolate(key: string | null): void;
}

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element ${sel}`);
  return el;
};

const ZODIAC_EN = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra (Chelai)', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const PHASE_NAMES = [
  'New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous',
  'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent',
];

const GAMES_FESTIVALS = [
  'Isthmia & Olympia',
  'Nemea & Naa (Dodona)',
  'Isthmia & Pythia',
  'Nemea & Halieia (Rhodes)',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function signOf(lonDeg: number): string {
  const idx = Math.floor((((lonDeg % 360) + 360) % 360) / 30);
  const deg = (((lonDeg % 360) + 360) % 360) - idx * 30;
  return `${ZODIAC_EN[idx]} ${deg.toFixed(1)}°`;
}

function phaseName(angle: number): string {
  const idx = Math.round((((angle % 360) + 360) % 360) / 45) % 8;
  return PHASE_NAMES[idx];
}

export class UI {
  private tourIndex = -1;
  private lastReadings = 0;

  constructor(
    private sim: Sim,
    private app: AppControls,
  ) {
    this.buildControls();
    this.buildModals();
    this.buildTour();
    $('#caveat-text').textContent = CAVEAT_SHORT;
    $('#caveat-more').addEventListener('click', () => this.openModal('accuracy'));
  }

  // ----------------------------------------------------------- control bar

  private buildControls() {
    const play = $('#play') as HTMLButtonElement;
    const speed = $('#speed') as HTMLInputElement;
    const speedLabel = $('#speed-label');

    const updatePlay = () => {
      play.textContent = this.sim.playing ? '⏸' : '▶';
      play.setAttribute('aria-label', this.sim.playing ? 'Pause time-lapse' : 'Play time-lapse');
    };
    play.addEventListener('click', () => {
      this.sim.playing = !this.sim.playing;
      this.sim.cancelJump();
      updatePlay();
    });
    this.togglePlay = () => {
      this.sim.playing = !this.sim.playing;
      updatePlay();
    };

    const applySpeed = () => {
      const v = Math.pow(10, parseFloat(speed.value));
      this.sim.speedDaysPerSec = v;
      speedLabel.textContent =
        v < 60 ? `${v.toFixed(v < 3 ? 1 : 0)} d/s` : `${(v / 365.25).toFixed(1)} yr/s`;
    };
    speed.addEventListener('input', applySpeed);
    applySpeed();

    // date controls
    const monthSel = $('#date-month') as HTMLSelectElement;
    MONTH_NAMES.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = String(i + 1);
      opt.textContent = m;
      if (i === 6) opt.selected = true;
      monthSel.appendChild(opt);
    });
    const goJump = () => {
      const yRaw = parseInt(($('#date-year') as HTMLInputElement).value, 10);
      const era = ($('#date-era') as HTMLSelectElement).value;
      if (!Number.isFinite(yRaw) || yRaw < 1) return;
      const year = era === 'BC' ? 1 - yRaw : yRaw; // astronomical numbering
      const month = parseInt(monthSel.value, 10);
      const day = parseInt(($('#date-day') as HTMLInputElement).value, 10) || 1;
      this.sim.playing = false;
      updatePlay();
      this.sim.jumpToJd(gregorianToJdn({ year, month, day }));
    };
    $('#go').addEventListener('click', goJump);
    for (const id of ['#date-day', '#date-year']) {
      $(id).addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') goJump();
      });
    }
    $('#today').addEventListener('click', () => {
      const now = new Date();
      ($('#date-year') as HTMLInputElement).value = String(now.getFullYear());
      ($('#date-era') as HTMLSelectElement).value = 'AD';
      ($('#date-month') as HTMLSelectElement).value = String(now.getMonth() + 1);
      ($('#date-day') as HTMLInputElement).value = String(now.getDate());
      this.sim.playing = false;
      updatePlay();
      this.sim.jumpToday();
    });

    // views
    $('#view-front').addEventListener('click', () => this.app.goToView('front'));
    $('#view-back').addEventListener('click', () => this.app.goToView('back'));
    $('#view-side').addEventListener('click', () => this.app.goToView('side'));

    // see-inside
    ($('#explode') as HTMLInputElement).addEventListener('input', (e) =>
      this.app.setExplode(parseFloat((e.target as HTMLInputElement).value)),
    );
    ($('#slice') as HTMLInputElement).addEventListener('input', (e) =>
      this.app.setSlice(parseFloat((e.target as HTMLInputElement).value)),
    );
    ($('#xray') as HTMLInputElement).addEventListener('change', (e) =>
      this.app.setXray((e.target as HTMLInputElement).checked),
    );

    const iso = $('#isolate') as HTMLSelectElement;
    for (const [key, sub] of Object.entries(SUBSYSTEMS)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = sub.label;
      iso.appendChild(opt);
    }
    iso.addEventListener('change', () => this.app.isolate(iso.value || null));

    // readings toggle
    const infoBtn = $('#btn-info');
    const panel = $('#info-panel');
    infoBtn.addEventListener('click', () => {
      const hidden = panel.style.display === 'none';
      panel.style.display = hidden ? '' : 'none';
      panel.classList.toggle('forced', hidden);
      infoBtn.setAttribute('aria-pressed', String(hidden));
    });
  }

  /** replaced in buildControls; also used by keyboard shortcut */
  togglePlay: () => void = () => {};

  /** reflect an externally-set explode value in the slider */
  reflectExplode(f: number) {
    ($('#explode') as HTMLInputElement).value = String(f);
  }
  reflectXray(on: boolean) {
    ($('#xray') as HTMLInputElement).checked = on;
  }
  reflectIsolate(key: string | null) {
    ($('#isolate') as HTMLSelectElement).value = key ?? '';
  }

  // ----------------------------------------------------------------- modal

  private buildModals() {
    const modal = $('#modal') as HTMLDialogElement;
    $('#modal-close').addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
    $('#btn-glossary').addEventListener('click', () => this.openModal());
    $('#btn-about').addEventListener('click', () => this.openAbout());
  }

  openModal(diveId?: string) {
    const modal = $('#modal') as HTMLDialogElement;
    const content = $('#modal-content');
    const nav = DEEP_DIVES.map(
      (d) => `<a href="#dive-${d.id}">${d.title.split('—')[0].trim()}</a>`,
    ).join('');
    content.innerHTML =
      `<h2>Deep dives</h2><nav class="dive-nav">${nav}</nav>` +
      DEEP_DIVES.map(
        (d) => `<article id="dive-${d.id}"><h3>${d.title}</h3>${d.html}</article>`,
      ).join('') +
      `<h2 style="margin-top:1.4rem">Glossary</h2><dl>` +
      GLOSSARY.map((g) => `<dt>${g.term}</dt><dd>${g.def}</dd>`).join('') +
      `</dl>`;
    modal.showModal();
    if (diveId) {
      document.getElementById(`dive-${diveId}`)?.scrollIntoView({ block: 'start' });
    } else {
      content.parentElement!.scrollTop = 0;
    }
  }

  openAbout() {
    const modal = $('#modal') as HTMLDialogElement;
    $('#modal-content').innerHTML =
      `<h2>About this simulation</h2>` +
      ABOUT_HTML +
      `<h3>Accuracy</h3>` +
      (DEEP_DIVES.find((d) => d.id === 'accuracy')?.html ?? '');
    modal.showModal();
  }

  get modalOpen(): boolean {
    return ($('#modal') as HTMLDialogElement).open;
  }
  closeModal() {
    ($('#modal') as HTMLDialogElement).close();
  }

  // ------------------------------------------------------------------ tour

  private buildTour() {
    $('#btn-tour').addEventListener('click', () => this.startTour());
    $('#tour-next').addEventListener('click', () => this.tourGo(this.tourIndex + 1));
    $('#tour-prev').addEventListener('click', () => this.tourGo(this.tourIndex - 1));
    $('#tour-close').addEventListener('click', () => this.endTour());
  }

  startTour() {
    this.tourGo(0);
  }

  get tourActive(): boolean {
    return this.tourIndex >= 0;
  }

  endTour() {
    this.tourIndex = -1;
    ($('#tour') as HTMLElement).hidden = true;
    this.app.isolate(null);
    this.reflectIsolate(null);
    this.app.setExplode(0);
    this.reflectExplode(0);
    this.app.setXray(false);
    this.reflectXray(false);
  }

  private tourGo(idx: number) {
    if (idx < 0) return;
    if (idx >= TOUR_STEPS.length) {
      this.endTour();
      return;
    }
    this.tourIndex = idx;
    const step = TOUR_STEPS[idx];
    ($('#tour') as HTMLElement).hidden = false;
    $('#tour-title').textContent = step.title;
    $('#tour-body').innerHTML = step.html;
    $('#tour-step').textContent = `${idx + 1} / ${TOUR_STEPS.length}`;
    ($('#tour-prev') as HTMLButtonElement).disabled = idx === 0;
    $('#tour-next').textContent = idx === TOUR_STEPS.length - 1 ? 'Finish ✓' : 'Next →';

    this.app.tweenCamera(step.camera.pos, step.camera.target);
    const iso = step.isolate === undefined ? null : step.isolate;
    this.app.isolate(iso);
    this.reflectIsolate(iso);
    const explode = step.explode ?? 0;
    this.app.setExplode(explode);
    this.reflectExplode(explode);
    const xray = step.xray ?? false;
    this.app.setXray(xray);
    this.reflectXray(xray);
  }

  // --------------------------------------------------------------- tooltip

  showTooltip(x: number, y: number, title: string, body: string) {
    const tip = $('#tooltip');
    tip.innerHTML = `<h3></h3><p></p>`;
    tip.querySelector('h3')!.textContent = title;
    tip.querySelector('p')!.textContent = body;
    tip.hidden = false;
    const pad = 14;
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    tip.style.left = `${Math.min(x + pad, window.innerWidth - w - 8)}px`;
    tip.style.top = `${Math.min(y + pad, window.innerHeight - h - 8)}px`;
  }

  hideTooltip() {
    $('#tooltip').hidden = true;
  }

  // -------------------------------------------------------------- readings

  updateReadings(s: MechanismState, force = false) {
    const now = performance.now();
    if (!force && now - this.lastReadings < 250) return;
    this.lastReadings = now;

    const g = jdnToGregorian(Math.round(s.jd));
    const gStr = `${g.day} ${MONTH_NAMES[g.month - 1]} ${g.year <= 0 ? `${1 - g.year} BC` : g.year}`;
    const glyph = s.saros.glyph;
    const glyphStr = glyph
      ? `<span class="glyph-alert">${[
          glyph.lunar ? 'Σ lunar eclipse possible' : '',
          glyph.solar ? 'Η solar eclipse possible' : '',
        ]
          .filter(Boolean)
          .join(' · ')} (+${s.exeligmos.correctionHours} h)</span>`
      : 'no eclipse this month';

    $('#readings').innerHTML = `
      <dl>
        <dt>Date</dt><dd>${gStr}</dd>
        <dt>Historical</dt><dd>${formatJdn(s.jd)}</dd>
        <dt>Egyptian</dt><dd>${s.egyptian.day} ${s.egyptian.monthName}</dd>
        <dt>Crank</dt><dd>${s.crankTurns.toFixed(1)} turns since epoch</dd>
      </dl>
      <div class="section">Front — Cosmos</div>
      <dl>
        <dt>Sun</dt><dd>${signOf(s.sunLongitude)}</dd>
        <dt>Moon</dt><dd>${signOf(s.moonLongitude)}</dd>
        <dt>Phase</dt><dd>${phaseName(s.moonPhaseAngle)}</dd>
        <dt>Anomaly</dt><dd>${s.moonAnomalyDeg >= 0 ? '+' : ''}${s.moonAnomalyDeg.toFixed(2)}° (pin &amp; slot)</dd>
        ${PLANETS.map((p) => `<dt>${p.name}</dt><dd>${signOf(s.planets[p.id])}</dd>`).join('')}
      </dl>
      <div class="section">Back — cycles</div>
      <dl>
        <dt>Metonic</dt><dd>month ${s.metonic.month} / 235 · year ${s.metonic.year} of 19</dd>
        <dt>Callippic</dt><dd>quarter ${s.callippic.quarter} of 4 (76 yr)</dd>
        <dt>Games</dt><dd>year ${s.games.year}: ${GAMES_FESTIVALS[s.games.year - 1]}</dd>
        <dt>Saros</dt><dd>month ${s.saros.month} / 223</dd>
        <dt>Eclipse</dt><dd>${glyphStr}</dd>
        <dt>Exeligmos</dt><dd>+${s.exeligmos.correctionHours} h</dd>
      </dl>
      <p style="font-size:.72rem;color:var(--ink-dim);margin:.4rem 0 0">
        All values are the mechanism's own output (ancient arithmetic), not a modern ephemeris.
      </p>`;
  }
}
