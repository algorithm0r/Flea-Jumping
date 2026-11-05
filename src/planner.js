'use strict';
// ════════════════════════════════════════════════════════════════════════════════════
// The strategic flea's planner.
//
// Every airborne flea is on a known parabola, so "where will flea j be at time T" has an
// exact answer (until somebody collides with j, which the planner does not foresee). To land
// on j at time T, a flea at (x0, y0) needs exactly one launch velocity:
//
//     vx = gap(x0 → xj(T)) / tau          vy = (yj(T) + aim − y0 + ½·g·tau²) / tau
//
// with tau = T − now and `aim` a little above j's centre, so we arrive from above. The
// search sweeps tau over every j still in the air and keeps the launches the flea can
// actually make (0 ≤ vy ≤ VY_MAX, |vx| ≤ vxMax). That gives candidate intercepts at many
// heights. Each candidate is then checked by stepping the arc forward on the sim's own clock
// against everyone in the air: the FIRST flea touched decides the outcome, and if we touch
// it from below, it jumps off us instead, so the candidate is thrown out.
//
// The value of a plan is the height it gets the flea to: the contact height plus one full
// jump (H = 1). With lookahead 2, the value also counts the best intercept the flea could
// plan from the contact point, so a lower first hit that sets up a higher second one wins.
//
// THE CAP: `jumpsLeft` is how many jump-offs the flea may still make before it lands
// (PARAMETERS.maxJumpOffs per flight). With none left there is nothing to plan, and lookahead
// stops at the cap. A flea at ITS cap that we would meet from below passes by us instead of
// jumping off us, so the check does not count that contact against the plan.
// ════════════════════════════════════════════════════════════════════════════════════

var PLAN_MAX_CHECKS = 12;   // candidates verified per plan, best-first

// Who a planning flea considers: the airborne fleas near enough to meet within its flight,
// taken from the world's air grid nearest-first, up to PARAMETERS.planMaxTracked. Below that
// number this is everyone who could matter, so the plan is exact; in a dense crowd it is an
// attention limit, and the farthest fleas in range go unwatched.
function plannerField(world, x0, T0, tau) {
  const P = PARAMETERS;
  const R = vxMax() * tau + world.maxAirVx * (T0 - world.time + tau) + 2 * P.fleaRadius;
  return world.near(x0, R, P.planMaxTracked);
}

/**
 * Best intercept for `self` launching from (x0, y0) at time T0, or null.
 * @returns {{vx:number, vy:number, value:number, targetId:number}|null}
 */
function planJump(world, self, x0, y0, T0, depth, excludeId, jumpsLeft) {
  if (jumpsLeft < 1) return null;
  const P = PARAMETERS, W = world.width;
  const vxm = vxMax();
  const aim = 1.5 * P.fleaRadius;
  const tauMax = (VY_MAX + Math.sqrt(VY_MAX * VY_MAX + 2 * GRAVITY * y0)) / GRAVITY;
  const reach = vxm * tauMax + 2 * P.fleaRadius;
  const field = plannerField(world, x0, T0, tauMax);

  const cands = [];
  for (const o of field) {
    if (o === self || !o.airborne || o.id === excludeId) continue;
    // cheap reject: too far away horizontally for either of us to close the gap in time
    if (Math.abs(wrapDx(o.x - x0, W)) > reach + Math.abs(o.avx) * tauMax) continue;
    const tl = o.landTime();
    for (let tau = P.planStep; tau < tauMax; tau += P.planStep) {
      const T = T0 + tau;
      if (T >= tl) break;
      const ty = o.yAt(T) + aim;
      const vy = (ty - y0 + 0.5 * GRAVITY * tau * tau) / tau;
      if (vy < 0 || vy > VY_MAX) continue;
      const vx = wrapDx(o.xAt(T) - x0, W) / tau;
      if (vx > vxm || vx < -vxm) continue;
      // keep only the PLAN_MAX_CHECKS highest, in order (a full sort is the hot spot in crowds)
      if (cands.length === PLAN_MAX_CHECKS && ty <= cands[PLAN_MAX_CHECKS - 1].h) continue;
      let i = cands.length < PLAN_MAX_CHECKS ? cands.length : PLAN_MAX_CHECKS - 1;
      while (i > 0 && cands[i - 1].h < ty) { if (i < PLAN_MAX_CHECKS) cands[i] = cands[i - 1]; i--; }
      cands[i] = { vx: vx, vy: vy, h: ty };
    }
  }
  if (!cands.length) return null;

  let best = null;
  const n = cands.length;
  for (let k = 0; k < n; k++) {
    const c = cands[k];
    // with no lookahead, candidates are sorted by height, so the first good one is the best
    if (best && depth === 1) break;
    const hit = firstContact(world, self, x0, y0, c.vx, c.vy, T0, excludeId, field);
    if (!hit || !hit.onTop) continue;
    let value = Math.max(hit.peakBefore, hit.y + 1);
    if (depth > 1 && jumpsLeft > 1) {
      const sub = planJump(world, self, hit.x, hit.y, hit.T, depth - 1, hit.id, jumpsLeft - 1);
      if (sub && sub.value > value) value = sub.value;
    }
    if (!best || value > best.value) best = { vx: c.vx, vy: c.vy, value: value, targetId: hit.id };
  }
  return best;
}

/**
 * Step a hypothetical arc forward on the sim's clock and report the first flea it touches.
 * Others are assumed to stay on their current arcs.
 */
function firstContact(world, self, x0, y0, vx, vy, T0, excludeId, field) {
  const P = PARAMETERS, W = world.width, dt = P.dt;
  const d2 = 4 * P.fleaRadius * P.fleaRadius;
  const tl = (vy + Math.sqrt(vy * vy + 2 * GRAVITY * y0)) / GRAVITY;
  const others = [], lands = [];
  for (const o of field || plannerField(world, x0, T0, tl)) {
    if (o === self || !o.airborne || o.id === excludeId) continue;
    others.push(o); lands.push(o.landTime());
  }
  let peak = y0;
  for (let s = dt; s <= tl; s += dt) {
    const T = T0 + s;
    const x = x0 + vx * s, y = y0 + vy * s - 0.5 * GRAVITY * s * s;
    if (y > peak) peak = y;
    for (let i = 0; i < others.length; i++) {
      if (T >= lands[i]) continue;
      const o = others[i];
      const dx = wrapDx(o.xAt(T) - x, W), dy = y - o.yAt(T);
      if (dx * dx + dy * dy < d2) {
        if (dy <= 0 && o.flightJumpOffs >= P.maxJumpOffs) continue;   // it's capped: passes by
        return { id: o.id, T: T, x: wrapX(x, W), y: y, onTop: dy > 0, peakBefore: peak };
      }
    }
  }
  return null;
}
