#!/usr/bin/env bash
set -eo pipefail

# ==============================================================================
# ZEROBOX // Tactical Automated Updater for Linux (Debian, Kali, Parrot, AppImage)
# Repository: https://github.com/0xdnd/ctf-tracker
# ==============================================================================

REPO="0xdnd/ctf-tracker"
API_URL="https://api.github.com/repos/${REPO}/releases/latest"

# Terminal formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  ______ ____ ___  ____  ____  ____ _  __"
echo " /_  __/ __// _ \/ __ \/ __ )/ __ \ |/ /"
echo "  / / / _/ / , _/ /_/ / __  / /_/ /   / "
echo " /_/ /___//_/|_|\____/_____/\____/_/|_| "
echo "   Tactical Cyber Suite Auto-Updater    "
echo -e "${NC}"

TMP_DIR="$(mktemp -d -t zerobox-update-XXXXXX)"
cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

# Check required utilities
for cmd in curl jq sha256sum; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo -e "${RED}[!] Missing required utility: ${cmd}${NC}"
        echo -e "    Please install it via: sudo apt-get install -y ${cmd}"
        exit 1
    fi
done

echo -e "${CYAN}[*] Fetching latest release metadata from GitHub (${REPO})...${NC}"
RELEASE_JSON="$(curl -sSL -H "Accept: application/vnd.github.v3+json" "${API_URL}")"

LATEST_TAG="$(echo "$RELEASE_JSON" | jq -r '.tag_name // empty')"
if [ -z "$LATEST_TAG" ] || [ "$LATEST_TAG" = "null" ]; then
    echo -e "${RED}[!] Failed to parse release tag from GitHub API.${NC}"
    echo "$RELEASE_JSON" | jq -r '.message // empty' 2>/dev/null || true
    exit 1
fi

CLEAN_LATEST="${LATEST_TAG#v}"

# Determine current installed version
CURRENT_VERSION=""
if command -v zerobox >/dev/null 2>&1; then
    CURRENT_VERSION="$(zerobox --version 2>/dev/null || true)"
fi

echo -e "    -> Latest Release: ${GREEN}${BOLD}${LATEST_TAG}${NC}"
if [ -n "$CURRENT_VERSION" ]; then
    echo -e "    -> Local Version:  ${YELLOW}${CURRENT_VERSION}${NC}"
fi

# Detect environment: AppImage vs Debian Package
MODE=""
TARGET_APPIMAGE_PATH=""

if [ -n "$APPIMAGE" ] && [ -f "$APPIMAGE" ]; then
    MODE="appimage"
    TARGET_APPIMAGE_PATH="$APPIMAGE"
elif [ -n "$1" ] && [ -f "$1" ] && [[ "$1" == *.AppImage ]]; then
    MODE="appimage"
    TARGET_APPIMAGE_PATH="$(realpath "$1")"
elif dpkg -s zerobox >/dev/null 2>&1; then
    MODE="deb"
else
    # Default selection based on system
    if command -v dpkg >/dev/null 2>&1; then
        MODE="deb"
    else
        MODE="appimage"
    fi
fi

echo -e "${CYAN}[*] Update Mode Detected: ${BOLD}${MODE}${NC}"

# Extract download URLs (prioritizing Linux-specific checksums)
CHECKSUMS_URL="$(echo "$RELEASE_JSON" | jq -r '.assets[] | select(.name | test("SHA256SUMS-linux|SHA256SUMS\\.txt|checksums.*txt"; "i")) | .browser_download_url' | head -n 1)"

if [ "$MODE" = "appimage" ]; then
    ASSET_URL="$(echo "$RELEASE_JSON" | jq -r '.assets[] | select(.name | endswith(".AppImage")) | .browser_download_url' | head -n 1)"
    ASSET_NAME="$(echo "$RELEASE_JSON" | jq -r '.assets[] | select(.name | endswith(".AppImage")) | .name' | head -n 1)"
elif [ "$MODE" = "deb" ]; then
    ASSET_URL="$(echo "$RELEASE_JSON" | jq -r '.assets[] | select(.name | endswith("_amd64.deb") or endswith(".deb")) | .browser_download_url' | head -n 1)"
    ASSET_NAME="$(echo "$RELEASE_JSON" | jq -r '.assets[] | select(.name | endswith("_amd64.deb") or endswith(".deb")) | .name' | head -n 1)"
fi

if [ -z "$ASSET_URL" ] || [ "$ASSET_URL" = "null" ]; then
    echo -e "${RED}[!] No matching asset found for mode '${MODE}' in release ${LATEST_TAG}.${NC}"
    exit 1
fi

echo -e "${CYAN}[*] Downloading ${ASSET_NAME}...${NC}"
curl -fL --progress-bar "$ASSET_URL" -o "${TMP_DIR}/${ASSET_NAME}"

# Verify SHA-256 Checksum if published
if [ -n "$CHECKSUMS_URL" ] && [ "$CHECKSUMS_URL" != "null" ]; then
    echo -e "${CYAN}[*] Downloading and verifying SHA-256 checksums...${NC}"
    curl -sSL "$CHECKSUMS_URL" -o "${TMP_DIR}/SHA256SUMS.txt"
    
    cd "$TMP_DIR"
    EXPECTED_HASH="$(grep -i "${ASSET_NAME}" SHA256SUMS.txt | awk '{print $1}' | head -n 1 || true)"
    if [ -n "$EXPECTED_HASH" ]; then
        ACTUAL_HASH="$(sha256sum "${ASSET_NAME}" | awk '{print $1}')"
        if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
            echo -e "${RED}[!] CHECKSUM VERIFICATION FAILED!${NC}"
            echo -e "    Expected: ${EXPECTED_HASH}"
            echo -e "    Got:      ${ACTUAL_HASH}"
            exit 1
        fi
        echo -e "${GREEN}[+] Checksum verified: ${ACTUAL_HASH}${NC}"
    else
        echo -e "${YELLOW}[!] Warning: Checksum for ${ASSET_NAME} not in SHA256SUMS.txt; proceeding with caution.${NC}"
    fi
fi

# Apply Update
if [ "$MODE" = "appimage" ]; then
    if [ -z "$TARGET_APPIMAGE_PATH" ]; then
        TARGET_APPIMAGE_PATH="${HOME}/Applications/ZeroBox.AppImage"
        mkdir -p "${HOME}/Applications"
    fi
    
    echo -e "${CYAN}[*] Performing atomic AppImage replacement to: ${TARGET_APPIMAGE_PATH}...${NC}"
    chmod +x "${TMP_DIR}/${ASSET_NAME}"
    
    # Atomic mv replaces directory entry and unlinks old inode, avoiding Linux ETXTBSY on running binaries
    mv -f "${TMP_DIR}/${ASSET_NAME}" "$TARGET_APPIMAGE_PATH"
    
    echo -e "${GREEN}${BOLD}[✔] ZeroBox updated successfully to ${LATEST_TAG}!${NC}"
    echo -e "    Launch with: ${BOLD}${TARGET_APPIMAGE_PATH}${NC}"

elif [ "$MODE" = "deb" ]; then
    echo -e "${CYAN}[*] Installing Debian package via dpkg (requires sudo privileges)...${NC}"
    sudo dpkg -i "${TMP_DIR}/${ASSET_NAME}" || sudo apt-get install -f -y
    
    echo -e "${GREEN}${BOLD}[✔] ZeroBox Debian package installed successfully!${NC}"
    echo -e "    Launch from application menu or CLI: ${BOLD}zerobox${NC}"
fi

exit 0
