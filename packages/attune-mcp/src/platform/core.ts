import { createHash, randomBytes } from "node:crypto";
import { access, constants, mkdir, open, readFile, realpath, rename, stat, unlink } from "node:fs/promises";
import * as Path from "node:path";

import { Effect, Semaphore } from "effect";

import {
  type ArtifactReference,
  type ArtifactUri,
  AttuneToolFailure,
  type FailureCode,
  type InvestigationId,
  type InvocationId,
  type Sha256Digest,
  type ToolName,
} from "../contract/schemas.js";

/**
 * Represents a recursively serializable JSON value. @remarks Receipt and contract boundaries use this closed
 * union instead of accepting arbitrary runtime objects.
 */
export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };

/**
 * Encodes a runtime value as deterministic JSON. @remarks Runtime validation rejects non-JSON values without
 * unsafe record casts. @param value - Candidate JSON value. @returns Its canonical encoding.
 */
export const canonicalJson = (value: unknown): string => {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite JSON number");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value !== "object") throw new TypeError("non-JSON value");
  const entries = Object.entries(value).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
};

/**
 * Computes the canonical content digest. @remarks Digests bind receipts and configuration to exact bytes.
 *
 * @param bytes - Bytes to hash. @returns A lowercase SHA-256 digest.
 */
export const sha256 = (bytes: string | Uint8Array): Sha256Digest =>
  createHash("sha256").update(bytes).digest("hex") as Sha256Digest;

/** Crockford Base32 alphabet used by investigation identifiers. */ const CROCKFORD =
  "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
/**
 * Encodes a fixed-width Crockford Base32 value. @param value - Integer to encode. @param length - Required
 * character width. @returns The padded encoding.
 */
const crockford = (value: bigint, length: number): string => {
  let remaining = value;
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result = CROCKFORD[Number(remaining & 31n)]! + result;
    remaining >>= 5n;
  }
  return result;
};

/**
 * Allocates a sortable investigation identifier. @remarks The timestamp prefix orders creation while random
 * suffix bytes prevent collisions. @returns A new investigation identifier.
 */
export const allocateInvestigationId = (): InvestigationId => {
  let random = 0n;
  for (const byte of randomBytes(10)) random = (random << 8n) | BigInt(byte);
  return `${crockford(BigInt(Date.now()), 10)}${crockford(random, 16)}` as InvestigationId;
};

/**
 * Constructs a stable tool-boundary failure. @remarks Callers receive one public failure shape across native
 * and repository operations. @param code - Stable failure classification. @param message - Caller-readable
 * explanation.
 *
 * @param details - Optional expected, observed, or path evidence. @returns The public failure value.
 */
export const fail = (
  code: FailureCode,
  message: string,
  details: {
    readonly expected?: string;
    readonly observed?: string;
    readonly path?: string;
  } = {},
): AttuneToolFailure => new AttuneToolFailure({ code, message, ...details });

/**
 * Narrows an unknown cause to one Node error code. @remarks Boundary code uses this guard before interpreting
 * platform failures. @param cause - Unknown failure value. @param code - Expected Node error code. @returns
 * Whether the cause carries that code.
 */
export const isNodeError = (cause: unknown, code: string): cause is NodeJS.ErrnoException =>
  cause instanceof Error && "code" in cause && cause.code === code;

/**
 * Tests whether a filesystem path exists. @remarks Only absence is converted to false; other access failures
 * remain observable. @param path - Filesystem path to inspect. @returns Whether the path is accessible.
 */
export const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (cause) {
    if (isNodeError(cause, "ENOENT")) return false;
    throw cause;
  }
};

/**
 * Writes a new private file without replacing existing evidence. @remarks Exclusive creation prevents
 * accidental receipt or manifest overwrite. @param path - Destination path. @param bytes - Exact bytes to
 * persist. @returns A promise completed after the file is synced.
 */
export const writeNew = async (path: string, bytes: string | Uint8Array): Promise<void> => {
  await mkdir(Path.dirname(path), { recursive: true, mode: 0o700 });
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
};

/**
 * Atomically replaces one private file. @remarks Bytes are synced through a sibling temporary file before
 * rename. @param path - Destination path. @param bytes - Exact replacement bytes. @returns A promise
 * completed after rename.
 */
