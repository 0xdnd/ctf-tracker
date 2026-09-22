#!/bin/sh
set -e

# ZEROBOX // Debian/Kali/Parrot Post-Removal Script
# Safely unlinks CLI symlink on remove/purge (preserves on package upgrade)

ACTION="$1"
CLI_TARGET="/usr/local/bin/zerobox"

case "$ACTION" in
    remove|purge)
        if [ -L "$CLI_TARGET" ] || [ -f "$CLI_TARGET" ]; then
            rm -f "$CLI_TARGET"
        fi
        ;;
    upgrade|failed-upgrade|abort-install|abort-upgrade)
        # Do not remove symlink during package upgrade
        ;;
    *)
        ;;
esac

# Refresh XDG desktop applications and icon caches
if which update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q || true
fi

if which gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

exit 0
