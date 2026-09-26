$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

if (Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue) {
  Write-Host 'API already running on http://localhost:4000; skipping API launch.'
} else {
  Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location -LiteralPath '$repoRoot'; npm run dev:api"
  )
}

Start-Process powershell.exe -ArgumentList @(
  '-NoExit',
  '-Command',
  "Set-Location -LiteralPath '$repoRoot'; npm run dev:web"
)

Write-Host 'API and web development servers started in separate PowerShell windows.'
Write-Host 'Web app: http://localhost:3000'
Write-Host 'API:     http://localhost:4000'
