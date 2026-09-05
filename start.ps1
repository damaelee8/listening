param(
  [switch]$Install
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeRoot = 'C:\Users\MECHREVO\.cache\codex-runtimes\codex-primary-runtime\dependencies'
$nodePath = Join-Path $runtimeRoot 'node\bin'
$pnpmPath = Join-Path $runtimeRoot 'bin\fallback\pnpm.cmd'
$bundledPython = Join-Path $runtimeRoot 'python\python.exe'
$venvPython = Join-Path $projectRoot '.venv\Scripts\python.exe'

$env:Path = "$nodePath;$env:Path"

if ($Install) {
  if (-not (Test-Path $venvPython)) {
    & $bundledPython -m venv (Join-Path $projectRoot '.venv')
  }
  & $pnpmPath install
  & $venvPython -m pip install -r (Join-Path $projectRoot 'transcriber\requirements.txt')
}

if (-not (Test-Path $venvPython)) {
  throw 'Python dependencies are missing. Run .\start.ps1 -Install first.'
}

Start-Process -FilePath $venvPython -ArgumentList '-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8765' -WorkingDirectory (Join-Path $projectRoot 'transcriber') -WindowStyle Hidden
& $pnpmPath run dev
