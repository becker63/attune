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
 * Infer requests from the {@link Attune} method that accepts them. Reach for
 * {@link AttuneToolkit} only when the protocol needs the complete wire schema.
 *
 * @example Construct the lifecycle service
 * ```ts
 * // @filename: lifecycle.ts
 * import { Attune } from "attune-mcp";
 * // ---cut-before---
 * const attune = Attune.make();
 * // ---cut-after---
 * void attune;
 * ```
 *
 * @example Infer the first request
 * ```ts
 * import type { Attune } from "attune-mcp";
 * // ---cut---
 * type MaterializeInput = Parameters<Attune["materialize"]>[0];
 * ```
 *
 * @example Start from a separate input module
 * ```ts
 * // @filename: input.ts
 * import type { Attune } from "attune-mcp";
 * export declare const input: Parameters<Attune["materialize"]>[0];
 * // @filename: lifecycle.ts
 * import { Attune } from "attune-mcp";
 * import { input } from "./input.js";
 * // ---cut-before---
 * const start = Attune.use((attune) => attune.materialize(input));
 * ```
 *
 * @example Keep application and protocol boundaries distinct
 * ```ts
 * import { Attune, AttuneReceipt, AttuneToolkit } from "attune-mcp";
 * // ---cut-before---
 * const lifecycle = Attune.make();
 * // ---cut-start---
 * void lifecycle;
 * // ---cut-end---
 * const protocol = AttuneToolkit;
 * const receiptSchema = AttuneReceipt;
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
