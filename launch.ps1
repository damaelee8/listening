$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeRoot = 'C:\Users\MECHREVO\.cache\codex-runtimes\codex-primary-runtime\dependencies'
$nodePath = Join-Path $runtimeRoot 'node\bin'
$pnpmPath = Join-Path $runtimeRoot 'bin\fallback\pnpm.cmd'
$venvPython = Join-Path $projectRoot '.venv\Scripts\python.exe'
$transcriberRoot = Join-Path $projectRoot 'transcriber'
$appUrl = 'http://localhost:3000/'
$healthUrl = 'http://127.0.0.1:8765/health'

function Test-ListeningService([string]$url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 1
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  }
  catch {
    return $false
  }
}

function Show-LaunchError([string]$message) {
  $popup = New-Object -ComObject WScript.Shell
  $null = $popup.Popup($message, 0, '听见 · 启动失败', 16)
}

try {
  if (-not (Test-Path $venvPython) -or -not (Test-Path (Join-Path $projectRoot 'node_modules'))) {
    throw '运行环境尚未安装。请先在项目文件夹运行 .\start.ps1 -Install。'
  }

  if (-not (Test-ListeningService $healthUrl)) {
    Start-Process -FilePath $venvPython `
      -ArgumentList '-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8765' `
      -WorkingDirectory $transcriberRoot `
      -WindowStyle Hidden
  }

  if (-not (Test-ListeningService $appUrl)) {
    $env:Path = "$nodePath;$env:Path"
    Start-Process -FilePath $pnpmPath `
      -ArgumentList 'run', 'dev' `
      -WorkingDirectory $projectRoot `
      -WindowStyle Hidden
  }

  $ready = $false
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    if ((Test-ListeningService $healthUrl) -and (Test-ListeningService $appUrl)) {
      $ready = $true
      break
    }
    Start-Sleep -Milliseconds 500
  }

  if (-not $ready) {
    throw '应用启动超时，请稍后重试。'
  }

  $edgeCandidates = @(
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
  )
  $edgePath = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

  if ($edgePath) {
    Start-Process -FilePath $edgePath -ArgumentList "--app=$appUrl", '--start-maximized'
  }
  else {
    Start-Process $appUrl
  }
}
catch {
  Show-LaunchError $_.Exception.Message
  exit 1
}
