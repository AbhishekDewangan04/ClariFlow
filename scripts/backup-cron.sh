#!/bin/sh
# ClariFlow Automated Database Backup Daemon (Docker Container)
set -e

BACKUP_INTERVAL="${BACKUP_INTERVAL:-86400}" # Default: 24h (daily)
RETENTION_DAYS="${RETENTION_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

mkdir -p "${BACKUP_DIR}"

echo "[backup-cron] ClariFlow Automated Backup Daemon initialized."
echo "[backup-cron] Host: ${POSTGRES_HOST:-postgres} | Database: ${POSTGRES_DB:-clariflow}"
echo "[backup-cron] Interval: ${BACKUP_INTERVAL}s | Retention: ${RETENTION_DAYS} days"

while true; do
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  BACKUP_FILE="${BACKUP_DIR}/clariflow_backup_${TIMESTAMP}.sql.gz"

  echo "[backup-cron] Starting automated backup at $(date -u) -> ${BACKUP_FILE}"
  
  export PGPASSWORD="${POSTGRES_PASSWORD}"
  if pg_dump -h "${POSTGRES_HOST:-postgres}" -U "${POSTGRES_USER:-clariflow}" -d "${POSTGRES_DB:-clariflow}" --clean --if-exists | gzip > "${BACKUP_FILE}"; then
    if [ -s "${BACKUP_FILE}" ]; then
      FILE_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
      echo "[backup-cron] Backup completed successfully: ${BACKUP_FILE} (${FILE_SIZE})"
      
      # Prune backups older than RETENTION_DAYS
      if [ "${RETENTION_DAYS}" -gt 0 ]; then
        find "${BACKUP_DIR}" -name "clariflow_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete 2>/dev/null || true
        echo "[backup-cron] Retention check completed (older than ${RETENTION_DAYS} days pruned)."
      fi
    else
      echo "[backup-cron] ERROR: Backup file produced was empty!" >&2
      rm -f "${BACKUP_FILE}"
    fi
  else
    echo "[backup-cron] ERROR: pg_dump execution failed!" >&2
    rm -f "${BACKUP_FILE}"
  fi

  echo "[backup-cron] Sleeping for ${BACKUP_INTERVAL} seconds until next backup..."
  sleep "${BACKUP_INTERVAL}"
done
