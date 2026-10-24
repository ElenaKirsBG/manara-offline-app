$packageRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Microsoft\WinGet\Packages\ggml.llamacpp*'
$server = Get-ChildItem -Path $packageRoot -Filter 'llama-server.exe' -Recurse -ErrorAction Stop | Select-Object -First 1
if (-not $server) { throw 'llama-server.exe was not found. Install llama.cpp first.' }
$listener = Get-NetTCPConnection -LocalPort 9931 -State Listen -ErrorAction SilentlyContinue
if ($listener) { Write-Host 'Local AI server already listens on port 9931.'; exit 0 }
$process = Start-Process -FilePath $server.FullName -ArgumentList @('-m','C:\Qwen\qwen3.5-4b-Q4_K_M.gguf','--alias','Qwen3.5-4B','--ctx-size','8192','--gpu-layers','0','--host','127.0.0.1','--port','9931','--path',$PSScriptRoot,'--cors-origins','http://127.0.0.1:9931','--no-cors-credentials') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $PSScriptRoot 'local-ai-server.log') -RedirectStandardError (Join-Path $PSScriptRoot 'local-ai-server-error.log')
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'local-ai-server.pid') -Value $process.Id
Write-Host ('Started local Qwen server, PID ' + $process.Id + '. Qwen3.5-4B is already installed locally.')



