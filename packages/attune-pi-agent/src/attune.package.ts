import { Layer, Schema } from "effect"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"

import { EvidenceFixture, EvidenceMatrix } from "./schema/evidence.js"
import {
  PermissionCheck,
  PermissionProfile,
  PermissionRuleKind,
} from "./schema/permission-profile.js"
import {
  AttuneSpecConversationState,
  AttuneSpecConversationTurn,
} from "./schema/pi-conversation.js"
import { SpecInterviewInput, SpecInterviewResult } from "./schema/spec-interview.js"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViews = definePackageViews({
  reactivityKeys: [
    "attune-pi-agent.permission-profile.changed",
    "attune-pi-agent.permission-decision.changed",
    "attune-pi-agent.schema-catalog.changed",
    "attune-pi-agent.spec-conversation.changed",
    "attune-pi-agent.evidence-matrix.changed",
    "attune-pi-agent.run-artifacts.changed",
    "attune-pi-agent.generator-plan.changed",
    "attune-pi-agent.generated-diff.changed",
    "attune-pi-agent.taskplane.changed",
    "attune-pi-agent.pi-extension.changed",
  ],
  atoms: [
    "permissionDecisionAtom",
    "specConversationAtom",
    "evidenceMatrixAtom",
    "runArtifactManifestAtom",
    "generatorPlanAtom",
    "generatorDiffAtom",
    "taskplaneAtom",
    "decisionEvidenceAtom",
    "schemaCatalogAtom",
    "piExtensionBoundaryAtom",
  ],
} as const)

export const PiAgentOperationError = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
  operationId: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
})
export type PiAgentOperationError = typeof PiAgentOperationError.Type

export const PermissionDecisionInput = Schema.Struct({
  kind: PermissionRuleKind,
  subject: Schema.String,
  profile: Schema.optional(PermissionProfile),
  repoRoot: Schema.optional(Schema.String),
})
export type PermissionDecisionInput = typeof PermissionDecisionInput.Type

export const SpecConversationInput = Schema.Union([
  Schema.Struct({
    action: Schema.Literal("start"),
    rawPrompt: Schema.String,
    sessionId: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    action: Schema.Literal("answer"),
    state: AttuneSpecConversationState,
    answer: Schema.Union([Schema.String, Schema.Array(Schema.String)]),
    questionId: Schema.optional(Schema.String),
  }),
])
export type SpecConversationInput = typeof SpecConversationInput.Type

export const EvidenceMatrixResult = Schema.Struct({
  matrix: EvidenceMatrix,
  markdown: Schema.String,
})
export type EvidenceMatrixResult = typeof EvidenceMatrixResult.Type

export const RunArtifactSetSchema = Schema.Struct({
  specJson: Schema.optional(Schema.String),
  planMarkdown: Schema.optional(Schema.String),
  statusMarkdown: Schema.optional(Schema.String),
  eventsJsonl: Schema.optional(Schema.String),
  evidenceMatrixMarkdown: Schema.optional(Schema.String),
  validationMarkdown: Schema.optional(Schema.String),
  mutationReportMarkdown: Schema.optional(Schema.String),
  propertyReportMarkdown: Schema.optional(Schema.String),
  snapshotReportMarkdown: Schema.optional(Schema.String),
  finalReviewMarkdown: Schema.optional(Schema.String),
  summaryMarkdown: Schema.optional(Schema.String),
})
export type RunArtifactSetSchema = typeof RunArtifactSetSchema.Type

export const RunArtifactWriteInput = Schema.Struct({
  runId: Schema.String,
  root: Schema.optional(Schema.String),
  artifacts: RunArtifactSetSchema,
})
export type RunArtifactWriteInput = typeof RunArtifactWriteInput.Type

export const RunArtifactManifest = Schema.Struct({
  runId: Schema.String,
  directory: Schema.String,
  files: Schema.Array(Schema.String),
})
export type RunArtifactManifest = typeof RunArtifactManifest.Type

