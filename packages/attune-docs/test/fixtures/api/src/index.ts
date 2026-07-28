/**
 * A capability whose state records which lifecycle operations remain legal.
 *
 * @template State - Current lifecycle state carried by the capability.
 */
export interface Investigation<State extends string = "active"> {
  readonly id: string;
  readonly state: State;
}

/** An active capability that may execute another operation. */
export type ActiveInvestigation = Investigation<"active">;

const preservingEntry = {
  transition: "preserve",
} as const;

/** The closed fixture registry and its machine-authoritative transitions. */
export const ATTUNE_OPERATIONS = {
  example: {
    transition: "materialize",
  },
  spread: {
    ...preservingEntry,
  },
  finish: {
    transition: "finalize",
  },
} as const;

/**
 * Unrelated text that must never be mistaken for registry metadata.
 */
export const CommentOnlyMetadata = {
  note: `ATTUNE_OPERATIONS: { example: { transition: "preserve" } }`,
} as const;

/** A public failure that tells the caller to correct the fixture input. */
export class ExampleFailure extends Error {
  /** Explain the public recovery decision. */
  explain(): string {
    return this.message;
  }

  private internalDiagnostic(): string {
    return "private";
  }

  protected recoverInternally(): void {
    void this.internalDiagnostic();
  }

  #secretState(): string {
    return "secret";
  }

  /** Exercise the private fixture members without exposing them. */
  protected inspectInternals(): string {
    this.recoverInternally();
    return this.#secretState();
  }
}

/** A type whose name intentionally collides under naïve kebab-case slugs. */
export interface ArtifactReference {
  readonly uri: string;
}

/** A value whose name intentionally collides under naïve kebab-case slugs. */
export const artifactReference = {
  kind: "fixture",
} as const;
