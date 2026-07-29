import { Effect, Match, Schema } from "effect";

import {
  AttuneReceipt,
  AttuneToolFailure,
  type FullGitCommit,
  type InvestigationId,
} from "../contract/schemas.js";
import { canonicalJson, fail, sha256 } from "../platform/core.js";
import {
  ATTUNE_OPERATIONS,
  AttuneToolkit,
  type AttuneOperationName,
  type AttuneOperationReceipt,
  type AttuneOperationResult,
  type AttuneOperationWireInput,
} from "../tools/registry.js";

/**
 * Identifies authority over one exact investigation snapshot. @remarks Wire operations carry this pair so the
 * service can reacquire current active authority.
 */
export interface InvestigationBoundInput {
  /** Investigation whose authority is requested. */ readonly investigationId: InvestigationId;
  /** Exact snapshot the caller expects. */ readonly expectedSnapshot: FullGitCommit;
}

/**
 * Narrows an unknown value to a record. @param value - Candidate value.
 *
 * @returns The record when object-like.
 */
const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;

/**
 * Reads one unknown record field. @param value - Candidate record. @param name - Field name. @returns The
 * field value when present.
 */
const field = (value: unknown, name: string): unknown => record(value)?.[name];

/**
 * Reads the receipt correlated with one operation result. @remarks The registry owns which concrete receipt
 * type corresponds to the operation name.
 *
 * @typeParam Name - Operation key. @param result - Correlated operation result.
 * @returns Its durable receipt.
 */
export const operationReceipt = <Name extends AttuneOperationName>(
  result: AttuneOperationResult<Name>,
): AttuneOperationReceipt<Name> => (result as { readonly receipt: AttuneOperationReceipt<Name> }).receipt;

/**
 * Resolves whether an operation needs shared or exclusive authority. @remarks ast-grep becomes a writer only
 * in apply mode; all fixed registry modes pass through. @typeParam Name - Operation key. @param name -
 * Selected operation.
 *
 * @param input - Correlated wire input. @returns The required activity mode.
 */
export const resolveWriterMode = <Name extends AttuneOperationName>(
  name: Name,
  input: AttuneOperationWireInput<Name>,
): "reader" | "writer" | "exclusive-writer" =>
  Match.value(ATTUNE_OPERATIONS[name].writer).pipe(
    Match.when("ast-grep-mode", () => (field(input, "mode") === "apply" ? "writer" : "reader")),
    Match.orElse((mode) => mode),
  );

/**
 * Resolves the operation label stored in a terminal receipt. @remarks Dynamic labels are read only from the
 * registry-selected input field. @typeParam Name - Operation key. @param name - Selected operation. @param
 * input - Correlated wire input. @returns The receipt operation label.
 */
export const resolveInvocationOperation = <Name extends AttuneOperationName>(
  name: Name,
  input: AttuneOperationWireInput<Name>,
): string => {
  const operation = ATTUNE_OPERATIONS[name].receipt[1];
  if (typeof operation === "string") return operation;
  const value = field(input, operation.input);
  if (typeof value === "string") return value;
  throw fail("ContractMismatch", `${name} receipt operation field is not a string`, {
    observed: String(value),
  });
};

/**
 * Validates a terminal receipt at runtime. @remarks The schema guard closes the untyped tool implementation
 * boundary. @param value - Candidate receipt.
 *
 * @returns Whether it satisfies the public receipt schema.
 */
export const isAttuneReceipt = (value: unknown): value is AttuneReceipt => Schema.is(AttuneReceipt)(value);

/**
 * Checks request, result, and receipt identity correlation. @typeParam Name - Operation key. @param name -
 * Selected operation. @param input - Original wire input. @param result - Decoded result record. @param
 * receipt - Candidate terminal receipt. @returns Whether all registry-selected evidence agrees.
 */
const correlated = <Name extends AttuneOperationName>(
  name: Name,
  input: AttuneOperationWireInput<Name>,
  result: Record<string, unknown>,
  receipt: AttuneReceipt,
): boolean => {
  const inputInvestigation = field(input, "investigationId");
  const inputSnapshot = field(input, "expectedSnapshot");
  const sameInvestigation = receipt.investigationId === inputInvestigation;
  const sameSnapshot = receipt.snapshotId === inputSnapshot;
  const resultSnapshot = (name: string) => receipt.snapshotId === field(result, name);
  if (receipt.status !== "succeeded") {
    return ATTUNE_OPERATIONS[name].correlation === "materialize"
      ? inputInvestigation === undefined || sameInvestigation
      : sameInvestigation;
  }
  return Match.value(ATTUNE_OPERATIONS[name].correlation).pipe(
    Match.when(
      "materialize",
      () =>
        receipt.investigationId === field(result, "investigationId") &&
        (inputInvestigation === undefined || sameInvestigation) &&
        resultSnapshot("resolvedCommit"),
    ),
    Match.when("checkpoint", () => sameInvestigation && resultSnapshot("snapshotId")),
    Match.when("preserve-snapshot", () => sameInvestigation && sameSnapshot && resultSnapshot("snapshotId")),
    Match.when(
      "artifact-before",
      () => sameInvestigation && sameSnapshot && resultSnapshot("beforeSnapshot"),
    ),
    Match.when("finalize", () => sameInvestigation && sameSnapshot && resultSnapshot("finalSnapshot")),
    Match.exhaustive,
  );
};

/**
 * Decodes and correlates one result against its Toolkit entry. @remarks Schema validation is followed by
 * exact receipt identity, input digest, snapshot, and result checks. @typeParam Name - Operation key.
 *
 * @typeParam Requirements - Effect requirements preserved from execution. @param name - Selected operation.
 * @param input - Original wire input. @param effect - Untyped implementation effect. @returns The validated
 *   correlated result effect.
 * @failure {@link AttuneToolFailure} - Reject the uncorrelated result and repair the tool implementation.
 */
export const validateOperationResult = <Name extends AttuneOperationName, Requirements>(
  name: Name,
  input: AttuneOperationWireInput<Name>,
  effect: Effect.Effect<unknown, AttuneToolFailure, Requirements>,
): Effect.Effect<AttuneOperationResult<Name>, AttuneToolFailure, Requirements> =>
  Effect.flatMap(effect, (candidate) =>
    Schema.decodeUnknownEffect(AttuneToolkit.tools[name].successSchema)(candidate).pipe(
      Effect.mapError((cause) =>
        fail("ContractMismatch", `${name} returned a result that violates its schema`, {
          observed: String(cause),
        }),
      ),
      Effect.flatMap((decoded) => {
        const result = record(decoded);
        const receipt = result?.receipt;
        if (!isAttuneReceipt(receipt)) {
          return Effect.fail(fail("ContractMismatch", `${name} returned an invalid terminal receipt`));
        }
        const valid =
          receipt.tool === ATTUNE_OPERATIONS[name].receipt[0] &&
          receipt.operation === resolveInvocationOperation(name, input) &&
          receipt.invocationId === field(input, "invocationId") &&
          receipt.inputDigest === sha256(`${canonicalJson(input)}\n`) &&
          result !== undefined &&
          correlated(name, input, result, receipt);
        return valid
          ? Effect.succeed(decoded as AttuneOperationResult<Name>)
          : Effect.fail(
              fail(
                "ContractMismatch",
                `${name} returned a receipt that does not correlate with its request and result`,
              ),
            );
      }),
    ),
  ) as Effect.Effect<AttuneOperationResult<Name>, AttuneToolFailure, Requirements>;
