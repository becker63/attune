import { Effect } from "effect"
import { Joern, cpg, prop } from "joern-effect"

const secretName = /.*(api[_-]?key|secret|token|password).*/iu

export const hardcodedSecrets = Effect.gen(function* () {
  const joern = yield* Joern

  const literals = yield* joern.query(
    cpg.literal
      .code(/.*(api[_-]?key|secret|token|password).*/iu)
      .select({
        code: prop.code,
        line: prop.lineNumber,
        file: prop.filename,
      }),
  )

  const identifiers = yield* joern.query(
    cpg.identifier
      .name(secretName)
      .select({
        name: prop.name,
        code: prop.code,
        line: prop.lineNumber,
        type: prop.typeFullName,
      }),
  )

  return { literals, identifiers }
})