export const PiExtensionBoundaryInput = Schema.Struct({
  cwd: Schema.String,
  source: Schema.Literals(["session-start", "before-agent-start", "manual-command"] as const),
  userPrompt: Schema.optional(Schema.String),
  autoOrient: Schema.optional(Schema.Boolean),
})
export type PiExtensionBoundaryInput = typeof PiExtensionBoundaryInput.Type

export const PiExtensionBoundaryOutput = Schema.Struct({
  commandName: Schema.Literal("attune-spec"),
  orientationDocs: Schema.Array(Schema.String),
  hostAccess: Schema.Array(Schema.String),
  systemPromptAugmented: Schema.Boolean,
})
export type PiExtensionBoundaryOutput = typeof PiExtensionBoundaryOutput.Type

export const PiSchemaCatalogId = Schema.Literals([
  "implementation-spec",
  "permission-profile",
  "spec-interview",
  "pi-conversation",
  "evidence-matrix",
  "run-event",
  "task-plan",
  "test-obligation",
  "property-obligation",
  "mutation-obligation",
] as const)
export type PiSchemaCatalogId = typeof PiSchemaCatalogId.Type

export const SchemaCatalogCodecInput = Schema.Struct({
  schemaId: PiSchemaCatalogId,
  payload: Schema.Unknown,
})
export type SchemaCatalogCodecInput = typeof SchemaCatalogCodecInput.Type

export const SchemaCatalogCodecOutput = Schema.Struct({
  schemaId: PiSchemaCatalogId,
  decoded: Schema.Boolean,
  summary: Schema.String,
})
export type SchemaCatalogCodecOutput = typeof SchemaCatalogCodecOutput.Type

export const PiGeneratorInput = Schema.Struct({
  name: Schema.String,
  directory: Schema.optional(Schema.String),
})
export type PiGeneratorInput = typeof PiGeneratorInput.Type

export const PiGeneratedArtifact = Schema.Struct({
  path: Schema.String,
  artifactKind: Schema.Literals([
    "implementation-spec",
    "permission-policy",
    "test-obligation",
    "taskplane-task",
  ] as const),
})
export type PiGeneratedArtifact = typeof PiGeneratedArtifact.Type

export const PiGeneratorOutput = Schema.Struct({
  deterministic: Schema.Boolean,
  generatedBy: Schema.String,
  artifacts: Schema.Array(PiGeneratedArtifact),
})
export type PiGeneratorOutput = typeof PiGeneratorOutput.Type

export const policyRuleLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "policy.finding-schema",
  "policy.deterministic-findings",
  "policy.stable-diagnostic-ids",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

export const queryLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

export const commandLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

export const codecLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

export const generatorLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.virtual-tree-only",
  "generator.options-decode",
  "generator.deterministic-output",
  "generator.provenance-recorded",
  "generator.no-untracked-output",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

export const decidePermissionOperation = defineOperation({
  id: "decide-permission",
  name: "Decide Permission",
  kind: "policy-rule",
  input: PermissionDecisionInput,
  output: PermissionCheck,
  error: PiAgentOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-pi-agent.permission-profile.changed",
      "attune-pi-agent.permission-decision.changed",
    ],
    atoms: ["permissionDecisionAtom", "decisionEvidenceAtom"],
  } as const),
  laws: policyRuleLaws,
  policy: {
    exportedRule: "checkPermission",
    findingSchema: "PermissionCheck",
    ruleFamily: "pi-agent-permission-decision",
    ruleName: "decide-permission",
  } as const,
} as const)

