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
  has = role: builtins.elem role host.roles;
  enabled = role: host.enrolled && has role;
  secret = name: "/run/secrets/${name}";
  sopsFile = host.secretsFile or (../secrets + "/${host.name}.yaml");
  required = [
    "garage-rpc"
  ]
  ++ lib.optionals (has "grafana") [
    "grafana-admin"
    "grafana-key"
    "grafana-clickhouse"
    "metrics-password"
  ]
  ++ lib.optionals (has "clickhouse") [ "clickhouse-users" ]
  ++ lib.optionals (has "metrics") [ "metrics-password" ];
  owner =
    name:
    if name == "garage-rpc" then
      "garage"
    else if name == "clickhouse-users" then
      "clickhouse"
    else if name == "metrics-password" then
      "root"
    else if has "grafana" then
      "grafana"
    else
      "victoriametrics";
  restartReaders =
    name:
    if name == "garage-rpc" then
      [ "garage.service" ]
    else if name == "clickhouse-users" then
      [ "clickhouse.service" ]
    else if name == "metrics-password" then
      lib.optional (has "metrics") "vmalert-attune.service"
    else
      [ "grafana.service" ];
  peers = builtins.filter (h: h.garageId != null) (builtins.attrValues inventory);
  dataUnit = {
    unitConfig.RequiresMountsFor = [
      "/data"
      "/persist"
    ];
    # SOPS secrets are installed by activation before ordinary units start.
  };
