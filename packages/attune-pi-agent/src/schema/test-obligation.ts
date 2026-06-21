import { Schema as S } from "effect"

export const TestObligationKind = S.Literals([
  "unit",
  "integration",
  "property",
  "mutation",
  "snapshot",
  "typecheck",
  "lint",
  "effect-trace",
  "generator-idempotency",
])
export type TestObligationKind = typeof TestObligationKind.Type

export const FailureClassification = S.Literals([
  "implementation-bug",
  "missing-assertion",
  "missing-property",
  "snapshot-drift",
  "type-boundary-error",
  "effect-lifecycle-error",
  "generator-nondeterminism",
  "needs-human-review",
])
export type FailureClassification = typeof FailureClassification.Type

export const TestObligation = S.Struct({
  id: S.String,
  claim: S.String,
  kind: TestObligationKind,
  target: S.String,
  commands: S.Array(S.String),
  requiredEvidence: S.Array(S.String),
  failureClassification: FailureClassification,
})
export type TestObligation = typeof TestObligation.Type

export const SnapshotObligation = S.Struct({
  id: S.String,
  targetPackage: S.String,
  fixturePath: S.String,
  updateCommand: S.String,
  driftPolicy: S.String,
})
export type SnapshotObligation = typeof SnapshotObligation.Type
