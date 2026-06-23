import type {
  AssertExactHandlers,
  AssertLayerProvidesPackageServices,
  AssertLayerSatisfiesRequiredServices,
  AssertPackageContract,
  AssertPropertyHarnesses,
  AssertTrue,
  AssertTypeGuidanceComplete,
} from "@attune/framework-protocol"
import type * as FrameworkArchitecture from "../attune.package.js"
import type * as FrameworkOxlintPolicy from "../../../oxlint-policy/src/attune.package.js"
import type * as AttuneFoldkit from "../../../../packages/attune-foldkit/src/attune.package.js"
import type * as AttuneNx from "../../../../packages/attune-nx/src/attune.package.js"
import type * as AttunePiAgent from "../../../../packages/attune-pi-agent/src/attune.package.js"
import type * as AttunedDiscovery from "../../../../packages/attuned-discovery/src/attune.package.js"
import type * as CocoindexEffect from "../../../../packages/cocoindex-effect/src/attune.package.js"
import type * as HomeDeployment from "../../../../packages/home-deployment/src/attune.package.js"
import type * as JoernEffect from "../../../../packages/joern-effect/src/attune.package.js"
import type * as JoernEffectProperties from "../../../../packages/joern-effect-properties/src/attune.package.js"
import type * as PlatformAlchemyK8s from "./package-contracts/platform-alchemy-k8s/attune.contract.generated.js"

