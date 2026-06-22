import { Layer, Schema } from "effect"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"

import {
  DeploymentPhase,
  HomeDeploymentConfig,
  OperationClassification,
  ResourceKind,
  ResourceStatus,
} from "./model.ts"
import {
  PlatformProviderMode,
  ProviderTransitionResult,
} from "./providers.ts"
import { HomeDeploymentStateSchema } from "./state.ts"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViews = definePackageViews({
  reactivityKeys: [
    "home-deployment.config.changed",
    "home-deployment.deployment-plan.changed",
    "home-deployment.lifecycle-graph.changed",
    "home-deployment.phase-summary.changed",
    "home-deployment.next-agent-step.changed",
    "home-deployment.state-file.changed",
    "home-deployment.provider-transition-evidence.changed",
    "home-deployment.provider-gate.changed",
    "home-deployment.host-readiness.changed",
    "home-deployment.destructive-approval.changed",
    "home-deployment.tailscale-material.changed",
    "home-deployment.sops-recipient.changed",
    "home-deployment.network-smoke.changed",
    "home-deployment.command-intent.changed",
    "home-deployment.alchemy-stack.changed",
  ],
  atoms: [
    "deploymentPlanAtom",
    "phaseSummaryAtom",
    "nextAgentStepAtom",
    "hostReadinessAtom",
    "providerGateAtom",
    "destructiveApprovalAtom",
    "tailscaleMaterialAtom",
    "sopsRecipientAtom",
    "networkSmokeAtom",
  ],
} as const)

export const HomeDeploymentPackageServices = [
  "@attune/home-deployment/DeploymentConfigService",
  "@attune/home-deployment/Day0PlanService",
  "@attune/home-deployment/LifecycleGraphService",
  "@attune/home-deployment/ProviderTransitionService",
  "@attune/home-deployment/AlchemyStackService",
  "@attune/home-deployment/LocalStateService",
  "@attune/home-deployment/ManualProofService",
  "@attune/home-deployment/CommandIntentService",
] as const

export const HomeDeploymentContractError = Schema.Struct({
  code: Schema.Literals([
    "config-decode-failed",
    "plan-projection-failed",
    "provider-transition-blocked",
    "destructive-proof-required",
    "destructive-approval-required",
    "alchemy-stack-unavailable",
    "local-state-unavailable",
    "manual-proof-invalid",
    "command-intent-unavailable",
    "package-view-unavailable",
  ] as const),
  message: Schema.String,
  operationId: Schema.optional(Schema.String),
  resourceId: Schema.optional(Schema.String),
  evidenceRef: Schema.optional(Schema.String),
})
export type HomeDeploymentContractError = typeof HomeDeploymentContractError.Type

export const DeploymentConfigBoundaryInput = Schema.Struct({
  source: Schema.Literals(["default", "provided", "effect-config"] as const),
  config: Schema.optional(HomeDeploymentConfig),
  redactedEnvKeys: Schema.Array(Schema.String),
})
export type DeploymentConfigBoundaryInput = typeof DeploymentConfigBoundaryInput.Type

export const DeploymentConfigBoundaryOutput = Schema.Struct({
  name: Schema.String,
  hostnames: Schema.Array(Schema.String),
  localStateDir: Schema.String,
  secretRefs: Schema.Array(Schema.String),
  tailscaleAuthMaterialRequired: Schema.Boolean,
})
export type DeploymentConfigBoundaryOutput = typeof DeploymentConfigBoundaryOutput.Type

export const Day0LifecycleProjectionInput = Schema.Struct({
  config: HomeDeploymentConfig,
  confirmedGateIds: Schema.Array(Schema.String),
  completedResourceIds: Schema.Array(Schema.String),
  failedResourceIds: Schema.Array(Schema.String),
})
export type Day0LifecycleProjectionInput = typeof Day0LifecycleProjectionInput.Type

export const Day0LifecycleProjectionOutput = Schema.Struct({
  name: Schema.String,
  hostnames: Schema.Array(Schema.String),
  resourceIds: Schema.Array(Schema.String),
  phases: Schema.Array(DeploymentPhase),
  blockedResourceIds: Schema.Array(Schema.String),
  destructiveResourceIds: Schema.Array(Schema.String),
})
export type Day0LifecycleProjectionOutput = typeof Day0LifecycleProjectionOutput.Type

export const PhaseSummaryQueryInput = Schema.Struct({
  phase: Schema.optional(DeploymentPhase),
  includeBlocked: Schema.Boolean,
})
export type PhaseSummaryQueryInput = typeof PhaseSummaryQueryInput.Type

export const PhaseSummaryQueryOutput = Schema.Struct({
  planned: Schema.Number,
  ready: Schema.Number,
  blocked: Schema.Number,
  nextAgentStepKind: Schema.Literals(["SafeProbe", "ManualGate", "Apply", "Blocked"] as const),
})
export type PhaseSummaryQueryOutput = typeof PhaseSummaryQueryOutput.Type

