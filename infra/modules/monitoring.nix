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
  isMetrics = host.enrolled && builtins.elem "metrics" host.roles;
  rules = import ../dashboards/alerts.nix;
in
{
  services.victoriametrics.prometheusConfig.scrape_configs = lib.mkIf isMetrics [
    {
      job_name = "comin";
      metric_relabel_configs = [
        {
          source_labels = [ "__name__" ];
          regex = "comin_deployment_info";
          action = "drop";
        }
      ];
      static_configs = [ { targets = map (h: "${h.address}:4243") (builtins.attrValues inventory); } ];
    }
    {
      job_name = "clickhouse";
      static_configs = [ { targets = [ "${placement.clickhouse.address}:9363" ]; } ];
    }
  ];
  services.vmalert.instances.attune = lib.mkIf isMetrics {
    enable = true;
    inherit rules;
    settings = {
      "datasource.url" = "http://${host.address}:8428";
      "datasource.basicAuth.username" = "metrics";
      "datasource.basicAuth.passwordFile" = "/run/credentials/vmalert-attune.service/metrics-password";
      "notifier.url" = [ "http://127.0.0.1:9093" ];
      "httpListenAddr" = "127.0.0.1:8880";
    };
  };
  services.prometheus.alertmanager = lib.mkIf isMetrics {
    enable = true;
    listenAddress = "127.0.0.1";
    configuration = {
      route = {
        receiver = "local";
        group_by = [ "alertname" ];
        group_wait = "30s";
        group_interval = "5m";
        repeat_interval = "4h";
      };
      receivers = [ { name = "local"; } ];
    };
  };
  users.users.alertmanager = lib.mkIf isMetrics {
    isSystemUser = true;
    group = "alertmanager";
  };
  users.groups.alertmanager = lib.mkIf isMetrics { };
  systemd.services.alertmanager = lib.mkIf isMetrics {
    unitConfig.RequiresMountsFor = [ "/persist" ];
    serviceConfig = {
      DynamicUser = lib.mkForce false;
      User = "alertmanager";
      Group = "alertmanager";
    };
  };
  environment.persistence."/persist".directories = lib.optionals isMetrics [
    {
      directory = "/var/lib/alertmanager";
      user = "alertmanager";
      group = "alertmanager";
      mode = "0700";
    }
  ];
  systemd.services.vmalert-attune = lib.mkIf isMetrics {
    serviceConfig.LoadCredential = [ "metrics-password:/run/secrets/metrics-password" ];
  };
  systemd.services.attune-health = {
    description = "Low-cardinality local infrastructure health";
    unitConfig.RequiresMountsFor = [ "/data" ];
    path = [
      pkgs.systemd
      pkgs.coreutils
    ];
    serviceConfig.Type = "oneshot";
    script = ''
      mkdir -p /data/metrics
      tmp=/data/metrics/health.prom.tmp
      : > "$tmp"
      for service in comin sshd ${lib.optionalString host.enrolled "garage"} ${
        lib.optionalString (host.enrolled && builtins.elem "clickhouse" host.roles) "clickhouse"
      } ${
        lib.optionalString (host.enrolled && builtins.elem "grafana" host.roles) "grafana"
      } ${lib.optionalString (isMetrics) "victoriametrics vmalert-attune alertmanager"}; do
        value=0
        if systemctl is-active --quiet "$service"; then value=1; fi
        printf 'attune_service_up{service="%s"} %s\n' "$service" "$value" >> "$tmp"
      done
      mv "$tmp" /data/metrics/health.prom
    '';
  };
  systemd.services.attune-garage-health = lib.mkIf host.enrolled {
    after = [ "garage.service" ];
    unitConfig.RequiresMountsFor = [ "/data" ];
    serviceConfig = {
      Type = "oneshot";
      ExecStart = "${pkgs.python3}/bin/python3 ${../tools/garage-health.py}";
    };
    path = [ pkgs.garage_2 ];
  };
  systemd.timers.attune-garage-health = lib.mkIf host.enrolled {
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnBootSec = "1min";
      OnUnitInactiveSec = "30s";
    };
  };
  systemd.timers.attune-health = {
    wantedBy = [ "timers.target" ];
    timerConfig = {
      OnBootSec = "1min";
      OnUnitInactiveSec = "30s";
    };
  };
  environment.etc."attune/alerts.json".text = builtins.toJSON rules;
}
