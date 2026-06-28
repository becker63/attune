CREATE SCHEMA IF NOT EXISTS framework_core;
CREATE SCHEMA IF NOT EXISTS framework_event;
CREATE SCHEMA IF NOT EXISTS framework_view;

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS framework_core.recipe (
  recipe_id text PRIMARY KEY,
  recipe_kind text NOT NULL CHECK (recipe_kind IN ('recipe', 'managed-recipe')),
  project_id text,
  title text,
  nx_target text,
  source_path text,
  resource_kind text,
  human_review_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS framework_core.recipe_edge (
  recipe_id text NOT NULL REFERENCES framework_core.recipe(recipe_id) ON DELETE CASCADE,
  depends_on_recipe_id text NOT NULL,
  reason text,
  PRIMARY KEY (recipe_id, depends_on_recipe_id)
);

CREATE TABLE IF NOT EXISTS framework_core.recipe_io (
  io_id text PRIMARY KEY,
  recipe_id text NOT NULL REFERENCES framework_core.recipe(recipe_id) ON DELETE CASCADE,
  io_role text NOT NULL CHECK (io_role IN ('input', 'output', 'observation', 'receipt')),
  name text NOT NULL,
  schema_name text,
  content_hash text,
  payload jsonb
);

CREATE TABLE IF NOT EXISTS framework_event.recipe_run (
  run_id text PRIMARY KEY,
  recipe_id text NOT NULL REFERENCES framework_core.recipe(recipe_id) ON DELETE CASCADE,
  lifecycle_action text CHECK (lifecycle_action IN ('plan', 'apply', 'run', 'check', 'migrate', 'validate-sql', 'stop', 'destroy', 'prune')),
  run_status text NOT NULL CHECK (run_status IN ('planned', 'running', 'passed', 'failed', 'blocked', 'destroyed', 'pruned')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  input_hash text,
  output_hash text
);

CREATE TABLE IF NOT EXISTS framework_event.recipe_receipt (
  receipt_id text PRIMARY KEY,
  recipe_id text NOT NULL REFERENCES framework_core.recipe(recipe_id) ON DELETE CASCADE,
  run_id text NOT NULL REFERENCES framework_event.recipe_run(run_id) ON DELETE CASCADE,
  receipt_status text NOT NULL CHECK (receipt_status IN ('planned', 'running', 'passed', 'failed', 'blocked', 'destroyed', 'pruned')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  command text,
  stdout_summary text,
  stderr_summary text,
  output_hash text,
  validation_evidence text[] NOT NULL DEFAULT ARRAY[]::text[],
  payload jsonb
);

CREATE TABLE IF NOT EXISTS framework_event.recipe_diagnostic (
  diagnostic_id text PRIMARY KEY,
  recipe_id text NOT NULL REFERENCES framework_core.recipe(recipe_id) ON DELETE CASCADE,
  receipt_id text REFERENCES framework_event.recipe_receipt(receipt_id) ON DELETE SET NULL,
  code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  message text NOT NULL,
  source_path text,
  range_start integer,
  range_end integer,
  cause jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS framework_event.recipe_repair (
  repair_id text PRIMARY KEY,
  recipe_id text NOT NULL REFERENCES framework_core.recipe(recipe_id) ON DELETE CASCADE,
  diagnostic_id text REFERENCES framework_event.recipe_diagnostic(diagnostic_id) ON DELETE SET NULL,
  title text NOT NULL,
  repair_kind text NOT NULL CHECK (repair_kind IN ('nx-target', 'source-edit', 'manual-review', 'managed-lifecycle')),
  nx_target text,
  allowed_files text[] NOT NULL DEFAULT ARRAY[]::text[],
  risk text NOT NULL CHECK (risk IN ('safe', 'needs-review', 'manual-only')),
  evidence_requirements text[] NOT NULL DEFAULT ARRAY[]::text[],
  payload jsonb
);

CREATE TABLE IF NOT EXISTS framework_event.recipe_receipt_metric (
  recipe_id text NOT NULL REFERENCES framework_core.recipe(recipe_id) ON DELETE CASCADE,
  receipt_id text REFERENCES framework_event.recipe_receipt(receipt_id) ON DELETE SET NULL,
  metric_name text NOT NULL,
  metric_value double precision NOT NULL,
  observed_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS framework_event.recipe_observation (
  observation_id text PRIMARY KEY,
  recipe_id text NOT NULL REFERENCES framework_core.recipe(recipe_id) ON DELETE CASCADE,
  run_id text REFERENCES framework_event.recipe_run(run_id) ON DELETE SET NULL,
  receipt_id text REFERENCES framework_event.recipe_receipt(receipt_id) ON DELETE SET NULL,
  observation_kind text NOT NULL,
  observed_at timestamptz NOT NULL,
  source text,
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS recipe_observation_recipe_observed_at_idx
  ON framework_event.recipe_observation (recipe_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS recipe_observation_run_observed_at_idx
  ON framework_event.recipe_observation (run_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS recipe_observation_kind_observed_at_idx
  ON framework_event.recipe_observation (observation_kind, observed_at DESC);

SELECT create_hypertable(
  'framework_event.recipe_receipt_metric',
  'observed_at',
  if_not_exists => TRUE
);

CREATE OR REPLACE VIEW framework_view.recipe_health AS
SELECT
  recipe.recipe_id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM framework_event.recipe_diagnostic diagnostic
      WHERE diagnostic.recipe_id = recipe.recipe_id
        AND diagnostic.severity = 'error'
    ) THEN 'failed'
    WHEN EXISTS (
      SELECT 1
      FROM framework_event.recipe_diagnostic diagnostic
      WHERE diagnostic.recipe_id = recipe.recipe_id
    ) THEN 'stale'
    WHEN latest_receipt.receipt_status = 'passed' THEN 'clean'
    WHEN latest_receipt.receipt_status = 'failed' THEN 'failed'
    WHEN latest_receipt.receipt_status = 'blocked' THEN 'blocked'
    ELSE 'unknown'
  END AS health_status,
  latest_receipt.completed_at AS checked_at,
  latest_receipt.receipt_id AS latest_receipt_id
FROM framework_core.recipe recipe
LEFT JOIN LATERAL (
  SELECT receipt.receipt_id, receipt.receipt_status, receipt.completed_at, receipt.started_at
  FROM framework_event.recipe_receipt receipt
  WHERE receipt.recipe_id = recipe.recipe_id
  ORDER BY COALESCE(receipt.completed_at, receipt.started_at) DESC, receipt.receipt_id DESC
  LIMIT 1
) latest_receipt ON true;

CREATE OR REPLACE VIEW framework_view.repair_plan AS
SELECT
  repair.repair_id,
  repair.recipe_id,
  repair.diagnostic_id,
  repair.title,
  repair.repair_kind,
  repair.nx_target,
  repair.allowed_files,
  repair.risk,
  repair.evidence_requirements
FROM framework_event.recipe_repair repair;