export const ProviderTransitionBoundaryInput = Schema.Struct({
  mode: PlatformProviderMode,
  resourceId: Schema.String,
  resourceKind: ResourceKind,
  operation: OperationClassification,
  resourceStatus: ResourceStatus,
  desiredStateObserved: Schema.Boolean,
  hasManualProof: Schema.Boolean,
  hasDestructiveApproval: Schema.Boolean,
})
export type ProviderTransitionBoundaryInput = typeof ProviderTransitionBoundaryInput.Type

export const ManualProofRecord = Schema.Struct({
  gateId: Schema.String,
  evidenceRef: Schema.String,
  resourceId: Schema.optional(Schema.String),
  confirmedAt: Schema.optional(Schema.String),
})
export type ManualProofRecord = typeof ManualProofRecord.Type

export const DestructiveApprovalRecord = Schema.Struct({
  approvalId: Schema.String,
  gateId: Schema.String,
  resourceId: Schema.String,
  approvedBy: Schema.String,
  approvedAt: Schema.String,
  proofRef: Schema.String,
})
export type DestructiveApprovalRecord = typeof DestructiveApprovalRecord.Type

export const NixosAnywhereInstallInput = Schema.Struct({
  mode: PlatformProviderMode,
  resourceId: Schema.String,
  hostname: Schema.String,
  desiredStateObserved: Schema.Boolean,
  currentProof: Schema.optional(ManualProofRecord),
  currentApproval: Schema.optional(DestructiveApprovalRecord),
})
export type NixosAnywhereInstallInput = typeof NixosAnywhereInstallInput.Type

export const AlchemyStackBoundaryInput = Schema.Struct({
  providerMode: PlatformProviderMode,
  execute: Schema.Boolean,
  recordState: Schema.Boolean,
  resourceId: Schema.optional(Schema.String),
  dependencyOutputIds: Schema.Array(Schema.String),
})
export type AlchemyStackBoundaryInput = typeof AlchemyStackBoundaryInput.Type

export const AlchemyStackBoundaryOutput = Schema.Struct({
  provider: Schema.Literal("attune:alchemy:thinkcentre-day0-deployment"),
  deploymentResource: Schema.String,
  resourceCount: Schema.Number,
  bindingKinds: Schema.Array(Schema.String),
  liveExecution: Schema.Boolean,
})
export type AlchemyStackBoundaryOutput = typeof AlchemyStackBoundaryOutput.Type

export const LocalStateCommandInput = Schema.Struct({
  action: Schema.Literals(["read", "record-gate", "record-evidence", "complete-resource", "fail-resource"] as const),
  statePath: Schema.optional(Schema.String),
  state: HomeDeploymentStateSchema,
  gateId: Schema.optional(Schema.String),
  resourceId: Schema.optional(Schema.String),
})
export type LocalStateCommandInput = typeof LocalStateCommandInput.Type

export const LocalStateCommandOutput = Schema.Struct({
  state: HomeDeploymentStateSchema,
  changedReactivityKeys: Schema.Array(Schema.String),
})
export type LocalStateCommandOutput = typeof LocalStateCommandOutput.Type

export const CommandIntentAction = Schema.Literals([
  "render",
  "observe",
  "execute",
  "record-output",
] as const)
export type CommandIntentAction = typeof CommandIntentAction.Type

export const CommandIntentBoundaryInput = Schema.Struct({
  resourceId: Schema.String,
  provider: Schema.String,
  action: CommandIntentAction,
  mode: PlatformProviderMode,
  command: Schema.Array(Schema.String),
  execute: Schema.Boolean,
  destructive: Schema.Boolean,
})
export type CommandIntentBoundaryInput = typeof CommandIntentBoundaryInput.Type

export const CommandIntentBoundaryOutput = Schema.Struct({
  resourceId: Schema.String,
  command: Schema.Array(Schema.String),
  display: Schema.String,
  executionBoundary: Schema.Literals(["rendered-only", "provider-executor"] as const),
  liveExecutionAllowed: Schema.Boolean,
  redacted: Schema.Boolean,
})
export type CommandIntentBoundaryOutput = typeof CommandIntentBoundaryOutput.Type

export const HomeDeploymentAtomInput = Schema.Struct({
  atomId: Schema.Literals([
    "deploymentPlanAtom",
    "phaseSummaryAtom",
    "nextAgentStepAtom",
    "hostReadinessAtom",
    "providerGateAtom",
    "destructiveApprovalAtom",
    "tailscaleMaterialAtom",
    "sopsRecipientAtom",
    "networkSmokeAtom",
  ] as const),
})
export type HomeDeploymentAtomInput = typeof HomeDeploymentAtomInput.Type

