CREATE SCHEMA IF NOT EXISTS tend_core;
CREATE SCHEMA IF NOT EXISTS tend_event;
CREATE SCHEMA IF NOT EXISTS tend_view;
CREATE SCHEMA IF NOT EXISTS tend_outbox;

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS tend_core.session (
  session_id text PRIMARY KEY,
  agent_kind text NOT NULL CHECK (agent_kind IN ('opencode', 'codex', 'other')),
  started_at timestamptz NOT NULL,
  workspace_root text NOT NULL,
  recipe_id text
);

CREATE TABLE IF NOT EXISTS tend_core.context_decision (
  decision_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  retained_context_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  dropped_context_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  retained_token_estimate integer NOT NULL,
  dropped_token_estimate integer NOT NULL,
  policy_decision_id text NOT NULL
);

CREATE TABLE IF NOT EXISTS tend_core.openrtk_action (
  action_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  codec text NOT NULL CHECK (codec IN ('openrtk.command-output-v1', 'openrtk.context-packet-v1')),
  source_observation_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  summary text NOT NULL,
  original_token_estimate integer NOT NULL,
  compressed_token_estimate integer NOT NULL,
  dropped_token_estimate integer NOT NULL,
  policy_decision_id text
);

CREATE TABLE IF NOT EXISTS tend_core.tool_call (
  tool_call_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'blocked')),
  occurred_at timestamptz NOT NULL,
  recipe_id text,
  payload jsonb
);

CREATE TABLE IF NOT EXISTS tend_core.long_job (
  job_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  recipe_id text NOT NULL,
  registered_at timestamptz NOT NULL,
  wake_after timestamptz,
  poll_target text NOT NULL,
  status text NOT NULL CHECK (status IN ('registered', 'running', 'ready', 'failed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS tend_core.artifact_ref (
  artifact_ref_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  artifact_kind text NOT NULL CHECK (artifact_kind IN ('blob', 'object', 'file')),
  uri text NOT NULL,
  content_hash text
);

CREATE TABLE IF NOT EXISTS tend_event.event (
  event_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  event_kind text NOT NULL,
  occurred_at timestamptz NOT NULL,
  recipe_id text,
  receipt_id text,
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS tend_event.token_usage (
  event_id text PRIMARY KEY REFERENCES tend_event.event(event_id) ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  input_tokens integer,
  output_tokens integer,
  cached_tokens integer,
  total_tokens integer NOT NULL,
  occurred_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS tend_event.token_metric (
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  event_id text REFERENCES tend_event.event(event_id) ON DELETE SET NULL,
  metric_name text NOT NULL,
  metric_value double precision NOT NULL,
  observed_at timestamptz NOT NULL
);

SELECT create_hypertable(
  'tend_event.token_metric',
  'observed_at',
  if_not_exists => TRUE
);

CREATE TABLE IF NOT EXISTS tend_event.command_output_sample (
  sample_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  command_observation_id text NOT NULL,
  output_class text NOT NULL,
  sample text NOT NULL,
  truncated boolean NOT NULL,
  token_estimate integer NOT NULL
);

CREATE TABLE IF NOT EXISTS tend_event.long_job_observation (
  observation_id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES tend_core.long_job(job_id) ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  status text NOT NULL,
  payload jsonb NOT NULL
);

CREATE OR REPLACE VIEW tend_view.token_usage_by_session_5m AS
SELECT
  session_id,
  date_bin('5 minutes', occurred_at, TIMESTAMPTZ '2000-01-01') AS bucket,
  sum(total_tokens) AS total_tokens
FROM tend_event.token_usage
GROUP BY session_id, bucket;

CREATE OR REPLACE VIEW tend_view.command_output_by_class_5m AS
SELECT
  session_id,
  output_class,
  date_bin('5 minutes', now(), TIMESTAMPTZ '2000-01-01') AS bucket,
  count(*) AS samples,
  sum(token_estimate) AS token_estimate
FROM tend_event.command_output_sample
GROUP BY session_id, output_class, bucket;

CREATE OR REPLACE VIEW tend_view.long_job_latency_5m AS
SELECT
  session_id,
  date_bin('5 minutes', registered_at, TIMESTAMPTZ '2000-01-01') AS bucket,
  count(*) AS jobs
FROM tend_core.long_job
GROUP BY session_id, bucket;

CREATE TABLE IF NOT EXISTS tend_outbox.wakeup (
  wakeup_id text PRIMARY KEY,
  session_id text NOT NULL REFERENCES tend_core.session(session_id) ON DELETE CASCADE,
  job_id text NOT NULL REFERENCES tend_core.long_job(job_id) ON DELETE CASCADE,
  wake_after timestamptz NOT NULL,
  target_recipe_id text NOT NULL,
  target_command text NOT NULL,
  delivered_at timestamptz
);
