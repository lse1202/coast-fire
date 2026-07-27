# Coast FIRE Calculator

An interactive Coast FIRE planner: the lump sum that, invested once and never
added to, compounds up to your financial-independence target by retirement age.

All figures are in real (today's euro) terms. The model grosses up the desired
net income for German withdrawal tax, derives the independence target from a
safe withdrawal rate, and discounts that target back to today at the chosen
real return. A projection chart plots the balance if you keep saving against
the coast threshold, and marks the age at which further saving becomes
optional.

## Running it

Open `index.html` in a browser. That's the whole application — one
self-contained file, no build step, no dependencies, no network requests. It
works from a `file://` path and offline.

## Checks

Two Node scripts, no install required:

```bash
node tools/check-model.mjs     # regression anchors, edge cases, model invariants
node tools/check-labels.mjs    # ~250k-scenario sweep across maintain/perpetuity/deplete for chart label collisions (~80s)
```

Both load `index.html` and run the page's own functions against a small DOM
shim, so they test the shipped code rather than a copy of it. Run them after
any change to the maths or the chart.

## Layout

| Path | |
|---|---|
| `index.html` | the calculator — everything, including embedded fonts |
| `privacy.html` | Datenschutzerklärung with English summary — **has placeholders to fill** |
| `FONT-LICENSES.txt` | SIL OFL 1.1 for Fraunces and Inter; must ship with `index.html` |
| `.nojekyll` | tells GitHub Pages to serve files as-is |
| `CLAUDE.md` | project context — read this before changing anything |
| `tools/` | verification scripts |
| `docs/` | deployment walkthrough |

## Publishing

`docs/DEPLOY-github-pages.md` has the full walkthrough. Fill in the
`[NAME]`, `[ANSCHRIFT]` and `[E-MAIL]` placeholders in `privacy.html` first —
Art. 13 GDPR requires an identifiable controller.

## Disclaimer

Planning rules of thumb, not financial advice. The model ignores
sequence-of-returns risk, German tax nuances beyond a flat blended rate, and
any state pension.
