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
} from "../contract/schemas.js";
/** The Effect Toolkit is the sole schema and handler authority. */
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

export type AttuneOperationName = keyof typeof AttuneToolkit.tools;
type AttuneTool<Name extends AttuneOperationName> =
  (typeof AttuneToolkit.tools)[Name];
type Writer = "reader" | "writer" | "exclusive-writer" | "ast-grep-mode";
type Transition = "materialize" | "preserve" | "finalize";
type Correlation =
  | "materialize"
  | "checkpoint"
  | "preserve-snapshot"
  | "artifact-before"
  | "finalize";
type Metadata<ToolDefinition extends Tool.Any> = {
  readonly tool: ToolDefinition;
  readonly transition: Transition;
  readonly writer: Writer;
  readonly receipt: readonly [
    tool: AttuneReceipt["tool"],
    operation: string | { readonly input: "mode" },
  ];
  readonly correlation: Correlation;
};

type ClosedRegistry = {
  readonly [Name in AttuneOperationName]: Metadata<AttuneTool<Name>>;
};

/** Closed execution metadata for the eight product operations. */
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

export type AttuneOperationWireInput<Name extends AttuneOperationName> =
  Tool.Parameters<AttuneTool<Name>>;
export type AttuneOperationInput<Name extends AttuneOperationName> =
  (typeof ATTUNE_OPERATIONS)[Name]["transition"] extends "materialize"
    ? AttuneOperationWireInput<Name>
    : Omit<
        AttuneOperationWireInput<Name>,
        "investigationId" | "expectedSnapshot"
      >;
export type AttuneOperationResult<Name extends AttuneOperationName> =
  Tool.Success<AttuneTool<Name>>;
export type AttuneOperationError<Name extends AttuneOperationName> =
  Tool.Failure<AttuneTool<Name>>;
export type AttuneOperationReceipt<Name extends AttuneOperationName> = Extract<
  AttuneOperationResult<Name>,
  { readonly receipt: unknown }
>["receipt"] &
  AttuneReceipt;
export type AttuneOperationWriter<Name extends AttuneOperationName> =
  (typeof ATTUNE_OPERATIONS)[Name]["writer"];

export type ActiveAttuneOperationName = {
  readonly [Name in AttuneOperationName]: (typeof ATTUNE_OPERATIONS)[Name]["transition"] extends "materialize"
    ? never
    : Name;
}[AttuneOperationName];

export type PreservingAttuneOperationName = {
  readonly [Name in ActiveAttuneOperationName]: (typeof ATTUNE_OPERATIONS)[Name]["transition"] extends "preserve"
    ? Name
    : never;
}[ActiveAttuneOperationName];

export type AttuneOperationHandler<Name extends AttuneOperationName> = (
  input: AttuneOperationWireInput<Name>,
) => Effect.Effect<AttuneOperationResult<Name>, AttuneOperationError<Name>>;

export type AttuneOperationHandlers = {
  readonly [Name in AttuneOperationName]: AttuneOperationHandler<Name>;
};

export type AttuneTerminalLookups = {
  readonly [Name in ActiveAttuneOperationName]: (
    input: AttuneOperationWireInput<Name>,
  ) => Effect.Effect<
    AttuneOperationResult<Name> | undefined,
    AttuneOperationError<Name>
  >;
};
