#!/usr/bin/env bash
# ClariFlow Database Rollback / Restore Script
set -euo pipefail

FORCE=0
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--force)
      FORCE=1
      shift
      ;;
    *)
      if [ -z "${BACKUP_FILE}" ]; then
        BACKUP_FILE="$1"
      fi
      shift
      ;;
  esac
done

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 [-f|--force] <path_to_backup_file.sql.gz | path_to_backup_file.sql>"
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

POSTGRES_USER="${POSTGRES_USER:-clariflow}"
POSTGRES_DB="${POSTGRES_DB:-clariflow}"
CONTAINER_NAME="${CONTAINER_NAME:-clariflow-postgres-prod}"

if [ "${FORCE}" -ne 1 ]; then
    echo "WARNING: Restoring will overwrite existing data in database '${POSTGRES_DB}'."
    read -p "Are you sure you want to proceed? (yes/no): " CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
        echo "Rollback cancelled."
        exit 0
    fi
fi

echo "Restoring database '${POSTGRES_DB}' from ${BACKUP_FILE}..."

if [[ "${BACKUP_FILE}" == *.gz ]]; then
    gzip -dc "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
else
    cat "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"
fi

echo "Database rollback into '${POSTGRES_DB}' completed successfully."

