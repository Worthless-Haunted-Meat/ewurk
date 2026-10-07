# EWURK lease economics — specification

## Summary

EWURK lease economics is a small, shop-driven calculator for nonprofit staff who
run the refurb program. Operators enter real costs from their workshop (parts,
time, yield, repairs) and see how many months of the fixed $20/month lease fee
it takes to recover the cost of putting one machine in `available` status. The
tool exists so the program can be honest about economics without treating the
lease as rent or debt, and without changing the EWURK operations app.

## Core user flows

1. Copy the documented CSV template, fill in numbers sourced from the shop (no
   pre-filled “real” costs), and save the file.
2. Run the calculator (CLI or local web UI) against that CSV and read the
   recovery table for one successful unit.
3. Adjust swap/repair inputs and re-run to see how an in-field repair changes
   months-to-recover.
4. Set or read yield (share of donated units that never reach `available`) and
   see how that raises effective cost per successful unit.
5. Read the README policy section so it is clear that $20/month is a behavioral
   nudge to encourage returns, not rent, and that past-due status in EWURK must
   never imply device lockout or collections.

## Non-goals for v1

- Inventing or shipping default dollar amounts presented as Worthless Haunted
  Meat’s actual refurb costs (templates use empty cells or explicitly labeled
  **example** rows only).
- Collections logic, credit scoring, dunning, or any recommendation to disable,
  wipe, or repossess a device for non-payment.
- Stripe, Square, or other payment processor integration; importing live EWURK
  payment exports (nice-to-have later).
- Replacing or modifying EWURK’s payment screen, lease ledger, or any code under
  the main ops app (`src/` routes, services, views for leases/payments).
- Family PII in sample data (fixture names limited to EWURK seed fiction:
  Herrera, Osei, if names appear at all).
- Float-based money arithmetic (no `0.1 + 0.2` dollars; use integer cents).
- External paid services, accounts, API keys, or network calls required to run
  locally.
- GPL-incompatible dependencies or proprietary spreadsheet lock-in as the only
  interface (CSV remains the portable source of truth).

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Language | TypeScript (ESM, `NodeNext`) on Node 22+ | Matches EWURK skills, strict typing for money. |
| Runtime UI | Express 5 + EJS (minimal) | Familiar pattern; `npm run dev` serves `GET /` for the walking skeleton and a simple form later. |
| Core logic | Pure TypeScript modules under `src/domain/` | Testable without HTTP; shared by CLI and web. |
| CLI | `node` entry via `src/cli.ts` (compiled) | Operators can script Saturday shop runs without a browser. |
| Storage | None (CSV in, stdout/HTML out) | No database; avoids sync with EWURK SQLite. |
| Test runner | Node built-in `node:test` + `node:assert` | Zero extra test framework; same as EWURK. |
| Lint | ESLint flat config + typescript-eslint | Consistent with sibling project conventions. |
| License | GPL-3.0 | Per operator requirement; `LICENSE` copied or referenced at package root. |

All install, lint, typecheck, test, build, and run commands for this product
are executed from the **`ewurk-lease-economics/`** directory so the existing
EWURK ops app at the repository root is not rebuilt or retested by this
pipeline’s milestones.

## Architecture

```
ewurk-lease-economics/
  package.json          # scripts: dev, build, start, test, lint, typecheck, calculate
  tsconfig.json
  eslint.config.js
  LICENSE               # GPL-3.0
  README.md             # philosophy, shop sourcing, commands
  SPEC.md               # symlink or copy pointer to repo-root SPEC (optional)
  templates/
    inputs.template.csv # empty + example row(s), clearly labeled
  fixtures/
    *.csv                 # obviously fake numbers for tests only
  src/
    domain/
      money.ts            # cents parse/format, no floats for money
      recovery.ts         # cost per available, months to recover @ $20
      scenarios.ts        # swap/repair increment, yield / never-lease pool
    io/
      parseInputsCsv.ts   # validate headers, integer cents fields
    cli.ts                # read CSV path, print recovery table
    app.ts                # Express factory
    server.ts             # listen for dev/start
  views/
    index.ejs             # form or upload + results (later milestones)
  test/
    domain.*.test.ts
    io.*.test.ts
    http.smoke.test.ts    # GET / health (M1+)
```

