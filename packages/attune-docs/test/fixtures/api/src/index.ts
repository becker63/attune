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

/**
 * A fixture operation with descriptor-owned lifecycle metadata.
 */
export const ExampleOperation = {
  name: "example",
  lifecycle: {
    requires: "active",
    produces: "active",
    transition: "preserve",
  },
} as const;

const sharedLifecycle = {
  requires: "active",
  produces: "active",
  transition: "preserve",
} as const;

const spreadDescriptor = {
  lifecycle: sharedLifecycle,
  writer: "exclusive",
} as const;

/** A descriptor assembled from typed constants and an object spread. */
export const SpreadOperation = {
  ...spreadDescriptor,
  name: "spread",
} as const;

/**
 * A non-descriptor whose text must never be mistaken for lifecycle metadata.
 */
export const CommentOnlyOperation = {
  name: "comment-only",
  note: `lifecycle: { requires: "active" }`,
  // lifecycle: { produces: "active", transition: "preserve" }
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
