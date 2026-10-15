{ pkgs }:
let
  python = pkgs.python3.withPackages (p: [
    p.boto3
    p.pyarrow
  ]);
in
pkgs.testers.runNixOSTest {
  name = "attune-scientific-evidence";
  nodes.machine = { ... }: {
    environment.etc."garage-credentials.py".source = ../tools/garage-credentials.py;
    services.garage = {
      enable = true;
      package = pkgs.garage_2;
      settings = {
        replication_factor = 1;
        db_engine = "lmdb";
        rpc_bind_addr = "127.0.0.1:3901";
        rpc_public_addr = "127.0.0.1:3901";
        rpc_secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        s3_api = {
          api_bind_addr = "127.0.0.1:3900";
          s3_region = "attune";
        };
      };
    };
    services.clickhouse = {
      enable = true;
      usersConfig = {
        profiles.grafana = {
          readonly = 1;
          constraints.max_execution_time.changeable_in_readonly = true;
        };
        users.grafana = {
          profile = "grafana";
          quota = "default";
          password = "disposable";
          networks.ip = [
            "127.0.0.1"
            "::1"
          ];
        };
      };
    };
    services.victoriametrics = {
      enable = true;
      listenAddress = "127.0.0.1:8428";
    };
    services.grafana = {
      enable = true;
      settings = {
        server.http_addr = "127.0.0.1";
        security.secret_key = "disposable-vm-key";
      };
      declarativePlugins = [ pkgs.grafanaPlugins.grafana-clickhouse-datasource ];
      provision = {
        enable = true;
        datasources.settings.datasources = [
          {
            name = "science";
            uid = "science";
            type = "grafana-clickhouse-datasource";
            secureJsonData.password = "$__file{/etc/datasource-password}";
            jsonData = {
              host = "localhost";
              port = 8123;
              protocol = "http";
              username = "grafana";
              defaultDatabase = "attune";
            };
          }
          {
            name = "operations";
            uid = "operations";
            type = "prometheus";
            url = "http://localhost:8428";
          }
        ];
        dashboards.settings.providers = [
          {
            name = "Attune";
            options.path = import ../dashboards {
              inherit pkgs;
              lib = pkgs.lib;
            };
          }
        ];
      };
    };
    environment.etc = {
      "datasource-password".text = "disposable";
      "attune-ingest".source = ../ingest;
      "test_science.py".source = ./test_science.py;
      "science_vm.py".source = ./science_vm.py;
      "schema.sql".source = ../ingest/schema.sql;
    };
    time.timeZone = "UTC";
    environment.systemPackages = [
      python
      pkgs.garage_2
      pkgs.curl
    ];
    virtualisation.memorySize = 3072;
  };
  testScript = ''
    machine.start(allow_reboot=True)
    for unit in ["garage", "clickhouse", "grafana", "victoriametrics"]:
        machine.wait_for_unit(unit + ".service")
    machine.wait_until_succeeds("curl -fsS localhost:3000/api/health")
    machine.succeed("python3 /etc/science_vm.py")
    machine.fail("clickhouse-client --user grafana --query='CREATE DATABASE forbidden'")
    machine.reboot()
    for unit in ["garage", "clickhouse", "grafana"]:
        machine.wait_for_unit(unit + ".service")
    machine.wait_until_succeeds("curl -fsS localhost:3000/api/health")
    machine.succeed("python3 /etc/science_vm.py")
  '';
}
