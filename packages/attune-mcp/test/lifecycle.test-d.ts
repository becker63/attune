import { Attune, AttuneReceipt, type Investigation } from "attune-mcp";
import { expectTypeOf } from "expect-type";

expectTypeOf(Attune.make()).toEqualTypeOf<Attune>();
expectTypeOf(AttuneReceipt.Type).toBeObject();

declare const finalized: Investigation<"finalized">;
declare const attune: Attune;
attune.execute(
  // @ts-expect-error Finalized evidence cannot authorize active work.
  finalized,
  "maude_run",
  {} as Parameters<typeof attune.execute<"maude_run">>[2],
);
