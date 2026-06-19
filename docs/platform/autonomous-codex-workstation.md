# Attune Autonomous Codex Workstation

This document defines the near-term workstation rail for getting Attune work done quickly without handing safety boundaries to unattended agents.

## Operating Model

Near term:

```text
OpenSpec
  -> Linear issue
  -> Codex app automation
  -> Git worktree
  -> local validation
  -> GitHub PR verified against the completion commit
  -> Linear update with PR URL and validation summary
  -> Dispatch digest
```

Future:

```text
Attune orchestrator
  -> Codex SDK / app-server
  -> AgentTaskRun
  -> Rego policy checks
  -> Linear projection
  -> Dispatch feed
```

The Codex app automation layer is the shipping rail now. App-server is a future local integration point for a real Attune control plane.

## Codex Completion Gate

A Codex run is not complete when local PR metadata is recorded. The runner must verify a real GitHub PR targeting `main`, attach or comment that PR URL on the Linear issue, and post validation results before moving the issue to Done. Use `corepack pnpm run codex:check` with `CODEX_COMPLETION_COMMIT`, `GITHUB_PR_URL`, and `LINEAR_ISSUE_ID` to enforce the gate documented in `docs/linear/codex-pr-completion-gate.md`.

## Budget Posture

Assume the ChatGPT Pro 5x plan at 100 USD/month unless changed. Current OpenAI pricing guidance describes Pro as starting at 100 USD/month with 5x or 20x higher Codex limits than Plus, and says actual usage depends heavily on model, task size, context, and local versus cloud work.

Workstation rules:

- Keep prompts narrow.
- Run one Linear issue per implementation attempt.
- Use the smallest practical model for reporting and triage.
- Use stronger models for architecture or nontrivial implementation.
- Avoid image generation and broad web/MCP fanout in automation.
- Use fuzzer output summaries and artifact pointers instead of raw payloads.
- Pause routine scouts before starving implementation or review work.

## Autonomous Task Classes

Codex-safe:

- Docs from OpenSpec.
- ADRs.
- Issue decomposition.
- Small schema/model proposals.
- README/report updates.
- Fuzzer smoke/workbench summaries.
- Axiom query summaries.
- Generated examples and fixtures that do not alter safety boundaries.

Human-reviewed:

- Rego policy.
- Nix changes.
- Kubernetes provider behavior.
- Scheduler/admission logic.
- Budget, lease, and worker safety.
- Long fuzzer campaigns.
- App-server non-loopback exposure.

## Attune Dispatch

Dispatch is the calm "what happened while I was away?" surface.

Initial item types:

- `agent.issue.selected`
- `agent.pr.opened`
- `agent.validation.failed`
- `agent.safety_gate.required`
- `fuzzer.workbench.completed`
- `fuzzer.counterexample.found`
- `dispatch.daily_digest`
- `workstation.health.warning`

Linear remains the ledger. Dispatch is the readable feed and future phone/PWA surface.

## Fuzzer As Agent Workbench

The fuzzer is part of the agent toolbelt.

Agents may:

- Run `joern-effect-properties` smoke checks.
- Run bounded workbench checks.
- Query recent Axiom fuzzer evidence.
- Summarize query shapes and counterexamples.
- Create Linear issues for stable findings.

Agents must not:

- Start unattended multi-hour burns.
- Increase CPU/RAM/container limits.
- Change query-generation semantics without review.
- Promote fuzzer findings directly to rules.
- Dump raw Joern rows, CPG artifacts, or giant fixtures into prompts.

## Workstation Startup

The scripts in `scripts/windows/` are conservative.

- `Start-AttuneCodexAppServer.ps1` starts `codex app-server` on `127.0.0.1` using a local capability token file and log directory.
- `Install-AttuneCodexStartupTask.ps1` registers the startup script as a user-scoped Windows scheduled task.

Do not expose app-server to LAN or internet without a separate human-reviewed change.

## One-Week Shipping Plan

Day 1:

- Spec, docs, scripts, Linear issues, automations.

Day 2:

- Product artifact schemas and issue template.

Day 3:

- Pattern discovery report prototype.

Day 4:

- Fuzzer workbench summaries and proof recipe promotion.

Day 5:

- AgentTaskRun model and Dispatch item shape.

Day 6:

- Linear projection clean-slate guard.

Day 7:

- Review, consolidate PRs, and choose the first human-reviewed safety task.
