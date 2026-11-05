'use strict';
// Single source of truth for every tunable. Serialized verbatim into every saved data
// packet so any run reconstructs from its stored parameters.
// Declared `var` so it's a global in the browser AND in the headless realm.
//
// UNITS: the max single-jump height H is the unit of length (H = 1), and gravity is 1.
// So a full-height jump launches at vy = sqrt(2) and stays up 2·sqrt(2) ≈ 2.83 time units.
// Every height the sim reports is in H: "3.2" means three-and-a-bit full jumps high.
var PARAMETERS = {
  seed: 1,

  // --- fleas ---
  nFleas: 40,           // fleas per world (each world gets the same number)
  worldWidth: 20,       // length of the 1D ground, in H; the ground wraps (a ring)
  fleaRadius: 0.1,      // collision radius, in H; two fleas touch when 2r apart
  maxRange: 1.5,        // horizontal distance of a full-height jump at full sideways speed, in H
  minHeight: 0.25,      // a random jump's height is drawn from U(minHeight, 1)
  restMean: 1.0,        // mean time on the ground between jumps (exponential)

  // --- the jump-off ---
  recoil: true,         // the lower flea is kicked down by the upper flea's push (equal masses)
  cooldown: 0.3,        // a pair that just touched can't touch again for this long
  maxJumpOffs: 1000,    // jump-offs a flea may make in one flight before it touches ground again;
                        // a flea at its cap passes by the fleas it meets instead of jumping off
                        // them, though they can still jump off it (0 = none, 1000 = no cap)
  controlFullPush: false, // control world: jump off at full height (as strategic fleas do when
                          // they have no target) instead of a random jump. Isolates aiming.

  // --- strategic fleas ---
  lookahead: 1,         // 1 = plan the next jump; 2 = also plan the jump off the flea you hit
  patience: 2.0,        // a ready flea that finds no intercept for this long jumps at random
  planEvery: 4,         // ticks between a waiting flea's re-plans (cost control)
  planStep: 0.05,       // time resolution of the intercept search

  // --- engine ---
  dt: 0.02,             // sim time per tick
  updatesPerDraw: 2,    // fast-forward: ticks per rendered frame

  // --- data collection ---
  reportingPeriod: 50,  // ticks per chart sample (50 ticks = 1 time unit)
  histBins: 30,         // flight-peak histogram: bins over [0, histTop]
  histTop: 6,           // peaks above this land in the top bin
};

// Drives the control strip (CB.sim.controls). One entry per live-tunable.
var PARAM_SCHEMA = [
  { key: 'nFleas', label: 'Fleas per world', min: 5, max: 300, step: 5, resets: true },
  { key: 'worldWidth', label: 'Ground length (H)', min: 2, max: 60, step: 1, resets: true },
  { key: 'fleaRadius', label: 'Flea radius (H)', min: 0.02, max: 0.3, step: 0.01 },
  { key: 'maxRange', label: 'Max jump range (H)', min: 0, max: 6, step: 0.1 },
  { key: 'minHeight', label: 'Min random height (H)', min: 0, max: 1, step: 0.05 },
  { key: 'restMean', label: 'Mean rest', min: 0, max: 5, step: 0.1 },
  { key: 'lookahead', label: 'Lookahead', options: [{ value: 1, label: '1 jump' }, { value: 2, label: '2 jumps' }] },
  { key: 'patience', label: 'Patience', min: 0, max: 10, step: 0.5 },
  { key: 'maxJumpOffs', label: 'Max jump-offs per flight', options: [
    { value: 0, label: 'none' }, 1, 2, 3, 5, 10, { value: 1000, label: 'unlimited' }] },
  { key: 'recoil', label: 'Recoil' },
  { key: 'controlFullPush', label: 'Random fleas push off at full height' },
  { key: 'updatesPerDraw', label: 'Speed', min: 1, max: 40, step: 1 },
  { key: 'seed', label: 'Seed', min: 1, max: 100, step: 1, resets: true },
];
