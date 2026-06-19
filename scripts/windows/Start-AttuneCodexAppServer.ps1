param(
  [string]$Listen = "ws://127.0.0.1:4500",
  [string]$TokenFile = "$env:USERPROFILE\.codex\attune-app-server-token",
  [string]$LogDir = "$env:LOCALAPPDATA\Attune\CodexAppServer",
  [int]$RestartDelaySeconds = 5
)

$ErrorActionPreference = "Stop"

function New-CapabilityToken {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  throw "The 'codex' command was not found on PATH."
}

$tokenDir = Split-Path -Parent $TokenFile
New-Item -ItemType Directory -Force -Path $tokenDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path $TokenFile)) {
  New-CapabilityToken | Set-Content -NoNewline -Path $TokenFile
}

if ($Listen -notmatch "^ws://127\.0\.0\.1:") {
  throw "Refusing to start Codex app-server on non-loopback listen address: $Listen"
}

while ($true) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $logPath = Join-Path $LogDir "codex-app-server-$stamp.log"
  "Starting codex app-server at $(Get-Date -Format o) on $Listen" | Tee-Object -FilePath $logPath -Append

  & codex app-server `
    --listen $Listen `
    --ws-auth capability-token `
    --ws-token-file $TokenFile `
    *>> $logPath

  "codex app-server exited at $(Get-Date -Format o). Restarting in $RestartDelaySeconds seconds." | Tee-Object -FilePath $logPath -Append
  Start-Sleep -Seconds $RestartDelaySeconds
}
