$pidPath = Join-Path $PSScriptRoot 'local-ai-server.pid'
if (-not (Test-Path -LiteralPath $pidPath)) { Write-Host 'No saved local AI server process ID.'; exit 0 }
$serverProcessId = [int](Get-Content -LiteralPath $pidPath -Raw)
Stop-Process -Id $serverProcessId -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
Write-Host 'Stopped the local Qwen server.'
