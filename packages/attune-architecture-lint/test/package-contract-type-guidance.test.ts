import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"

import {
  PackageTypeGuidance,
  defineTypeGuidance,
  packagePartitionIds,
  type TypeGuidanceOperationIds,
  type TypeGuidancePartitionIds,
} from "../src/package-contract/type-guidance.js"

const InstallInput = Schema.Struct({
  host: Schema.String,
  diskProofRef: Schema.String,
  destructiveApprovalRef: Schema.String,
})

const InstallOutput = Schema.Struct({
  status: Schema.Literals(["Observed", "Applied"] as const),
})

const InstallError = Schema.Struct({
  tag: Schema.Literals(["ssh.unreachable", "approval.stale"] as const),
})

const DiscoveryInput = Schema.Struct({
  cidr: Schema.String,
})

const DiscoveryOutput = Schema.Struct({
  hosts: Schema.Array(Schema.String),
})

const PackageContract = {
  packageId: "home-deployment",
  operations: [
    {
      id: "nixos-anywhere-install",
      kind: "resource-provider",
      input: InstallInput,
      output: InstallOutput,
      error: InstallError,
    },
    {
      id: "lan-discovery-scan",
      kind: "query",
      input: DiscoveryInput,
      output: DiscoveryOutput,
    },
  ],
} as const

const PackageTypeGuidanceSpec = {
  sourceLabels: ["contract.operation", "effect-schema.ast", "inferred-law"],
  sources: [
    {
      id: "contract:home-deployment",
      label: "home-deployment package contract",
      kind: "contract-operation",
    },
  ],
  operations: {
    "nixos-anywhere-install": {
      sourceLabels: ["operation.kind.resource-provider", "destructive.metadata"],
      schemaSources: [
        {
          id: "schema:nixos-anywhere-install:input",
          role: "input",
          label: "NixosAnywhereInstallInput",
          source: "effect-schema",
        },
        {
          id: "schema:nixos-anywhere-install:error",
          role: "error",
          label: "NixosAnywhereInstallError",
          source: "effect-schema",
        },
      ],
      inputPartitions: [
        {
          id: "disk-proof.present",
          kind: "schema-field",
          from: "schema.required-field",
          sourceId: "schema:nixos-anywhere-install:input",
        },
        {
          id: "approval.current",
          kind: "destructive-gate",
          from: "destructive.approval-schema",
          sourceId: "schema:nixos-anywhere-install:input",
          transformIds: ["bias-current-approval"],
          filterIds: ["fresh-disk-proof"],
        },
      ],
      outputPartitions: [
        {
          id: "install.observed",
          kind: "output-variant",
          from: "output.discriminant",
        },
        {
          id: "install.applied",
          kind: "output-variant",
          from: "output.discriminant",
        },
      ],
      errorPartitions: [
        {
          id: "ssh.unreachable",
          kind: "typed-error-variant",
          from: "typed-error.discriminant",
        },
      ],
      lawPartitions: [
        {
          id: "resource.observed-idempotence",
          kind: "law",
          from: "inferred-law",
        },
        {
          id: "resource.destructive-approval",
          kind: "law",
          from: "inferred-law",
        },
      ],
      viewPartitions: [
        {
          id: "host-readiness.moves",
          kind: "reactivity-key",
          from: "touches.reactivity-key",
        },
      ],
      coverageSearch: [
        {
          id: "coverage:approval.current",
          targetPartitionId: "approval.current",
          tier: "commit",
          required: true,
          priority: 10,
          reason: "Destructive installs must search current approval cases first.",
        },
      ],
      transforms: [
        {
          id: "bias-current-approval",
          kind: "weighted",
          targetPartitionId: "approval.current",
          sourceLabel: "destructive.metadata",
          reason: "Bias Schema-derived values toward current approval proof.",
        },
      ],
      filters: [
        {
          id: "fresh-disk-proof",
          kind: "operation-precondition",
          targetPartitionId: "approval.current",
          reason: "Current destructive approval requires matching disk proof evidence.",
          expectedAcceptanceRate: 0.9,
        },
      ],
    },
    "lan-discovery-scan": {
      sourceLabels: ["operation.kind.query", "schema.boundary"],
      inputPartitions: [
        {
          id: "cidr.link-scope",
          kind: "schema-boundary",
          from: "schema.annotation",
        },
      ],
      outputPartitions: [
        {
          id: "hosts.empty",
          kind: "collection-boundary",
          from: "schema.collection-boundary",
        },
        {
          id: "hosts.many",
          kind: "collection-boundary",
          from: "schema.collection-boundary",
        },
      ],
    },
  },
} as const

