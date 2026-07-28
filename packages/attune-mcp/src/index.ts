/**
 * Reproducible repository investigations expressed through six public types.
 *
 * @remarks
 * Begin with {@link Attune.materialize}, carry the returned {@link Investigation} through {@link Attune.activate}, and use that active proof with {@link Attune.execute} or {@link Attune.finalize}. Each method makes the legal lifecycle state visible in its parameter and return types, so the service contract itself is the shortest complete guide.
 *
 * Infer application inputs and outputs from the corresponding {@link Attune} member instead of importing another vocabulary of request and result aliases. {@link AttuneToolkit} exists for the MCP transport boundary, where the same closed operation schemas must be installed; it is not a parallel application API.
 *
 * Accepted work leaves durable {@link AttuneReceipt} evidence. A rejected call fails with {@link AttuneToolFailure} when it never safely crosses the tool boundary, or with {@link InvestigationLifecycleError} when its proof, identity, snapshot, or transition is invalid. {@link Attune.recoverTerminal} reconnects an interrupted caller to already-durable terminal evidence without repeating the operation.
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