export const HomeDeploymentAtomOutput = Schema.Struct({
  atomId: Schema.String,
  reactivityKeys: Schema.Array(Schema.String),
  dependsOnAtoms: Schema.Array(Schema.String),
  valueKind: Schema.String,
  readOnly: Schema.Boolean,
})
export type HomeDeploymentAtomOutput = typeof HomeDeploymentAtomOutput.Type

const codecLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const projectionLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
  "projection.event-decode",
  "projection.state-decode",
  "projection.deterministic-replay",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const queryLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const commandLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const resourceProviderLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
  "resource.observe-before-apply",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "resource.observed-idempotence",
] as const

const destructiveResourceProviderLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
  "resource.observe-before-apply",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "resource.observed-idempotence",
  "resource.current-destructive-proof",
  "resource.destructive-approval",
  "resource.no-repeat-destructive",
] as const

const atomFamilyLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.no-durable-atom-write",
  "atom-family.base-refresh",
  "atom-family.derived-composes",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

export const deploymentConfigCodecOperation = defineOperation({
  id: "deployment-config-codec",
  name: "Decode deployment configuration boundary",
  kind: "codec",
  input: DeploymentConfigBoundaryInput,
  output: DeploymentConfigBoundaryOutput,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.config.changed",
      "home-deployment.deployment-plan.changed",
    ],
    atoms: ["deploymentPlanAtom"],
  } as const),
  laws: codecLaws,
} as const)

export const day0LifecycleProjectionOperation = defineOperation({
  id: "day0-lifecycle-projection",
  name: "Project Day-0 plan into lifecycle graph",
  kind: "projection",
  input: Day0LifecycleProjectionInput,
  output: Day0LifecycleProjectionOutput,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.deployment-plan.changed",
      "home-deployment.lifecycle-graph.changed",
      "home-deployment.phase-summary.changed",
      "home-deployment.next-agent-step.changed",
    ],
    atoms: ["deploymentPlanAtom", "phaseSummaryAtom", "nextAgentStepAtom"],
  } as const),
  laws: projectionLaws,
  projection: {
    eventSchema: "HomeDeploymentState and gate evidence records",
    stateSchema: "PlatformLifecycleGraph",
    replay: true,
  } as const,
} as const)

export const phaseSummaryQueryOperation = defineOperation({
  id: "phase-summary-query",
  name: "Query phase summary and next agent step",
  kind: "query",
  input: PhaseSummaryQueryInput,
  output: PhaseSummaryQueryOutput,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.phase-summary.changed",
      "home-deployment.next-agent-step.changed",
      "home-deployment.provider-gate.changed",
    ],
    atoms: ["phaseSummaryAtom", "nextAgentStepAtom", "providerGateAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const providerTransitionOperation = defineOperation({
  id: "provider-transition",
  name: "Run observed provider transition",
  kind: "resource-provider",
  observes: true,
  input: ProviderTransitionBoundaryInput,
  output: ProviderTransitionResult,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.provider-transition-evidence.changed",
      "home-deployment.provider-gate.changed",
      "home-deployment.host-readiness.changed",
      "home-deployment.tailscale-material.changed",
      "home-deployment.sops-recipient.changed",
      "home-deployment.network-smoke.changed",
    ],
    atoms: [
      "providerGateAtom",
      "hostReadinessAtom",
      "tailscaleMaterialAtom",
      "sopsRecipientAtom",
      "networkSmokeAtom",
    ],
  } as const),
  laws: resourceProviderLaws,
  resource: {
    observes: true,
    desiredStateSchema: "PlannedResource desired state",
    observationSchema: "ProviderTransitionResult",
    provider: "PlatformProviderServices",
    liveModes: ["DryRun", "Test"],
    waivedLiveMode: "Live",
  } as const,
} as const)

export const nixosAnywhereInstallOperation = defineOperation({
  id: "nixos-anywhere-install",
  name: "NixOS Anywhere destructive install gate",
  kind: "resource-provider",
  observes: true,
  input: NixosAnywhereInstallInput,
  output: ProviderTransitionResult,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.provider-transition-evidence.changed",
      "home-deployment.host-readiness.changed",
      "home-deployment.destructive-approval.changed",
      "home-deployment.provider-gate.changed",
    ],
    atoms: ["hostReadinessAtom", "destructiveApprovalAtom", "providerGateAtom"],
  } as const),
  laws: destructiveResourceProviderLaws,
  destructive: {
    proof: "ManualProofRecord",
    approval: "DestructiveApprovalRecord",
    rule:
      "If the desired host state is already observed, return Observed or Applied evidence without repeating nixos-anywhere. Otherwise require current disk proof and current destructive approval for the exact host/resource.",
  } as const,
  resource: {
    observes: true,
    destructive: true,
    desiredStateSchema: "Installed ThinkCentre host state",
    observationSchema: "InstalledHostObservation",
    currentProofSchema: "ManualProofRecord",
    approvalSchema: "DestructiveApprovalRecord",
    provider: "NixosAnywhereProvider",
    liveModes: ["DryRun", "Test"],
    waivedLiveMode: "Live",
  } as const,
} as const)

