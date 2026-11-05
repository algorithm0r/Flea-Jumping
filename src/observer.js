'use strict';
// The view. Draws both worlds as two lanes, one above the other, on one canvas, with the
// same scale for both, so a height in one lane is the same height in the other. Never
// mutates the model. Colours come in from ui.js (read off the kit's CSS tokens).
//
// The scale is honest: x and y share one pixels-per-H, and the view zooms out when a flea
// climbs past the top, so tall flights shrink the picture rather than leave it.
var CROWD = 1500;   // above this many fleas a lane draws the cheap way

var Observer = class Observer {
  constructor(worlds, colors) {
    this.worlds = worlds;
    this.c = colors;
    this.viewTop = 2.2;   // heights shown, in H (eased toward what the fleas need)
  }

  update() {
    const need = Math.max(2.2, 1.12 * Math.max(...this.worlds.map((w) => w.maxY)));
    // zoom out fast, back in slowly
    this.viewTop += (need - this.viewTop) * (need > this.viewTop ? 0.2 : 0.004);
  }

  draw(ctx) {
    const cw = ctx.canvas.width, ch = ctx.canvas.height;
    const laneH = ch / this.worlds.length;
    const W = this.worlds[0].width;
    const pad = 22;
    const scale = Math.min((cw - 2 * pad) / W, (laneH - 2 * pad) / this.viewTop);
    const left = (cw - W * scale) / 2;
    ctx.fillStyle = this.c.bg; ctx.fillRect(0, 0, cw, ch);
    this.worlds.forEach((w, k) => this.drawLane(ctx, w, k * laneH, laneH, left, scale, cw, pad));
  }

  drawLane(ctx, w, top, laneH, left, scale, cw, pad) {
    const c = this.c;
    const ground = top + laneH - pad;
    const X = (x) => left + x * scale, Y = (y) => ground - y * scale;
    ctx.save();
    if (top > 0) { ctx.strokeStyle = c.rule; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, top + 0.5); ctx.lineTo(cw, top + 0.5); ctx.stroke(); }

    ctx.fillStyle = c.muted; ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(w.label, 10, top + 18);

    // reference lines: one full jump (dashed), this world's record (solid)
    ctx.lineWidth = 1;
    ctx.strokeStyle = c.muted; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(0), Y(1)); ctx.lineTo(X(w.width), Y(1)); ctx.stroke();
    ctx.setLineDash([]);
    if (w.record > 0 && Y(w.record) > top) {
      ctx.strokeStyle = c.record;
      ctx.beginPath(); ctx.moveTo(X(0), Y(w.record)); ctx.lineTo(X(w.width), Y(w.record)); ctx.stroke();
    }
    ctx.strokeStyle = c.fg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(0), ground + 0.5); ctx.lineTo(X(w.width), ground + 0.5); ctx.stroke();

    const rad = Math.max(2, PARAMETERS.fleaRadius * scale);
    const crowd = w.fleas.length > CROWD;   // thousands of fleas: squares, no aim lines

    // who is aiming at whom (strategic only): a faint line to the intended platform
    ctx.strokeStyle = c.aim; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    if (!crowd) for (const f of w.fleas) {
      if (!f.airborne || f.target < 0) continue;
      const t = w.fleas[f.target];
      if (!t.airborne) continue;
      const dx = wrapDx(t.x - f.x, w.width);
      ctx.beginPath(); ctx.moveTo(X(f.x), Y(f.y)); ctx.lineTo(X(f.x + dx), Y(t.y)); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const f of w.fleas) {
      ctx.fillStyle = !f.airborne ? c.muted : (f.target >= 0 ? c.aim : c.fg);
      const cy = Y(f.y) - (f.airborne ? 0 : rad);
      if (crowd) { ctx.fillRect(X(f.x) - rad, cy - rad, 2 * rad, 2 * rad); continue; }
      ctx.beginPath(); ctx.arc(X(f.x), cy, rad, 0, TAU); ctx.fill();
      if (w.time < f.flashUntil) {
        ctx.strokeStyle = c.jump; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(X(f.x), Y(f.y), rad + 3, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }
};
