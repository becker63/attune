#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
change_id="sqlite-program-index-reactive-projections"
poll_seconds="${ATTUNE_WAKE_POLL_SECONDS:-300}"
stable_polls_required="${ATTUNE_WAKE_STABLE_POLLS:-2}"
action="${ATTUNE_WAKE_ACTION:-codex}"
sandbox="${ATTUNE_WAKE_SANDBOX:-workspace-write}"
approval_policy="${ATTUNE_WAKE_APPROVAL:-never}"
cloud_task_id="${ATTUNE_WAKE_CLOUD_TASK_ID:-}"
cloud_env="${ATTUNE_WAKE_CLOUD_ENV:-}"
watch_latest_cloud_task="${ATTUNE_WAKE_WATCH_LATEST:-false}"
completion_command="${ATTUNE_WAKE_COMPLETION_COMMAND:-}"
token_usage_command="${ATTUNE_WAKE_TOKEN_USAGE_COMMAND:-}"
token_usage_file="${ATTUNE_WAKE_TOKEN_USAGE_FILE:-}"
token_usage_percent="${ATTUNE_WAKE_TOKEN_USAGE_PERCENT:-}"
token_remaining_max="${ATTUNE_WAKE_TOKEN_REMAINING_MAX:-}"
token_used_min="${ATTUNE_WAKE_TOKEN_USED_MIN:-}"
codex_goal_id="${ATTUNE_WAKE_CODEX_GOAL_ID:-}"
codex_thread_id="${ATTUNE_WAKE_CODEX_THREAD_ID:-}"
codex_thread_cwd="${ATTUNE_WAKE_CODEX_THREAD_CWD:-$repo_root}"
watch_latest_codex_thread="${ATTUNE_WAKE_LATEST_CODEX_THREAD:-false}"
watch_latest_active_goal="${ATTUNE_WAKE_LATEST_ACTIVE_GOAL:-false}"
ignore_worktree="${ATTUNE_WAKE_IGNORE_WORKTREE:-false}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/codex/wake-sqlite-program-index-reactive-projections.sh [options]

Token usage sources, choose one:
  --token-usage-command <cmd>
                             Run a command that prints JSON with token usage.
  --token-usage-file <path>  Read JSON token usage from a file.
  --codex-goal-id <id>       Read token usage for a local Codex goal.
  --codex-thread-id <id>     Read token usage for a local Codex thread.
  --latest-active-goal       Read the latest active local Codex goal in this repo.
                             This is the default if no token source is supplied.
  --latest-codex-thread      Read the latest local Codex thread in this repo.

Supported token usage JSON fields:
  used, used_tokens, total_tokens, input_tokens/output_tokens
  limit, limit_tokens, token_budget, budget
  remaining, remaining_tokens
  percent, usage_percent

Completion sources, optional secondary gates:
  --cloud-task-id <id>       Poll codex cloud list/status for this task id.
  --latest-cloud-task        Poll the latest task from codex cloud list --json.
  --completion-command <cmd> Run a local command; exit 0 means complete.

Options:
  --cloud-env <id>           Pass --env to codex cloud list.
  --token-usage-percent <n>  Wake when usage is at or above n percent.
                             Default: 95 if token usage is configured.
  --token-remaining-max <n>  Wake when remaining tokens are at or below n.
  --token-used-min <n>       Wake when used tokens are at or above n.
  --codex-thread-cwd <path>  Local Codex thread cwd filter. Default: repo root.
  --poll-seconds <seconds>   Poll interval. Default: 300.
  --stable-polls <count>     Required clean-worktree polls after completion. Default: 2.
  --ignore-worktree          Wake even if unrelated dirty paths remain.
  --action <codex|prompt>    Launch codex exec or only write the prompt. Default: codex.
  --sandbox <mode>           codex exec sandbox. Default: workspace-write.
  --approval <policy>        codex exec approval policy. Default: never.

