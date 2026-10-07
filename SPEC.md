# EWURK Linux Image — Specification (v1)

## 1. Summary

EWURK Linux Image is a reproducible build system that produces a bootable
desktop environment for typical donated Intel laptops refurbished by the
nonprofit. Volunteers use it to flash a known-good system image after
sanitization is recorded in the separate EWURK operations app
(`Worthless-Haunted-Meat/ewurk`). Recipient families get a ready-to-use
computer with a short first-boot setup (language and user name) and no
developer or cloud sign-in friction.

## 2. Core user flows

1. A volunteer clones this repo on a Linux build host, installs documented
   host packages, and runs the documented build command to produce an image
   artifact and checksum file.
2. A volunteer follows the README to write the image to a USB (e.g. `dd`,
   Ventoy, or the documented wrapper script) without treating flashing as
   data sanitization.
3. After NIST wipe is recorded in EWURK for a device, a volunteer boots the
   laptop from USB, installs or copies the image per README, and manually
   updates device status in EWURK (`imaged`, then later `available`).
4. On first boot of the installed system, the family selects locale and
   keyboard, optionally sets a hostname, and creates a single everyday user
   account with no cloud or OEM account prompts.
5. The family connects to Wi‑Fi and prints a document using the preinstalled
   browser and office suite without signing into a vendor portal.
6. A maintainer runs the automated test suite to confirm expected packages,
   disabled telemetry services, and (when QEMU is available) a VM smoke path
   to desktop.
7. A maintainer bumps the image manifest version and rebuilds so the charity
   ships a new known-good image with an updated changelog.

## 3. Non-goals for v1

- **Not a wipe tool.** This repo does not sanitize disks, certify NIST wipes,
  or change EWURK device status. README must state that wipe is recorded in
  EWURK before imaging and that imaging alone never makes a device
  `available`.
- **No changes to `ewurk`.** No code, APIs, or deployment coupling in the ops
  app repository for v1.
- **No Windows imaging** or redistribution of proprietary OS licenses.
- **No mandatory cloud accounts** (Microsoft, Google, Ubuntu One, Apple, etc.)
  or OEM bloatware portals required to reach the desktop.
- **No remote lock, brick, or lease enforcement** on devices.
- **No collection or exfiltration of family PII** (no analytics beacon, no
  “phone home” telemetry, no background upload of user profiles).
- **No ARM / Chromebook / tablet images** — Intel/AMD64 laptops only.
- **No MDM auto-enrollment** or fleet management integration.
- **No EWURK API integration** to set `imaged` from the bench (nice-to-have
  later).
- **No paid services, secrets, or accounts** required to build or run tests
  locally.
- **No custom distribution from scratch** (no Yocto/Buildroot as the primary
  path); stay on Debian-family tooling.
- **No guarantee of imaging-time sanitization** — volunteers must follow
  EWURK wipe workflow separately.

## 4. Stack

| Area | Choice | Why |
| --- | --- | --- |
| Language | **TypeScript** (ESM, Node **22+**) | Same skill set as EWURK ops; strong lint/typecheck; `node:test` without extra runners. |
| Orchestration | **Node CLI** invoking **live-build** (`lb`) on a **Debian 12 (bookworm) amd64** base | Boring, well-documented path to a bootable ISO/USB image without inventing a distro. |
| Desktop | **XFCE** + documented **non-free firmware** packages | Light on old hardware; practical Wi‑Fi on common Latitude-class laptops. |
| First-boot | **systemd oneshot** + shell/`debconf` scripts in image overlay | Offline-capable, no Calamares/OEM account flows. |
| Storage (repo) | **JSON manifests** on disk (`image/manifest.json`, package lists) | No database; easy to diff and test. |
| HTTP (tooling) | **Express** (minimal) | M1 walking skeleton: `npm run dev` health/documentation endpoint only; not part of the shipped laptop image. |
| Test runner | **`node --test`** (Node built-in) | Zero extra test framework; fits AGENTS-style quality bar. |
| Lint / types | **ESLint** flat config + **`tsc --noEmit`** | Matches EWURK conventions. |
| VM smoke | **QEMU** scripts (optional in CI, documented locally) | Free, unattended first-boot check when host provides QEMU. |

Host build machine (documented, not vendored): Debian or Ubuntu x86_64 with
`live-build`, `debootstrap`, `xorriso`, `squashfs-tools`, and root/sudo for
`lb build`.

## 5. Architecture

