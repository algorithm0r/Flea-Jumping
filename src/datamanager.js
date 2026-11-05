'use strict';
// Samples both worlds every reportingPeriod ticks into plain arrays. The charts (wired once
// in ui.js) read these arrays by reference; nothing here touches the DOM, so the same
// datamanager runs headless.
//
// Flights are few per period, so the per-flight reports (mean peak, jump-offs per flight,
// the peak histogram) are taken over a sliding window of the last WINDOW samples.
var DM_WINDOW = 10;

var DataManager = class DataManager {
  constructor(worlds) {
    this.worlds = worlds;                 // [random, strategic]
    this.series = worlds.map(() => ({
      record: [], best: [], meanPeak: [], perFlight: [], hist: [],
      _peaks: [], _offs: [],              // sliding window: one entry per sample
    }));
    this.oneJump = [];                    // the 1 H reference line, same length as the rest
  }

  update() {
    if (this.worlds[0].tick % PARAMETERS.reportingPeriod !== 0) return;
    this.worlds.forEach((w, k) => this.sample(w, this.series[k]));
    this.oneJump.push(1);
  }

  sample(w, s) {
    const P = PARAMETERS, p = w.period;
    s._peaks.push(p.peaks); s._offs.push(p.jumpOffs);
    if (s._peaks.length > DM_WINDOW) { s._peaks.shift(); s._offs.shift(); }
    w.resetPeriod();

    let n = 0, sum = 0, offs = 0, best = 0;
    const bins = new Array(P.histBins).fill(0);
    for (let i = 0; i < s._peaks.length; i++) {
      offs += s._offs[i];
      for (const h of s._peaks[i]) {
        n++; sum += h; if (h > best) best = h;
        bins[Math.min(P.histBins - 1, Math.floor(h / P.histTop * P.histBins))]++;
      }
    }
    s.record.push(w.record);
    s.best.push(n ? best : null);           // a gap, not a zero, when nobody landed
    s.meanPeak.push(n ? sum / n : null);
    s.perFlight.push(n ? offs / n : null);
    s.hist.push(bins);
  }

  draw() {}
};
