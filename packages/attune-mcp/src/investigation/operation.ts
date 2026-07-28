/**
 * Tool operation descriptors bind wire schemas to lifecycle and concurrency
 * facts. Read this module after `capability.ts`, then choose a noun under
 * `tools/` to see a concrete descriptor.
 *
 */

import { Effect, Schema } from "effect";

import {
  AttuneReceipt,
  AttuneToolFailure,
  type FailureCode,
  type FullGitCommit,
  type InvestigationId,
  type InvocationId,
  type ToolName,
} from "../v0/contracts.js";
import { canonicalJson, sha256 } from "../v0/core.js";
import type { ActiveInvestigation } from "./capability.js";

/**
 * The runtime scheduling mode an operation requires.
 *
 * @remarks
 * Readers may overlap. Writers serialize repository mutation. An exclusive
 * writer additionally waits for accepted readers before it begins.
 */
export type WriterMode = "reader" | "writer" | "exclusive-writer";

/**
 * Declarative writer policy stored on an operation descriptor.
 *
 * @typeParam Input - The operation input inspected by a conditional policy.
 */
export type AnyWriterPolicy =
  | {
      readonly kind: "static";
      readonly mode: WriterMode;
    }
  | {
      readonly kind: "input-discriminant";
      readonly field: string;
      readonly cases: Readonly<Record<string, WriterMode>>;
      readonly defaultMode: WriterMode;
    };

type RequiredValueKey<Input, Value> = {
  readonly [Key in keyof Input]-?: [Input[Key]] extends [never]
    ? never
    : 0 extends 1 & Input[Key]
      ? never
      : [Input[Key]] extends [Value]
        ? Key
        : never;
}[keyof Input] &
  string;

type OptionalValueKey<Input, Value> = {
  readonly [Key in keyof Input]-?: [Input[Key]] extends [never]
    ? never
    : 0 extends 1 & Input[Key]
      ? never
      : {} extends Pick<Input, Key>
        ? [Exclude<Input[Key], undefined>] extends [Value]
          ? Key
          : never
        : never;
}[keyof Input] &
  string;

/** Required, non-`any` input keys whose values are strings. */
export type StringValueKey<Input> = RequiredValueKey<Input, string>;

/** Required, non-`any` keys carrying a particular branded string type. */
export type ValueKey<Input, Value> = RequiredValueKey<Input, Value>;

type DiscriminatedWriterPolicy<Input> = {
  readonly [Field in StringValueKey<Input>]: {
    readonly kind: "input-discriminant";
    readonly field: Field;
    readonly cases: Readonly<
      Partial<
        Record<Extract<Exclude<Input[Field], undefined>, string>, WriterMode>
      >
    >;
    readonly defaultMode: WriterMode;
  };
}[StringValueKey<Input>];

/**
 * A writer policy whose discriminant, when present, must name an input field.
 */
export type WriterPolicy<Input = unknown> =
  | {
      readonly kind: "static";
      readonly mode: WriterMode;
    }
  | DiscriminatedWriterPolicy<Input>;

/**
 * Machine-authoritative lifecycle metadata for an operation.
 *
 * @remarks
 * Documentation may narrate these transitions, but this discriminated union is
 * the source used by type tests, the service, and documentation extraction.
 */
export type OperationLifecycle =
  | {
      readonly requires: "none";
      readonly produces: "materialized";
      readonly transition: "materialize";
    }
  | {
      readonly requires: "active";
      readonly produces: "active";
      readonly transition: "preserve";
    }
  | {
      readonly requires: "active";
      readonly produces: "finalized";
      readonly transition: "finalize";
    };

/**
 * The common identity fields required by operations on an active workspace.
 */
export interface InvestigationBoundInput {
  readonly investigationId: InvestigationId;
  readonly expectedSnapshot: FullGitCommit;
}

/** Receipt identity fields supplied by an operation descriptor. */
export type InvocationIdentity<Input = Record<string, unknown>> = {
  readonly tool: ToolName;
  readonly operation:
    | string
    | {
        readonly [Field in StringValueKey<Input>]: {
          readonly field: Field;
        };
      }[StringValueKey<Input>];
};

/** Structural invocation identity used by existential operation utilities. */
export type AnyInvocationIdentity = {
  readonly tool: ToolName;
  readonly operation: string | { readonly field: string };
};

