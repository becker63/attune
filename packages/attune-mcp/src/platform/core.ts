import { createHash, randomBytes } from "node:crypto";
import {
  access,
  constants,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
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

export type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | { readonly [key: string]: Json };

/**
 * Encodes a runtime value as deterministic JSON, rejecting non-JSON values.
 *
 * @remarks
 * The validation is intentionally runtime-based so ordinary typed records do
 * not need an unsafe index-signature cast merely to cross the receipt boundary.
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
  const entries = Object.entries(value).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  return `{${entries
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
};

export const sha256 = (bytes: string | Uint8Array): Sha256Digest =>
  createHash("sha256").update(bytes).digest("hex") as Sha256Digest;

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const crockford = (value: bigint, length: number): string => {
  let remaining = value;
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result = CROCKFORD[Number(remaining & 31n)]! + result;
    remaining >>= 5n;
  }
  return result;
};

export const allocateInvestigationId = (): InvestigationId => {
  let random = 0n;
  for (const byte of randomBytes(10)) random = (random << 8n) | BigInt(byte);
  return `${crockford(BigInt(Date.now()), 10)}${crockford(
    random,
    16,
  )}` as InvestigationId;
};

export const fail = (
  code: FailureCode,
  message: string,
  details: {
    readonly expected?: string;
    readonly observed?: string;
    readonly path?: string;
  } = {},
): AttuneToolFailure => new AttuneToolFailure({ code, message, ...details });

export const isNodeError = (
  cause: unknown,
  code: string,
): cause is NodeJS.ErrnoException =>
  cause instanceof Error && "code" in cause && cause.code === code;

export const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (cause) {
    if (isNodeError(cause, "ENOENT")) return false;
    throw cause;
  }
};

export const writeNew = async (
  path: string,
  bytes: string | Uint8Array,
): Promise<void> => {
  await mkdir(Path.dirname(path), { recursive: true, mode: 0o700 });
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
};

export const writeAtomic = async (
  path: string,
  bytes: string | Uint8Array,
): Promise<void> => {
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

export const readJson = async <A>(path: string): Promise<A> =>
  JSON.parse(await readFile(path, "utf8")) as A;

export const contained = (root: string, relative: string): string => {
  const target = Path.resolve(root, relative);
  if (target === root || !target.startsWith(`${root}${Path.sep}`)) {
    throw fail("InvalidPath", "path escapes its allowed root", {
      path: relative,
    });
  }
  return target;
};

export const containedRegularFile = async (
  root: string,
  relative: string,
): Promise<string> => {
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

const mediaType = (path: string): string => {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (/\.(?:txt|log|diff|patch|maude|ts|ya?ml)$/u.test(path)) {
    return "text/plain; charset=utf-8";
  }
  return "application/octet-stream";
};

export const artifactReference = async (
  investigationId: InvestigationId,
  tool: ToolName,
  invocationId: InvocationId,
  root: string,
  relative: string,
  complete = true,
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

export interface RuntimeConfig {
  readonly home: string;
  readonly agentFs: string;
  readonly fusermount: string;
  readonly git: string;
  readonly node: string;
  readonly joern: string;
  readonly maude: string;
  readonly astGrep: string;
  readonly flock: string;
  readonly lockHolder: string;
  readonly propertyRunner: string;
  readonly contractBundle: string;
  readonly contractDigest: string;
  readonly toolchainDigest: Sha256Digest;
  readonly outputLimitBytes: number;
  readonly inlineLimitBytes: number;
}

const configured = (
  environment: NodeJS.ProcessEnv,
  key: string,
  fallback: string,
) => environment[key]?.trim() || fallback;

export const loadRuntimeConfig = (
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeConfig => {
  const home = Path.resolve(
    configured(environment, "ATTUNE_HOME", ".attune-runtime"),
  );
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
    toolchainDigest:
      digest === undefined
        ? sha256(canonicalJson(source))
        : (digest as Sha256Digest),
    outputLimitBytes: Number(
      environment.ATTUNE_OUTPUT_LIMIT_BYTES ?? 16_777_216,
    ),
    inlineLimitBytes: Number(environment.ATTUNE_INLINE_LIMIT_BYTES ?? 65_536),
  };
};

const READER_PERMITS = 1_000_000;
export interface ActivityGate {
  readonly shared: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;
  readonly exclusive: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;
}

export const makeActivityGates = () => {
  const gates = new Map<InvestigationId, ActivityGate>();
  return (id: InvestigationId): ActivityGate => {
    const existing = gates.get(id);
    if (existing !== undefined) return existing;
    const semaphore = Semaphore.makeUnsafe(READER_PERMITS);
    const gate = {
      shared: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        semaphore.withPermits(1)(effect),
      exclusive: <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        semaphore.withPermits(READER_PERMITS)(effect),
    };
    gates.set(id, gate);
    return gate;
  };
};

export const ensureRuntimeDirectories = async (
  config: RuntimeConfig,
): Promise<void> => {
  for (const directory of [
    "bases",
    "capsules",
    "bindings",
    "mounts",
    "locks",
    "bootstrap",
    "scratch",
  ]) {
    await mkdir(Path.join(config.home, directory), {
      mode: 0o700,
      recursive: true,
    });
  }
};

export const writeText = writeFile;
