#!/usr/bin/env bash
# ==============================================================================
# VPS Automated Storage Cleanup Script
# Cleans system logs, package caches, temporary render files, build caches,
# snap revisions, PM2 logs, and Docker cruft twice daily without interrupting
# active websites or databases.
# ==============================================================================

set -o pipefail

# Ensure standard bin paths are available (essential for cron execution)
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

LOG_TAG="[VPS-CLEANUP]"
SYSTEM_BIN_TARGET="/usr/local/bin/vps-storage-cleanup.sh"

# Function to install the cron job automatically
install_cron() {
    local cron_schedule="0 4,16 * * *" # Runs at 04:00 and 16:00 every day
    local cron_file="/etc/cron.d/vps-storage-cleanup"

    echo "$LOG_TAG Installing script to $SYSTEM_BIN_TARGET..."
    CURRENT_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
    cp "$CURRENT_SCRIPT" "$SYSTEM_BIN_TARGET"
    chmod +x "$SYSTEM_BIN_TARGET"

    echo "$LOG_TAG Installing twice-daily cron job (at 04:00 & 16:00)..."

    # Write system-level cron definition
    cat <<EOF > "$cron_file"
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
# Runs twice daily at 4:00 AM and 4:00 PM
$cron_schedule root $SYSTEM_BIN_TARGET >> /var/log/vps-cleanup.log 2>&1
EOF

    chmod 644 "$cron_file"
    echo "$LOG_TAG Cron job successfully created at $cron_file"
    echo "$LOG_TAG Testing script execution now..."
    run_cleanup
}

run_cleanup() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG Starting automated storage cleanup..."

    # 0. Ensure root reserve is set to 1% (frees ~2GB permanently on /dev/sda1)
    if [ -b "/dev/sda1" ]; then
        tune2fs -m 1 /dev/sda1 >/dev/null 2>&1 || true
    fi

    # 1. Kill orphaned ffmpeg processes older than 60 minutes (drops deleted file locks)
    if command -v killall >/dev/null 2>&1; then
        killall -q --older-than 60m -9 ffmpeg >/dev/null 2>&1 || true
    fi

    # 2. Vacuum systemd journal logs (keep max 50MB and max 2 days)
    if command -v journalctl >/dev/null 2>&1; then
        journalctl --vacuum-size=50M --vacuum-time=2d >/dev/null 2>&1 || true
    fi

    # 3. Clean Snap: retain max 2 versions, delete disabled revisions, clear cache
    if command -v snap >/dev/null 2>&1; then
        snap set system refresh.retain=2 >/dev/null 2>&1 || true
        snap list --all 2>/dev/null | awk '/disabled/{print $1, $3}' | while read snapname revision; do
            snap remove "$snapname" --revision="$revision" >/dev/null 2>&1 || true
        done
    fi
    if [ -d "/var/lib/snapd" ]; then
        rm -rf /var/lib/snapd/cache/* /var/lib/snapd/snapshots/* 2>/dev/null || true
    fi

    # 4. Remove compressed and rotated old logs across system and CloudPanel sites
    find /var/log -type f \( -name "*.gz" -o -name "*.[0-9]" -o -name "*.old" \) -delete 2>/dev/null || true
    find /home/*/logs -type f \( -name "*.gz" -o -name "*.[0-9]" -o -name "*.old" \) -delete 2>/dev/null || true

    # 5. Clean APT package cache and orphaned packages
    if command -v apt-get >/dev/null 2>&1; then
        export DEBIAN_FRONTEND=noninteractive
        apt-get clean >/dev/null 2>&1 || true
        apt-get autoremove -y --purge >/dev/null 2>&1 || true
        # Remove leftover config files of uninstalled packages
        dpkg -l 2>/dev/null | grep '^rc' | awk '{print $2}' | xargs -r dpkg --purge 2>/dev/null || true
    fi

    # 6. Clean Docker build cache and unused dangling data (if Docker is present)
    if command -v docker >/dev/null 2>&1; then
        docker system prune -f >/dev/null 2>&1 || true
        docker builder prune -f >/dev/null 2>&1 || true
    fi

    # 7. Clean temporary files older than 24 hours
    find /tmp -mindepth 1 -mtime +1 -delete 2>/dev/null || true
    find /var/tmp -mindepth 1 -mtime +1 -delete 2>/dev/null || true

    # 8. Clean abandoned/broken video chunks (.part files) older than 1 hour in shorts
    for base_dir in "/root/shorts" "/var/www/shorts" "/home/*/htdocs/*/shorts"; do
        if [ -d "$base_dir/public/outputs" ]; then
            find "$base_dir/public/outputs" -type f -name "*.part" -mmin +60 -delete 2>/dev/null || true
        fi
        if [ -d "$base_dir/temp" ]; then
            find "$base_dir/temp" -type f -mmin +60 -delete 2>/dev/null || true
        fi
    done

    # 9. Clean Next.js build cache across active projects (frees 1-3GB cache, keeps prod build)
    find /root /home -maxdepth 4 -type d -path "*/.next/cache" -exec rm -rf {} + 2>/dev/null || true

    # 10. Flush PM2 logs and reload nginx error logs to release open file handles
    if command -v pm2 >/dev/null 2>&1; then
        pm2 flush >/dev/null 2>&1 || true
    elif [ -x "/usr/local/bin/pm2" ]; then
        /usr/local/bin/pm2 flush >/dev/null 2>&1 || true
    else
        NVM_PM2=$(find /root/.nvm/versions/node -name pm2 -type f 2>/dev/null | head -n 1)
        if [ -n "$NVM_PM2" ] && [ -x "$NVM_PM2" ]; then
            "$NVM_PM2" flush >/dev/null 2>&1 || true
        fi
    fi
    systemctl reload nginx >/dev/null 2>&1 || true

    # 11. Clear root user cache and npm cache
    rm -rf /root/.cache/* 2>/dev/null || true
    npm cache clean --force >/dev/null 2>&1 || true

    # 12. Summary log
    AVAILABLE_SPACE=$(df -h / | awk 'NR==2 {print $4}')
    USED_PERCENT=$(df -h / | awk 'NR==2 {print $5}')
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG Cleanup completed. Available disk space: $AVAILABLE_SPACE (Usage: $USED_PERCENT)"
}

# Handle command-line arguments
if [ "$1" = "--install-cron" ] || [ "$1" = "install" ]; then
    install_cron
else
    run_cleanup
fi
