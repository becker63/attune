/**
 * Strict preset — every rule at error. No warnings, no off.
 * The nuclear option. Use when you want zero tolerance.
 */
export const strict = {
  // Closed-world / haskellish discipline
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

  // API bans
  "effect/noEffectDo": "error",
  "effect/noEffectNever": "error",
  "effect/noEffectAs": "error",
  "effect/noEffectAsync": "error",
  "effect/noEffectBind": "error",
  "effect/noOptionAs": "error",
  "effect/noRunInEffectGen": "error",

  // Style / functional
  "effect/noSwitchStatement": "error",
  "effect/noIfStatement": "error",
  "effect/noTernary": "error",
  "effect/noReturnInArrow": "error",
  "effect/noStringSentinelConst": "error",
  "effect/noArrowLadder": "error",
  "effect/noSpread": "error",

  // Global bans (everywhere, not just Effect context)
  "effect/noNodeBuiltinImport": "error",

  // AST pattern rules
  "effect/noNestedPipe": "error",
  "effect/noNestedEffectGen": "error",
  "effect/noUnnecessaryEffectGen": "error",
  "effect/noEffectSucceedVoid": "error",
  "effect/noEffectMapVoid": "error",
  "effect/noUnnecessaryPipe": "error",
  "effect/noExtendsNativeError": "error",
  "effect/noEffectFnGenerator": "error",
  "effect/noInstanceofSchema": "error",
  "effect/noFlatmapLadder": "error",
  "effect/noNestedEffectCall": "error",
  "effect/noIifeWrapper": "error",
  "effect/noEffectSucceedString": "error",
  "effect/noEffectOrElseLadder": "error",
  "effect/noFromNullableCoalesce": "error",
  "effect/noUnnecessaryArrowBlock": "error",
  "effect/noEffectSyncConsole": "error",
  "effect/noEffectTypeAlias": "error",
  "effect/noEffectWrapperAlias": "error",
  "effect/noEffectSucceedVariable": "error",
  "effect/noManualEffectChannels": "error",
  "effect/noMatchVoidBranch": "error",
  "effect/noOptionBooleanNormalization": "error",
  "effect/noEffectSyncWrapper": "error",
  "effect/noMatchEffectBranch": "error",
  "effect/noUnnecessaryPipeChain": "error",
  "effect/noMultipleEffectProvide": "error",
  "effect/noSchemaUnionOfLiterals": "error",
  "effect/noSchemaStruct": "error",
  "effect/noSchemaStructWithTag": "error",
  "effect/noRedundantSchemaTagIdentifier": "error",
  "effect/noEffectMapFlatten": "error",
  "effect/noGlobalErrorInFailure": "error",
  "effect/noGlobalErrorInCatch": "error",
  "effect/noPositionalLogError": "error",
  "effect/noMakeUnsafe": "error",
  "effect/noHandRolledTaggedUnion": "error",
  "effect/noDynamicImports": "error",

  // Effect-enforcing bans
  "effect/noThrowStatement": "error",
  "effect/noTryCatch": "error",
  "effect/noNewPromise": "error",
  "effect/noNewError": "error",
  "effect/noReturnNullish": "error",

  // Effect-context rules
  "effect/noGlobals": "error",
  "effect/noInlineProvide": "error",
  "effect/noPromiseControlFlowInTests": "error",
  "effect/noSleepInTests": "error",
} as const;
