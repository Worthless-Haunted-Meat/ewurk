# EWURK lease economics

Small, shop-driven model of whether the program’s fixed **$20/month** lease fee
covers real refurb cost. This package lives inside the
[Worthless-Haunted-Meat/ewurk](https://github.com/Worthless-Haunted-Meat/ewurk)
monorepo and does **not** modify the main operations app (`src/` leases,
payments, or ledgers).

## What $20/month means (read this first)

The lease is a **behavioral nudge** to encourage families to return devices—not
**rent**, not a debt instrument, and not a basis for lockout. EWURK may flag a
lease as past-due for staff follow-up; this calculator never recommends disabling,
wiping, or repossessing a device for non-payment.

All **inputs** (parts, minutes, yield, volunteer rate) must come from **your
shop’s records**. Shipped `example` and `fixtures/` rows are labeled fiction for
tests and demos—not Worthless Haunted Meat’s actual costs.

## Non-goals (v1)

- Inventing or presenting default refurb costs as organizational facts.
- Collections, credit scoring, dunning, or shutoff/repossession recommendations.
- Stripe, Square, or payment processor integration; importing EWURK payment exports.
- Replacing EWURK’s payment UI or changing ops-app payment logic.
- Float dollar math (use integer **cents** only).

## Money and rounding

All currency is stored and calculated as **integer cents** (no floating-point
dollars). Labor is entered as **integer minutes** plus a shop-stated
**cents-per-hour** rate; per-unit labor uses round-half-up:
`⌊(labor_minutes × labor_cents_per_hour + 30) / 60⌋`.

Batch yield spreads refurb cost across units that reach `available` with the
same round-half-up rule:
`cost_cents_per_available = ⌊(total_per_donated × units_donated + units_reach_available/2) / units_reach_available⌋`.

**Months to recover** uses ceiling division at the program lease rate (default
**2000 cents** = $20/month): whole months needed until lease payments cover
`cost_cents_per_available`.

## CSV inputs (from the shop)

Copy `templates/inputs.template.csv` and fill a new row with **your** numbers.
The shipped `example` row uses obviously fictional values—not Worthless Haunted
Meat’s costs. Leave dollar amounts out of the sheet: every money field is
**integer cents**.

| Column | Source |
| --- | --- |
| `label` | Optional note (`saturday-shop`, date, etc.). Use `example` only for demos. |
| `parts_cents` | Parts/consumables per donated unit (typical SSD, RAM, paste, cables). |
| `labor_minutes` | Refurb time per donated unit in whole minutes. |
| `labor_cents_per_hour` | Shop-stated volunteer/staff rate in **cents per hour** (your placeholder, not a default “truth”). |
| `units_donated` | Batch size you attempted this period. |
| `units_reach_available` | How many of that batch reached `available` (yield / breakage). |
| `swap_repair_cents` | Extra parts/labor for one swap/repair (0 if unused). |

The lease rate is fixed at **2000 cents/month** in v1 and is not a CSV column.

### Yield (machines that never reach `available`)

`units_reach_available` must be ≤ `units_donated`. Units that never make it to
`available` still consumed parts and labor; the model spreads that whole batch
cost across the successful units. That raises `cost_cents_per_available`—it is
**batch dilution**, not a fee or penalty charged to a lessee family. A machine
that never leases is an ops yield problem, not a collections lever.

### Swap / repair

`swap_repair_cents` models one in-field repair (parts + labor) allocated to a
unit already in the field. When greater than zero, the CLI also prints
`months_after_swap` (recovery months if that repair cost were folded into the
unit’s effective cost).

## Install

From a fresh clone of the `ewurk` repository:

```sh
cd ewurk-lease-economics
npm ci
```

Requires **Node 22.5+**. Licensed **GPL-3.0-or-later** (see `LICENSE`).

## Fresh clone check

From repository root:

```sh
git clone https://github.com/Worthless-Haunted-Meat/ewurk.git
cd ewurk/ewurk-lease-economics
npm ci
npm test
npm run calculate -- templates/inputs.template.csv
```

The last command should print recovery output for the labeled `example` row only
(blank template rows are skipped). Optional: from repo root, `npm ci && npm run build`
verifies the separate EWURK ops app still compiles; this package does not use its
database.

## Run (development)

```sh
npm run dev
```

Serves on **http://localhost:3001** unless `PORT` is set. Open `GET /`, paste
CSV or upload a file, and submit **Calculate recovery** to see the same table as
the CLI. Invalid CSV shows a short error message (HTTP 400/422) with no stack
trace in the page.

## Production build

```sh
npm run build
npm start
```

## Calculate from CSV

After `npm run build`:

```sh
npm run calculate -- path/to/your-inputs.csv
```

Prints `cost_cents_per_available`, `months_to_recover`, and the policy reminder
that past-due status is not grounds for lockout. Invalid input prints `Error: …`
to stderr and exits non-zero. Use `fixtures/shop-fixture.csv` only as a test
fixture—not real shop costs.

## Quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## License

GPL-3.0-or-later. See `LICENSE` in this directory.
