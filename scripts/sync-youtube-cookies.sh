#!/bin/bash
# ==============================================================================
# scripts/sync-youtube-cookies.sh
# Automated YouTube Cookie Extractor & Sync Script
# 
# Automatically extracts fresh YouTube cookies from your local browser
# (Brave, Chrome, Firefox, Safari) and copies them to your local project
# and/or uploads them directly to your Hostinger VPS.
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_COOKIE_FILE="${PROJECT_DIR}/cookies.txt"
TEMP_COOKIE_FILE="/tmp/yt_fresh_cookies.txt"

# Remote VPS settings (Optional - set in environment or fill here)
# Example: VPS_TARGET="root@your-vps-ip:/var/www/shorts/cookies.txt"
VPS_TARGET="${SHORTS_VPS_COOKIE_PATH:-""}"

# Preferred browsers to try in order
BROWSERS=("brave" "chrome" "firefox" "safari" "edge")

echo "=================================================="
echo "  YouTube Cookie Auto-Sync Utility"
echo "=================================================="

# Check if yt-dlp is installed
if ! command -v yt-dlp &> /dev/null; then
    echo "❌ Error: yt-dlp is not installed or not in PATH."
    echo "Install via Homebrew: brew install yt-dlp"
    exit 1
fi

SUCCESS=false

for BROWSER in "${BROWSERS[@]}"; do
    echo "🔍 Attempting to extract cookies from ${BROWSER}..."
    rm -f "${TEMP_COOKIE_FILE}"

    # Extract cookies using yt-dlp's native browser extractor
    if yt-dlp --cookies-from-browser "${BROWSER}" --cookies "${TEMP_COOKIE_FILE}" --skip-download "https://www.youtube.com" > /dev/null 2>&1; then
        if [ -f "${TEMP_COOKIE_FILE}" ] && [ -s "${TEMP_COOKIE_FILE}" ]; then
            # Verify file contains youtube session tokens
            if grep -qi "youtube.com" "${TEMP_COOKIE_FILE}"; then
                echo "✅ Successfully extracted fresh YouTube cookies from ${BROWSER}!"
                cp "${TEMP_COOKIE_FILE}" "${OUTPUT_COOKIE_FILE}"
                echo "📁 Saved to local project: ${OUTPUT_COOKIE_FILE}"
                SUCCESS=true
                break
            fi
        fi
    else
        echo "   Could not extract from ${BROWSER} (browser may be locked or not logged in)."
    fi
done

if [ "$SUCCESS" = false ]; then
    echo "⚠️ Automatic extraction from open browsers was blocked by macOS security (TCC) or browser was locked."
    echo ""
    echo "👉 Tip for macOS:"
    echo "1. Quit Chrome/Brave completely (Cmd+Q) before running, OR"
    echo "2. Grant 'Full Disk Access' to Terminal in System Settings > Privacy & Security."
    echo "3. Alternatively, use the 'Static Burner Account' method (explained in docs)."
    exit 1
fi

# Optional: Upload to remote VPS if VPS_TARGET is provided
if [ -n "${VPS_TARGET}" ]; then
    echo "🚀 Syncing cookies to remote VPS: ${VPS_TARGET}..."
    scp "${OUTPUT_COOKIE_FILE}" "${VPS_TARGET}"
    echo "✅ Remote VPS cookies updated successfully!"
fi

echo "🎉 Done! Your cookies.txt is fresh and ready."

