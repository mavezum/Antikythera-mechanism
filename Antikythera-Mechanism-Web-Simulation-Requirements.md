# Requirements: Antikythera Mechanism — Interactive 3D Web Simulation

*Drafted 2026-07-08 from a requirements interview with Mari. This spec is written to be handed to a developer (Fable) to implement end-to-end. Open questions are flagged inline and consolidated in §7. Where the spec grants creative latitude, it says so explicitly.*

---

## 1. Summary

An interactive, browser-based **3D simulation of the Antikythera mechanism** — the ~2,000-year-old Greek geared astronomical calculator. The simulation faithfully models the device's real gear trains: a single hand-crank input drives every dial through the authentic tooth-count ratios, so the outputs are exactly what the ancient device itself would compute — including its small, historically-real deviations from modern astronomy. A persistent note explains those deviations to the user.

It renders the **full mechanism** in 3D — the front "Cosmos" display (zodiac, Egyptian calendar, Sun, Moon with phase, and the five classical planets) plus all five back dials (Metonic, Callippic, Saros, Exeligmos, Olympiad/Games). The planetary display follows the 2021 UCL reconstruction and is clearly labelled as a scholarly hypothesis. Users can **turn the crank, jump to any date, play/pause an animated time-lapse, or snap to today**, and can **see inside** the device via exploded and cross-section views. Rich educational scaffolding — a guided tour, a glossary, and a deep-dive per dial — makes it a teaching tool as much as a showpiece.

It is a **purely static, client-side web app** (no backend), deployable on the **Netlify free tier**. Primary purpose: a portfolio/showpiece piece that doubles as an educational explainer. Success = it looks impressive, runs smoothly on desktop, is mechanically/astronomically faithful to the artifact, and teaches a general audience how the "world's first computer" worked.

---

## 2. Goals & success criteria

- **Primary goal:** A visually striking, mechanically-faithful 3D simulation that (a) works as a portfolio showpiece and (b) teaches how the mechanism works.
- **Success metrics:**
  - Runs at a smooth frame rate (target ~60 fps) on a typical modern desktop/laptop.
  - The gear model is *authentic*: a single crank input drives all dials through real gear ratios; readings for reference dates match values published in the Antikythera literature.
  - All front-display elements and all five back dials are present and correctly driven.
  - "See inside" (exploded + cross-section) clearly reveals the internal gear trains.
  - Guided tour, glossary, and per-dial deep dives are present and accurate.
  - The accuracy caveat (ancient device ≠ modern astronomy) is visible and clear.
  - Deploys and stays within the **Netlify free tier** with no recurring cost.
- **Explicit non-goals (v1):**
  - Modern-ephemeris accuracy. The dials show the *mechanism's own* output, not real modern sky positions. (A short explanatory note covers the discrepancy; a live modern-vs-ancient comparison is explicitly out of scope — see §4.3.)
  - User accounts, saving, sharing, multiplayer, or any server-side feature.
  - Being a research-grade metrological reconstruction. It follows published reconstructions; it does not attempt to resolve open scholarly debates.

---

## 3. Users & stakeholders

| Role | Description | What they need from the system |
|---|---|---|
| **Casual visitor / general public** | Non-expert, arrives from a portfolio link or share. Non-technical. | An immediate "wow", intuitive controls, plain-language explanations of what they're seeing. |
| **Curious learner / student / educator** | Wants to actually understand the mechanism. | Guided tour, glossary, per-dial deep dives, ability to see inside and connect a dial to the gear train that drives it. |
| **Technical / recruiter audience** | Evaluating Mari's work. Judges polish, performance, and correctness. | Evidence of engineering quality: faithful model, clean interactions, smooth 3D, good docs. |
| **Mari (owner)** | Commissions and owns the piece; hands implementation to Fable. | A finished artifact she's proud to show, that is accurate and maintainable. |

---

## 4. Functional requirements

### 4.1 Core use cases (MVP)

1. **View the mechanism in 3D** — On load, the user sees the assembled mechanism in 3D and can orbit, pan, and zoom the camera. Front and back are both reachable.

2. **Drive it by hand crank** — The user grabs and turns the input crank (mouse drag / touch drag). Every gear and every pointer moves mechanically and consistently from that single input, exactly as a real geared train would.