export const alchemyStackResourceOperation = defineOperation({
  id: "alchemy-stack-resource",
  name: "Materialize ThinkCentre Day-0 Alchemy stack",
  kind: "resource-provider",
  observes: true,
  input: AlchemyStackBoundaryInput,
  output: AlchemyStackBoundaryOutput,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.alchemy-stack.changed",
      "home-deployment.deployment-plan.changed",
      "home-deployment.provider-gate.changed",
    ],
    atoms: ["deploymentPlanAtom", "providerGateAtom"],
  } as const),
  laws: resourceProviderLaws,
  resource: {
    observes: true,
    desiredStateSchema: "ThinkCentreDay0DeploymentProps",
    observationSchema: "ThinkCentreDay0DeploymentOutput",
    provider: "attune:alchemy:ThinkCentreDay0Deployment",
    liveModes: ["DryRun", "Test"],
    waivedLiveMode: "Live",
  } as const,
} as const)

export const localStateCommandOperation = defineOperation({
  id: "local-state-command",
  name: "Record local Day-0 state through service boundary",
  kind: "command",
  input: LocalStateCommandInput,
  output: LocalStateCommandOutput,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.state-file.changed",
      "home-deployment.deployment-plan.changed",
      "home-deployment.provider-gate.changed",
      "home-deployment.destructive-approval.changed",
    ],
    atoms: ["deploymentPlanAtom", "providerGateAtom", "destructiveApprovalAtom"],
  } as const),
  laws: commandLaws,
} as const)

export const manualProofConfirmationOperation = defineOperation({
  id: "manual-proof-confirmation",
  name: "Confirm manual proof and destructive approval records",
  kind: "command",
  input: ManualProofRecord,
  output: DestructiveApprovalRecord,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.provider-gate.changed",
      "home-deployment.destructive-approval.changed",
    ],
    atoms: ["providerGateAtom", "destructiveApprovalAtom"],
  } as const),
  laws: commandLaws,
} as const)

export const commandIntentBoundaryOperation = defineOperation({
  id: "command-intent-boundary",
  name: "Render typed command intents behind provider execution boundary",
  kind: "command",
  input: CommandIntentBoundaryInput,
  output: CommandIntentBoundaryOutput,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.command-intent.changed",
      "home-deployment.provider-gate.changed",
    ],
    atoms: ["providerGateAtom", "nextAgentStepAtom"],
  } as const),
  laws: commandLaws,
} as const)

export const homeDeploymentViewAtomsOperation = defineOperation({
  id: "home-deployment-view-atoms",
  name: "Home deployment package view atoms",
  kind: "atom-family",
  input: HomeDeploymentAtomInput,
  output: HomeDeploymentAtomOutput,
  error: HomeDeploymentContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "home-deployment.deployment-plan.changed",
      "home-deployment.phase-summary.changed",
      "home-deployment.next-agent-step.changed",
      "home-deployment.host-readiness.changed",
      "home-deployment.provider-gate.changed",
      "home-deployment.destructive-approval.changed",
      "home-deployment.tailscale-material.changed",
      "home-deployment.sops-recipient.changed",
      "home-deployment.network-smoke.changed",
    ],
    atoms: [
      "deploymentPlanAtom",
      "phaseSummaryAtom",
      "nextAgentStepAtom",
      "hostReadinessAtom",
      "providerGateAtom",
      "destructiveApprovalAtom",
      "tailscaleMaterialAtom",
      "sopsRecipientAtom",
      "networkSmokeAtom",
    ],
  } as const),
  laws: atomFamilyLaws,
  atom: {
    family: "home-deployment-day0-views",
    baseAtoms: [
      "deploymentPlanAtom",
      "hostReadinessAtom",
      "providerGateAtom",
      "destructiveApprovalAtom",
      "tailscaleMaterialAtom",
      "sopsRecipientAtom",
      "networkSmokeAtom",
    ],
    derivedAtoms: ["phaseSummaryAtom", "nextAgentStepAtom"],
    composes: true,
  } as const,
} as const)

