import { Effect } from "effect";

import { emitGenerated } from "./emitGenerated.ts";
import { extractSchema } from "./extractSchema.ts";
import { normalizeSchema } from "./normalizeSchema.ts";

export const generate = (
  outDir = "src/pure/generated",
  schemaPath = "schema/joern-cpg-schema.1.7.70.json",
): Effect.Effect<void, Error> =>
  extractSchema(schemaPath).pipe(
    Effect.map(normalizeSchema),
    Effect.flatMap((schema) => emitGenerated(schema, outDir)),
  );