export const runSpecInterviewOperation = defineOperation({
  id: "run-spec-interview",
  name: "Run Spec Interview",
  kind: "query",
  input: SpecInterviewInput,
  output: SpecInterviewResult,
  error: PiAgentOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-pi-agent.spec-conversation.changed",
      "attune-pi-agent.schema-catalog.changed",
    ],
    atoms: ["specConversationAtom", "decisionEvidenceAtom", "schemaCatalogAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const advanceSpecConversationOperation = defineOperation({
  id: "advance-spec-conversation",
  name: "Advance Spec Conversation",
  kind: "query",
  input: SpecConversationInput,
  output: AttuneSpecConversationTurn,
  error: PiAgentOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["attune-pi-agent.spec-conversation.changed"],
    atoms: ["specConversationAtom", "decisionEvidenceAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const queryEvidenceMatrixOperation = defineOperation({
  id: "query-evidence-matrix",
  name: "Query Evidence Matrix",
  kind: "query",
  input: EvidenceFixture,
  output: EvidenceMatrixResult,
  error: PiAgentOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["attune-pi-agent.evidence-matrix.changed"],
    atoms: ["evidenceMatrixAtom", "decisionEvidenceAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const writeRunArtifactsOperation = defineOperation({
  id: "write-run-artifacts",
  name: "Write Run Artifacts",
  kind: "command",
  input: RunArtifactWriteInput,
  output: RunArtifactManifest,
  error: PiAgentOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["attune-pi-agent.run-artifacts.changed"],
    atoms: ["runArtifactManifestAtom", "decisionEvidenceAtom"],
  } as const),
  laws: commandLaws,
} as const)

export const runPiExtensionBoundaryOperation = defineOperation({
  id: "run-pi-extension-boundary",
  name: "Run Pi Extension Boundary",
  kind: "command",
  input: PiExtensionBoundaryInput,
  output: PiExtensionBoundaryOutput,
  error: PiAgentOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-pi-agent.pi-extension.changed",
      "attune-pi-agent.spec-conversation.changed",
    ],
    atoms: ["piExtensionBoundaryAtom", "specConversationAtom"],
  } as const),
  laws: commandLaws,
} as const)

export const decodeSchemaCatalogOperation = defineOperation({
  id: "decode-schema-catalog",
  name: "Decode Schema Catalog",
  kind: "codec",
  input: SchemaCatalogCodecInput,
  output: SchemaCatalogCodecOutput,
  error: PiAgentOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["attune-pi-agent.schema-catalog.changed"],
    atoms: ["schemaCatalogAtom", "decisionEvidenceAtom"],
  } as const),
  laws: codecLaws,
} as const)

export const generateSpecArtifactOperation = generatorOperation({
  id: "generate-spec-artifact",
  name: "Generate Spec Artifact",
  generatorName: "@attune/pi-agent:spec",
  artifactKind: "implementation-spec",
  defaultPath: "specs/pi-agent/<name>.implementation-spec.json",
})

export const generatePermissionPolicyArtifactOperation = generatorOperation({
  id: "generate-permission-policy-artifact",
  name: "Generate Permission Policy Artifact",
  generatorName: "@attune/pi-agent:permission-policy",
  artifactKind: "permission-policy",
  defaultPath: "policies/pi-agent/<name>.pi-policy.json",
})

export const generateTestObligationArtifactOperation = generatorOperation({
  id: "generate-test-obligation-artifact",
  name: "Generate Test Obligation Artifact",
  generatorName: "@attune/pi-agent:test-obligation",
  artifactKind: "test-obligation",
  defaultPath: "obligations/pi-agent/<name>.test-obligation.json",
})

export const generateTaskplaneTaskArtifactOperation = generatorOperation({
  id: "generate-taskplane-task-artifact",
  name: "Generate Taskplane Task Artifact",
  generatorName: "@attune/pi-agent:taskplane-task",
  artifactKind: "taskplane-task",
  defaultPath: "taskplane/pi-agent/<name>.taskplane-task.json",
  extraReactivityKeys: ["attune-pi-agent.taskplane.changed"],
  extraAtoms: ["taskplaneAtom"],
})

export const PiAgentServices = [
  "attune-pi-agent/PermissionDecisionService",
  "attune-pi-agent/SpecInterviewService",
  "attune-pi-agent/EvidenceMatrixService",
  "attune-pi-agent/RunArtifactWriterService",
  "attune-pi-agent/PiExtensionBoundary",
  "attune-pi-agent/GeneratorRegistryService",
] as const

