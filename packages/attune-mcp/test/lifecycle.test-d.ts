import {
  AstGrepRunOperation,
  AttuneReceipt,
  AttuneToolFailure,
  FullGitCommit,
  InvestigationId,
  InvestigationFinalizeOperation,
  InvocationEngine,
  InvocationId,
  MaudeRunInput,
  MaudeRunOperation,
  RepositoryMaterializeOperation,
  SucceededReceipt,
  defineOperationRegistry,
  defineToolOperation,
  CancelledReceipt,
  FailedReceipt,
  isAttuneReceipt,
  resolveInvocationOperation,
  resolveWriterMode,
  validateOperationResult,
  type ActiveInvestigation,
  type AstGrepRunInput,
  type CapabilityOperationHandler,
  type FinalizedInvestigation,
  type InvocationCompletion,
  type InvocationSpec,
  type InvestigationExecution,
  type InvestigationLifecycleError,
  type InvestigationServiceApi,
  type MaterializedInvestigation,
  type MaterializedInvestigationCapability,
  type OperationError,
  type OperationHandler,
  type OperationInput,
  type OperationLifecycleOf,
  type OperationReceipt,
  type OperationResult,
  type OperationResultOf,
  type OperationSuccessPayload,
  type OperationWireInput,
  type OperationWriterPolicy,
  type ReceiptRelation,
  type SuccessfulOperationResult,
  type UnsuccessfulOperationResult,
} from "attune-mcp";
import { Effect, Schema } from "effect";
import { expectTypeOf } from "expect-type";

type EffectSuccess<Value> =
  Value extends Effect.Effect<infer Success, infer _Error, infer _Services>
    ? Success
    : never;

type EffectError<Value> =
  Value extends Effect.Effect<infer _Success, infer Error, infer _Services>
    ? Error
    : never;

type MaudeDomainInput = Omit<
  typeof MaudeRunInput.Type,
  "investigationId" | "expectedSnapshot"
>;
type MaudeSucceededResult = SuccessfulOperationResult<typeof MaudeRunOperation>;
type PreservingOperationUnion =
  | typeof MaudeRunOperation
  | typeof AstGrepRunOperation;

// One descriptor is the source for wire input, capability-domain input,
// terminal result, and operation-specific receipt identity.
expectTypeOf<OperationWireInput<typeof MaudeRunOperation>>().toEqualTypeOf<
  typeof MaudeRunInput.Type
>();
expectTypeOf<
  OperationInput<typeof MaudeRunOperation>
>().toEqualTypeOf<MaudeDomainInput>();
expectTypeOf<
  OperationReceipt<typeof MaudeRunOperation>["tool"]
>().toEqualTypeOf<"maude">();
expectTypeOf<
  OperationReceipt<typeof MaudeRunOperation>["operation"]
>().toEqualTypeOf<"run">();
expectTypeOf<
  Extract<
    OperationResult<typeof MaudeRunOperation>,
    { readonly receipt: { readonly status: "succeeded" } }
  >["snapshotId"]
>().toEqualTypeOf<(typeof MaudeRunInput.Type)["expectedSnapshot"]>();
expectTypeOf<MaudeSucceededResult["receipt"]["invocationId"]>().toEqualTypeOf<
  (typeof MaudeRunInput.Type)["invocationId"]
>();
expectTypeOf<
  MaudeSucceededResult["receipt"]["investigationId"]
>().toEqualTypeOf<(typeof MaudeRunInput.Type)["investigationId"]>();
expectTypeOf<MaudeSucceededResult["receipt"]["snapshotId"]>().toEqualTypeOf<
  (typeof MaudeRunInput.Type)["expectedSnapshot"]
>();
expectTypeOf<MaudeSucceededResult["snapshotId"]>().toEqualTypeOf<
  MaudeSucceededResult["receipt"]["snapshotId"]
>();
expectTypeOf<OperationSuccessPayload<typeof MaudeRunOperation>>().toEqualTypeOf<
  Omit<MaudeSucceededResult, "receipt">
