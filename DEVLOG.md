# Flea Jumping — DEVLOG
Newest entry on top. **Append only — never edit past entries.**

<!-- append new entries above this line -->

## 2026-11-05 — scale to 10k fleas
**Done:** Chris asked for a 10k max. Starting and max fleas now go to 10,000 and the ground to
2,000 H. Made it affordable without changing a rule:
- an air grid (cells >= 2r wide, rebuilt every tick): contacts are checked only within a cell
  and its neighbour, and planners ask the grid for the fleas near them;
- the planner's field is the nearest airborne fleas in range, capped at `planMaxTracked` (64).
  Below the cap this is everyone who could matter, so plans are unchanged; in a crowd it is an
  attention limit;
- the planner keeps only its top 12 candidates instead of sorting all of them (the hot spot:
  in a 10k swarm that is about 3,300 plans per step, about 3,000 candidates each);
- above 1,500 fleas a lane draws squares and skips the aim lines.
**Changed:** `src/world.js` (grid, near, collide/contactIn), `src/planner.js` (plannerField,
top-k), `src/flea.js` (touchedTick), `src/observer.js`, `src/params.js`.
**State:** smoke PASS. At defaults the top-k pick gives byte-identical stats to the sort it
replaced. The grid changes contact ORDER, so trajectories differ from earlier runs but the
statistics match (seed 1 mean peak 0.669 / 1.114, earlier 0.670 / 1.087). Timing, headless,
per step of one world, measured from step 0 to 250 (the startup transient):
- 2,000 fleas on 500 H: random 0.45 ms (was 20), strategic 7 ms (was 213)
- 10,000 on 5,000 H (default density): random 1.9 ms, strategic 16 ms
- 10,000 on 500 H: random 1.8 ms, strategic 44 ms
- 10,000 on 20 H (a carpet, 500 fleas per H): random 2 ms, strategic 130 ms
In the browser (hidden pane, so timed directly, both worlds per step after 300 warm-up steps):
33 ms at 10k on 5,000 H, 71 ms at 10k on 500 H; drawing a frame takes about 3 ms.
**Next:** the carpet case is still slow for strategic fleas. Ask Chris whether the ground
should grow with the population, which keeps density fixed when fleas are added.

## 2026-11-05 — adding fleas over time
**Done:** three independent switches, all stopped at `maxFleas` (default 200): a steady
trickle (one flea every `addEvery`, the same arrivals in both worlds), one flea each time a
flea reaches `heightK`·H (at most once per flight), and one flea each time a flight lands with
a new height record. Newcomers land on a random spot (their own seeded stream) and rest before
their first jump. Added a "Fleas" line chart. "Starting fleas" replaces "Fleas per world".
Chris turned down births from success with inherited strategy (too evolutionary for now).
**Changed:** `src/params.js`, `src/flea.js` (reachedK), `src/world.js` (addFlea, step 4),
`src/datamanager.js` (count), `src/ui.js`, `index.html`, `smoketest.mjs` (growth invariant).
**State:** smoke PASS in every mode. Browser pane: height-k switched on live, 100 time units →
random 53 fleas, strategic 200, chart matches, no console errors. Defaults, seed 1, 300 time
units (final fleas random / strategic; "earned" counts flights past the cap too):
- trickle every 2: 189 / 189; records 4.71 / 5.78; longest chains 41 / 39
- height k=2: 200 / 200 (earned 455 / 1818); records 4.45 / 6.86
- height k=3: 40 / 200. The random world never reaches 3 H at 40 fleas, so it never grows;
  the strategic world runs away to the cap. A threshold in k between the two strategies.
- new record: 59 / 57. Records get rarer as they rise, so growth slows.
Cost: strategic world ≈ 3.3 ms/tick averaged over that k=2 run (most of it at 200 fleas).
**Next:** the k=3 threshold looks like the interesting result: sweep k × starting fleas.

