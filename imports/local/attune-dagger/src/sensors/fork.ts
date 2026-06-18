import { type Container, type Directory } from "@dagger.io/dagger";
import { eventFile, makeRunId, type PhaseName } from "../defaults.js";
import { repoContainer, runInRepoAllowFailure } from "../base.js";
import { runtimeEnvFor } from "../temp/modes.js";

export type ForkSensor = Readonly<{
  container: Container;
  runId: string;
  eventsPath: string;
}>;

export const forkSensor = (source: Directory, phase: PhaseName): ForkSensor => {
  const runId = makeRunId(phase, "fork");
  const eventsPath = eventFile(phase);
  const env = runtimeEnvFor(phase, runId, eventsPath, "mounted-temp");
  const container = runInRepoAllowFailure(
    repoContainer(source, env),
    `pnpm fork:${phase} --events-path ${eventsPath} --run-id ${runId} --target fork:${phase} --json`,
  );
  return { container, runId, eventsPath };
};
