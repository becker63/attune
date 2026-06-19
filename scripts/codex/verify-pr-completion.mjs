#!/usr/bin/env node
import { execFileSync } from "node:child_process"

const repo = process.env.GITHUB_REPOSITORY ?? "becker63/attune"
const issueId = process.env.LINEAR_ISSUE_ID ?? ""
const commit = process.env.CODEX_COMPLETION_COMMIT ?? git(["rev-parse", "HEAD"])
const explicitPrUrl = process.env.GITHUB_PR_URL ?? ""

const fail = (message) => {
  console.error(`Codex PR completion gate failed: ${message}`)
  process.exit(1)
}

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim()
  } catch {
    return ""
  }
}

async function github(path) {
  const args = [
    "-fsSL",
    "-H",
    "Accept: application/vnd.github+json",
    "-H",
    "User-Agent: attune-codex-pr-completion-gate",
  ]
  if (process.env.GITHUB_TOKEN) {
    args.push("-H", `Authorization: Bearer ${process.env.GITHUB_TOKEN}`)
  }
  args.push(`https://api.github.com${path}`)

  try {
    return JSON.parse(execFileSync("curl", args, { encoding: "utf8" }))
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

function parsePrUrl(value) {
  const match = value.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)$/u)
  if (!match) return undefined
  return { repo: match[1], number: Number(match[2]) }
}

if (!commit) fail("CODEX_COMPLETION_COMMIT is empty and HEAD could not be resolved")

const prRef = explicitPrUrl ? parsePrUrl(explicitPrUrl) : undefined
if (explicitPrUrl && !prRef) {
  fail(`GITHUB_PR_URL is not a GitHub pull request URL: ${explicitPrUrl}`)
}

try {
  const prs = prRef
    ? [await github(`/repos/${prRef.repo}/pulls/${prRef.number}`)]
    : await github(`/repos/${repo}/commits/${commit}/pulls`)

  const matching = prs.find((pr) =>
    pr.base?.ref === "main" &&
    (pr.head?.sha === commit || pr.merge_commit_sha === commit || explicitPrUrl === pr.html_url)
  )

  if (!matching) {
    fail(`no GitHub PR targeting main was found for commit ${commit}`)
  }

  if (issueId) {
    const issuePattern = new RegExp(`\\b${issueId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu")
    if (!issuePattern.test(`${matching.title}\n${matching.body ?? ""}`)) {
      fail(`PR ${matching.html_url} does not mention Linear issue ${issueId}`)
    }
  }

  console.log(`Codex PR completion gate passed: ${matching.html_url}`)
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