const PackageTypeGuidanceValue = defineTypeGuidance(PackageContract, PackageTypeGuidanceSpec)

describe("PackageTypeGuidance", () => {
  it("preserves operation ids from the package contract", () => {
    expect(Object.keys(PackageTypeGuidanceValue.operations)).toEqual([
      "nixos-anywhere-install",
      "lan-discovery-scan",
    ])
    expect(PackageTypeGuidanceValue.operations["nixos-anywhere-install"].operationId).toBe("nixos-anywhere-install")
    expect(PackageTypeGuidanceValue.operations["lan-discovery-scan"].operationId).toBe("lan-discovery-scan")

    expectTypeOf<TypeGuidanceOperationIds<typeof PackageTypeGuidanceValue>>().toEqualTypeOf<
      "nixos-anywhere-install" | "lan-discovery-scan"
    >()
  })

  it("captures source labels and Schema source descriptors", () => {
    const decoded = Schema.decodeUnknownSync(PackageTypeGuidance)(PackageTypeGuidanceValue)

    expect(decoded.sourceLabels).toEqual(["contract.operation", "effect-schema.ast", "inferred-law"])
    expect(decoded.operations["nixos-anywhere-install"]?.sourceLabels).toEqual([
      "operation.kind.resource-provider",
      "destructive.metadata",
    ])
    expect(decoded.operations["nixos-anywhere-install"]?.schemaSources).toContainEqual({
      id: "schema:nixos-anywhere-install:error",
      role: "error",
      label: "NixosAnywhereInstallError",
      source: "effect-schema",
    })
  })

  it("keeps partition ids as stable runtime values", () => {
    expect(packagePartitionIds(PackageTypeGuidanceValue)).toEqual({
      "nixos-anywhere-install": [
        "disk-proof.present",
        "approval.current",
        "install.observed",
        "install.applied",
        "ssh.unreachable",
        "resource.observed-idempotence",
        "resource.destructive-approval",
        "host-readiness.moves",
      ],
      "lan-discovery-scan": ["cidr.link-scope", "hosts.empty", "hosts.many"],
    })

    expectTypeOf<TypeGuidancePartitionIds<typeof PackageTypeGuidanceSpec, "nixos-anywhere-install">>().toEqualTypeOf<
      | "disk-proof.present"
      | "approval.current"
      | "install.observed"
      | "install.applied"
      | "ssh.unreachable"
      | "resource.observed-idempotence"
      | "resource.destructive-approval"
      | "host-readiness.moves"
    >()
  })

  it("represents transform and filter metadata without custom envelopes", () => {
    const install = PackageTypeGuidanceValue.operations["nixos-anywhere-install"]
    const approvalPartition = install.inputPartitions.find((partition) => partition.id === "approval.current")

    expect(approvalPartition).toMatchObject({
      id: "approval.current",
      transformIds: ["bias-current-approval"],
      filterIds: ["fresh-disk-proof"],
    })
    expect(install.coverageSearch).toContainEqual(expect.objectContaining({
      id: "coverage:approval.current",
      targetPartitionId: "approval.current",
    }))
    expect(install.transforms).toContainEqual(expect.objectContaining({
      id: "bias-current-approval",
      targetPartitionId: "approval.current",
    }))
    expect(install.filters).toContainEqual(expect.objectContaining({
      id: "fresh-disk-proof",
      targetPartitionId: "approval.current",
    }))
  })
})
