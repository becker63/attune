{
  self,
  inputs,
  system,
  pkgs,
  hosts,
  installers,
}:
let
  lib = inputs.nixpkgs.lib;
  python = pkgs.python3.withPackages (p: [
    p.pyarrow
    p.ijson
    p.boto3
  ]);
  source = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../installer
      ../modules
      ../dashboards
      ../ingest
      ../tools
      ../tests
      ../keys
      ../identities
      ../secrets
      ../flake.nix
      ../flake.lock
      ../hosts.nix
      ../disk.nix
      ../installer.nix
    ];
  };
  contracts = import ../dashboards/contracts.nix { inherit lib; };
  dashboardNegativeChecks = import ./dashboard-contracts.nix { inherit lib; };
  promRules = (import ../dashboards/alerts.nix) // {
    groups = (import ../dashboards/alerts.nix).groups ++ [
      {
        name = "dashboard-contracts";
        rules = lib.mapAttrsToList (name: m: {
          record = "attune_validation_${name}";
          expr = m.prom;
        }) (lib.filterAttrs (_: m: m ? prom) contracts.metrics);
      }
    ];
  };
  querySql = pkgs.writeText "attune-dashboard-queries.sql" (
    lib.concatStringsSep ";\n" (
      map (m: m.sql) (builtins.attrValues (lib.filterAttrs (_: m: m ? sql) contracts.metrics))
    )
    + ";"
  );
  inventory = import ../hosts.nix;
  uniqueField =
    field:
    let
      values = lib.filter (x: x != null) (map (h: h.${field} or null) (builtins.attrValues inventory));
    in
    lib.length values == lib.length (lib.unique values);
  inventoryValid =
    builtins.attrNames inventory == [
      "attune-a"
      "attune-b"
      "attune-c"
    ]
    && lib.all (
      h:
      builtins.elem "garage" h.roles
      && lib.length h.roles == lib.length (lib.unique h.roles)
      && lib.all (
        r:
        builtins.elem r [
          "garage"
          "grafana"
          "clickhouse"
          "metrics"
          "ingestion"
        ]
      ) h.roles
    ) (builtins.attrValues inventory)
    && lib.all uniqueField [
      "address"
      "machineId"
      "garageId"
      "ageRecipient"
      "sshHostKey"
    ];
  invariants = lib.all (
    h:
    h.config.networking.hostName != ""
    && h.config.fileSystems."/data".neededForBoot
    && !h.config.services.openssh.settings.PasswordAuthentication
    && h.config.services.comin.sshAllowedSignersPath != null
    && h.config.services.comin.deployConfirmer.mode == "manual"
    && h.config.disko.devices.disk.system.content.partitions.ESP.size == "1G"
    && builtins.all (a: a.assertion) h.config.assertions
  ) (builtins.attrValues hosts);
  enrolled = lib.mapAttrs (
    name: h:
    h.extendModules {
      specialArgs.host = (import ../hosts.nix).${name} // {
        inherit name;
        enrolled = true;
        machineId = "0123456789abcdef0123456789abcdef";
        secretsFile = ./fixtures/evaluation-secrets.yaml;
      };
    }
  ) hosts;
  enrolledValid =
    lib.all (
      h: builtins.all (a: a.assertion) h.config.assertions && h.config.system.build.toplevel.drvPath != ""
    ) (builtins.attrValues enrolled)
    && !(lib.hasInfix "garage node id" enrolled.attune-c.config.systemd.services.victoriametrics.preStart);

  colocated = hosts.attune-a.extendModules {
    specialArgs.host = inventory.attune-a // {
      name = "attune-a";
      enrolled = true;
      machineId = "0123456789abcdef0123456789abcdef";
      secretsFile = ./fixtures/evaluation-secrets.yaml;
      roles = [
        "garage"
        "grafana"
        "clickhouse"
        "metrics"
        "ingestion"
      ];
    };
  };
  credentialOwnersValid =
    colocated.config.sops.secrets.metrics-password.owner == "root"
    && colocated.config.sops.secrets.metrics-grafana.owner == "grafana"
    && colocated.config.sops.secrets.metrics-victoriametrics.owner == "victoriametrics";
  installerValid = lib.all (
    i:
    builtins.all (a: a.assertion) i.config.assertions
    && i.config.systemd.services.attune-install.wantedBy == [ "multi-user.target" ]
  ) (builtins.attrValues installers);
  checkPython =
    name:
    pkgs.runCommand "attune-${name}"
      {
        nativeBuildInputs = [
          python
          pkgs.openssh
        ];
      }
      ''
        cp -r ${source} source
        chmod -R u+w source
        python -m unittest discover -s source/tests -p 'test_${name}.py' -v
        touch $out
      '';
