# ClariFlow Automated Database Backup Script (PowerShell)
param(
    [string]$BackupDir = "./backups",
    [string]$ContainerName = "clariflow-postgres-prod",
    [string]$PostgresUser = "clariflow",
    [string]$PostgresDb = "clariflow",
    [int]$RetentionDays = 14,
    [switch]$Compress = $true,
    [switch]$NoPrune = $false
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "Starting ClariFlow database backup ($PostgresDb) from container $ContainerName..."

$RawSqlFile = [System.IO.Path]::GetTempFileName()

try {
    # Run pg_dump inside container with --clean --if-exists for idempotent restoration
    docker exec $ContainerName pg_dump -U $PostgresUser -d $PostgresDb --clean --if-exists | Out-File -FilePath $RawSqlFile -Encoding utf8

    if ($LASTEXITCODE -ne 0) {
        throw "docker exec pg_dump exited with error code $LASTEXITCODE"
    }

    $RawItem = Get-Item $RawSqlFile
    if ($RawItem.Length -eq 0) {
        throw "pg_dump produced an empty backup file."
    }

    if ($Compress) {
        $BackupFile = Join-Path $BackupDir "clariflow_backup_${Timestamp}.sql.gz"
        $inStream = [System.IO.File]::OpenRead($RawSqlFile)
        $outStream = [System.IO.File]::Create($BackupFile)
        $gzStream = New-Object System.IO.Compression.GZipStream($outStream, [System.IO.Compression.CompressionMode]::Compress)
        $inStream.CopyTo($gzStream)
        $gzStream.Close()
        $outStream.Close()
        $inStream.Close()
    } else {
        $BackupFile = Join-Path $BackupDir "clariflow_backup_${Timestamp}.sql"
        Copy-Item -Path $RawSqlFile -Destination $BackupFile -Force
    }

    if (-not (Test-Path $BackupFile)) {
        throw "Target backup file was not created: $BackupFile"
    }

    $Size = (Get-Item $BackupFile).Length / 1KB
    Write-Host "Backup completed successfully ($([math]::Round($Size, 2)) KB): $BackupFile" -ForegroundColor Green
} finally {
    if (Test-Path $RawSqlFile) {
        Remove-Item -Force $RawSqlFile -ErrorAction SilentlyContinue
    }
}

# Retention policy: remove backups older than $RetentionDays
if (-not $NoPrune -and $RetentionDays -gt 0) {
    $Cutoff = (Get-Date).AddDays(-$RetentionDays)
    $OldBackups = Get-ChildItem -Path $BackupDir -File | Where-Object {
        ($_.Name -like "clariflow_backup_*.sql" -or $_.Name -like "clariflow_backup_*.sql.gz") -and $_.LastWriteTime -lt $Cutoff
    }
    $PrunedCount = 0
    foreach ($old in $OldBackups) {
        Write-Host "Pruning old backup: $($old.Name) (modified: $($old.LastWriteTime), older than $RetentionDays days)" -ForegroundColor Yellow
        Remove-Item -Path $old.FullName -Force
        $PrunedCount++
    }
    if ($PrunedCount -gt 0) {
        Write-Host "Pruned $PrunedCount old backup(s) (retention: $RetentionDays days)." -ForegroundColor Gray
    } else {
        Write-Host "Retention check: no backups older than $RetentionDays days found." -ForegroundColor Gray
    }
}

# Return the created backup file path
$BackupFile

