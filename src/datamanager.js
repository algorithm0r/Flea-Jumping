'use strict';
// Samples both worlds every reportingPeriod ticks into plain arrays. The charts (wired once
// in ui.js) read these arrays by reference; nothing here touches the DOM, so the same
// datamanager runs headless.
//
// Flights are few per period, so the per-flight reports (mean peak, jump-offs per flight,
// the longest chain, the peak histogram) are taken over a sliding window of the last WINDOW
// samples. A flight counts when it lands; its chain is its jump-offs between ground and ground.
var DM_WINDOW = 10;

var DataManager = class DataManager {
  constructor(worlds) {
    this.worlds = worlds;                 // [random, strategic]
    this.series = worlds.map(() => ({
      record: [], best: [], meanPeak: [], perFlight: [], hist: [],
      chainRecord: [], chainBest: [],     // most jump-offs in one flight: all time / in window
      count: [],                          // fleas in the world
      _peaks: [], _chains: [],            // sliding window: one entry per sample
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
    s._peaks.push(p.peaks); s._chains.push(p.chains);
    if (s._peaks.length > DM_WINDOW) { s._peaks.shift(); s._chains.shift(); }
    w.resetPeriod();

    let n = 0, sum = 0, offs = 0, best = 0, chain = 0;
    const bins = new Array(P.histBins).fill(0);
    for (let i = 0; i < s._peaks.length; i++) {
      const peaks = s._peaks[i], chains = s._chains[i];
      for (let j = 0; j < peaks.length; j++) {
        const h = peaks[j];
        n++; sum += h; if (h > best) best = h;
        offs += chains[j]; if (chains[j] > chain) chain = chains[j];
        bins[Math.min(P.histBins - 1, Math.floor(h / P.histTop * P.histBins))]++;
      }
    }
    s.record.push(w.record);
    s.best.push(n ? best : null);           // a gap, not a zero, when nobody landed
    s.meanPeak.push(n ? sum / n : null);
    s.perFlight.push(n ? offs / n : null);
    s.hist.push(bins);
    s.chainRecord.push(w.recordChain);
    s.chainBest.push(n ? chain : null);
    s.count.push(w.fleas.length);
  }

  draw() {}
};
