# Flea Jumping

Fleas on a 1D ring of ground jump in parabolic arcs, at most H high. When two fleas touch in
mid-air, the higher one jumps off the lower one and makes a fresh jump from there. How high
can they get? Two populations run side by side with the same rules and seed: **random** fleas
(the control) and **strategic** fleas, which plan their next jump to land on a flea already in
the air. Design and math: `DEVPLAN.md`, "The model".

## Run
- **Browser:** http://localhost:8000/research/Flea%20Jumping/sim/ (the always-on Static
  Server), or open `index.html` directly.
- **Smoke test:** `node smoketest.mjs [timeUnits] [key=value ...]`, e.g.
  `node smoketest.mjs 300 lookahead=2 recoil=false`. No DB; prints both worlds' flight-peak
  statistics and checks the invariants.

## Layout
| File | Role |
|---|---|
| `src/params.js` | every tunable (`PARAMETERS`) and the control strip (`PARAM_SCHEMA`) |
| `src/flea.js` | one flea: its arc as launch state, exact position at any time |
| `src/planner.js` | the strategic flea's intercept search and first-contact check |
| `src/world.js` | one population: flight, landing, jump-offs, jump decisions |
| `src/datamanager.js` | samples both worlds into the arrays the charts read |
| `src/observer.js` | draws both worlds as lanes (view only) |
| `src/ui.js`, `src/main.js` | all DOM: controls, chart wiring, boot |
| `vendor/` | Claude Basic 0.6.0, pinned |