export const PackageContract = definePackageContract({
  packageId: "attune-pi-agent",
  sourceRoot: "packages/attune-pi-agent",
  packageKind: "agent-extension",
  views: PackageViews,
  services: PiAgentServices,
  packageServices: PiAgentServices,
  operations: [
    decidePermissionOperation,
    runSpecInterviewOperation,
    advanceSpecConversationOperation,
    queryEvidenceMatrixOperation,
    writeRunArtifactsOperation,
    runPiExtensionBoundaryOperation,
    decodeSchemaCatalogOperation,
    generateSpecArtifactOperation,
    generatePermissionPolicyArtifactOperation,
    generateTestObligationArtifactOperation,
    generateTaskplaneTaskArtifactOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    customizedFor: "attune-pi-agent agent-extension boundary",
    openspecChangeId: "standardize-effect-package-contracts",
    dryRunGeneratorBlockedBy: "attune-nx TS source-local .js import resolution",
  } as const,
  waivers: [
    {
      id: "attune-pi-agent/pi-host-extension-boundary",
      category: "legacy-boundary",
      owner: "attune-pi-agent-migration-agent",
      reason:
        "The Pi extension still talks to host ExtensionAPI/session APIs and reads orientation docs directly until the host boundary is lifted into a typed Effect service.",
      review: "standardize-effect-package-contracts task 10.5",
    },
    {
      id: "attune-pi-agent/run-artifact-filesystem-writer",
      category: "legacy-boundary",
      owner: "attune-pi-agent-migration-agent",
      reason:
        "writeRunArtifacts still writes .attune-runs through node:fs/promises; the contract declares the command boundary until a deterministic in-memory PackageTestLayer and typed file service land.",
      review: "standardize-effect-package-contracts task 10.5",
    },
    {
      id: "attune-pi-agent/custom-fastcheck-arbitraries",
      category: "legacy-boundary",
      owner: "attune-pi-agent-migration-agent",
      reason:
        "Existing property tests use hand-authored fast-check arbitraries until generated Schema-derived package properties cover the same permission and evidence partitions.",
      review: "standardize-effect-package-contracts property harness generation",
    },
  ] as const,
} as const)
export type PackageContract = typeof PackageContract

export const PackageLayer = {
  layer: Layer.empty,
  provides: PiAgentServices,
  requires: [] as const,
  metadata: {
    packageId: "attune-pi-agent",
    role: "agent-extension-runtime",
  },
} as const
export type PackageLayer = typeof PackageLayer

export const PackageTestLayer = {
  layer: Layer.empty,
  provides: PiAgentServices,
  requires: [] as const,
  metadata: {
    packageId: "attune-pi-agent",
    role: "agent-extension-test-runtime",
    artifactStore: "in-memory-placeholder",
  },
} as const
export type PackageTestLayer = typeof PackageTestLayer

