import { Schema as S } from "effect";

import {
  type DiscoveryEvent,
  WorkbenchSnapshot,
  RunSummary,
  anchorsRecalled,
  decisionRecorded,
  evidenceScored,
  fixtureAnchorCards,
  fixtureDecision,
  fixtureEvidence,
  fixtureHypothesis,
  fixtureReviewItem,
  fixtureRun,
  humanReviewRequested,
  hypothesisCreated,
  appendProjectedDiscoveryEvent,
  makeDiscoveryAtomWorkspace,
  makeReactivityRuntime,
  replayDiscoveryEvents,
  rulePromotionRequested,
  runStarted,
} from "@attune/attuned-discovery";

export const FixtureScenarioId = S.Literal("foldkit-fixture-closed-loop");
export type FixtureScenarioId = typeof FixtureScenarioId.Type;

export const FixtureStep = S.Literals([
  "start",
  "select-anchor",
  "complete-proof",
  "request-promotion",
]);
export type FixtureStep = typeof FixtureStep.Type;

export const FixtureRouteEventTag = S.Literals([
  "FixtureRouteOpened",
  "FixtureSnapshotLoaded",
  "FixtureAnchorSelected",
  "FixtureDecisionAccepted",
  "FixtureProofCompleted",
  "FixtureEvidenceSurfaced",
  "FixtureSnapshotRendered",
]);
export type FixtureRouteEventTag = typeof FixtureRouteEventTag.Type;

export const FixtureRouteEvent = S.Struct({
  _tag: FixtureRouteEventTag,
  eventId: S.String,
  occurredAt: S.String,
  runId: S.String,
  step: FixtureStep,
  summary: S.String,
});
export type FixtureRouteEvent = typeof FixtureRouteEvent.Type;

export const FixtureTraceEntry = S.Struct({
  traceId: S.String,
  step: FixtureStep,
  routeEventTags: S.Array(FixtureRouteEventTag),
  semanticEventTags: S.Array(S.String),
  invalidatedKeys: S.Array(S.String),
  atomLabels: S.Array(S.String),
  snapshotVersion: S.Number,
});
export type FixtureTraceEntry = typeof FixtureTraceEntry.Type;

export const FixtureStepResult = S.Struct({
  scenarioId: FixtureScenarioId,
  runId: S.String,
  step: FixtureStep,
  routeStepCount: S.Number,
  snapshot: WorkbenchSnapshot,
  summary: RunSummary,
  routeEvents: S.Array(FixtureRouteEvent),
  trace: S.Array(FixtureTraceEntry),
});
export type FixtureStepResult = typeof FixtureStepResult.Type;

export const FixtureRouteStatus = S.Literals([
  "idle",
  "loading",
  "ready",
  "advancing",
  "failed",
]);
export type FixtureRouteStatus = typeof FixtureRouteStatus.Type;

export const FixtureRouteModel = S.Struct({
  scenarioId: FixtureScenarioId,
  runId: S.String,
  routeStepCount: S.Number,
  selectedAnchorId: S.String,
  status: FixtureRouteStatus,
  lastError: S.String,
  routeEvents: S.Array(FixtureRouteEvent),
  trace: S.Array(FixtureTraceEntry),
  summary: S.NullOr(RunSummary),
});
export type FixtureRouteModel = typeof FixtureRouteModel.Type;

type FixtureSession = {
  projection: ReturnType<typeof replayDiscoveryEvents>;
  setProjection: (projection: ReturnType<typeof replayDiscoveryEvents>) => void;
  readonly reactivity: ReturnType<typeof makeReactivityRuntime>;
  readonly workspace: ReturnType<typeof makeDiscoveryAtomWorkspace>;
  readonly projectedEventIds: Set<string>;
  routeStepCount: number;
  routeEvents: Array<FixtureRouteEvent>;
  trace: Array<FixtureTraceEntry>;
};

const scenarioId: FixtureScenarioId = "foldkit-fixture-closed-loop";
const occurredAt = "2026-06-19T05:05:00.000Z";

let activeSession: FixtureSession | undefined;

export const initialFixtureRouteModel = (): FixtureRouteModel => ({
  scenarioId,
  runId: fixtureRun.runId,
  routeStepCount: 0,
  selectedAnchorId: "",
  status: "idle",
  lastError: "",
  routeEvents: [],
  trace: [],
  summary: null,
});

export const resetFixtureRouteRuntimeForTest = (): void => {
  activeSession?.workspace.dispose();
  activeSession = undefined;
};

export const startFixtureRoute = async (): Promise<FixtureStepResult> => {
  resetFixtureRouteRuntimeForTest();

  const reactivity = makeReactivityRuntime();
  let projection = replayDiscoveryEvents([]);
  const workspace = makeDiscoveryAtomWorkspace({
    runId: fixtureRun.runId,
    getProjection: () => projection,
    reactivity,
  });
  activeSession = {
    projection,
    setProjection: (nextProjection) => {
      projection = nextProjection;
      activeSession!.projection = nextProjection;
    },
    reactivity,
    workspace,
    projectedEventIds: new Set(),
    routeStepCount: 0,
    routeEvents: [],
    trace: [],
  };

  return projectFixtureStep(activeSession, "start", [
    runStarted(fixtureRun),
    anchorsRecalled(fixtureRun.runId, fixtureAnchorCards),
    hypothesisCreated(fixtureHypothesis),
  ]);
};