>();

// Every descriptor projection distributes before reading branch-owned fields.
// This preserves the descriptor/result/receipt/error relation for generic
// callers instead of forming a Cartesian product across a descriptor union.
expectTypeOf<OperationWireInput<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationWireInput<typeof MaudeRunOperation>
  | OperationWireInput<typeof AstGrepRunOperation>
>();
expectTypeOf<OperationInput<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationInput<typeof MaudeRunOperation>
  | OperationInput<typeof AstGrepRunOperation>
>();
expectTypeOf<OperationResult<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationResult<typeof MaudeRunOperation>
  | OperationResult<typeof AstGrepRunOperation>
>();
expectTypeOf<OperationResultOf<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationResultOf<typeof MaudeRunOperation>
  | OperationResultOf<typeof AstGrepRunOperation>
>();
expectTypeOf<OperationReceipt<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationReceipt<typeof MaudeRunOperation>
  | OperationReceipt<typeof AstGrepRunOperation>
>();
expectTypeOf<OperationError<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationError<typeof MaudeRunOperation>
  | OperationError<typeof AstGrepRunOperation>
>();
expectTypeOf<OperationWriterPolicy<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationWriterPolicy<typeof MaudeRunOperation>
  | OperationWriterPolicy<typeof AstGrepRunOperation>
>();
expectTypeOf<OperationLifecycleOf<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationLifecycleOf<typeof MaudeRunOperation>
  | OperationLifecycleOf<typeof AstGrepRunOperation>
>();
expectTypeOf<
  SuccessfulOperationResult<PreservingOperationUnion>
>().toEqualTypeOf<
  | SuccessfulOperationResult<typeof MaudeRunOperation>
  | SuccessfulOperationResult<typeof AstGrepRunOperation>
>();
expectTypeOf<
  UnsuccessfulOperationResult<PreservingOperationUnion>
>().toEqualTypeOf<
  | UnsuccessfulOperationResult<typeof MaudeRunOperation>
  | UnsuccessfulOperationResult<typeof AstGrepRunOperation>
>();
expectTypeOf<OperationSuccessPayload<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationSuccessPayload<typeof MaudeRunOperation>
  | OperationSuccessPayload<typeof AstGrepRunOperation>
>();
expectTypeOf<OperationHandler<PreservingOperationUnion>>().toEqualTypeOf<
  | OperationHandler<typeof MaudeRunOperation>
  | OperationHandler<typeof AstGrepRunOperation>
>();
expectTypeOf<
  CapabilityOperationHandler<PreservingOperationUnion>
>().toEqualTypeOf<
  | CapabilityOperationHandler<typeof MaudeRunOperation>
  | CapabilityOperationHandler<typeof AstGrepRunOperation>
>();
expectTypeOf<InvocationCompletion<PreservingOperationUnion>>().toEqualTypeOf<
  | InvocationCompletion<typeof MaudeRunOperation>
  | InvocationCompletion<typeof AstGrepRunOperation>
>();
expectTypeOf<InvocationSpec<PreservingOperationUnion>>().toEqualTypeOf<
  | InvocationSpec<typeof MaudeRunOperation>
  | InvocationSpec<typeof AstGrepRunOperation>
>();
expectTypeOf<
  Extract<
    OperationResult<PreservingOperationUnion>,
    { readonly receipt: { readonly tool: "maude" } }
  >
>().toEqualTypeOf<OperationResult<typeof MaudeRunOperation>>();

declare const unknownReceipt: unknown;
if (isAttuneReceipt(unknownReceipt)) {
  expectTypeOf(unknownReceipt).toEqualTypeOf<AttuneReceipt>();
}

// Every result branch must carry exactly the descriptor-declared receipt
// union. These deliberately invalid schemas reduce the relation to `never`.
const MissingReceiptResult = Schema.Struct({ value: Schema.String });
const NarrowReceiptResult = Schema.Struct({ receipt: SucceededReceipt });
expectTypeOf<
  ReceiptRelation<typeof MissingReceiptResult, typeof AttuneReceipt>