3. **Jump to a date** — The user enters or picks a calendar date; the mechanism animates (spins) to the gear configuration corresponding to that date and displays what the device would then show. See §5.1 for the date→rotation mapping and epoch caveat.

4. **Play / pause time animation** — The user starts an automatic time-lapse with an adjustable speed (e.g. days/sec up to years/sec) and can pause/resume. Useful for watching the Moon phase cycle, eclipse indices advance, and planets loop.

5. **Snap to today / live** — A one-tap control sets the mechanism to the *current real date*, showing the device's prediction for today. (This shows the *mechanism's* computed sky for today, not modern-accurate positions.)

6. **Read the front display** — Zodiac ring, Egyptian calendar ring, Sun pointer, Moon pointer, Moon-phase indicator (waxing/waning), and the five classical planets (Mercury, Venus, Mars, Jupiter, Saturn), all positioned by the gear train.

7. **Read the back dials** — Metonic (5-turn spiral, 235 synodic months), Callippic (76-year), Saros (4-turn spiral, 223 months, with eclipse glyphs), Exeligmos (eclipse-time correction: 0 / 8 / 16 hours), and the Olympiad/Games dial (4-year Panhellenic games cycle).

8. **See inside — exploded view** — A control expands the mechanism along its axis so the stack of gears and plates separates, revealing the internal layering. Reversible with smooth animation.

9. **See inside — cross-section slice** — A movable cut-plane slices through the mechanism so the user can see the gear meshing in section at any depth.

10. **Isolate a subsystem** — Clicking/selecting a dial highlights *only* the gear train that drives it and dims the rest, so the user can trace cause→effect from crank to that dial. *(Strongly recommended; see §4.3 if de-scoped.)*

11. **Learn — guided tour** — A step-by-step walkthrough moves the camera and highlights parts in sequence, explaining the mechanism from crank to each dial in plain language.

12. **Learn — tooltips & info panel** — Hovering/tapping a gear, pointer, or dial shows what it is and does; a side/overlay panel explains the current view.

13. **Learn — glossary & per-dial deep dives** — A reference section defines terms (synodic month, Saros, Metonic cycle, lunar anomaly, epicyclic gearing, etc.) and gives a detailed explainer for each dial, including the historical significance and the known accuracy limitations.

14. **Understand the accuracy caveat** — A clearly-placed, plain-language note explains that the device reproduces *ancient* calculations with small known errors versus modern astronomy, and that the planetary display is a modern reconstruction hypothesis.

### 4.2 Out of scope for v1

- Any backend, database, authentication, or user accounts.
- Saving/sharing specific configurations via server (local-only preferences via `localStorage` are fine).
- Localization / multiple languages.
- VR/AR modes.

### 4.3 Future / nice-to-have (explicitly optional; implementer's discretion)

- **Transparent / X-ray plate mode** — fade the bronze casing to see trains through it (a lighter alternative/companion to exploded + cross-section). *Recommended if cheap to add.*
- **Implementer creative latitude** — Mari has explicitly invited tasteful "cool" additions to the see-inside and presentation experience (e.g. an animated assembly sequence, subtle bronze/patina materials and lighting, a "follow the torque" flow animation from crank through the train, camera cinematics on the guided tour). These are encouraged where they add clarity or polish and don't threaten performance or the free-tier budget.
- **Ancient-vs-modern comparison** — optional toggle overlaying true modern Sun/Moon positions to visualize the ancient error. (Deliberately deferred; the v1 requirement is only a *text note* about the error.)
- **Sound** — mechanical ticking tied to crank speed.
- **Shareable deep-links** — encode camera/date in the URL hash (no backend needed).
- **Third-party services / data sources:** none required. All astronomy is computed locally from gear ratios; no external API calls.

---

## 5. Non-functional requirements

### 5.1 Data

- **Nature of the data:** Entirely static, small, and non-personal. Two kinds:
  1. **Mechanism definition** — the gear scheme: gears (id, tooth count, axis/layer, position, which shaft), the trains, the pin-and-slot lunar-anomaly device, and the planetary epicyclic/pin-and-slot devices. This should live in a structured, human-readable config (JSON/TS), not be hard-coded in logic, so it can be audited against the literature and corrected.
  2. **Educational content** — tour steps, glossary entries, per-dial deep-dive text, tooltips.
