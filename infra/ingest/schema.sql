CREATE DATABASE IF NOT EXISTS attune;
CREATE TABLE IF NOT EXISTS attune.records_v1 (
  kind String, id String, study String, trial Nullable(String), subject Nullable(String),
  candidate Nullable(String), evaluation_id Nullable(String), treatment Nullable(String),
  repository Nullable(String), seed Nullable(Int64), metric Nullable(String), metric_version Nullable(String),
  population Nullable(String), aggregation Nullable(String), value Nullable(Float64),
  numerator Nullable(Int64), denominator Nullable(Int64), status Nullable(String),
  population_count Nullable(Int64), covered_count Nullable(Int64), undefined_count Nullable(Int64),
  artifact_sha256 Nullable(String), extension_json String
) ENGINE = ReplacingMergeTree ORDER BY (study, kind, id);
CREATE VIEW IF NOT EXISTS attune.measurements_v1 AS SELECT * FROM attune.records_v1 FINAL WHERE kind = 'measurement';
CREATE VIEW IF NOT EXISTS attune.events_v1 AS SELECT * FROM attune.records_v1 FINAL WHERE kind IN ('evaluation','feedback','event');
CREATE VIEW IF NOT EXISTS attune.build_spans_v1 AS SELECT * FROM attune.records_v1 FINAL WHERE kind = 'build_execution_span';
-- Optional source-qualified progression coordinates. Missing coordinates stay NULL.
CREATE OR REPLACE VIEW attune.search_progress_v1 AS
SELECT study, trial, treatment, repository, seed, metric, metric_version, population, aggregation,
       JSONExtract(extension_json, 'logical_step', 'Nullable(Int64)') AS logical_step,
       JSONExtract(extension_json, 'elapsed_seconds', 'Nullable(Float64)') AS elapsed_seconds,
       value, status, numerator, denominator
FROM attune.measurements_v1;
CREATE OR REPLACE VIEW attune.cost_quality_v1 AS
SELECT study, trial, treatment, repository, seed,
       avgOrNullIf(value, metric = 'execution_cost' AND status = 'defined') AS cost,
       avgOrNullIf(value, metric = 'Recall@10' AND status = 'defined') AS recall10
FROM attune.measurements_v1 GROUP BY study, trial, treatment, repository, seed;
CREATE OR REPLACE VIEW attune.treatment_effects_v1 AS
SELECT repository, metric, metric_version, population, aggregation,
       avgOrNullIf(value, treatment = 'jev' AND status = 'defined') AS jev,
       avgOrNullIf(value, treatment = 'uniform' AND status = 'defined') AS uniform,
       jev - uniform AS difference,
       countIf(status = 'undefined') AS undefined_measurements,
       countIf(status = 'failed') AS failed_measurements,
       countIf(status = 'unavailable') AS unavailable_measurements
FROM attune.measurements_v1 GROUP BY repository, metric, metric_version, population, aggregation;