export const PackageFuzzHandlers = {
  "decide-permission": () => ({
    subject: ".env.local",
    kind: "path" as const,
    normalizedSubject: ".env.local",
    decision: "deny" as const,
    matchedRuleIds: ["deny-env-files"],
    reason: "Secrets-adjacent env files are never edited by default.",
  }),
  "run-spec-interview": () => ({
    phase: "questioning" as const,
    questions: [],
    missingConstraints: [],
    suggestedTestObligations: [],
    suggestedPropertyObligations: [],
    suggestedMutationObligations: [],
    draft: null,
  }),
  "advance-spec-conversation": () => ({
    state: {
      sessionId: "contract",
      rawPrompt: "contract",
      answers: [],
      phase: "questioning" as const,
      activeQuestionId: null,
      messages: [],
    },
    messagesToRender: [],
    awaitingQuestion: null,
    draft: null,
  }),
  "query-evidence-matrix": () => ({
    matrix: {
      runId: "contract",
      specId: "contract",
      generatedAt: "2026-06-21T00:00:00.000Z",
      entries: [],
    },
    markdown: "# Evidence Matrix\n",
  }),
  "write-run-artifacts": () => ({
    runId: "contract",
    directory: ".attune-runs/contract",
    files: ["summary.md"],
  }),
  "run-pi-extension-boundary": () => ({
    commandName: "attune-spec" as const,
    orientationDocs: ["AGENTS.md"],
    hostAccess: ["ExtensionAPI.sendUserMessage", "ExtensionContext.sessionManager"],
    systemPromptAugmented: true,
  }),
  "decode-schema-catalog": () => ({
    schemaId: "implementation-spec" as const,
    decoded: true,
    summary: "ImplementationSpec decoded",
  }),
  "generate-spec-artifact": () => generatorOutput(
    "@attune/pi-agent:spec",
    "implementation-spec",
    "specs/pi-agent/<name>.implementation-spec.json",
  ),
  "generate-permission-policy-artifact": () => generatorOutput(
    "@attune/pi-agent:permission-policy",
    "permission-policy",
    "policies/pi-agent/<name>.pi-policy.json",
  ),
  "generate-test-obligation-artifact": () => generatorOutput(
    "@attune/pi-agent:test-obligation",
    "test-obligation",
    "obligations/pi-agent/<name>.test-obligation.json",
  ),
  "generate-taskplane-task-artifact": () => generatorOutput(
    "@attune/pi-agent:taskplane-task",
    "taskplane-task",
    "taskplane/pi-agent/<name>.taskplane-task.json",
  ),
} as const
export type PackageFuzzHandlers = typeof PackageFuzzHandlers

export const PackageProperties = {
  "decide-permission": propertyFor(decidePermissionOperation),
  "run-spec-interview": propertyFor(runSpecInterviewOperation),
  "advance-spec-conversation": propertyFor(advanceSpecConversationOperation),
  "query-evidence-matrix": propertyFor(queryEvidenceMatrixOperation),
  "write-run-artifacts": propertyFor(writeRunArtifactsOperation),
  "run-pi-extension-boundary": propertyFor(runPiExtensionBoundaryOperation),
  "decode-schema-catalog": propertyFor(decodeSchemaCatalogOperation),
  "generate-spec-artifact": propertyFor(generateSpecArtifactOperation),
  "generate-permission-policy-artifact": propertyFor(generatePermissionPolicyArtifactOperation),
  "generate-test-obligation-artifact": propertyFor(generateTestObligationArtifactOperation),
  "generate-taskplane-task-artifact": propertyFor(generateTaskplaneTaskArtifactOperation),
} as const
export type PackageProperties = typeof PackageProperties