/**
 * Runtime sources used to correlate a terminal receipt with its request.
 *
 * @remarks
 * `requiredWhen: "succeeded"` is reserved for allocated identity that is
 * exposed by a successful result but cannot exist in a failed result payload.
 */
export type ReceiptCorrelation<Input, SuccessfulResult> = {
  readonly invocationId: ValueKey<Input, InvocationId>;
  readonly investigationId:
    | {
        readonly source: "input";
        readonly field: ValueKey<Input, InvestigationId>;
      }
    | {
        readonly source: "result";
        readonly field: ValueKey<SuccessfulResult, InvestigationId>;
        readonly requiredWhen?: "succeeded";
        /**
         * Optional request identity that, when supplied, must also match the
         * terminal receipt even when failure leaves no successful result field.
         */
        readonly fallbackInput?: OptionalValueKey<Input, InvestigationId>;
      };
  readonly inputDigest: "canonical-json-sha256";
  readonly successSnapshots: readonly [
    (
      | {
          readonly source: "input";
          readonly field: ValueKey<Input, FullGitCommit>;
        }
      | {
          readonly source: "result";
          readonly field: ValueKey<SuccessfulResult, FullGitCommit>;
        }
    ),
    ...Array<
      | {
          readonly source: "input";
          readonly field: ValueKey<Input, FullGitCommit>;
        }
      | {
          readonly source: "result";
          readonly field: ValueKey<SuccessfulResult, FullGitCommit>;
        }
    >,
  ];
};

/** Structural receipt correlation used by existential operation utilities. */
export type AnyReceiptCorrelation = {
  readonly invocationId: string;
  readonly investigationId:
    | {
        readonly source: "input";
        readonly field: string;
      }
    | {
        readonly source: "result";
        readonly field: string;
        readonly requiredWhen?: "succeeded";
        readonly fallbackInput?: string;
      };
  readonly inputDigest: "canonical-json-sha256";
  readonly successSnapshots: readonly [
    {
      readonly source: "input" | "result";
      readonly field: string;
    },
    ...Array<{
      readonly source: "input" | "result";
      readonly field: string;
    }>,
  ];
};

type PureSchema = Schema.Constraint & {
  readonly DecodingServices: never;
};

type SchemaWithType<Type> = PureSchema & {
  readonly Type: Type;
};

type ReceiptBearingSchema<ReceiptSchema extends PureSchema> = SchemaWithType<{
  readonly receipt: Schema.Schema.Type<ReceiptSchema>;
}>;

type ReceiptOf<Result> = Result extends {
  readonly receipt: infer Receipt;
}
  ? Receipt
  : never;

type SuccessfulSchemaResult<ResultSchema extends PureSchema> = Extract<
  Schema.Schema.Type<ResultSchema>,
  { readonly receipt: { readonly status: "succeeded" } }
>;

/**
 * Proves that every result branch contains exactly the declared receipt union.
 *
 * @remarks
 * Both directions matter: a result may neither omit a declared terminal
 * receipt nor introduce a receipt variant absent from the descriptor.
 */
export type ReceiptRelation<
  ResultSchema extends PureSchema,
  ReceiptSchema extends PureSchema,
> =
  Exclude<
    Schema.Schema.Type<ResultSchema>,
    { readonly receipt: Schema.Schema.Type<ReceiptSchema> }
  > extends never
    ? [ReceiptOf<Schema.Schema.Type<ResultSchema>>] extends [
        Schema.Schema.Type<ReceiptSchema>,
      ]
      ? [Schema.Schema.Type<ReceiptSchema>] extends [
          ReceiptOf<Schema.Schema.Type<ResultSchema>>,
        ]
        ? unknown
        : never
      : never
    : never;

type EngineUnsuccessfulResult<Receipt> = Receipt extends {
  readonly status: "failed" | "cancelled";
}
  ? { readonly receipt: Receipt }
  : never;

/**
 * Proves that the durable engine can always synthesize its terminal fallback.
 *
 * @remarks
 * The invocation engine owns the common receipt schema and emits a bare
 * `{ receipt }` result after cancellation or implementation failure. Requiring
 * the exact engine receipt union and assignability of every unsuccessful bare
 * result prevents a descriptor from accepting work it cannot terminalize.
 */