export const PackageContract = definePackageContract({
  packageId: "home-deployment",
  sourceRoot: "packages/home-deployment/src",
  packageKind: "day0-resource-runbook",
  views: PackageViews,
  services: HomeDeploymentPackageServices,
  providedServices: HomeDeploymentPackageServices,
  operations: [
    deploymentConfigCodecOperation,
    day0LifecycleProjectionOperation,
    phaseSummaryQueryOperation,
    providerTransitionOperation,
    nixosAnywhereInstallOperation,
    alchemyStackResourceOperation,
    localStateCommandOperation,
    manualProofConfirmationOperation,
    commandIntentBoundaryOperation,
    homeDeploymentViewAtomsOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    project: "home-deployment",
    openspecChangeId: "standardize-effect-package-contracts",
    customizedFor: "Day-0 ThinkCentre runbook and provider boundary",
  } as const,
  waivers: [
    {
      id: "home-deployment/live-shell-execution-boundary",
      category: "provider-runtime-boundary",
      owner: "home-deployment-migration-agent",
      reason:
        "Live shell execution remains inside provider/executor boundaries and is excluded from PackageTestLayer; contract tests cover DryRun, Test, and already-observed evidence only.",
      review: "standardize-effect-package-contracts task 12.4",
    },
    {
      id: "home-deployment/local-filesystem-state-adapter",
      category: "legacy-boundary",
      owner: "home-deployment-migration-agent",
      reason:
        "Local deployment state still uses direct JSON filesystem helpers until the state adapter moves behind an Effect service and typed Nx executor.",
      review: "standardize-effect-package-contracts task 12.4",
    },
    {
      id: "home-deployment/day0-resource-grammar",
      category: "temporary-migration-adapter",
      owner: "home-deployment-migration-agent",
      reason:
        "Runbook resource shapes are represented by hand-authored model/provider code until @attune/nx owns Day-0 provider and runbook generation.",
      review: "standardize-effect-package-contracts task 12.4",
    },
    {
      id: "home-deployment/human-destructive-review-gate",
      category: "provider-runtime-boundary",
      owner: "home-deployment-migration-agent",
      reason:
        "Human hardware approval is modeled as current ManualProofRecord plus DestructiveApprovalRecord metadata; live destructive execution remains outside deterministic tests.",
      review: "standardize-effect-package-contracts provider-safety-validation-agent",
    },
  ] as const,
} as const)
export type PackageContract = typeof PackageContract

export const PackageLayer = {
  layer: Layer.empty,
  provides: HomeDeploymentPackageServices,
  requires: [] as const,
  metadata: {
    packageId: "home-deployment",
    role: "day0-resource-runbook-live-boundary",
    liveExecutionWaived: true,
  },
} as const
export type PackageLayer = typeof PackageLayer

export const PackageTestLayer = {
  layer: Layer.empty,
  provides: HomeDeploymentPackageServices,
  requires: [] as const,
  metadata: {
    packageId: "home-deployment",
    role: "day0-resource-runbook-deterministic-test-boundary",
    providerModes: ["DryRun", "Test"],
    liveExecution: false,
  },
} as const
export type PackageTestLayer = typeof PackageTestLayer

export type HomeDeploymentOperationId =
  (typeof PackageContract.operations)[number]["id"]

