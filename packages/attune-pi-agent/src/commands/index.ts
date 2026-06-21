export * from "./attune-spec.js"
export * from "./attune-evidence.js"

export const attuneCommandNames = [
  "/attune-spec",
  "/attune-plan",
  "/attune-run",
  "/attune-falsify",
  "/attune-mutants",
  "/attune-properties",
  "/attune-evidence",
  "/attune-review",
  "/attune-status",
] as const

export type AttuneCommandName = (typeof attuneCommandNames)[number]
