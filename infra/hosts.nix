# Addresses are reserved defaults, not discovered LAN facts. Confirm before enrollment.
let
  observed =
    name:
    let
      path = ./identities + "/${name}.json";
    in
    if builtins.pathExists path then builtins.fromJSON (builtins.readFile path) else { };
  declared = {
    attune-a = {
      address = "10.77.0.11";
      roles = [
        "garage"
        "grafana"
      ];
      diskSerial = null;
      replaceSerial = null;
      machineId = null;
      enrolled = false;
      garageId = null;
      garageCapacity = null;
      backupPath = null;
    };
    attune-b = {
      address = "10.77.0.12";
      roles = [
        "garage"
        "clickhouse"
      ];
      diskSerial = null;
      replaceSerial = null;
      machineId = null;
      enrolled = false;
      garageId = null;
      garageCapacity = null;
      backupPath = null;
    };
    attune-c = {
      address = "10.77.0.13";
      roles = [
        "garage"
        "metrics"
        "ingestion"
      ];
      diskSerial = null;
      replaceSerial = null;
      machineId = null;
      enrolled = false;
      garageId = null;
      garageCapacity = null;
      backupPath = null;
    };
  };
in
builtins.mapAttrs (name: host: host // observed name) declared
