{ pkgs }:

let
  desktopGuardConfig = pkgs.writeText "attune-desktop-guard.json" (
    builtins.toJSON {
      schemaVersion = 1;
      taskName = "AttuneDesktopGuard";
      workerPool = {
        namespace = "attune-runs";
        name = "desktop-gpu";
      };
      policy = {
        idleWindowSeconds = 900;
        gameProcesses = [
          "steam"
          "steamwebhelper"
          "EpicGamesLauncher"
          "FortniteClient-Win64-Shipping"
          "RiotClientServices"
          "LeagueClient"
          "Battle.net"
          "Discord"
        ];
      };
      resourceProfiles = {
        interactive = {
          maxWorkers = 1;
          cpuPercent = 35;
          memoryMb = 8192;
          gpuPercent = 0;
        };
        "vacation-capacity" = {
          maxWorkers = 4;
          cpuPercent = 85;
          memoryMb = 24576;
          gpuPercent = 80;
        };
      };
      commands = {
        guard = [
          "pwsh"
          "-NoProfile"
          "-ExecutionPolicy"
          "Bypass"
          "-File"
          "{installRoot}\\windows\\Start-AttuneDesktopGuard.ps1"
          "-ConfigPath"
          "{configPath}"
        ];
        worker = [
          "pwsh"
          "-NoProfile"
          "-Command"
          "Write-Output 'TODO: start Attune worker for {workerPool.namespace}/{workerPool.name} with {profileName}'"
        ];
        onInteractive = [
          "pwsh"
          "-NoProfile"
          "-Command"
          "Write-Output 'TODO: switch worker pool to interactive profile'"
        ];
        onVacationCapacity = [
          "pwsh"
          "-NoProfile"
          "-Command"
          "Write-Output 'TODO: switch worker pool to vacation-capacity profile'"
        ];
      };
    }
  );

  startScript = pkgs.writeText "Start-AttuneDesktopGuard.ps1" ''
    [CmdletBinding()]
    param(
      [string]$ConfigPath = "$PSScriptRoot\..\config\attune-desktop-guard.json",
      [ValidateSet("interactive", "vacation-capacity")]
      [string]$ProfileName = "interactive",
      [switch]$DryRun
    )

    $ErrorActionPreference = "Stop"
    $resolvedConfigPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($ConfigPath)
    if (-not (Test-Path -LiteralPath $resolvedConfigPath)) {
      throw "Attune desktop guard config not found: $resolvedConfigPath"
    }

    $config = Get-Content -LiteralPath $resolvedConfigPath -Raw | ConvertFrom-Json
    $profile = $config.resourceProfiles.$ProfileName
    if ($null -eq $profile) {
      throw "Resource profile '$ProfileName' is not defined in $resolvedConfigPath"
    }

    $runningGameProcesses = @()
    foreach ($processName in $config.policy.gameProcesses) {
      $process = Get-Process -Name $processName -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($null -ne $process) {
        $runningGameProcesses += $processName
      }
    }

    $workerCommand = @()
    foreach ($part in $config.commands.worker) {
      $renderedPart = $part.Replace("{workerPool.namespace}", $config.workerPool.namespace)
      $renderedPart = $renderedPart.Replace("{workerPool.name}", $config.workerPool.name)
      $renderedPart = $renderedPart.Replace("{profileName}", $ProfileName)
      $workerCommand += $renderedPart
    }

    $summary = [ordered]@{
      configPath = $resolvedConfigPath
      workerPool = "$($config.workerPool.namespace)/$($config.workerPool.name)"
      profileName = $ProfileName
      idleWindowSeconds = $config.policy.idleWindowSeconds
      gameProcessesConfigured = $config.policy.gameProcesses
      runningGameProcesses = $runningGameProcesses
      resourceProfile = $profile
      workerCommand = $workerCommand
    }

    $summary | ConvertTo-Json -Depth 8

    if ($DryRun -or $workerCommand.Count -eq 0) {
      return
    }

    $executable = $workerCommand[0]
    $arguments = @()
    if ($workerCommand.Count -gt 1) {
      $arguments = $workerCommand[1..($workerCommand.Count - 1)]
    }

    & $executable @arguments
  '';

  installScript = pkgs.writeText "Install-AttuneDesktopGuardTask.ps1" ''
    [CmdletBinding()]
    param(
      [string]$InstallRoot = "$env:LOCALAPPDATA\Attune\DesktopGuard",
      [string]$TaskName = "AttuneDesktopGuard",
      [switch]$Force
    )

    $ErrorActionPreference = "Stop"
    $sourceRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
    $installRootPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallRoot)

    if ((Test-Path -LiteralPath $installRootPath) -and -not $Force) {
      throw "Install root already exists: $installRootPath. Re-run with -Force to replace it."
    }

    New-Item -ItemType Directory -Path $installRootPath -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $sourceRoot "*") -Destination $installRootPath -Recurse -Force

    $launcherPath = Join-Path $installRootPath "windows\Start-AttuneDesktopGuard.ps1"
    $configPath = Join-Path $installRootPath "config\attune-desktop-guard.json"
    $argument = "-NoProfile -ExecutionPolicy Bypass -File `"$launcherPath`" -ConfigPath `"$configPath`""
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argument
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel LeastPrivilege
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -StartWhenAvailable

    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Attune desktop guard worker launcher" -Force | Out-Null

    [ordered]@{
      taskName = $TaskName
      installRoot = $installRootPath
      launcherPath = $launcherPath
      configPath = $configPath
    } | ConvertTo-Json -Depth 4
  '';

  uninstallScript = pkgs.writeText "Uninstall-AttuneDesktopGuardTask.ps1" ''
    [CmdletBinding()]
    param(
      [string]$InstallRoot = "$env:LOCALAPPDATA\Attune\DesktopGuard",
      [string]$TaskName = "AttuneDesktopGuard",
      [switch]$RemoveFiles
    )

    $ErrorActionPreference = "Stop"

    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($null -ne $task) {
      Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }

    $installRootPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($InstallRoot)
    if ($RemoveFiles -and (Test-Path -LiteralPath $installRootPath)) {
      Remove-Item -LiteralPath $installRootPath -Recurse -Force
    }

    [ordered]@{
      taskName = $TaskName
      removedTask = $null -ne $task
      removedFiles = [bool]($RemoveFiles -and -not (Test-Path -LiteralPath $installRootPath))
      installRoot = $installRootPath
    } | ConvertTo-Json -Depth 4
  '';

  guardLauncher = pkgs.writeShellApplication {
    name = "attune-desktop-guard";
    runtimeInputs = [ pkgs.jq ];
    text = ''
      set -euo pipefail

      config_path="''${ATTUNE_DESKTOP_GUARD_CONFIG:-${desktopGuardConfig}}"
      profile_name="''${ATTUNE_DESKTOP_GUARD_PROFILE:-interactive}"

      jq --arg profileName "$profile_name" '{
        configPath: input_filename,
        workerPool: (.workerPool.namespace + "/" + .workerPool.name),
        profileName: $profileName,
        idleWindowSeconds: .policy.idleWindowSeconds,
        gameProcesses: .policy.gameProcesses,
        resourceProfile: .resourceProfiles[$profileName],
        workerCommand: .commands.worker
      }' "$config_path"
    '';
  };
in
pkgs.stdenvNoCC.mkDerivation {
  pname = "attune-windows-desktop-guard";
  version = "0.1.0";

  dontUnpack = true;

  installPhase = ''
    runHook preInstall

    mkdir -p "$out/bin" "$out/config" "$out/windows" "$out/share/attune-desktop-guard"
    cp ${desktopGuardConfig} "$out/config/attune-desktop-guard.json"
    cp ${startScript} "$out/windows/Start-AttuneDesktopGuard.ps1"
    cp ${installScript} "$out/windows/Install-AttuneDesktopGuardTask.ps1"
    cp ${uninstallScript} "$out/windows/Uninstall-AttuneDesktopGuardTask.ps1"
    cp ${guardLauncher}/bin/attune-desktop-guard "$out/bin/attune-desktop-guard"
    ln -s "$out/config" "$out/share/attune-desktop-guard/config"
    ln -s "$out/windows" "$out/share/attune-desktop-guard/windows"

    runHook postInstall
  '';

  meta = {
    description = "Nix-built Attune Windows desktop guard Scheduled Task artifact";
    mainProgram = "attune-desktop-guard";
  };
}
