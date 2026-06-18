import { Schema as S } from 'effect'

import { HighlightedCode } from '../../syntax/HighlightedCode'

export const CandidateStatus = S.Struct({
  label: S.String,
  readinessLabel: S.String,
  matchCount: S.Number,
  reviewedCount: S.Number,
  falsePositiveCount: S.Number,
  durationMs: S.Number,
})
export type CandidateStatus = typeof CandidateStatus.Type

export const CodeExample = S.Struct({
  label: S.String,
  description: S.String,
  sourcePath: S.String,
  code: HighlightedCode,
})
export type CodeExample = typeof CodeExample.Type

export const TimelineItem = S.Struct({
  label: S.String,
  detail: S.String,
  time: S.String,
})
export type TimelineItem = typeof TimelineItem.Type

export const CodePaneId = S.Literals([
  'none',
  'looksLike',
  'doesNotLookLike',
  'deterministicRule',
])
export type CodePaneId = typeof CodePaneId.Type

export const Model = S.Struct({
  title: S.String,
  intent: S.String,
  versionLabel: S.String,
  ruleId: S.String,
  status: CandidateStatus,
  looksLike: CodeExample,
  doesNotLookLike: CodeExample,
  deterministicRule: HighlightedCode,
  deterministicRuleNote: S.String,
  revisionPlaceholder: S.String,
  revisionSuggestions: S.Array(S.String),
  findingsSummary: S.String,
  timeline: S.Array(TimelineItem),
  repoName: S.String,
  branchName: S.String,
  fileCount: S.Number,
  expandedCodePane: CodePaneId,
})
export type Model = typeof Model.Type
