$ErrorActionPreference = 'Stop'
$repo = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$source = Join-Path (Split-Path $repo -Parent) 'car_recognition_ai\models\v5.13.0\car_classifier.tflite'
$target = Join-Path $repo 'mobile\asset\autovision\car_classifier.tflite'
$expected = 'DC194F500890F7AAA96F80222FED246784CFFED052E3DC173F6BFC4AC0EDB825'
if (-not (Test-Path -LiteralPath $source)) { throw "AutoVision model not found: $source" }
$actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash
if ($actual -ne $expected) { throw "AutoVision source SHA-256 mismatch: $actual" }
Copy-Item -LiteralPath $source -Destination $target
$staged = (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash
if ($staged -ne $expected) { throw "Staged model SHA-256 mismatch: $staged" }
Write-Output "AutoVision v5.13.0 staged: $target"
