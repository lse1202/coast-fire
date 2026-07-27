// node tools/check-labels.mjs
// Sweeps slider combinations and parses the chart SVG the page actually
// produces, checking that chart labels never collide and never escape the
// plot area. Exits non-zero on any failure.
//
// Three sweeps, run sequentially: the original maintain-mode grid (unchanged,
// confirms the deplete-mode chart changes are a true no-op here), a
// perpetuity-maintain sub-sweep, and a deplete sub-sweep. The latter two drop
// the `swr` dimension (inert in both branches — neither formula references
// it) to keep runtime bounded rather than naively crossing every new
// dimension against the full existing grid.

import { scenario, report } from './harness.mjs';

// chart geometry, mirroring drawChart()
const H = 380, mT = 18, mB = 40;
const MIN_GAP = 10;   // px between label baselines before they read as overlapping

function labels(svg) {
  const out = [];
  for (const m of svg.matchAll(/<text[^>]*\sx="([\d.]+)"[^>]*\sy="([-\d.]+)"[^>]*>([^<]*)<\/text>/g)) {
    out.push({ x: +m[1], y: +m[2], text: m[3] });
  }
  return out;
}

const pick = (ls, needle) => ls.find((l) => l.text.includes(needle));
const findFinal = (ls, target, stop) =>
  ls.find((l) => l !== target && l !== stop && /^\d/.test(l.text) &&
    !l.text.includes('left') && !l.text.includes('runs out') && l.x > 400);
const inBounds = (l) => l.y >= mT && l.y <= H - mB + 14;

// Gap from `label` to the closest of `others` (skipping any that are
// absent/undefined). Mirrors the original sweep's "distance to nearest
// fixed label" style rather than an all-pairs check.
const gapTo = (label, others) =>
  Math.min(...others.filter(Boolean).map((o) => Math.abs(o.y - label.y)));

let ok = true;

// --- Sweep 1: original maintain-mode grid, unchanged --------------------
{
  let scanned = 0, collisions = 0, escaped = 0, worst = Infinity, worstCase = null;

  for (let cur = 18; cur <= 55; cur += 1)
    for (let ret = Math.max(cur + 1, 40); ret <= 70; ret += 2)
      for (const mon of [0, 500, 1000, 2500, 5000])
        for (const inv of [0, 10000, 100000, 600000])
          for (const rate of [2, 5, 8])
            for (const swr of [2.5, 3.5, 5]) {
              const { c, svg } = scenario({ cur, ret, inv, mon, rate, net: 3000, swr, wtax: 14 });
              if (c.cross === null || c.cross > ret) continue;
              scanned++;

              const ls = labels(svg);
              const stop = pick(ls, 'stop saving');
              const target = pick(ls, 'Target');
              if (!stop || !target) { collisions++; continue; }

              const final = ls.find((l) => l !== target && l !== stop && /\d/.test(l.text) && l.x > 400);
              const others = [target, ...(final && Math.abs(final.x - stop.x) < 130 ? [final] : [])];
              const gap = Math.min(...others.map((o) => Math.abs(o.y - stop.y)));
              if (gap < worst) { worst = gap; worstCase = { cur, ret, inv, mon, rate, swr, gap }; }
              if (gap < MIN_GAP) collisions++;
              if (stop.y < mT || stop.y > H - mB + 14) escaped++;
            }

  console.log(`\nChart label sweep — maintain mode (unchanged grid)`);
  console.log(`  scenarios with a crossover : ${scanned.toLocaleString('en-US')}`);
  console.log(`  worst label separation     : ${worst.toFixed(1)}px`);
  if (worstCase) {
    const { cur, ret, inv, mon, rate, swr } = worstCase;
    console.log(`  tightest case              : age ${cur}→${ret}, €${inv} + €${mon}/mo, ${rate}% real, ${swr}% SWR`);
  }
  console.log();

  ok = report(`no label collisions (< ${MIN_GAP}px)`, collisions === 0, `${collisions} found`) && ok;
  ok = report('no labels outside the plot area', escaped === 0, `${escaped} found`) && ok;
  ok = report('sweep actually covered ground', scanned > 10000, `${scanned} scenarios`) && ok;
}

// --- Sweep 2: perpetuity-maintain sub-sweep (swr dropped — inert) -------
{
  let scanned = 0, collisions = 0, escaped = 0;

  for (let cur = 18; cur <= 55; cur += 1)
    for (let ret = Math.max(cur + 1, 40); ret <= 70; ret += 2)
      for (const mon of [0, 500, 1000, 2500, 5000])
        for (const inv of [0, 10000, 100000, 600000])
          for (const rate of [2, 5, 8]) {
            const { c, svg } = scenario({ cur, ret, inv, mon, rate, net: 3000, swr: 3.5, wtax: 14, maintainDef: 'perpetuity' });
            if (c.cross === null || c.cross > ret) continue;
            scanned++;

            const ls = labels(svg);
            const stop = pick(ls, 'stop saving');
            const target = pick(ls, 'Target');
            if (!stop || !target) { collisions++; continue; }
            const final = findFinal(ls, target, stop);
            if (gapTo(stop, [target, ...(final && Math.abs(final.x - stop.x) < 130 ? [final] : [])]) < MIN_GAP) collisions++;
            if (!inBounds(stop)) escaped++;
          }

  console.log(`\nChart label sweep — perpetuity-maintain sub-sweep`);
  console.log(`  scenarios with a crossover : ${scanned.toLocaleString('en-US')}`);
  console.log();

  ok = report(`no label collisions (< ${MIN_GAP}px)`, collisions === 0, `${collisions} found`) && ok;
  ok = report('no labels outside the plot area', escaped === 0, `${escaped} found`) && ok;
  ok = report('sweep actually covered ground', scanned > 10000, `${scanned} scenarios`) && ok;
}