export const PackageFuzzHandlers = {
  "deployment-config-codec": () => ({
    name: "thinkcentre-day0",
    hostnames: ["attune-cp-1", "attune-cp-2", "attune-cp-3"],
    localStateDir: ".attune/day0",
    secretRefs: ["thinkcentre-oauth-or-auth-key"],
    tailscaleAuthMaterialRequired: true,
  }),
  "day0-lifecycle-projection": () => ({
    name: "thinkcentre-day0",
    hostnames: ["attune-cp-1", "attune-cp-2", "attune-cp-3"],
    resourceIds: [
      "operator-machine",
      "tailscale-auth-material",
      "attune-cp-1:nixos-anywhere-install",
    ],
    phases: ["operator", "secrets", "hosts"],
    blockedResourceIds: ["attune-cp-1:nixos-anywhere-install"],
    destructiveResourceIds: ["attune-cp-1:nixos-anywhere-install"],
  }),
  "phase-summary-query": () => ({
    planned: 1,
    ready: 2,
    blocked: 1,
    nextAgentStepKind: "ManualGate" as const,
  }),
  "provider-transition": () => ({
    provider: "NixProvider",
    mode: "DryRun" as const,
    resourceId: "installer-image",
    operation: "safe" as const,
    status: "Planned" as const,
    mutated: false,
    command: ["nix", "build", "path:./nix/hosts#nixosConfigurations.attune-installer.config.system.build.isoImage"],
    display: "'nix' 'build' 'path:./nix/hosts#nixosConfigurations.attune-installer.config.system.build.isoImage'",
    evidence: [
      {
        ref: "NixProvider:DryRun:installer-image",
        summary: "DryRun transition for installer-image",
        secret: false,
      },
    ],
    blockers: [],
  }),
  "nixos-anywhere-install": () => ({
    provider: "NixosAnywhereProvider",
    mode: "Test" as const,
    resourceId: "attune-cp-1:nixos-anywhere-install",
    operation: "irreversible" as const,
    status: "Observed" as const,
    mutated: false,
    evidence: [
      {
        ref: "NixosAnywhereProvider:Test:attune-cp-1:nixos-anywhere-install:observed",
        summary:
          "Desired host state already observed; no repeated nixos-anywhere execution.",
        secret: false,
      },
    ],
    blockers: [],
  }),
  "alchemy-stack-resource": () => ({
    provider: "attune:alchemy:thinkcentre-day0-deployment" as const,
    deploymentResource: "attune:alchemy:ThinkCentreDay0Deployment",
    resourceCount: 3,
    bindingKinds: ["plan", "phase-summary", "manual-action"],
    liveExecution: false,
  }),
  "local-state-command": () => ({
    state: {
      confirmedGateIds: ["attune-cp-1:disk-wipe-confirmed"],
      completedResourceIds: [],
      failedResourceIds: [],
      records: [],
      gateEvidence: [
        {
          gateId: "attune-cp-1:disk-wipe-confirmed",
          evidence: { kind: "operator-confirmation" },
          confirmedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      evidence: [],
    },
    changedReactivityKeys: [
      "home-deployment.state-file.changed",
      "home-deployment.destructive-approval.changed",
    ],
  }),
  "manual-proof-confirmation": () => ({
    approvalId: "approval:attune-cp-1:nixos-anywhere-install",
    gateId: "attune-cp-1:disk-wipe-confirmed",
    resourceId: "attune-cp-1:nixos-anywhere-install",
    approvedBy: "operator",
    approvedAt: "2026-01-01T00:00:00.000Z",
    proofRef: "gate:attune-cp-1:disk-wipe-confirmed:2026-01-01T00:00:00.000Z",
  }),
  "command-intent-boundary": () => ({
    resourceId: "attune-cp-1:nixos-anywhere-install",
    command: ["nixos-anywhere", "--flake", "path:./nix/hosts#attune-cp-1", "root@attune-installer-cp-1.local"],
    display:
      "'nixos-anywhere' '--flake' 'path:./nix/hosts#attune-cp-1' 'root@attune-installer-cp-1.local'",
    executionBoundary: "rendered-only" as const,
    liveExecutionAllowed: false,
    redacted: true,
  }),
  "home-deployment-view-atoms": () => ({
    atomId: "destructiveApprovalAtom",
    reactivityKeys: [
      "home-deployment.destructive-approval.changed",
      "home-deployment.provider-gate.changed",
    ],
    dependsOnAtoms: ["providerGateAtom"],
    valueKind: "destructive-approval-state",
    readOnly: true,
  }),
} as const satisfies { readonly [Id in HomeDeploymentOperationId]: () => unknown }
export type PackageFuzzHandlers = typeof PackageFuzzHandlers

export const PackageProperties = {
  "deployment-config-codec": {
    property:
      "Deployment config values decode through Effect Schema and surface redacted config facts through deploymentPlanAtom.",
  },
  "day0-lifecycle-projection": {
    property:
      "Day-0 plan and local state replay deterministically into lifecycle graph, phase summary, and next agent step views.",
  },
  "phase-summary-query": {
    property:
      "Phase summaries and provider blockers are deterministic read-only queries over lifecycle graph state.",
  },
  "provider-transition": {
    property:
      "DryRun and Test provider transitions observe desired state, never live-execute, and move host/provider readiness views.",
  },
  "nixos-anywhere-install": {
    property:
      "Already observed desired host state returns Observed or Applied evidence; otherwise current disk proof and destructive approval are required.",
  },
  "alchemy-stack-resource": {
    property:
      "Alchemy deployment resources materialize plan/resource bindings without executing live provider transitions in PackageTestLayer.",
  },
  "local-state-command": {
    property:
      "Local state updates are schema-backed command records that announce state, gate, and destructive approval freshness.",
  },
  "manual-proof-confirmation": {
    property:
      "Manual proof confirmation records exact gate evidence before destructive approval state can move.",
  },
  "command-intent-boundary": {
    property:
      "Typed command intents render deterministically and reserve execution for the provider/executor boundary.",
  },
  "home-deployment-view-atoms": {
    property:
      "Package atoms expose Day-0 runbook readiness views as read-only derived state over Reactivity keys.",
  },
} as const satisfies {
  readonly [Id in HomeDeploymentOperationId]: { readonly property: string }
}
export type PackageProperties = typeof PackageProperties

export const PackageTypeGuidance = defineTypeGuidance(PackageContract, {
  sourceLabels: [
    "contract.operation",
    "effect-schema.ast",
    "operation.kind.day0-resource-runbook",
    "resource-provider.destructive-gate",
    "package-view-graph",
  ],
  sources: [
    {
      id: "contract:home-deployment",
      label: "home-deployment package contract",
      kind: "contract-operation",
    },
    {
      id: "views:home-deployment",
      label: "home-deployment Reactivity and atom graph",
      kind: "declared-view",
    },
  ],
  operations: {
    "deployment-config-codec": operationGuidance(
      deploymentConfigCodecOperation,
      codecLaws,
      {
        inputPartitionId: "deployment-config-codec.source",
        outputPartitionId: "deployment-config-codec.hosts",
        coverageTargetId: "deploymentPlanAtom.moves",
        transformId: "deployment-config-codec.config-source-coverage",
      },
    ),
    "day0-lifecycle-projection": operationGuidance(
      day0LifecycleProjectionOperation,
      projectionLaws,
      {
        inputPartitionId: "day0-lifecycle-projection.gate-state",
        outputPartitionId: "day0-lifecycle-projection.resource-statuses",
        coverageTargetId: "deploymentPlanAtom.moves",
        transformId: "day0-lifecycle-projection.state-coverage",
      },
    ),
    "phase-summary-query": operationGuidance(
      phaseSummaryQueryOperation,
      queryLaws,
      {
        inputPartitionId: "phase-summary-query.phase",
        outputPartitionId: "phase-summary-query.next-agent-step",
        coverageTargetId: "phaseSummaryAtom.moves",
        transformId: "phase-summary-query.phase-coverage",
      },
    ),
    "provider-transition": operationGuidance(
      providerTransitionOperation,
      resourceProviderLaws,
      {
        inputPartitionId: "provider-transition.mode-resource-status",
        outputPartitionId: "provider-transition.result-status",
        coverageTargetId: "providerGateAtom.moves",
        transformId: "provider-transition.dry-run-test-coverage",
        filterId: "provider-transition.no-live-execution",
        partitions: [
          {
            id: "provider-transition.resource-status",
            kind: "resource-state",
            from: "resource.observationSchema",
            sourceId: "operation:provider-transition",
          },
        ],
      },
    ),
    "nixos-anywhere-install": operationGuidance(
      nixosAnywhereInstallOperation,
      destructiveResourceProviderLaws,
      {
        inputPartitionId: "nixos-anywhere-install.observed-proof-approval",
        outputPartitionId: "nixos-anywhere-install.observed-or-applied-evidence",
        coverageTargetId: "destructiveApprovalAtom.moves",
        transformId: "nixos-anywhere-install.destructive-gate-coverage",
        filterId: "nixos-anywhere-install.no-live-execution",
        partitions: [
          {
            id: "nixos-anywhere-install.desired-state-observed",
            kind: "resource-state",
            from: "resource.observationSchema",
            sourceId: "operation:nixos-anywhere-install",
          },
          {
            id: "nixos-anywhere-install.current-proof",
            kind: "destructive-gate",
            from: "destructive.proof",
            sourceId: "operation:nixos-anywhere-install",
          },
          {
            id: "nixos-anywhere-install.current-approval",
            kind: "destructive-gate",
            from: "destructive.approval",
            sourceId: "operation:nixos-anywhere-install",
          },
        ],
      },
    ),
    "alchemy-stack-resource": operationGuidance(
      alchemyStackResourceOperation,
      resourceProviderLaws,
      {
        inputPartitionId: "alchemy-stack-resource.provider-mode",
        outputPartitionId: "alchemy-stack-resource.binding-kinds",
        coverageTargetId: "deploymentPlanAtom.moves",
        transformId: "alchemy-stack-resource.resource-binding-coverage",
        filterId: "alchemy-stack-resource.no-live-execution",
      },
    ),
    "local-state-command": operationGuidance(
      localStateCommandOperation,
      commandLaws,
      {
        inputPartitionId: "local-state-command.action",
        outputPartitionId: "local-state-command.changed-keys",
        coverageTargetId: "destructiveApprovalAtom.moves",
        transformId: "local-state-command.state-action-coverage",
      },
    ),
    "manual-proof-confirmation": operationGuidance(
      manualProofConfirmationOperation,
      commandLaws,
      {
        inputPartitionId: "manual-proof-confirmation.gate-id",
        outputPartitionId: "manual-proof-confirmation.approval-record",
        coverageTargetId: "destructiveApprovalAtom.moves",
        transformId: "manual-proof-confirmation.gate-coverage",
      },
    ),
    "command-intent-boundary": operationGuidance(
      commandIntentBoundaryOperation,
      commandLaws,
      {
        inputPartitionId: "command-intent-boundary.action-mode",
        outputPartitionId: "command-intent-boundary.rendered-command",
        coverageTargetId: "providerGateAtom.moves",
        transformId: "command-intent-boundary.intent-coverage",
        filterId: "command-intent-boundary.no-live-execution",
      },
    ),
    "home-deployment-view-atoms": operationGuidance(
      homeDeploymentViewAtomsOperation,
      atomFamilyLaws,
      {
        inputPartitionId: "home-deployment-view-atoms.atom-id",
        outputPartitionId: "home-deployment-view-atoms.readonly-value-kind",
        coverageTargetId: "destructiveApprovalAtom.moves",
        transformId: "home-deployment-view-atoms.atom-coverage",
      },
    ),
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance

type OperationWithGuidance = {
  readonly id: string
  readonly kind: string
  readonly input: unknown
  readonly output: unknown
  readonly error?: unknown
  readonly views?: {
    readonly reactivityKeys?: readonly string[]
    readonly atoms?: readonly string[]
  }
  readonly laws?: readonly string[]
}

type LawPartition<Laws extends readonly string[]> = {
  readonly [Index in keyof Laws]: {
    readonly id: Laws[Index]
    readonly kind: "law"
    readonly from: "inferred-law"
  }
}

type GuidancePartition = {
  readonly id: string
  readonly kind:
    | "schema-boundary"
    | "resource-state"
    | "destructive-gate"
    | "custom"
  readonly from: string
  readonly sourceId?: string
}

function operationGuidance<
  const Operation extends OperationWithGuidance,
  const Laws extends readonly string[],
>(
  operation: Operation,
  laws: Laws,
  options: {
    readonly inputPartitionId: string
    readonly outputPartitionId: string
    readonly coverageTargetId: string
    readonly transformId: string
    readonly filterId?: string
    readonly partitions?: readonly GuidancePartition[]
  },
) {
  return {
    sourceLabels: [
      `operation.kind.${operation.kind}`,
      "effect-schema.ast",
      "package-view-graph",
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
      schemaSource(operation.id, "input"),
      schemaSource(operation.id, "output"),
      schemaSource(operation.id, "error"),
    ],
    partitions: options.partitions ?? [],
    inputPartitions: [
      {
        id: options.inputPartitionId,
        kind: "schema-boundary" as const,
        from: "schema.input",
        sourceId: `schema:${operation.id}:input`,
        transformIds: [options.transformId],
        ...(options.filterId ? { filterIds: [options.filterId] } : {}),
      },
    ],
    outputPartitions: [
      {
        id: options.outputPartitionId,
        kind: "output-variant" as const,
        from: "schema.output",
        sourceId: `schema:${operation.id}:output`,
      },
    ],
    errorPartitions: [
      {
        id: `${operation.id}.typed-error`,
        kind: "typed-error-variant" as const,
        from: "schema.error",
        sourceId: `schema:${operation.id}:error`,
      },
    ],
    lawPartitions: lawPartitions(laws),
    viewPartitions: [
      ...viewPartitions(operation.id, "reactivity-key", operation.views?.reactivityKeys ?? []),
      ...viewPartitions(operation.id, "atom", operation.views?.atoms ?? []),
    ],
    coverageSearch: [
      {
        id: `coverage:${operation.id}:${options.coverageTargetId}`,
        targetPartitionId: options.coverageTargetId,
        tier: "commit" as const,
        required: true,
      },
    ],
    transforms: [
      {
        id: options.transformId,
        kind: "coverage-bias" as const,
        targetPartitionId: options.coverageTargetId,
        reason:
          "Bias generated cases toward missing Day-0 provider, gate, or package-view movement.",
      },
    ],
    filters: options.filterId
      ? [
        {
          id: options.filterId,
          kind: "operation-precondition" as const,
          reason:
            "Generated Day-0 audits stay on DryRun, Test, rendered-only, or already-observed paths; live provider execution remains waivered.",
          targetPartitionId: options.inputPartitionId,
          expectedAcceptanceRate: 0.95,
        },
      ]
      : [],
  } as const
}

function schemaSource(operationId: string, role: "input" | "output" | "error") {
  return {
    id: `schema:${operationId}:${role}`,
    role,
    label: `${operationId}.${role}`,
    source: "effect-schema" as const,
  }
}

function lawPartitions<const Laws extends readonly string[]>(laws: Laws): LawPartition<Laws> {
  return laws.map((id) => ({
    id,
    kind: "law",
    from: "inferred-law",
  })) as LawPartition<Laws>
}

function viewPartitions(
  operationId: string,
  kind: "reactivity-key" | "atom",
  values: readonly string[],
) {
  return values.map((value) => ({
    id: `${value}.moves`,
    kind,
    from: kind === "reactivity-key" ? "operation.views.reactivityKeys" : "operation.views.atoms",
    label: `${operationId}:${value}`,
  })) as readonly {
    readonly id: string
    readonly kind: "reactivity-key" | "atom"
    readonly from: "operation.views.reactivityKeys" | "operation.views.atoms"
    readonly label: string
  }[]
}