export const PackageTypeGuidance = defineTypeGuidance(PackageContract, {
  sourceLabels: [
    "contract.operation",
    "effect-schema.ast",
    "operation.kind.agent-extension",
    "declared-view",
    "generator-metadata",
    "policy-metadata",
  ],
  sources: [
    {
      id: "contract:attune-pi-agent",
      label: "attune-pi-agent package contract",
      kind: "contract-operation",
    },
  ],
  operations: {
    "decide-permission": operationGuidance(decidePermissionOperation, {
      laws: policyRuleLaws,
      inputPartitions: [
        partition("permission.subject.path", "schema-literal", "schema.kind.path"),
        partition("permission.subject.command", "schema-literal", "schema.kind.command"),
        partition("permission.secret-deny", "policy-finding", "policy.deny-first-secret-path"),
      ],
      outputPartitions: [
        partition("permission.decision.allow", "output-variant", "PermissionDecision.allow"),
        partition("permission.decision.ask", "output-variant", "PermissionDecision.ask"),
        partition("permission.decision.deny", "output-variant", "PermissionDecision.deny"),
      ],
      coverageTargetId: "permission.secret-deny",
      transformId: "permission.normalized-subjects",
      filterId: "permission.profile-rule-precondition",
    }),
    "run-spec-interview": operationGuidance(runSpecInterviewOperation, {
      laws: queryLaws,
      inputPartitions: [
        partition("spec-interview.raw-prompt", "schema-field", "SpecInterviewInput.rawPrompt"),
        partition("spec-interview.answer-list", "collection-boundary", "SpecInterviewInput.answers"),
      ],
      outputPartitions: [
        partition("spec-interview.phase.questioning", "output-variant", "SpecInterviewResult.phase"),
        partition("spec-interview.phase.draft-ready", "output-variant", "SpecInterviewResult.phase"),
      ],
      coverageTargetId: "spec-interview.phase.draft-ready",
      transformId: "spec-interview.complete-required-slots",
    }),
    "advance-spec-conversation": operationGuidance(advanceSpecConversationOperation, {
      laws: queryLaws,
      inputPartitions: [
        partition("conversation.action.start", "schema-literal", "SpecConversationInput.action"),
        partition("conversation.action.answer", "schema-literal", "SpecConversationInput.action"),
      ],
      outputPartitions: [
        partition("conversation.awaiting-question", "output-variant", "AttuneSpecConversationTurn.awaitingQuestion"),
        partition("conversation.draft-ready", "output-variant", "AttuneSpecConversationTurn.draft"),
      ],
      coverageTargetId: "conversation.draft-ready",
      transformId: "conversation.answer-required-questions",
    }),
    "query-evidence-matrix": operationGuidance(queryEvidenceMatrixOperation, {
      laws: queryLaws,
      inputPartitions: [
        partition("evidence.claims.empty", "collection-boundary", "EvidenceFixture.claims"),
        partition("evidence.claims.nonempty", "collection-boundary", "EvidenceFixture.claims"),
      ],
      outputPartitions: [
        partition("evidence.result.supported", "output-variant", "EvidenceResult.supported"),
        partition("evidence.result.needs-human-review", "output-variant", "EvidenceResult.needs-human-review"),
      ],
      coverageTargetId: "evidence.claims.nonempty",
      transformId: "evidence.matrix-ordering",
    }),
    "write-run-artifacts": operationGuidance(writeRunArtifactsOperation, {
      laws: commandLaws,
      inputPartitions: [
        partition("run-artifacts.summary", "schema-field", "RunArtifactSet.summaryMarkdown"),
        partition("run-artifacts.evidence", "schema-field", "RunArtifactSet.evidenceMatrixMarkdown"),
      ],
      outputPartitions: [
        partition("run-artifacts.manifest-files", "output-variant", "RunArtifactManifest.files"),
      ],
      coverageTargetId: "run-artifacts.manifest-files",
      transformId: "run-artifacts.in-memory-store",
    }),
    "run-pi-extension-boundary": operationGuidance(runPiExtensionBoundaryOperation, {
      laws: commandLaws,
      inputPartitions: [
        partition("pi-extension.session-start", "schema-literal", "PiExtensionBoundaryInput.source"),
        partition("pi-extension.manual-command", "schema-literal", "PiExtensionBoundaryInput.source"),
      ],
      outputPartitions: [
        partition("pi-extension.orientation-docs", "output-variant", "PiExtensionBoundaryOutput.orientationDocs"),
      ],
      coverageTargetId: "pi-extension.orientation-docs",
      transformId: "pi-extension.fixture-host",
    }),
    "decode-schema-catalog": operationGuidance(decodeSchemaCatalogOperation, {
      laws: codecLaws,
      inputPartitions: [
        partition("schema-catalog.implementation-spec", "schema-literal", "PiSchemaCatalogId"),
        partition("schema-catalog.permission-profile", "schema-literal", "PiSchemaCatalogId"),
        partition("schema-catalog.evidence-matrix", "schema-literal", "PiSchemaCatalogId"),
      ],
      outputPartitions: [
        partition("schema-catalog.decoded", "output-variant", "SchemaCatalogCodecOutput.decoded"),
      ],
      coverageTargetId: "schema-catalog.implementation-spec",
      transformId: "schema-catalog.fixture-payloads",
    }),
    "generate-spec-artifact": generatorGuidance(generateSpecArtifactOperation, "implementation-spec"),
    "generate-permission-policy-artifact": generatorGuidance(
      generatePermissionPolicyArtifactOperation,
      "permission-policy",
    ),
    "generate-test-obligation-artifact": generatorGuidance(
      generateTestObligationArtifactOperation,
      "test-obligation",
    ),
    "generate-taskplane-task-artifact": generatorGuidance(
      generateTaskplaneTaskArtifactOperation,
      "taskplane-task",
    ),
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance

type ArtifactKind = PiGeneratedArtifact["artifactKind"]

type OperationWithGuidance = {
  readonly id: string
  readonly kind: string
  readonly input: unknown
  readonly output: unknown
  readonly error: unknown
  readonly views: {
    readonly reactivityKeys?: readonly string[]
    readonly atoms?: readonly string[]
  }
  readonly laws: readonly string[]
}

type LawPartition<Laws extends readonly string[]> = readonly {
  readonly id: Laws[number]
  readonly kind: "law"
  readonly from: "inferred-law"
}[]

type GuidanceOptions<Laws extends readonly string[]> = {
  readonly laws: Laws
  readonly inputPartitions: readonly GuidancePartition[]
  readonly outputPartitions: readonly GuidancePartition[]
  readonly coverageTargetId: string
  readonly transformId: string
  readonly filterId?: string
}

type GuidancePartition = {
  readonly id: string
  readonly kind:
    | "schema-literal"
    | "schema-field"
    | "schema-boundary"
    | "collection-boundary"
    | "output-variant"
    | "typed-error-variant"
    | "generator-provenance"
    | "policy-finding"
  readonly from: string
}

function generatorOperation<
  const Id extends string,
  const Name extends string,
  const GeneratorName extends string,
  const Kind extends ArtifactKind,
  const DefaultPath extends string,
>(input: {
  readonly id: Id
  readonly name: Name
  readonly generatorName: GeneratorName
  readonly artifactKind: Kind
  readonly defaultPath: DefaultPath
  readonly extraReactivityKeys?: readonly (typeof PackageViews.reactivityKeys)[number][]
  readonly extraAtoms?: readonly (typeof PackageViews.atoms)[number][]
}) {
  return defineOperation({
    id: input.id,
    name: input.name,
    kind: "generator",
    input: PiGeneratorInput,
    output: PiGeneratorOutput,
    error: PiAgentOperationError,
    views: touches(PackageViews, {
      reactivityKeys: [
        "attune-pi-agent.generator-plan.changed",
        "attune-pi-agent.generated-diff.changed",
        ...(input.extraReactivityKeys ?? []),
      ],
      atoms: [
        "generatorPlanAtom",
        "generatorDiffAtom",
        ...(input.extraAtoms ?? []),
      ],
    } as const),
    laws: generatorLaws,
    generator: {
      name: input.generatorName,
      project: "attune-pi-agent",
      output: "virtual-tree",
      artifactKind: input.artifactKind,
      defaultPath: input.defaultPath,
      optionsSchema: "PiGeneratorInput",
      outputSchema: "PiGeneratorOutput",
      provenanceSchema: "PiGeneratorOutput.generatedBy",
    } as const,
  } as const)
}

function generatorOutput(
  generatedBy: string,
  artifactKind: ArtifactKind,
  path: string,
): PiGeneratorOutput {
  return {
    deterministic: true,
    generatedBy,
    artifacts: [{ artifactKind, path }],
  }
}

function propertyFor<const Operation extends OperationWithGuidance>(operation: Operation) {
  return {
    property: {
      operationId: operation.id,
      laws: operation.laws,
      checks: [
        "schema.decode",
        "schema.encode",
        "handler.exact-operation-map",
        "view.atom-moves",
      ],
    },
  } as const
}

function generatorGuidance<const Operation extends OperationWithGuidance>(
  operation: Operation,
  artifactKind: ArtifactKind,
) {
  return operationGuidance(operation, {
    laws: generatorLaws,
    inputPartitions: [
      partition(`${operation.id}.name`, "schema-field", "PiGeneratorInput.name"),
      partition(`${operation.id}.directory`, "schema-field", "PiGeneratorInput.directory"),
    ],
    outputPartitions: [
      partition(`${operation.id}.${artifactKind}`, "generator-provenance", "PiGeneratorOutput.artifacts"),
    ],
    coverageTargetId: `${operation.id}.${artifactKind}`,
    transformId: `${operation.id}.normalized-name`,
  })
}

function operationGuidance<
  const Operation extends OperationWithGuidance,
  const Laws extends readonly string[],
>(
  operation: Operation,
  options: GuidanceOptions<Laws>,
) {
  const inputSchemaId = `schema:${operation.id}:input`
  const outputSchemaId = `schema:${operation.id}:output`
  const errorSchemaId = `schema:${operation.id}:error`

  return {
    sourceLabels: [
      `operation.kind.${operation.kind}`,
      "effect-schema.ast",
      "attune-pi-agent.package-view",
    ],
    sources: [
      {
        id: `operation:${operation.id}`,
        label: operation.id,
        kind: "contract-operation" as const,
        operationId: operation.id,
      },
    ],
    schemaSources: [
      {
        id: inputSchemaId,
        role: "input" as const,
        label: `${operation.id}.input`,
        source: "effect-schema",
      },
      {
        id: outputSchemaId,
        role: "output" as const,
        label: `${operation.id}.output`,
        source: "effect-schema",
      },
      {
        id: errorSchemaId,
        role: "error" as const,
        label: `${operation.id}.error`,
        source: "effect-schema",
      },
    ],
    inputPartitions: options.inputPartitions.map((entry) => ({
      ...entry,
      sourceId: inputSchemaId,
      transformIds: [options.transformId],
      ...(options.filterId ? { filterIds: [options.filterId] } : {}),
    })),
    outputPartitions: options.outputPartitions.map((entry) => ({
      ...entry,
      sourceId: outputSchemaId,
    })),
    errorPartitions: [
      {
        id: `${operation.id}.typed-error`,
        kind: "typed-error-variant" as const,
        from: "schema.error",
        sourceId: errorSchemaId,
      },
    ],
    lawPartitions: lawPartitions(options.laws),
    viewPartitions: [
      ...viewPartitions(operation.id, "reactivity-key", operation.views.reactivityKeys ?? []),
      ...viewPartitions(operation.id, "atom", operation.views.atoms ?? []),
    ],
    coverageSearch: [
      {
        id: `coverage:${operation.id}:semantic`,
        targetPartitionId: options.coverageTargetId,
        tier: "commit" as const,
        required: true,
        priority: 10,
        reason:
          "Schema-derived FastCheck cases should cover the declared Pi agent boundary before agents add bespoke tests.",
      },
    ],
    transforms: [
      {
        id: options.transformId,
        kind: "schema-annotation" as const,
        targetPartitionId: options.coverageTargetId,
        sourceLabel: "effect-schema.ast",
        reason:
          "Contract-derived type guidance biases Schema arbitrary generation toward package-boundary evidence.",
      },
    ],
    filters: options.filterId
      ? [
        {
          id: options.filterId,
          kind: "operation-precondition" as const,
          reason:
            "Permission profile fixtures are filtered only until generated Schema-derived fixtures cover all rule families.",
          targetPartitionId: options.coverageTargetId,
          expectedAcceptanceRate: 0.9,
        },
      ]
      : [],
  } as const
}

function lawPartitions<const Laws extends readonly string[]>(laws: Laws): LawPartition<Laws> {
  return laws.map((id) => ({
    id,
    kind: "law",
    from: "inferred-law",
  })) as LawPartition<Laws>
}

function partition(
  id: string,
  kind: GuidancePartition["kind"],
  from: string,
): GuidancePartition {
  return { id, kind, from }
}

function viewPartitions(
  operationId: string,
  kind: "reactivity-key" | "atom",
  values: readonly string[],
) {
  return values.map((value) => ({
    id: `${operationId}.${kind}.${value}`,
    kind,
    from: kind === "reactivity-key" ? "touches.reactivity-key" : "touches.atom",
    label: value,
  })) as readonly {
    readonly id: string
    readonly kind: "reactivity-key" | "atom"
    readonly from: "touches.reactivity-key" | "touches.atom"
    readonly label: string
  }[]
}
