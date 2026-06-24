import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"
import {
  AtomIdsOf,
  EncodedInputOf,
  ErrorOf,
  InputOf,
  OperationById,
  OperationIds,
  OperationKindSchema,
  OperationKinds,
  OutputOf,
  PackageContractSchema,
  PackageContractTypes,
  PackageKindSchema,
  PackageKinds,
  TouchedAtomIdsOf,
  TouchedViewKeysOf,
  ViewKeysOf,
  attuneTypeDiagnostic,
  defineOperation,
  definePackageContract,
  definePackageViews,
  touches,
} from "../src/project-facts/core.js"

const InstallInput = Schema.Struct({
  host: Schema.String,
  disk: Schema.String,
})

const InstallOutput = Schema.Struct({
  installed: Schema.Boolean,
})

const InstallError = Schema.Struct({
  reason: Schema.String,
})

const PackageViews = definePackageViews({
  reactivityKeys: ["host-readiness", "destructive-approval"],
  atoms: ["hostReadinessAtom", "providerGateAtom"],
} as const)

const InstallOperation = defineOperation({
  id: "nixos-anywhere-install",
  kind: "resource-provider",
  input: InstallInput,
  output: InstallOutput,
  error: InstallError,
  views: touches(PackageViews, {
    reactivityKeys: ["host-readiness", "destructive-approval"],
    atoms: ["hostReadinessAtom", "providerGateAtom"],
  } as const),
  laws: ["schema.decode", "resource.observed-idempotence"] as const,
})

const PackageContract = definePackageContract({
  packageId: "home-deployment",
  sourceRoot: "packages/home-deployment",
  packageKind: "day0-resource-runbook",
  views: PackageViews,
  operations: [InstallOperation] as const,
})

describe("project facts core", () => {
  it("preserves literal package ids, operation ids, operation kinds, and package views", () => {
    expect(PackageContract.packageId).toBe("home-deployment")
    expect(PackageContract.packageKind).toBe("day0-resource-runbook")
    expect(PackageContract.operations[0]?.id).toBe("nixos-anywhere-install")
    expect(PackageContract.operations[0]?.kind).toBe("resource-provider")
    expect(PackageContract.views.reactivityKeys).toEqual(["host-readiness", "destructive-approval"])
    expect(PackageContract.views.atoms).toEqual(["hostReadinessAtom", "providerGateAtom"])

    expectTypeOf<typeof PackageContract.packageId>().toEqualTypeOf<"home-deployment">()
    expectTypeOf<OperationIds<typeof PackageContract>>().toEqualTypeOf<"nixos-anywhere-install">()
    expectTypeOf<ViewKeysOf<typeof PackageContract>>().toEqualTypeOf<
      "host-readiness" | "destructive-approval"
    >()
    expectTypeOf<AtomIdsOf<typeof PackageContract>>().toEqualTypeOf<
      "hostReadinessAtom" | "providerGateAtom"
    >()
  })

  it("preserves touched Reactivity keys and atom ids", () => {
    const selected = touches(PackageViews, {
      reactivityKeys: ["host-readiness"],
      atoms: ["providerGateAtom"],
    } as const)
    const standalone = touches({
      reactivityKeys: ["policy-findings"],
      atoms: ["policyFindingsAtom"],
    } as const)

    expect(selected.reactivityKeys).toEqual(["host-readiness"])
    expect(selected.atoms).toEqual(["providerGateAtom"])
    expect(standalone.reactivityKeys).toEqual(["policy-findings"])
    expect(standalone.atoms).toEqual(["policyFindingsAtom"])

    expectTypeOf<TouchedViewKeysOf<typeof InstallOperation>>().toEqualTypeOf<
      "host-readiness" | "destructive-approval"
    >()
    expectTypeOf<TouchedAtomIdsOf<typeof InstallOperation>>().toEqualTypeOf<
      "hostReadinessAtom" | "providerGateAtom"
    >()
  })

  it("returns stable runtime objects from identity builders", () => {
    const rawViews = {
      reactivityKeys: ["policy-results"],
      atoms: ["policyResultAtom"],
    } as const
    const views = definePackageViews(rawViews)
    const operation = defineOperation({
      id: "scan-policy",
      kind: "policy-rule",
      input: Schema.Struct({ path: Schema.String }),
      output: Schema.Struct({ findings: Schema.Array(Schema.String) }),
      views: touches(views, { reactivityKeys: ["policy-results"], atoms: ["policyResultAtom"] } as const),
    })
    const contractInput = {
      packageId: "attune-architecture",
      packageKind: "architecture-policy",
      views,
      operations: [operation] as const,
    } as const

    expect(views).toBe(rawViews)
    expect(definePackageContract(contractInput)).toBe(contractInput)
    expect(contractInput.operations[0]).toBe(operation)
  })

  it("derives Schema decoded and encoded operation types", () => {
    type InstallId = OperationIds<typeof PackageContract>
    type Install = OperationById<typeof PackageContract, "nixos-anywhere-install">

    expectTypeOf<InstallId>().toEqualTypeOf<"nixos-anywhere-install">()
    expectTypeOf<Install["kind"]>().toEqualTypeOf<"resource-provider">()
    expectTypeOf<InputOf<typeof PackageContract, "nixos-anywhere-install">>().toEqualTypeOf<{
      readonly host: string
      readonly disk: string
    }>()
    expectTypeOf<EncodedInputOf<typeof PackageContract, "nixos-anywhere-install">>().toEqualTypeOf<{
      readonly host: string
      readonly disk: string
    }>()
    expectTypeOf<OutputOf<typeof PackageContract, "nixos-anywhere-install">>().toEqualTypeOf<{
      readonly installed: boolean
    }>()
    expectTypeOf<ErrorOf<typeof PackageContract, "nixos-anywhere-install">>().toEqualTypeOf<{
      readonly reason: string
    }>()
    expectTypeOf<PackageContractTypes<typeof PackageContract>["operationIds"]>().toEqualTypeOf<
      "nixos-anywhere-install"
    >()
  })

  it("exposes runtime schemas and diagnostic helpers", () => {
    expect(OperationKinds).toContain("generator")
    expect(PackageKinds).toContain("day0-resource-runbook")
    expect(Schema.decodeUnknownSync(OperationKindSchema)("projection")).toBe("projection")
    expect(Schema.decodeUnknownSync(PackageKindSchema)("architecture-policy")).toBe("architecture-policy")

    const decoded = Schema.decodeUnknownSync(PackageContractSchema)({
      packageId: "home-deployment",
      sourceRoot: "packages/home-deployment",
      packageKind: "day0-resource-runbook",
      views: {
        reactivityKeys: ["host-readiness"],
        atoms: ["hostReadinessAtom"],
      },
      operations: [{
        id: "plan-summary",
        kind: "query",
        input: {},
        output: {},
        views: {
          reactivityKeys: ["host-readiness"],
          atoms: ["hostReadinessAtom"],
        },
      }],
    })
    expect(decoded.operations[0]?.kind).toBe("query")

    const diagnostic = attuneTypeDiagnostic("Unknown operation kind", "workflow")
    expect(diagnostic).toEqual({
      _tag: "AttuneTypeError",
      message: ["Unknown operation kind", "workflow"],
    })
    expectTypeOf<typeof diagnostic.message>().toEqualTypeOf<
      readonly ["Unknown operation kind", "workflow"]
    >()
  })
})