**Data flow:** CSV (or POSTed form fields) → `parseInputsCsv` → `ShopInputs`
→ `recovery` / `scenarios` → structured result → CLI table or EJS view. The
fixed lease amount is **2000 cents/month** ($20), documented as a program
constant aligned with EWURK v1; it is not computed from inputs.

**Repository layout:** This specification lives at the monorepo root (`SPEC.md`,
`ROADMAP.md`) for the unattended pipeline. Implementation artifacts live only
under `ewurk-lease-economics/`. Do not add economics routes to the root EWURK
`src/app.ts`.

## Data model

All monetary fields are **integer cents** (non-negative unless noted). Percentages
and yields use rational inputs (e.g. “1 in 5 never lease” as `failed_units` and
`attempted_units` positive integers, not 0.2 floats).

### `ShopInputs` (one scenario row or aggregated shop defaults)

| Field | Type | Meaning |
| --- | --- | --- |
| `label` | string | Optional row label (`example`, `saturday-2026-04-12`, etc.). |
| `parts_cents` | int | Parts/consumables per donated unit through refurb. |
| `labor_hours` | int | Whole or fixed-point hours × 100 (see note) OR separate `labor_minutes` int — pick one representation in M2 and document in README. |
| `labor_cents_per_hour` | int | Shop-stated placeholder rate; operator supplies, not defaulted as fact. |
| `units_donated` | int | Batch size for yield math (≥ 1). |
| `units_reach_available` | int | Subset that reaches `available` (≤ `units_donated`). |
| `swap_repair_cents` | int | Extra parts/labor for one swap/repair event (0 if unused). |
| `monthly_lease_cents` | int | Default 2000; constant for v1, overridable only in fixtures with loud labeling. |

**Note:** Prefer **minutes** as integers for labor (`labor_minutes`) plus
`labor_cents_per_hour` to avoid float hours in M2 implementation.

### `RecoveryResult` (computed)

| Field | Type | Meaning |
| --- | --- | --- |
| `total_refurb_cents_per_donated` | int | Parts + labor per donated unit before yield. |
| `cost_cents_per_available` | int | `total_refurb_cents_per_donated * units_donated / units_reach_available` (integer division with documented rounding: round half-up or ceiling — choose one in M2, test it). |
| `months_to_recover` | int | `ceil(cost_cents_per_available / monthly_lease_cents)`. |
| `months_after_swap` | int | Same, with one `swap_repair_cents` allocated per available unit (document allocation rule in README). |
| `policy_reminder` | string | Fixed sentence: past-due in EWURK is a flag only, not grounds for lockout. |

### CSV template columns

Header row (stable for v1):  
`label,parts_cents,labor_minutes,labor_cents_per_hour,units_donated,units_reach_available,swap_repair_cents`

Example row must include `label=example` and values that are obviously fictional.

## Quality bar

From `ewurk-lease-economics/`, before any milestone is marked done:

| Command | Must |
| --- | --- |
| `npm ci` | Install without error on a fresh clone. |
| `npm run lint` | Exit 0. |
| `npm run typecheck` | Exit 0 (`tsc --noEmit`). |
| `npm test` | Exit 0 (unit + smoke HTTP). |
| `npm run build` | Emit `dist/` and copy any non-TS assets needed at runtime. |
| `npm run dev` | Start dev server; `GET http://localhost:<PORT>/` returns 200 (port from `PORT` or documented default). |
| `npm run calculate -- <path.csv>` | (From M4 onward) Exit 0 and print human-readable table for fixture CSV. |

Root EWURK `npm test` is out of scope for economics milestones unless a future
change explicitly wires a root-level aggregator; do not break it when adding
the subfolder.
