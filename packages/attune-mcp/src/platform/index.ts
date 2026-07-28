/**
 * Operating-system and persistence adapters used by investigation semantics.
 *
 * @remarks
 * Contributors changing the domain model normally start in `investigation` or
 * `tools`; follow a dependency here only for Git, process, locking, filesystem,
 * or workspace behavior.
 *
 */

export * from "../v0/core.js";
export * from "../v0/process.js";
export * from "../v0/workspace.js";
export * from "./native-process.js";
