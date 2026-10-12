# ClariFlow Database Rollback / Restore Script (PowerShell)
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$ContainerName = "clariflow-postgres-prod",
    [string]$PostgresUser = "clariflow",
    [string]$PostgresDb = "clariflow"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found: $BackupFile"
}

Write-Warning "Restoring will overwrite existing records in database '$PostgresDb'."
$Confirm = Read-Host "Are you sure you want to proceed? Type 'yes' to confirm"

if ($Confirm -ne "yes") {
    Write-Host "Rollback cancelled."
    exit 0
}

Write-Host "Restoring database from $BackupFile..."

Get-Content $BackupFile | docker exec -i $ContainerName psql -U $PostgresUser -d $PostgresDb

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database rollback completed successfully!" -ForegroundColor Green
} else {
    Write-Error "Database rollback encountered an error."
}