- **Sources of the gear data (authoritative; the implementer should reproduce these rather than invent counts):**
  - Freeth et al. (2006), *Nature* — "Decoding the ancient Greek astronomical calculator known as the Antikythera Mechanism" (gear topology, spiral back dials, pin-and-slot).
  - Freeth, Jones, Steele & Bitsakis (2008), *Nature* — Olympiad/Games dial + Saros eclipse prediction.
  - Freeth & Jones (2012), ISAW — "The Cosmos in the Antikythera Mechanism."
  - Freeth et al. (2021), *Scientific Reports* 11:5821 — "A Model of the Cosmos in the ancient Greek Antikythera Mechanism" (the **planetary reconstruction**; e.g. the 462-year Venus and 442-year Saturn period relations).
- **Key cycles the model must reproduce (well-established):**
  - Metonic: **19 years = 235 synodic months** → 5-turn, 235-cell spiral.
  - Callippic: **76 years** (= 4 Metonic − 1 day) → subsidiary 4-sector dial.
  - Saros: **223 synodic months** (~18 yr 11⅓ days) → 4-turn spiral with eclipse glyphs.
  - Exeligmos: **3 Saros = 669 months**; corrects predicted eclipse times by **0 / 8 / 16 hours**.
  - Olympiad/Games: **4-year** cycle, quarter-turns naming Panhellenic games.
  - Lunar: **254 sidereal months in 19 years** (the famous 2×127-tooth gearing), plus the **first lunar anomaly** via the **pin-and-slot** device (variable lunar velocity).
- **Date → rotation mapping:** "Jump to date", "play", and "today" require mapping a real calendar date to a crank rotation (turns since an epoch). The implementer must choose and document a **reference epoch** for the mechanism (see Open Question 1). Note the device natively uses the **Egyptian 365-day calendar** (the movable calendar ring accounts for the ~¼-day drift); the UI should present dates sensibly (Gregorian for the user) while internally driving the Egyptian-calendar-based train.
- **Volumes:** Trivial — a few dozen gears, a few hundred content strings, and 3D assets. No growth over time.
- **Sensitivity:** None. No PII, no user-generated content, no secrets. Classification: **Public**.
- **Retention / deletion / residency:** Not applicable — nothing personal is stored server-side. Any UI preferences live in the browser (`localStorage`).

### 5.2 Security

