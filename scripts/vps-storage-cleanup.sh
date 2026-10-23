#!/usr/bin/env bash
# ==============================================================================
# VPS Automated Storage Cleanup Script
# Cleans system logs, package caches, temporary render files, build caches,
# and PM2 logs twice a day without interrupting active websites or databases.
# ==============================================================================

set -o pipefail

# Ensure standard bin paths are available (essential for cron execution)
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
LOG_TAG="[VPS-CLEANUP]"

# Function to install the cron job automatically
install_cron() {
    local cron_schedule="0 4,16 * * *" # Runs at 04:00 and 16:00 every day
    local cron_cmd="$SCRIPT_PATH >> /var/log/vps-cleanup.log 2>&1"
    local cron_file="/etc/cron.d/vps-storage-cleanup"

    echo "$LOG_TAG Installing twice-daily cron job (at 04:00 & 16:00)..."

    # Make sure script itself is executable
    chmod +x "$SCRIPT_PATH"

    # Write system-level cron definition
    cat <<EOF > "$cron_file"
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
# Runs twice daily at 4:00 AM and 4:00 PM
$cron_schedule root $cron_cmd
EOF

    chmod 644 "$cron_file"
    echo "$LOG_TAG Cron job successfully created at $cron_file"
    echo "$LOG_TAG Testing script execution now..."
    run_cleanup
}

run_cleanup() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG Starting automated storage cleanup..."

    # 1. Vacuum systemd journal logs (keep max 50MB and max 3 days)
    if command -v journalctl >/dev/null 2>&1; then
        journalctl --vacuum-size=50M --vacuum-time=3d >/dev/null 2>&1 || true
    fi

    # 2. Remove compressed and rotated old logs (>1 day old)
    find /var/log -type f \( -name "*.gz" -o -name "*.[0-9]" -o -name "*.old" \) -mtime +1 -delete 2>/dev/null || true
    find /home/*/logs -type f \( -name "*.gz" -o -name "*.[0-9]" -o -name "*.old" \) -mtime +1 -delete 2>/dev/null || true

    # 3. Clean APT package cache and orphaned packages
    if command -v apt-get >/dev/null 2>&1; then
        export DEBIAN_FRONTEND=noninteractive
        apt-get clean >/dev/null 2>&1 || true
        apt-get autoremove -y --purge >/dev/null 2>&1 || true
        # Remove leftover config files of uninstalled packages
        dpkg -l 2>/dev/null | grep '^rc' | awk '{print $2}' | xargs -r dpkg --purge 2>/dev/null || true
    fi

    # 4. Clean Snap caches and saved snapshots (e.g. removed package backups)
    if [ -d "/var/lib/snapd" ]; then
        rm -rf /var/lib/snapd/cache/* 2>/dev/null || true
        rm -rf /var/lib/snapd/snapshots/* 2>/dev/null || true
    fi

    # 5. Clean temporary files older than 24 hours
    find /tmp -mindepth 1 -mtime +1 -delete 2>/dev/null || true
    find /var/tmp -mindepth 1 -mtime +1 -delete 2>/dev/null || true

    # 6. Clean abandoned/broken video chunks (.part files) older than 2 hours
    # Searches both /root/shorts and /var/www/shorts if present
    for base_dir in "/root/shorts" "/var/www/shorts"; do
        if [ -d "$base_dir/public/outputs" ]; then
            find "$base_dir/public/outputs" -type f -name "*.part" -mmin +120 -delete 2>/dev/null || true
        fi
        if [ -d "$base_dir/temp" ]; then
            find "$base_dir/temp" -type f -mmin +120 -delete 2>/dev/null || true
        fi
    done

    # 7. Clean Next.js build cache across active projects in /root (keeps production output, frees 1-3GB of webpack/babel caches)
    find /root -maxdepth 3 -type d -path "*/.next/cache" -exec rm -rf {} + 2>/dev/null || true

    # 8. Flush PM2 log files so they never balloon into gigabytes
    if command -v pm2 >/dev/null 2>&1; then
        pm2 flush >/dev/null 2>&1 || true
    elif [ -x "/usr/local/bin/pm2" ]; then
        /usr/local/bin/pm2 flush >/dev/null 2>&1 || true
    else
        # Try locating PM2 under NVM if active
        NVM_PM2=$(find /root/.nvm/versions/node -name pm2 -type f 2>/dev/null | head -n 1)
        if [ -n "$NVM_PM2" ] && [ -x "$NVM_PM2" ]; then
            "$NVM_PM2" flush >/dev/null 2>&1 || true
        fi
    fi

    # 9. Clear root user cache and npm cache
    rm -rf /root/.cache/* 2>/dev/null || true
    npm cache clean --force >/dev/null 2>&1 || true

    # 10. Summary log
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
