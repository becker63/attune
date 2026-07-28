/**
 * Noun-oriented operation descriptors and their implementation adapters.
 *
 * @remarks
 * Choose the noun that matches the requested work, inspect its descriptor,
 * then follow the generic `InvestigationService.execute` boundary.
 *
 */

export * from "./artifact/index.js";
export * from "./ast-grep/index.js";
export * from "./investigation/index.js";
export * from "./joern/index.js";
export * from "./maude/index.js";
export * from "./property/index.js";
export * from "./repository/index.js";
export * from "./registry.js";
