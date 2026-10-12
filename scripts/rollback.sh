#!/usr/bin/env bash
# ClariFlow Database Rollback / Restore Script
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz | path_to_backup_file.sql>"
    exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

POSTGRES_USER="${POSTGRES_USER:-clariflow}"
POSTGRES_DB="${POSTGRES_DB:-clariflow}"
CONTAINER_NAME="${CONTAINER_NAME:-clariflow-postgres-prod}"

echo "WARNING: Restoring will overwrite existing data in database '${POSTGRES_DB}'."
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

echo "Restoring database from ${BACKUP_FILE}..."

if [[ "${BACKUP_FILE}" == *.gz ]]; then
    gzip -dc "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
else
    cat "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
fi

echo "Database rollback completed successfully."
