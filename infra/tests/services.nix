{ pkgs }:
pkgs.testers.runNixOSTest {
  name = "attune-native-services";
  nodes.machine = { ... }: {
    services.grafana = {
      enable = true;
      settings = {
        server.http_addr = "127.0.0.1";
        security.secret_key = "disposable-vm-key";
      };
    };
    services.clickhouse.enable = true;
    services.victoriametrics = {
      enable = true;
      listenAddress = "127.0.0.1:8428";
    };
    services.vmalert.instances.fixture = {
      enable = true;
      settings = {
        "datasource.url" = "http://127.0.0.1:8428";
        "notifier.url" = [ "http://127.0.0.1:9093" ];
        "httpListenAddr" = "127.0.0.1:8880";
        evaluationInterval = "1s";
      };
      rules.groups = [
        {
          name = "fixture";
          interval = "1s";
          rules = [
            {
              alert = "FixturePipeline";
              expr = "vector(1)";
              labels.severity = "test";
              annotations.summary = "Disposable alert pipeline test";
            }
          ];
        }
      ];
    };
    services.prometheus.alertmanager = {
      enable = true;
      listenAddress = "127.0.0.1";
      configuration = {
        route = {
          receiver = "local";
          group_wait = "1s";
        };
        receivers = [ { name = "local"; } ];
      };
    };
    time.timeZone = "UTC";
    virtualisation.memorySize = 2048;
    environment.systemPackages = [ pkgs.curl ];
  };
  testScript = ''
    machine.start(allow_reboot=True)
    machine.wait_for_unit("grafana.service")
    machine.wait_for_unit("clickhouse.service")
    machine.wait_for_unit("victoriametrics.service")
    machine.wait_until_succeeds("curl -fsS localhost:3000/api/health")
    machine.succeed("curl -fsS localhost:8123/ping | grep Ok")
    machine.succeed("curl -fsS localhost:8428/health")
    machine.wait_for_unit("vmalert-fixture.service")
    machine.wait_for_unit("alertmanager.service")
    machine.wait_until_succeeds("curl -fsS localhost:9093/api/v2/alerts | grep FixturePipeline")
    machine.succeed("clickhouse-client --multiquery --query='CREATE DATABASE fixture; CREATE TABLE fixture.retained (x UInt8) ENGINE=MergeTree ORDER BY x; INSERT INTO fixture.retained VALUES (7)'")
    machine.reboot()
    machine.wait_for_unit("clickhouse.service")
    machine.succeed("clickhouse-client --query='SELECT x FROM fixture.retained' | grep 7")
  '';
}
