# Script kiem tra mo hinh nhan dien xe EfficientNet-B3 trong asset
$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$target = Join-Path $repo 'mobile\asset\autovision\car_classifier.tflite'

if (-not (Test-Path -LiteralPath $target)) {
    throw "Khong tim thay file mo hinh: $target. Hay deploy lai tu AI_CAR/deploy_assets_to_mobile.py."
}

$fileInfo = Get-Item -LiteralPath $target
$sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
Write-Output "Mo hinh EfficientNet-B3 (On-Device TFLite) da san sang: $target ($sizeMB MB)"
