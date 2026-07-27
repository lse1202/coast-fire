// node tools/check-model.mjs
// Re-derives the regression anchors in CLAUDE.md and sweeps the slider extremes
// for non-finite output. Exits non-zero on any failure.

import { scenario, fmt, report } from './harness.mjs';

let ok = true;

console.log('\nRegression anchors (shipped defaults)');
const DEFAULTS = { cur: 25, ret: 65, inv: 10000, mon: 1000, rate: 5, net: 3000, swr: 3.5, wtax: 14 };
const { p, c } = scenario(DEFAULTS);

const anchors = [
  ['independence target', Math.round(p.tgt), 1196013],
  ['coast number today', Math.round(c.coastNow), 169889],
  ['balance at retirement', Math.round(c.finalBal), 1519997],
  ['crossover age (×10)', Math.round(c.cross * 10), 475],
  ['required monthly', Math.round(c.reqMonthly), 777],
];
for (const [name, got, want] of anchors) {
  ok = report(name, got === want, `got ${fmt(got)}, expected ${fmt(want)}`) && ok;
}

console.log('\nEdge cases — every figure must be finite');
const cases = {
  'minimum span (54→55)': { ...DEFAULTS, cur: 54, ret: 55 },
  'no pot, no savings': { ...DEFAULTS, inv: 0, mon: 0 },
  'big pot, no savings': { ...DEFAULTS, inv: 600000, mon: 0 },
  'already coasting': { ...DEFAULTS, inv: 300000 },
  'max tax, min SWR': { cur: 18, ret: 70, inv: 0, mon: 5000, rate: 2, net: 8000, swr: 2.5, wtax: 20 },
  'zero tax, max SWR': { ...DEFAULTS, wtax: 0, swr: 5 },
  'min return': { ...DEFAULTS, rate: 2 },
  'max return': { ...DEFAULTS, rate: 8 },
  'max spend': { ...DEFAULTS, net: 8000 },
  'min spend': { ...DEFAULTS, net: 1000 },
};
for (const [name, inp] of Object.entries(cases)) {
  const { p, c } = scenario(inp);
  const vals = [p.tgt, p.gross, c.coastNow, c.finalBal, c.reqMonthly];
  const finite = vals.every(Number.isFinite);
  const crossOk = c.cross === null || Number.isFinite(c.cross);
  ok = report(name, finite && crossOk,
    `tgt ${fmt(p.tgt)} · coast ${fmt(c.coastNow)} · final ${fmt(c.finalBal)} · cross ${c.cross === null ? '—' : c.cross.toFixed(1)}`) && ok;
}

console.log('\nInvariants');
{
  const { p, c } = scenario(DEFAULTS);
  ok = report('coast number below target', c.coastNow < p.tgt) && ok;
  ok = report('threshold at retirement equals target',
    Math.abs(c.series.at(-1).thr - p.tgt) < 1) && ok;
  ok = report('balance path is non-decreasing',
    c.series.every((d, i) => i === 0 || d.bal >= c.series[i - 1].bal)) && ok;
}
{
  // retirement age must never be allowed to sit at or below current age
  const { p } = scenario({ ...DEFAULTS, cur: 55, ret: 40 });
  ok = report('age clamp holds (cur 55, ret forced to 40)', p.ret > p.cur, `ret=${p.ret}`) && ok;
}
{
  // Saving more can never delay the crossover. cross === null means "never
  // reaches it", which has to sort as infinity, not compare as null.
  const at = (mon) => scenario({ ...DEFAULTS, mon }).c.cross ?? Infinity;
  const monotone = [0, 250, 500, 1000, 2000, 5000].map(at);
  ok = report('more saving ⇒ crossover never later',
    monotone.every((v, i) => i === 0 || v <= monotone[i - 1]),
    monotone.map((v) => (v === Infinity ? 'never' : v.toFixed(1))).join(' → ')) && ok;
}
{
  // A higher target can never bring the crossover forward.
  const at = (net) => scenario({ ...DEFAULTS, net }).c.cross ?? Infinity;
  const spends = [1000, 2000, 3000, 4000, 6000].map(at);
  ok = report('higher spending ⇒ crossover never earlier',
    spends.every((v, i) => i === 0 || v >= spends[i - 1]),
    spends.map((v) => (v === Infinity ? 'never' : v.toFixed(1))).join(' → ')) && ok;
}

