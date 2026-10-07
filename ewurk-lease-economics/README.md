# EWURK lease economics

Small, shop-driven model of whether the program’s fixed **$20/month** lease fee
covers real refurb cost. This package lives inside the
[Worthless-Haunted-Meat/ewurk](https://github.com/Worthless-Haunted-Meat/ewurk)
monorepo and does **not** modify the main operations app.

The lease is a behavioral nudge to encourage returns—not rent or a debt
instrument. This tool will never recommend disabling a device for non-payment.

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

## Install

From a fresh clone of the `ewurk` repository:

```sh
cd ewurk-lease-economics
npm ci
```

## Run (development)

```sh
npm run dev
```

Serves on **http://localhost:3001** unless `PORT` is set. `GET /` should return
200.

## Production build

```sh
npm run build
npm start
```

## Quality checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Status

M3: CSV template (`templates/inputs.template.csv`) and `parseInputsCsv`. CLI
output arrives in M4 (see repo-root `ROADMAP.md`).
