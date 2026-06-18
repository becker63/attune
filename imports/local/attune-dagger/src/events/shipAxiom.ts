import { Axiom } from "@axiomhq/js";
import type { Secret } from "@dagger.io/dagger";
import { DEFAULT_AXIOM_DATASET } from "../defaults.js";
import type { NormalizedEvent } from "./normalize.js";

export type AxiomShipResult = Readonly<{
  status: "sent" | "skipped" | "failed";
  message: string;
}>;

export const shipAxiom = async (
  events: ReadonlyArray<NormalizedEvent>,
  token: Secret | undefined,
): Promise<AxiomShipResult> => {
  if (token === undefined) {
    return {
      status: "skipped",
      message: "Axiom shipping skipped: no Dagger secret configured.",
    };
  }

  try {
    const client = new Axiom({ token: await token.plaintext() });
    await client.ingest(DEFAULT_AXIOM_DATASET, events.map((event) => ({ ...event })));
    await client.flush();
    return {
      status: "sent",
      message: `sent ${events.length} events`,
    };
  } catch (error) {
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "unknown Axiom export failure",
    };
  }
};
