import { Effect } from "effect"
import { emitFastCheckArbitraries, emitGenerated } from "./emitGenerated.js"
import { extractSchema } from "./extractSchema.js"
import { normalizeSchema } from "./normalizeSchema.js"

export const generate = (outDir = "src/pure/generated"): Effect.Effect<void, Error> =>
  extractSchema().pipe(
    Effect.map(normalizeSchema),
    Effect.flatMap((schema) => emitGenerated(schema, outDir)),
  )

export const generateFastCheckArbitraries = (
  outDir = "src/internal/generated",
  defaultSchemaPath?: string,
): Effect.Effect<void, Error> =>
  extractSchema(defaultSchemaPath).pipe(
    Effect.map(normalizeSchema),
    Effect.flatMap((schema) => emitFastCheckArbitraries(schema, outDir)),
  )
