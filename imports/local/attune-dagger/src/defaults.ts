export const DEFAULT_PROJECT = "joern-effect";
export const DEFAULT_PACK = "joern-effect";
export const DEFAULT_PHASE = "builder";
export const DEFAULT_AXIOM_DATASET = "joern-effect-events";
export const DEFAULT_TMP_MODE = "mounted-temp";
export const DEFAULT_WORK_DIR = "/work";
export const DEFAULT_OUT_DIR = "/out";
export const DEFAULT_EVENTS_DIR = "/out/events";
export const DEFAULT_COUNTEREXAMPLES_DIR = "/out/counterexamples";
export const DEFAULT_TMP_DIR = "/work/tmp";
export const DEFAULT_DAGGER_MODULE = "attune-dagger";
export const DEFAULT_AXIOM_SECRET_NAME = "AXIOM_TOKEN";
export const PNPM_VERSION = "10.12.1";
export const NIX_IMAGE = "nixos/nix:2.25.3";

export const phaseNames = ["surface", "builder", "interpreter", "evidence", "entrypoints"] as const;

export type PhaseName = (typeof phaseNames)[number];

export const eventFile = (phase: string): string => `${DEFAULT_EVENTS_DIR}/${phase}.events.jsonl`;

export const makeRunId = (phase: string, sensor: string, now = new Date()): string =>
  `${DEFAULT_PROJECT}-${phase}-${sensor}-${now.toISOString().replace(/[:.]/g, "-")}`;
