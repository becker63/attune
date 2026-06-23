import { defineAttunePackageDeclaration } from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViewRoots = {
  reactivityKeys: [
    "architecture.policy-findings",
    "architecture.waiver-summary",
    "architecture.package-contract-coverage",
    "architecture.command-surface-findings",
    "architecture.generator-shape-findings",
    "architecture.source-bom-findings",
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
    "sourceBomPolicyFindingsAtom",
    "rpcDescriptorAtom",
    "typeGuidanceCoverageAtom",
    "lawInferenceAtom",
    "workspacePolicySummaryAtom",
  ],
} as const

export const PackageDeclaration = defineAttunePackageDeclaration({
  id: "attune-architecture",
  kind: "architecture-policy",
  operations: [
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
      id: "source-bom-policy-scan",
      kind: "policy-rule",
      name: "source-bom-policy-scan",
    },
    {
      id: "workspace-policy-summary",
      kind: "query",
      name: "workspace-policy-summary",
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
