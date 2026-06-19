import { jsonb, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core"

export const discoveryRuns = pgTable("discovery_runs", {
  runId: text("run_id").primaryKey(),
  repo: text("repo").notNull(),
  repoSnapshotId: text("repo_snapshot_id").notNull(),
  status: text("status").notNull(),
  budget: jsonb("budget").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
})

export const agentDecisions = pgTable("agent_decisions", {
  decisionId: text("decision_id").primaryKey(),
  runId: text("run_id").notNull(),
  kind: text("kind").notNull(),
  targetId: text("target_id").notNull(),
  templateId: text("template_id").notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
})

export const anchorCards = pgTable("anchor_cards", {
  anchorId: text("anchor_id").primaryKey(),
  runId: text("run_id").notNull(),
  title: text("title").notNull(),
  vocabulary: jsonb("vocabulary").notNull(),
  score: real("score").notNull(),
  excerpt: text("excerpt").notNull(),
  locations: jsonb("locations").notNull(),
})

export const anchorSearchResults = pgTable("anchor_search_results", {
  searchId: text("search_id").primaryKey(),
  runId: text("run_id").notNull(),
  query: text("query").notNull(),
  anchorIds: jsonb("anchor_ids").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
})

export const anchorFamilies = pgTable("anchor_families", {
  familyId: text("family_id").primaryKey(),
  runId: text("run_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull(),
})

export const anchorFamilyMembers = pgTable("anchor_family_members", {
  familyId: text("family_id").notNull(),
  anchorId: text("anchor_id").notNull(),
}, (table) => [primaryKey({ columns: [table.familyId, table.anchorId] })])

export const motifHypotheses = pgTable("motif_hypotheses", {
  hypothesisId: text("hypothesis_id").primaryKey(),
  runId: text("run_id").notNull(),
  anchorIds: jsonb("anchor_ids").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull(),
  score: real("score").notNull(),
})

export const evidencePackets = pgTable("evidence_packets", {
  evidenceId: text("evidence_id").primaryKey(),
  runId: text("run_id").notNull(),
  hypothesisId: text("hypothesis_id").notNull(),
  templateId: text("template_id").notNull(),
  confidence: text("confidence").notNull(),
  summary: text("summary").notNull(),
  durationMs: real("duration_ms").notNull(),
  excerpts: jsonb("excerpts").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
})

export const evidenceScores = pgTable("evidence_scores", {
  evidenceId: text("evidence_id").primaryKey(),
  runId: text("run_id").notNull(),
  hypothesisId: text("hypothesis_id").notNull(),
  confidence: text("confidence").notNull(),
  score: real("score").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
})

export const ruleCandidates = pgTable("rule_candidates", {
  ruleCandidateId: text("rule_candidate_id").primaryKey(),
  runId: text("run_id").notNull(),
  hypothesisId: text("hypothesis_id").notNull(),
  requestedBy: text("requested_by").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
})

export const humanReviewRequests = pgTable("human_review_requests", {
  reviewId: text("review_id").primaryKey(),
  runId: text("run_id").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  targetId: text("target_id").notNull(),
  requiredAction: text("required_action").notNull(),
})

export const runMetrics = pgTable("run_metrics", {
  runId: text("run_id").primaryKey(),
  anchorsCount: real("anchors_count").notNull(),
  hypothesesCount: real("hypotheses_count").notNull(),
  evidenceCount: real("evidence_count").notNull(),
  reviewQueueCount: real("review_queue_count").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
})

export const projectionCursors = pgTable("projection_cursors", {
  projectionName: text("projection_name").primaryKey(),
  eventId: text("event_id").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
})