- **Threat model:** Minimal. A static, no-backend, no-auth, no-PII site has essentially no application attack surface. Realistic concerns are limited to (a) supply-chain risk from npm dependencies and (b) generic web hygiene.
- **Authentication / authorization:** **Not applicable** — no logins, no roles, no protected data.
- **Secrets handling:** No secrets in the client. No API keys should be required at all; if analytics or error-reporting is added later, its key must be a public/publishable token only.
- **Web hygiene (required):** Serve over HTTPS (Netlify default); set sensible security headers via `netlify.toml`/`_headers` (a reasonable `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, etc.); pin dependencies and run `npm audit` in CI.
- **Audit logging:** Not applicable.
- **AI-specific:** Not applicable — no LLM or agent is in the runtime path.

### 5.3 Privacy & compliance

- **Personal data:** None collected by default. If **analytics** are added, prefer a cookieless/privacy-friendly option; anything using cookies or tracking triggers a **GDPR/ePrivacy cookie-consent** obligation (Mari is in the EU). Default recommendation: **no analytics, or cookieless analytics only**, to avoid a consent banner entirely. (See Open Question 4.)
- **Applicable regimes:** None binding for a purely static, no-PII site beyond the above analytics caveat. No HIPAA/PCI/SOC2/AI-Act relevance.
- **Internal reviews / consent / cross-border transfers:** Not applicable.

### 5.4 Safety

**Not applicable** in the physical/irreversible-action sense — the app controls nothing in the real world, makes no automated decisions, and cannot harm a user. The only "safety" concern is **not misleading users about historical/astronomical fact**, which is handled by: (a) the persistent accuracy caveat about ancient vs. modern astronomy, and (b) clear "reconstruction / scholarly hypothesis" labelling on the planetary display and any other conjectural elements (e.g. the Callippic dial).

### 5.5 Performance & scale

- **Load (traffic):** Low and bursty — a portfolio/share piece. No concurrency engineering needed (static CDN). The binding constraint is **Netlify free-tier bandwidth** (see §5.7), which makes **asset weight**, not request volume, the real budget.
- **Rendering performance:** Target **~60 fps on a typical modern desktop/laptop**; must stay interactive (no hard freezes) during crank drag, camera moves, exploded/cross-section transitions, and time-lapse playback.
- **Load time:** Target a **fast first meaningful render** (aim for interactive within a few seconds on broadband). Lazy-load heavy 3D assets and non-critical content (tour, glossary) after first paint.
- **Asset budget (important):** Keep total transferred payload small to protect the free-tier bandwidth budget — compress/greybox geometry, use efficient formats (e.g. Draco-compressed glTF or procedurally-generated gears), texture atlases, and gzip/brotli (Netlify does this). Prefer **procedural gear generation** over heavy imported meshes where feasible.
- **Cost ceiling:** **$0 recurring.** Must fit the Netlify free tier.

### 5.6 Reliability & availability

- **Availability:** Effectively that of Netlify's static CDN — high, with no operational effort. No formal SLA needed.
- **The one real reliability risk is the free-tier cap:** if the site exceeds the monthly credit/bandwidth allowance, Netlify **pauses the site until the next month**. Mitigations: keep assets small (§5.5), and see Risks (§9).
- **Maintenance windows / RTO / RPO:** Not applicable — no stateful backend. "Recovery" = redeploy from Git. Source in version control is the single source of truth.

### 5.7 Hosting & deployment

- **Platform:** **Netlify free tier.** As of the 2026 credit-based model, the free plan is roughly **300 credits/month** (hard cap, no overage), which works out to on the order of **~15 GB bandwidth/month**, **300 build minutes/month**, **1 concurrent build**, and ~20 production deploys/month. Design to stay comfortably inside this (small assets, infrequent redeploys). *Verify current limits at deploy time — Netlify changed this model twice in 2025–2026.*
- **Architecture:** **Single-page, fully static, client-side app.** No serverless functions required (avoid them to conserve credits). Everything — gear math, astronomy, 3D — runs in the browser.
- **Tenancy:** Single site, single "tenant" (public). Not applicable beyond that.
- **Environments:** `production` (main branch → Netlify). Netlify **deploy previews** on PRs are a free, useful addition. A local dev server (Vite) is the "dev" environment.
- **CI/CD:** Git-based auto-deploy on push to main (Netlify's default). Run build + `npm audit` (and any tests) in the build step.
- **Config:** Include `netlify.toml` (build command, publish dir, headers, SPA redirect if needed).

### 5.8 Integrations

- **Inbound / outbound / exposed APIs:** **None.** No upstream data feeds, no downstream consumers, no public API. The app is self-contained.
- **Identity / payment / email:** Not applicable.
- **Analytics / observability vendors:** None required; optional and privacy-constrained per §5.3 / §5.9.

### 5.9 Observability & operations

- **Operator:** Mari (owner). Operations are minimal — it's a static site.
- **Logging / metrics / tracing:** No server logs (no server). Netlify provides deploy logs. Optional client-side **error reporting** (e.g. a free Sentry tier) is a reasonable nice-to-have to catch WebGL/runtime errors in the wild; keep it privacy-respecting.
- **Alerting / on-call / SLOs:** Not applicable. The only signal worth watching is the **Netlify usage dashboard** (to avoid hitting the free-tier cap).

### 5.10 Maintainability

- **Recommended stack (implementer's choice was delegated):**
  - **Three.js** for 3D/WebGL (the natural fit for interactive gear trains). react-three-fiber is acceptable if a React structure is preferred, but a **lightweight setup (vanilla TS + Three.js) is recommended** to keep the bundle small for the free tier.
  - **Vite** for build/dev; **TypeScript** for safety on the gear-math and data model.
  - Output a static bundle to Netlify.
- **Single source of truth for motion:** Drive **both** the numeric dial readings **and** the visual gear rotations from **one kinematic model** (one input angle → all output angles via the exact tooth-count ratios, expressed as rationals). This guarantees the picture and the numbers can never disagree. The pin-and-slot lunar anomaly and the planetary epicyclic/pin-and-slot devices must be modelled **geometrically** (they produce *variable* angular velocity), not as constant ratios.
- **Data-driven design:** Gear scheme and all educational copy in editable config files (see §5.1), separate from rendering/logic, so accuracy fixes don't require touching engine code.
- **Documentation:** A `README` covering architecture, the gear-data schema, how to run/build/deploy, and **citations** for every gear count and cycle (so future edits can be checked against sources).

### 5.11 Internationalization & accessibility

- **i18n:** **English only** for v1. (Structure copy so it *could* be localized later, but no obligation.) Dates shown to the user in a clear, unambiguous format.
- **Accessibility:** Full screen-reader parity with an interactive 3D scene is out of scope, but the following are expected:
  - **Keyboard access** to the primary controls (advance/rewind time, jump to date, play/pause, toggle views).
  - **Respect `prefers-reduced-motion`** — offer a reduced/no-auto-animation mode.
  - The **educational content** (tour text, glossary, deep dives) must be real, accessible HTML text (not baked into the canvas), giving a non-visual path to the substance.
  - Sensible color contrast and focus states in the UI chrome; don't rely on color alone to convey dial meaning.
  - Target **WCAG 2.1 AA** for the surrounding UI as a good-practice goal (not a certified/legal requirement here).

---

## 6. Constraints

- **Budget:** **$0 recurring** — must live on the Netlify free tier. No paid services assumed.
- **Timeline:** No hard deadline stated. **Assumption:** flexible; favor correctness and polish over speed. (Confirm if there's a target date — see §7.)
- **Team / skills:** Implemented by **Fable** from this spec; maintained by Mari. Implementer has creative latitude for tasteful enhancements (§4.3).
- **Technology lock-ins:** None imposed. Only hard constraint is "static and free-tier-hostable," which rules out required backends/serverless-heavy designs.

---

## 7. Open questions

1. **Reference epoch for date mapping.** Which epoch date should anchor "jump to date"/"today" (mapping real dates to crank turns)? The literature debates this (see the ISAW "Epoch Dates of the Antikythera Mechanism" paper and Freeth's eclipse-scheme work). *Decision owner:* implementer, documented in README. *Needed by:* before implementing date input.
2. **Which reconstruction variant for ambiguous gearing.** Some elements are conjectural (e.g. the Callippic dial) or differ between reconstructions (Freeth vs. Wright). Which set of tooth counts is the canonical source of truth? *Recommendation:* follow Freeth et al. 2006/2008/2012 for the core and 2021 for planets; document deviations. *Owner:* implementer.
3. **Eclipse-glyph dataset.** Which eclipse-prediction scheme/data populates the Saros glyphs (2008 scheme vs. the revised 2018 scheme)? How much glyph detail to render (type/time/index letters)? *Owner:* implementer + Mari.
4. **Analytics — yes/no?** If any analytics are wanted, cookieless only (to avoid a GDPR consent banner). Default assumption: **none**. *Owner:* Mari.
5. **Domain.** Ship on a `*.netlify.app` subdomain, or a custom domain (small annual cost, outside the free-tier budget)? *Owner:* Mari.
6. **Depth of "isolate a subsystem" (use case 10)** and any implementer "cool" additions (§4.3) — confirm scope vs. effort once a first build exists.
7. **Timeline / deadline** — is there any target date (e.g. tied to a job application or portfolio launch)? *Owner:* Mari.

---

## 8. Assumptions

- Purely client-side; **no backend, database, auth, or serverless functions** are needed or wanted.
- The dials show the **mechanism's own (ancient) computed values**, including their real small errors; a **text caveat** explains this. No live modern-accuracy comparison in v1.
- Gear counts and trains come from the **published Freeth reconstructions**; the planetary display follows the **2021 UCL model** and is labelled a hypothesis.
- **English only**, **desktop-first** (must still work acceptably on mobile), **$0 recurring cost**, **no hard deadline**.
- UI preferences (e.g. quality toggle, reduced motion) may persist in `localStorage`; nothing personal is stored anywhere else.
- A wide user-facing date range is supported for the crank/date controls; outputs remain the *device's*, not a modern ephemeris.

*Sources for the mechanism's structure and cycles: Freeth et al. 2006 (Nature), Freeth et al. 2008 (Nature, Olympiad/eclipse), Freeth & Jones 2012 (ISAW), and Freeth et al. 2021 (Scientific Reports, planetary Cosmos). See §5.1 for full references. Netlify free-tier figures reflect the 2026 credit-based model and should be re-verified at deploy time.*
