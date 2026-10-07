#!/bin/bash
# EWURK first-boot installer — offline-capable; no cloud or OEM accounts.
#
# Collects: locale, keyboard layout, optional hostname, and a single everyday
# user account for the family. Does not transmit data off the machine.
set -euo pipefail

STATE_DIR=/var/lib/ewurk-firstboot
DONE_FILE="${STATE_DIR}/done"

if [[ -f "${DONE_FILE}" ]]; then
	exit 0
fi

if [[ "$(id -u)" -ne 0 ]]; then
	echo "ewurk-firstboot must run as root." >&2
	exit 1
fi

install -d "${STATE_DIR}"
chmod 700 "${STATE_DIR}"

export DEBIAN_FRONTEND=dialog

choose_locale() {
	local choice
	choice="$(
		dialog --stdout --title "EWURK setup" --menu "Choose language" 14 60 6 \
			"en_US.UTF-8" "English (United States)" \
			"es_US.UTF-8" "Español (Estados Unidos)" \
			"fr_FR.UTF-8" "Français (France)" \
			2>/dev/tty1
	)" || true
	if [[ -z "${choice}" ]]; then
		choice="en_US.UTF-8"
	fi
	echo "${choice}"
}

choose_keyboard() {
	local layout
	layout="$(
		dialog --stdout --title "EWURK setup" --menu "Choose keyboard" 14 60 4 \
			"us" "US English" \
			"latam" "Latin American Spanish" \
			"fr" "French" \
			2>/dev/tty1
	)" || true
	if [[ -z "${layout}" ]]; then
		layout="us"
	fi
	echo "${layout}"
}

optional_hostname() {
	local name
	name="$(
		dialog --stdout --title "EWURK setup" --inputbox "Computer name (optional)" 10 60 "ewurk-laptop" 2>/dev/tty1
	)" || true
	name="$(echo "${name}" | tr -cd 'a-zA-Z0-9-' | tr '[:upper:]' '[:lower:]')"
	if [[ -n "${name}" ]]; then
		echo "${name}" > /etc/hostname
		hostnamectl set-hostname "${name}" 2>/dev/null || hostname "${name}"
	fi
}

choose_username() {
	local user
	while true; do
		user="$(
			dialog --stdout --title "EWURK setup" --inputbox "Family user name (login)" 10 60 2>/dev/tty1
		)" || true
		user="$(echo "${user}" | tr -cd 'a-z_-' | tr '[:upper:]' '[:lower:]')"
		if [[ "${user}" =~ ^[a-z][a-z0-9_-]{2,31}$ ]]; then
			echo "${user}"
			return
		fi
		dialog --title "EWURK setup" --msgbox "Use 3–32 characters: lowercase letters, digits, - or _" 8 60 2>/dev/tty1 || true
	done
}

locale="$(choose_locale)"
keyboard="$(choose_keyboard)"
optional_hostname
username="$(choose_username)"

if ! grep -q "^${locale}" /etc/locale.gen 2>/dev/null; then
	echo "${locale} UTF-8" >> /etc/locale.gen
fi
locale-gen "${locale}" 2>/dev/null || locale-gen
update-locale LANG="${locale}" LC_ALL="${locale}"
localectl set-locale "LANG=${locale}" 2>/dev/null || true

debconf-set-selections <<EOF
keyboard-configuration keyboard-configuration/layoutcode string ${keyboard}
keyboard-configuration keyboard-configuration/variant select
EOF
dpkg-reconfigure -f noninteractive keyboard-configuration 2>/dev/null || true
localectl set-x11-keymap "${keyboard}" 2>/dev/null || true

if ! id "${username}" >/dev/null 2>&1; then
	adduser --gecos "EWURK family user" --disabled-password "${username}"
	passwd -d "${username}" 2>/dev/null || true
	usermod -aG audio,video,plugdev,netdev "${username}" 2>/dev/null || true
fi

date -u +"%Y-%m-%dT%H:%M:%SZ" > "${DONE_FILE}"
chmod 600 "${DONE_FILE}"

systemctl disable ewurk-firstboot.service 2>/dev/null || true

dialog --title "EWURK setup" --msgbox "Setup complete. Welcome, ${username}." 8 50 2>/dev/tty1 || true

exit 0