in
{
  evaluation =
    assert lib.assertMsg credentialOwnersValid "colocated roles must retain isolated credential access";
    assert lib.assertMsg inventoryValid "duplicate inventory identity or address";
    assert lib.assertMsg invariants "host invariants failed";
    assert lib.assertMsg installerValid "installer invariants failed";
    assert lib.assertMsg enrolledValid "enrolled service invariants failed";
    assert lib.assertMsg dashboardNegativeChecks "dashboard negative cases failed";
    pkgs.runCommand "attune-evaluation" { } "touch $out";
  installer-guard = checkPython "guard";
  science = checkPython "science";
  worker = checkPython "worker";
  receipts = checkPython "receipts";
  export = checkPython "export";
  dashboards = pkgs.runCommand "attune-dashboards" { nativeBuildInputs = [ pkgs.jq ]; } ''
    for f in ${import ../dashboards { inherit pkgs lib; }}/*.json; do
      jq -e '.schemaVersion == 39 and (.uid|length > 0) and (.panels|length > 0)' "$f"
    done
    touch $out
  '';
  queries =
    pkgs.runCommand "attune-queries"
      {
        nativeBuildInputs = [
          pkgs.prometheus.cli
          pkgs.clickhouse
        ];
      }
      ''
        promtool check rules ${pkgs.writeText "attune-rules.json" (builtins.toJSON promRules)}
        mkdir -p ch
        cat ${../ingest/schema.sql} ${querySql} > all.sql
        clickhouse local --path ch --multiquery --query "$(cat all.sql)"
        touch $out
      '';
  secrets =
    pkgs.runCommand "attune-secret-audit"
      {
        nativeBuildInputs = [
          pkgs.python3
          pkgs.age
          pkgs.sops
          pkgs.jq
        ];
      }
      ''
        python3 ${../tools/secret_scan.py} ${source}
        umask 077
        age-keygen -o host-one 2>/dev/null
        age-keygen -o host-two 2>/dev/null
        recipient=$(age-keygen -y host-one)
        printf '{"fixture":"disposable"}' | sops --encrypt --age "$recipient" --input-type json --output-type json /dev/stdin > encrypted.json
        SOPS_AGE_KEY_FILE=$PWD/host-one sops --decrypt encrypted.json | jq -e '.fixture == "disposable"'
        if SOPS_AGE_KEY_FILE=$PWD/host-two sops --decrypt encrypted.json > /dev/null 2>&1; then
          echo 'Unrelated identity decrypted a host-specific secret' >&2
          exit 1
        fi
        touch $out
      '';
  gitops = import ./comin.nix { inherit pkgs inputs; };
  git-signatures = import ./gitops.nix { inherit pkgs; };
  emulation = pkgs.runCommand "attune-x86-execution-probe" { } ''
    ${inputs.nixpkgs.legacyPackages.x86_64-linux.hello}/bin/hello > $out
  '';
  services = import ./services.nix { inherit pkgs; };
  garage = import ./garage.nix { inherit pkgs; };
  science-integration = import ./science-integration.nix { inherit pkgs; };
  installer = import ./installer.nix {
    inherit
      pkgs
      inputs
      self
      system
      ;
  };
  persistence = import ./persistence.nix { inherit pkgs inputs; };
}
