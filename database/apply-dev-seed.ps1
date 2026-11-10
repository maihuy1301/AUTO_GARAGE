param(
    [string]$Server = "localhost,1433",
    [string]$Database = "GarageManagementSystem",
    [string]$Username = "sa",
    [string]$Password = $env:SQLSERVER_PASSWORD
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Password)) {
    $Password = "YourPassword123"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$seedDir = Join-Path $scriptDir "seed"

if (-not (Test-Path -LiteralPath $seedDir)) {
    throw "Seed directory not found: $seedDir"
}

function Resolve-Sqlcmd {
    $command = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    $candidates = @(
        "C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\*\Tools\Binn\sqlcmd.exe",
        "C:\Program Files (x86)\Microsoft SQL Server\Client SDK\ODBC\*\Tools\Binn\sqlcmd.exe"
    )

    foreach ($pattern in $candidates) {
        $match = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending |
            Select-Object -First 1
        if ($match) {
            return $match.FullName
        }
    }

    throw "sqlcmd was not found. Install SQL Server command line tools, or run the seed from inside the SQL Server container."
}

$sqlcmd = Resolve-Sqlcmd

Write-Host "Checking database '$Database' on $Server..."
$dbCheck = & $sqlcmd -S $Server -U $Username -P $Password -C -h -1 -W -Q "SET NOCOUNT ON; IF DB_ID(N'$Database') IS NOT NULL SELECT 'EXISTS' ELSE SELECT 'NOT_EXISTS';"
if ($LASTEXITCODE -ne 0) {
    throw "Cannot connect to SQL Server at $Server."
}

if (($dbCheck -join "").Trim() -ne "EXISTS") {
    throw "Database '$Database' does not exist. Start the Docker SQL Server and let GarageManagementSystem.sql initialize it first."
}

$seedFiles = Get-ChildItem -Path $seedDir -Filter "*.sql" | Sort-Object Name
foreach ($seed in $seedFiles) {
    Write-Host "Applying seed: $($seed.Name)..."
    & $sqlcmd -S $Server -U $Username -P $Password -C -d $Database -b -i $seed.FullName
    if ($LASTEXITCODE -ne 0) {
        throw "Seed failed on $($seed.Name)."
    }
}

Write-Host "All seeds completed successfully."
