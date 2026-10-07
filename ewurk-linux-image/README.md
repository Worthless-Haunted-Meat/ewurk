# EWURK Linux Image

Reproducible Debian desktop image build tooling for EWURK refurbished laptops.
See `../SPEC.md` for the full product specification and `../ROADMAP.md` for
milestones.

This directory is the Node/TypeScript workspace for build orchestration and
verification. It does **not** replace the [EWURK operations
app](https://github.com/Worthless-Haunted-Meat/ewurk); wipe and device status
stay in that system.

## Install

From the repository root (npm workspaces):

```sh
git clone https://github.com/Worthless-Haunted-Meat/ewurk-linux-image.git
cd ewurk-linux-image
npm ci
```

If you are working from the combined `ewurk` checkout that hosts this
workspace, run `npm ci` at the **repository root** instead.

## Develop

```sh
npm run dev
```

Serves the tooling health endpoint at `http://localhost:3000/` (override with
`PORT`).

## Test

```sh
npm test
```

## Build (TypeScript compile only until M4)

```sh
npm run build
```

## Quality bar

```sh
npm run lint
npm run typecheck
npm test
npm run build
```
