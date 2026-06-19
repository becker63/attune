# Design

## Architecture

Near term:

```text
Codex app
  -> project automations
  -> Git worktrees
  -> Linear MCP/project issues
  -> local repo validation
  -> GitHub PRs where configured
```

Future:

```text
Attune orchestrator
  -> Codex SDK / app-server
  -> AgentTaskRun records
  -> Rego policy checks
  -> Linear projection
  -> Dispatch feed
```

The app-server is not the first autonomy layer. It is reserved for a local control-plane integration that needs streamed agent events, conversation history, approvals, and local protocol access.

## Safety Model

Allowed for unattended Codex automation:

- Docs.
- OpenSpec changes.
- Issue decomposition.
- Small schema/model proposals.
- Fuzzer smoke/workbench summaries.
- Axiom query summaries.
- README/report updates.
- Generated examples and fixtures when they do not alter safety boundaries.

Human-reviewed before merge:

- Rego policy.
- Nix changes.
- Kubernetes provider behavior.
- Scheduler/admission logic.
- Budget, lease, and worker safety.
- Long-running fuzzer workload changes.
- App-server exposure beyond loopback.

Automations must be PR-only or report-only. They must not silently merge.

## Weekly Shipping Cadence

The one-week rail is:

1. Day 1: workstation docs, scripts, Linear issues, and automations.
2. Day 2: product artifact schemas and issue template.
3. Day 3: pattern discovery report prototype.
4. Day 4: fuzzer workbench summaries and proof recipe promotion.
5. Day 5: AgentTaskRun model and Dispatch event shape.
6. Day 6: Linear projection clean-slate guard.
7. Day 7: review, consolidate PRs, and choose human-reviewed safety tasks.

This cadence assumes small PRs and a strict bias toward done, reviewable slices.

## Budget Routing

For a 100 USD/month Pro 5x planning assumption:

- Status, triage, and issue decomposition should use the smallest practical model.
- Implementation should favor one issue per turn.
- Fuzzer automation should upload or reference compact summaries, not raw event dumps.
- Long Joern/fuzzer burns should be human-started and summarized afterward.
- If limits get tight, suspend routine automations before suspending implementation.

Approximate daily token discipline:

- 2 low-cost reporting/check automations.
- 1 low-risk implementation attempt.
- 1 fuzzer scout or Axiom summary.
- 1 human-driven deep implementation session when needed.

## Attune Dispatch

Dispatch is the calm feed:

```text
Codex / Linear / GitHub / validation / fuzzer
  -> Dispatch items
  -> RSS / JSON / small web view / future PWA
```

Initial dispatch item types:

- `agent.issue.selected`
- `agent.pr.opened`
- `agent.validation.failed`
- `agent.safety_gate.required`
- `fuzzer.workbench.completed`
- `fuzzer.counterexample.found`
- `dispatch.daily_digest`
- `workstation.health.warning`

Linear remains the work ledger. Dispatch is the readable "what happened while I was away?" surface.

## Fuzzer Workbench

The fuzzer is an agent tool, not only a correctness test.

Agent-safe fuzzer actions:

- Run smoke checks.
- Run bounded workbench checks.
- Query Axiom for recent fuzzer outcomes.
- Extract query shapes and counterexample summaries.
- Create or update Linear issues for stable findings.

Human-gated fuzzer actions:

- Multi-hour burns.
- Container resource increases.
- Workload preset changes that materially increase CPU/RAM.
- Changes to query-generation semantics.
- Automatically promoting fuzzer findings to rules.

The fuzzer should produce compact evidence packets and pointers. Raw Joern rows, large fixtures, and CPG artifacts should stay out of Axiom and out of Codex prompts unless explicitly requested.

## Workstation Scripts

The PowerShell scripts are intentionally conservative:

- Bind app-server to `127.0.0.1`.
- Use a local capability token file.
- Write logs under the user profile.
- Restart on exit.
- Do not create automations.
- Do not expose the listener to the LAN/internet.
- Do not install the startup task unless the user runs the installer script.

## Worktree Notes

Project automations should prefer worktrees for implementation tasks. Worktrees keep autonomous edits away from the foreground checkout.

Do not copy `.env` into worktrees by default. If a task needs credentials, prefer connector-scoped access or a human-started run. Secrets copied into worktrees should be explicit and minimal.
