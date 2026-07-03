import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { Effect, Layer, Schema } from "effect"

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

export const ArchitecturePrCompletionAuditRecipeId =
  "attune-architecture.pr-completion-audit" as const
const ArchitectureWorkspacePolicyRecipeId = "attune-architecture.workspace-policy" as const
const ArchitecturePrCompletionAuditSourcePath =
  "packages/trellis/architecture/src/internal/checks/PrCompletionAuditCli.ts" as const

const ArchitecturePrCompletionAuditInput = Schema.Struct({
  workspaceRoot: Schema.String,
  recipeId: Schema.String,
})
type ArchitecturePrCompletionAuditInput = typeof ArchitecturePrCompletionAuditInput.Type

const ArchitecturePrCompletionAuditOutput = Schema.Struct({
  scriptPath: Schema.String,
  invocationModel: Schema.Literal("RecipeInvocation"),
  validationTargetHandles: Schema.Array(Schema.String),
})
type ArchitecturePrCompletionAuditOutput = typeof ArchitecturePrCompletionAuditOutput.Type

export const projectPrCompletionAuditInvocation = (
  _input: ArchitecturePrCompletionAuditInput,
): ArchitecturePrCompletionAuditOutput => ({
  scriptPath: ArchitecturePrCompletionAuditSourcePath,
  invocationModel: "RecipeInvocation",
  validationTargetHandles: ["workspace:policy-fast"],
})

export const ArchitecturePrCompletionAuditRuntimeLayer = defineRecipeLayer({
  id: "attune-architecture.pr-completion-audit.runtime.layer",
  sourcePath: ArchitecturePrCompletionAuditSourcePath,
  exportName: "runPrCompletionAudit",
  layer: Layer.empty as never,
  provides: [
    { id: "process", service: "node:child_process" },
    { id: "network", service: "github-api" },
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitecturePrCompletionAuditInputResource = defineAlchemyResource({
  id: "attune-architecture.pr-completion-audit.input",
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  consumedBy: [ArchitecturePrCompletionAuditRecipeId],
  addressSchema: ArchitecturePrCompletionAuditInput,
  stateSchema: Schema.Struct({
    provider: Schema.Literal("github"),
  }),
  modes: ["read", "external"],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitecturePrCompletionAuditReportResource = defineAlchemyResource({
  id: "attune-architecture.pr-completion-audit.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: ArchitecturePrCompletionAuditRecipeId,
  producedBy: [ArchitecturePrCompletionAuditRecipeId],
  consumedBy: [ArchitectureWorkspacePolicyRecipeId],
  addressSchema: ArchitecturePrCompletionAuditInput,
  stateSchema: ArchitecturePrCompletionAuditOutput,
  modes: ["project", "observe"],
})

export const ArchitecturePrCompletionAuditDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitecturePrCompletionAuditRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitecturePrCompletionAuditReportResource,
  kind: "invokes",
  modes: ["invoke", "observe"],
})

export const ArchitecturePrCompletionAuditRecipe = defineInvocationRecipe({
  id: "attune-architecture.pr-completion-audit",
  projectId: "attune-architecture",
  title: "Verify PR completion state through a recipe-backed Codex audit",
  inputSchema: ArchitecturePrCompletionAuditInput,
  outputSchema: ArchitecturePrCompletionAuditOutput,
  nxTarget: "workspace:policy-fast",
  entrypoints: [ArchitecturePrCompletionAuditSourcePath],
  allowedFiles: [ArchitecturePrCompletionAuditSourcePath, "project.json"],
  validationEvidence: ["workspace:policy-fast"],
  io: {
    inputSchema: ArchitecturePrCompletionAuditInput,
    outputSchema: ArchitecturePrCompletionAuditOutput,
    inputResources: [ArchitecturePrCompletionAuditInputResource],
    outputResources: [ArchitecturePrCompletionAuditReportResource],
  },
  handler: defineRecipeHandler<ArchitecturePrCompletionAuditInput, ArchitecturePrCompletionAuditOutput>({
    id: "attune-architecture.pr-completion-audit.handler",
    recipeId: ArchitecturePrCompletionAuditRecipeId,
    sourcePath: ArchitecturePrCompletionAuditSourcePath,
    exportName: "projectPrCompletionAuditInvocation",
    handler: (input) => Effect.succeed(projectPrCompletionAuditInvocation(input)),
    layer: ArchitecturePrCompletionAuditRuntimeLayer,
    emitsReceipts: ["attune-architecture.pr-completion-audit.projected"],
  }),
  alchemyDag: [ArchitecturePrCompletionAuditDagEdge],
})

export const ArchitecturePrCompletionAuditRecipes = [
  ArchitecturePrCompletionAuditRecipe,
] as const
