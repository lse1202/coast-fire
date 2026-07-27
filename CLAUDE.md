# Coast FIRE Calculator — project context

Single-file interactive Coast FIRE planner. `index.html` is the entire
application: HTML, CSS and JS in one file, no build step, no dependencies, no
network requests at runtime. Open it in a browser and it works, including from
`file://` and offline.

Read this file before changing anything. The constraints below are deliberate
and several of them are load-bearing.

---

## The model

All figures are in **real (today's euro) terms**. There is no separate
inflation adjustment anywhere — that is the point of working in real terms.

```
gross       = annualNet / (1 − taxRate)      # gross up for German withdrawal tax
coastNumber = target / (1 + r)^years         # target discounted to today
```

`target` has three formulas, selected by the "at retirement, the portfolio
should" mode toggle plus the "how forever is defined" sub-choice (only shown
in maintain mode):

```
target = gross / SWR                         # maintain, SWR-based (recommended, default)
target = gross / r                           # maintain, true perpetuity
target = gross · (1 − (1+r)^−n) / r          # deplete, n = planUntilAge − retireAge
```

The SWR-based formula is the original, unchanged default — everything
downstream (`coastNumber`, the accumulation `series`, crossover, required
monthly) only ever consumes `target`, so the accumulation phase (ages
current→retirement) is identical across all three modes. Only the chart and
copy differ in deplete mode (see "Deplete-mode drawdown" below).

Balance path, one step per year:

```
bal = bal · (1 + r) + annualContribution
```

The **coast threshold** at any age is `target / (1+r)^(retireAge − age)` — the
minimum you'd need at that age to reach the target with no further saving. The
**crossover** is where the balance path meets that threshold, found by linear
interpolation between the two bracketing years. Past it, contributing is
optional.

Required monthly saving to hit the target exactly:

```
grownStart = inv · (1+r)^years
annFactor  = ((1+r)^years − 1) / r
reqMonthly = ((target − grownStart) / annFactor) / 12     # 0 if grownStart ≥ target
```

### Deplete-mode drawdown

In deplete mode, `compute()` appends a `drawdown` array (ages retirement→plan-until)
that tracks the **actual** projected balance — starting from `finalBal`, the
real result of the accumulation phase — not an idealized annuity. Each year:
`bal = bal·(1+r) − gross`. This can run out before the plan-until age (a
`runOutAge` is interpolated, same style as `cross`), land on money left over,
or — if the real return exceeds what the withdrawal draws down — keep
*growing* through "drawdown" (the chart's `yMax` must account for this: it's
`max(target, finalBal, drawdownMax)`, not just the first two). The chart's
label-collision ladder (`placeLadder`/`ladderCands` in `drawChart()`) is
shared across the crossover label and the new "€X left"/"runs out · age N"
callouts, each pushing its resolved position so later labels dodge earlier
ones.

Worth remembering if this is touched again: discounting the drawdown at the
full real return `r` ignores sequence-of-returns risk — the same reason safe
withdrawal rates sit below expected real returns. This is flagged in the
plan-until-age tooltip; no separate lower drawdown-phase return is modeled.

### Regression anchors

With the shipped defaults — age 25 → 65, €10,000 invested, €1,000/month, 5%
real, €3,000/month net wanted, 3.5% SWR, 14% tax, maintain/SWR-based mode:

| Quantity | Value |
|---|---|
| Independence target | €1,196,013 |
| Coast number today | €169,889 |
| Balance at 65 | €1,519,997 |
| Crossover age | 47.5 |
| Required monthly | €777 (displayed €780, rounded up to nearest 10) |

Same defaults, other modes:

| Quantity | Value |
|---|---|
| Independence target, true perpetuity | €837,209 |
| Independence target, deplete to age 90 | €589,979 |
| Coast number today, deplete to age 90 | €83,804 |
| Required monthly, deplete to age 90 | €358 |
| Balance at 65, deplete to age 90 | €1,519,997 (unchanged — confirms the accumulation phase is decoupled from mode) |

If a change moves these and you didn't intend it, something broke.
`tools/check-model.mjs` re-derives them.

---

## Hard constraints

**No network requests, ever.** Fraunces and Inter are embedded as base64 woff2,
subsetted to the characters the page uses. This is not a performance choice —
it's data protection. Loading fonts from Google would transmit visitor IPs to a
third party, which is the exact issue the Landgericht München I ruled on in
2022 (3 O 17493/20). Do not reintroduce `@import` from fonts.googleapis.com, a
CDN, an analytics snippet, or any other external resource.

**No cookies, no localStorage, no sessionStorage.** Everything lives in the
DOM and in JS variables. The privacy notice states this; keep it true.

**Ship `FONT-LICENSES.txt` alongside `index.html`.** Both typefaces are SIL
Open Font License 1.1, which permits embedding but requires the notice travel
with the file.

