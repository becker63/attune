import { Effect } from "effect"
import { Joern, cpg, prop } from "joern-effect"

export const callInventory = Effect.gen(function* () {
  const joern = yield* Joern

  const calls = yield* joern.query(
    cpg.call
      .dedup.take(100)
      .select({
        name: prop.name,
        method: prop.methodFullName,
        dispatch: prop.dispatchType,
        code: prop.code,
        line: prop.lineNumber,
        file: prop.filename,
      }),
  )

  return calls
})