>().toEqualTypeOf<never>();
expectTypeOf<
  ReceiptRelation<typeof NarrowReceiptResult, typeof AttuneReceipt>
>().toEqualTypeOf<never>();

const NonTerminalizableResult = Schema.Union([
  Schema.Struct({
    snapshotId: FullGitCommit,
    receipt: SucceededReceipt,
  }),
  Schema.Struct({
    requiredFailureDetail: Schema.String,
    receipt: Schema.Union([FailedReceipt, CancelledReceipt]),
  }),
]);
const nonTerminalizableDescriptor =
  // @ts-expect-error failed and cancelled results must be constructible as `{ receipt }`
  defineToolOperation({
    ...MaudeRunOperation,
    name: "invalid_non_terminalizable_result",
    result: NonTerminalizableResult,
  });
void nonTerminalizableDescriptor;

// Literal scheduling and lifecycle relations do not widen in the registry.
expectTypeOf<OperationWriterPolicy<typeof MaudeRunOperation>>().toEqualTypeOf<{
  readonly kind: "static";
  readonly mode: "reader";
}>();
expectTypeOf<
  OperationWriterPolicy<typeof AstGrepRunOperation>
>().toEqualTypeOf<{
  readonly kind: "input-discriminant";
  readonly field: "mode";
  readonly cases: { readonly apply: "writer" };
  readonly defaultMode: "reader";
}>();
expectTypeOf(MaudeRunOperation.lifecycle).toEqualTypeOf<{
  readonly requires: "active";
  readonly produces: "active";
  readonly transition: "preserve";
}>();

// Descriptor metadata may inspect only fields whose value type proves the
// corresponding runtime role.
const numericWriterPolicy = {
  kind: "input-discriminant",
  field: "timeoutMilliseconds",
  cases: {},
  defaultMode: "reader",
} as const;
defineToolOperation({
  ...MaudeRunOperation,
  name: "invalid_numeric_writer",
  // @ts-expect-error numeric fields cannot choose a writer policy
  writerPolicy: numericWriterPolicy,
});

const numericInvocationIdentity = {
  tool: "maude",
  operation: { field: "timeoutMilliseconds" },
} as const;
defineToolOperation({
  ...MaudeRunOperation,
  name: "invalid_numeric_invocation_identity",
  // @ts-expect-error invocation identity must come from a string field
  invocation: numericInvocationIdentity,
});

const invalidInvocationCorrelation = {
  ...MaudeRunOperation.correlation,
  invocationId: "moduleSource",
} as const;
defineToolOperation({
  ...MaudeRunOperation,
  name: "invalid_invocation_correlation",
  // @ts-expect-error invocation correlation requires an InvocationId field
  correlation: invalidInvocationCorrelation,
});

const invalidInvestigationCorrelation = {
  ...MaudeRunOperation.correlation,
  investigationId: { source: "result", field: "stdoutTail" },
} as const;
defineToolOperation({
  ...MaudeRunOperation,
  name: "invalid_investigation_correlation",
  // @ts-expect-error result correlation must select an InvestigationId
  correlation: invalidInvestigationCorrelation,
});

expectTypeOf(
  RepositoryMaterializeOperation.correlation.investigationId,
).toEqualTypeOf<{
  readonly source: "result";
  readonly field: "investigationId";
  readonly requiredWhen: "succeeded";
  readonly fallbackInput: "investigationId";
}>();

const invalidMaterializeFallback = {
  ...RepositoryMaterializeOperation.correlation,
  investigationId: {
    ...RepositoryMaterializeOperation.correlation.investigationId,
    fallbackInput: "remote",
  },
} as const;
defineToolOperation({
  ...RepositoryMaterializeOperation,
  name: "invalid_materialize_fallback",
  // @ts-expect-error fallback identity must select an optional InvestigationId
  correlation: invalidMaterializeFallback,
});

