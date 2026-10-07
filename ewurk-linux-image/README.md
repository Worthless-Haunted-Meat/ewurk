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

Compiles TypeScript and validates `image/manifest.json` against
`image/lists/desktop.list` (required, forbidden, and firmware packages).

## Host packages (image build)

Building the ISO (M4+) requires live-build on a Debian or Ubuntu amd64 host.
List packages:

```sh
./scripts/host-deps.sh
```

Install them:

```sh
sudo ./scripts/host-deps.sh --install
```

## live-build config and first-boot overlay

- `image/config/` — live-build tree (`lb build` runs here in M4). Entry point:
  `image/config/auto/config` (bookworm, amd64, XFCE packages).
- `image/overlay/` — files copied into the rootfs, including
  `ewurk-firstboot.service` and `/usr/lib/ewurk/firstboot.sh` (offline
  locale/keyboard/hostname/user prompts; no cloud sign-in).

## Image manifest

Recipe metadata lives in `image/manifest.json`. Package selections for the
desktop image are listed in `image/lists/desktop.list` (one Debian package per
line; `#` starts a comment).

| Field | Meaning |
| --- | --- |
| `version` | Semver of the image recipe (bump when packages or overlay change). |
| `codename` | Human label for release notes (e.g. `ewurk-2026.04`). |
| `baseSuite` | Debian suite (`bookworm` for v1). |
| `architecture` | `amd64` for v1 Intel/AMD laptops. |
| `desktop` | `xfce` for v1. |
| `requiredPackages` | Must appear in `desktop.list`. |
| `forbiddenPackages` | Must not appear (telemetry / snap / Ubuntu phone-home packages). |
| `firmwarePackages` | Non-free firmware metapackages expected in the list for Wi‑Fi. |
| `firstBootVersion` | Semver of first-boot overlay scripts (M3+). |

To ship a new image recipe:

1. Edit `image/lists/desktop.list` (and overlay files when present).
2. Bump `version` in `image/manifest.json` (and `firstBootVersion` when
   first-boot scripts change).
3. Run `npm test` and `npm run build` — both enforce the package policy.

## Quality bar

```sh
npm run lint
npm run typecheck
npm test
npm run build
```
