$ErrorActionPreference = "Stop"
$pgDir = "$PSScriptRoot\.postgres"
$zipPath = "$PSScriptRoot\postgres.zip"
$dataDir = "$pgDir\data"

if (!(Test-Path $pgDir)) {
    Write-Host "Downloading PostgreSQL Portable..."
    Invoke-WebRequest -Uri "https://get.enterprisedb.com/postgresql/postgresql-16.3-1-windows-x64-binaries.zip" -OutFile $zipPath
    Write-Host "Extracting..."
    Expand-Archive -Path $zipPath -DestinationPath $pgDir -Force
    Remove-Item $zipPath
}

$binDir = "$pgDir\pgsql\bin"
Write-Host "Initializing Database..."
& "$binDir\initdb.exe" -D $dataDir -U postgres -A trust --encoding=UTF8

Write-Host "Starting Database Server..."
Start-Process -FilePath "$binDir\pg_ctl.exe" -ArgumentList "-D", $dataDir, "-l", "$pgDir\logfile.log", "start" -NoNewWindow
Start-Sleep -Seconds 3

Write-Host "Creating 'wellnex' database..."
& "$binDir\createdb.exe" -U postgres wellnex

Write-Host "Done!"
