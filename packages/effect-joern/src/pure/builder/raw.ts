import type { Schema } from "effect";

import { Query } from "../../core/Query.js";

export const raw = <A>(cpgql: string, schema: Schema.Decoder<A>): Query<A> =>
  new Query(cpgql, schema, { raw: true });
