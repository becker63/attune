#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const repo = process.env.GITHUB_REPOSITORY ?? "becker63/attune";
const commits = (process.env.CODEX_AUDIT_COMMITS ?? "ATT-14:09e2046,ATT-21:a4863a5,ATT-23:731ffce,ATT-24:3aa231c,ATT-8:f6a931a")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => {
    const [issue, sha] = entry.split(":");
    return { issue, sha };
  });

const curlJson = (path) => JSON.parse(execFileSync("curl", [
  "-fsSL",
  "-H", "Accept: application/vnd.github+json",
  "-H", "User-Agent: attune-codex-pr-recovery-audit",
  `https://api.github.com/repos/${repo}/${path}`,
], { encoding: "utf8" }));

const pulls = curlJson("pulls?state=all&per_page=100");
const branches = curlJson("branches?per_page=100");
const recentCommits = curlJson("commits?per_page=100");

console.log(`GitHub PR recovery audit for ${repo}`);
console.log("");
console.log("| Issue | Commit | Branch found | PR found | Recovery state |");
console.log("| --- | --- | --- | --- | --- |");

for (const { issue, sha } of commits) {
  const normalized = sha.toLowerCase();
  const branch = branches.find((candidate) => candidate.commit.sha.toLowerCase().startsWith(normalized));
  const commit = recentCommits.find((candidate) => candidate.sha.toLowerCase().startsWith(normalized));
  const pr = pulls.find((candidate) => candidate.head.sha.toLowerCase().startsWith(normalized));
  const branchText = branch ? branch.name : commit ? "commit visible, branch not in first page" : "not found";
  const prText = pr ? `${pr.html_url} (${pr.state})` : "not found";
  const state = pr
    ? "PR exists; attach/comment URL on Linear if missing"
    : branch || commit
      ? "commit exists but PR missing; create PR against main"
      : "no visible commit/branch; recover Codex artifact or re-run work";
  console.log(`| ${issue} | \`${sha}\` | ${branchText} | ${prText} | ${state} |`);
}
