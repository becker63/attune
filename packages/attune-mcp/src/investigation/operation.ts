import { Effect, Match, Schema } from "effect";

import {
  AttuneReceipt,
  AttuneToolFailure,
  type FullGitCommit,
  type InvestigationId,
} from "../contract/schemas.js";
import { canonicalJson, sha256 } from "../platform/core.js";
import {
  ATTUNE_OPERATIONS,
  AttuneToolkit,
  type AttuneOperationError,
  type AttuneOperationName,
  type AttuneOperationReceipt,
  type AttuneOperationResult,
  type AttuneOperationWireInput,
} from "../tools/registry.js";

export type WriterMode = "reader" | "writer" | "exclusive-writer";

export interface InvestigationBoundInput {
  readonly investigationId: InvestigationId;
  readonly expectedSnapshot: FullGitCommit;
}

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const field = (value: unknown, name: string): unknown => record(value)?.[name];

export const operationReceipt = <Name extends AttuneOperationName>(
  result: AttuneOperationResult<Name>,
): AttuneOperationReceipt<Name> =>
  (result as { readonly receipt: AttuneOperationReceipt<Name> }).receipt;

export const resolveWriterMode = <Name extends AttuneOperationName>(
  name: Name,
  input: AttuneOperationWireInput<Name>,
): WriterMode =>
  Match.value(ATTUNE_OPERATIONS[name].writer).pipe(
    Match.when("ast-grep-mode", () =>
      field(input, "mode") === "apply" ? "writer" : "reader",
    ),
    Match.orElse((mode) => mode),
  );

export const resolveInvocationOperation = <Name extends AttuneOperationName>(
  name: Name,
  input: AttuneOperationWireInput<Name>,
): string => {
  const operation = ATTUNE_OPERATIONS[name].receipt[1];
  if (typeof operation === "string") return operation;
  const value = field(input, operation.input);
  if (typeof value === "string") return value;
  throw new AttuneToolFailure({
    code: "ContractMismatch",
    message: `${name} receipt operation field is not a string`,
    observed: String(value),
  });
};

export const isAttuneReceipt = (value: unknown): value is AttuneReceipt =>
  Schema.is(AttuneReceipt)(value);

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
  const resultSnapshot = (name: string) =>
    receipt.snapshotId === field(result, name);
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
    Match.when(
      "checkpoint",
      () => sameInvestigation && resultSnapshot("snapshotId"),
    ),
    Match.when(
      "preserve-snapshot",
      () => sameInvestigation && sameSnapshot && resultSnapshot("snapshotId"),
    ),
    Match.when(
      "artifact-before",
      () =>
        sameInvestigation && sameSnapshot && resultSnapshot("beforeSnapshot"),
    ),
    Match.when(
      "finalize",
      () =>
        sameInvestigation && sameSnapshot && resultSnapshot("finalSnapshot"),
    ),
    Match.exhaustive,
  );
};

/** Decode and correlate a result against one of the eight Toolkit entries. */
export const validateOperationResult = <
  Name extends AttuneOperationName,
  Requirements,
>(
  name: Name,
  input: AttuneOperationWireInput<Name>,
  effect: Effect.Effect<unknown, AttuneToolFailure, Requirements>,
): Effect.Effect<
  AttuneOperationResult<Name>,
  AttuneOperationError<Name>,
  Requirements
> =>
  Effect.flatMap(effect, (candidate) =>
    Schema.decodeUnknownEffect(AttuneToolkit.tools[name].successSchema)(
      candidate,
    ).pipe(
      Effect.mapError(
        (cause) =>
          new AttuneToolFailure({
            code: "ContractMismatch",
            message: `${name} returned a result that violates its schema`,
            observed: String(cause),
          }),
      ),
      Effect.flatMap((decoded) => {
        const result = record(decoded);
        const receipt = result?.receipt;
        if (!isAttuneReceipt(receipt)) {
          return Effect.fail(
            new AttuneToolFailure({
              code: "ContractMismatch",
              message: `${name} returned an invalid terminal receipt`,
            }),
          );
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
              new AttuneToolFailure({
                code: "ContractMismatch",
                message: `${name} returned a receipt that does not correlate with its request and result`,
              }),
            );
      }),
    ),
  ) as Effect.Effect<
    AttuneOperationResult<Name>,
    AttuneOperationError<Name>,
    Requirements
  >;
