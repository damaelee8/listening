$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherPath = Join-Path $projectRoot 'launch.ps1'
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath '听见 · TOEFL 精听.lnk'
$powershellPath = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powershellPath
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherPath`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = '启动听见 TOEFL 精听应用'
$shortcut.WindowStyle = 7
$shortcut.IconLocation = if (Test-Path $edgePath) { "$edgePath,0" } else { "$powershellPath,0" }
$shortcut.Save()

Write-Output $shortcutPath
