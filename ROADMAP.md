# EWURK Linux Image — Roadmap

## M1: Walking skeleton

Status: [x] done

Goal: Scaffold the Node/TypeScript repo with lint, typecheck, tests, and a minimal dev server so the pipeline is provably green before image work.

Acceptance:

- [x] `npm ci` succeeds on a fresh clone
- [x] `npm run lint` exits 0
- [x] `npm run typecheck` exits 0
- [x] `npm test` passes with at least one real test (e.g. manifest schema or health route)
- [x] `npm run dev` starts and `GET http://localhost:3000/` returns HTTP 200
- [x] `README.md` contains clone, install, `npm run dev`, and `npm test` commands

Notes:

- Add `LICENSE` (GPL-3.0) and `.gitignore` for `dist/`, `image/config/.build/`, `*.iso`.
- `npm run build` in M1 may only compile TypeScript; full ISO build lands in M4.
- Linux image workspace lives under `ewurk-linux-image/`; root `npm` scripts delegate via workspaces so EWURK ops `src/` is untouched. Ops dev/test use `dev:ops` and `test:all`.

## M2: Image manifest and policy tests

Status: [x] done

Goal: Check in `image/manifest.json`, package lists, and automated tests that define required, forbidden, and firmware packages.

Acceptance:

- [x] `image/manifest.json` exists and matches `src/manifest/schema.ts`
- [x] `npm test` includes failing cases for forbidden packages (e.g. `ubuntu-report`, `snapd`) when present in fixture lists
- [x] `npm run build` runs TypeScript compile and manifest validation (no live-build required yet)
- [x] `README.md` documents manifest fields and how to bump `version`

Notes:

- Forbidden list should encode the “no phone home” policy as concrete package/service names.
- Paths are under `ewurk-linux-image/`; `npm run build` runs `dist/cli/validateManifest.js` after `tsc`.

## M3: live-build config and rootfs overlay

Status: [x] done

Goal: Add Debian live-build configuration and overlay files including first-boot systemd unit and scripts (locale, keyboard, single user).

Acceptance:

- [x] `image/config/` contains a complete `lb config` tree for bookworm amd64 XFCE
- [x] `image/overlay/` contains `ewurk-firstboot.service` and installer script with documented offline behavior
- [x] `npm test` asserts required paths exist (overlay unit, service enabled via `chroot_local-hooks` or equivalent hook file)
- [x] `README.md` lists host packages from `scripts/host-deps.sh` (or equivalent) with install command

Notes:

- First-boot must not prompt for cloud or OEM accounts; only locale/keyboard/hostname (optional)/username.
- Overlay is applied via `hooks/normal/0100-ewurk-overlay.chroot`; enablement uses `chroot_local-hooks/0100-enable-ewurk-firstboot`.

## M4: Produce bootable ISO artifact

Status: [ ] todo

Goal: Wire `npm run build` to run live-build and emit `dist/*.iso` plus `dist/SHA256SUMS` on a properly equipped Linux host.

Acceptance:

- [ ] `npm run build` writes `dist/build-metadata.json` matching SPEC `BuildArtifact` fields
- [ ] `dist/SHA256SUMS` verifies the ISO (`sha256sum -c` succeeds)
- [ ] `npm test` validates `build-metadata.json` schema when present (CI may use committed fixture)
- [ ] `README.md` documents full build command, expected duration, and disk space requirements

Notes:

- CI may skip full `lb build` if runners lack root; document local-only full build clearly.

## M5: USB imaging and wipe disclaimer

Status: [ ] todo

Goal: Document and script safe USB writing while stating sanitization is EWURK’s job, not this repo’s.

Acceptance:

- [ ] `README.md` includes explicit NIST/wipe-in-EWURK-before-imaging language and states imaging does not set `available`
- [ ] `scripts/write-usb.sh` (or documented `dd`/`ventoy` section) shows exact example commands with `DEVICE=` safety guard
- [ ] `npm test` includes a test that `README.md` contains required disclaimer phrases (stable markers)
- [ ] `npm run lint` and `npm run typecheck` still exit 0

Notes:

- Cross-link to EWURK device lifecycle (`imaged` → `available`) without importing ewurk code.

## M6: Telemetry checks and QEMU smoke

Status: [ ] todo

Goal: Automate “no phone home on first boot” policy checks and document an unattended VM smoke test to desktop/first-boot completion.

Acceptance:

- [ ] `npm test` runs telemetry policy tests (`src/verify/telemetry.ts`) against package lists and static config fixtures
- [ ] `qemu/smoke.sh` exits 0 when run on a host with QEMU, ISO at `dist/*.iso`, and creates log at `dist/qemu-smoke.log`
- [ ] `README.md` documents QEMU smoke prerequisites and expected success output (including `/var/lib/ewurk-firstboot/done` or documented marker)
- [ ] `npm test` documents or gates optional QEMU test via env var (e.g. `EWURK_QEMU_SMOKE=1`) so default `npm test` stays offline-fast

Notes:

- Smoke test should fail if outbound telemetry endpoints are contacted when documented test harness runs (e.g. unstarted network or `nc` listen assertions documented in README).

## M7: Polish and release readiness

Status: [ ] todo

Goal: Complete volunteer-facing docs, error handling in CLI, and fresh-clone verification for charity handoff.

Acceptance:

- [ ] `README.md` enables a novice to produce a bootable USB from a clean clone without undocumented steps
- [ ] `npm ci && npm run lint && npm run typecheck && npm test && npm run build` all exit 0 on a documented reference host (full ISO build step called out)
- [ ] CLI prints actionable errors when `lb` or host deps are missing (non-zero exit, no stack trace dump to user)
- [ ] `LICENSE` is GPL-3.0 and matches file headers where applicable
- [ ] `GET /` on `npm run dev` still returns 200 and points to README sections for build and USB

Notes:

- Tag-ready `image/manifest.json` `version` and changelog section in README.
