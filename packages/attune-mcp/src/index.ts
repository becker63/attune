/**
 * Attune materializes an exact repository state, issues typed authority to
 * operate on it, and preserves every accepted operation as a durable receipt.
 *
 * @remarks
 * ## The model
 *
 * 1. {@link Investigation} carries authority over one exact repository state.
 * 2. {@link Attune} changes or uses that authority.
 * 3. {@link AttuneReceipt} preserves evidence of what happened.
 *
 * ```text
 * materialized
 * │ activate
 * ▼
 * active ───── execute ─────▶ receipt
 * │                           │
 * │ finalize                  │ inspect
 * ▼                           ▼
 * finalized                durable evidence
 * ```
 *
 * {@link InvestigationLifecycleError} means the supplied authority cannot
 * permit a transition. {@link AttuneToolFailure} means a call could not cross
 * the trusted tool boundary. {@link AttuneToolkit} installs those same
 * operations and schemas at the protocol boundary.
 * @example
 * A complete investigation
 * ```ts
 * // @filename: inputs.ts
 * import { type Attune, AttuneToolkit } from "attune-mcp";
 * export declare const materializeInput:
 *   Parameters<Attune["materialize"]>[0];
 * type JoernWire =
 *   typeof AttuneToolkit.tools.joern_query.parametersSchema.Type;
 * export declare const queryInput:
 *   Omit<JoernWire, "investigationId" | "expectedSnapshot">;
 * export declare const finalizationInput:
 *   Parameters<Attune["finalize"]>[1];
 * // ---cut---
 * // @filename: investigation.ts
 * import { Effect } from "effect";
 * import {
 *   Attune,
 *   type AttuneReceipt,
 *   type Investigation,
 * } from "attune-mcp";
 * import {
 *   finalizationInput,
 *   materializeInput,
 *   queryInput,
 * } from "./inputs.js";
 *
 * const program = Attune.use((attune: Attune) =>
 *   Effect.gen(function* () {
 *     const materialized = yield* attune.materialize(materializeInput);
 *     if (materialized.status === "rejected") return materialized.result;
 *
 *     const active: Investigation<"active"> =
 *       yield* attune.activate(materialized.investigation);
 *     const execution =
 *       yield* attune.execute(active, "joern_query", queryInput);
 *     const receipt: AttuneReceipt = execution.receipt;
 *
 *     if (execution.receipt.status === "failed") {
 *       yield* Effect.logWarning(execution.receipt.failure.message);
 *     }
 *
 *     return yield* attune.finalize(
 *       execution.investigation,
 *       finalizationInput,
 *     );
 *   }),
 * );
 *
 * export { program };
 * ```
 *
 * @packageDocumentation
 */
export type { Investigation } from "./investigation/capability.js";
export { Attune } from "./investigation/service.js";
export { AttuneReceipt } from "./contract/schemas.js";
export { InvestigationLifecycleError } from "./investigation/errors.js";
export { AttuneToolFailure } from "./contract/schemas.js";
export { AttuneToolkit } from "./tools/registry.js";
