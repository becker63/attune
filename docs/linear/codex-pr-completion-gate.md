# Codex PR Completion Gate

Codex completion requires a real GitHub pull request. The `make_pr` tool and the phrase `Created PR metadata` are only local bookkeeping; they are not evidence that GitHub has a visible PR.

Before a Codex-delegated Linear issue may move to Done, the runner or human operator must verify all of the following:

1. the implementation commit exists on a branch,
2. a GitHub PR exists and targets `main`,
3. the PR URL is attached to or commented on the Linear issue,
4. the validation summary is posted to Linear,
5. only then may the Linear issue move to Done.

If PR creation fails, keep or return the issue to In Progress or Todo and comment with the failure reason. If validation fails after a PR is created, keep the issue out of Done and comment with the PR URL plus the validation failure summary. Docs/spec-only work still needs a PR unless the issue explicitly says no PR is required.

Use the verifier before moving an issue to Done:

```bash
CODEX_COMPLETION_COMMIT=<sha> \
GITHUB_PR_URL=https://github.com/becker63/attune/pull/<number> \
LINEAR_ISSUE_ID=ATT-26 \
corepack pnpm run codex:check
```

The verifier fetches the GitHub PR, confirms it targets `main`, checks that the PR head matches the completion commit, and optionally checks that the PR title or body mentions the Linear issue ID.

## Recovery audit command

Run the recovery audit whenever a human reports that Codex cloud threads are missing PRs:

```bash
corepack pnpm run codex:audit-prs
```

Override the audited issue/commit list with `CODEX_AUDIT_COMMITS`, for example:

```bash
CODEX_AUDIT_COMMITS=ATT-14:09e2046,ATT-21:a4863a5 corepack pnpm run codex:audit-prs
```

The audit intentionally reports three states: PR exists and needs Linear linking, commit exists but needs a GitHub PR against `main`, or no visible commit/branch exists and the Codex thread artifact must be recovered or the work re-run. It does not treat local `make_pr` metadata as sufficient.

## Current environment limitation

The ATT-26 cloud environment could read public GitHub state but could not push to `https://github.com/becker63/attune.git` because Git requested an interactive username. The attempted command was:

```bash
git push attune HEAD:refs/heads/codex/att-26-pr-completion-gate
```

When credentials are available, push each recovered Codex thread branch and open a GitHub PR against `main`; if credentials are not available, leave the Linear issue out of Done and comment with the exact missing branch/commit or authentication failure.

## ATT-26 recovery audit

Visible GitHub state was checked with `git fetch attune main --prune`, `git ls-remote --heads attune`, and the GitHub REST API for pulls and commits. Only `main`, `codex/linear-mention-att-8-implement-durable-eventlog-and-discov`, and PR #1 were visible at audit time.

| Issue | Reported commit | Branch/commit found | GitHub PR found or created | Linear update needed | Remaining action |
| --- | --- | --- | --- | --- | --- |
| ATT-14 | `09e2046` | Not found in visible remote refs or GitHub commits. | None created; no recoverable branch/commit was visible. | Comment recovery failure and keep out of Done until work is recovered or re-run. | Locate the Codex task branch/artifact or re-run the implementation. |
| ATT-21 | `a4863a5` | Not found in visible remote refs or GitHub commits. | None created; no recoverable branch/commit was visible. | Comment recovery failure and keep out of Done until work is recovered or re-run. | Locate the Codex task branch/artifact or re-run the implementation. |
| ATT-23 | `731ffce` | Not found in visible remote refs or GitHub commits. | None created; no recoverable branch/commit was visible. | Comment recovery failure and keep out of Done until work is recovered or re-run. | Locate the Codex task branch/artifact or re-run the implementation. |
| ATT-24 | `3aa231c` | Not found in visible remote refs or GitHub commits. | None created; no recoverable branch/commit was visible. | Comment recovery failure and keep out of Done until work is recovered or re-run. | Locate the Codex task branch/artifact or re-run the implementation. |
| ATT-8 | `f6a931a` | Found on `codex/linear-mention-att-8-implement-durable-eventlog-and-discov`. | Found: https://github.com/becker63/attune/pull/1 | Ensure PR URL is attached/commented on ATT-8. | Review/merge by human when ready. |
