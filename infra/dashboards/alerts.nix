{
  groups = [
    {
      name = "attune";
      rules = map (a: a // { labels.severity = "critical"; }) [
        {
          alert = "NodeUnavailable";
          expr = "up == 0";
          for = "5m";
        }
        {
          alert = "GarageQuorumAtRisk";
          expr = "attune_garage_healthy == 0 or attune_garage_health_probe_up == 0";
          for = "2m";
        }
        {
          alert = "StorageCritical";
          expr = ''node_filesystem_avail_bytes{mountpoint="/data"} / node_filesystem_size_bytes{mountpoint="/data"} < 0.1'';
          for = "10m";
        }
        {
          alert = "ServiceUnavailable";
          expr = "attune_service_up == 0";
          for = "5m";
        }
        {
          alert = "CominDeploymentFailure";
          expr = "comin_last_deployment_failed > 0 or comin_last_build_failed > 0";
          for = "15m";
        }
        {
          alert = "IngestionStalled";
          expr = "time() - attune_ingest_last_poll_seconds > 600 or attune_ingest_backlog > 0 or attune_ingest_failures > 0 or absent(attune_ingest_last_poll_seconds)";
          for = "15m";
        }
        {
          alert = "BackupOverdue";
          expr = "time() - attune_backup_last_verified_seconds > 172800 or absent(attune_backup_last_verified_seconds)";
          for = "30m";
        }
      ];
    }
  ];
}
