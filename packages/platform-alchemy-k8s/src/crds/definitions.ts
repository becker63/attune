import { Schema } from "effect"

export interface AttuneCrdDefinition {
  readonly kind: string
  readonly plural: string
  readonly singular: string
  readonly shortNames: readonly string[]
  readonly spec: Schema.Top
  readonly status: Schema.Top
}

const PhaseCondition = Schema.Struct({
  type: Schema.String,
  status: Schema.Literals(["True", "False", "Unknown"]),
  reason: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  observedGeneration: Schema.optional(Schema.Number),
  lastTransitionTime: Schema.optional(Schema.String),
})

export const attuneCrdDefinitions: readonly AttuneCrdDefinition[] = [
  {
    kind: "AttuneWorkerPool",
    plural: "attuneworkerpools",
    singular: "attuneworkerpool",
    shortNames: ["adpool"],
    spec: Schema.Struct({
      workerClass: Schema.Literals(["thinkcentre-cpu", "desktop-gpu", "wsl-disposable"]),
      resourceClass: Schema.String,
      nodeSelector: Schema.optional(Schema.Record(Schema.String, Schema.String)),
      intermittent: Schema.optional(Schema.Boolean),
      gpu: Schema.optional(Schema.Boolean),
      maxConcurrentLeases: Schema.optional(Schema.Number),
      image: Schema.String,
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Pending", "Ready", "Degraded", "Offline"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      observedNodes: Schema.optional(Schema.Number),
      activeLeases: Schema.optional(Schema.Number),
    }),
  },
  {
    kind: "AttuneRepoSandbox",
    plural: "attunereposandboxes",
    singular: "attunereposandbox",
    shortNames: ["adsandbox"],
    spec: Schema.Struct({
      runId: Schema.String,
      repoUrl: Schema.String,
      trust: Schema.Literals(["untrusted", "trusted-local"]),
      workspaceClaim: Schema.String,
      allowNetworkEgress: Schema.optional(Schema.Boolean),
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Pending", "Cloning", "Ready", "Failed", "Expired"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      workspaceUri: Schema.optional(Schema.String),
    }),
  },
  {
    kind: "AttuneDiscoveryRun",
    plural: "attunediscoveryruns",
    singular: "attunediscoveryrun",
    shortNames: ["adrun"],
    spec: Schema.Struct({
      runId: Schema.String,
      repoUrl: Schema.String,
      workerPoolRef: Schema.String,
      repoSandboxRef: Schema.optional(Schema.String),
      resourceClass: Schema.String,
      phaseRefs: Schema.optional(Schema.Array(Schema.String)),
      policyRef: Schema.optional(Schema.String),
      budgetRef: Schema.optional(Schema.String),
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Pending", "Admitted", "Running", "Succeeded", "Failed"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      artifactRefs: Schema.optional(Schema.Array(Schema.String)),
      observedGeneration: Schema.optional(Schema.Number),
    }),
  },
  {
    kind: "AttunePhase",
    plural: "attunephases",
    singular: "attunephase",
    shortNames: ["adphase"],
    spec: Schema.Struct({
      runId: Schema.String,
      phase: Schema.Literals(["discovery", "indexing", "joern-query", "evidence-scoring", "report-writing"]),
      dependsOn: Schema.optional(Schema.Array(Schema.String)),
      expectedArtifactRefs: Schema.optional(Schema.Array(Schema.String)),
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Pending", "Blocked", "Running", "Succeeded", "Failed"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      startedAt: Schema.optional(Schema.String),
      completedAt: Schema.optional(Schema.String),
    }),
  },
  {
    kind: "AttuneToolJob",
    plural: "attunetooljobs",
    singular: "attunetooljob",
    shortNames: ["adtool"],
    spec: Schema.Struct({
      runId: Schema.String,
      tool: Schema.Literals(["joern", "cocoindex", "ast-grep", "oxlint", "local-model"]),
      repoSandboxRef: Schema.String,
      workerPoolRef: Schema.String,
      resourceClass: Schema.String,
      image: Schema.String,
      command: Schema.Array(Schema.String),
      timeoutSeconds: Schema.optional(Schema.Number),
      outputArtifactRefs: Schema.optional(Schema.Array(Schema.String)),
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Pending", "Running", "Succeeded", "Failed", "TimedOut"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      startedAt: Schema.optional(Schema.String),
      completedAt: Schema.optional(Schema.String),
      resultArtifactRef: Schema.optional(Schema.String),
      diagnostics: Schema.optional(Schema.String),
    }),
  },
  {
    kind: "AttuneArtifact",
    plural: "attuneartifacts",
    singular: "attuneartifact",
    shortNames: ["adartifact"],
    spec: Schema.Struct({
      runId: Schema.String,
      kind: Schema.Literals(["cpg", "index", "evidence-bundle", "report-snapshot", "diagnostics"]),
      producerRef: Schema.String,
      uri: Schema.optional(Schema.String),
      digest: Schema.optional(Schema.String),
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Pending", "Available", "Expired", "Failed"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      sizeBytes: Schema.optional(Schema.Number),
    }),
  },
  {
    kind: "AttuneBudget",
    plural: "attunebudgets",
    singular: "attunebudget",
    shortNames: ["adbudget"],
    spec: Schema.Struct({
      runId: Schema.String,
      resourceClass: Schema.String,
      maxCpu: Schema.optional(Schema.String),
      maxMemory: Schema.optional(Schema.String),
      maxDurationSeconds: Schema.optional(Schema.Number),
      maxTokens: Schema.optional(Schema.Number),
      maxGpuSeconds: Schema.optional(Schema.Number),
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Pending", "Reserved", "Exceeded", "Released"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      reserved: Schema.optional(Schema.Boolean),
      spentCpuSeconds: Schema.optional(Schema.Number),
      spentTokens: Schema.optional(Schema.Number),
    }),
  },
  {
    kind: "AttuneReport",
    plural: "attunereports",
    singular: "attunereport",
    shortNames: ["adreport"],
    spec: Schema.Struct({
      runId: Schema.String,
      snapshotArtifactRef: Schema.optional(Schema.String),
      mdxState: Schema.optional(Schema.String),
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Drafting", "Ready", "Failed"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      lastComposedAt: Schema.optional(Schema.String),
    }),
  },
  {
    kind: "AttunePolicy",
    plural: "attunepolicies",
    singular: "attunepolicy",
    shortNames: ["adpolicy"],
    spec: Schema.Struct({
      runId: Schema.String,
      repoSandboxRef: Schema.String,
      allowedTools: Schema.Array(Schema.String),
      allowNetworkEgress: Schema.optional(Schema.Boolean),
      requiresHumanReview: Schema.optional(Schema.Boolean),
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Pending", "Admitted", "Denied"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      admitted: Schema.optional(Schema.Boolean),
      reason: Schema.optional(Schema.String),
    }),
  },
  {
    kind: "JoernQuery",
    plural: "joernqueries",
    singular: "joernquery",
    shortNames: ["jq"],
    spec: Schema.Struct({
      runId: Schema.String,
      repoSandboxRef: Schema.String,
      queryTemplate: Schema.String,
      variables: Schema.optional(Schema.Record(Schema.String, Schema.String)),
      timeoutSeconds: Schema.optional(Schema.Number),
      resourceClass: Schema.String,
    }),
    status: Schema.Struct({
      phase: Schema.optional(Schema.Literals(["Pending", "Running", "Succeeded", "Failed", "TimedOut"])),
      conditions: Schema.optional(Schema.Array(PhaseCondition)),
      startedAt: Schema.optional(Schema.String),
      completedAt: Schema.optional(Schema.String),
      resultArtifactRef: Schema.optional(Schema.String),
      diagnostics: Schema.optional(Schema.String),
    }),
  },
] as const
