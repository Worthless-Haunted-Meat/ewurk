#!/usr/bin/env bash
# Documented host packages for building the EWURK image with live-build.
set -euo pipefail

PACKAGES=(
	live-build
	debootstrap
	xorriso
	squashfs-tools
	syslinux-utils
	qemu-system-x86
)

if [[ "${1:-}" == "--install" ]]; then
	if [[ "$(id -u)" -ne 0 ]]; then
		echo "Run: sudo $0 --install" >&2
		exit 1
	fi
	apt-get update
	apt-get install -y --no-install-recommends "${PACKAGES[@]}"
	exit 0
fi

echo "EWURK image build host packages (Debian/Ubuntu):"
printf '  %s\n' "${PACKAGES[@]}"
echo
echo "Install:"
echo "  sudo $(basename "$0") --install"
