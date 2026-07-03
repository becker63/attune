import { expectTypeOf } from "expect-type"
import { Query, cpg, prop } from "joern-effect"

const query = cpg.call.select({
  code: prop.code,
  hints: prop.dynamicTypeHintFullName,
  line: prop.lineNumber,
  method: prop.methodFullName,
})

type Result = typeof query extends Query<infer A> ? A : never

expectTypeOf<Result>().toEqualTypeOf<
  ReadonlyArray<{
    readonly method: string
    readonly code: string
    readonly line: number | null
    readonly hints: ReadonlyArray<string>
  }>
>()

const generatedTraversalQuery = cpg.typeDecl
  .fullName(/com\.example\..*/u)
  .member.name("password")
  .lineNumber(42)
  .select({ file: prop.filename })

type GeneratedTraversalResult =
  typeof generatedTraversalQuery extends Query<infer A> ? A : never

expectTypeOf<GeneratedTraversalResult>().toEqualTypeOf<
  ReadonlyArray<{
    readonly file: string
  }>
>()