type EngineTerminalRelation<
  ResultSchema extends PureSchema,
  ReceiptSchema extends PureSchema,
> = [Schema.Schema.Type<ReceiptSchema>] extends [typeof AttuneReceipt.Type]
  ? [typeof AttuneReceipt.Type] extends [Schema.Schema.Type<ReceiptSchema>]
    ? [EngineUnsuccessfulResult<Schema.Schema.Type<ReceiptSchema>>] extends [
        Schema.Schema.Type<ResultSchema>,
      ]
      ? unknown
      : never
    : never
  : never;

type InvocationOperationFor<
  Input,
  Invocation extends AnyInvocationIdentity,
> = Invocation["operation"] extends string
  ? Invocation["operation"]
  : Invocation["operation"] extends {
        readonly field: infer Field extends keyof Input;
      }
    ? Input[Field] & string
    : never;

type OperationReceiptFor<
  Receipt,
  Input,
  Result,
  Invocation extends AnyInvocationIdentity,
  Correlation extends AnyReceiptCorrelation,
> = Receipt extends object
  ? Omit<
      Receipt,
      "tool" | "operation" | "invocationId" | "investigationId" | "snapshotId"
    > & {
      readonly tool: Invocation["tool"];
      readonly operation: InvocationOperationFor<Input, Invocation>;
      readonly invocationId: Correlation["invocationId"] extends keyof Input
        ? Input[Correlation["invocationId"]] & InvocationId
        : Receipt extends { readonly invocationId: infer Id }
          ? Id
          : never;
      readonly investigationId: Correlation["investigationId"] extends {
        readonly source: "input";
        readonly field: infer Field extends keyof Input;
      }
        ? Input[Field] & InvestigationId
        : Correlation["investigationId"] extends {
              readonly source: "result";
              readonly field: infer Field;
            }
          ? Field extends keyof Result
            ? Result[Field] & InvestigationId
            : Receipt extends { readonly investigationId: infer Id }
              ? Id
              : never
          : never;
    } & (Receipt extends {
        readonly status: "succeeded";
        readonly snapshotId: unknown;
      }
        ? {
            readonly snapshotId: Correlation["successSnapshots"][0] extends {
              readonly source: "input";
              readonly field: infer Field extends keyof Input;
            }
              ? Input[Field] & FullGitCommit
              : Correlation["successSnapshots"][0] extends {
                    readonly source: "result";
                    readonly field: infer Field;
                  }
                ? Field extends keyof Result
                  ? Result[Field] & FullGitCommit
                  : never
                : never;
          }
        : Receipt extends { readonly snapshotId?: infer Snapshot }
          ? { readonly snapshotId?: Snapshot }
          : unknown)
  : never;

type OperationResultFor<
  Result,
  Input,
  Invocation extends AnyInvocationIdentity,
  Correlation extends AnyReceiptCorrelation,
> = Result extends { readonly receipt: infer Receipt }
  ? Omit<Result, "receipt"> & {
      readonly receipt: OperationReceiptFor<
        Receipt,
        Input,
        Result,
        Invocation,
        Correlation
      >;
    }
  : never;

/**
 * A deterministic description of one public tool operation.
 *
 * @remarks
 * Schemas carry the exact input, result, and terminal-receipt types. The
 * failure-code tuple narrows the tagged failure exposed by the generic service.
 * Writer and lifecycle fields are plain data so mechanical documentation does
 * not need to inspect implementation functions. Descriptor admission also
 * proves the engine can represent every failed or cancelled terminal fallback
 * as the bare `{ receipt }` result it durably publishes.
 *
 * @typeParam Name - Stable MCP operation name.
 * @typeParam InputSchema - Effect schema for accepted input.
 * @typeParam ReceiptSchema - Effect schema for the terminal receipt.
 * @typeParam ResultSchema - Effect schema for the full terminal result.
 * @typeParam FailureCodes - Expected tagged failure codes at this boundary.
 * @typeParam Policy - Exact scheduling policy.
 * @typeParam Lifecycle - Exact legal state transition.
 * @typeParam Invocation - Receipt identity supplied at runtime.
 * @typeParam Correlation - Request/result fields that prove receipt identity.
 */