// --- Sweep 3: deplete sub-sweep (swr dropped, planAge sampled at 3 points) -
{
  let scanned = 0, collisions = 0, escaped = 0;

  for (let cur = 18; cur <= 55; cur += 1)
    for (let ret = Math.max(cur + 1, 40); ret <= 70; ret += 2)
      for (const mon of [0, 500, 1000, 2500, 5000])
        for (const inv of [0, 10000, 100000, 600000])
          for (const rate of [2, 5, 8])
            for (const planAge of [ret + 1, 90, 105]) {
              const { c, svg } = scenario({ cur, ret, inv, mon, rate, net: 3000, swr: 3.5, wtax: 14, mode: 'deplete', planAge });
              scanned++;

              const ls = labels(svg);
              const target = pick(ls, 'Target');
              const stop = (c.cross !== null && c.cross <= ret) ? pick(ls, 'stop saving') : undefined;
              const final = findFinal(ls, target, stop);
              const left = pick(ls, 'left');
              const runsOut = pick(ls, 'runs out');

              if (stop) {
                if (gapTo(stop, [target, ...(final && Math.abs(final.x - stop.x) < 130 ? [final] : [])]) < MIN_GAP) collisions++;
                if (!inBounds(stop)) escaped++;
              }
              if (left) {
                if (gapTo(left, [target, stop]) < MIN_GAP) collisions++;
                if (!inBounds(left)) escaped++;
              }
              if (runsOut) {
                if (gapTo(runsOut, [target, stop, left]) < MIN_GAP) collisions++;
                if (!inBounds(runsOut)) escaped++;
              }
            }

  console.log(`\nChart label sweep — deplete sub-sweep (planAge sampled at ret+1, 90, 105)`);
  console.log(`  scenarios scanned          : ${scanned.toLocaleString('en-US')}`);
  console.log();

  ok = report(`no label collisions (< ${MIN_GAP}px)`, collisions === 0, `${collisions} found`) && ok;
  ok = report('no labels outside the plot area', escaped === 0, `${escaped} found`) && ok;
  ok = report('sweep actually covered ground', scanned > 10000, `${scanned} scenarios`) && ok;
}

// --- Sweep 4: staged 2-stage sub-sweep -----------------------------------
// Staged mode decouples crossover *age* from final-balance *magnitude* in
// ways a flat rate never can (front-load, then taper to a smaller final
// balance than a flat rate reaching the same crossover would produce) —
// a class of (cross-age, finalBal) geometry the flat-mode sweep above was
// never tested against. A 2-stage sweep is sufficient; 3+ stage
// combinations mostly interpolate between geometries already covered here.
{
  let scanned = 0, collisions = 0, escaped = 0;

  for (let cur = 18; cur <= 55; cur += 1)
    for (let ret = Math.max(cur + 1, 40); ret <= 70; ret += 2)
      for (const inv of [0, 100000])
        for (const rate of [2, 8])
          for (const stage1Amt of [0, 1000, 4000])
            for (const stage2Amt of [0, 1000, 4000])
              for (const stage1Dur of [2, 8, 20]) {
                const { c, svg } = scenario({ cur, ret, inv, rate, net: 3000, swr: 3.5, wtax: 14,
                  savingsMode: 'staged', stageCount: 2, stage1Amt, stage1Dur, stage2Amt });
                scanned++;

                const ls = labels(svg);
                const target = pick(ls, 'Target');
                const stop = (c.cross !== null && c.cross <= ret) ? pick(ls, 'stop saving') : undefined;
                if (stop) {
                  const final = findFinal(ls, target, stop);
                  if (gapTo(stop, [target, ...(final && Math.abs(final.x - stop.x) < 130 ? [final] : [])]) < MIN_GAP) collisions++;
                  if (!inBounds(stop)) escaped++;
                }
              }

  console.log(`\nChart label sweep — staged 2-stage sub-sweep`);
  console.log(`  scenarios scanned          : ${scanned.toLocaleString('en-US')}`);
  console.log();

  ok = report(`no label collisions (< ${MIN_GAP}px)`, collisions === 0, `${collisions} found`) && ok;
  ok = report('no labels outside the plot area', escaped === 0, `${escaped} found`) && ok;
  ok = report('sweep actually covered ground', scanned > 10000, `${scanned} scenarios`) && ok;
}

console.log(ok ? '\nAll label checks passed.\n' : '\nLABEL CHECKS FAILED.\n');
process.exit(ok ? 0 : 1);
