{ pkgs, lib }:
let
  c = import ./contracts.nix { inherit lib; };
  panel = id: title: kind: datasource: metric: operation: unit: {
    inherit
      id
      title
      kind
      datasource
      metric
      operation
      unit
      ;
    y = (id - 1) * 8;
    w = 24;
  };
  dashboards = {
    infrastructure = c.render "attune-infrastructure" "Attune infrastructure" [
      (panel 1 "Node scrape health" "stat" "operations" "up" "raw" "short")
      (panel 2 "Persistent filesystem free capacity" "timeseries" "operations" "disk_free" "raw"
        "percentunit"
      )
      (panel 3 "Service health" "stat" "operations" "service_health" "raw" "short")
      (panel 4 "GitOps deployment failures" "timeseries" "operations" "deployments" "raw" "short")
      (panel 5 "Scientific ingestion backlog" "timeseries" "operations" "ingest_backlog" "raw" "short")
      (panel 6 "Garage replication/quorum health" "stat" "operations" "garage_health" "raw" "short")
      (panel 7 "BuildBuddy receipts per poll (when enabled)" "timeseries" "operations" "buildbuddy_poll"
        "raw"
        "short"
      )
      (panel 8 "BuildBuddy execution/cache receipts (provider fields)" "table" "science"
        "buildbuddy_receipts"
        "raw"
        "short"
      )
      (panel 9 "Verified import bytes/s" "timeseries" "operations" "archive_throughput" "raw" "Bps")
    ];
    science = c.render "attune-search" "Search science" [
      (panel 1 "Physical evaluations and logical feedback" "table" "science" "reuse" "sum" "short")
      (panel 2 "R3 by treatment, repository and seed" "table" "science" "r3" "mean" "short")
      (panel 3 "Completed programs" "table" "science" "completed_programs" "mean" "short")
      (panel 4 "Logical search steps" "table" "science" "logical_steps" "mean" "short")
      (panel 5 "Wall time by Jev/uniform treatment" "table" "science" "wall_time" "mean" "seconds")
      (panel 6 "Cache reuse" "table" "science" "cache_reuse" "mean" "short")
      (panel 7 "Proven-core reuse" "table" "science" "proven_core_reuse" "mean" "short")
      (panel 8 "R3 progression (source coordinates)" "table" "science" "progression" "raw" "short")
    ];
    quality = c.render "attune-quality" "Scientific quality" [
      (panel 1 "Recall@10" "table" "science" "recall10" "mean" "short")
      (panel 2 "FileAcc@10" "table" "science" "fileacc10" "mean" "short")
      (panel 3 "Hit@1" "table" "science" "hit1" "mean" "short")
      (panel 4 "MRR@10" "table" "science" "mrr10" "mean" "short")
      (panel 5 "Task harms / reported negative Studio utility deltas" "table" "science" "task_harms" "raw"
        "short"
      )
      (panel 6 "Execution cost by treatment" "table" "science" "cost" "mean" "short")
      (panel 7 "Cost versus Recall@10" "table" "science" "cost_quality" "raw" "short")
      (panel 8 "Repository Jev minus uniform effects" "table" "science" "treatment_effects" "raw" "short")
    ];
  };
in
pkgs.linkFarm "attune-dashboards" (
  lib.mapAttrsToList (name: d: {
    name = "${name}.json";
    path = pkgs.writeText "${name}.json" (builtins.toJSON d);
  }) dashboards
)
