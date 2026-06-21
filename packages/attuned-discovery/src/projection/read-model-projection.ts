import type { MotifReadModel } from "../memory/read-model.js"

type DiscoveryEvent =
  | Readonly<{
      _tag: "DiscoveryRunStarted"
      run: Parameters<MotifReadModel["upsertRunStarted"]>[0]
    }>
  | Readonly<{
      _tag: "AnchorsRecalled"
      eventId: string
      occurredAt: string
      runId: string
      anchors: Parameters<MotifReadModel["upsertAnchorCards"]>[0]
    }>
  | Readonly<{
      _tag: "MotifHypothesisCreated"
      occurredAt: string
      hypothesis: Parameters<MotifReadModel["upsertHypothesis"]>[0]
    }>
  | Readonly<{
      _tag: "JoernEvidenceScored"
      occurredAt: string
      evidence: Parameters<MotifReadModel["insertEvidencePacket"]>[0]
    }>
  | Readonly<{
      _tag: "AgentDecisionRecorded"
      occurredAt: string
      decision: Parameters<MotifReadModel["insertAcceptedDecision"]>[0]
    }>
  | Readonly<{
      _tag: "AgentDecisionRejected"
      occurredAt: string
      decision: Parameters<MotifReadModel["insertAcceptedDecision"]>[0]
      reason: string
    }>
  | Readonly<{ _tag: "FamilyUpdated"; occurredAt: string }>
  | Readonly<{ _tag: "MetricRecorded"; occurredAt: string }>
  | Readonly<{
      _tag: "HumanReviewRequested"
      occurredAt: string
      item: Parameters<MotifReadModel["insertReviewRequest"]>[0]
    }>
  | Parameters<MotifReadModel["requestRulePromotion"]>[0]
  | Readonly<{
      _tag: "DiscoveryRunCompleted"
      occurredAt: string
      runId: string
      status: "plateaued" | "completed"
      summary: string
    }>

export const projectDiscoveryEventToReadModel = (
  readModel: MotifReadModel,
  event: DiscoveryEvent,
): void => {
  switch (event._tag) {
    case "DiscoveryRunStarted":
      readModel.upsertRunStarted(event.run)
      return
    case "AnchorsRecalled":
      readModel.upsertAnchorCards(event.anchors)
      readModel.recordAnchorSearch({
        searchId: event.eventId,
        runId: event.runId,
        query: event.anchors.map((anchor) => anchor.title).join(" | "),
        anchorIds: event.anchors.map((anchor) => anchor.anchorId),
        createdAt: event.occurredAt,
      })
      readModel.refreshRunMetrics({
        runId: event.runId,
        updatedAt: event.occurredAt,
      })
      return
    case "MotifHypothesisCreated":
      readModel.upsertHypothesis(event.hypothesis)
      readModel.upsertFamily({
        familyId: `${event.hypothesis.runId}:${event.hypothesis.hypothesisId}:family`,
        runId: event.hypothesis.runId,
        title: event.hypothesis.title,
        summary: event.hypothesis.summary,
        status: "active",
        anchorIds: event.hypothesis.anchorIds,
      })
      readModel.refreshRunMetrics({
        runId: event.hypothesis.runId,
        updatedAt: event.occurredAt,
      })
      return
    case "JoernEvidenceScored":
      readModel.insertEvidencePacket(event.evidence)
      readModel.refreshRunMetrics({
        runId: event.evidence.runId,
        updatedAt: event.occurredAt,
      })
      return
    case "AgentDecisionRecorded":
      readModel.insertAcceptedDecision(event.decision)
      readModel.refreshRunMetrics({
        runId: event.decision.runId,
        updatedAt: event.occurredAt,
      })
      return
    case "HumanReviewRequested":
      readModel.insertReviewRequest(event.item)
      readModel.refreshRunMetrics({
        runId: event.item.runId,
        updatedAt: event.occurredAt,
      })
      return
    case "RulePromotionRequested":
      readModel.requestRulePromotion(event)
      readModel.refreshRunMetrics({
        runId: event.runId,
        updatedAt: event.occurredAt,
      })
      return
  }
}

export const projectDiscoveryEventsToReadModel = (
  readModel: MotifReadModel,
  events: ReadonlyArray<DiscoveryEvent>,
): MotifReadModel => {
  for (const event of events) {
    projectDiscoveryEventToReadModel(readModel, event)
  }

  return readModel
}
