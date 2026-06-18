import { Effect } from "effect"
import { Joern, cpg, prop } from "joern-effect"

export const generatedDslInventory = Effect.gen(function* () {
  const joern = yield* Joern

  const typeMembers = yield* joern.query(
    cpg.typeDecl
      .fullName(/com\.example\..*/u)
      .member.name(/password|secret|token/iu)
      .dedup.select({
        type: prop.astParentFullName,
        member: prop.name,
        code: prop.code,
        line: prop.lineNumber,
      }),
  )

  const reachingDefinitions = yield* joern.query(
    cpg.call
      .name(/exec|spawn|eval/u)
      .argument.reachingDef
      .select({
        symbol: prop.name,
        code: prop.code,
        type: prop.typeFullName,
        line: prop.lineNumber,
      }),
  )

  return { typeMembers, reachingDefinitions }
})
