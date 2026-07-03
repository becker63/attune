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

type AuditCommit = {
  readonly issue: string
  readonly sha: string
}

type GithubBranch = {
  readonly name: string
  readonly commit: { readonly sha: string }
}

type GithubCommit = {
  readonly sha: string
}

type GithubPull = {
  readonly html_url: string
  readonly state: string
  readonly head: { readonly sha: string }
}

export function runPrRecoveryAudit(): void {
  const repo = process.env.GITHUB_REPOSITORY ?? "becker63/attune"
  const commits = readAuditCommits()

  const pulls = curlJson<readonly GithubPull[]>(repo, "pulls?state=all&per_page=100")
  const branches = curlJson<readonly GithubBranch[]>(repo, "branches?per_page=100")
  const recentCommits = curlJson<readonly GithubCommit[]>(repo, "commits?per_page=100")

  console.log(`GitHub PR recovery audit for ${repo}`)
  console.log("")
  console.log("| Issue | Commit | Branch found | PR found | Recovery state |")
  console.log("| --- | --- | --- | --- | --- |")

  for (const { issue, sha } of commits) {
    const normalized = sha.toLowerCase()
    const branch = branches.find((candidate) => candidate.commit.sha.toLowerCase().startsWith(normalized))
    const commit = recentCommits.find((candidate) => candidate.sha.toLowerCase().startsWith(normalized))
    const pr = pulls.find((candidate) => candidate.head.sha.toLowerCase().startsWith(normalized))
    const branchText = branch !== undefined ? branch.name : commit !== undefined ? "commit visible, branch not in first page" : "not found"
    const prText = pr !== undefined ? `${pr.html_url} (${pr.state})` : "not found"
    const state = pr !== undefined
      ? "PR exists; attach/comment URL on Linear if missing"
      : branch !== undefined || commit !== undefined
        ? "commit exists but PR missing; create PR against main"
        : "no visible commit/branch; recover Codex artifact or re-run work"
    console.log(`| ${issue} | \`${sha}\` | ${branchText} | ${prText} | ${state} |`)
  }
}

function readAuditCommits(): readonly AuditCommit[] {
  return (process.env.CODEX_AUDIT_COMMITS ?? "ATT-14:09e2046,ATT-21:a4863a5,ATT-23:731ffce,ATT-24:3aa231c,ATT-8:f6a931a")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [issue = "", sha = ""] = entry.split(":")
      return { issue, sha }
    })
}

function curlJson<T>(repo: string, path: string): T {
  return JSON.parse(execFileSync("curl", [
    "-fsSL",
    "-H",
    "Accept: application/vnd.github+json",
    "-H",
    "User-Agent: attune-codex-pr-recovery-audit",
    `https://api.github.com/repos/${repo}/${path}`,
  ], { encoding: "utf8" })) as T
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPrRecoveryAudit()
}

export const ArchitecturePrRecoveryAuditRecipeId =
  "attune-architecture.pr-recovery-audit" as const
const ArchitectureWorkspacePolicyRecipeId = "attune-architecture.workspace-policy" as const
const ArchitecturePrRecoveryAuditSourcePath =
  "packages/trellis/architecture/src/internal/checks/PrRecoveryAuditCli.ts" as const

const ArchitecturePrRecoveryAuditInput = Schema.Struct({
  workspaceRoot: Schema.String,
  recipeId: Schema.String,
})
type ArchitecturePrRecoveryAuditInput = typeof ArchitecturePrRecoveryAuditInput.Type

const ArchitecturePrRecoveryAuditOutput = Schema.Struct({
  scriptPath: Schema.String,
  invocationModel: Schema.Literal("RecipeInvocation"),
  validationTargetHandles: Schema.Array(Schema.String),
})
type ArchitecturePrRecoveryAuditOutput = typeof ArchitecturePrRecoveryAuditOutput.Type