export interface ToolOperation<
  Name extends string,
  InputSchema extends PureSchema,
  ReceiptSchema extends PureSchema,
  ResultSchema extends ReceiptBearingSchema<ReceiptSchema>,
  FailureCodes extends readonly FailureCode[],
  Policy extends AnyWriterPolicy,
  Lifecycle extends OperationLifecycle,
  Invocation extends AnyInvocationIdentity,
  Correlation extends AnyReceiptCorrelation,
> {
  readonly name: Name;
  readonly input: InputSchema;
  readonly result: ResultSchema;
  readonly receipt: ReceiptSchema;
  readonly failure: typeof AttuneToolFailure;
  readonly failureCodes: FailureCodes;
  readonly writerPolicy: Policy;
  readonly lifecycle: Lifecycle;
  readonly invocation: Invocation;
  readonly correlation: Correlation;
}

/** The structural supertype accepted by generic operation utilities. */
export type AnyToolOperation = ToolOperation<
  string,
  PureSchema,
  PureSchema,
  ReceiptBearingSchema<PureSchema>,
  readonly FailureCode[],
  AnyWriterPolicy,
  OperationLifecycle,
  AnyInvocationIdentity,
  AnyReceiptCorrelation
>;

type LifecycleInputRelation<
  Input,
  Lifecycle extends OperationLifecycle,
> = Lifecycle["requires"] extends "active"
  ? [Input] extends [InvestigationBoundInput]
    ? unknown
    : never
  : unknown;

type ToolOperationDefinitionRelation<Operation extends AnyToolOperation> =
  ReceiptRelation<Operation["result"], Operation["receipt"]> &
    EngineTerminalRelation<Operation["result"], Operation["receipt"]> & {
      readonly writerPolicy: Operation["writerPolicy"] &
        WriterPolicy<Schema.Schema.Type<Operation["input"]>>;
      readonly invocation: Operation["invocation"] &
        InvocationIdentity<Schema.Schema.Type<Operation["input"]>>;
      readonly correlation: Operation["correlation"] &
        ReceiptCorrelation<
          Schema.Schema.Type<Operation["input"]>,
          SuccessfulSchemaResult<Operation["result"]>
        >;
    } & LifecycleInputRelation<
      Schema.Schema.Type<Operation["input"]>,
      Operation["lifecycle"]
    >;

/**
 * Defines an operation while inferring every type relationship from its data.
 *
 * @remarks
 * Callers provide schemas and literal policies once. They never repeat input,
 * result, receipt, error, or writer-policy type arguments. The definition
 * relation rejects result schemas that cannot accept the engine's failed and
 * cancelled bare-receipt terminal branches.
 */
export const defineToolOperation = <
  const Name extends string,
  const InputSchema extends PureSchema,
  const ReceiptSchema extends PureSchema,
  const ResultSchema extends ReceiptBearingSchema<ReceiptSchema>,
  const FailureCodes extends readonly FailureCode[],
  const Policy extends AnyWriterPolicy,
  const Lifecycle extends OperationLifecycle,
  const Invocation extends AnyInvocationIdentity,
  const Correlation extends AnyReceiptCorrelation,
>(
  operation: ToolOperation<
    Name,
    InputSchema,
    ReceiptSchema,
    ResultSchema,
    FailureCodes,
    Policy,
    Lifecycle,
    Invocation,
    Correlation
  > &
    ToolOperationDefinitionRelation<
      ToolOperation<
        Name,
        InputSchema,
        ReceiptSchema,
        ResultSchema,
        FailureCodes,
        Policy,
        Lifecycle,
        Invocation,
        Correlation
      >
    >,
): ToolOperation<
  Name,
  InputSchema,
  ReceiptSchema,
  ResultSchema,
  FailureCodes,
  Policy,
  Lifecycle,
  Invocation,
  Correlation
> => operation;

/** Extracts the exact decoded wire input from a descriptor. */
export type OperationWireInput<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? Schema.Schema.Type<Operation["input"]>
    : never;

/**
 * Extracts the domain input accepted alongside a lifecycle capability.
 *
 * @remarks
 * Active operations receive investigation identity and snapshot from the
 * capability, so callers cannot accidentally duplicate or disagree with them.
 * Materialization has no capability and therefore retains its full wire input.
 */
