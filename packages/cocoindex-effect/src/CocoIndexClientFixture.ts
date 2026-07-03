import { Effect, Layer } from "effect"
import { CocoIndexClient, type CocoIndexClientService } from "./CocoIndexClient.js"
import { CocoIndexAnchorNotFound } from "./errors.js"
import {
  type AnchorCard,
  type EnsureIndexedRequest,
  type SearchAnchorsRequest,
  tokenize,
} from "./model.js"

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
