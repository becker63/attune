import { Context, Effect, Layer, Schema } from "effect"
import {
  AnchorCard,
  EnsureIndexedRequest,
  EnsureIndexedResult,
  GetAnchorRequest,
  SearchAnchorsRequest,
  SearchSimilarAnchorsRequest,
  type AnchorCard as AnchorCardType,
  type EnsureIndexedRequest as EnsureIndexedRequestType,
  type EnsureIndexedResult as EnsureIndexedResultType,
  type GetAnchorRequest as GetAnchorRequestType,
  type SearchAnchorsRequest as SearchAnchorsRequestType,
  type SearchSimilarAnchorsRequest as SearchSimilarAnchorsRequestType,
} from "./model.js"
import type { CocoIndexError } from "./errors.js"

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
