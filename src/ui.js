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

function wireCharts(dm, worlds) {
  const dx = PARAMETERS.reportingPeriod * PARAMETERS.dt;   // chart x is sim time
  const pair = (key) => worlds.map((w, k) => ({ label: w.label, values: dm.series[k][key], color: WORLD_COLORS[k] }));
  $('record').data = { dx: dx, series: pair('record').concat([{ label: 'one jump', values: dm.oneJump, color: 'var(--cb-muted)' }]) };
  $('best').data = { dx: dx, series: pair('best').concat([{ label: 'one jump', values: dm.oneJump, color: 'var(--cb-muted)' }]) };
  $('mean').data = { dx: dx, series: pair('meanPeak') };
  $('offs').data = { dx: dx, series: pair('perFlight') };
  $('histR').data = { dx: dx, columns: dm.series[0].hist };
  $('histS').data = { dx: dx, columns: dm.series[1].hist };
  for (const id of ['histR', 'histS']) { $(id).setAttribute('hi', PARAMETERS.histTop); }
}

// browser-only entity: keeps the dial and the world's colours current
var UiPump = class UiPump {
  constructor(world, observer) { this.world = world; this.observer = observer; this.frame = 0; }
  update() {}
  draw() {
    $('clock').value = this.world.time;
    if (++this.frame % 60 === 0) this.observer.c = worldColors();   // follows a theme change
  }
};
