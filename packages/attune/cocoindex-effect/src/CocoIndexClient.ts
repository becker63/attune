import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeModule,
  lowerRecipeAuthoringFact,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"
import {
  AnchorCard,
  CocoIndexAnchorCardResource,
  EnsureIndexedRequest,
  EnsureIndexedResult,
  GetAnchorRequest,
  SearchAnchorsRequest,
  SearchSimilarAnchorsRequest,
  type AnchorCard as AnchorCardType,
  CocoIndexCommandOperation,
  type EnsureIndexedRequest as EnsureIndexedRequestType,
  type EnsureIndexedResult as EnsureIndexedResultType,
  type GetAnchorRequest as GetAnchorRequestType,
  type SearchAnchorsRequest as SearchAnchorsRequestType,
  type SearchSimilarAnchorsRequest as SearchSimilarAnchorsRequestType,
} from "./model.js"
import type { CocoIndexError } from "./errors.js"

export const CocoIndexClientContractInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/cocoindex-effect"),
  serviceTag: Schema.Literal("@attune/CocoIndexClient"),
})
export type CocoIndexClientContractInput = typeof CocoIndexClientContractInput.Type

export const CocoIndexClientContractReport = Schema.Struct({
  serviceTag: Schema.Literal("@attune/CocoIndexClient"),
  operations: Schema.Array(CocoIndexCommandOperation),
  validatesBoundarySchemas: Schema.Boolean,
})
export type CocoIndexClientContractReport =
  typeof CocoIndexClientContractReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexClientContractResource = defineAlchemyResource({
  id: "cocoindex-effect.client-contract",
  kind: "schema",
  alchemyType: "attune:resource:EffectServiceContract",
  ownerRecipeId: "cocoindex-effect.client-contract",
  producedBy: ["cocoindex-effect.client-contract"],
  consumedBy: [
    "cocoindex-effect.ensure-indexed",
    "cocoindex-effect.search-anchors",
    "cocoindex-effect.search-similar-anchors",
  ],
  addressSchema: CocoIndexClientContractInput,
  stateSchema: CocoIndexClientContractReport,
  modes: ["read", "check", "observe"],
})

export interface CocoIndexClientService {
  readonly ensureIndexed: (
    input: EnsureIndexedRequestType,
  ) => Effect.Effect<EnsureIndexedResultType, CocoIndexError>
  readonly searchAnchors: (
    input: SearchAnchorsRequestType,
  ) => Effect.Effect<ReadonlyArray<AnchorCardType>, CocoIndexError>
  readonly searchSimilarAnchors: (
    input: SearchSimilarAnchorsRequestType,
  ) => Effect.Effect<ReadonlyArray<AnchorCardType>, CocoIndexError>
  readonly getAnchor: (
    input: GetAnchorRequestType,
  ) => Effect.Effect<AnchorCardType, CocoIndexError>
}

export class CocoIndexClient extends Context.Service<
  CocoIndexClient,
  CocoIndexClientService
>()("@attune/CocoIndexClient") {
  static fromService(
    service: CocoIndexClientService,
  ): Layer.Layer<CocoIndexClient> {
    return Layer.succeed(CocoIndexClient, validateBoundary(service))
  }
}

const validateBoundary = (
  service: CocoIndexClientService,
): CocoIndexClientService => ({
  ensureIndexed: (input) =>
    Effect.sync(() => Schema.decodeUnknownSync(EnsureIndexedRequest)(input)).pipe(
      Effect.flatMap(service.ensureIndexed),
      Effect.map(Schema.decodeUnknownSync(EnsureIndexedResult)),
    ),
  searchAnchors: (input) =>
    Effect.sync(() => Schema.decodeUnknownSync(SearchAnchorsRequest)(input)).pipe(
      Effect.flatMap(service.searchAnchors),
      Effect.map(Schema.decodeUnknownSync(Schema.Array(AnchorCard))),
    ),
  searchSimilarAnchors: (input) =>
    Effect.sync(() =>
      Schema.decodeUnknownSync(SearchSimilarAnchorsRequest)(input),
    ).pipe(
      Effect.flatMap(service.searchSimilarAnchors),
      Effect.map(Schema.decodeUnknownSync(Schema.Array(AnchorCard))),
    ),
  getAnchor: (input) =>
    Effect.sync(() => Schema.decodeUnknownSync(GetAnchorRequest)(input)).pipe(
      Effect.flatMap(service.getAnchor),
      Effect.map(Schema.decodeUnknownSync(AnchorCard)),
    ),
})

export const describeCocoIndexClientContract = (): CocoIndexClientContractReport => ({
  serviceTag: "@attune/CocoIndexClient",
  operations: [
    "ensureIndexed",
    "searchAnchors",
    "searchSimilarAnchors",
    "getAnchor",
  ],
  validatesBoundarySchemas: true,
})

export const CocoIndexClientContractHandler = {
  id: "cocoindex-effect.client-contract.handler",
  exportName: "describeCocoIndexClientContract",
  handler: () => Effect.succeed(describeCocoIndexClientContract()),
  emitsReceipts: ["cocoindex-effect.client-contract"],
}

export const CocoIndexClientContractDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "cocoindex-effect.client-contract",
  toRecipeId: "cocoindex-effect.ensure-indexed",
  resource: CocoIndexClientContractResource,
  kind: "projects",
  modes: ["read", "check", "observe"],
})

const recipe = defineRecipeModule(import.meta.url)

const CocoIndexClientContractRecipeAuthoring = recipe({
  modes: ["project", "check"],
  title: "Expose the CocoIndex Effect service contract",
  input: CocoIndexClientContractInput,
  output: CocoIndexClientContractReport,
  run: () => describeCocoIndexClientContract(),
  runtime: {
    id: "cocoindex-effect.client-contract",
    projectId: "cocoindex-effect",
    nxTarget: "cocoindex-effect:typecheck",
    validationEvidence: ["cocoindex-effect:typecheck", "cocoindex-effect:test"],
    io: {
      inputSchema: CocoIndexClientContractInput,
      outputSchema: CocoIndexClientContractReport,
      inputResources: [CocoIndexAnchorCardResource],
      outputResources: [CocoIndexClientContractResource],
    },
    handler: CocoIndexClientContractHandler,
    alchemyDag: [CocoIndexClientContractDagEdge],
  },
})

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexClientContractRecipe = lowerRecipeAuthoringFact(
  CocoIndexClientContractRecipeAuthoring,
  {
    packageId: "cocoindex-effect",
    projectId: "cocoindex-effect",
    exportName: "CocoIndexClientContractRecipe",
  },
)

export const CocoIndexClientRecipes = [CocoIndexClientContractRecipe] as const
