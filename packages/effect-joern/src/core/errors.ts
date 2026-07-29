import { Data } from "effect";

import type { JoernQueryDiagnosticResponse } from "./transport.js";

/**
 * Retain a bounded prefix of diagnostic text.
 *
 * @param value - Complete diagnostic text.
 * @param max - Maximum number of characters to retain.
 * @returns The original text or its bounded prefix.
 */
const snippet = (value: string, max: number = 400): string =>
  value.length <= max ? value : `${value.slice(0, max)}...`;

/**
 * Bounded process output captured from a running Joern server.
 *
 * @remarks
 *   The tails preserve recent startup and import evidence without allowing an
 *   unbounded child-process stream to accumulate in memory.
 */
export interface JoernServerOutputTails {
  /** Maximum bytes retained independently for each stream. */
  readonly limitBytesPerStream: number;
  /** Most recent standard-output text. */
  readonly stdoutTail: string;
  /** Most recent standard-error text. */
  readonly stderrTail: string;
}

/**
 * Reports a failure while preparing or evaluating a Joern query.
 *
 * @remarks
 *   The optional query and cause preserve enough context for callers to explain
 *   a failed operation without exposing transport implementation details.
 */
export class JoernError extends Data.TaggedError("JoernError")<{
  readonly message: string;
  readonly query?: string;
  readonly cause?: unknown;
}> {}

/**
 * Reports a failed or invalid Joern HTTP exchange.
 *
 * @remarks
 *   The error records bounded response evidence and whether the response was
 *   complete so callers can distinguish a server rejection from truncation.
 */
export class JoernHttpError extends Data.TaggedError("JoernHttpError")<{
  readonly message: string;
  readonly status: number;
  readonly body: string;
  readonly query?: string;
  readonly diagnostic?: JoernQueryDiagnosticResponse;
  readonly responseComplete?: boolean;
  readonly responseLimitBytes?: number;
  readonly responseBytesObserved?: number;
}> {
  /**
   * Returns a bounded response-body excerpt for diagnostics.
   *
   * @remarks
   *   Bounding the excerpt keeps logs useful without repeating an arbitrarily
   *   large server response.
   * @returns At most the diagnostic snippet limit from the response body.
   */
  get bodySnippet(): string {
    return snippet(this.body);
  }
}

/**
 * Reports a query result that could not be decoded.
 *
 * @remarks
 *   The raw body and query remain attached so a caller can compare the received
 *   payload with the expected generated schema.
 */
export class JoernDecodeError extends Data.TaggedError("JoernDecodeError")<{
  readonly message: string;
  readonly query: string;
  readonly body: string;
  readonly cause?: unknown;
}> {}

/**
 * Reports that no configured Joern executable could be started.
 *
 * @remarks
 *   The attempted command list lets callers correct installation or command
 *   configuration before retrying.
 */
export class JoernExecutableNotFoundError extends Data.TaggedError(
  "JoernExecutableNotFoundError",
)<{
  readonly message: string;
  readonly attempted: readonly string[];
}> {}

/**
 * Reports that the Joern server process could not reach startup.
 *
 * @remarks
 *   Command details and bounded output identify whether spawning or early
 *   process termination prevented readiness.
 */
export class JoernServerStartError extends Data.TaggedError(
  "JoernServerStartError",
)<{
  readonly message: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly port: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly cause?: unknown;
}> {}

/**
 * Reports that Joern did not become ready within its configured deadline.
 *
 * @remarks
 *   The timeout and bounded process output let callers tune readiness policy or
 *   diagnose a stalled server.
 */
export class JoernServerTimeoutError extends Data.TaggedError(
  "JoernServerTimeoutError",
)<{
  readonly message: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly port: number;
  readonly timeoutMs: number;
  readonly stdout: string;
  readonly stderr: string;
}> {}

/**
 * Reports a repository import rejected by a ready Joern server.
 *
 * @remarks
 *   The repository, endpoint, cause, and optional server tails preserve the
 *   evidence needed to diagnose an import boundary failure.
 */
export class JoernImportError extends Data.TaggedError("JoernImportError")<{
  readonly message: string;
  readonly repoPath: string;
  readonly baseUrl: string;
  readonly serverOutput?: JoernServerOutputTails;
  readonly cause?: unknown;
}> {}
