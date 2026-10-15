{ lib }:
let
  metrics = (import ./scientific-contracts.nix { inherit lib; }) // {
    archive_throughput = {
      unit = "Bps";
      operations = [ "raw" ];
      dimensions = [ "instance" ];
      prom = "rate(attune_archive_verified_bytes_total[5m])";
    };
    buildbuddy_receipts = {
      unit = "short";
      operations = [ "raw" ];
      dimensions = [ ];
      sql = "SELECT id AS invocation_id, artifact_sha256 AS receipt_artifact, extension_json AS provider_reported_metadata FROM attune.build_spans_v1 LIMIT 100";
    };
    buildbuddy_poll = {
      unit = "short";
      operations = [ "raw" ];
      dimensions = [ "instance" ];
      prom = "attune_buildbuddy_receipts_exported";
    };
    up = {
      unit = "short";
      operations = [
        "raw"
        "sum"
      ];
      dimensions = [
        "instance"
        "job"
      ];
      prom = "up";
    };
    disk_free = {
      unit = "percentunit";
      operations = [ "raw" ];
      dimensions = [ "instance" ];
      prom = ''node_filesystem_avail_bytes{mountpoint="/data"} / node_filesystem_size_bytes{mountpoint="/data"}'';
    };
    quality = {
      unit = "short";
      operations = [ "mean" ];
      dimensions = [
        "metric"
        "treatment"
        "repository"
        "seed"
      ];
      sql = "SELECT metric, metric_version, population, aggregation, treatment, repository, seed, avgOrNullIf(value, status = 'defined') AS value FROM attune.measurements_v1 GROUP BY metric, metric_version, population, aggregation, treatment, repository, seed";
    };
    garage_health = {
      unit = "short";
      operations = [ "raw" ];
      dimensions = [ "instance" ];
      prom = "attune_garage_healthy";
    };
    ingest_backlog = {
      unit = "short";
      operations = [ "raw" ];
      dimensions = [ "instance" ];
      prom = "attune_ingest_backlog";
    };
    deployments = {
      unit = "short";
      operations = [ "raw" ];
      dimensions = [ "instance" ];
      prom = "comin_last_deployment_failed";
    };
    service_health = {
      unit = "short";
      operations = [ "raw" ];
      dimensions = [
        "instance"
        "service"
      ];
      prom = "attune_service_up";
    };
    reuse = {
      unit = "short";
      operations = [ "sum" ];
      dimensions = [ "kind" ];
      sql = "SELECT study, trial, treatment, kind, uniqExact(id) AS value FROM attune.events_v1 WHERE kind IN ('evaluation','feedback') GROUP BY study, trial, treatment, kind";
    };
  };
  panelType = lib.types.submodule {
    options = {
      id = lib.mkOption { type = lib.types.ints.positive; };
      title = lib.mkOption { type = lib.types.nonEmptyStr; };
      kind = lib.mkOption {
        type = lib.types.enum [
          "timeseries"
          "stat"
          "table"
          "state-timeline"
          "heatmap"
          "xychart"
        ];
      };
      datasource = lib.mkOption {
        type = lib.types.enum [
          "operations"
          "science"
        ];
      };
      metric = lib.mkOption { type = lib.types.enum (builtins.attrNames metrics); };
      operation = lib.mkOption {
        type = lib.types.enum [
          "raw"
          "sum"
          "mean"
        ];
      };
      dimensions = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [ ];
      };
      unit = lib.mkOption {
        type = lib.types.enum [
          "short"
          "percentunit"
          "seconds"
          "bytes"
          "Bps"
        ];
      };
      x = lib.mkOption {
        type = lib.types.ints.between 0 23;
        default = 0;
      };
      y = lib.mkOption {
        type = lib.types.ints.unsigned;
        default = 0;
      };
      w = lib.mkOption {
        type = lib.types.ints.between 1 24;
        default = 12;
      };
      h = lib.mkOption {
        type = lib.types.ints.between 1 30;
        default = 8;
      };
    };
  };
  validate =
    panels:
    let
      checked =
        (lib.evalModules {
          modules = [
            {
              options.panels = lib.mkOption { type = lib.types.listOf panelType; };
              config.panels = panels;
            }
          ];
        }).config.panels;
    in
    assert lib.assertMsg (
      lib.length (lib.unique (map (p: p.id) checked)) == lib.length checked
    ) "duplicate panel ID";
    map (
      p:
      let
        m = metrics.${p.metric};
      in
      assert lib.assertMsg (p.x + p.w <= 24) "panel outside grid";
      assert lib.assertMsg (p.unit == m.unit) "metric unit mismatch";
      assert lib.assertMsg (builtins.elem p.operation m.operations) "unsupported metric operation";
      assert lib.assertMsg (lib.all (
        d: builtins.elem d m.dimensions
      ) p.dimensions) "unknown query dimension";
      assert lib.assertMsg ((p.datasource == "operations") == (m ? prom)) "metric datasource mismatch";
      p
    ) checked;
  render = uid: title: panels: {
    inherit uid title;
    schemaVersion = 39;
    version = 1;
    tags = [ "attune" ];
    time = {
      from = "now-6h";
      to = "now";
    };
    refresh = "30s";
    panels = map (
      p:
      let
        m = metrics.${p.metric};
      in
      {
        inherit (p) id title;
        type = p.kind;
        gridPos = {
          inherit (p)
            x
            y
            w
            h
            ;
        };
        datasource = {
          uid = p.datasource;
          type = if p.datasource == "science" then "grafana-clickhouse-datasource" else "prometheus";
        };
        fieldConfig = {
          defaults.unit = p.unit;
          overrides = [ ];
        };
        options = { };
        targets = [
          (
            {
              refId = "A";
            }
            // (
              if m ? prom then
                { expr = if p.operation == "sum" then "sum(${m.prom})" else m.prom; }
              else
                {
                  rawSql = m.sql;
                  format = 1;
                  queryType = "sql";
                  editorType = "sql";
                }
            )
          )
        ];
      }
    ) (validate panels);
  };
in
{
  inherit metrics validate render;
}
