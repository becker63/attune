{
  lib,
  pkgs,
  host,
  inventory,
  placement,
  ...
}:
let
  enabled = host.enrolled && (host.backupPath or null) != null;
  python = pkgs.python3.withPackages (p: [ p.boto3 ]);
in
lib.mkIf enabled {
  assertions = [
    {
      assertion = builtins.elem "ingestion" host.roles;
      message = "Backup source credentials are provisioned only to the ingestion role";
    }
  ];
  systemd.services.attune-backup = {
    description = "Verify and copy sealed evidence to an independent mounted archive";
    unitConfig.RequiresMountsFor = [
      "/data"
      host.backupPath
    ];
    after = [
      "network-online.target"
    ];
    path = [ pkgs.util-linux ];
    serviceConfig = {
      Type = "oneshot";
      ExecStart = "${python}/bin/python3 ${../ingest}/backup.py --source-endpoint http://${placement.ingestion.address}:3900 --source-credentials /run/secrets/archive-s3 --destination-local ${lib.escapeShellArg host.backupPath} --metrics /data/metrics/backup.prom";
      NoNewPrivileges = true;
      ProtectSystem = "strict";
      ProtectHome = true;
      ReadWritePaths = [
        host.backupPath
        "/data/metrics"
      ];
      TimeoutStartSec = "6h";
    };
  };
  systemd.timers.attune-backup = {
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnCalendar = "daily";
      Persistent = true;
      RandomizedDelaySec = "15min";
    };
  };
}