const invalidSnapshotCorrelation = {
  ...MaudeRunOperation.correlation,
  successSnapshots: [{ source: "input", field: "moduleSource" }],
} as const;
defineToolOperation({
  ...MaudeRunOperation,
  name: "invalid_snapshot_correlation",
  // @ts-expect-error snapshot correlation must select a FullGitCommit
  correlation: invalidSnapshotCorrelation,
});

const ActiveInputWithoutSnapshot = Schema.Struct({
  invocationId: InvocationId,
  investigationId: InvestigationId,
});

const unboundActiveDescriptor =
  // @ts-expect-error active operations require InvestigationBoundInput
  defineToolOperation({
    ...MaudeRunOperation,
    name: "invalid_unbound_active_operation",
    input: ActiveInputWithoutSnapshot,
    writerPolicy: { kind: "static", mode: "reader" },
    invocation: { tool: "maude", operation: "run" },
    correlation: {
      invocationId: "invocationId",
      investigationId: { source: "input", field: "investigationId" },
      inputDigest: "canonical-json-sha256",
      successSnapshots: [{ source: "result", field: "snapshotId" }],
    },
  });
void unboundActiveDescriptor;

// Registry key and descriptor name are one compile-time identity.
defineOperationRegistry({
  maude_run: MaudeRunOperation,
});
defineOperationRegistry({
  // @ts-expect-error registry keys must equal descriptor.name
  wrong_name: MaudeRunOperation,
});

const structurallyInvalidActiveDescriptor = {
  ...RepositoryMaterializeOperation,
  name: "invalid_active_descriptor",
  lifecycle: {
    requires: "active",
    produces: "active",
    transition: "preserve",
  },
} as const;
defineOperationRegistry({
  // @ts-expect-error registries revalidate active-operation input identity
  invalid_active_descriptor: structurallyInvalidActiveDescriptor,
});

// The descriptor narrows the global failure-code union.
expectTypeOf<OperationError<typeof MaudeRunOperation>["code"]>().toEqualTypeOf<
  | "UnknownInvestigation"
  | "IdentityConflict"
  | "InvocationConflict"
  | "InvocationIncomplete"
  | "StaleSnapshot"
  | "DirtyRepository"
  | "GitFailure"
  | "AgentFsFailure"
  | "ProcessSpawnFailure"
  | "ProcessExitFailure"
  | "ParseFailure"
  | "TimedOut"
  | "ResourceLimited"
  | "Cancelled"
  | "Finalized"
  | "ContractMismatch"
>();

declare const service: InvestigationServiceApi;
declare const materialized: MaterializedInvestigationCapability;
declare const active: ActiveInvestigation;
declare const finalized: FinalizedInvestigation;
declare const maudeInput: MaudeDomainInput;
declare const maudeWireInput: OperationWireInput<typeof MaudeRunOperation>;
declare const astGrepInput: Omit<
  AstGrepRunInput,
  "investigationId" | "expectedSnapshot"
>;
declare const astGrepWireInput: OperationWireInput<typeof AstGrepRunOperation>;

const execution = service.execute(active, "maude_run", maudeInput);
expectTypeOf<EffectSuccess<typeof execution>>().toEqualTypeOf<
  InvestigationExecution<"maude_run">
>();
expectTypeOf<EffectError<typeof execution>>().toEqualTypeOf<
  OperationError<typeof MaudeRunOperation> | InvestigationLifecycleError
>();
expectTypeOf<
  InvestigationExecution<"maude_run" | "ast_grep_run">
>().toEqualTypeOf<
  InvestigationExecution<"maude_run"> | InvestigationExecution<"ast_grep_run">
>();
expectTypeOf<
  Extract<
    InvestigationExecution<"maude_run" | "ast_grep_run">,
    { readonly receipt: { readonly tool: "maude" } }
  >
