#!/usr/bin/env bash
# Write an EWURK ISO to a removable USB device (destructive).
#
# Safety: set DEVICE explicitly to the block device from lsblk (e.g. /dev/sdb).
# Double-check with lsblk -p and wipe/size before running.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ISO="${ISO:-}"

usage() {
	cat <<'EOF'
Usage:
  ISO=dist/your-image.iso DEVICE=/dev/sdX ./scripts/write-usb.sh

Environment:
  ISO      Path to the .iso from npm run build (required)
  DEVICE   Whole-disk block device to overwrite (required, e.g. /dev/sdb)

Example (dd):
  lsblk -p
  ISO=dist/ewurk-ewurk-2026.04-0.1.0.iso DEVICE=/dev/sdb ./scripts/write-usb.sh

Ventoy (copy file instead of raw dd):
  Install Ventoy on the USB, then copy the ISO onto the Ventoy data partition:
  cp dist/ewurk-ewurk-2026.04-0.1.0.iso /media/$USER/Ventoy/

EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
	usage
	exit 0
fi

if [[ -z "${ISO}" ]]; then
	echo "ERROR: set ISO=dist/your-image.iso" >&2
	usage >&2
	exit 1
fi

if [[ -z "${DEVICE:-}" ]]; then
	echo "ERROR: set DEVICE=/dev/sdX (see lsblk -p). Refusing to guess." >&2
	usage >&2
	exit 1
fi

if [[ ! -f "${ISO}" ]]; then
	if [[ -f "${ROOT}/${ISO}" ]]; then
		ISO="${ROOT}/${ISO}"
	else
		echo "ERROR: ISO not found: ${ISO}" >&2
		exit 1
	fi
fi

case "${DEVICE}" in
	/dev/sd[a-z]|/dev/nvme[0-9]n[0-9]|/dev/mmcblk[0-9])
		;;
	*)
		echo "ERROR: DEVICE must be a whole-disk path like /dev/sdb (got ${DEVICE})" >&2
		exit 1
		;;
esac

if [[ ! -b "${DEVICE}" ]]; then
	echo "ERROR: ${DEVICE} is not a block device" >&2
	exit 1
fi

if [[ "${DEVICE}" == "/dev/sda" && "${EWURK_FORCE:-}" != "1" ]]; then
	echo "ERROR: refusing to write to /dev/sda without EWURK_FORCE=1" >&2
	exit 1
fi

echo "About to DESTROY all data on ${DEVICE} and write ${ISO}"
lsblk -p "${DEVICE}" || true
read -r -p "Type YES to continue: " confirm
if [[ "${confirm}" != "YES" ]]; then
	echo "Aborted."
	exit 1
fi

sudo dd if="${ISO}" of="${DEVICE}" bs=4M status=progress conv=fsync
sync
echo "Done. Boot the machine from this USB."
