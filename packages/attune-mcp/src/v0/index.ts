/**
 * Compatibility import path for the original V0 package layout.
 *
 * @remarks
 * The supported package entry now lives at `src/index.ts`; this re-export keeps
 * existing internal paths functional while the implementation behind the new
 * noun-oriented boundaries is migrated incrementally.
 *
 * @internal
 */
export * from "../index.js";
