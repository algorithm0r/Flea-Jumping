'use strict';
// One population of fleas on a ring of ground. The world holds state and advances it; it
// draws nothing (the Observer does), which is what lets it run headless.
//
// Two worlds run side by side with the same parameters and seed. They differ only in how a
// flea chooses a jump:
//   random    — every jump, from the ground or off another flea, is a random jump
//               (height ~ U(minHeight, 1), sideways speed ~ U(−vxMax, vxMax)).
//   strategic — a ready flea searches for an intercept (planner.js) and takes the best one;
//               after `patience` with none, it makes the same random jump the control makes.
//               Off another flea, it plans again from the contact point, and with nothing to
//               aim at it jumps straight up at full height.
//
// ADDING FLEAS: three independent switches, all stopped at maxFleas. A newcomer lands on a
// random spot and rests before its first jump. Arrival spots come from their own random
// stream, seeded the same in both worlds, so a steady trickle is identical in the two lanes;
// the height and record rules are earned, so each world grows at its own pace.
//   trickle — one flea every addEvery time units
//   height  — one flea each time a flea reaches heightK·H, at most once per flight
//   record  — one flea each time a flight lands with a new height record
//
// THE JUMP-OFF: when two airborne fleas touch, the higher one makes a brand-new jump from
// that point (its old velocity is replaced), unless it has already used its maxJumpOffs for
// this flight; then the two pass by each other. With recoil on, the lower one takes the equal
// and opposite change in velocity (equal masses), so it is driven down.
var World = class World {
  constructor(strategic, seed) {
    const P = PARAMETERS;
    this.strategic = strategic;
    this.label = strategic ? 'strategic' : 'random';
    this.rng = makeRng(seed);
    this.arrivalRng = makeRng(seed + 7919);   // newcomers' spots, separate from the jumping
    this.width = P.worldWidth;
    this.time = 0;
    this.tick = 0;
    this.fleas = [];
    for (let i = 0; i < P.nFleas; i++) {
      const f = new Flea(i, this.rng() * this.width);
      f.restUntil = this.restTime();
      this.fleas.push(f);
    }
    // all-time
    this.record = 0;          // highest flight peak ever, in H
    this.recordChain = 0;     // most jump-offs in one flight
    this.flights = 0;
    this.jumpOffs = 0;
    this.maxY = 0;            // highest flea right now
    this.lastArrival = 0;     // trickle clock
    this.pendingFleas = 0;    // earned this tick, added at the end of it
    this.added = { trickle: 0, height: 0, record: 0 };
    this.resetPeriod();
  }

  // accumulators the DataManager drains once per reporting period
  resetPeriod() { this.period = { peaks: [], chains: [], jumpOffs: 0, intercepts: 0 }; }

  restTime() { return -PARAMETERS.restMean * Math.log(1 - this.rng()); }

  randomVelocity() {
    const P = PARAMETERS;
    const h = P.minHeight + (1 - P.minHeight) * this.rng();
    return { vx: (2 * this.rng() - 1) * vxMax(), vy: Math.sqrt(2 * GRAVITY * h) };
  }

  update() {
    const P = PARAMETERS;
    this.tick++;
    this.time += P.dt;
    const T = this.time;

    // 1. fly along arcs; land
    let maxY = 0;
    for (const f of this.fleas) {
      if (!f.airborne) continue;
      const s = T - f.at;
      f.x = wrapX(f.ax + f.avx * s, this.width);
      f.y = f.ay + f.avy * s - 0.5 * GRAVITY * s * s;
      f.vx = f.avx; f.vy = f.avy - GRAVITY * s;
      if (f.y > f.flightPeak) f.flightPeak = f.y;
      if (P.growOnHeight && !f.reachedK && f.y >= P.heightK) {
        f.reachedK = true; this.pendingFleas++; this.added.height++;
      }
      if (f.y <= 0) this.land(f);
      else if (f.y > maxY) maxY = f.y;
    }
    this.maxY = maxY;

    // 2. mid-air contacts: the higher flea jumps off the lower one
    this.collide(T);

    // 3. fleas on the ground decide whether to jump
    for (const f of this.fleas) {
      if (f.airborne || T < f.restUntil) continue;
      if (!this.strategic) { this.jumpFromGround(f, this.randomVelocity(), -1); continue; }
      if ((this.tick + f.id) % P.planEvery !== 0) continue;
      const plan = planJump(this, f, f.x, 0, T, P.lookahead, -1, P.maxJumpOffs);
      if (plan) { this.jumpFromGround(f, plan, plan.targetId); this.period.intercepts++; }
      else if (T - f.restUntil >= P.patience) this.jumpFromGround(f, this.randomVelocity(), -1);
    }

    // 4. newcomers
    if (P.growTrickle && T - this.lastArrival >= P.addEvery) {
      this.lastArrival = T; this.pendingFleas++; this.added.trickle++;
    }
    for (; this.pendingFleas > 0; this.pendingFleas--) {
      if (this.fleas.length >= P.maxFleas) { this.pendingFleas = 0; break; }
      this.addFlea();
    }
  }

  addFlea() {
    const f = new Flea(this.fleas.length, this.arrivalRng() * this.width);   // id = index
    f.restUntil = this.time + this.restTime();
    this.fleas.push(f);
  }

  jumpFromGround(f, v, target) {
    f.flightPeak = 0; f.flightJumpOffs = 0; f.reachedK = false; f.target = target;
    f.launch(f.x, 0, v.vx, v.vy, this.time);
  }

  land(f) {
    f.y = 0; f.vx = 0; f.vy = 0; f.airborne = false; f.target = -1;
    f.restUntil = this.time + this.restTime();
    this.flights++;
    this.period.peaks.push(f.flightPeak);
    this.period.chains.push(f.flightJumpOffs);
    if (f.flightPeak > this.record) {
      this.record = f.flightPeak;
      if (PARAMETERS.growOnRecord) { this.pendingFleas++; this.added.record++; }
    }
    if (f.flightJumpOffs > this.recordChain) this.recordChain = f.flightJumpOffs;
  }

  collide(T) {
    const P = PARAMETERS, W = this.width;
    const d2 = 4 * P.fleaRadius * P.fleaRadius;
    const air = this.fleas.filter((f) => f.airborne);
    const touched = new Set();   // one contact per flea per tick
    for (let i = 0; i < air.length; i++) {
      const a = air[i];
      if (touched.has(a.id)) continue;
      for (let j = i + 1; j < air.length; j++) {
        const b = air[j];
        if (touched.has(b.id)) continue;
        const dx = wrapDx(b.x - a.x, W), dy = b.y - a.y;
        if (dx * dx + dy * dy >= d2) continue;
        if (a.lastPartner === b.id && T - a.lastContact < P.cooldown) continue;
        if (b.lastPartner === a.id && T - b.lastContact < P.cooldown) continue;
        const upper = dy > 0 ? b : a, lower = dy > 0 ? a : b;
        if (upper.flightJumpOffs >= P.maxJumpOffs) continue;   // capped: they pass by each other
        this.jumpOff(upper, lower, T);
        touched.add(a.id); touched.add(b.id);
        break;
      }
    }
  }

  jumpOff(upper, lower, T) {
    const P = PARAMETERS;
    let v = null;
    if (this.strategic) {
      // this jump-off uses one; plan with what remains after it
      const left = P.maxJumpOffs - upper.flightJumpOffs - 1;
      const plan = planJump(this, upper, upper.x, upper.y, T, P.lookahead, lower.id, left);
      // only worth it if it beats the fallback below: straight up at full height
      if (plan && plan.value > upper.y + 1 + 1e-6) { v = plan; upper.target = plan.targetId; this.period.intercepts++; }
      else { v = { vx: (2 * this.rng() - 1) * vxMax(), vy: VY_MAX }; upper.target = -1; }
    } else {
      v = P.controlFullPush ? { vx: (2 * this.rng() - 1) * vxMax(), vy: VY_MAX } : this.randomVelocity();
    }
    if (P.recoil) {
      lower.launch(lower.x, lower.y, lower.vx - (v.vx - upper.vx), lower.vy - (v.vy - upper.vy), T);
      lower.target = -1;   // its plan, if any, is spoiled
    }
    upper.launch(upper.x, upper.y, v.vx, v.vy, T);
    upper.flightJumpOffs++;
    upper.flashUntil = T + 0.4;
    upper.lastPartner = lower.id; upper.lastContact = T;
    lower.lastPartner = upper.id; lower.lastContact = T;
    this.jumpOffs++;
    this.period.jumpOffs++;
  }
};
