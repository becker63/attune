import {
  Attune,
  AttuneReceipt,
  AttuneToolkit,
  type Investigation,
} from "attune-mcp";
import type { Tool } from "effect/unstable/ai";
import { expectTypeOf } from "expect-type";

expectTypeOf(Attune.make()).toEqualTypeOf<Attune>();
expectTypeOf(AttuneReceipt.Type).toBeObject();

declare const finalized: Investigation<"finalized">;
declare const attune: Attune;
type MaudeInput = Omit<
  Tool.Parameters<typeof AttuneToolkit.tools.maude_run>,
  "investigationId" | "expectedSnapshot"
>;
attune.execute(
  // @ts-expect-error Finalized evidence cannot authorize active work.
  finalized,
  "maude_run",
  {} as MaudeInput,
);
