import { type Container, type Directory } from "@dagger.io/dagger";
import { eventFile, makeRunId, type PhaseName } from "../defaults.js";
import { propertyPhaseCommand } from "../phases.js";
import { repoContainer, runInRepoAllowFailure } from "../base.js";
import { runtimeEnvFor } from "../temp/modes.js";

export type PropertySensor = Readonly<{
  container: Container;
  runId: string;
  eventsPath: string;
}>;

export const propertySensor = (source: Directory, phase: PhaseName): PropertySensor => {
  const runId = makeRunId(phase, "property");
  const eventsPath = eventFile(`${phase}.property`);
  const env = runtimeEnvFor(phase, runId, eventsPath, "mounted-temp");
  const container = runInRepoAllowFailure(repoContainer(source, env), propertyPhaseCommand(phase));
  return { container, runId, eventsPath };
};