>().toEqualTypeOf<InvestigationExecution<"maude_run">>();

declare const correlatedExecution:
  | [name: "maude_run", input: MaudeDomainInput]
  | [name: "ast_grep_run", input: typeof astGrepInput];
const unionExecution = service.execute(active, ...correlatedExecution);
expectTypeOf<EffectSuccess<typeof unionExecution>>().toEqualTypeOf<
  InvestigationExecution<"maude_run"> | InvestigationExecution<"ast_grep_run">
>();
expectTypeOf<EffectError<typeof unionExecution>>().toEqualTypeOf<
  | OperationError<typeof MaudeRunOperation>
  | OperationError<typeof AstGrepRunOperation>
  | InvestigationLifecycleError
>();

declare const preservingSelector: "maude_run" | "ast_grep_run";
// @ts-expect-error a union selector cannot pair with one branch's input
service.execute(active, preservingSelector, maudeInput);

declare const correlatedRecovery:
  | [name: "maude_run", input: OperationWireInput<typeof MaudeRunOperation>]
  | [
      name: "ast_grep_run",
      input: OperationWireInput<typeof AstGrepRunOperation>,
    ];
const unionRecovery = service.recoverTerminal(...correlatedRecovery);
expectTypeOf<EffectSuccess<typeof unionRecovery>>().toEqualTypeOf<
  | OperationResult<typeof MaudeRunOperation>
  | OperationResult<typeof AstGrepRunOperation>
  | undefined
>();
expectTypeOf<EffectError<typeof unionRecovery>>().toEqualTypeOf<
  | OperationError<typeof MaudeRunOperation>
  | OperationError<typeof AstGrepRunOperation>
  | InvestigationLifecycleError
>();
// @ts-expect-error a union recovery selector cannot pair with one branch input
service.recoverTerminal(preservingSelector, maudeWireInput);

// The durable engine also derives its pre-receipt payload from the descriptor.
// Input or callback shapes cannot re-infer a broader operation around it.
declare const invocationEngine: InvocationEngine;

declare const choosePreservingOperation: boolean;
const unionLookup = choosePreservingOperation
  ? invocationEngine.lookupTerminal(MaudeRunOperation, maudeWireInput)
  : invocationEngine.lookupTerminal(AstGrepRunOperation, astGrepWireInput);
expectTypeOf<EffectSuccess<typeof unionLookup>>().toEqualTypeOf<
  | OperationResult<typeof MaudeRunOperation>
  | OperationResult<typeof AstGrepRunOperation>
  | undefined
>();
expectTypeOf<EffectError<typeof unionLookup>>().toEqualTypeOf<
  | OperationError<typeof MaudeRunOperation>
  | OperationError<typeof AstGrepRunOperation>
>();

const unknownTerminal: Effect.Effect<unknown, AttuneToolFailure> =
  Effect.succeed({});
const unionValidation = choosePreservingOperation
  ? validateOperationResult(MaudeRunOperation, maudeWireInput, unknownTerminal)
  : validateOperationResult(
      AstGrepRunOperation,
      astGrepWireInput,
      unknownTerminal,
    );
expectTypeOf<EffectSuccess<typeof unionValidation>>().toEqualTypeOf<
  | OperationResult<typeof MaudeRunOperation>
  | OperationResult<typeof AstGrepRunOperation>
>();
expectTypeOf<EffectError<typeof unionValidation>>().toEqualTypeOf<
  | OperationError<typeof MaudeRunOperation>
  | OperationError<typeof AstGrepRunOperation>
>();

const durableExecution = invocationEngine.execute({
  descriptor: MaudeRunOperation,
  input: maudeWireInput,
  run: async () => ({
    snapshotId: maudeWireInput.expectedSnapshot,
    value: {
      snapshotId: maudeWireInput.expectedSnapshot,
      stdoutTail: "",
      stderrTail: "",
    },
  }),
});
expectTypeOf<EffectSuccess<typeof durableExecution>>().toEqualTypeOf<
  OperationResult<typeof MaudeRunOperation>
