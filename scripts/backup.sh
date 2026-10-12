#!/usr/bin/env bash
# ClariFlow Automated Database Backup Script
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/clariflow_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Starting ClariFlow database backup..."

# Extract PostgreSQL credentials or use defaults
POSTGRES_USER="${POSTGRES_USER:-clariflow}"
POSTGRES_DB="${POSTGRES_DB:-clariflow}"
CONTAINER_NAME="${CONTAINER_NAME:-clariflow-postgres-prod}"

# Run pg_dump inside container and compress output (no -t flag to avoid TTY carriage returns)
docker exec "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists | gzip > "${BACKUP_FILE}"

echo "Backup completed successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Retention policy: remove backups older than 14 days
find "${BACKUP_DIR}" -name "clariflow_backup_*.sql.gz" -mtime +14 -delete
echo "Old backups pruned (retention: 14 days)."
