{ lib }:
let
  measurement = metric: {
    unit = "short";
    operations = [ "mean" ];
    dimensions = [
      "treatment"
      "repository"
      "seed"
      "population"
    ];
    sql = "SELECT treatment, repository, seed, metric_version, population, aggregation, avgOrNullIf(value, status = 'defined') AS value, countIf(status = 'undefined') AS undefined_measurements, countIf(status = 'failed') AS failed_measurements, countIf(status = 'unavailable') AS unavailable_measurements, sumOrNull(numerator) AS numerator, sumOrNull(denominator) AS denominator, sum(undefined_count) AS undefined_count FROM attune.measurements_v1 WHERE metric = '${metric}' GROUP BY treatment, repository, seed, metric_version, population, aggregation";
  };
in
{
  progression = {
    unit = "short";
    operations = [ "raw" ];
    dimensions = [
      "treatment"
      "repository"
      "seed"
      "logical_step"
      "elapsed_seconds"
    ];
    sql = "SELECT study, trial, treatment, repository, seed, metric_version, population, aggregation, logical_step, elapsed_seconds, value, status FROM attune.search_progress_v1 WHERE metric = 'R3' ORDER BY study, trial, logical_step";
  };
  cost_quality = {
    unit = "short";
    operations = [ "raw" ];
    dimensions = [
      "treatment"
      "repository"
      "seed"
    ];
    sql = "SELECT * FROM attune.cost_quality_v1 WHERE cost IS NOT NULL AND recall10 IS NOT NULL";
  };
  treatment_effects = {
    unit = "short";
    operations = [ "raw" ];
    dimensions = [
      "repository"
      "metric"
    ];
    sql = "SELECT * FROM attune.treatment_effects_v1";
  };
  r3 = measurement "R3";
  completed_programs = measurement "completed_programs";
  logical_steps = measurement "logical_steps";
  wall_time = (measurement "wall_time_seconds") // {
    unit = "seconds";
  };
  recall10 = measurement "Recall@10";
  fileacc10 = measurement "FileAcc@10";
  hit1 = measurement "Hit@1";
  mrr10 = measurement "MRR@10";
  task_harms = {
    unit = "short";
    operations = [ "raw" ];
    dimensions = [
      "subject"
      "treatment"
      "repository"
      "seed"
    ];
    sql = "SELECT study, trial, subject, candidate, treatment, repository, seed, metric, metric_version, population, aggregation, value, status, numerator, denominator, artifact_sha256 FROM attune.measurements_v1 WHERE metric = 'task_harm' OR (metric = 'utility_delta_studio' AND (status != 'defined' OR value < 0)) ORDER BY repository, subject, seed";
  };
  cost = measurement "execution_cost";
  cache_reuse = measurement "cache_reuse";
  proven_core_reuse = measurement "proven_core_reuse";
}
