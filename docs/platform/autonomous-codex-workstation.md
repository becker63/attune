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


## Codex PR Completion Gate

Codex completion for Linear-delegated work requires real GitHub pull request
evidence before a Linear issue may move to Done. `make_pr` output or a phrase
such as `Created PR metadata` is only local metadata until GitHub confirms a PR
URL.

Required completion order:

1. Commit the completed work on a branch.
2. Create or find a GitHub PR from that branch targeting `main`.
3. Ensure the PR title or body names the Linear issue identifier.
4. Attach or comment the real GitHub PR URL on the Linear issue.
5. Post the validation summary on the Linear issue.
6. Only then move the issue to Done.

If PR creation fails, keep or return the issue to In Progress/Todo, comment the
failure reason, and do not mark Done. If validation fails after PR creation,
leave the issue In Progress or blocked and comment with the PR URL plus the
failure summary. Docs/spec-only work still needs a PR unless the issue
explicitly says no PR is required and a human acknowledges that exception.

Before marking Done, run the repository gate with the completion commit and,
when available, the Linear issue and PR URL:

```bash
CODEX_COMPLETION_COMMIT=<sha> \
LINEAR_ISSUE_ID=<ATT-123> \
GITHUB_PR_URL=https://github.com/becker63/attune/pull/<number> \
corepack pnpm run codex:check
```

The gate verifies that GitHub has a PR targeting `main` for the commit and that
the PR names the Linear issue when `LINEAR_ISSUE_ID` is supplied. If the gate
fails, automation must not treat the Codex run as complete.

## ATT-26 Missing PR Audit

Public GitHub audit on 2026-06-19 found only one visible PR in
`becker63/attune`, PR #1 for ATT-8. The commits reported by the known completed
Codex runs were not present in fetched refs or GitHub commit search, so no PRs
could be recovered from GitHub without the missing branch/commit artifacts.

| Issue | Reported commit | Branch/commit found | GitHub PR found or created | Linear update state | Remaining action |
| --- | --- | --- | --- | --- | --- |
| ATT-14 | `09e2046` | Not found in `attune/main`, visible remote heads, or GitHub commit search | Not created; source commit/branch missing | Needs recovery note/link in Linear | Locate Codex task branch or rerun the slice, then open a PR targeting `main` |
| ATT-21 | `a4863a5` | Not found in `attune/main`, visible remote heads, or GitHub commit search | Not created; source commit/branch missing | Needs recovery note/link in Linear | Locate Codex task branch or rerun the slice, then open a PR targeting `main` |
| ATT-23 | `731ffce` | Not found in `attune/main`, visible remote heads, or GitHub commit search | Not created; source commit/branch missing | Needs recovery note/link in Linear | Locate Codex task branch or rerun the slice, then open a PR targeting `main` |
| ATT-24 | `3aa231c` | Not found in `attune/main`, visible remote heads, or GitHub commit search | Not created; source commit/branch missing | Needs recovery note/link in Linear | Locate Codex task branch or rerun the slice, then open a PR targeting `main` |

Audit commands used:

```bash
git remote add attune https://github.com/becker63/attune.git 2>/dev/null || true
git fetch attune main --prune
git ls-remote --heads attune
git cat-file -t <commit>
git branch -a --contains <commit>
# GitHub REST: /repos/becker63/attune/pulls?state=all&per_page=100
# GitHub REST commit search for each reported short SHA
```

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
