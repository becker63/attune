import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Layer, Schema } from "effect"
import { CocoIndexClient, type CocoIndexClientService } from "./CocoIndexClient.js"
import { CocoIndexAnchorNotFound } from "./errors.js"
import {
  CocoIndexAnchorCardResource,
  type AnchorCard,
  type EnsureIndexedRequest,
  type SearchAnchorsRequest,
  tokenize,
} from "./model.js"

export const CocoIndexClientFixtureSourcePath =
  "packages/attune/cocoindex-effect/src/CocoIndexClientFixture.ts" as const

export const CocoIndexFixtureLayerInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/cocoindex-effect"),
  anchorCount: Schema.Number,
})
export type CocoIndexFixtureLayerInput = typeof CocoIndexFixtureLayerInput.Type

export const CocoIndexFixtureLayerReport = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/cocoindex-effect"),
  providesClientLayer: Schema.Boolean,
  supportsDeterministicRecall: Schema.Boolean,
})
export type CocoIndexFixtureLayerReport = typeof CocoIndexFixtureLayerReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexFixtureLayerResource = defineAlchemyResource({
  id: "cocoindex-effect.fixture-client-layer",
  kind: "report",
  alchemyType: "attune:resource:EffectLayerFixture",
  ownerRecipeId: "cocoindex-effect.fixture-client-layer",
  producedBy: ["cocoindex-effect.fixture-client-layer"],
  consumedBy: ["cocoindex-effect.test-suite"],
  addressSchema: CocoIndexFixtureLayerInput,
  stateSchema: CocoIndexFixtureLayerReport,
  modes: ["read", "project", "check", "observe"],
})

export type CocoIndexFixtureInput = Readonly<{
  readonly anchors: ReadonlyArray<AnchorCard>
  readonly indexedAt?: string
}>

export const makeCocoIndexFixture = (
  input: CocoIndexFixtureInput,
): CocoIndexClientService => {
  const anchors = [...input.anchors]
  const indexedSnapshots = new Set<string>()
  const indexedAt = input.indexedAt ?? "2026-01-01T00:00:00.000Z"

  return {
    ensureIndexed: (request: EnsureIndexedRequest) =>
      Effect.sync(() => {
        indexedSnapshots.add(request.repoSnapshotId)
        return {
          repoSnapshotId: request.repoSnapshotId,
          indexedAt,
          indexUri: `memory://cocoindex/${request.repoSnapshotId}`,
        }
      }),
    searchAnchors: (request: SearchAnchorsRequest) =>
      Effect.sync(() =>
        rankFixtureAnchors(
          anchors.filter((anchor) => matchesFilters(anchor, request)),
          request.query,
        ).slice(0, request.topK),
      ),
    searchSimilarAnchors: (request) =>
      Effect.gen(function* searchSimilarFixtureAnchors() {
        const anchor = yield* findAnchor(anchors, request.repoSnapshotId, request.anchorId)
        const terms = new Set(anchor.vocabulary)
        return anchors
          .filter((candidate) => candidate.anchorId !== request.anchorId)
          .map((candidate) => ({
            anchor: candidate,
            score: candidate.vocabulary.filter((term) => terms.has(term)).length,
          }))
          .filter((candidate) => candidate.score > 0)
          .sort((left, right) => right.score - left.score)
          .map((candidate) => candidate.anchor)
          .slice(0, request.topK)
      }),
    getAnchor: (request) => findAnchor(anchors, request.repoSnapshotId, request.anchorId),
  }
}

export const CocoIndexClientFixture = (
  input: CocoIndexFixtureInput,
): Layer.Layer<CocoIndexClient> =>
  CocoIndexClient.fromService(makeCocoIndexFixture(input))

const findAnchor = (
  anchors: ReadonlyArray<AnchorCard>,
  repoSnapshotId: string,
  anchorId: string,
): Effect.Effect<AnchorCard, CocoIndexAnchorNotFound> =>
  Effect.gen(function* findFixtureAnchor() {
    const anchor = anchors.find((candidate) => candidate.anchorId === anchorId)

    if (!anchor) {
      return yield* Effect.fail(
        new CocoIndexAnchorNotFound({ repoSnapshotId, anchorId }),
      )
    }

    return anchor
  })

const rankFixtureAnchors = (
  anchors: ReadonlyArray<AnchorCard>,
  query: string,
): ReadonlyArray<AnchorCard> => {
  const queryTerms = new Set(tokenize(query))
  return anchors
    .map((anchor) => {
      const haystack = new Set([
        ...anchor.vocabulary,
        ...tokenize(anchor.title),
        ...tokenize(anchor.excerpt),
      ])
      const overlap = [...queryTerms].filter((term) => haystack.has(term)).length
      return {
        anchor,
        score: overlap + anchor.score,
      }
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((candidate) => candidate.anchor)
}

const matchesFilters = (
  anchor: AnchorCard,
  request: SearchAnchorsRequest,
): boolean => {
  const filters = request.filters
  if (!filters) return true

  if (
    filters.pathPrefix &&
    !anchor.locations.some((location) => location.path.startsWith(filters.pathPrefix ?? ""))
  ) {
    return false
  }

  if (
    filters.kind &&
    !anchor.vocabulary.some((term) => term === filters.kind?.toLowerCase())
  ) {
    return false
  }

  if (
    filters.language &&
    !anchor.vocabulary.some((term) => term === filters.language?.toLowerCase())
  ) {
    return false
  }

  return true
}

export const describeCocoIndexFixtureLayer = (): CocoIndexFixtureLayerReport => ({
  packageRoot: "packages/attune/cocoindex-effect",
  providesClientLayer: true,
  supportsDeterministicRecall: true,
})

export const CocoIndexFixtureLayerHandler = defineRecipeHandler<
  CocoIndexFixtureLayerInput,
  CocoIndexFixtureLayerReport
>({
  id: "cocoindex-effect.fixture-client-layer.handler",
  recipeId: "cocoindex-effect.fixture-client-layer",
  sourcePath: CocoIndexClientFixtureSourcePath,
  exportName: "describeCocoIndexFixtureLayer",
  handler: () => Effect.succeed(describeCocoIndexFixtureLayer()),
  emitsReceipts: ["cocoindex-effect.fixture-client-layer"],
})

export const CocoIndexFixtureLayerDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "cocoindex-effect.fixture-client-layer",
  toRecipeId: "cocoindex-effect.test-suite",
  resource: CocoIndexFixtureLayerResource,
  kind: "validates",
  modes: ["read", "check", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexFixtureLayerRecipe = defineProjectionRecipe({
  id: "cocoindex-effect.fixture-client-layer",
  projectId: "cocoindex-effect",
  title: "Provide deterministic CocoIndex fixture recall",
  inputSchema: CocoIndexFixtureLayerInput,
  outputSchema: CocoIndexFixtureLayerReport,
  nxTarget: "cocoindex-effect:test",
  allowedFiles: [CocoIndexClientFixtureSourcePath],
  validationEvidence: ["cocoindex-effect:test", "cocoindex-effect:typecheck"],
  io: {
    inputSchema: CocoIndexFixtureLayerInput,
    outputSchema: CocoIndexFixtureLayerReport,
    inputResources: [CocoIndexAnchorCardResource],
    outputResources: [CocoIndexFixtureLayerResource],
  },
  handler: CocoIndexFixtureLayerHandler,
  alchemyDag: [CocoIndexFixtureLayerDagEdge],
})

export const CocoIndexClientFixtureRecipes = [CocoIndexFixtureLayerRecipe] as const
