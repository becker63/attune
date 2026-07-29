import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type FullGitCommit,
  type InvestigationId,
  type InvocationId,
  type ToolName,
} from "../src/contract/schemas.js";
import type { InvestigationManifest } from "../src/investigation/workspace.js";
import { canonicalJson, sha256, type RuntimeConfig } from "../src/platform/core.js";

export const FIXTURE_INVESTIGATION_ID = "01K00000000000000000000000" as InvestigationId;
export const FIXTURE_SNAPSHOT = "a".repeat(40) as FullGitCommit;
export const FIXTURE_NEXT_SNAPSHOT = "b".repeat(40) as FullGitCommit;
export const FIXTURE_TIMESTAMP = new Date(0).toISOString();

const fixturePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export const fixtureRuntimeConfig = (
  home: string,
  overrides: Partial<Omit<RuntimeConfig, "home">> = {},
): RuntimeConfig => ({
  home,
  agentFs: "agentfs",
  fusermount: "fusermount3",
  git: "git",
  node: process.execPath,
  joern: "joern",
  maude: "maude",
  astGrep: "ast-grep",
  flock: "flock",
  lockHolder: fixturePath("../dist/lock-holder.mjs"),
  propertyRunner: fixturePath("../dist/property-runner.mjs"),
  contractBundle: fixturePath("../../../contracts/attune-tools.schema.json"),
  contractDigest: fixturePath("../../../contracts/attune-tools.sha256"),
  toolchainDigest: sha256("test-toolchain"),
  outputLimitBytes: 1024,
  inlineLimitBytes: 256,
  ...overrides,
});

export const fixtureManifest = (overrides: Partial<InvestigationManifest> = {}): InvestigationManifest => ({
  schemaVersion: 1,
  investigationId: FIXTURE_INVESTIGATION_ID,
  normalizedRemote: "/fixture",
  requestedRevision: "main",
  resolvedCommit: FIXTURE_SNAPSHOT,
  baseKey: sha256("base"),
  branch: `attune/${FIXTURE_INVESTIGATION_ID}`,
  toolchainDigest: sha256("test-toolchain"),
  createdAt: FIXTURE_TIMESTAMP,
  ...overrides,
});

export const fixtureReceiptBase = (
  input: { readonly invocationId: InvocationId },
  tool: ToolName,
  operation: string,
  options: {
    readonly investigationId?: InvestigationId;
    readonly toolchainDigest?: ReturnType<typeof sha256>;
  } = {},
) => ({
  schemaVersion: 1 as const,
  invocationId: input.invocationId,
  investigationId: options.investigationId ?? FIXTURE_INVESTIGATION_ID,
  tool,
  operation,
  inputDigest: sha256(`${canonicalJson(input)}\n`),
  toolchainDigest: options.toolchainDigest ?? sha256("test-toolchain"),
  artifacts: [],
  startedAt: FIXTURE_TIMESTAMP,
  completedAt: FIXTURE_TIMESTAMP,
});

export const readJson = async <A = unknown>(path: string): Promise<A> =>
  JSON.parse(await readFile(path, "utf8")) as A;

export const writeCanonicalJson = async (path: string, value: unknown): Promise<void> =>
  await writeFile(path, `${canonicalJson(value)}\n`);

export const withTemporaryDirectory = async <A>(
  prefix: string,
  use: (root: string) => Promise<A>,
): Promise<A> => {
  const root = await mkdtemp(Path.join(tmpdir(), prefix));
  try {
    return await use(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};
