import { Effect } from "effect";

export interface ResolverTarget {
  readonly value: string;
}

export interface ResolverService {
  defaulted(input: ResolverTarget): Effect.Effect<ResolverTarget>;

  readonly generic: <E>(
    input: ResolverTarget,
  ) => Effect.Effect<ResolverTarget, E>;
}