export type OperationInput<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? Operation["lifecycle"]["requires"] extends "active"
      ? Omit<
          OperationWireInput<Operation>,
          "investigationId" | "expectedSnapshot"
        >
      : OperationWireInput<Operation>
    : never;

/**
 * Extracts the exact decoded terminal result from a descriptor.
 *
 */
export type OperationResult<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? OperationResultFor<
        Schema.Schema.Type<Operation["result"]>,
        Schema.Schema.Type<Operation["input"]>,
        Operation["invocation"],
        Operation["correlation"]
      >
    : never;

/** Explicit descriptor-only spelling of {@link OperationResult}. */
export type OperationResultOf<Operation extends AnyToolOperation> =
  OperationResult<Operation>;

/** Derives the operation-specific terminal receipt from its result. */
export type OperationReceipt<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? ReceiptOf<OperationResultOf<Operation>>
    : never;

/** Extracts the successful terminal branch of an operation result. */
export type SuccessfulOperationResult<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? Extract<
        OperationResultOf<Operation>,
        { readonly receipt: { readonly status: "succeeded" } }
      >
    : never;

type WithoutReceipt<Result> = Result extends {
  readonly receipt: unknown;
}
  ? Omit<Result, "receipt">
  : never;

/** Successful implementation payload before the invocation engine adds receipt. */
export type OperationSuccessPayload<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? WithoutReceipt<SuccessfulOperationResult<Operation>>
    : never;

/** Extracts the failed or cancelled terminal branch of an operation result. */
export type UnsuccessfulOperationResult<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? Exclude<
        OperationResultOf<Operation>,
        SuccessfulOperationResult<Operation>
      >
    : never;

/** Extracts the descriptor's scheduling policy without widening it. */
export type OperationWriterPolicy<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation ? Operation["writerPolicy"] : never;

/** Extracts the descriptor's lifecycle relation without widening it. */
export type OperationLifecycleOf<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation ? Operation["lifecycle"] : never;

/**
 * The tagged failure expected for one operation.
 *
 * @remarks
 * `ContractMismatch` is always included because an implementation returning an
 * undeclared code is itself a boundary-contract failure.
 */
export type OperationError<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? AttuneToolFailure & {
        readonly code: Operation["failureCodes"][number] | "ContractMismatch";
      }
    : never;

/** A handler derived entirely from its operation descriptor. */
export type OperationHandler<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? (
        input: OperationWireInput<Operation>,
      ) => Effect.Effect<
        OperationResultOf<Operation>,
        OperationError<Operation>
      >
    : never;

/**
 * A domain handler whose workspace identity is supplied by an active
 * capability instead of repeated in caller input.
 */
export type CapabilityOperationHandler<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? (
        investigation: ActiveInvestigation,
        input: OperationInput<Operation>,
      ) => Effect.Effect<
        OperationResultOf<Operation>,
        OperationError<Operation>
      >
    : never;

/** A registry keyed by the stable operation name. */
export type OperationRegistry = Readonly<Record<string, AnyToolOperation>>;

/** Requires each registry key to equal its descriptor's literal name. */
export type NameAligned<Registry extends OperationRegistry> = {
  readonly [Name in keyof Registry]: Registry[Name] & {
    readonly name: Name;
  };
};

type ValidatedOperationRegistry<Registry extends OperationRegistry> = {
  readonly [Name in keyof Registry]: Registry[Name] &
    ToolOperationDefinitionRelation<Registry[Name]>;
};

/**
 * Defines a registry whose keys are statically identical to descriptor names.
 *
 * @remarks
 * Registry construction revalidates descriptor relations rather than trusting
 * a structurally compatible object. Invalid active lifecycle, schema, writer,
 * invocation, or receipt metadata therefore cannot bypass
 * {@link defineToolOperation}.
 */
export const defineOperationRegistry = <
  const Registry extends OperationRegistry,
>(
  registry: Registry &
    NameAligned<Registry> &
    ValidatedOperationRegistry<Registry>,
): Registry => registry;

/** Derives a correctly paired handler map from an operation registry. */
export type OperationHandlers<Registry extends OperationRegistry> = {
  readonly [Name in keyof Registry]: OperationHandler<Registry[Name]>;
};

const includesFailureCode = <Codes extends readonly FailureCode[]>(
  codes: Codes,
  code: FailureCode,
): code is Codes[number] => codes.includes(code);

