# ClariFlow Automated Database Backup Script (PowerShell)
param(
    [string]$BackupDir = "./backups",
    [string]$ContainerName = "clariflow-postgres-prod",
    [string]$PostgresUser = "clariflow",
    [string]$PostgresDb = "clariflow"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "clariflow_backup_${Timestamp}.sql"

Write-Host "Starting ClariFlow database backup to $BackupFile..."

docker exec $ContainerName pg_dump -U $PostgresUser -d $PostgresDb --clean --if-exists | Out-File -FilePath $BackupFile -Encoding utf8

if ($LASTEXITCODE -eq 0 -and (Test-Path $BackupFile)) {
    $Size = (Get-Item $BackupFile).Length / 1KB
    Write-Host "Backup completed successfully ($([math]::Round($Size, 2)) KB): $BackupFile" -ForegroundColor Green
} else {
    Write-Error "Backup failed!"
}
