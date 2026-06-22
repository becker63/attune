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
  PackageContract,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
} from "./attune.package.js"

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

export {}
