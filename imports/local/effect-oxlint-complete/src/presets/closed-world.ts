/**
 * Closed-world preset — Haskellish/Effect discipline for codebases that want
 * all effects and platform capabilities to be explicit.
 */
export const closedWorld = {
  "effect/onlyAllowedImports": "error",
  "effect/capabilityEnforcement": "error",
  "effect/noGlobalAccess": "error",
  "effect/noImplicitGlobalThis": "error",
  "effect/noPromise": "error",
  "effect/noMutation": "error",
  "effect/noRawEnvVars": "error",
  "effect/noInterfaces": "error",
  "effect/noClasses": "error",
  "effect/noUnknown": "error",
  "effect/noExplicitAny": "error",
  "effect/noTypeAssertions": "error",
  "effect/noRuntimeExecution": "error",
  "effect/noUnsafeEscapeHatches": "error",
  "effect/noMutableCollections": "error",
  "effect/noModuleSideEffects": "error",
  "effect/effectBoundary": "error",
} as const;