type _FrameworkArchitecture = readonly [
  AssertTrue<AssertPackageContract<FrameworkArchitecture.PackageContract>>,
  AssertTrue<AssertExactHandlers<FrameworkArchitecture.PackageContract, FrameworkArchitecture.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<FrameworkArchitecture.PackageContract, FrameworkArchitecture.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<FrameworkArchitecture.PackageContract, FrameworkArchitecture.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<FrameworkArchitecture.PackageContract, FrameworkArchitecture.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<FrameworkArchitecture.PackageContract, FrameworkArchitecture.PackageTypeGuidance>>,
]
type _FrameworkOxlintPolicy = readonly [
  AssertTrue<AssertPackageContract<FrameworkOxlintPolicy.PackageContract>>,
  AssertTrue<AssertExactHandlers<FrameworkOxlintPolicy.PackageContract, FrameworkOxlintPolicy.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<FrameworkOxlintPolicy.PackageContract, FrameworkOxlintPolicy.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<FrameworkOxlintPolicy.PackageContract, FrameworkOxlintPolicy.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<FrameworkOxlintPolicy.PackageContract, FrameworkOxlintPolicy.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<FrameworkOxlintPolicy.PackageContract, FrameworkOxlintPolicy.PackageTypeGuidance>>,
]
type _AttuneFoldkit = readonly [
  AssertTrue<AssertPackageContract<AttuneFoldkit.PackageContract>>,
  AssertTrue<AssertExactHandlers<AttuneFoldkit.PackageContract, AttuneFoldkit.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<AttuneFoldkit.PackageContract, AttuneFoldkit.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<AttuneFoldkit.PackageContract, AttuneFoldkit.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<AttuneFoldkit.PackageContract, AttuneFoldkit.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<AttuneFoldkit.PackageContract, AttuneFoldkit.PackageTypeGuidance>>,
]
type _AttuneNx = readonly [
  AssertTrue<AssertPackageContract<AttuneNx.PackageContract>>,
  AssertTrue<AssertExactHandlers<AttuneNx.PackageContract, AttuneNx.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<AttuneNx.PackageContract, AttuneNx.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<AttuneNx.PackageContract, AttuneNx.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<AttuneNx.PackageContract, AttuneNx.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<AttuneNx.PackageContract, AttuneNx.PackageTypeGuidance>>,
]
type _AttunePiAgent = readonly [
  AssertTrue<AssertPackageContract<AttunePiAgent.PackageContract>>,
  AssertTrue<AssertExactHandlers<AttunePiAgent.PackageContract, AttunePiAgent.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<AttunePiAgent.PackageContract, AttunePiAgent.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<AttunePiAgent.PackageContract, AttunePiAgent.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<AttunePiAgent.PackageContract, AttunePiAgent.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<AttunePiAgent.PackageContract, AttunePiAgent.PackageTypeGuidance>>,
]
type _AttunedDiscovery = readonly [
  AssertTrue<AssertPackageContract<AttunedDiscovery.PackageContract>>,
  AssertTrue<AssertExactHandlers<AttunedDiscovery.PackageContract, AttunedDiscovery.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<AttunedDiscovery.PackageContract, AttunedDiscovery.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<AttunedDiscovery.PackageContract, AttunedDiscovery.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<AttunedDiscovery.PackageContract, AttunedDiscovery.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<AttunedDiscovery.PackageContract, AttunedDiscovery.PackageTypeGuidance>>,
]
type _CocoindexEffect = readonly [
  AssertTrue<AssertPackageContract<CocoindexEffect.PackageContract>>,
  AssertTrue<AssertExactHandlers<CocoindexEffect.PackageContract, CocoindexEffect.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<CocoindexEffect.PackageContract, CocoindexEffect.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<CocoindexEffect.PackageContract, CocoindexEffect.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<CocoindexEffect.PackageContract, CocoindexEffect.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<CocoindexEffect.PackageContract, CocoindexEffect.PackageTypeGuidance>>,
]
type _HomeDeployment = readonly [
  AssertTrue<AssertPackageContract<HomeDeployment.PackageContract>>,
  AssertTrue<AssertExactHandlers<HomeDeployment.PackageContract, HomeDeployment.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<HomeDeployment.PackageContract, HomeDeployment.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<HomeDeployment.PackageContract, HomeDeployment.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<HomeDeployment.PackageContract, HomeDeployment.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<HomeDeployment.PackageContract, HomeDeployment.PackageTypeGuidance>>,
]
type _JoernEffect = readonly [
  AssertTrue<AssertPackageContract<JoernEffect.PackageContract>>,
  AssertTrue<AssertExactHandlers<JoernEffect.PackageContract, JoernEffect.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<JoernEffect.PackageContract, JoernEffect.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<JoernEffect.PackageContract, JoernEffect.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<JoernEffect.PackageContract, JoernEffect.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<JoernEffect.PackageContract, JoernEffect.PackageTypeGuidance>>,
]
type _JoernEffectProperties = readonly [
  AssertTrue<AssertPackageContract<JoernEffectProperties.PackageContract>>,
  AssertTrue<AssertExactHandlers<JoernEffectProperties.PackageContract, JoernEffectProperties.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<JoernEffectProperties.PackageContract, JoernEffectProperties.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<JoernEffectProperties.PackageContract, JoernEffectProperties.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<JoernEffectProperties.PackageContract, JoernEffectProperties.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<JoernEffectProperties.PackageContract, JoernEffectProperties.PackageTypeGuidance>>,
]
type _PlatformAlchemyK8s = readonly [
  AssertTrue<AssertPackageContract<PlatformAlchemyK8s.PackageContract>>,
  AssertTrue<AssertExactHandlers<PlatformAlchemyK8s.PackageContract, PlatformAlchemyK8s.PackageFuzzHandlers>>,
  AssertTrue<AssertPropertyHarnesses<PlatformAlchemyK8s.PackageContract, PlatformAlchemyK8s.PackageProperties>>,
  AssertTrue<AssertLayerProvidesPackageServices<PlatformAlchemyK8s.PackageContract, PlatformAlchemyK8s.PackageLayer>>,
  AssertTrue<AssertLayerSatisfiesRequiredServices<PlatformAlchemyK8s.PackageContract, PlatformAlchemyK8s.PackageTestLayer>>,
  AssertTrue<AssertTypeGuidanceComplete<PlatformAlchemyK8s.PackageContract, PlatformAlchemyK8s.PackageTypeGuidance>>,
]

export {}
