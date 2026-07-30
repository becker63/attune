import type { Effect } from "effect";
import { Toolkit, Tool } from "effect/unstable/ai";

import {
  ArtifactPromoteTool,
  AstGrepRunTool,
  InvestigationFinalizeTool,
  JoernQueryTool,
  MaudeRunTool,
  PropertyRunTool,
  RepositoryCheckpointTool,
  RepositoryMaterializeTool,
  type AttuneReceipt,
  type AttuneToolFailure,
} from "../contract/schemas.js";
/**
 * {@link AttuneToolkit} defines the stable capability boundary shared by the Effect service, MCP clients, and
 * the generated ActiveGraph wrappers.
 *
 * @remarks
 *   The toolkit owns the exact parameter, success, and failure schemas for repository materialization,
 *   checkpointing, Joern, Maude, property testing, ast-grep, artifact promotion, and investigation
 *   finalization. Installing this one value keeps protocol discovery and runtime decoding on the same closed
 *   operation set. Application code should use {@link Attune}: infer materialization input from
 *   {@link Attune.materialize}, infer preserving inputs and results from {@link Attune.execute}, and infer
 *   terminal policy from {@link Attune.finalize}. The service adds and verifies {@link Investigation} identity
 *   and snapshot authority that raw transport schemas cannot provide. Each accepted operation produces a
 *   correlated {@link AttuneReceipt}; boundary rejection uses {@link AttuneToolFailure}, and invalid lifecycle
 *   authority uses {@link InvestigationLifecycleError}. Registry metadata remains private so adding transport
 *   machinery does not add another public application noun.
 */
export const AttuneToolkit = Toolkit.make(
  RepositoryMaterializeTool,
  RepositoryCheckpointTool,
  JoernQueryTool,
  MaudeRunTool,
  PropertyRunTool,
  AstGrepRunTool,
  ArtifactPromoteTool,
  InvestigationFinalizeTool,
);

/**
 * Names one operation in the closed toolkit. @remarks The key preserves input, result, failure, and metadata
 * correlation throughout the service.
 */
export type AttuneOperationName = keyof typeof AttuneToolkit.tools;
/** Selects the Effect tool definition for one operation key. */ type AttuneTool<
  Name extends AttuneOperationName,
> = (typeof AttuneToolkit.tools)[Name];
/** Selects the concurrency policy for an operation. */ type Writer =
  | "reader"
  | "writer"
  | "exclusive-writer"
  | "ast-grep-mode";
/** Selects the lifecycle transition owned by an operation. */ type Transition =
  | "materialize"
  | "preserve"
  | "finalize";
/** Selects the receipt-to-result snapshot correlation rule. */ type Correlation =
  | "materialize"
  | "checkpoint"
  | "preserve-snapshot"
  | "artifact-before"
  | "finalize";
/** Couples one tool schema to lifecycle and receipt mechanics. */ type Metadata<
  ToolDefinition extends Tool.Any,
> = {
  /** Effect tool definition. */ readonly tool: ToolDefinition;
  /** Lifecycle transition. */ readonly transition: Transition;
  /** Concurrency policy. */ readonly writer: Writer;
  /** Durable tool and operation labels. */ readonly receipt: readonly [
    tool: AttuneReceipt["tool"],
    operation: string | { readonly input: "mode" },
  ];
  /** Result correlation policy. */ readonly correlation: Correlation;
};

/** Requires metadata for every and only registered operation. */ type ClosedRegistry = {
  readonly [Name in AttuneOperationName]: Metadata<AttuneTool<Name>>;
};

/**
 * Stores lifecycle mechanics for the closed operation set. @remarks Runtime dispatch, concurrency, receipt
 * labels, and correlation all read this single registry.
 */
