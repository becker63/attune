import { describe, expect, it } from "vitest"
import {
  assertExactHandlers,
  assertLayerProvidesPackageServices,
  assertLayerSatisfiesRequiredServices,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  type AssertExactHandlers,
  type AssertLayerProvidesPackageServices,
  type AssertLayerSatisfiesRequiredServices,
  type AssertPackageContract,
  type AssertPropertyHarnesses,
  type AssertTrue,
  type AssertTypeGuidanceComplete,
  type RequiredServicesOf,
} from "../src/project-facts/assertions.js"

const PackageContract = {
  packageId: "example",
  packageKind: "architecture-policy",
  views: {
    reactivityKeys: ["facts.changed", "install.changed"],
    atoms: ["factsAtom", "installAtom"],
  },
  services: {
    provides: ["ExampleService"],
    requires: ["Clock"],
  },
  operations: [
    {
      id: "lookup",
      kind: "query",
      input: "LookupInput",
      output: "LookupOutput",
      views: {
        reactivityKeys: ["facts.changed"],
        atoms: ["factsAtom"],
      },
      laws: ["schema.decode"],
    },
    {
      id: "generate",
      kind: "generator",
      input: "GenerateInput",
      output: "GenerateOutput",
      generator: {
        name: "@attune/nx:example",
      },
      requires: ["Tree"],
      laws: ["generator.deterministic"],
    },
    {
      id: "install",
      kind: "resource-provider",
      input: "InstallInput",
      output: "InstallOutput",
      observes: {
        schema: "InstalledHostObservation",
      },
      destructive: {
        proof: "DiskProof",
        approval: "DestructiveApproval",
      },
      views: {
        reactivityKeys: ["install.changed"],
        atoms: ["installAtom"],
      },
      laws: ["resource.observed-idempotence", "resource.destructive-approval"],
    },
  ],
} as const

const PackageFuzzHandlers = {
  lookup: () => ({ status: "ok" as const }),
  generate: {
    run: () => ({ files: [] as readonly string[] }),
  },
  install: () => ({ status: "observed" as const }),
} as const

const PackageProperties = {
  lookup: {
    property: "lookup preserves schema decode",
  },
  generate: () => true,
  install: {
    assert: () => true,
  },
} as const

const PackageLayer = {
  provides: ["ExampleService"],
} as const

const programTestLayer = {
  provides: ["Clock", "Tree"],
} as const

const PackageTypeGuidance = {
  operations: {
    lookup: {
      lawPartitions: [{ id: "schema.decode", from: "explicit-law" }],
      viewPartitions: [{ id: "facts.changed", from: "touches.reactivity-key" }],
    },
    generate: {
      lawPartitions: [{ id: "generator.deterministic", from: "explicit-law" }],
      viewPartitions: [],
    },
    install: {
      lawPartitions: [
        { id: "resource.observed-idempotence", from: "explicit-law" },
        { id: "resource.destructive-approval", from: "explicit-law" },
      ],
      viewPartitions: [{ id: "install.changed", from: "touches.reactivity-key" }],
    },
  },
} as const

const MetadataGeneratorContract = {
  packageId: "metadata-generator",
  packageKind: "generator-tooling",
  views: {
    reactivityKeys: [],
    atoms: [],
  },
  operations: [
    {
      id: "generate",
      kind: "generator",
      input: "GenerateInput",
      output: "GenerateOutput",
      metadata: {
        generator: {
          name: "@attune/nx:example",
        },
      },
    },
  ],
} as const

const IrrelevantMetadataGeneratorContract = {
  packageId: "bad-generator",
  packageKind: "generator-tooling",
  views: {
    reactivityKeys: [],
    atoms: [],
  },
  operations: [
    {
      id: "generate",
      kind: "generator",
      input: "GenerateInput",
      output: "GenerateOutput",
      metadata: {
        foo: true,
      },
    },
  ],
} as const

type Contract = typeof PackageContract

type _contract = AssertTrue<AssertPackageContract<Contract>>
type _metadataGeneratorContract = AssertTrue<
  AssertPackageContract<typeof MetadataGeneratorContract>
>
// @ts-expect-error Irrelevant metadata must not satisfy generator metadata.
type _irrelevantMetadataGeneratorContract = AssertTrue<AssertPackageContract<typeof IrrelevantMetadataGeneratorContract>>
type _handlers = AssertTrue<AssertExactHandlers<Contract, typeof PackageFuzzHandlers>>
type _properties = AssertTrue<AssertPropertyHarnesses<Contract, typeof PackageProperties>>
type _packageLayer = AssertTrue<AssertLayerProvidesPackageServices<Contract, typeof PackageLayer>>
type _testLayer = AssertTrue<AssertLayerSatisfiesRequiredServices<Contract, typeof programTestLayer>>
type _typeGuidance = AssertTrue<AssertTypeGuidanceComplete<Contract, typeof PackageTypeGuidance>>
type _requiredServices = AssertTrue<RequiredServicesOf<Contract> extends "Clock" | "Tree" ? true : false>

describe("project facts assertion helpers", () => {
  it("returns true from no-op runtime helpers for valid compile-time shapes", () => {
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertLayerProvidesPackageServices(PackageContract, PackageLayer)).toBe(true)
    expect(assertLayerSatisfiesRequiredServices(PackageContract, programTestLayer)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
  })
})
