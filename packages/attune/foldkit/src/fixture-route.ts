import { Effect, Schema as S } from "effect";

import {
  type DiscoveryAtomWorkspaceService,
  type DiscoveryEvent,
  type DiscoveryProjection,
  type DiscoveryRunAtomWorkspace,
  type ReactivityRuntime,
  type ReactivityService,
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
  makeDiscoveryAtomWorkspaceService,
  makeInMemoryReactivity,
  makeReactivityRuntime,
  readModelFromProjection,
  replayDiscoveryEvents,
  rulePromotionRequested,
  runStarted,
  viewKeysForDiscoveryEvent,
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
  targetId: S.String,
  snapshotVersion: S.Number,
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
  projection: DiscoveryProjection;
  setProjection: (projection: DiscoveryProjection) => void;
  readonly projectionReactivity: ReactivityRuntime;
  readonly atomReactivity: ReactivityService;
  readonly workspaceService: DiscoveryAtomWorkspaceService;
  readonly workspace: DiscoveryRunAtomWorkspace;
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
  activeSession?.workspaceService.disposeRun(fixtureRun.runId);
  activeSession = undefined;
};

export const startFixtureRoute = async (): Promise<FixtureStepResult> => {
  return Effect.runPromise(applyFixtureStep({ step: "start" }));
};

export const advanceFixtureStep = async (
  step: Exclude<FixtureStep, "start">,
  options: Readonly<{ selectedAnchorId?: string }> = {},
): Promise<FixtureStepResult> => {
  const session = activeSession ?? (await startSessionOnly());

  return Effect.runPromise(applyFixtureStep({ step, ...options }, session));
};

const startSessionOnly = async (): Promise<FixtureSession> => {
  await startFixtureRoute();
  return activeSession!;
};

// Deterministic local fixture route: fake services provide semantic events,
// but FoldKit still consumes the same atom-derived snapshot contract that the
// later async route will read after command submission and background work.
export const applyFixtureStep = (
  input: Readonly<{ step: FixtureStep; selectedAnchorId?: string }>,
  existingSession?: FixtureSession,
): Effect.Effect<FixtureStepResult> =>
  Effect.sync(() => {
    const session =
      input.step === "start"
        ? resetAndCreateSession()
        : (existingSession ?? activeSession);

    if (session === undefined) {
      throw new Error("Fixture route has not been started");
    }

    return applyFixtureStepToSession(
      session,
      input.step,
      semanticEventsForStep(input.step),
      input.selectedAnchorId,
    );
  });

const resetAndCreateSession = (): FixtureSession => {
  resetFixtureRouteRuntimeForTest();

  const projectionReactivity = makeReactivityRuntime();
  const atomReactivity = makeInMemoryReactivity();
  let projection = replayDiscoveryEvents([]);
  const workspaceService = makeDiscoveryAtomWorkspaceService({
    readModel: readModelFromProjection(() => projection),
    reactivity: atomReactivity,
  });

  const session: FixtureSession = {
    projection,
    setProjection: (nextProjection) => {
      projection = nextProjection;
      session.projection = nextProjection;
    },
    projectionReactivity,
    atomReactivity,
    workspaceService,
    workspace: workspaceService.registryFor(fixtureRun.runId),
    projectedEventIds: new Set(),
    routeStepCount: 0,
    routeEvents: [],
    trace: [],
  };

  activeSession = session;
  return session;
};

const semanticEventsForStep = (
  step: FixtureStep,
): ReadonlyArray<DiscoveryEvent> => {
  switch (step) {
    case "start":
      return [
        runStarted(fixtureRun),
        anchorsRecalled(fixtureRun.runId, fixtureAnchorCards),
        hypothesisCreated(fixtureHypothesis),
      ];
    case "select-anchor":
      return [];
    case "complete-proof":
      return [
        evidenceScored(fixtureEvidence),
        decisionRecorded(fixtureDecision),
        humanReviewRequested(fixtureReviewItem),
      ];
    case "request-promotion":
      return [
        rulePromotionRequested(
          fixtureRun.runId,
          fixtureHypothesis.hypothesisId,
          "human",
        ),
      ];
  }
};