export const advanceFixtureStep = async (
  step: Exclude<FixtureStep, "start">,
): Promise<FixtureStepResult> => {
  const session = activeSession ?? (await startSessionOnly());

  switch (step) {
    case "select-anchor":
      return projectFixtureStep(session, step, []);
    case "complete-proof":
      return projectFixtureStep(session, step, [
        evidenceScored(fixtureEvidence),
        decisionRecorded(fixtureDecision),
        humanReviewRequested(fixtureReviewItem),
      ]);
    case "request-promotion":
      return projectFixtureStep(session, step, [
        rulePromotionRequested(
          fixtureRun.runId,
          fixtureHypothesis.hypothesisId,
          "human",
        ),
      ]);
  }
};

const startSessionOnly = async (): Promise<FixtureSession> => {
  await startFixtureRoute();
  return activeSession!;
};

const projectFixtureStep = async (
  session: FixtureSession,
  step: FixtureStep,
  events: ReadonlyArray<DiscoveryEvent>,
): Promise<FixtureStepResult> => {
  const freshEvents = events.filter(
    (event) => !session.projectedEventIds.has(event.eventId),
  );
  for (const event of freshEvents) {
    session.projectedEventIds.add(event.eventId);
  }

  const invalidatedKeys: Array<string> = [];
  for (const event of freshEvents) {
    const write = appendProjectedDiscoveryEvent(
      session.projection,
      event,
      session.reactivity,
    );
    session.setProjection(write.projection);
    invalidatedKeys.push(...write.announcedKeys);
  }

  session.routeStepCount += 1;
  const snapshot = session.workspace
    .snapshotAtom(session.routeStepCount)
    .read();
  const summary = runSummaryForSnapshot(
    snapshot,
    session.routeStepCount,
    session.projectedEventIds.size,
  );
  const routeEvents = routeEventsForStep(step, snapshot.version);
  session.routeEvents.push(...routeEvents);
  session.trace.push({
    traceId: `${fixtureRun.runId}:trace:${session.routeStepCount}`,
    step,
    routeEventTags: routeEvents.map((event) => event._tag),
    semanticEventTags: freshEvents.map((event) => event._tag),
    invalidatedKeys: [...new Set(invalidatedKeys)].sort(),
    atomLabels: atomLabelsForWorkspace(
      session.workspace,
      session.routeStepCount,
    ),
    snapshotVersion: snapshot.version,
  });

  return S.decodeUnknownSync(FixtureStepResult)({
    scenarioId,
    runId: fixtureRun.runId,
    step,
    routeStepCount: session.routeStepCount,
    snapshot,
    summary,
    routeEvents: session.routeEvents,
    trace: session.trace,
  });
};

const routeEventsForStep = (
  step: FixtureStep,
  snapshotVersion: number,
): ReadonlyArray<FixtureRouteEvent> => {
  switch (step) {
    case "start":
      return [
        routeEvent("FixtureRouteOpened", step, "Fixture route opened."),
        routeEvent(
          "FixtureSnapshotLoaded",
          step,
          `Atom snapshot v${snapshotVersion} loaded.`,
        ),
      ];
    case "select-anchor":
      return [
        routeEvent(
          "FixtureAnchorSelected",
          step,
          "Anchor selection changed FoldKit interaction state only.",
        ),
      ];
    case "complete-proof":
      return [
        routeEvent(
          "FixtureDecisionAccepted",
          step,
          "Fixture proof decision accepted.",
        ),
        routeEvent(
          "FixtureProofCompleted",
          step,
          "Fake Joern proof completed locally.",
        ),
        routeEvent(
          "FixtureEvidenceSurfaced",
          step,
          "Evidence surfaced through the read-model atom path.",
        ),
        routeEvent(
          "FixtureSnapshotRendered",
          step,
          `Refreshed atom snapshot v${snapshotVersion} rendered.`,
        ),
      ];
    case "request-promotion":
      return [
        routeEvent(
          "FixtureDecisionAccepted",
          step,
          "Human promotion decision accepted.",
        ),
        routeEvent(
          "FixtureSnapshotRendered",
          step,
          `Promoted atom snapshot v${snapshotVersion} rendered.`,
        ),
      ];
  }
};

const routeEvent = (
  tag: FixtureRouteEventTag,
  step: FixtureStep,
  summary: string,
): FixtureRouteEvent => ({
  _tag: tag,
  eventId: `${fixtureRun.runId}:route:${tag}:${step}`,
  occurredAt,
  runId: fixtureRun.runId,
  step,
  summary,
});

const runSummaryForSnapshot = (
  snapshot: WorkbenchSnapshot,
  routeStepCount: number,
  eventCount: number,
): RunSummary => ({
  runId: snapshot.runId,
  repoSnapshotId: snapshot.decisionPacket.run.repoSnapshotId,
  eventCount,
  routeStepCount,
  usefulEvidenceCount: snapshot.decisionPacket.evidence.length,
  finalSnapshotVersion: snapshot.version,
  searchIndexTimeMs: 120,
  proofTimeMs: snapshot.decisionPacket.evidence[0]?.durationMs ?? 0,
  cache: "miss",
});

const atomLabelsForWorkspace = (
  workspace: ReturnType<typeof makeDiscoveryAtomWorkspace>,
  iteration: number,
): ReadonlyArray<string> => [
  workspace.runAtom.name,
  workspace.runMetricsAtom.name,
  workspace.anchorsAtom.name,
  workspace.familiesAtom.name,
  workspace.hypothesesAtom.name,
  workspace.evidenceAtom.name,
  workspace.reviewQueueAtom.name,
  workspace.scoreFeaturesAtom.name,
  workspace.plateauAtom.name,
  workspace.decisionPacketAtom(iteration).name,
  workspace.foldSceneAtom(iteration).name,
  workspace.snapshotAtom(iteration).name,
];
