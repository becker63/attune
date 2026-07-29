import type { Schema } from "effect";

/**
 * A CPGQL program paired with the decoder for its expected result.
 *
 * @remarks
 *   The query text crosses the Joern transport boundary, while `schema` keeps
 *   decoding at the caller-selected result type.
 * @typeParam A - Value accepted after decoding the Joern response.
 */
export class Query<A> {
  /**
   * Creates one typed query.
   *
   * @remarks
   *   The optional debug value never affects execution; it only preserves the
   *   builder representation that produced the exact CPGQL.
   * @param cpgql - Exact CPGQL sent to Joern.
   * @param schema - Decoder that validates the returned JSON value.
   * @param debug - Optional source representation retained for diagnostics.
   */
  constructor(
    readonly cpgql: string,
    readonly schema: Schema.Decoder<A>,
    readonly debug?: unknown,
  ) {}
}
