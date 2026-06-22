import { Schema } from "effect"

import type { AttuneProtocolDelta } from "../diagnostics/index.js"

export const ProtocolWaiverCategories = [
  "lower-level-context-tag",
  "hidden-configuration",
  "hidden-config-read",
  "unauditable-operation",
  "atom-write-violation",
  "invalid-law-claim",
  "invalid-view-reference",
  "legacy-boundary",
  "provider-runtime-boundary",
  "temporary-migration-adapter",
  "temporary-command-surface",
  "manual-provider-approval",
] as const

export const ProtocolWaiverCategorySchema = Schema.Literals(ProtocolWaiverCategories)
export type ProtocolWaiverCategory = typeof ProtocolWaiverCategorySchema.Type

export const AttuneProtocolWaiverSchema = Schema.Struct({
  id: Schema.String,
  category: ProtocolWaiverCategorySchema,
  owner: Schema.String,
  reason: Schema.String,
  review: Schema.optional(Schema.String),
  expiresOn: Schema.optional(Schema.String),
  operationId: Schema.optional(Schema.String),
  sourcePath: Schema.optional(Schema.String),
})
export type AttuneProtocolWaiver = typeof AttuneProtocolWaiverSchema.Type

export const AttuneProtocolWaiverFindingSchema = Schema.Struct({
  code: Schema.Literals([
    "attune/protocol/waiver/missing-review",
    "attune/protocol/waiver/expired-temporary",
    "attune/protocol/waiver/temporary-without-expiry",
  ] as const),
  severity: Schema.Literals(["error", "warning", "info"] as const),
  packageId: Schema.String,
  waiverId: Schema.String,
  category: ProtocolWaiverCategorySchema,
  sourcePath: Schema.String,
  message: Schema.String,
})
export type AttuneProtocolWaiverFinding = typeof AttuneProtocolWaiverFindingSchema.Type

export interface DiagnoseProtocolWaiversInput {
  readonly packageId: string
  readonly sourcePath: string
  readonly waivers: readonly AttuneProtocolWaiver[]
  readonly today?: string
}

export const decodeProtocolWaivers = (waivers: unknown): readonly AttuneProtocolWaiver[] =>
  Schema.decodeUnknownSync(Schema.Array(AttuneProtocolWaiverSchema))(waivers)

export const diagnoseProtocolWaivers = (
  input: DiagnoseProtocolWaiversInput,
): readonly AttuneProtocolWaiverFinding[] => {
  const today = input.today ?? new Date().toISOString().slice(0, 10)
  return input.waivers.flatMap((waiver) => {
    const sourcePath = waiver.sourcePath ?? input.sourcePath
    const findings: AttuneProtocolWaiverFinding[] = []

    if (waiver.review === undefined && waiver.expiresOn === undefined) {
      findings.push({
        code: "attune/protocol/waiver/missing-review",
        severity: "warning",
        packageId: input.packageId,
        waiverId: waiver.id,
        category: waiver.category,
        sourcePath,
        message: `Waiver ${waiver.id} must name a review point or expiry date.`,
      })
    }

    if (isTemporaryWaiver(waiver) && waiver.expiresOn === undefined) {
      findings.push({
        code: "attune/protocol/waiver/temporary-without-expiry",
        severity: "warning",
        packageId: input.packageId,
        waiverId: waiver.id,
        category: waiver.category,
        sourcePath,
        message: `Temporary waiver ${waiver.id} should carry an expiry date or be reclassified as a long-lived architecture exception.`,
      })
    }

    if (waiver.expiresOn !== undefined && waiver.expiresOn < today) {
      findings.push({
        code: "attune/protocol/waiver/expired-temporary",
        severity: "error",
        packageId: input.packageId,
        waiverId: waiver.id,
        category: waiver.category,
        sourcePath,
        message: `Temporary waiver ${waiver.id} expired on ${waiver.expiresOn}.`,
      })
    }

    return findings
  })
}

export const waiverDeltasFromFindings = (input: {
  readonly protocolId: string
  readonly findings: readonly AttuneProtocolWaiverFinding[]
}): readonly AttuneProtocolDelta[] =>
  input.findings.map((finding) => ({
    deltaId: `${input.protocolId}:${finding.waiverId}:${finding.code}`,
    protocolId: input.protocolId,
    packageId: finding.packageId,
    kind: "waiver-issue",
    sourcePath: finding.sourcePath,
    explanation: finding.message,
    repairActions: [{
      id: "repair-waiver",
      title: "Update local package waiver",
      kind: "source-edit",
      options: {
        waiverId: finding.waiverId,
        category: finding.category,
      },
    }],
  }))

const isTemporaryWaiver = (waiver: AttuneProtocolWaiver): boolean =>
  waiver.category.startsWith("temporary-")
