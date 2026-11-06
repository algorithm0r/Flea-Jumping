'use strict';
// Browser entry + wiring (not loaded headless). reset() rebuilds both worlds from the
// current PARAMETERS with the same seed, so the two start from the same ground.
var gameEngine, worlds, dataManager, observer, paused = false;

function reset() {
  gameEngine.clear();
  worlds = [new World(false, PARAMETERS.seed), new World(true, PARAMETERS.seed)];
  dataManager = new DataManager(worlds);
  observer = new Observer(worlds, worldColors());
  for (const w of worlds) gameEngine.add(w);
  gameEngine.add(dataManager);
  gameEngine.add(observer);
  gameEngine.add(new UiPump(worlds[0], observer, dataManager));
  wireCharts(dataManager, worlds);
}

function togglePause() {
  paused = !paused;
  if (paused) gameEngine.stop(); else gameEngine.start();
}

window.onload = function () {
  $('picker').appendChild(CB.theme.picker());
  gameEngine = new GameEngine();
  gameEngine.init($('gameWorld').getContext('2d'));
  buildControls();
  reset();
  gameEngine.start();
};
