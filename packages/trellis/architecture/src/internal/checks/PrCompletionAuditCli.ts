import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

type PullRequestRef = {
  readonly repo: string
  readonly number: number
}

type GithubPullRequest = {
  readonly base?: { readonly ref?: string }
  readonly head?: { readonly sha?: string }
  readonly merge_commit_sha?: string | null
  readonly html_url?: string
  readonly title?: string
  readonly body?: string | null
}

export async function runPrCompletionAudit(): Promise<void> {
  const repo = process.env.GITHUB_REPOSITORY ?? "becker63/attune"
  const issueId = process.env.LINEAR_ISSUE_ID ?? ""
  const commit = process.env.CODEX_COMPLETION_COMMIT ?? git(["rev-parse", "HEAD"])
  const explicitPrUrl = process.env.GITHUB_PR_URL ?? ""
  const requirePrCompletion = process.env.ATTUNE_REQUIRE_PR_COMPLETION === "1" ||
    explicitPrUrl.length > 0 ||
    issueId.length > 0

  if (!commit) fail("CODEX_COMPLETION_COMMIT is empty and HEAD could not be resolved")

  const prRef = explicitPrUrl ? parsePrUrl(explicitPrUrl) : undefined
  if (explicitPrUrl && prRef === undefined) {
    fail(`GITHUB_PR_URL is not a GitHub pull request URL: ${explicitPrUrl}`)
  }

  let prs: readonly GithubPullRequest[]
  try {
    prs = prRef === undefined
      ? await github<readonly GithubPullRequest[]>(`/repos/${repo}/commits/${commit}/pulls`)
      : [await github<GithubPullRequest>(`/repos/${prRef.repo}/pulls/${prRef.number}`)]
  } catch (error) {
    if (!requirePrCompletion) {
      console.log("Codex PR completion gate skipped: no PR context is available for this local commit")
      return
    }
    throw error
  }

  const matching = prs.find((pr) =>
    pr.base?.ref === "main" &&
    (pr.head?.sha === commit || pr.merge_commit_sha === commit || explicitPrUrl === pr.html_url)
  )

  if (matching === undefined) {
    if (!requirePrCompletion) {
      console.log(`Codex PR completion gate skipped: no GitHub PR targeting main was found for commit ${commit}`)
      return
    }
    fail(`no GitHub PR targeting main was found for commit ${commit}`)
  }

  if (issueId) {
    const issuePattern = new RegExp(`\\b${issueId.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "iu")
    if (!issuePattern.test(`${matching.title}\n${matching.body ?? ""}`)) {
      fail(`PR ${matching.html_url} does not mention Linear issue ${issueId}`)
    }
  }

  console.log(`Codex PR completion gate passed: ${matching.html_url}`)
}

function fail(message: string): never {
  throw new Error(`Codex PR completion gate failed: ${message}`)
}

function git(args: readonly string[]): string {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim()
  } catch {
    return ""
  }
}

async function github<T>(path: string): Promise<T> {
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
    return JSON.parse(execFileSync("curl", args, { encoding: "utf8" })) as T
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error))
  }
}

function parsePrUrl(value: string): PullRequestRef | undefined {
  const match = value.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)$/u)
  if (match === null) return undefined
  const repo = match[1]
  const number = Number(match[2])
  return repo === undefined || !Number.isFinite(number) ? undefined : { repo, number }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPrCompletionAudit().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
