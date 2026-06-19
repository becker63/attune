param(
  [string]$TaskName = "Attune Codex App Server",
  [string]$ScriptPath = "",
  [string]$Listen = "ws://127.0.0.1:4500"
)

$ErrorActionPreference = "Stop"

if ($ScriptPath -eq "") {
  $ScriptPath = Join-Path $PSScriptRoot "Start-AttuneCodexAppServer.ps1"
}

if (-not (Test-Path $ScriptPath)) {
  throw "Startup script not found: $ScriptPath"
}

if ($Listen -notmatch "^ws://127\.0\.0\.1:") {
  throw "Refusing to install a startup task for a non-loopback listen address: $Listen"
}

$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$argument = "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -Listen `"$Listen`""

$action = New-ScheduledTaskAction -Execute $powershell -Argument $argument
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DisallowStartIfOnBatteries:$false `
  -ExecutionTimeLimit (New-TimeSpan -Days 7) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Starts Codex app-server on loopback for future Attune local orchestration." `
  -Force | Out-Null

Write-Host "Registered scheduled task '$TaskName'."
Write-Host "Listen address: $Listen"
Write-Host "Script: $ScriptPath"
