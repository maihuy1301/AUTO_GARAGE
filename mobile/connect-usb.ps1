param(
    [string]$DeviceId,
    [ValidateRange(1, 65535)][int]$Port = 8080
)

$ErrorActionPreference = 'Stop'

try {
    $adbCommand = Get-Command adb -ErrorAction SilentlyContinue
    if ($adbCommand) {
        $adbExe = $adbCommand.Source
    } elseif (Test-Path "$env:LOCALAPPDATA\Android\sdk\platform-tools\adb.exe") {
        $adbExe = "$env:LOCALAPPDATA\Android\sdk\platform-tools\adb.exe"
    } else {
        throw 'Khong tim thay adb. Kiem tra Android SDK platform-tools.'
    }
    $deviceLines = & $adbExe devices
    if ($LASTEXITCODE -ne 0) { throw 'ADB khong liet ke duoc thiet bi.' }
    $ready = @($deviceLines | ForEach-Object {
        if ($_ -match '^(\S+)\s+device\s*$') { $Matches[1] }
    })
    if ($DeviceId) {
        if ($DeviceId -notin $ready) {
            throw 'Thiet bi chua san sang. Kiem tra cap USB va chap nhan USB debugging tren dien thoai.'
        }
    } else {
        $phones = @($ready | Where-Object { $_ -notlike 'emulator-*' })
        if ($phones.Count -eq 1) {
            $DeviceId = $phones[0]
        } elseif ($ready.Count -ge 1) {
            $DeviceId = $ready[0]
        } else {
            throw 'Khong tim thay thiet bi Android hoac may ao nao dang chay (adb devices).'
        }
    }

    # Public, read-only API: confirms both routing and backend response without credentials.
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/api/brands" -TimeoutSec 8
        $body = $response.Content | ConvertFrom-Json
        if ($response.StatusCode -ne 200 -or $body.success -ne $true) {
            throw 'API chua san sang.'
        }
    } catch {
        throw "Backend chua san sang tai cong $Port. Khoi dong backend va kiem tra database, sau do chay lai."
    }

    & $adbExe -s $DeviceId reverse "tcp:$Port" "tcp:$Port" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Khong tao duoc duong ket noi USB.' }
    $mappings = & $adbExe -s $DeviceId reverse --list
    if ($LASTEXITCODE -ne 0 -or ($mappings -join "`n") -notmatch "\btcp:$Port\s+tcp:$Port\b") {
        throw 'ADB chua xac nhan chuyen tiep cong. Thu cam lai cap USB.'
    }
    Write-Host "OK: backend san sang, USB da chuyen tiep cong $Port."
    Write-Host 'Quay lai app va bam Thu lai. Neu doi API_BASE_URL, hay dung va chay lai app.'
} catch {
    Write-Error $_ -ErrorAction Continue
    exit 1
}