export const writeAtomic = async (path: string, bytes: string | Uint8Array): Promise<void> => {
  await mkdir(Path.dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomBytes(6).toString("hex")}`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, path);
  } catch (cause) {
    await unlink(temporary).catch(() => undefined);
    throw cause;
  }
};

/**
 * Reads one trusted JSON document. @remarks The caller owns validation of the selected result type.
 *
 * @typeParam A - Expected decoded value. @param path - JSON file to read. @returns The decoded document.
 */
export const readJson = async <A>(path: string): Promise<A> => JSON.parse(await readFile(path, "utf8")) as A;

/**
 * Resolves a relative path strictly beneath a root. @remarks Equality with or escape from the root is
 * rejected before filesystem access. @param root - Canonical containment root. @param relative - Relative
 * candidate path.
 *
 * @returns The contained absolute path.
 */
export const contained = (root: string, relative: string): string => {
  const target = Path.resolve(root, relative);
  if (target === root || !target.startsWith(`${root}${Path.sep}`)) {
    throw fail("InvalidPath", "path escapes its allowed root", {
      path: relative,
    });
  }
  return target;
};

/**
 * Resolves a real regular file strictly beneath a root. @remarks Realpath checks prevent symlink escape
 * before artifact bytes are trusted. @param root - Canonical containment root. @param relative - Relative
 * candidate path.
 *
 * @returns The canonical regular-file path.
 */
export const containedRegularFile = async (root: string, relative: string): Promise<string> => {
  const canonicalRoot = await realpath(root);
  const target = contained(canonicalRoot, relative);
  const canonicalTarget = await realpath(target);
  if (!canonicalTarget.startsWith(`${canonicalRoot}${Path.sep}`)) {
    throw fail("InvalidPath", "artifact resolves outside its investigation", {
      path: relative,
    });
  }
  const metadata = await stat(canonicalTarget);
  if (!metadata.isFile()) {
    throw fail("InvalidPath", "artifact is not a regular file", {
      path: relative,
    });
  }
  return canonicalTarget;
};

/**
 * Selects a stable media type from an artifact path. @param path - Artifact path. @returns The declared
 * content type.
 */
const mediaType = (path: string): string => {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (/\.(?:txt|log|diff|patch|maude|ts|ya?ml)$/u.test(path)) {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
};

/**
 * Creates content-addressed evidence for one retained artifact. @remarks The reference binds URI, media type,
 * digest, size, and completeness to exact bytes. @param investigationId - Owning investigation. @param tool -
 * Producing tool. @param invocationId - Producing invocation. @param root - Artifact containment root. @param
 * relative - Relative artifact path. @param complete - Whether retention captured all bytes. @returns The
 * durable artifact reference.
 */
export const artifactReference = async (
  investigationId: InvestigationId,
  tool: ToolName,
  invocationId: InvocationId,
  root: string,
  relative: string,
  complete: boolean = true,
): Promise<ArtifactReference> => {
  const path = await containedRegularFile(root, relative);
  const bytes = await readFile(path);
  return {
    uri: `attune://investigations/${investigationId}/artifacts/${tool}/${invocationId}/${relative}` as ArtifactUri,
    mediaType: mediaType(relative),
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
    complete,
  };
};

/**
 * Captures every executable, path, and bound used by the runtime. @remarks One explicit value makes toolchain
 * identity and filesystem authority auditable.
 */
export interface RuntimeConfig {
  /** Private runtime root. */ readonly home: string;
  /** AgentFS executable. */ readonly agentFs: string;
  /** FUSE unmount executable. */ readonly fusermount: string;
  /** Git executable. */ readonly git: string;
  /** Node.js executable. */ readonly node: string;
  /** Joern executable. */ readonly joern: string;
  /** Maude executable. */ readonly maude: string;
  /** Ast-grep executable. */ readonly astGrep: string;
  /** OS lock executable. */ readonly flock: string;
  /** Lock-holder script. */ readonly lockHolder: string;
  /** Property-runner script. */ readonly propertyRunner: string;
  /** Contract bundle path. */ readonly contractBundle: string;
  /** Contract digest path. */ readonly contractDigest: string;
  /** Digest of executable selection. */ readonly toolchainDigest: Sha256Digest;
  /** Maximum retained native output bytes. */ readonly outputLimitBytes: number;
  /** Maximum result bytes returned inline. */ readonly inlineLimitBytes: number;
}

/**
 * Resolves one trimmed environment value or its fallback. @param environment - Process environment. @param
 * key - Variable name. @param fallback - Default value. @returns The selected configuration text.
 */
const configured = (environment: NodeJS.ProcessEnv, key: string, fallback: string): string =>
  environment[key]?.trim() || fallback;

/**
 * Loads validated runtime configuration from an environment. @remarks Defaults remain deterministic and the
 * selected executable set contributes to the toolchain digest. @param environment - Environment values to
 * read. @returns The complete runtime configuration.
 */
