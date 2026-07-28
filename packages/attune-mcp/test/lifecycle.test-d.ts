import {
  AttuneToolkit,
  type AttuneOperationError,
  type AttuneOperationInput,
  type AttuneOperationName,
  type AttuneOperationResult,
  type AttuneOperationWireInput,
  type AttuneOperationWriter,
  type FinalizedInvestigation,
  type InvestigationServiceApi,
} from "attune-mcp";
import type { Tool } from "effect/unstable/ai";
import { expectTypeOf } from "expect-type";

type PreservingOperation = "maude_run" | "ast_grep_run";
// @ts-expect-error Product operations cannot be extended at a call site.
expectTypeOf<AttuneOperationInput<"ninth_operation">>();

// The Toolkit remains the schema authority; keyed projections stay exact.
expectTypeOf<AttuneOperationWireInput<"maude_run">>().toEqualTypeOf<
  Tool.Parameters<typeof AttuneToolkit.tools.maude_run>
>();
expectTypeOf<AttuneOperationInput<"maude_run">>().toEqualTypeOf<
  Omit<
    Tool.Parameters<typeof AttuneToolkit.tools.maude_run>,
    "investigationId" | "expectedSnapshot"
  >
>();
expectTypeOf<AttuneOperationResult<PreservingOperation>>().toEqualTypeOf<
  AttuneOperationResult<"maude_run"> | AttuneOperationResult<"ast_grep_run">
>();
expectTypeOf<AttuneOperationError<"maude_run">>().toMatchTypeOf<{
  readonly code: string;
}>();
expectTypeOf<AttuneOperationWriter<"maude_run">>().toEqualTypeOf<"reader">();
expectTypeOf<AttuneOperationName>().toEqualTypeOf<
  | "repository_materialize"
  | "repository_checkpoint"
  | "joern_query"
  | "maude_run"
  | "property_run"
  | "ast_grep_run"
  | "artifact_promote"
  | "investigation_finalize"
>();

declare const finalized: FinalizedInvestigation;
declare const service: InvestigationServiceApi;

service.execute(
  // @ts-expect-error Finalized evidence cannot authorize another active operation.
  finalized,
  "maude_run",
  {} as AttuneOperationInput<"maude_run">,
);