```
ewurk-linux-image/
  package.json          # npm scripts: dev, test, lint, typecheck, build
  SPEC.md / ROADMAP.md
  LICENSE               # GPL-3.0
  README.md             # clone → build → USB → VM smoke; wipe disclaimer
  src/
    server.ts           # M1+: GET / health + links to docs paths
    cli/
      build.ts          # invokes live-build with pinned config
      verify.ts         # post-build checks (checksum, size bounds)
    manifest/
      schema.ts         # types + validation for image/manifest.json
      load.ts
    verify/
      packages.ts       # expected/absent package lists
      telemetry.ts      # services + files that must stay disabled/absent
  image/
    config/             # live-build config tree (auto/, config/)
    overlay/            # rootfs files: first-boot unit, skel, policies
    lists/              # .list / chroot package selections
    manifest.json       # version, debian suite, arch, package pins
  scripts/
    host-deps.sh        # print/install documented apt packages
    write-usb.sh        # safe wrapper around dd/ventoy instructions
  test/
    manifest.test.ts
    telemetry.test.ts
    build-metadata.test.ts
  qemu/
    smoke.sh            # boot ISO in QEMU, assert first-boot completion marker
```

**Data flow:** Maintainer edits `image/manifest.json` and package lists →
`npm run build` validates manifest → CLI runs `lb clean && lb build` in
`image/config` → artifacts land in `dist/` (ISO, SHA256SUMS) → `npm test`
validates manifest rules, forbidden packages, and telemetry policy → optional
`qemu/smoke.sh` boots the ISO and checks for first-boot completion without
network egress tests failing.

**Separation from EWURK:** Device lifecycle (`wiped` → … → `imaged` →
`available` → `leased`) remains entirely in the ops app; this repo only
documents the volunteer order of operations.

## 6. Data model

All persisted project data is files in the repository or build outputs under
`dist/` (gitignored). Logical entities:

### ImageManifest

| Field | Type | Description |
| --- | --- | --- |
| `version` | string | Semver of the image recipe (e.g. `1.0.0`). |
| `codename` | string | Marketing label (e.g. `ewurk-2026.04`). |
| `baseSuite` | string | Debian suite (default `bookworm`). |
| `architecture` | string | `amd64` for v1. |
| `desktop` | string | `xfce` for v1. |
| `requiredPackages` | string[] | Must be present in image package list. |
| `forbiddenPackages` | string[] | Must not appear (telemetry, snapd, etc.). |
| `firmwarePackages` | string[] | Non-free firmware metapackages documented for Wi‑Fi. |
| `firstBootVersion` | string | Version of overlay first-boot scripts. |

### BuildArtifact (generated)

| Field | Type | Description |
| --- | --- | --- |
| `manifestVersion` | string | Copied from ImageManifest at build time. |
| `builtAt` | ISO datetime | UTC timestamp from build CLI. |
| `isoPath` | string | Relative path under `dist/`. |
| `sha256` | string | Hex digest of ISO. |
| `sizeBytes` | number | ISO size for sanity checks. |

### FirstBootState (on target machine, not in repo)

| Field | Type | Description |
| --- | --- | --- |
| `completed` | boolean | Marker file `/var/lib/ewurk-firstboot/done` after success. |
| `locale` | string | Selected locale (stored locally only). |
| `username` | string | Single family user created on device (local `/etc/passwd` only). |

No EWURK device IDs, serial numbers, or family records are written into the
image build system or transmitted off-device in v1.

### VerificationCheck (test output)

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Stable check name (e.g. `no-ubuntu-report`). |
| `passed` | boolean | Result. |
| `detail` | string | Optional human-readable failure reason. |

## 7. Quality bar

Every milestone is done only when all of the following succeed on a clean
clone (after documented host dependencies are installed for build/QEMU
steps):

| Command | Requirement |
| --- | --- |
| `npm ci` | Installs locked dependencies only. |
| `npm run typecheck` | `tsc --noEmit` over `src/` — zero errors. |
| `npm run lint` | ESLint — zero errors. |
| `npm test` | Unit/policy tests pass (manifest, telemetry rules, metadata). |
| `npm run build` | Produces `dist/` artifacts when host live-build deps present; in CI without root, may run **verify-only** mode documented in README (M1 may stub build until M4). |

Release readiness (final milestone) additionally requires:

- README: fresh-clone build path, USB commands, VM smoke, **wipe-before-image**
  disclaimer, and **no phone-home** expectations.
- `LICENSE` GPL-3.0 present.
- Manual or scripted confirmation that first boot reaches XFCE without account
  sign-in (documented QEMU steps).
