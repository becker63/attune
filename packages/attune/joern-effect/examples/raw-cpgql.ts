import { Effect, Schema } from "effect"
import { Joern, raw } from "joern-effect"

const topLevelMethods = raw(
  `cpg.method
    .filter(_.isExternal == false)
    .map(m => Map(
      "name" -> m.name,
      "fullName" -> m.fullName,
      "line" -> m.lineNumber
    ))
    .toJson`,
  Schema.Array(
    Schema.Struct({
      name: Schema.String,
      fullName: Schema.String,
      line: Schema.NullOr(Schema.Number),
    }),
  ),
)

const program = Effect.gen(function* () {
  const joern = yield* Joern
  return yield* joern.query(topLevelMethods)
})

Effect.runPromise(
  program.pipe(
    Effect.provide(Joern.layer({ repoPath: process.argv[2] ?? "." })),
  ),
).then((methods) => {
  console.table(methods)
})
