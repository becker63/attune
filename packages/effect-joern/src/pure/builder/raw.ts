import type { Schema } from "effect";

import { Query } from "../../core/Query.js";

/**
 * Creates a typed query from caller-authored CPGQL.
 *
 * @remarks
 *   This is the explicit escape hatch from the traversal builder. The supplied
 *   decoder still validates the transport result before it reaches the caller.
 * @typeParam A - Value accepted by the result decoder.
 * @param cpgql - Exact query text sent to Joern.
 * @param schema - Decoder for the query response.
 * @returns A query retaining its raw-builder provenance.
 */
export const raw = <A>(cpgql: string, schema: Schema.Decoder<A>): Query<A> =>
  new Query(cpgql, schema, { raw: true });
