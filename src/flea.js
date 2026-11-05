'use strict';
// One flea. Holds state only; the Observer draws it.
//
// An airborne flea is on a ballistic arc, stored as its launch state (ax, ay, avx, avy at
// time at). Position at any time T is then exact and analytic, which is what lets a
// strategic flea predict where everyone else will be: in this model the future of an arc
// is known until somebody collides with it.
var Flea = class Flea {
  constructor(id, x) {
    this.id = id;
    this.x = x; this.y = 0;            // x wrapped onto the ring; y = height above ground
    this.vx = 0; this.vy = 0;
    this.airborne = false;
    this.ax = x; this.ay = 0; this.avx = 0; this.avy = 0; this.at = 0;   // current arc
    this.restUntil = 0;                // ready to jump from the ground at this time
    this.flightPeak = 0;               // highest point of the current flight (ground to ground)
    this.flightJumpOffs = 0;           // jump-offs in the current flight
    this.reachedK = false;             // reached heightK this flight (earns at most one flea)
    this.lastPartner = -1; this.lastContact = -1e9;
    this.touchedTick = -1;             // made a contact this tick (one per flea per tick)
    this.target = -1;                  // strategic: id of the flea it means to land on
    this.flashUntil = -1;              // view hint: just jumped off someone
  }

  launch(x, y, vx, vy, t) {
    this.ax = x; this.ay = y; this.avx = vx; this.avy = vy; this.at = t;
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.airborne = true;
  }

  // Unwrapped position on the current arc at absolute time T.
  xAt(T) { return this.ax + this.avx * (T - this.at); }
  yAt(T) { const s = T - this.at; return this.ay + this.avy * s - 0.5 * GRAVITY * s * s; }

  // When the current arc meets the ground.
  landTime() {
    const vy = this.avy;
    return this.at + (vy + Math.sqrt(vy * vy + 2 * GRAVITY * this.ay)) / GRAVITY;
  }
};