Environment mirrors the options:
  ATTUNE_WAKE_CLOUD_TASK_ID
  ATTUNE_WAKE_CLOUD_ENV
  ATTUNE_WAKE_WATCH_LATEST
  ATTUNE_WAKE_COMPLETION_COMMAND
  ATTUNE_WAKE_TOKEN_USAGE_COMMAND
  ATTUNE_WAKE_TOKEN_USAGE_FILE
  ATTUNE_WAKE_TOKEN_USAGE_PERCENT
  ATTUNE_WAKE_TOKEN_REMAINING_MAX
  ATTUNE_WAKE_TOKEN_USED_MIN
  ATTUNE_WAKE_CODEX_GOAL_ID
  ATTUNE_WAKE_CODEX_THREAD_ID
  ATTUNE_WAKE_CODEX_THREAD_CWD
  ATTUNE_WAKE_LATEST_CODEX_THREAD
  ATTUNE_WAKE_LATEST_ACTIVE_GOAL
  ATTUNE_WAKE_IGNORE_WORKTREE
USAGE
}

truthy() {
  case "${1,,}" in
    1 | true | yes | y | on) return 0 ;;
    *) return 1 ;;
  esac
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --poll-seconds)
      poll_seconds="$2"
      shift 2
      ;;
    --stable-polls)
      stable_polls_required="$2"
      shift 2
      ;;
    --action)
      action="$2"
      shift 2
      ;;
    --sandbox)
      sandbox="$2"
      shift 2
      ;;
    --approval)
      approval_policy="$2"
      shift 2
      ;;
    --cloud-task-id)
      cloud_task_id="$2"
      shift 2
      ;;
    --cloud-env)
      cloud_env="$2"
      shift 2
      ;;
    --token-usage-command)
      token_usage_command="$2"
      shift 2
      ;;
    --token-usage-file)
      token_usage_file="$2"
      shift 2
      ;;
    --token-usage-percent)
      token_usage_percent="$2"
      shift 2
      ;;
    --token-remaining-max)
      token_remaining_max="$2"
      shift 2
      ;;
    --token-used-min)
      token_used_min="$2"
      shift 2
      ;;
    --codex-thread-id)
      codex_thread_id="$2"
      shift 2
      ;;
    --codex-goal-id)
      codex_goal_id="$2"
      shift 2
      ;;
    --codex-thread-cwd)
      codex_thread_cwd="$2"
      shift 2
      ;;
    --latest-codex-thread)
      watch_latest_codex_thread="true"
      shift
      ;;
    --latest-active-goal)
      watch_latest_active_goal="true"
      shift
      ;;
    --latest-cloud-task)
      watch_latest_cloud_task="true"
      shift
      ;;
    --completion-command)
      completion_command="$2"
      shift 2
      ;;
    --ignore-worktree)
      ignore_worktree="true"
      shift
      ;;
    --delay-seconds)
      echo "--delay-seconds was removed; configure a Codex Cloud task or completion command instead." >&2
      exit 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$token_usage_command" && -z "$token_usage_file" && -z "$codex_thread_id" && -z "$codex_goal_id" ]] &&
  ! truthy "$watch_latest_codex_thread" &&
  ! truthy "$watch_latest_active_goal"; then
  watch_latest_active_goal="true"
fi

if [[ -z "$token_usage_percent" && -z "$token_remaining_max" && -z "$token_used_min" ]]; then
  token_usage_percent="95"
fi

state_dir="$repo_root/.attune/cache/codex-wake/$change_id"
mkdir -p "$state_dir"

lock_file="$state_dir/watcher.lock"
pid_file="$state_dir/watcher.pid"
watcher_log="$state_dir/watcher.log"
codex_log="$state_dir/codex-exec.log"
prompt_file="$state_dir/wake-prompt.md"
ready_file="$state_dir/ready.json"
blocking_file="$state_dir/blocking-status.txt"
completion_file="$state_dir/completion-status.json"
token_usage_status_file="$state_dir/token-usage-status.json"
token_usage_error_file="$state_dir/token-usage.stderr"
cloud_list_error_file="$state_dir/codex-cloud-list.stderr"
cloud_status_file="$state_dir/codex-cloud-status.txt"

