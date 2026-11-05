'use strict';
// Pure helpers — no DOM, no globals beyond these. Safe to load in the browser AND headless
// (declared as `var`/`function` so they attach to either global).
var TAU = Math.PI * 2;
var GRAVITY = 1;
var VY_MAX = Math.sqrt(2 * GRAVITY * 1);   // launch speed of a full-height (H = 1) jump

function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

// Seeded PRNG (mulberry32) so a seed reproduces a run. Returns a () => [0,1) function.
function makeRng(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ring geometry: wrap a coordinate into [0, w), and the shortest signed gap a→b.
function wrapX(x, w) { x %= w; return x < 0 ? x + w : x; }
function wrapDx(dx, w) {
  dx %= w;
  if (dx > w / 2) dx -= w; else if (dx < -w / 2) dx += w;
  return dx;
}

// Horizontal speed limit: a full-height jump at this speed covers maxRange.
function vxMax() { return PARAMETERS.maxRange / (2 * VY_MAX / GRAVITY); }
