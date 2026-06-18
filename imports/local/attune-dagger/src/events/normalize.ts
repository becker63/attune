import {
  DEFAULT_DAGGER_MODULE,
  DEFAULT_PACK,
  DEFAULT_PROJECT,
  type PhaseName,
} from "../defaults.js";

export type NormalizedEvent = Readonly<{
  eventType: string;
  runId: string;
  phase: PhaseName;
  source: string;
  project: string;
  pack: string;
  target: string;
  severity: "info" | "warning" | "error";
  occurredAt: string;
  git: Readonly<{
    commit: string;
    dirty: boolean;
  }>;
  dagger: Readonly<{
    module: string;
    function: string;
  }>;
  payload: unknown;
}>;

export const normalizeEvent = (
  input: unknown,
  context: Readonly<{
    runId: string;
    phase: PhaseName;
    target: string;
    source: string;
    functionName: string;
    commit: string;
    dirty: boolean;
  }>,
): NormalizedEvent => {
  const record = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const eventType = typeof record["eventType"] === "string" ? record["eventType"] : `attune.${context.source}.event`;
  const severity = record["severity"] === "error" || record["severity"] === "warning" ? record["severity"] : "info";
  const occurredAt = typeof record["occurredAt"] === "string" ? record["occurredAt"] : new Date().toISOString();
  return {
    eventType,
    runId: context.runId,
    phase: context.phase,
    source: context.source,
    project: DEFAULT_PROJECT,
    pack: DEFAULT_PACK,
    target: context.target,
    severity,
    occurredAt,
    git: {
      commit: context.commit,
      dirty: context.dirty,
    },
    dagger: {
      module: DEFAULT_DAGGER_MODULE,
      function: context.functionName,
    },
    payload: record["payload"] ?? record,
  };
};

export const normalizeJsonl = (
  jsonl: string,
  context: Parameters<typeof normalizeEvent>[1],
): ReadonlyArray<NormalizedEvent> =>
  jsonl
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      try {
        return normalizeEvent(JSON.parse(line) as unknown, context);
      } catch {
        return normalizeEvent({ eventType: "attune.event.malformed", payload: { line } }, context);
      }
    });