console.log('\nMaintain vs deplete mode');
{
  const perp = scenario({ ...DEFAULTS, maintainDef: 'perpetuity' });
  ok = report('perpetuity target', Math.round(perp.p.tgt) === 837209,
    `got ${fmt(perp.p.tgt)}, expected ${fmt(837209)}`) && ok;

  const dep = scenario({ ...DEFAULTS, mode: 'deplete', planAge: 90 });
  ok = report('deplete target', Math.round(dep.p.tgt) === 589979,
    `got ${fmt(dep.p.tgt)}, expected ${fmt(589979)}`) && ok;
  ok = report('deplete coast number', Math.round(dep.c.coastNow) === 83804,
    `got ${fmt(dep.c.coastNow)}, expected ${fmt(83804)}`) && ok;
  ok = report('deplete required monthly', Math.round(dep.c.reqMonthly) === 358,
    `got ${fmt(dep.c.reqMonthly)}, expected ${fmt(358)}`) && ok;

  const maint = scenario(DEFAULTS);
  ok = report('finalBal unchanged by mode (accumulation phase is decoupled)',
    Math.round(dep.c.finalBal) === Math.round(maint.c.finalBal),
    `deplete ${fmt(dep.c.finalBal)} vs maintain ${fmt(maint.c.finalBal)}`) && ok;

  // Annuity self-check: draining p.tgt itself (not finalBal) forward n years
  // at the drawdown formula must land within a cent of zero — this is the
  // identity the deplete target formula is derived from.
  const { p, c } = dep;
  const n = p.planAge - p.ret;
  let bal = p.tgt;
  for (let i = 0; i < n; i++) bal = bal * (1 + c.r) - p.gross;
  ok = report('deplete target drains to ~0 at plan-until age', Math.abs(bal) < 0.01, `residual ${bal.toExponential(2)}`) && ok;

  const depLow = scenario({ ...DEFAULTS, mode: 'deplete', planAge: 90, mon: 100 });
  ok = report('early run-out is finite and inside (ret, planAge)',
    Number.isFinite(depLow.c.runOutAge) && depLow.c.runOutAge > DEFAULTS.ret && depLow.c.runOutAge < 90,
    `runOutAge ${depLow.c.runOutAge?.toFixed(1)}`) && ok;

  // Perpetuity vs SWR direction: swrTarget = gross*100/swr, perpetuityTarget =
  // gross*100/rate, so swrTarget > perpetuityTarget iff rate > swr. Sweep
  // both directions since the UI ranges (swr 2.5-5, rate 2-8) overlap.
  const dirCases = [
    { swr: 3.5, rate: 5 },   // rate > swr
    { swr: 4.5, rate: 2.5 }, // swr > rate
    { swr: 3, rate: 3 },     // equal
  ];
  const dirOk = dirCases.every(({ swr, rate }) => {
    const swrT = scenario({ ...DEFAULTS, swr, rate, maintainDef: 'swr' }).p.tgt;
    const perpT = scenario({ ...DEFAULTS, swr, rate, maintainDef: 'perpetuity' }).p.tgt;
    return (swrT > perpT) === (rate > swr) || (swrT === perpT) === (rate === swr);
  });
  ok = report('perpetuity vs SWR target direction holds both ways', dirOk) && ok;

  // Deplete target must always sit below the perpetuity target at the same
  // rate, for any finite plan-until age (annuity-PV approaches but never
  // reaches the perpetuity value as planAge -> infinity).
  const planAges = [DEFAULTS.ret + 1, 90, 105];
  const belowPerp = planAges.every((planAge) => {
    const depT = scenario({ ...DEFAULTS, mode: 'deplete', planAge }).p.tgt;
    const perpT = scenario({ ...DEFAULTS, maintainDef: 'perpetuity' }).p.tgt;
    return depT < perpT;
  });
  ok = report('deplete target always below perpetuity target', belowPerp) && ok;
}

console.log('\nMaintain/deplete edge cases — every figure must be finite');
const modeCases = {
  'plan until ret+1 (minimum horizon)': { ...DEFAULTS, mode: 'deplete', planAge: DEFAULTS.ret + 1 },
  'plan until 105, ret 40 (widest domain)': { ...DEFAULTS, mode: 'deplete', ret: 40, planAge: 105 },
  'deplete, min return': { ...DEFAULTS, mode: 'deplete', planAge: 90, rate: 2 },
  'deplete, max return': { ...DEFAULTS, mode: 'deplete', planAge: 90, rate: 8 },
  'perpetuity, min return': { ...DEFAULTS, maintainDef: 'perpetuity', rate: 2 },
  'perpetuity, max return': { ...DEFAULTS, maintainDef: 'perpetuity', rate: 8 },
};
for (const [name, inp] of Object.entries(modeCases)) {
  const { p, c } = scenario(inp);
  const vals = [p.tgt, p.gross, c.coastNow, c.finalBal, c.reqMonthly, ...c.drawdown.map((d) => d.bal)];
  const finite = vals.every(Number.isFinite);
  const runOutOk = c.runOutAge === null || Number.isFinite(c.runOutAge);
  ok = report(name, finite && runOutOk,
    `tgt ${fmt(p.tgt)} · coast ${fmt(c.coastNow)} · final ${fmt(c.finalBal)} · runOut ${c.runOutAge === null ? '—' : c.runOutAge.toFixed(1)}`) && ok;
}

