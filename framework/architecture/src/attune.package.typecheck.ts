import type {
  AssertExactHandlers,
  AssertLayerProvidesPackageServices,
  AssertLayerSatisfiesRequiredServices,
  AssertPackageContract,
  AssertPropertyHarnesses,
  AssertTrue,
  AssertTypeGuidanceComplete,
} from "../../protocol/src/package-contract/index.js"
import type {
  PackageContract,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
} from "./attune.package.js"

type _PackageContract = AssertTrue<AssertPackageContract<PackageContract>>
type _PackageFuzzHandlers = AssertTrue<
  AssertExactHandlers<PackageContract, typeof PackageFuzzHandlers>
>
type _PackageProperties = AssertTrue<
  AssertPropertyHarnesses<PackageContract, typeof PackageProperties>
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

export {}
