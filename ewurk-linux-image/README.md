# EWURK Linux Image

Reproducible Debian desktop image build tooling for EWURK refurbished laptops.
See `../SPEC.md` for the full product specification and `../ROADMAP.md` for
milestones.

This directory is the Node/TypeScript workspace for build orchestration and
verification. It does **not** replace the [EWURK operations
app](https://github.com/Worthless-Haunted-Meat/ewurk); wipe and device status
stay in that system.

## Wipe before imaging (EWURK ops app)

<!-- EWURK-WIPE-DISCLAIMER -->

This repository **does not sanitize disks** and is **not** a NIST wipe tool.
Before you flash a laptop:

1. Complete the charity’s **NIST wipe** on the machine.
2. **Record that wipe in EWURK** (method, date, operator) on the device record —
   the NIST wipe must be **recorded in EWURK before imaging**.
3. Only then image the machine with the ISO from this repo.

Flashing or installing this image **does not** change EWURK status by itself.
In EWURK, a device moves `wiped` → … → `imaged` → `available` → `leased` only
when staff update the record. **imaging does not make a device `available`.**
A wipe recorded in EWURK is required before marking a device `available`.

See the [EWURK device lifecycle](https://github.com/Worthless-Haunted-Meat/ewurk)
in the operations app — this repo never substitutes for that workflow.

## Write a bootable USB

After `npm run build` (or a full `EWURK_RUN_LB_BUILD=1` build), verify the ISO
checksum, identify the **correct** removable disk, then write it.

```sh
cd dist && sha256sum -c SHA256SUMS
lsblk -p
```

### `dd` (exact command)

Use the safety wrapper — it **requires** `DEVICE=` and refuses to guess:

```sh
ISO=dist/ewurk-ewurk-2026.04-0.1.0.iso DEVICE=/dev/sdX ./scripts/write-usb.sh
```

Replace `/dev/sdX` with the whole-disk device from `lsblk` (for example
`DEVICE=/dev/sdb`). The script prompts for `YES` before calling `dd`.

### Ventoy (copy ISO)

Install [Ventoy](https://www.ventoy.net/) on the USB, then copy the built ISO
onto the Ventoy partition:

```sh
cp dist/ewurk-ewurk-2026.04-0.1.0.iso /media/$USER/Ventoy/
```

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

## Build

Default (CI and quick local check — **not** a bootable USB image):

```sh
npm run build
```

This compiles TypeScript, validates `image/manifest.json` against
`image/lists/desktop.list`, and writes:

- `dist/*.iso` — stub payload when live-build is skipped
- `dist/SHA256SUMS` — `sha256sum -c` checksum file
- `dist/build-metadata.json` — manifest version, ISO path, size, digest

Verify checksums:

```sh
cd dist && sha256sum -c SHA256SUMS
```

### Full bootable ISO (Linux build host)

Requires host packages (`sudo ./scripts/host-deps.sh --install`), **root**
for `lb build`, outbound network for Debian mirrors, ~**20 GiB** free disk,
and typically **45–90 minutes** on a shop PC.

```sh
sudo -E EWURK_RUN_LB_BUILD=1 npm run build
```

`EWURK_RUN_LB_BUILD=1` runs `lb config`, `lb clean`, and `lb build` under
`image/`, then copies the produced `.iso` into `dist/` with checksums.

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

## Telemetry policy (no phone home)

`image/manifest.json` `forbiddenPackages` and `image/policy/telemetry-policy.json`
(forbidden systemd units and paths) are enforced in `npm test` via
`src/verify/telemetry.ts`. The image recipe must not include Ubuntu telemetry,
`snapd`, or similar reporting packages.

## QEMU smoke (optional)

Prerequisites: `qemu-system-x86_64`, an ISO under `dist/` (`npm run build` or a
full `EWURK_RUN_LB_BUILD=1` build), and enough RAM for a 2 GiB VM.

Default `npm test` stays offline-fast. To run the smoke harness:

```sh
EWURK_QEMU_SMOKE=1 npm run test:qemu-smoke
# or
bash qemu/smoke.sh
```

The script writes `dist/qemu-smoke.log`. On a **stub** ISO it validates QEMU and
paths only. On a **bootable** ISO it boots with `-nic none` (no network egress)
and succeeds when the serial log contains the first-boot marker
`/var/lib/ewurk-firstboot/done`.

Expected success lines in `dist/qemu-smoke.log`:

```text
SUCCESS (stub validation only)
```

or, for a full image:

```text
SUCCESS: first-boot marker seen in serial log
```

## Quality bar

```sh
npm run lint
npm run typecheck
npm test
npm run build
```
