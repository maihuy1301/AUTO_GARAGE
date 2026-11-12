param(
    [string]$RepoName = "AUTO_GARAGE",
    [string]$GithubUser = "MinhQuann205",
    [string]$CommitMessage = "feat: integrate EfficientNet-B3 TFLite on-device model and tighten OCR validation"
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

$RemoteUrl = "https://github.com/$GithubUser/$RepoName.git"

Write-Host "1. Cau hinh remote origin -> $RemoteUrl" -ForegroundColor Cyan
git remote set-url origin $RemoteUrl

Write-Host "2. Them va commit cac thay doi..." -ForegroundColor Cyan
git add -A
$status = git status --porcelain
if ($status) {
    git commit -m $CommitMessage
} else {
    Write-Host "Khong co thay doi moi can commit." -ForegroundColor Yellow
}

$ghCmd = Get-Command gh -ErrorAction SilentlyContinue
if ($ghCmd) {
    Write-Host "3. Kiem tra / tao repository tren GitHub bang GitHub CLI (gh)..." -ForegroundColor Cyan
    & $ghCmd.Source repo view "$GithubUser/$RepoName" >$null 2>&1
    if ($LASTEXITCODE -ne 0) {
        & $ghCmd.Source repo create "$GithubUser/$RepoName" --public --source=. --remote=origin --push
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Da tao repo va push thanh cong len: https://github.com/$GithubUser/$RepoName" -ForegroundColor Green
            exit 0
        }
    }
}

Write-Host "3. Dang push code len $RemoteUrl ..." -ForegroundColor Cyan
git branch -M main
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Push thanh cong! Truy cap: https://github.com/$GithubUser/$RepoName" -ForegroundColor Green
} else {
    Write-Host "Neu chua tao repository '$RepoName' tren GitHub, hay truy cap https://github.com/new va tao repo ten '$RepoName' (khong tich README), sau do chay lai .\push-github.ps1" -ForegroundColor Yellow
}

