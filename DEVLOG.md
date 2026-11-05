# Flea Jumping — DEVLOG
Newest entry on top. **Append only — never edit past entries.**

<!-- append new entries above this line -->

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
