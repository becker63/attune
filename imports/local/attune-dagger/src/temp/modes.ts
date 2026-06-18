import { DEFAULT_TMP_MODE, type PhaseName } from "../defaults.js";

export type TmpMode = "mounted-temp" | "container-shm" | "container-tmp";

export const normalizeTmpMode = (mode: string | undefined): TmpMode =>
  mode === "container-shm" || mode === "container-tmp" || mode === "mounted-temp"
    ? mode
    : DEFAULT_TMP_MODE;

export type RuntimeEnv = Readonly<Record<string, string>>;

export const runtimeEnvFor = (phase: PhaseName, runId: string, eventsPath: string, tmpMode: TmpMode): RuntimeEnv => {
  const tmpDir = tmpMode === "container-shm" ? "/dev/shm" : tmpMode === "container-tmp" ? "/tmp" : "/work/tmp";
  return {
    ATTUNE_INTERNAL_PHASE: phase,
    ATTUNE_INTERNAL_RUN_ID: runId,
    ATTUNE_INTERNAL_EVENTS_PATH: eventsPath,
    JOERN_EFFECT_TEST_TMPDIR: tmpDir,
  };
};
