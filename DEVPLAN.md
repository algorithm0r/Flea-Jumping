# Flea Jumping — DEVPLAN
*Living document, not frozen. Update as the design evolves.*

## Built
- Stage 1 prototype: two worlds side by side (random control, strategic), the jump-off rule,
  the intercept planner with lookahead 1 or 2, live view on the Claude Basic sim layer,
  headless smoke test.

## Not yet built
- Headless sweep runner + DB packets; a strategy for the fleas being landed on.

## The model (design rationale)
- **Units.** H, the max height of one jump, is the unit of length; gravity is 1. Full jump:
  vy = √2, airtime 2√2 ≈ 2.83. Every reported height is in H.
- **Ground.** A 1D ring of length `worldWidth`, so nobody falls off an edge.
- **A jump** is a launch velocity with 0 ≤ vy ≤ √2 (height up to 1 H, the flea controls it)
  and |vx| ≤ vxMax (a full-height jump at full sideways speed covers `maxRange`). Arcs are exact
  parabolas, stored as launch state, so any flea's future position is a closed form.
- **Jump-off.** Two airborne fleas touch at distance 2r. The higher one makes a brand-new jump
  from the contact point (old velocity replaced). With `recoil`, the lower one takes the equal
  and opposite velocity change (equal masses) and is driven down. A pair can't re-touch for
  `cooldown`; a flea makes at most one contact per tick.
- **Random (control).** Rest ~ Exp(restMean), then a random jump: height ~ U(minHeight, 1),
  vx ~ U(−vxMax, vxMax). Off another flea: another random jump (or full height with
  `controlFullPush`, which isolates the effect of aiming from the effect of pushing hard).
- **Strategic.** When ready, every `planEvery` ticks: for every airborne flea j and every
  future time tau, solve for the one launch that arrives 1.5r above j at tau; keep the feasible
  ones; sort by contact height; verify best-first by stepping the arc on the sim's own clock
  against everyone in the air (the FIRST flea touched decides; touching from below disqualifies).
  Value = contact height + 1 (the jump you then get). Lookahead 2 adds the best intercept
  plannable from the contact point. No intercept for `patience` → the control's random jump.
  Off another flea it re-plans from there; nothing to aim at → straight up at full height.
- **What the planner does not foresee:** other fleas' future collisions (any jump-off spoils
  the predictions that involved those two) and fleas that are still on the ground.

## Stages
### Stage 1 — Prototype: random vs strategic  [ DONE ]
- [x] Ballistic fleas on a ring, the jump-off rule with recoil
- [x] Intercept planner, lookahead 1 and 2
- [x] Side-by-side view, record / best / mean / jump-offs lines, peak histogram heatmaps
- [x] `smoketest.mjs` with invariants (height above 1 H needs jump-offs; flights ran)
**Done when:** both worlds run in the browser and the smoke test prints a comparison. Met
2026-11-05 (see DEVLOG).

### Stage 2 — Measure it properly  [ PLANNED ]
- [ ] Headless runner over seeds and a density grid (nFleas × worldWidth × fleaRadius)
- [ ] EXPLOG ledger; pre-register settings before each batch
- [ ] Tail statistics of flight peaks (does the strategic tail fall off exponentially too?)
**Done when:** a figure of mean and p99 flight peak vs density, both worlds, with seed spread.

### Stage 3 — The platforms fight back  [ PLANNED ]
- [ ] Fleas that avoid being landed on, or that cooperate (offer themselves as platforms)
- [ ] Mixed populations: does strategy invade a random population?
**Done when:** Chris has picked which of these is the interesting question.

## Backlog
*Planned work too small for a stage. One line each, led by its type (`fix:` / `feat:` /
`idea:`). When a stage takes an item up, strike it: `~~item~~ → **Stage N**`.*
- [ ] idea: lookahead 2 gave no gain at default density (2026-11-05) — test it at high density
- [ ] idea: strategic fleas could also choose WHEN to jump (a launch-delay search), not only how
- [ ] feat: draw the record flight's trajectory as a trail
- [ ] feat: headless runner + `db.js` packets (`src/db.js` is vendored but unused)
- [ ] fix: random-world chains reach 30+ jump-offs in one flight at high density (60 fleas,
      width 12): check that these are real low-altitude scrums, not a cooldown artefact