in
{
  imports = [
    ./ingestion.nix
    ./monitoring.nix
    ./backup.nix
  ];
  assertions = [
    {
      assertion = !host.enrolled || (host.machineId != null && builtins.pathExists sopsFile);
      message = "Enrollment requires a pinned machine ID and encrypted per-host SOPS file";
    }
  ];
  sops.secrets = lib.mkIf host.enrolled (
    (lib.genAttrs required (name: {
      inherit sopsFile;
      owner = owner name;
      restartUnits = restartReaders name;
      mode = "0400";
    }))
    # Isolated runtime copies support relocation and co-location. Ciphertext
    # retains one authoritative key; readers do not share a Unix group.
    // lib.optionalAttrs (has "grafana") {
      metrics-grafana = {
        inherit sopsFile;
        key = "metrics-password";
        owner = "grafana";
        restartUnits = [ "grafana.service" ];
        mode = "0400";
      };
    }
    // lib.optionalAttrs (has "metrics") {
      metrics-victoriametrics = {
        inherit sopsFile;
        key = "metrics-password";
        owner = "victoriametrics";
        restartUnits = [ "victoriametrics.service" ];
        mode = "0400";
      };
    }
  );
  services.prometheus.exporters.node = {
    enable = true;
    listenAddress = if host.enrolled then host.address else "127.0.0.1";
    enabledCollectors = [
      "systemd"
      "textfile"
    ];
    extraFlags = [ "--collector.textfile.directory=/data/metrics" ];
  };
  systemd.tmpfiles.rules = [
    "d /data/metrics 0755 ${
      if enabled "ingestion" then "attune-ingest attune-ingest" else "root root"
    } -"
  ]
  ++ lib.optionals (enabled "garage") [
    "d /data/garage 0700 garage garage -"
    "d /data/garage/meta 0700 garage garage -"
    "d /data/garage/blocks 0700 garage garage -"
  ]
  ++ lib.optionals (enabled "clickhouse") [ "d /data/clickhouse 0700 clickhouse clickhouse -" ]
  ++ lib.optionals (enabled "grafana") [ "d /data/grafana 0700 grafana grafana -" ];
  environment.etc."attune/inventory.json".text = builtins.toJSON inventory;
  environment.systemPackages = lib.optionals (enabled "garage") [
    (pkgs.writeShellApplication {
      name = "attune-garage-bootstrap";
      runtimeInputs = [
        pkgs.python3
        pkgs.garage_2
      ];
      text = ''exec python3 ${../tools/garage-bootstrap.py} /etc/attune/inventory.json "$@"'';
    })
  ];
  services.garage = lib.mkIf (enabled "garage") {
    enable = true;
    package = pkgs.garage_2;
    settings = {
      metadata_dir = "/data/garage/meta";
      data_dir = "/data/garage/blocks";
      db_engine = "lmdb";
      replication_factor = 3;
      consistency_mode = "consistent";
      rpc_timeout_msec = 3000;
      rpc_ping_timeout_msec = 1000;
      data_fsync = true;
      metadata_fsync = true;
      rpc_bind_addr = "0.0.0.0:3901";
      rpc_public_addr = "${host.address}:3901";
      rpc_secret_file = secret "garage-rpc";
      bootstrap_peers = map (h: "${h.garageId}@${h.address}:3901") peers;
      s3_api = {
        api_bind_addr = "0.0.0.0:3900";
        s3_region = "attune";
      };
      admin.api_bind_addr = "127.0.0.1:3903";
    };
  };
  users.users.garage = lib.mkIf (enabled "garage") {
    isSystemUser = true;
    group = "garage";
  };
  users.groups.garage = lib.mkIf (enabled "garage") { };
  systemd.services.garage = lib.mkIf (enabled "garage") (
    dataUnit
    // {
      preStart = lib.optionalString (host.garageId != null) ''
        actual=$(${pkgs.garage_2}/bin/garage node id -q)
        test "''${actual%%@*}" = '${host.garageId}'
      '';
      serviceConfig = {
        DynamicUser = lib.mkForce false;
        User = "garage";
        Group = "garage";
        Restart = "on-failure";
        RestartSec = 10;
      };
    }
  );
  services.clickhouse = lib.mkIf (enabled "clickhouse") {
    enable = true;
    serverConfig = {
      path = "/data/clickhouse/";
      logger = {
        level = "warning";
        console = true;
        log = "/var/lib/clickhouse/server.log";
        errorlog = "/var/lib/clickhouse/error.log";
        size = "10M";
        count = 3;
      };
      tmp_path = "/data/clickhouse/tmp/";
      user_files_path = "/data/clickhouse/user_files/";
      access_control_path = "/data/clickhouse/access/";
      listen_host = [
        "127.0.0.1"
        host.address
      ];
      prometheus = {
        endpoint = "/metrics";
        port = 9363;
        metrics = true;
        events = true;
        asynchronous_metrics = true;
      };
    };
    extraUsersConfig = ''<clickhouse><users><default><networks replace="replace"><ip>127.0.0.1</ip><ip>::1</ip></networks></default></users></clickhouse>'';
    usersConfig = {
      profiles.grafana = {
        readonly = 1;
        constraints.max_execution_time.changeable_in_readonly = true;
      };
      users.default.networks.ip = [
        "127.0.0.1"
        "::1"
      ];
      users.grafana = {
        profile = "grafana";
        quota = "default";
        networks.ip = [ placement.grafana.address ];
      };
      users.ingest = {
        profile = "default";
        quota = "default";
        networks.ip = [ placement.ingestion.address ];
      };
    };
  };
  environment.etc."clickhouse-server/users.d/300-attune-secrets.xml" =
    lib.mkIf (enabled "clickhouse")
      {
        source = secret "clickhouse-users";
      };
  systemd.services.attune-schema = lib.mkIf (enabled "clickhouse") {
    wantedBy = [ "multi-user.target" ];
    requires = [ "clickhouse.service" ];
    after = [ "clickhouse.service" ];
    serviceConfig.Type = "oneshot";
    path = [ pkgs.clickhouse ];
    script = "clickhouse-client --multiquery < ${../ingest/schema.sql}";
  };
  systemd.services.clickhouse = lib.mkIf (enabled "clickhouse") dataUnit;
  services.victoriametrics = lib.mkIf (enabled "metrics") {
    enable = true;
    listenAddress = "${host.address}:8428";
    retentionPeriod = "90d";
    basicAuthUsername = "metrics";
    basicAuthPasswordFile = secret "metrics-victoriametrics";
    prometheusConfig.scrape_configs = map (name: {
      job_name = name;
      static_configs = [ { targets = [ "${inventory.${name}.address}:9100" ]; } ];
    }) (builtins.attrNames inventory);
  };
  # Eliminate DynamicUser/private-directory indirection for this retained StateDirectory.
  users.users.victoriametrics = lib.mkIf (enabled "metrics") {
    isSystemUser = true;
    group = "victoriametrics";
  };
  users.groups.victoriametrics = lib.mkIf (enabled "metrics") { };
  systemd.services.victoriametrics = lib.mkIf (enabled "metrics") (
    dataUnit
    // {
      serviceConfig = {
        DynamicUser = lib.mkForce false;
        User = "victoriametrics";
        Group = "victoriametrics";
      };
    }
  );
  environment.persistence."/persist".directories = lib.optionals (enabled "metrics") [
    {
      directory = "/var/lib/victoriametrics";
      user = "victoriametrics";
      group = "victoriametrics";
      mode = "0700";
    }
  ];
  services.grafana = lib.mkIf (enabled "grafana") {
    enable = true;
    dataDir = "/data/grafana";
    declarativePlugins = [ pkgs.grafanaPlugins.grafana-clickhouse-datasource ];
    settings = {
      server = {
        http_addr = "127.0.0.1";
        http_port = 3000;
      };
      security.secret_key = "$__file{${secret "grafana-key"}}";
      security.admin_password = "$__file{${secret "grafana-admin"}}";
      users.allow_sign_up = false;
      "auth.anonymous".enabled = false;
      analytics = {
        reporting_enabled = false;
        check_for_updates = false;
      };
    };
    provision = {
      enable = true;
      datasources.settings.datasources = [
        {
          name = "Operations";
          uid = "operations";
          type = "prometheus";
          url = "http://${placement.metrics.address}:8428";
          access = "proxy";
          basicAuth = true;
          basicAuthUser = "metrics";
          secureJsonData.basicAuthPassword = "$__file{${secret "metrics-grafana"}}";
        }
        {
          name = "Science";
          uid = "science";
          type = "grafana-clickhouse-datasource";
          jsonData = {
            host = placement.clickhouse.address;
            port = 8123;
            protocol = "http";
            username = "grafana";
            defaultDatabase = "attune";
          };
          secureJsonData.password = "$__file{${secret "grafana-clickhouse"}}";
        }
      ];
      dashboards.settings.providers = [
        {
          name = "Attune";
          options.path = import ../dashboards { inherit pkgs lib; };
          disableDeletion = true;
          allowUiUpdates = false;
        }
      ];
    };
  };
  systemd.services.grafana = lib.mkIf (enabled "grafana") dataUnit;
  # Only declared peers may reach infrastructure ports. SSH remains the management path.
  networking.firewall.extraCommands = lib.mkIf host.enrolled (
    lib.concatMapStringsSep "\n" (h: ''
      iptables -A nixos-fw -s ${h.address} -p tcp -m multiport --dports 3900,3901,8123,9100,9363,8428,4243 -j nixos-fw-accept
    '') (builtins.attrValues inventory)
  );
}