**Keep it one file.** `index.html` is self-contained on purpose — it works from
a file path, inside a sandboxed viewer, and on any static host without
configuration.

---

## Design language

Do not drift from this. It's consistent throughout and the consistency is most
of the effect.

| Token | Value | Use |
|---|---|---|
| `--paper` | `#EFEDE6` | page background |
| `--raised` | `#F7F5F0` | cards, panels |
| `--ink` | `#182031` | text, target line |
| `--slate` | `#565F72` | secondary text |
| `--hair` | `#D6D2C8` | borders, gridlines |
| `--brass` | `#A67C3D` | accent, coast line, crossover |
| `--green` | `#2E6A57` | balance line |

- **Fraunces** (serif) for numbers and headings, **Inter** for body text.
- `font-variant-numeric: tabular-nums` on all figures so they don't jitter
  while a slider moves.
- Minimal text, generous whitespace. The top subtitle and bottom explainer
  span the full container width — no character-width cap on those two.
- The four judgment-call inputs (real return, net income, withdrawal rate,
  tax) each carry an "i" tooltip. The register is precise and lightly
  technical but still readable: `r_real ≈ r_nominal − π`, SWR and its
  target-multiple reciprocal, sequence-of-returns risk, Abgeltungssteuer on
  realized gains. Match that voice if you add more.

### Known cosmetic detail

`≈`, `⇒` and `→` don't exist in Inter, so the browser falls back to the system
sans for those three glyphs in the tooltips. This was equally true when the
page used Google Fonts. `π` renders correctly — it comes from a separate
one-glyph `@font-face` with `unicode-range: U+03C0`, because π lives in Inter's
Greek subset rather than the Latin one.

---

## Things that were broken and are now fixed

Don't reintroduce these.

1. **Clamp before render.** The age-clamping logic must run *before* `render()`.
   It used to be wired as a separate listener registered after the render
   listener, so dragging current age into retirement age painted a frame
   against an invalid pair and never repainted. `update()` exists to enforce
   the order — call it, not `render()`, from any input handler.
2. **Crossover label collisions.** The "stop saving · age N" label walks a
   ladder of candidate offsets and picks the first that stays inside the plot
   and clears the target and final-balance labels by 14px. Swept over ~139k
   slider combinations with zero collisions; `tools/check-labels.mjs` re-runs
   that sweep.
3. **Firefox range thumb** was 14px against Chrome's 18px, and Firefox drew its
   default bordered track. Both are now explicitly styled.
4. **Tooltip overflow.** Tooltips are centred on an icon that can sit near the
   panel edge, so `placeTip()` measures and sets a `--shift` variable to keep
   the bubble inside the viewport, with the arrow staying on the icon.

---

## Verification

There is no test framework. There are two Node scripts under `tools/`, both
run with plain `node`, no install:

```
node tools/check-model.mjs     # re-derives the regression anchors, sweeps edge cases for NaN/Infinity
node tools/check-labels.mjs    # sweeps ~139k slider combinations for chart label collisions
```

Run both after any change to the maths or the chart. They read `index.html`
directly, so they can't drift from the shipped code.

For anything touching the maths, also sanity-check the extremes by hand: age
55 → 56 (minimum span), zero savings with zero pot, 20% tax with 2.5% SWR, and
`inv` above the coast number (the "already coasting" branch).

---

## Open work

**Shipped — deplete vs. maintain.** The mode toggle ("last forever" vs
"deplete by an age"), the maintain sub-choice (SWR-based vs true perpetuity),
and the adjustable plan-until-age slider are all built — see "Deplete-mode
drawdown" above and the regression anchors for the exact formulas and values.

**Also discussed, not started:**

- State pension input (gesetzliche Rente) reducing the income the portfolio
  must cover. Biggest realism gain for a German user.
- Nominal/real toggle, re-expressing figures in future euros at an inflation
  assumption while keeping the real model underneath.
- Year-by-year data table under the chart, with CSV copy.
- Print stylesheet so a scenario prints as a clean one-pager.

---

## Deployment

Static hosting, any provider. `docs/DEPLOY-github-pages.md` has the full
walkthrough for GitHub Pages, including the `.nojekyll` file and the
placeholders in `privacy.html` that must be filled in before publishing.

`privacy.html` still contains `[NAME]`, `[ANSCHRIFT]` and `[E-MAIL]`
placeholders. The page must not go live until they're replaced — Art. 13 GDPR
requires an identifiable controller.

---

## Tone for user-facing copy

Precise, plain, unhurried. No exclamation marks, no marketing register, no
emoji. Numbers do the persuading. The footer disclaimer ("not financial
advice", and the explicit list of what the model ignores — sequence-of-returns
risk, German tax nuance, state pension) stays visible on any published version.
