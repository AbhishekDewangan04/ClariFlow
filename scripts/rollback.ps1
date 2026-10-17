# ClariFlow Database Rollback / Restore Script (PowerShell)
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$ContainerName = "clariflow-postgres-prod",
    [string]$PostgresUser = "clariflow",
    [string]$PostgresDb = "clariflow",
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found: $BackupFile"
}

if (-not $Force) {
    Write-Warning "Restoring will overwrite existing records in database '$PostgresDb'."
    $Confirm = Read-Host "Are you sure you want to proceed? Type 'yes' to confirm"

    if ($Confirm -ne "yes") {
        Write-Host "Rollback cancelled."
        exit 0
    }
}

Write-Host "Restoring database '$PostgresDb' from $BackupFile..."

$ResolvedPath = (Resolve-Path $BackupFile).Path

if ($ResolvedPath.EndsWith(".gz", [System.StringComparison]::OrdinalIgnoreCase)) {
    $TempSql = [System.IO.Path]::GetTempFileName()
    try {
        $inStream = [System.IO.File]::OpenRead($ResolvedPath)
        $gzStream = New-Object System.IO.Compression.GZipStream($inStream, [System.IO.Compression.CompressionMode]::Decompress)
        $outStream = [System.IO.File]::Create($TempSql)
        $gzStream.CopyTo($outStream)
        $outStream.Close()
        $gzStream.Close()
        $inStream.Close()

        Get-Content $TempSql | docker exec -i $ContainerName psql -U $PostgresUser -d $PostgresDb
    } finally {
        if (Test-Path $TempSql) {
            Remove-Item -Force $TempSql -ErrorAction SilentlyContinue
        }
    }
} else {
    Get-Content $ResolvedPath | docker exec -i $ContainerName psql -U $PostgresUser -d $PostgresDb
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database restore into '$PostgresDb' completed successfully!" -ForegroundColor Green
} else {
    Write-Error "Database rollback encountered an error (exit code: $LASTEXITCODE)."
}

