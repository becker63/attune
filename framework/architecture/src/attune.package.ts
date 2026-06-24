import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "architecture.policy-findings",
    "architecture.waiver-summary",
    "architecture.package-contract-coverage",
    "architecture.command-surface-findings",
    "architecture.generator-shape-findings",
    "architecture.artifact-ownership-findings",
    "architecture.rpc-descriptors",
    "architecture.type-guidance-coverage",
    "architecture.law-inference-findings",
    "architecture.workspace-policy-summary",
  ],
  atoms: [
    "policyFindingsAtom",
    "waiverSummaryAtom",
    "packageContractCoverageAtom",
    "commandSurfaceFindingsAtom",
    "generatorShapeFindingsAtom",
    "artifactOwnershipPolicyFindingsAtom",
    "rpcDescriptorAtom",
    "typeGuidanceCoverageAtom",
    "lawInferenceAtom",
    "workspacePolicySummaryAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "attune-architecture",
  kind: "architecture-policy",
  symbols: [
    {
      id: "package-contract-decode",
      kind: "codec",
      name: "package-contract-decode",
    },
    {
      id: "package-contract-assertions",
      kind: "policy-rule",
      name: "package-contract-assertions",
    },
    {
      id: "infer-operation-laws",
      kind: "query",
      name: "infer-operation-laws",
    },
    {
      id: "type-guidance-validate",
      kind: "policy-rule",
      name: "type-guidance-validate",
    },
    {
      id: "derive-rpc-descriptors",
      kind: "query",
      name: "derive-rpc-descriptors",
    },
    {
      id: "command-surface-conformance",
      kind: "policy-rule",
      name: "command-surface-conformance",
    },
    {
      id: "generator-shape-conformance",
      kind: "policy-rule",
      name: "generator-shape-conformance",
    },
    {
      id: "artifact-ownership-policy-scan",
      kind: "policy-rule",
      name: "artifact-ownership-policy-scan",
    },
    {
      id: "workspace-policy-summary",
      kind: "query",
      name: "workspace-policy-summary",
    },
  ],
  edges: [
    ...ProjectRuntimeRoots.reactivityKeys.map((id) => ({
      id,
      kind: "reactivity-key" as const,
    })),
    ...ProjectRuntimeRoots.atoms.map((id) => ({
      id,
      kind: "atom" as const,
    })),
  ],
} as const)
