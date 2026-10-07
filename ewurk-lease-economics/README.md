# EWURK lease economics

Small, shop-driven model of whether the program’s fixed **$20/month** lease fee
covers real refurb cost. This package lives inside the
[Worthless-Haunted-Meat/ewurk](https://github.com/Worthless-Haunted-Meat/ewurk)
monorepo and does **not** modify the main operations app.

The lease is a behavioral nudge to encourage returns—not rent or a debt
instrument. This tool will never recommend disabling a device for non-payment.

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

M1 walking skeleton: HTTP `GET /` and health check only. CSV template, recovery
math, and CLI arrive in later milestones (see repo-root `ROADMAP.md`).
