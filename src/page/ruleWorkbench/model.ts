import { Schema as S } from 'effect'

import { HighlightedCode } from '../../syntax/HighlightedCode'

export const CandidateStatus = S.Struct({
  label: S.String,
  matchCount: S.Number,
  reviewedCount: S.Number,
  falsePositiveCount: S.Number,
  durationMs: S.Number,
})
export type CandidateStatus = typeof CandidateStatus.Type

export const CodeExample = S.Struct({
  label: S.String,
  code: HighlightedCode,
})
export type CodeExample = typeof CodeExample.Type

export const TimelineItem = S.Struct({
  label: S.String,
  detail: S.String,
})
export type TimelineItem = typeof TimelineItem.Type

export const Model = S.Struct({
  title: S.String,
  intent: S.String,
  status: CandidateStatus,
  looksLike: CodeExample,
  doesNotLookLike: CodeExample,
  deterministicRule: HighlightedCode,
  timeline: S.Array(TimelineItem),
})
export type Model = typeof Model.Type
