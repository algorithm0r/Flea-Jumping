# Flea Jumping — DEVLOG
Newest entry on top. **Append only — never edit past entries.**

<!-- append new entries above this line -->

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
