# Add Codex Autonomous Workstation

## Summary

Create the near-term autonomous workstation rail for Attune:

```text
OpenSpec
  -> Linear issues
  -> Codex app automations on worktrees
  -> GitHub branches / PRs
  -> validation
  -> Linear and Dispatch updates
  -> human review for safety boundaries
```

The workstation should use the local Codex app and project-scoped automations now, while keeping Codex app-server as a conservative future integration point for an Attune orchestrator.

This change also makes the `joern-effect-properties` fuzzer an explicit agent workbench. Agents should be able to run cheap fuzzer smoke/workbench jobs, summarize Axiom evidence, and open small follow-up issues without triggering unattended multi-hour burns.

## Motivation

Attune now has enough infrastructure and product direction to delegate useful work. The risk is not whether Codex can make progress; the risk is unbounded autonomous work, noisy context, unsafe merges, or expensive context-heavy tasks.

The workstation rail should ship fast for one week while preserving safety:

- Codex drafts and validates.
- Worktrees isolate file changes.
- Linear remains the human work ledger.
- Dispatch summarizes what happened.
- Fuzzer work generates evidence and issues.
- Rego/Nix/Kubernetes/scheduler changes require human review.

## Plan Budget

The planning assumption is the ChatGPT Pro 5x plan starting at 100 USD/month. Current OpenAI pricing docs describe Pro 5x as 5x higher limits than Plus, with local-message windows varying by model and task size. The shipping rail should therefore optimize for small, precise tasks and avoid long context-heavy threads.

Budget posture:

- Use GPT-5.4 mini or the lowest suitable model for routine status and issue decomposition.
- Use GPT-5.4 or GPT-5.5 for implementation attempts that touch architecture.
- Avoid image generation, broad web browsing, and large MCP fanout in automations.
- Cap autonomous implementation attempts to a small number per day.
- Prefer short PRs tied to one Linear issue.
- Treat long fuzzer burns as human-started work; scheduled agents run only smoke/workbench checks.

## Scope

In scope:

- OpenSpec change for the autonomous workstation.
- Workstation doc under `docs/platform/`.
- Safe PowerShell scripts for loopback-only app-server startup and Windows startup task installation.
- Dispatch/automation issue and status model.
- Fuzzer-as-agent-workbench policy.
- Immediate Codex automations for daily dispatch, low-risk issue execution, and fuzzer scouting.

Out of scope:

- Exposing app-server to LAN or internet.
- Auto-merging PRs.
- Running long fuzz campaigns unattended.
- Building the full Attune local orchestrator.
- Moving durable truth into Linear.

## Success Criteria

- OpenSpec validates.
- Docs explain near-term Codex app automations versus future app-server/orchestrator.
- Scripts exist for conservative local app-server startup.
- Fuzzer workbench rules are documented.
- Linear issues exist for the implementation lanes.
- Codex automations are active immediately.
