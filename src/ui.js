'use strict';
// ALL DOM lives here (and in index.html). The sim classes never touch the document, which
// is what keeps them headless. Builds the control strip from PARAM_SCHEMA, reads the
// world's colours off the kit's tokens, and wires each chart once to the datamanager.
var $ = (id) => document.getElementById(id);

// The world canvas can't read CSS variables, so resolve the tokens it uses to colours.
function worldColors() {
  const cs = getComputedStyle(document.body);
  const v = (name) => cs.getPropertyValue(name).trim();
  return {
    bg: v('--cb-sunken'), fg: v('--cb-text'), muted: v('--cb-muted'), rule: v('--cb-border'),
    aim: v('--cb-gold'), jump: v('--cb-warn'), record: v('--cb-accent'),
  };
}

// The two worlds keep one colour each across every chart.
var WORLD_COLORS = ['var(--cb-series-2)', 'var(--cb-series-1)'];

function buildControls() {
  CB.sim.controls($('controls'), PARAM_SCHEMA, PARAMETERS, {
    onReset: reset,
    buttons: [
      { label: 'Pause', onClick: (e) => { togglePause(); e.target.textContent = paused ? 'Run' : 'Pause'; } },
      { label: 'Reset', primary: true, onClick: reset },
    ],
  });
}

// Each line chart's legend carries its lines' latest values ("random 40 · strategic 57").
// Heights read to two decimals, counts as whole numbers.
var LIVE_CHARTS = { count: 0, record: 2, best: 2, mean: 2, offs: 2, chainRecord: 0, chainBest: 0 };

function wireCharts(dm, worlds) {
  const dx = PARAMETERS.reportingPeriod * PARAMETERS.dt;   // chart x is sim time
  const pair = (key) => worlds.map((w, k) => ({ label: w.label, name: w.label, values: dm.series[k][key], color: WORLD_COLORS[k] }));
  $('count').data = { dx: dx, series: pair('count') };
  $('record').data = { dx: dx, series: pair('record').concat([{ label: 'one jump', values: dm.oneJump, color: 'var(--cb-muted)' }]) };
  $('best').data = { dx: dx, series: pair('best').concat([{ label: 'one jump', values: dm.oneJump, color: 'var(--cb-muted)' }]) };
  $('mean').data = { dx: dx, series: pair('meanPeak') };
  $('offs').data = { dx: dx, series: pair('perFlight') };
  $('chainRecord').data = { dx: dx, series: pair('chainRecord') };
  $('chainBest').data = { dx: dx, series: pair('chainBest') };
  $('histR').data = { dx: dx, columns: dm.series[0].hist };
  $('histS').data = { dx: dx, columns: dm.series[1].hist };
  for (const id of ['histR', 'histS']) { $(id).setAttribute('hi', PARAMETERS.histTop); }
}

function refreshLegends() {
  for (const id in LIVE_CHARTS) {
    const el = $(id), d = el.data;
    for (const s of d.series) {
      if (!s.name) continue;   // reference lines keep their plain name
      let v = null;
      for (let i = s.values.length - 1; i >= 0 && v == null; i--) v = s.values[i];
      s.label = v == null ? s.name : s.name + ' ' + v.toFixed(LIVE_CHARTS[id]);
    }
    el.data = d;   // re-renders the head
  }
}

// browser-only entity: keeps the dial, the legends' latest values and the world's colours current
var UiPump = class UiPump {
  constructor(world, observer, dm) { this.world = world; this.observer = observer; this.dm = dm; this.frame = 0; this.seen = -1; }
  update() {}
  draw() {
    $('clock').value = this.world.time;
    if (this.dm.oneJump.length !== this.seen) { this.seen = this.dm.oneJump.length; refreshLegends(); }
    if (++this.frame % 60 === 0) this.observer.c = worldColors();   // follows a theme change
  }
};
