#!/bin/sh
set -e

# ZEROBOX // Debian/Kali/Parrot Post-Install Script
# Sets up /usr/local/bin symlink and registers desktop icons

INSTALL_DIR="/opt/ZeroBox"
CLI_TARGET="/usr/local/bin/zerobox"

# Handle case variation in opt directory naming
if [ ! -d "$INSTALL_DIR" ] && [ -d "/opt/zerobox" ]; then
    INSTALL_DIR="/opt/zerobox"
fi

if [ -f "$INSTALL_DIR/zerobox" ]; then
    mkdir -p /usr/local/bin
    ln -sf "$INSTALL_DIR/zerobox" "$CLI_TARGET"
    chmod 755 "$CLI_TARGET"
fi

# Refresh XDG desktop applications and icon caches
if which update-desktop-database >/dev/null 2>&1; then
    update-desktop-database -q || true
fi

if which gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi

exit 0
