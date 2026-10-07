#!/usr/bin/env bash
# QEMU smoke test for EWURK ISO artifacts (optional; run via EWURK_QEMU_SMOKE=1).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${ROOT}/dist"
LOG="${DIST}/qemu-smoke.log"
ISO=""

mkdir -p "${DIST}"

log() {
	echo "$*" | tee -a "${LOG}"
}

: >"${LOG}"
log "ewurk qemu smoke started at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if ! command -v qemu-system-x86_64 >/dev/null 2>&1; then
	log "ERROR: qemu-system-x86_64 not installed"
	exit 1
fi

shopt -s nullglob
isos=("${DIST}"/*.iso)
shopt -u nullglob

if [[ ${#isos[@]} -eq 0 ]]; then
	log "ERROR: no ISO under ${DIST}; run npm run build first"
	exit 1
fi

ISO="${isos[0]}"
log "using ISO: ${ISO}"

if grep -q "EWURK Linux image build stub" "${ISO}" 2>/dev/null; then
	log "stub ISO detected — skipping boot (build with EWURK_RUN_LB_BUILD=1 for full VM smoke)"
	log "qemu-system-x86_64: $(command -v qemu-system-x86_64)"
	log "expected first-boot marker on real images: /var/lib/ewurk-firstboot/done"
	log "SUCCESS (stub validation only)"
	exit 0
fi

# Real ISO: boot without NIC to avoid outbound telemetry during smoke.
TIMEOUT_SEC="${EWURK_QEMU_TIMEOUT_SEC:-180}"
log "booting with -nic none for ${TIMEOUT_SEC}s (no network egress)"

set +e
timeout "${TIMEOUT_SEC}" qemu-system-x86_64 \
	-machine q35 \
	-m 2048 \
	-smp 2 \
	-cdrom "${ISO}" \
	-boot d \
	-nic none \
	-nographic \
	-serial mon:stdio \
	2>&1 | tee -a "${LOG}"
qemu_status=$?
set -e

if grep -q "/var/lib/ewurk-firstboot/done" "${LOG}"; then
	log "SUCCESS: first-boot marker seen in serial log"
	exit 0
fi

if [[ ${qemu_status} -eq 124 ]]; then
	log "WARN: QEMU timed out after ${TIMEOUT_SEC}s without first-boot marker (manual review)"
	exit 1
fi

log "ERROR: QEMU exited ${qemu_status} without first-boot marker"
exit 1
