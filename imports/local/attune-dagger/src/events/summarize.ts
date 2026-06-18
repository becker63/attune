import type { NormalizedEvent } from "./normalize.js";

export type SensorStatus = "passed" | "failed" | "skipped";

export type AttuneSummary = Readonly<{
  runId: string;
  phase: string;
  sensors: Readonly<Record<string, SensorStatus>>;
  eventCount: number;
  errorCount: number;
  axiom: string;
}>;

export const summarize = (summary: AttuneSummary): string =>
  [
    `run: ${summary.runId}`,
    `phase: ${summary.phase}`,
    `sensors: ${Object.entries(summary.sensors)
      .map(([name, status]) => `${name}=${status}`)
      .join(", ")}`,
    `events: ${summary.eventCount}`,
    `errors: ${summary.errorCount}`,
    `axiom: ${summary.axiom}`,
  ].join("\n");

export const countErrors = (events: ReadonlyArray<NormalizedEvent>): number =>
  events.filter((event) => event.severity === "error").length;
