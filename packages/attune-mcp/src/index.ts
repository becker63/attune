/**
 * Reproducible repository investigations as one typed lifecycle.
 *
 * @remarks
 * Begin with {@link Attune}, carry its {@link Investigation} proof through each
 * transition, inspect the resulting {@link AttuneReceipt}, and use
 * {@link AttuneToolkit} only when installing the MCP schema boundary. Operation
 * projections and runtime registries are deliberately private; infer inputs and
 * results from the service methods that consume them.
 *
 * Code migrating from the former projection aliases should use
 * `Parameters<Attune["execute"]>` and `Effect.Effect.Success` at the call site;
 * replace state-specific capability aliases with `Investigation<"state">`.
 *
 * @example
 * ```ts
 * // @filename: lifecycle.ts
 * import { Attune } from "attune-mcp";
 * // ---cut---
 * const attune = Attune.make();
 * ```
 *
 * @packageDocumentation
 */
export { Attune } from "./investigation/service.js";
export type { Investigation } from "./investigation/capability.js";
export { AttuneReceipt } from "./contract/schemas.js";
export { AttuneToolkit } from "./tools/registry.js";
export { InvestigationLifecycleError } from "./investigation/errors.js";
export { AttuneToolFailure } from "./contract/schemas.js";
