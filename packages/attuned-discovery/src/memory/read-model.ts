import type {
  AgentDecision,
  AnchorCard,
  DiscoveryRun,
  EvidencePacket,
  MotifHypothesis,
  ReviewItem,
  RulePromotionRequested,
} from "../index.js"

export type RunMetrics = Readonly<{
  runId: string
  anchorsCount: number
  hypothesesCount: number
  evidenceCount: number
  reviewQueueCount: number
  updatedAt: string
}>

export type AnchorFamily = Readonly<{
  familyId: string
  runId: string
  title: string
  summary: string
  status: "active" | "merged" | "discarded"
  anchorIds: ReadonlyArray<string>
}>

export type AnchorSearchProjection = Readonly<{
  searchId: string
  runId: string
  query: string
  anchorIds: ReadonlyArray<string>
  createdAt: string
}>

export type ReadModelSnapshot = Readonly<{
  runs: ReadonlyArray<DiscoveryRun>
  decisions: ReadonlyArray<AgentDecision>
  anchors: ReadonlyArray<AnchorCard>
  anchorSearches: ReadonlyArray<AnchorSearchProjection>
  families: ReadonlyArray<AnchorFamily>
  hypotheses: ReadonlyArray<MotifHypothesis>
  evidence: ReadonlyArray<EvidencePacket>
  ruleCandidates: ReadonlyArray<RulePromotionRequested>
  reviewQueue: ReadonlyArray<ReviewItem>
  metrics: ReadonlyArray<RunMetrics>
}>

export type MotifReadModel = Readonly<{
  getRun: (runId: string) => DiscoveryRun
  getRunMetrics: (runId: string) => RunMetrics
  listAnchorsForRun: (runId: string) => ReadonlyArray<AnchorCard>
  listAnchorSearchesForRun: (runId: string) => ReadonlyArray<AnchorSearchProjection>
  listActiveFamilies: (runId: string) => ReadonlyArray<AnchorFamily>
  listQueuedHypotheses: (runId: string) => ReadonlyArray<MotifHypothesis>
  listActiveHypotheses: (runId: string) => ReadonlyArray<MotifHypothesis>
  listRecentEvidence: (input: { readonly runId: string; readonly limit: number }) => ReadonlyArray<EvidencePacket>
  listReviewQueue: (runId: string) => ReadonlyArray<ReviewItem>
  snapshot: () => ReadModelSnapshot
  upsertRunStarted: (input: DiscoveryRun) => void
  insertAcceptedDecision: (input: AgentDecision) => void
  upsertAnchorCards: (input: ReadonlyArray<AnchorCard>) => void
  recordAnchorSearch: (input: AnchorSearchProjection) => void
  upsertFamily: (input: AnchorFamily) => void
  upsertHypothesis: (input: MotifHypothesis) => void
  markHypothesisDiscarded: (input: { readonly runId: string; readonly hypothesisId: string }) => void
  insertEvidencePacket: (input: EvidencePacket) => void
  requestRulePromotion: (input: RulePromotionRequested) => void
  insertReviewRequest: (input: ReviewItem) => void
  refreshRunMetrics: (input: { readonly runId: string; readonly updatedAt: string }) => void
}>

export const makeInMemoryMotifReadModel = (): MotifReadModel => {
  const runs = new Map<string, DiscoveryRun>()
  const decisions = new Map<string, AgentDecision>()
  const anchors = new Map<string, AnchorCard>()
  const anchorSearches = new Map<string, AnchorSearchProjection>()
  const families = new Map<string, AnchorFamily>()
  const hypotheses = new Map<string, MotifHypothesis>()
  const evidence = new Map<string, EvidencePacket>()
  const ruleCandidates = new Map<string, RulePromotionRequested>()
  const reviewQueue = new Map<string, ReviewItem>()
  const metrics = new Map<string, RunMetrics>()

  const valuesForRun = <T extends Readonly<{ runId: string }>>(values: Iterable<T>, runId: string): ReadonlyArray<T> =>
    [...values].filter((value) => value.runId === runId)

  const requireValue = <T>(value: T | undefined, label: string): T => {
    if (value === undefined) {
      throw new Error(`Missing read-model row: ${label}`)
    }
    return value
  }

  const refreshRunMetrics = ({ runId, updatedAt }: { readonly runId: string; readonly updatedAt: string }): void => {
    metrics.set(runId, {
      runId,
      anchorsCount: valuesForRun(anchors.values(), runId).length,
      hypothesesCount: valuesForRun(hypotheses.values(), runId).length,
      evidenceCount: valuesForRun(evidence.values(), runId).length,
      reviewQueueCount: valuesForRun(reviewQueue.values(), runId).length,
      updatedAt,
    })
  }

  return {
    getRun: (runId) => requireValue(runs.get(runId), `discovery_runs/${runId}`),
    getRunMetrics: (runId) => requireValue(metrics.get(runId), `run_metrics/${runId}`),
    listAnchorsForRun: (runId) => valuesForRun(anchors.values(), runId),
    listAnchorSearchesForRun: (runId) => valuesForRun(anchorSearches.values(), runId),
    listActiveFamilies: (runId) => valuesForRun(families.values(), runId).filter((family) => family.status === "active"),
    listQueuedHypotheses: (runId) => valuesForRun(hypotheses.values(), runId).filter((hypothesis) => hypothesis.status === "candidate"),
    listActiveHypotheses: (runId) => valuesForRun(hypotheses.values(), runId).filter((hypothesis) => hypothesis.status !== "rejected"),
    listRecentEvidence: ({ runId, limit }) => valuesForRun(evidence.values(), runId).slice(-limit),
    listReviewQueue: (runId) => valuesForRun(reviewQueue.values(), runId),
    snapshot: () => ({
      runs: [...runs.values()],
      decisions: [...decisions.values()],
      anchors: [...anchors.values()],
      anchorSearches: [...anchorSearches.values()],
      families: [...families.values()],
      hypotheses: [...hypotheses.values()],
      evidence: [...evidence.values()],
      ruleCandidates: [...ruleCandidates.values()],
      reviewQueue: [...reviewQueue.values()],
      metrics: [...metrics.values()],
    }),
    upsertRunStarted: (input) => {
      runs.set(input.runId, input)
      refreshRunMetrics({ runId: input.runId, updatedAt: input.updatedAt })
    },
    insertAcceptedDecision: (input) => decisions.set(input.decisionId, input),
    upsertAnchorCards: (input) => input.forEach((anchor) => anchors.set(anchor.anchorId, anchor)),
    recordAnchorSearch: (input) => anchorSearches.set(input.searchId, input),
    upsertFamily: (input) => families.set(input.familyId, input),
    upsertHypothesis: (input) => hypotheses.set(input.hypothesisId, input),
    markHypothesisDiscarded: ({ hypothesisId }) => {
      const hypothesis = requireValue(hypotheses.get(hypothesisId), `motif_hypotheses/${hypothesisId}`)
      hypotheses.set(hypothesisId, { ...hypothesis, status: "rejected" })
    },
    insertEvidencePacket: (input) => evidence.set(input.evidenceId, input),
    requestRulePromotion: (input) => ruleCandidates.set(input.eventId, input),
    insertReviewRequest: (input) => reviewQueue.set(input.reviewId, input),
    refreshRunMetrics,
  }
}
