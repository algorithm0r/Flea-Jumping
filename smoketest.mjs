// No-DB sanity run: both worlds, same parameters and seed. Prints the numbers that belong in
// the DEVLOG entry (proof coupled to log) and checks two invariants. Exits non-zero on failure.
//   node smoketest.mjs [timeUnits=300] [key=value ...]     e.g.  node smoketest.mjs 300 lookahead=2
//
// Loads the SAME browser sim files into the MAIN V8 realm via indirect eval (NOT vm), per
// ~/.claude/conventions.md §4: strip 'use strict' so top-level var/class attach to globalThis.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indirectEval = eval;
for (const f of ['util.js', 'params.js', 'flea.js', 'planner.js', 'world.js']) {
  let src = readFileSync(path.join(__dirname, 'src', f), 'utf8');
  src = src.replace(/^\s*(['"])use strict\1;?/, '');
  indirectEval(src);
}

const P = globalThis.PARAMETERS;
const args = process.argv.slice(2);
const units = args[0] && !args[0].includes('=') ? +args.shift() : 300;
for (const kv of args) {
  const [k, v] = kv.split('=');
  P[k] = v === 'true' ? true : v === 'false' ? false : +v;
}

function run(strategic) {
  const w = new globalThis.World(strategic, P.seed);
  const peaks = [];
  const t0 = Date.now();
  const ticks = Math.round(units / P.dt);
  for (let t = 0; t < ticks; t++) {
    w.update();
    if (w.period.peaks.length) { peaks.push(...w.period.peaks); w.resetPeriod(); }
  }
  peaks.sort((a, b) => a - b);
  const q = (p) => peaks[Math.min(peaks.length - 1, Math.floor(p * peaks.length))] || 0;
  const mean = peaks.reduce((s, x) => s + x, 0) / (peaks.length || 1);
  const above1 = peaks.filter((x) => x > 1.0001).length / (peaks.length || 1);
  return { w, ms: Date.now() - t0, n: peaks.length, mean, p50: q(0.5), p99: q(0.99), above1 };
}

const R = run(false), S = run(true);
const line = (name, r) => console.log(
  name.padEnd(10) + ' flights=' + String(r.n).padStart(6) +
  '  jumpOffs/flight=' + (r.w.jumpOffs / (r.n || 1)).toFixed(3) +
  '  mean=' + r.mean.toFixed(3) + '  p50=' + r.p50.toFixed(3) + '  p99=' + r.p99.toFixed(3) +
  '  >1H=' + (100 * r.above1).toFixed(1) + '%' +
  '  record=' + r.w.record.toFixed(3) + '  chain=' + r.w.recordChain +
  '  fleas=' + r.w.fleas.length + ' (earned ' + JSON.stringify(r.w.added) + ')  (' + r.ms + ' ms)');
console.log('flea-jumping smoke: ' + units + ' time units, ' + P.nFleas + ' fleas, width ' +
  P.worldWidth + ', r ' + P.fleaRadius + ', lookahead ' + P.lookahead + ', cap ' + P.maxJumpOffs + ', recoil ' + P.recoil + ', seed ' + P.seed);
line('random', R);
line('strategic', S);

// invariants: (1) with no jump-offs no flight can top 1 H, so any flight above 1 H must come
// with jump-offs; (2) both worlds actually ran flights.
const ok1 = [R, S].every((r) => r.w.jumpOffs > 0 || r.w.record <= 1 + 1e-9);
const ok2 = R.n > 0 && S.n > 0;
// (3) no flight makes more jump-offs than the cap allows
const ok3 = [R, S].every((r) => r.w.recordChain <= P.maxJumpOffs);
// (4) growth: off → population unchanged; never past maxFleas; trickle alone → both worlds equal
const growing = P.growTrickle || P.growOnHeight || P.growOnRecord;
const ok4 = [R, S].every((r) => growing ? r.w.fleas.length <= Math.max(P.maxFleas, P.nFleas)
  : r.w.fleas.length === P.nFleas) &&
  (!(P.growTrickle && !P.growOnHeight && !P.growOnRecord) || R.w.fleas.length === S.w.fleas.length);
const ok = ok1 && ok2 && ok3 && ok4;
console.log('invariants: height-needs-jump-offs=' + ok1 + ' flights-ran=' + ok2 +
  ' chain<=cap=' + ok3 + ' growth=' + ok4 + ' -> ' + (ok ? 'PASS' : 'FAIL'));
process.exit(ok ? 0 : 1);