export const loadRuntimeConfig = (environment: NodeJS.ProcessEnv = process.env): RuntimeConfig => {
  const home = Path.resolve(configured(environment, "ATTUNE_HOME", ".attune-runtime"));
  const source = {
    agentFs: configured(environment, "ATTUNE_AGENTFS_BIN", "agentfs"),
    astGrep: configured(environment, "ATTUNE_AST_GREP_BIN", "ast-grep"),
    flock: configured(environment, "ATTUNE_FLOCK_BIN", "flock"),
    fusermount: configured(environment, "ATTUNE_FUSERMOUNT3", "fusermount3"),
    git: configured(environment, "ATTUNE_GIT_BIN", "git"),
    joern: configured(environment, "ATTUNE_JOERN_BIN", "joern"),
    maude: configured(environment, "ATTUNE_MAUDE_BIN", "maude"),
    node: configured(environment, "ATTUNE_NODE_BIN", process.execPath),
  };
  const digest = environment.ATTUNE_TOOLCHAIN_DIGEST;
  return {
    home,
    ...source,
    lockHolder: configured(
      environment,
      "ATTUNE_LOCK_HOLDER",
      new URL("./lock-holder.mjs", import.meta.url).pathname,
    ),
    propertyRunner: configured(
      environment,
      "ATTUNE_PROPERTY_RUNNER",
      new URL("./property-runner.mjs", import.meta.url).pathname,
    ),
    contractBundle: configured(
      environment,
      "ATTUNE_CONTRACT_BUNDLE",
      Path.resolve("contracts/attune-tools.schema.json"),
    ),
    contractDigest: configured(
      environment,
      "ATTUNE_CONTRACT_DIGEST",
      Path.resolve("contracts/attune-tools.sha256"),
    ),
    toolchainDigest: digest === undefined ? sha256(canonicalJson(source)) : (digest as Sha256Digest),
    outputLimitBytes: Number(environment.ATTUNE_OUTPUT_LIMIT_BYTES ?? 16_777_216),
    inlineLimitBytes: Number(environment.ATTUNE_INLINE_LIMIT_BYTES ?? 65_536),
  };
};

/** Permit count reserving exclusive access against all shared work. */ const READER_PERMITS = 1_000_000;
/**
 * Serializes exclusive work while allowing bounded shared work per investigation. @remarks Gates preserve
 * investigation-local concurrency without coupling unrelated investigations.
 */
export interface ActivityGate {
  /**
   * Runs shared work. @remarks One permit allows concurrent readers. @typeParam A - Success value. @typeParam
   * E - Failure value. @typeParam R - Effect requirements. @param effect - Work to guard. @returns The
   * guarded effect.
   *
   * @failure {@link E} - Handle the guarded effect's original failure without changing its type.
   */
  readonly shared: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  /**
   * Runs exclusive work. @remarks All permits exclude readers and writers.
   *
   * @typeParam A - Success value. @typeParam E - Failure value. @typeParam R - Effect requirements. @param
   *   effect - Work to guard. @returns The guarded effect.
   * @failure {@link E} - Handle the guarded effect's original failure without changing its type.
   */
  readonly exclusive: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
}

/**
 * Creates investigation-scoped activity gates. @remarks Gate identity is stable for the lifetime of the
 * returned lookup. @returns A lookup that acquires the gate for one investigation.
 */
export const makeActivityGates = (): ((id: InvestigationId) => ActivityGate) => {
  const gates = new Map<InvestigationId, ActivityGate>();
  return (id: InvestigationId): ActivityGate => {
    const existing = gates.get(id);
    if (existing !== undefined) return existing;
    const semaphore = Semaphore.makeUnsafe(READER_PERMITS);
    const gate = {
      shared: <A, E, R>(effect: Effect.Effect<A, E, R>) => semaphore.withPermits(1)(effect),
      exclusive: <A, E, R>(effect: Effect.Effect<A, E, R>) => semaphore.withPermits(READER_PERMITS)(effect),
    };
    gates.set(id, gate);
    return gate;
  };
};

/**
 * Creates every private runtime directory. @remarks Uniform restrictive permissions establish the filesystem
 * boundary before work starts. @param config - Runtime root configuration. @returns A promise completed when
 * all directories exist.
 */
export const ensureRuntimeDirectories = async (config: RuntimeConfig): Promise<void> => {
  for (const directory of ["bases", "capsules", "bindings", "mounts", "locks", "bootstrap", "scratch"]) {
    await mkdir(Path.join(config.home, directory), {
      mode: 0o700,
      recursive: true,
    });
  }
};
