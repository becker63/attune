#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import process from "node:process";

const env = process.env;
const commit = env.CODEX_COMPLETION_COMMIT ?? env.GITHUB_SHA ?? "";
const prUrl = env.GITHUB_PR_URL ?? "";
const issueId = env.LINEAR_ISSUE_ID ?? "";
const baseBranch = env.CODEX_COMPLETION_BASE ?? "main";

const fail = (message) => {
  console.error(`codex PR completion verification failed: ${message}`);
  process.exitCode = 1;
};

const match = prUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)$/u);
if (!commit) fail("CODEX_COMPLETION_COMMIT or GITHUB_SHA is required.");
if (!match) fail("GITHUB_PR_URL must be a real GitHub pull request URL.");
if (process.exitCode) process.exit();

const [, owner, repo, number] = match;
const api = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
const headers = ["-H", "Accept: application/vnd.github+json", "-H", "User-Agent: attune-codex-pr-completion-check"];
let pull;
try {
  pull = JSON.parse(execFileSync("curl", ["-fsSL", ...headers, api], { encoding: "utf8" }));
} catch (error) {
  fail(`unable to fetch pull request from GitHub API: ${error.message}`);
  process.exit();
}

if (pull.base?.ref !== baseBranch) fail(`PR targets ${pull.base?.ref ?? "<unknown>"}, expected ${baseBranch}.`);
if (!pull.head?.sha) fail("PR has no head SHA in GitHub response.");
if (!pull.html_url) fail("GitHub response has no html_url.");

const expected = commit.toLowerCase();
const actual = pull.head?.sha?.toLowerCase() ?? "";
if (!actual.startsWith(expected) && !expected.startsWith(actual)) {
  fail(`PR head ${pull.head?.sha} does not match completion commit ${commit}.`);
}

if (issueId) {
  const haystack = `${pull.title ?? ""}\n${pull.body ?? ""}`.toLowerCase();
  if (!haystack.includes(issueId.toLowerCase())) fail(`PR title/body does not mention ${issueId}.`);
}

if (!process.exitCode) {
  console.log(`Verified GitHub PR ${pull.html_url} targets ${baseBranch} at ${pull.head.sha}.`);
}