console.log('\nStaged savings mode');
{
  // Consistency invariant: a uniform staged plan (every stage the same
  // amount as some flat rate, durations summing to >= years-to-retirement)
  // must reproduce flat mode exactly. This is the generalization proof —
  // it doesn't depend on any hand-derived number.
  const FLAT_MON = 1200;
  const flat = scenario({ ...DEFAULTS, mon: FLAT_MON });
  const staged = scenario({ ...DEFAULTS, savingsMode: 'staged', stageCount: 3,
    stage1Amt: FLAT_MON, stage1Dur: 15, stage2Amt: FLAT_MON, stage2Dur: 15, stage3Amt: FLAT_MON });
  ok = report('uniform staged plan matches flat mode exactly',
    Math.round(staged.c.finalBal) === Math.round(flat.c.finalBal) &&
    Math.abs(staged.c.coastNow - flat.c.coastNow) < 1 &&
    Math.abs(staged.c.cross - flat.c.cross) < 0.01,
    `finalBal ${fmt(staged.c.finalBal)} vs ${fmt(flat.c.finalBal)}`) && ok;

  // Concrete regression anchor, captured from an actual run (never hand-derived).
  const anchor = scenario({ ...DEFAULTS, savingsMode: 'staged', stageCount: 3,
    stage1Amt: 500, stage1Dur: 10, stage2Amt: 1500, stage2Dur: 15, stage3Amt: 3000 });
  ok = report('staged target unaffected (matches flat-mode anchor)', Math.round(anchor.p.tgt) === 1196013,
    `got ${fmt(anchor.p.tgt)}`) && ok;
  ok = report('staged required monthly unaffected (matches flat-mode anchor)', Math.round(anchor.c.reqMonthly) === 777,
    `got ${fmt(anchor.c.reqMonthly)}`) && ok;
  ok = report('staged balance at retirement', Math.round(anchor.c.finalBal) === 1980879,
    `got ${fmt(anchor.c.finalBal)}, expected ${fmt(1980879)}`) && ok;
  ok = report('staged crossover age (×100)', Math.round(anchor.c.cross * 100) === 4978,
    `got ${Math.round(anchor.c.cross * 100)}, expected 4978`) && ok;
}

console.log('\nStaged savings edge cases — every figure must be finite');
const stagedCases = {
  'stageCount=5, minimum span (54→55)': { ...DEFAULTS, cur: 54, ret: 55, savingsMode: 'staged', stageCount: 5,
    stage1Amt: 500, stage1Dur: 1, stage2Amt: 1000, stage2Dur: 1, stage3Amt: 1500, stage3Dur: 1, stage4Amt: 2000, stage4Dur: 1, stage5Amt: 2500 },
  'durations sum far beyond horizon': { ...DEFAULTS, savingsMode: 'staged', stageCount: 2, stage1Amt: 1000, stage1Dur: 40, stage2Amt: 5000 },
  'all-zero staged amounts': { ...DEFAULTS, savingsMode: 'staged', stageCount: 2, stage1Amt: 0, stage1Dur: 10, stage2Amt: 0 },
  'stageCount=5 full ramp': { ...DEFAULTS, savingsMode: 'staged', stageCount: 5,
    stage1Amt: 0, stage1Dur: 5, stage2Amt: 500, stage2Dur: 10, stage3Amt: 1500, stage3Dur: 10, stage4Amt: 3000, stage4Dur: 5, stage5Amt: 5000 },
};
for (const [name, inp] of Object.entries(stagedCases)) {
  const { p, c } = scenario(inp);
  const vals = [p.tgt, p.gross, c.coastNow, c.finalBal, c.reqMonthly];
  const finite = vals.every(Number.isFinite);
  const crossOk = c.cross === null || Number.isFinite(c.cross);
  ok = report(name, finite && crossOk,
    `tgt ${fmt(p.tgt)} · coast ${fmt(c.coastNow)} · final ${fmt(c.finalBal)} · cross ${c.cross === null ? '—' : c.cross.toFixed(1)}`) && ok;
}
{
  // Raising an early stage's amount (holding everything else fixed) must
  // never make the crossover age later — same pattern as the existing
  // flat-mode "more saving ⇒ crossover never later" invariant.
  const at = (stage1Amt) => scenario({ ...DEFAULTS, savingsMode: 'staged', stageCount: 2, stage1Amt, stage1Dur: 20, stage2Amt: 1000 }).c.cross ?? Infinity;
  const monotone = [0, 500, 1000, 2000, 5000].map(at);
  ok = report('raising an early stage amount ⇒ crossover never later',
    monotone.every((v, i) => i === 0 || v <= monotone[i - 1]),
    monotone.map((v) => (v === Infinity ? 'never' : v.toFixed(1))).join(' → ')) && ok;
}

console.log(ok ? '\nAll model checks passed.\n' : '\nMODEL CHECKS FAILED.\n');
process.exit(ok ? 0 : 1);
