import { Data } from "effect"

export class CocoIndexCommandError extends Data.TaggedError("CocoIndexCommandError")<{
  readonly message: string
  readonly operation: string
  readonly exitCode?: number
  readonly stderr?: string
  readonly cause?: unknown
}> {}

export class CocoIndexDecodeError extends Data.TaggedError("CocoIndexDecodeError")<{
  readonly message: string
  readonly operation: string
  readonly payload: unknown
  readonly cause?: unknown
}> {}

export class CocoIndexAnchorNotFound extends Data.TaggedError("CocoIndexAnchorNotFound")<{
  readonly repoSnapshotId: string
  readonly anchorId: string
}> {}

export type CocoIndexError =
  | CocoIndexCommandError
  | CocoIndexDecodeError
  | CocoIndexAnchorNotFound