/**
 * Narrows a legacy handler's broad failure code to descriptor-declared codes.
 *
 * @remarks
 * An undeclared code becomes `ContractMismatch`, making descriptor drift
 * visible without lying about the operation-specific error union.
 */
export const narrowOperationErrors =
  <Operation extends AnyToolOperation>(operation: Operation) =>
  <A, Requirements>(
    effect: Effect.Effect<A, AttuneToolFailure, Requirements>,
  ): Effect.Effect<A, OperationError<Operation>, Requirements> =>
    Effect.mapError(effect, (failure) => {
      if (failure.code === "ContractMismatch") {
        return failure as AttuneToolFailure & {
          readonly code: "ContractMismatch";
        };
      }
      if (includesFailureCode(operation.failureCodes, failure.code)) {
        return failure as AttuneToolFailure & {
          readonly code: Operation["failureCodes"][number];
        };
      }
      return new AttuneToolFailure({
        code: "ContractMismatch",
        message: `${operation.name} returned undeclared failure code ${String(failure.code)}`,
        expected: operation.failureCodes.join(","),
        observed: failure.code,
      });
    }) as Effect.Effect<A, OperationError<Operation>, Requirements>;

/**
 * Verifies that a schema-derived result carries a terminal receipt.
 *
 * @internal
 */
export const operationReceipt = <Operation extends AnyToolOperation>(
  result: OperationResultOf<Operation>,
): OperationReceipt<Operation> => result.receipt;

type OperationInputArguments<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? [operation: Operation, input: OperationWireInput<NoInfer<Operation>>]
    : never;

type OperationValidationArguments<
  Operation extends AnyToolOperation,
  Requirements,
> = Operation extends AnyToolOperation
  ? [
      operation: Operation,
      input: OperationWireInput<NoInfer<Operation>>,
      effect: Effect.Effect<unknown, AttuneToolFailure, Requirements>,
    ]
  : never;

/**
 * Decodes an implementation result and proves its descriptor-owned receipt
 * identity before exposing the operation-specific result type.
 */
export const validateOperationResult = <
  const Operation extends AnyToolOperation,
  Requirements,
>(
  ...[operation, input, effect]: OperationValidationArguments<
    Operation,
    Requirements
  >
): Effect.Effect<
  OperationResultOf<Operation>,
  OperationError<Operation>,
  Requirements
