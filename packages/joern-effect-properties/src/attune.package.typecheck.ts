import type {
  AssertExactHandlers,
  AssertLayerProvidesPackageServices,
  AssertLayerSatisfiesRequiredServices,
  AssertPackageContract,
  AssertPropertyHarnesses,
  AssertTrue,
  AssertTypeGuidanceComplete,
} from "@attune/framework-protocol"
import type {
  PackageAtomGraphCoverage,
  PackageContract,
  PackageEvidenceShapes,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTargetIntents,
  PackageTypeGuidance,
} from "./attune.package.js"

type OperationIds<Contract> =
  Contract extends { readonly operations: readonly (infer Operation)[] }
    ? Operation extends { readonly id: infer Id extends string } ? Id : never
    : never

type EvidenceShapeOperationIds<EvidenceShapes> = Extract<keyof EvidenceShapes, string>

type AtomGraphCoverageOperationIds<Coverage> = Extract<keyof Coverage, string>

type TargetIntentOperationIds<TargetIntents> =
  TargetIntents extends readonly (infer TargetIntent)[]
    ? TargetIntent extends { readonly operationIds: readonly (infer Id extends string)[] }
      ? Id
      : never
    : never

type _PackageContract = AssertTrue<AssertPackageContract<PackageContract>>
type _PackageFuzzHandlers = AssertTrue<
  AssertExactHandlers<PackageContract, PackageFuzzHandlers>
>
type _PackageProperties = AssertTrue<
  AssertPropertyHarnesses<PackageContract, PackageProperties>
>
type _PackageLayer = AssertTrue<
  AssertLayerProvidesPackageServices<PackageContract, PackageLayer>
>
type _PackageTestLayer = AssertTrue<
  AssertLayerSatisfiesRequiredServices<PackageContract, PackageTestLayer>
>
type _PackageTypeGuidance = AssertTrue<
  AssertTypeGuidanceComplete<PackageContract, PackageTypeGuidance>
>
type _PackageEvidenceShapes = AssertTrue<
  [EvidenceShapeOperationIds<PackageEvidenceShapes>] extends [OperationIds<PackageContract>]
    ? [OperationIds<PackageContract>] extends [EvidenceShapeOperationIds<PackageEvidenceShapes>]
      ? true
      : false
    : false
>
type _PackageAtomGraphCoverageReferencesKnownOperations = AssertTrue<
  [Exclude<AtomGraphCoverageOperationIds<PackageAtomGraphCoverage>, OperationIds<PackageContract>>] extends [never]
    ? true
    : false
>
type _PackageTargetIntentsReferenceKnownOperations = AssertTrue<
  [Exclude<TargetIntentOperationIds<PackageTargetIntents>, OperationIds<PackageContract>>] extends [never]
    ? true
    : false
>

export {}
