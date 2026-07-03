import { createHash } from "node:crypto"
import { Schema } from "effect"

export const SourceLocation = Schema.Struct({
  path: Schema.String,
  startLine: Schema.Number,
  endLine: Schema.Number,
})
export type SourceLocation = typeof SourceLocation.Type

export const AnchorCard = Schema.Struct({
  anchorId: Schema.String,
  runId: Schema.String,
  title: Schema.String,
  vocabulary: Schema.Array(Schema.String),
  score: Schema.Number,
  excerpt: Schema.String,
  locations: Schema.Array(SourceLocation),
})
export type AnchorCard = typeof AnchorCard.Type

export const CocoIndexFilters = Schema.Struct({
  language: Schema.optional(Schema.String),
  pathPrefix: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.String),
})
export type CocoIndexFilters = typeof CocoIndexFilters.Type

export const EnsureIndexedRequest = Schema.Struct({
  repoSnapshotId: Schema.String,
  repoPath: Schema.String,
})
export type EnsureIndexedRequest = typeof EnsureIndexedRequest.Type

export const EnsureIndexedResult = Schema.Struct({
  repoSnapshotId: Schema.String,
  indexedAt: Schema.String,
  indexUri: Schema.optional(Schema.String),
})
export type EnsureIndexedResult = typeof EnsureIndexedResult.Type

export const SearchAnchorsRequest = Schema.Struct({
  repoSnapshotId: Schema.String,
  runId: Schema.String,
  query: Schema.String,
  topK: Schema.Number,
  filters: Schema.optional(CocoIndexFilters),
})
export type SearchAnchorsRequest = typeof SearchAnchorsRequest.Type

export const SearchSimilarAnchorsRequest = Schema.Struct({
  repoSnapshotId: Schema.String,
  runId: Schema.String,
  anchorId: Schema.String,
  topK: Schema.Number,
})
export type SearchSimilarAnchorsRequest = typeof SearchSimilarAnchorsRequest.Type

export const GetAnchorRequest = Schema.Struct({
  repoSnapshotId: Schema.String,
  runId: Schema.String,
  anchorId: Schema.String,
})
export type GetAnchorRequest = typeof GetAnchorRequest.Type

export const RawCocoIndexLocation = Schema.Struct({
  path: Schema.String,
  startLine: Schema.optional(Schema.Number),
  endLine: Schema.optional(Schema.Number),
})
export type RawCocoIndexLocation = typeof RawCocoIndexLocation.Type

export const RawCocoIndexHit = Schema.Struct({
  id: Schema.optional(Schema.String),
  anchorId: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  path: Schema.String,
  startLine: Schema.optional(Schema.Number),
  endLine: Schema.optional(Schema.Number),
  language: Schema.optional(Schema.String),
  kind: Schema.optional(Schema.String),
  score: Schema.optional(Schema.Number),
  excerpt: Schema.optional(Schema.String),
  text: Schema.optional(Schema.String),
  code: Schema.optional(Schema.String),
  vocabulary: Schema.optional(Schema.Array(Schema.String)),
  locations: Schema.optional(Schema.Array(RawCocoIndexLocation)),
})
export type RawCocoIndexHit = typeof RawCocoIndexHit.Type

export const CocoIndexCommandOperation = Schema.Literals([
  "ensureIndexed",
  "searchAnchors",
  "searchSimilarAnchors",
  "getAnchor",
])
export type CocoIndexCommandOperation = typeof CocoIndexCommandOperation.Type

export const CocoIndexCommandEnvelope = Schema.Struct({
  operation: CocoIndexCommandOperation,
  input: Schema.Unknown,
})
export type CocoIndexCommandEnvelope = typeof CocoIndexCommandEnvelope.Type

export const normalizeCocoIndexHit = (
  hit: RawCocoIndexHit,
  request: Pick<SearchAnchorsRequest, "repoSnapshotId" | "runId" | "query">,
): AnchorCard => {
  const excerpt = firstNonEmpty(hit.excerpt, hit.text, hit.code, "")
  const locations = normalizeLocations(hit)
  const firstLocation = locations[0] ?? {
    path: hit.path,
    startLine: hit.startLine ?? 1,
    endLine: hit.endLine ?? hit.startLine ?? 1,
  }
  const score = clampScore(hit.score ?? 0.5)
  const anchorId =
    hit.anchorId ??
    hit.id ??
    stableAnchorId(request.repoSnapshotId, firstLocation, excerpt)

  return {
    anchorId,
    runId: request.runId,
    title:
      hit.title ??
      `${hit.kind ?? "code"} ${firstLocation.path}:${firstLocation.startLine}`,
    vocabulary: normalizeVocabulary([
      ...(hit.vocabulary ?? []),
      ...tokenize(request.query),
      hit.language,
      hit.kind,
    ]),
    score,
    excerpt,
    locations,
  }
}

export const normalizeCocoIndexHits = (
  hits: ReadonlyArray<RawCocoIndexHit>,
  request: SearchAnchorsRequest,
): ReadonlyArray<AnchorCard> =>
  hits
    .map((hit) => normalizeCocoIndexHit(hit, request))
    .sort((left, right) => right.score - left.score)
    .slice(0, request.topK)

const normalizeLocations = (hit: RawCocoIndexHit): ReadonlyArray<SourceLocation> => {
  const rawLocations =
    hit.locations && hit.locations.length > 0
      ? hit.locations
      : [
          {
            path: hit.path,
            startLine: hit.startLine,
            endLine: hit.endLine,
          },
        ]

  return rawLocations.map((location) => {
    const startLine = location.startLine ?? 1
    return {
      path: location.path,
      startLine,
      endLine: Math.max(startLine, location.endLine ?? startLine),
    }
  })
}

const stableAnchorId = (
  repoSnapshotId: string,
  location: SourceLocation,
  excerpt: string,
): string => {
  const digest = createHash("sha256")
    .update(`${repoSnapshotId}:${location.path}:${location.startLine}:${location.endLine}:${excerpt}`)
    .digest("hex")
    .slice(0, 16)
  return `anchor-${digest}`
}

export const tokenize = (input: string): ReadonlyArray<string> =>
  input
    .toLowerCase()
    .split(/[^a-z0-9_.$/-]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)

const normalizeVocabulary = (
  input: ReadonlyArray<string | undefined>,
): ReadonlyArray<string> => [...new Set(input.flatMap((value) => tokenize(value ?? "")))]

const firstNonEmpty = (
  ...values: ReadonlyArray<string | undefined>
): string => values.find((value) => value !== undefined && value.trim().length > 0)?.trim() ?? ""

const clampScore = (score: number): number => Math.max(0, Math.min(1, score))
