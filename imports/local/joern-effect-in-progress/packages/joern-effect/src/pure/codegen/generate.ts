import { Effect } from "effect"
import { emitGenerated } from "./emitGenerated.js"
import { extractSchema } from "./extractSchema.js"
import { normalizeSchema } from "./normalizeSchema.js"

export const generate = (outDir = "src/pure/generated"): Effect.Effect<void, Error> =>
  extractSchema().pipe(
    Effect.map(normalizeSchema),
    Effect.flatMap((schema) => emitGenerated(schema, outDir)),
  )
