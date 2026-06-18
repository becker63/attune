import { Effect } from "effect"
import { Joern, cpg, prop } from "joern-effect"

export const dangerousCalls = Effect.gen(function* () {
  const joern = yield* Joern

  const findings = yield* joern.query(
    cpg.method
      .name("handleRequest")
      .call.name(/exec|spawn|eval/u)
      .select({
        method: prop.methodFullName,
        code: prop.code,
        line: prop.lineNumber,
        file: prop.filename,
      }),
  )

  // findings is inferred from the selected properties.
  return findings
})