const applyFixtureStepToSession = (
  session: FixtureSession,
  step: FixtureStep,
  events: ReadonlyArray<DiscoveryEvent>,
  selectedAnchorId = "",
): FixtureStepResult => {
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
      session.projectionReactivity,
    );
    session.setProjection(write.projection);
    invalidatedKeys.push(...write.announcedKeys);
    session.atomReactivity.mutation(
      viewKeysForDiscoveryEvent(event).map((key) => [key]),
      () => undefined,
    );
  }

  session.routeStepCount += 1;
  const snapshot = session.workspace.getWorkbenchSnapshot(
    session.routeStepCount,
  );
  const summary = runSummaryForSnapshot(
    snapshot,
    session.routeStepCount,
    session.projectedEventIds.size,
  );
  const routeEvents = routeEventsForStep(
    step,
    snapshot.version,
    selectedAnchorId,
  );
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

export const decodeFixtureRouteEvent = (input: unknown): FixtureRouteEvent =>
  S.decodeUnknownSync(FixtureRouteEvent)(input);

export const decodeFixtureStepResult = (input: unknown): FixtureStepResult =>
  S.decodeUnknownSync(FixtureStepResult)(input);

export const replayFixtureRouteEvents = (
  events: ReadonlyArray<FixtureRouteEvent>,
): FixtureRouteModel => {
  const decoded = events.map(decodeFixtureRouteEvent);
  const selectedAnchorId =
    decoded.findLast((event) => event._tag === "FixtureAnchorSelected")
      ?.targetId ?? "";

  return {
    ...initialFixtureRouteModel(),
    routeStepCount: new Set(decoded.map((event) => event.eventId)).size,
    selectedAnchorId,
    status: decoded.length === 0 ? "idle" : "ready",
    routeEvents: decoded,
  };
};

const routeEventsForStep = (
  step: FixtureStep,
  snapshotVersion: number,
  selectedAnchorId: string,
): ReadonlyArray<FixtureRouteEvent> => {
  switch (step) {
    case "start":
      return [
        routeEvent(
          "FixtureRouteOpened",
          step,
          fixtureRun.runId,
          snapshotVersion,
          "Fixture route opened.",
        ),
        routeEvent(
          "FixtureSnapshotLoaded",
          step,
          fixtureRun.runId,
          snapshotVersion,
          `Atom snapshot v${snapshotVersion} loaded.`,
        ),
      ];
    case "select-anchor":
      return [
        routeEvent(
          "FixtureAnchorSelected",
          step,
          selectedAnchorId || fixtureAnchorCards[0]?.anchorId || "",
          snapshotVersion,
          "Anchor selection changed FoldKit interaction state only.",
        ),
      ];
    case "complete-proof":
      return [
        routeEvent(
          "FixtureDecisionAccepted",
          step,
          fixtureDecision.decisionId,
          snapshotVersion,
          "Fixture proof decision accepted.",
        ),
        routeEvent(
          "FixtureProofCompleted",
          step,
          fixtureEvidence.templateId,
          snapshotVersion,
          "Fake Joern proof completed locally.",
        ),
        routeEvent(
          "FixtureEvidenceSurfaced",
          step,
          fixtureEvidence.evidenceId,
          snapshotVersion,
          "Evidence surfaced through the read-model atom path.",
        ),
        routeEvent(
          "FixtureSnapshotRendered",
          step,
          fixtureRun.runId,
          snapshotVersion,
          `Refreshed atom snapshot v${snapshotVersion} rendered.`,
        ),
      ];
    case "request-promotion":
      return [
        routeEvent(
          "FixtureDecisionAccepted",
          step,
          fixtureHypothesis.hypothesisId,
          snapshotVersion,
          "Human promotion decision accepted.",
        ),
        routeEvent(
          "FixtureSnapshotRendered",
          step,
          fixtureRun.runId,
          snapshotVersion,
          `Promoted atom snapshot v${snapshotVersion} rendered.`,
        ),
      ];
  }
};

const routeEvent = (
  tag: FixtureRouteEventTag,
  step: FixtureStep,
  targetId: string,
  snapshotVersion: number,
  summary: string,
): FixtureRouteEvent => ({
  _tag: tag,
  eventId: `${fixtureRun.runId}:route:${tag}:${step}`,
  occurredAt,
  runId: fixtureRun.runId,
  step,
  targetId,
  snapshotVersion,
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
  workspace: DiscoveryRunAtomWorkspace,
  iteration: number,
): ReadonlyArray<string> => [
  ...workspace.inspect().map((entry) => entry.label),
  "scoreFeatures",
  "plateau",
  `decisionPacket:${iteration}`,
  `foldScene:${iteration}`,
  `snapshot:${iteration}`,
];