exec 9>"$lock_file"
if ! flock -n 9; then
  echo "Watcher is already running for $change_id." >&2
  exit 0
fi
printf '%s\n' "$$" >"$pid_file"
trap 'rm -f "$pid_file"' EXIT

log() {
  printf '[%s] %s\n' "$(date -Is)" "$*" | tee -a "$watcher_log"
}

write_prompt() {
  cat >"$prompt_file" <<'PROMPT'
You are Codex working in /home/becker/projects/attune.

Resume the heavy migration for OpenSpec change:

  sqlite-program-index-reactive-projections

This wake hook fired because the configured Codex token-usage threshold was
reached. Any optional Codex Cloud task or completion command also reported
completion, and the local worktree no longer showed unrelated active migration
paths unless explicitly overridden.

Before editing:
1. Read AGENTS.md.
2. Run git status --short.
3. Treat any unrelated dirty files as another agent/user's work. Do not revert or overwrite them.
4. Read openspec/changes/sqlite-program-index-reactive-projections/{proposal.md,design.md,tasks.md} and the delta specs.

Goal:
Continue the SQLite program index + reactive protocol projections migration from the current implementation. Prefer the next safe integration slice:
- reconcile program-index implementation with current package-contract/compress-surface migration state,
- route existing check/repair internals toward the program index when safe,
- remove, quarantine, archive, or replace old attune.package.ts/generated-companion/artifact-ownership/typecheck/generated-contract surfaces instead of preserving compatibility adapters,
- run the smallest Nx-owned validation that proves the slice.

Safety:
- Do not touch unrelated dirty files.
- If the worktree is still actively changing outside this migration, stop and write a handoff instead of editing.
- Keep public workflow centered on attune-check and attune-repair.
- Do not hand-edit raw SQLite rows, generated ledgers, or report artifacts as source truth.

Report:
Use the Attune reporting shape: Changed, Validated, Not run, Risks, Follow-ups.
PROMPT
}