## 2026-11-05 — measure: most jump-offs in one flight
**Done:** what Chris actually asked for (the cap above was a misreading he decided to keep as a
mechanism). Each landed flight now reports its chain, meaning its jump-offs between ground and
ground. Two new lines per world: the most jump-offs in one flight, all time, and over the last
10 time units. "Mean jump-offs per flight" is now taken from landed flights' chains rather than
from jump-off events in the window.
**Changed:** `src/world.js` (period.chains), `src/datamanager.js`, `src/ui.js`, `index.html`.
**State:** smoke PASS; in the browser pane after 200 time units at defaults, the chart's
all-time chain equals the world's own count (random 9, strategic 10), and mean jump-offs per
flight are 0.63 / 0.99. No console errors.
**Next:** unchanged: test the mid-air re-plan guess.

## 2026-11-05 — cap on jump-offs per flight
**Done:** `maxJumpOffs` (none / 1 / 2 / 3 / 5 / 10 / unlimited, default unlimited): jump-offs a
flea may make before it touches ground again. A flea at its cap passes by the fleas it meets
instead of jumping off them, though they can still jump off it. The planner respects it: no
plan with no jump-offs left, lookahead stops at the cap, and a capped flea met from below is
not counted against a plan.
**Changed:** `src/params.js`, `src/world.js`, `src/planner.js`, `smoketest.mjs` (new invariant:
longest chain <= cap).
**State:** smoke PASS at every cap; checked in the browser pane (cap 1 → both worlds' chains 1,
records 1.97 / 2.00). Defaults, seed 1, 300 time units, strategic world (mean peak, >1H, record):
- cap 0: 0.62, 0%, 1.00 (random identical: one jump is the ceiling, as it should be)
- cap 1: 1.49, 76%, 2.00 (random 0.72, 21%, 1.98)
- cap 2: 1.43, 56%, 2.98 · cap 3: 1.29, 46%, 3.70 · unlimited: 1.09, 38%, 4.24
- recoil off, strategic: cap 1 mean 1.61, 89% · unlimited mean 1.35, 52%, record 5.16
The cap RAISES the typical strategic flight and lowers only the tail. Recoil is not the cause
(same pattern with it off). Untested guess: in mid-air, an uncapped flea trades a sure full
jump (y + 1) for a planned intercept whose prediction often gets spoiled; at cap 1 it always
takes the sure jump.
**Next:** test that guess: log how often a mid-air plan's predicted contact actually happens.

## 2026-11-05 — Stage 1 prototype: random vs strategic
**Done:** built from engine v2 in one session from Chris's description. Two worlds, same seed:
random (control) and strategic (intercept planner, lookahead 1/2). Live view on Claude Basic
0.6.0 (vendored in `vendor/`). Smoke test with invariants.
**Changed:** `src/{util,params,flea,planner,world,datamanager,observer,ui,main}.js`,
`index.html`, `smoketest.mjs`; removed the scaffold's demo agent/charts and `runner.mjs`.
**State:** runs in the browser (no console errors, checked in the desktop browser pane at
http://localhost:8000/research/Flea%20Jumping/sim/). `node smoketest.mjs` PASS. Defaults,
300 time units, seeds 1/2/3 (flights, mean peak, p99, share of flights above 1 H, record):
- random:    ~3400 flights, mean 0.67/0.66/0.67, p99 1.94/1.91/1.95, >1H 18/16/17%, record 2.73/2.70/3.15
- strategic: ~2270 flights, mean 1.09/1.10/1.10, p99 3.08/3.15/3.24, >1H 38/37/36%, record 4.24/3.97/4.14
- control pushing off at full height (`controlFullPush`): mean 0.76/0.76/0.75, p99 2.50/2.50/2.54,
  >1H 22.5/22.9/22.5%. So aiming, not just pushing hard, carries most of the gap.
- lookahead 2 (seed 1; 30 fleas/width 20 and 60/width 12): strategic mean 1.044 vs 1.046 and 1.257 vs 1.274, no gain.
- dense, 60 fleas, width 12: random record 3.43, strategic 5.57; recoil off: 4.53 / 6.35.
Strategic world runs ~20× slower per tick (≈0.17 ms/tick at defaults headless).
**Next:** Chris's read of the prototype; then Stage 2 (sweep over density with seeds).
