import type { Schema } from "effect"
import { Query } from "../../edge/runtime/Query.js"

export const raw = <A>(cpgql: string, schema: Schema.Schema<A>): Query<A> =>
  new Query(cpgql, schema, { raw: true })
