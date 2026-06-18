import { DEFAULT_PHASE, phaseNames, type PhaseName } from "./defaults.js";

export const isPhaseName = (phase: string): phase is PhaseName =>
  phaseNames.includes(phase as PhaseName);

export const normalizePhase = (phase: string | undefined): PhaseName =>
  phase === undefined || !isPhaseName(phase) ? DEFAULT_PHASE : phase;

export const propertyPhaseCommand = (phase: PhaseName): string => {
  switch (phase) {
    case "surface":
      return "pnpm --filter @attune/joern-effect-properties test";
    case "builder":
      return "pnpm --filter @attune/joern-effect-properties test";
    case "interpreter":
      return "pnpm --filter @attune/joern-effect-properties test";
    case "evidence":
      return "pnpm --filter @attune/joern-effect-properties test";
    case "entrypoints":
      return "pnpm --filter @attune/joern-effect-properties test";
  }
};
