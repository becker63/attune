{
  config,
  lib,
  pkgs,
  host,
  inventory,
  placement,
  ...
}:
let
  python = pkgs.python3.withPackages (p: [
    p.boto3
    p.pyarrow
  ]);
  enabled = host.enrolled && builtins.elem "ingestion" host.roles;
in
lib.mkIf enabled {
  environment.systemPackages = [
    (pkgs.writeShellApplication {
      name = "attune-garage-credentials";
      runtimeInputs = [
        pkgs.python3
        pkgs.garage_2
      ];
      text = ''exec python3 ${../tools/garage-credentials.py} "$@"'';
    })
  ];
  users.users.attune-ingest = {
    isSystemUser = true;
    group = "attune-ingest";
  };
  users.groups.attune-ingest = { };
  sops.secrets = {
    buildbuddy-api = lib.mkIf (host.buildbuddy or false) {
      sopsFile = host.secretsFile or (../secrets + "/${host.name}.yaml");
      owner = "attune-ingest";
    };
    archive-s3 = {
      sopsFile = host.secretsFile or (../secrets + "/${host.name}.yaml");
      owner = "attune-ingest";
    };
    archive-clickhouse = {
      sopsFile = host.secretsFile or (../secrets + "/${host.name}.yaml");
      owner = "attune-ingest";
    };
  };
  systemd.tmpfiles.rules = [
    "d /data/ingest 0700 attune-ingest attune-ingest -"
    "d /data/ingest/inbox 0700 attune-ingest attune-ingest -"
  ];
  systemd.services.attune-ingest = {
    description = "Archive completed immutable scientific evidence";
    unitConfig.RequiresMountsFor = [ "/data" ];
    after = [
      "network-online.target"
    ];
    wants = [ "network-online.target" ];
    serviceConfig = {
      Type = "oneshot";
      User = "attune-ingest";
      Group = "attune-ingest";
      ExecStart = "${python}/bin/python3 ${../ingest}/worker.py --inbox /data/ingest/inbox --state /data/ingest/checkpoints.sqlite --metrics /data/metrics/ingestion.prom --endpoint http://${placement.ingestion.address}:3900 --credentials /run/secrets/archive-s3 --clickhouse http://${placement.clickhouse.address}:8123 --clickhouse-credentials /run/secrets/archive-clickhouse --retain-completed-days 7";
      NoNewPrivileges = true;
      ProtectSystem = "strict";
      ProtectHome = true;
      PrivateTmp = true;
      ReadWritePaths = [
        "/data/ingest"
        "/data/metrics"
      ];
      TimeoutStartSec = "15min";
    };
  };
  systemd.timers.attune-ingest = {
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnBootSec = "2min";
      OnUnitInactiveSec = "1min";
    };
  };
  systemd.services.attune-buildbuddy = lib.mkIf (host.buildbuddy or false) {
    description = "Collect bounded BuildBuddy execution receipts";
    unitConfig.RequiresMountsFor = [ "/data" ];
    after = [
      "network-online.target"
    ];
    serviceConfig = {
      Type = "oneshot";
      User = "attune-ingest";
      Group = "attune-ingest";
      ExecStart = "${python}/bin/python3 ${../ingest}/receipts.py --credential /run/secrets/buildbuddy-api --inbox /data/ingest/inbox --metrics /data/metrics/buildbuddy.prom";
      NoNewPrivileges = true;
      ProtectSystem = "strict";
      ProtectHome = true;
      ReadWritePaths = [
        "/data/ingest/inbox"
        "/data/metrics"
      ];
      TimeoutStartSec = "15min";
    };
  };
  systemd.timers.attune-buildbuddy = lib.mkIf (host.buildbuddy or false) {
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnBootSec = "3min";
      OnUnitInactiveSec = "5min";
    };
  };

}
