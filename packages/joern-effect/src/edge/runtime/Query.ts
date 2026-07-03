import type { Schema } from "effect"

export class Query<A> {
  constructor(
    readonly cpgql: string,
    readonly schema: Schema.Schema<A>,
    readonly debug?: unknown,
  ) {}
}