> =>
  Effect.flatMap(effect, (result) =>
    Schema.decodeUnknownEffect(operation.result)(result).pipe(
      Effect.mapError(
        (cause) =>
          new AttuneToolFailure({
            code: "ContractMismatch",
            message: `${operation.name} returned a result that violates its schema`,
            observed: String(cause),
          }),
      ),
      Effect.flatMap((decoded) => {
        const receipt = decoded.receipt;
        if (!isAttuneReceipt(receipt)) {
          return Effect.fail(
            new AttuneToolFailure({
              code: "ContractMismatch",
              message: `${operation.name} returned an invalid terminal receipt`,
            }),
          );
        }
        const operationIdentity = operation.invocation.operation;
        const correlation = operation.correlation;
        const expectedOperation =
          typeof operationIdentity === "string"
            ? operationIdentity
            : typeof input === "object" && input !== null
              ? Reflect.get(input, operationIdentity.field)
              : undefined;
        const expectedInvocationId =
          typeof input === "object" && input !== null
            ? Reflect.get(input, correlation.invocationId)
            : undefined;
        const expectedInvocationIdText =
          typeof expectedInvocationId === "string"
            ? String(expectedInvocationId)
            : undefined;
        const investigationSource = correlation.investigationId;
        const resultInvestigationId =
          investigationSource.source === "input"
            ? typeof input === "object" && input !== null
              ? Reflect.get(input, investigationSource.field)
              : undefined
            : typeof decoded === "object" && decoded !== null
              ? Reflect.get(decoded, investigationSource.field)
              : undefined;
        const fallbackInvestigationId =
          investigationSource.source === "result" &&
          investigationSource.fallbackInput !== undefined &&
          typeof input === "object" &&
          input !== null
            ? Reflect.get(input, investigationSource.fallbackInput)
            : undefined;
        const expectedInvestigationIds = [
          ...(investigationSource.source === "input" ||
          investigationSource.requiredWhen !== "succeeded" ||
          receipt.status === "succeeded"
            ? [resultInvestigationId]
            : []),
          ...(fallbackInvestigationId === undefined
            ? []
            : [fallbackInvestigationId]),
        ];
        const expectedInputDigest = sha256(`${canonicalJson(input)}\n`);
        const expectedSnapshots =
          receipt.status !== "succeeded"
            ? []
            : correlation.successSnapshots.map((snapshotSource) =>
                snapshotSource.source === "input"
                  ? typeof input === "object" && input !== null
                    ? Reflect.get(input, snapshotSource.field)
                    : undefined
                  : typeof decoded === "object" && decoded !== null
                    ? Reflect.get(decoded, snapshotSource.field)
                    : undefined,
              );
        if (
          receipt.tool !== operation.invocation.tool ||
          typeof expectedOperation !== "string" ||
          receipt.operation !== expectedOperation ||
          expectedInvocationIdText === undefined ||
          String(receipt.invocationId) !== expectedInvocationIdText ||
          receipt.inputDigest !== expectedInputDigest ||
          expectedInvestigationIds.some(
            (expectedInvestigationId) =>
              typeof expectedInvestigationId !== "string" ||
              receipt.investigationId !== expectedInvestigationId,
          ) ||
          (receipt.status === "succeeded" &&
            expectedSnapshots.some(
              (expectedSnapshot) =>
                typeof expectedSnapshot !== "string" ||
                receipt.snapshotId !== expectedSnapshot,
            ))
        ) {
          return Effect.fail(
            new AttuneToolFailure({
              code: "ContractMismatch",
              message: `${operation.name} returned a receipt that does not correlate with its request and result`,
              expected: [
                operation.invocation.tool,
                String(expectedOperation),
                String(expectedInvocationIdText),
                expectedInvestigationIds.map(String).join(","),
                expectedInputDigest,
                expectedSnapshots.map(String).join(","),
              ].join(":"),
              observed: [
                receipt.tool,
                receipt.operation,
                receipt.invocationId,
                receipt.investigationId,
                receipt.inputDigest,
                receipt.status === "succeeded" ? receipt.snapshotId : undefined,
              ].join(":"),
            }),
          );
        }
        // The schema decoder proves the result union and the checks above
        // prove the descriptor-refined tool/operation literals. TypeScript
        // cannot reduce that dependent relationship for an existential
        // `Operation`, so this is the single cast at the validated boundary.
        return Effect.succeed(decoded as OperationResultOf<Operation>);
      }),
    ),
  ).pipe(narrowOperationErrors(operation)) as Effect.Effect<
    OperationResultOf<Operation>,
    OperationError<Operation>,
    Requirements
  >;

/** Resolves the descriptor-owned scheduling policy for one wire input. */
export const resolveWriterMode = <const Operation extends AnyToolOperation>(
  ...[operation, input]: OperationInputArguments<Operation>
): WriterMode => {
  const policy = operation.writerPolicy;
  if (policy.kind === "static") return policy.mode;
  if (typeof input !== "object" || input === null) return policy.defaultMode;
  const discriminant = Reflect.get(input, policy.field);
  return typeof discriminant === "string"
    ? (policy.cases[discriminant] ?? policy.defaultMode)
    : policy.defaultMode;
};

/** Resolves the receipt operation identity for one wire input. */
export const resolveInvocationOperation = <
  const Operation extends AnyToolOperation,
>(
  ...[operation, input]: OperationInputArguments<Operation>
): string => {
  const identity = operation.invocation.operation;
  if (typeof identity === "string") return identity;
  if (typeof input !== "object" || input === null) {
    throw new AttuneToolFailure({
      code: "ContractMismatch",
      message: `${operation.name} cannot resolve its receipt operation`,
    });
  }
  const value = Reflect.get(input, identity.field);
  if (typeof value !== "string") {
    throw new AttuneToolFailure({
      code: "ContractMismatch",
      message: `${operation.name} receipt operation field is not a string`,
      observed: String(value),
    });
  }
  return value;
};

/**
 * Narrows the shared receipt shape used by current Attune operations.
 *
 * @internal
 */
export const isAttuneReceipt = (value: unknown): value is AttuneReceipt =>
  Schema.is(AttuneReceipt)(value);
