import { defineAttunePackageDeclaration } from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"
export * from "./attune.contract.generated.js"

export const PackageViewRoots = {
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
} as const

export const PackageDeclaration = defineAttunePackageDeclaration({
  id: "attune-pi-agent",
  kind: "agent-extension",
  operations: [
    {
      id: "decide-permission",
      kind: "policy-rule",
      name: "Decide Permission",
    },
    {
      id: "run-spec-interview",
      kind: "query",
      name: "Run Spec Interview",
    },
    {
      id: "advance-spec-conversation",
      kind: "query",
      name: "Advance Spec Conversation",
    },
    {
      id: "query-evidence-matrix",
      kind: "query",
      name: "Query Evidence Matrix",
    },
    {
      id: "write-run-artifacts",
      kind: "command",
      name: "Write Run Artifacts",
    },
    {
      id: "run-pi-extension-boundary",
      kind: "command",
      name: "Run Pi Extension Boundary",
    },
    {
      id: "decode-schema-catalog",
      kind: "codec",
      name: "Decode Schema Catalog",
    },
    {
      id: "generate-spec-artifact",
      kind: "generator",
      name: "Generate Spec Artifact",
    },
    {
      id: "generate-permission-policy-artifact",
      kind: "generator",
      name: "Generate Permission Policy Artifact",
    },
    {
      id: "generate-test-obligation-artifact",
      kind: "generator",
      name: "Generate Test Obligation Artifact",
    },
    {
      id: "generate-taskplane-task-artifact",
      kind: "generator",
      name: "Generate Taskplane Task Artifact",
    },
  ],
  views: [
    ...PackageViewRoots.reactivityKeys.map((id) => ({
      id,
      kind: "reactivity-key" as const,
    })),
    ...PackageViewRoots.atoms.map((id) => ({
      id,
      kind: "atom" as const,
    })),
  ],
} as const)