>();
expectTypeOf<EffectError<typeof durableExecution>>().toEqualTypeOf<
  OperationError<typeof MaudeRunOperation>
>();

declare const preservingDescriptor:
  | typeof MaudeRunOperation
  | typeof AstGrepRunOperation;
// @ts-expect-error a union descriptor cannot select one branch's writer input
resolveWriterMode(preservingDescriptor, maudeWireInput);
// @ts-expect-error a union descriptor cannot select one branch's receipt identity
resolveInvocationOperation(preservingDescriptor, maudeWireInput);
// @ts-expect-error validation must correlate a union descriptor with its input
validateOperationResult(preservingDescriptor, maudeWireInput, unknownTerminal);
// @ts-expect-error durable recovery must correlate descriptor and wire input
invocationEngine.lookupTerminal(preservingDescriptor, maudeWireInput);

const unionDescriptorMaudeSpec = {
  descriptor: preservingDescriptor,
  input: maudeWireInput,
  run: async () => ({
    snapshotId: maudeWireInput.expectedSnapshot,
    value: {
      snapshotId: maudeWireInput.expectedSnapshot,
      stdoutTail: "",
      stderrTail: "",
    },
  }),
};
// @ts-expect-error a union descriptor cannot pair with one branch's input/payload
invocationEngine.execute(unionDescriptorMaudeSpec);

invocationEngine.execute({
  descriptor: MaudeRunOperation,
  input: maudeWireInput,
  // @ts-expect-error run payload is fixed by the Maude descriptor
  run: async () => ({
    snapshotId: maudeWireInput.expectedSnapshot,
    value: {
      snapshotId: maudeWireInput.expectedSnapshot,
      createdCommit: false,
    },
  }),
});

// Branded wire identities are still strings, but arbitrary strings cannot
// substitute for the descriptor-derived receipt identities.
declare const fullCommit: typeof FullGitCommit.Type;
expectTypeOf(fullCommit).toEqualTypeOf<
  MaudeSucceededResult["receipt"]["snapshotId"]
>();

service.activate(materialized);
service.finalize(active, {
  invocationId: maudeInput.invocationId,
  references: [],
});
service.execute(active, "ast_grep_run", astGrepInput);

// The platform result and lifecycle capability deliberately have distinct
// names: persisted details cannot stand in for validated permission.
declare const platformMaterialization: MaterializedInvestigation;
// @ts-expect-error platform details are not a lifecycle capability
service.activate(platformMaterialization);

// A finalized capability cannot regain execution permission.
// @ts-expect-error finalized investigations are inspection-only
service.execute(finalized, "maude_run", maudeInput);

// Activation is the validated materialized -> active transition only.
// @ts-expect-error an active capability has already crossed this boundary
service.activate(active);

// Finalization consumes active permission, not finalized evidence.
// @ts-expect-error finalized investigations cannot be finalized again
service.finalize(finalized, {
  invocationId: maudeInput.invocationId,
  references: [],
});

// The generic execution method accepts only active-preserving registry names.
// @ts-expect-error materialization does not execute inside an active workspace
service.execute(active, RepositoryMaterializeOperation.name, maudeInput);

// @ts-expect-error finalization has its own state-changing method
service.execute(active, InvestigationFinalizeOperation.name, {
  invocationId: maudeInput.invocationId,
  references: [],
});

// Operation input follows the selected registry name without caller type args.
// @ts-expect-error ast-grep input cannot be passed to a Maude operation
service.execute(active, "maude_run", astGrepInput);

// Capability-domain input cannot disagree with capability identity.
service.execute(active, "maude_run", {
  ...maudeInput,
  // @ts-expect-error identity is injected from active permission
  investigationId: "01K00000000000000000000000",
});

// The private capability brand makes structural construction invalid.
// @ts-expect-error active capabilities are constructed by the service
const forged: ActiveInvestigation = {};
void forged;
