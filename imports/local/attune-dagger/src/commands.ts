import { type Directory, type File } from "@dagger.io/dagger";
import { DEFAULT_EVENTS_DIR, DEFAULT_PHASE, eventFile, makeRunId, type PhaseName } from "./defaults.js";
import { repoContainer, runInRepoAllowFailure } from "./base.js";
import { forkSensor } from "./sensors/fork.js";
import { propertySensor } from "./sensors/property.js";
import { codegenSensor } from "./sensors/codegen.js";
import { typecheckSensor } from "./sensors/typecheck.js";
import { e2eSensor } from "./sensors/e2e.js";
import { axiomSecretFromEnvironment } from "./secrets/axiom.js";
import { normalizeJsonl } from "./events/normalize.js";
import { shipAxiom } from "./events/shipAxiom.js";
import { countErrors, summarize } from "./events/summarize.js";

const gitContext = async (source: Directory): Promise<Readonly<{ commit: string; dirty: boolean }>> => {
  const container = runInRepoAllowFailure(repoContainer(source), "git rev-parse HEAD && git status --porcelain");
  const output = await container.stdout();
  const [commit = "unknown", ...status] = output.trim().split(/\r?\n/u);
  return { commit, dirty: status.length > 0 };
};

const readEvents = async (file: File, context: Parameters<typeof normalizeJsonl>[1]) =>
  normalizeJsonl(await file.contents(), context);

export const runFork = async (source: Directory, phase: PhaseName = DEFAULT_PHASE): Promise<string> => {
  const sensor = forkSensor(source, phase);
  const git = await gitContext(source);
  const output = await sensor.container.stdout();
  const events = await readEvents(sensor.container.file(sensor.eventsPath), {
    runId: sensor.runId,
    phase,
    target: `fork:${phase}`,
    source: "fork",
    functionName: "fork",
    commit: git.commit,
    dirty: git.dirty,
  });
  const axiom = await shipAxiom(events, axiomSecretFromEnvironment());
  return summarize({
    runId: sensor.runId,
    phase,
    sensors: { fork: output.includes('"exitCode":0') ? "passed" : "failed" },
    eventCount: events.length,
    errorCount: countErrors(events),
    axiom: axiom.message,
  });
};

export const runProperty = async (source: Directory, phase: PhaseName = DEFAULT_PHASE): Promise<string> => {
  const sensor = propertySensor(source, phase);
  const git = await gitContext(source);
  const output = await sensor.container.stdout();
  const events = await readEvents(sensor.container.file(sensor.eventsPath), {
    runId: sensor.runId,
    phase,
    target: `property:${phase}`,
    source: "property",
    functionName: "property",
    commit: git.commit,
    dirty: git.dirty,
  });
  const axiom = await shipAxiom(events, axiomSecretFromEnvironment());
  return summarize({
    runId: sensor.runId,
    phase,
    sensors: { property: output.length >= 0 ? "passed" : "failed" },
    eventCount: events.length,
    errorCount: countErrors(events),
    axiom: axiom.message,
  });
};

export const runEvents = (source: Directory): File => {
  const phase = DEFAULT_PHASE;
  const runId = makeRunId(phase, "events");
  const eventsPath = eventFile("events");
  const container = runInRepoAllowFailure(
    repoContainer(source),
    `mkdir -p ${DEFAULT_EVENTS_DIR} && pnpm fork:${phase} --events-path ${eventsPath} --run-id ${runId} --target events --json || touch ${eventsPath}`,
  );
  return container.file(eventsPath);
};

export const runCodegen = async (source: Directory): Promise<string> => {
  const output = await codegenSensor(source).stdout();
  return summarize({
    runId: makeRunId("surface", "codegen"),
    phase: "surface",
    sensors: { codegen: output.length >= 0 ? "passed" : "failed" },
    eventCount: 0,
    errorCount: 0,
    axiom: "Axiom shipping skipped: no event stream produced.",
  });
};

export const runE2e = async (source: Directory): Promise<string> => {
  const output = await e2eSensor(source).stdout();
  return summarize({
    runId: makeRunId("entrypoints", "e2e"),
    phase: "entrypoints",
    sensors: { e2e: output.length >= 0 ? "passed" : "failed" },
    eventCount: 0,
    errorCount: 0,
    axiom: "Axiom shipping skipped: no event stream produced.",
  });
};

export const runCi = async (source: Directory): Promise<string> => {
  const typecheck = await typecheckSensor(source).stdout();
  const codegen = await codegenSensor(source).stdout();
  const fork = await runFork(source, DEFAULT_PHASE);
  return [typecheck, codegen, fork].filter((part) => part.length > 0).join("\n\n");
};

export const runDev = async (source: Directory): Promise<string> => {
  const codegen = await runCodegen(source);
  const fork = await runFork(source, DEFAULT_PHASE);
  const property = await runProperty(source, DEFAULT_PHASE);
  return [codegen, fork, property].join("\n\n");
};