export const projectPrRecoveryAuditInvocation = (
  _input: ArchitecturePrRecoveryAuditInput,
): ArchitecturePrRecoveryAuditOutput => ({
  scriptPath: ArchitecturePrRecoveryAuditSourcePath,
  invocationModel: "RecipeInvocation",
  validationTargetHandles: ["workspace:codex-audit-prs"],
})

export const ArchitecturePrRecoveryAuditRuntimeLayer = defineRecipeLayer({
  id: "attune-architecture.pr-recovery-audit.runtime.layer",
  sourcePath: ArchitecturePrRecoveryAuditSourcePath,
  exportName: "runPrRecoveryAudit",
  layer: Layer.empty as never,
  provides: [
    { id: "process", service: "node:child_process" },
    { id: "network", service: "github-api" },
  ],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitecturePrRecoveryAuditInputResource = defineAlchemyResource({
  id: "attune-architecture.pr-recovery-audit.input",
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  consumedBy: [ArchitecturePrRecoveryAuditRecipeId],
  addressSchema: ArchitecturePrRecoveryAuditInput,
  stateSchema: Schema.Struct({
    provider: Schema.Literal("github"),
  }),
  modes: ["read", "external"],
})

// @attune-packet-target generated-runtime-projection eligible
export const ArchitecturePrRecoveryAuditReportResource = defineAlchemyResource({
  id: "attune-architecture.pr-recovery-audit.report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: ArchitecturePrRecoveryAuditRecipeId,
  producedBy: [ArchitecturePrRecoveryAuditRecipeId],
  consumedBy: [ArchitectureWorkspacePolicyRecipeId],
  addressSchema: ArchitecturePrRecoveryAuditInput,
  stateSchema: ArchitecturePrRecoveryAuditOutput,
  modes: ["project", "observe"],
})

export const ArchitecturePrRecoveryAuditDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: ArchitecturePrRecoveryAuditRecipeId,
  toRecipeId: ArchitectureWorkspacePolicyRecipeId,
  resource: ArchitecturePrRecoveryAuditReportResource,
  kind: "invokes",
  modes: ["invoke", "observe"],
})

export const ArchitecturePrRecoveryAuditRecipe = defineInvocationRecipe({
  id: "attune-architecture.pr-recovery-audit",
  projectId: "attune-architecture",
  title: "Audit PR recovery signals through a recipe-backed Codex source check",
  inputSchema: ArchitecturePrRecoveryAuditInput,
  outputSchema: ArchitecturePrRecoveryAuditOutput,
  nxTarget: "workspace:codex-audit-prs",
  entrypoints: [ArchitecturePrRecoveryAuditSourcePath],
  allowedFiles: [ArchitecturePrRecoveryAuditSourcePath, "project.json"],
  validationEvidence: ["workspace:codex-audit-prs"],
  io: {
    inputSchema: ArchitecturePrRecoveryAuditInput,
    outputSchema: ArchitecturePrRecoveryAuditOutput,
    inputResources: [ArchitecturePrRecoveryAuditInputResource],
    outputResources: [ArchitecturePrRecoveryAuditReportResource],
  },
  handler: defineRecipeHandler<ArchitecturePrRecoveryAuditInput, ArchitecturePrRecoveryAuditOutput>({
    id: "attune-architecture.pr-recovery-audit.handler",
    recipeId: ArchitecturePrRecoveryAuditRecipeId,
    sourcePath: ArchitecturePrRecoveryAuditSourcePath,
    exportName: "projectPrRecoveryAuditInvocation",
    handler: (input) => Effect.succeed(projectPrRecoveryAuditInvocation(input)),
    layer: ArchitecturePrRecoveryAuditRuntimeLayer,
    emitsReceipts: ["attune-architecture.pr-recovery-audit.projected"],
  }),
  alchemyDag: [ArchitecturePrRecoveryAuditDagEdge],
})

export const ArchitecturePrRecoveryAuditRecipes = [
  ArchitecturePrRecoveryAuditRecipe,
] as const