export const ATTUNE_OPERATIONS = {
  repository_materialize: {
    tool: RepositoryMaterializeTool,
    transition: "materialize",
    writer: "exclusive-writer",
    receipt: ["repository", "materialize"],
    correlation: "materialize",
  },
  repository_checkpoint: {
    tool: RepositoryCheckpointTool,
    transition: "preserve",
    writer: "writer",
    receipt: ["repository", "checkpoint"],
    correlation: "checkpoint",
  },
  joern_query: {
    tool: JoernQueryTool,
    transition: "preserve",
    writer: "reader",
    receipt: ["joern", "query"],
    correlation: "preserve-snapshot",
  },
  maude_run: {
    tool: MaudeRunTool,
    transition: "preserve",
    writer: "reader",
    receipt: ["maude", "run"],
    correlation: "preserve-snapshot",
  },
  property_run: {
    tool: PropertyRunTool,
    transition: "preserve",
    writer: "reader",
    receipt: ["property", "run"],
    correlation: "preserve-snapshot",
  },
  ast_grep_run: {
    tool: AstGrepRunTool,
    transition: "preserve",
    writer: "ast-grep-mode",
    receipt: ["ast-grep", { input: "mode" }],
    correlation: "preserve-snapshot",
  },
  artifact_promote: {
    tool: ArtifactPromoteTool,
    transition: "preserve",
    writer: "writer",
    receipt: ["artifact", "promote"],
    correlation: "artifact-before",
  },
  investigation_finalize: {
    tool: InvestigationFinalizeTool,
    transition: "finalize",
    writer: "exclusive-writer",
    receipt: ["repository", "finalize"],
    correlation: "finalize",
  },
} as const satisfies ClosedRegistry;

/**
 * Selects the transport input for an operation. @remarks Wire input includes lifecycle identity where the
 * transport requires it.
 */
export type AttuneOperationWireInput<Name extends AttuneOperationName> = Tool.Parameters<AttuneTool<Name>>;
/**
 * Selects the application input for an operation. @remarks Active authority replaces duplicated identity
 * fields after materialization.
 */
export type AttuneOperationInput<Name extends AttuneOperationName> =
  (typeof ATTUNE_OPERATIONS)[Name]["transition"] extends "materialize"
    ? AttuneOperationWireInput<Name>
    : Omit<AttuneOperationWireInput<Name>, "investigationId" | "expectedSnapshot">;
/**
 * Selects the correlated terminal result for an operation. @remarks The operation key keeps result and
 * request choice aligned.
 */
export type AttuneOperationResult<Name extends AttuneOperationName> = Tool.Success<AttuneTool<Name>>;
/**
 * Selects the durable receipt embedded in an operation result. @remarks Receipt status remains correlated
 * with the selected operation.
 */
export type AttuneOperationReceipt<Name extends AttuneOperationName> = Extract<
  AttuneOperationResult<Name>,
  { readonly receipt: unknown }
>["receipt"] &
  AttuneReceipt;
/**
 * Names operations that require active investigation authority. @remarks Materialization is excluded because
 * it creates rather than consumes authority.
 */
export type ActiveAttuneOperationName = {
  readonly [Name in AttuneOperationName]: (typeof ATTUNE_OPERATIONS)[Name]["transition"] extends "materialize"
    ? never
    : Name;
}[AttuneOperationName];

/**
 * Names active operations that return active authority. @remarks Finalization is excluded because successful
 * completion closes the lifecycle.
 */
export type PreservingAttuneOperationName = {
  readonly [Name in ActiveAttuneOperationName]: (typeof ATTUNE_OPERATIONS)[Name]["transition"] extends "preserve"
    ? Name
    : never;
}[ActiveAttuneOperationName];

/**
 * Handles one correlated wire operation. @remarks The key selects both its request and terminal contract.
 *
 * @typeParam Name - Operation key. @param input - Correlated wire input. @returns The operation result
 *   effect.
 * @failure {@link AttuneToolFailure} - Correct the tool boundary before retrying the operation.
 */
export type AttuneOperationHandler<Name extends AttuneOperationName> = (
  input: AttuneOperationWireInput<Name>,
) => Effect.Effect<AttuneOperationResult<Name>, AttuneToolFailure>;

/**
 * Provides one handler for every toolkit operation. @remarks The mapped type makes registry additions
 * mechanically require implementation.
 */
export type AttuneOperationHandlers = {
  readonly [Name in AttuneOperationName]: AttuneOperationHandler<Name>;
};

/**
 * Provides terminal replay for every active operation. @remarks Lookup returns absence before acceptance and
 * correlated evidence afterward without starting work.
 */
export type AttuneTerminalLookups = {
  readonly [Name in ActiveAttuneOperationName]: (
    input: AttuneOperationWireInput<Name>,
  ) => Effect.Effect<AttuneOperationResult<Name> | undefined, AttuneToolFailure>;
};