is_allowed_path() {
  local path="$1"
  case "$path" in
    AGENTS.md) return 0 ;;
    "docs/attuned/Attune Framework Operating Surface.md") return 0 ;;
    framework/language-service/src/index.ts) return 0 ;;
    framework/language-service/test/framework-language-service.test.ts) return 0 ;;
    framework/nx/package.json) return 0 ;;
    framework/nx/src/index.ts) return 0 ;;
    framework/nx/src/ProgramGraphIndex.ts) return 0 ;;
    framework/nx/test/framework-nx.test.ts) return 0 ;;
    framework/nx/vitest.config.ts) return 0 ;;
    framework/protocol/src/source/index.ts) return 0 ;;
    framework/runtime/src/index.ts) return 0 ;;
    framework/runtime/src/ProgramIndexProjection.ts) return 0 ;;
    framework/runtime/test/framework-runtime.test.ts) return 0 ;;
    framework/sqlite/src/index.ts) return 0 ;;
    framework/sqlite/src/ProgramIndex.ts) return 0 ;;
    framework/sqlite/test/framework-sqlite.test.ts) return 0 ;;
    openspec/changes/sqlite-program-index-reactive-projections/*) return 0 ;;
    scripts/codex/wake-sqlite-program-index-reactive-projections.sh) return 0 ;;
    scripts/codex/*) return 0 ;;
    .attune/cache/codex-wake/sqlite-program-index-reactive-projections/*) return 0 ;;
    *) return 1 ;;
  esac
}

blocking_status() {
  if truthy "$ignore_worktree"; then
    return 0
  fi

  git -C "$repo_root" status --porcelain=v1 --untracked-files=all |
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      local path="${line:3}"
      if [[ "$path" == *" -> "* ]]; then
        path="${path##* -> }"
      fi
      if ! is_allowed_path "$path"; then
        printf '%s\n' "$line"
      fi
    done
}

write_json_string() {
  node -e 'process.stdout.write(JSON.stringify(process.argv[1] ?? ""))' "$1"
}

write_completion_state() {
  local state="$1"
  local detail="$2"

  cat >"$completion_file" <<JSON
{
  "state": $(write_json_string "$state"),
  "detail": $(write_json_string "$detail"),
  "checkedAt": $(write_json_string "$(date -Is)")
}
JSON
}

run_completion_command() {
  local output

  set +e
  output="$(bash -lc "$completion_command" 2>&1)"
  local status=$?
  set -e

  if (( status == 0 )); then
    write_completion_state "complete" "$output"
    return 0
  fi

  write_completion_state "pending" "$output"
  return 1
}

parse_token_usage_json() {
  local raw_json="$1"

  TOKEN_USAGE_JSON="$raw_json" \
  TOKEN_USAGE_PERCENT_THRESHOLD="$token_usage_percent" \
  TOKEN_REMAINING_MAX="$token_remaining_max" \
  TOKEN_USED_MIN="$token_used_min" \
  node <<'NODE'
const raw = process.env.TOKEN_USAGE_JSON ?? "";
const percentThresholdRaw = process.env.TOKEN_USAGE_PERCENT_THRESHOLD ?? "";
const remainingMaxRaw = process.env.TOKEN_REMAINING_MAX ?? "";
const usedMinRaw = process.env.TOKEN_USED_MIN ?? "";
const percentThreshold = percentThresholdRaw === "" ? null : Number(percentThresholdRaw);
const remainingMax = remainingMaxRaw === "" ? null : Number(remainingMaxRaw);
const usedMin = usedMinRaw === "" ? null : Number(usedMinRaw);

const numberFrom = (...values) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
};

const data = JSON.parse(raw);
const usage = data.usage ?? data.token_usage ?? data.tokens ?? data;
const nestedTotal = usage.total ?? usage.current ?? {};
const input = numberFrom(usage.input_tokens, usage.input, nestedTotal.input_tokens, nestedTotal.input);
const output = numberFrom(usage.output_tokens, usage.output, nestedTotal.output_tokens, nestedTotal.output);
const used = numberFrom(
  usage.used,
  usage.used_tokens,
  usage.total_tokens,
  usage.consumed,
  usage.consumed_tokens,
  input !== null || output !== null ? (input ?? 0) + (output ?? 0) : null,
);
const limit = numberFrom(
  usage.limit,
  usage.limit_tokens,
  usage.token_limit,
  usage.token_budget,
  usage.budget,
  usage.max,
);
const remaining = numberFrom(
  usage.remaining,
  usage.remaining_tokens,
  usage.tokens_remaining,
  used !== null && limit !== null ? limit - used : null,
);
let percent = numberFrom(usage.percent, usage.usage_percent, usage.percent_used);
if (percent !== null && percent <= 1) percent = percent * 100;
if (percent === null && used !== null && limit !== null && limit > 0) {
  percent = (used / limit) * 100;
}

const percentReady = percentThreshold !== null && percent !== null && percent >= percentThreshold;
const remainingReady = remainingMax !== null && remaining !== null && remaining <= remainingMax;
const usedReady = usedMin !== null && used !== null && used >= usedMin;
const ready = percentReady || remainingReady || usedReady;
const missing = [];
if (percentThreshold !== null && percent === null) missing.push("percent/used+limit");
if (remainingMax !== null && remaining === null) missing.push("remaining or used+limit");
if (usedMin !== null && used === null) missing.push("used");

const detailParts = [];
if (percent !== null) detailParts.push(`usage ${percent.toFixed(2)}%`);
if (used !== null) detailParts.push(`used ${used}`);
if (limit !== null) detailParts.push(`limit ${limit}`);
if (remaining !== null) detailParts.push(`remaining ${remaining}`);
if (missing.length > 0) detailParts.push(`missing ${missing.join(", ")}`);

console.log(JSON.stringify({
  state: ready ? "complete" : "pending",
  detail: detailParts.join("; ") || "token usage JSON did not include recognized fields",
  tokenUsage: {
    used,
    limit,
    remaining,
    percent,
    percentThreshold,
    remainingMax,
    usedMin,
  },
  source: usage.source ?? data.source ?? null,
  threadId: usage.threadId ?? data.threadId ?? null,
  goalId: usage.goalId ?? data.goalId ?? null,
  goalStatus: usage.goalStatus ?? data.goalStatus ?? null,
  checkedAt: new Date().toISOString(),
}));

process.exit(ready ? 0 : 1);
NODE
}

read_local_codex_token_usage() {
  CODEX_THREAD_ID="$codex_thread_id" \
  CODEX_GOAL_ID="$codex_goal_id" \
  CODEX_THREAD_CWD="$codex_thread_cwd" \
  CODEX_LATEST_THREAD="$watch_latest_codex_thread" \
  CODEX_LATEST_ACTIVE_GOAL="$watch_latest_active_goal" \
  node <<'NODE'
const { DatabaseSync } = require("node:sqlite");

const home = process.env.HOME;
const stateDbPath = `${home}/.codex/state_5.sqlite`;
const goalsDbPath = `${home}/.codex/goals_1.sqlite`;
const threadId = process.env.CODEX_THREAD_ID ?? "";
const cwd = process.env.CODEX_THREAD_CWD ?? process.cwd();
const latestThread = /^(1|true|yes|y|on)$/i.test(process.env.CODEX_LATEST_THREAD ?? "");
const latestActiveGoal = /^(1|true|yes|y|on)$/i.test(process.env.CODEX_LATEST_ACTIVE_GOAL ?? "");

const stateDb = new DatabaseSync(stateDbPath, { readOnly: true });
stateDb.exec(`attach database '${goalsDbPath.replaceAll("'", "''")}' as goals`);

const selectRows = (sql, ...params) => stateDb.prepare(sql).all(...params);
const goalId = process.env.CODEX_GOAL_ID ?? "";
let rows;
if (goalId) {
  rows = selectRows(`
    select
      t.id as thread_id,
      t.cwd,
      t.title,
      t.tokens_used as thread_tokens_used,
      t.updated_at_ms as thread_updated_at_ms,
      g.goal_id,
      g.status as goal_status,
      g.token_budget,
      g.tokens_used as goal_tokens_used,
      g.updated_at_ms as goal_updated_at_ms
    from goals.thread_goals g
    join threads t on t.id = g.thread_id
    where g.goal_id = ?
    order by coalesce(g.updated_at_ms, t.updated_at_ms, t.updated_at, t.created_at_ms, t.created_at) desc
    limit 1
  `, goalId);
} else if (threadId) {
  rows = selectRows(`
    select
      t.id as thread_id,
      t.cwd,
      t.title,
      t.tokens_used as thread_tokens_used,
      t.updated_at_ms as thread_updated_at_ms,
      g.goal_id,
      g.status as goal_status,
      g.token_budget,
      g.tokens_used as goal_tokens_used,
      g.updated_at_ms as goal_updated_at_ms
    from threads t
    left join goals.thread_goals g on g.thread_id = t.id
    where t.id = ?
    order by coalesce(g.updated_at_ms, t.updated_at_ms, t.updated_at, t.created_at_ms, t.created_at) desc
    limit 1
  `, threadId);
} else if (latestActiveGoal) {
  rows = selectRows(`
    select
      t.id as thread_id,
      t.cwd,
      t.title,
      t.tokens_used as thread_tokens_used,
      t.updated_at_ms as thread_updated_at_ms,
      g.goal_id,
      g.status as goal_status,
      g.token_budget,
      g.tokens_used as goal_tokens_used,
      g.updated_at_ms as goal_updated_at_ms
    from goals.thread_goals g
    join threads t on t.id = g.thread_id
    where t.cwd = ? and g.status = 'active'
    order by coalesce(g.updated_at_ms, t.updated_at_ms, t.updated_at, t.created_at_ms, t.created_at) desc
    limit 1
  `, cwd);
} else if (latestThread) {
  rows = selectRows(`
    select
      t.id as thread_id,
      t.cwd,
      t.title,
      t.tokens_used as thread_tokens_used,
      t.updated_at_ms as thread_updated_at_ms,
      g.goal_id,
      g.status as goal_status,
      g.token_budget,
      g.tokens_used as goal_tokens_used,
      g.updated_at_ms as goal_updated_at_ms
    from threads t
    left join goals.thread_goals g on g.thread_id = t.id
    where t.cwd = ?
    order by coalesce(t.updated_at_ms, t.updated_at, t.created_at_ms, t.created_at) desc
    limit 1
  `, cwd);
} else {
  rows = [];
}

stateDb.close();

const row = rows[0];
if (!row) {
  console.log(JSON.stringify({
    source: "local-codex",
    used: null,
    limit: null,
    remaining: null,
    detail: goalId
      ? `No local Codex goal found for ${goalId}`
      : threadId
      ? `No local Codex thread found for ${threadId}`
      : `No matching local Codex token usage row found for cwd ${cwd}`,
  }));
  process.exit(0);
}

const used = row.goal_tokens_used ?? row.thread_tokens_used ?? null;
const limit = row.token_budget ?? null;
console.log(JSON.stringify({
  source: "local-codex",
  used,
  limit,
  remaining: used !== null && limit !== null ? limit - used : null,
  threadId: row.thread_id,
  goalId: row.goal_id ?? null,
  goalStatus: row.goal_status ?? null,
  cwd: row.cwd,
  title: row.title ? String(row.title).slice(0, 160) : null,
}));
NODE
}

token_usage_ready() {
  local json

  if [[ -n "$token_usage_command" ]]; then
    set +e
    json="$(bash -lc "$token_usage_command" 2>"$token_usage_error_file")"
    local command_status=$?
    set -e

    if (( command_status != 0 )); then
      cat >"$token_usage_status_file" <<JSON
{
  "state": "pending",
  "detail": "token usage command failed; see $token_usage_error_file",
  "checkedAt": "$(date -Is)"
}
JSON
      return 1
    fi
  elif [[ -n "$token_usage_file" ]]; then
    if [[ ! -f "$token_usage_file" ]]; then
      cat >"$token_usage_status_file" <<JSON
{
  "state": "pending",
  "detail": "token usage file does not exist: $token_usage_file",
  "checkedAt": "$(date -Is)"
}
JSON
      return 1
    fi
    json="$(cat "$token_usage_file")"
  else
    set +e
    json="$(read_local_codex_token_usage 2>"$token_usage_error_file")"
    local local_status=$?
    set -e

    if (( local_status != 0 )); then
      cat >"$token_usage_status_file" <<JSON
{
  "state": "pending",
  "detail": "local Codex token usage read failed; see $token_usage_error_file",
  "checkedAt": "$(date -Is)"
}
JSON
      return 1
    fi
  fi

  local parsed
  set +e
  parsed="$(parse_token_usage_json "$json")"
  local parse_status=$?
  set -e

  printf '%s\n' "$parsed" >"$token_usage_status_file"
  return "$parse_status"
}

parse_codex_cloud_list() {
  local raw_json="$1"

  CODEX_CLOUD_LIST_JSON="$raw_json" \
  TARGET_TASK_ID="$cloud_task_id" node <<'NODE'
const raw = process.env.CODEX_CLOUD_LIST_JSON ?? "";
const targetTaskId = process.env.TARGET_TASK_ID ?? "";
const terminalStatuses = new Set([
  "ready",
  "complete",
  "completed",
  "success",
  "succeeded",
  "finished",
  "done",
  "failed",
  "failure",
  "canceled",
  "cancelled",
  "expired",
]);

const data = JSON.parse(raw);
const tasks = Array.isArray(data) ? data : data.tasks ?? data.items ?? data.data ?? [];
const idOf = (task) => String(task.id ?? task.task_id ?? task.taskId ?? "");
const statusOf = (task) => String(task.status ?? task.state ?? task.phase ?? "").toLowerCase();
const task = targetTaskId
  ? tasks.find((candidate) => idOf(candidate) === targetTaskId)
  : tasks[0];

if (!task) {
  console.log(JSON.stringify({
    state: "missing",
    detail: targetTaskId
      ? `Codex Cloud task not present in list: ${targetTaskId}`
      : "Codex Cloud list did not return a latest task",
    checkedAt: new Date().toISOString(),
  }));
  process.exit(3);
}

const status = statusOf(task);
const terminal = terminalStatuses.has(status);
console.log(JSON.stringify({
  state: terminal ? "complete" : "pending",
  detail: `task ${idOf(task)} status ${status || "(unknown)"}`,
  task: {
    id: idOf(task),
    status,
    title: task.title ?? null,
    url: task.url ?? null,
    updated_at: task.updated_at ?? task.updatedAt ?? null,
    environment_id: task.environment_id ?? task.environmentId ?? null,
    environment_label: task.environment_label ?? task.environmentLabel ?? null,
  },
  checkedAt: new Date().toISOString(),
}));
process.exit(terminal ? 0 : 1);
NODE
}

run_codex_cloud_list() {
  local args=(cloud list --json --limit 25)

  if [[ -n "$cloud_env" ]]; then
    args+=(--env "$cloud_env")
  fi

  codex "${args[@]}"
}

run_codex_cloud_status_fallback() {
  if [[ -z "$cloud_task_id" ]]; then
    write_completion_state "pending" "No task id configured for codex cloud status fallback."
    return 1
  fi

  local output
  set +e
  output="$(codex cloud status "$cloud_task_id" 2>&1)"
  local status=$?
  set -e

  printf '%s\n' "$output" >"$cloud_status_file"

  if (( status != 0 )); then
    write_completion_state "pending" "codex cloud status failed; see $cloud_status_file"
    return 1
  fi

  if grep -Eiq 'ready|complete|completed|success|succeeded|finished|done|failed|failure|cancell?ed|expired' "$cloud_status_file"; then
    write_completion_state "complete" "codex cloud status reports terminal state; see $cloud_status_file"
    return 0
  fi

  write_completion_state "pending" "codex cloud status does not yet report a terminal state; see $cloud_status_file"
  return 1
}

run_codex_cloud_completion() {
  local json
  set +e
  json="$(run_codex_cloud_list 2>"$cloud_list_error_file")"
  local list_status=$?
  set -e

  if (( list_status != 0 )); then
    write_completion_state "pending" "codex cloud list failed; see $cloud_list_error_file"
    run_codex_cloud_status_fallback
    return $?
  fi

  local parsed
  set +e
  parsed="$(parse_codex_cloud_list "$json")"
  local parse_status=$?
  set -e

  printf '%s\n' "$parsed" >"$completion_file"

  if (( parse_status == 3 && -n "$cloud_task_id" )); then
    run_codex_cloud_status_fallback
    return $?
  fi

  return "$parse_status"
}

completion_ready() {
  if [[ -n "$completion_command" ]]; then
    run_completion_command
  elif [[ -n "$cloud_task_id" ]] || truthy "$watch_latest_cloud_task"; then
    run_codex_cloud_completion
  else
    write_completion_state "complete" "No secondary completion source configured."
    return 0
  fi
}

write_prompt
log "Started state-gated watcher for $change_id."
if [[ -n "$token_usage_command" ]]; then
  log "Token usage source: custom command."
elif [[ -n "$token_usage_file" ]]; then
  log "Token usage source: $token_usage_file."
elif [[ -n "$codex_goal_id" ]]; then
  log "Token usage source: local Codex goal $codex_goal_id."
elif [[ -n "$codex_thread_id" ]]; then
  log "Token usage source: local Codex thread $codex_thread_id."
elif truthy "$watch_latest_codex_thread"; then
  log "Token usage source: latest local Codex thread for $codex_thread_cwd."
else
  log "Token usage source: latest active local Codex goal for $codex_thread_cwd."
fi
if [[ -n "$token_usage_percent" ]]; then
  log "Token usage threshold: >= ${token_usage_percent}%."
fi
if [[ -n "$token_remaining_max" ]]; then
  log "Token remaining threshold: <= ${token_remaining_max}."
fi
if [[ -n "$token_used_min" ]]; then
  log "Token used threshold: >= ${token_used_min}."
fi
if [[ -n "$completion_command" ]]; then
  log "Secondary completion source: custom command."
elif [[ -n "$cloud_task_id" ]]; then
  log "Secondary completion source: Codex Cloud task $cloud_task_id."
elif truthy "$watch_latest_cloud_task"; then
  log "Secondary completion source: latest Codex Cloud task."
else
  log "Secondary completion source: none."
fi
if [[ -n "$cloud_env" ]]; then
  log "Codex Cloud environment filter: $cloud_env."
fi
if truthy "$ignore_worktree"; then
  log "Worktree blocker check is disabled."
fi
log "Action: $action; sandbox: $sandbox; approval: $approval_policy"

stable_polls=0
while true; do
  if token_usage_ready; then
    token_usage_is_ready=true
  else
    token_usage_is_ready=false
  fi

  if completion_ready; then
    completion_is_ready=true
  else
    completion_is_ready=false
  fi

  blockers="$(blocking_status || true)"
  if [[ -z "$blockers" ]]; then
    if [[ "$token_usage_is_ready" == true && "$completion_is_ready" == true ]]; then
      stable_polls="$((stable_polls + 1))"
      log "Token threshold and completion gate are ready; no blocking dirty paths detected ($stable_polls/$stable_polls_required stable polls)."
    else
      stable_polls=0
      log "Waiting: token-ready=$token_usage_is_ready completion-ready=$completion_is_ready; no blocking dirty paths detected."
    fi
    : >"$blocking_file"
  else
    stable_polls=0
    printf '%s\n' "$blockers" >"$blocking_file"
    if [[ "$token_usage_is_ready" == true && "$completion_is_ready" == true ]]; then
      log "Token threshold and completion gate are ready, but blocking dirty paths remain. See $blocking_file."
    else
      log "Waiting: token-ready=$token_usage_is_ready completion-ready=$completion_is_ready; blocking dirty paths remain. See $blocking_file."
    fi
  fi

  if [[ "$token_usage_is_ready" == true && "$completion_is_ready" == true ]] && (( stable_polls >= stable_polls_required )); then
    break
  fi

  sleep "$poll_seconds"
done

cat >"$ready_file" <<JSON
{
  "changeId": "$change_id",
  "readyAt": "$(date -Is)",
  "tokenUsageStatusFile": "$token_usage_status_file",
  "completionStatusFile": "$completion_file",
  "action": "$action",
  "promptFile": "$prompt_file",
  "codexLog": "$codex_log"
}
JSON

log "Wake conditions satisfied. Prompt written to $prompt_file."

case "$action" in
  prompt)
    log "Prompt-only mode selected; not launching Codex."
    ;;
  codex)
    if ! command -v codex >/dev/null 2>&1; then
      log "codex command not found; prompt is ready at $prompt_file."
      exit 1
    fi
    log "Launching codex exec. Output: $codex_log"
    codex exec \
      --cd "$repo_root" \
      --sandbox "$sandbox" \
      --ask-for-approval "$approval_policy" \
      "$(cat "$prompt_file")" \
      >>"$codex_log" 2>&1
    log "codex exec finished with exit code $?."
    ;;
  *)
    log "Unknown action: $action"
    exit 2
    ;;
esac
