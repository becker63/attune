import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"

import {
  PackageContractSchema,
  assertExactHandlers,
  assertLayerProvidesPackageServices,
  assertLayerSatisfiesRequiredServices,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  inferLawIds,
  packagePartitionIds,
  type OperationIds,
} from "@attune/framework-protocol"
import {
  PackageContract,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
  PackageViews,
  PiAgentServices,
  decidePermissionOperation,
  generatePermissionPolicyArtifactOperation,
  generatorLaws,
  policyRuleLaws,
} from "../src/attune.package.js"

type PiAgentOperationId = OperationIds<typeof PackageContract>

const operationIds = (): readonly PiAgentOperationId[] =>
  PackageContract.operations.map((operation) => operation.id)

describe("attune-pi-agent package contract", () => {
  it("declares the agent-extension package boundary and public operation ids", () => {
    expect(PackageContract.packageId).toBe("attune-pi-agent")
    expect(PackageContract.packageKind).toBe("agent-extension")
    expect(PackageContract.sourceRoot).toBe("packages/attune-pi-agent")
    expect(operationIds()).toEqual([
      "decide-permission",
      "run-spec-interview",
      "advance-spec-conversation",
      "query-evidence-matrix",
      "write-run-artifacts",
      "run-pi-extension-boundary",
      "decode-schema-catalog",
      "generate-spec-artifact",
      "generate-permission-policy-artifact",
      "generate-test-obligation-artifact",
      "generate-taskplane-task-artifact",
    ])
    expect(PackageContract.services).toEqual(PiAgentServices)
    expect(PackageLayer.provides).toEqual(PiAgentServices)

    expectTypeOf<PiAgentOperationId>().toEqualTypeOf<
      | "decide-permission"
      | "run-spec-interview"
      | "advance-spec-conversation"
      | "query-evidence-matrix"
      | "write-run-artifacts"
      | "run-pi-extension-boundary"
      | "decode-schema-catalog"
      | "generate-spec-artifact"
      | "generate-permission-policy-artifact"
      | "generate-test-obligation-artifact"
      | "generate-taskplane-task-artifact"
    >()
  })

  it("decodes through the shared Effect Schema contract and keeps exact maps", () => {
    const decoded = Schema.decodeUnknownSync(PackageContractSchema)(PackageContract)

    expect(decoded.packageId).toBe("attune-pi-agent")
    expect(decoded.packageKind).toBe("agent-extension")
    expect(decoded.operations).toHaveLength(11)
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertLayerProvidesPackageServices(PackageContract, PackageLayer)).toBe(true)
    expect(assertLayerSatisfiesRequiredServices(PackageContract, PackageTestLayer)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
    expect(Object.keys(PackageFuzzHandlers).sort()).toEqual([...operationIds()].sort())
    expect(Object.keys(PackageProperties).sort()).toEqual([...operationIds()].sort())
  })

  it("declares Pi package views for decisions, evidence, artifacts, generators, and taskplane", () => {
    expect(PackageViews.reactivityKeys).toEqual([
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
    ])
    expect(PackageViews.atoms).toEqual([
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
    ])
    expect(decidePermissionOperation.views.atoms).toContain("permissionDecisionAtom")
    expect(generatePermissionPolicyArtifactOperation.views.atoms).toContain("generatorDiffAtom")
  })

  it("keeps inferred law metadata aligned for policy and generator operations", () => {
    expect(
      inferLawIds({
        id: decidePermissionOperation.id,
        kind: decidePermissionOperation.kind,
        schemas: {
          input: decidePermissionOperation.input,
          output: decidePermissionOperation.output,
          error: decidePermissionOperation.error,
        },
        views: decidePermissionOperation.views,
        policy: decidePermissionOperation.policy,
      }),
    ).toEqual(policyRuleLaws)

    expect(
      inferLawIds({
        id: generatePermissionPolicyArtifactOperation.id,
        kind: generatePermissionPolicyArtifactOperation.kind,
        schemas: {
          input: generatePermissionPolicyArtifactOperation.input,
          output: generatePermissionPolicyArtifactOperation.output,
          error: generatePermissionPolicyArtifactOperation.error,
        },
        views: generatePermissionPolicyArtifactOperation.views,
        generator: {
          optionsSchema: generatePermissionPolicyArtifactOperation.input,
          outputSchema: generatePermissionPolicyArtifactOperation.output,
          provenanceSchema: generatePermissionPolicyArtifactOperation.generator.provenanceSchema,
        },
      }),
    ).toEqual(generatorLaws)
  })

  it("records type-guidance partitions for generated FastCheck search", () => {
    const partitions = packagePartitionIds(PackageTypeGuidance)

    expect(partitions["decide-permission"]).toEqual(expect.arrayContaining([
      "permission.subject.path",
      "permission.secret-deny",
      "permission.decision.deny",
      "decide-permission.atom.permissionDecisionAtom",
    ]))
    expect(partitions["advance-spec-conversation"]).toEqual(expect.arrayContaining([
      "conversation.action.start",
      "conversation.action.answer",
      "conversation.draft-ready",
    ]))
    expect(partitions["generate-taskplane-task-artifact"]).toEqual(expect.arrayContaining([
      "generate-taskplane-task-artifact.taskplane-task",
      "generate-taskplane-task-artifact.atom.taskplaneAtom",
    ]))
    expect(PackageTypeGuidance.operations["decide-permission"].filters).toContainEqual(
      expect.objectContaining({
        id: "permission.profile-rule-precondition",
        kind: "operation-precondition",
      }),
    )
  })

  it("records pre-ratchet waivers instead of hiding unresolved host and command surfaces", () => {
    expect(PackageContract.waivers.map((waiver) => waiver.id)).toEqual([
      "attune-pi-agent/pi-host-extension-boundary",
      "attune-pi-agent/run-artifact-filesystem-writer",
      "attune-pi-agent/custom-fastcheck-arbitraries",
      "attune-pi-agent/raw-command-surfaces",
    ])
  })
})
