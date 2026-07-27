import { expectTypeOf } from "expect-type";
import { Query, cpg, prop } from "joern-effect";

const query = cpg.call.select({
  code: prop.code,
  hints: prop.dynamicTypeHintFullName,
  line: prop.lineNumber,
  method: prop.methodFullName,
});

type Result = typeof query extends Query<infer A> ? A : never;

expectTypeOf<Result>().toEqualTypeOf<
  ReadonlyArray<{
    readonly method: string;
    readonly code: string;
    readonly line: number | null;
    readonly hints: ReadonlyArray<string>;
  }>
>();

const generatedTraversalQuery = cpg.typeDecl
  .fullName(/com\.example\..*/u)
  .rawStep("member")
  .name("password")
  .prop(prop.lineNumber, 42)
  .select({ file: prop.filename });

type GeneratedTraversalResult =
  typeof generatedTraversalQuery extends Query<infer A> ? A : never;

expectTypeOf<GeneratedTraversalResult>().toEqualTypeOf<
  ReadonlyArray<{
    readonly file: string;
  }>
>();

// Optional result properties still require a concrete scalar when filtering.
// @ts-expect-error null is not a valid Joern property-filter argument
cpg.call.prop(prop.lineNumber, null);

// Multi-valued properties are selectable but are not valid scalar filters.
// @ts-expect-error list-valued properties cannot be used as filters
cpg.metaData.prop(prop.overlays, ["base"]);
