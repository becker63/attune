import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  mkdtempDisposable,
  readFile,
  realpath,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import * as Path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import type {
  FullGitCommit,
  InvestigationId,
  Sha256Digest,
} from "../contract/schemas.js";
import {
  allocateInvestigationId,
  canonicalJson,
  contained,
  ensureRuntimeDirectories,
  fail,
  fileExists,
  isNodeError,
  readJson,
  sha256,
  type RuntimeConfig,
  writeAtomic,
  writeNew,
} from "../platform/core.js";
import { withOsLock } from "../platform/lock.js";

const isAborted = (signal: AbortSignal | undefined): boolean =>
  signal?.aborted === true;

const terminator = (child: ReturnType<typeof spawn>) => {
  let force: NodeJS.Timeout | undefined;
  const terminate = () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill("SIGTERM");
    force ??= setTimeout(() => child.kill("SIGKILL"), 2_000);
    force.unref();
  };
  return {
    terminate,
    clear: () => {
      if (force !== undefined) clearTimeout(force);
    },
  };
};

const aborts = (signal: AbortSignal | undefined, cancel: () => void) => {
  signal?.addEventListener("abort", cancel, { once: true });
  if (isAborted(signal)) cancel();
  return () => signal?.removeEventListener("abort", cancel);
};

const command = async (
  executable: string,
  args: readonly string[],
  cwd: string,
  signal?: AbortSignal,
) => {
  if (isAborted(signal))
    throw fail("Cancelled", "command cancelled before spawn");
  const child = spawn(executable, [...args], {
    cwd,
    env: {
      ...process.env,
      GIT_OPTIONAL_LOCKS: "0",
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let limited = false;
  const termination = terminator(child);
  const append = (current: Buffer, value: Buffer | string) => {
    const next = Buffer.concat([
      current,
      Buffer.isBuffer(value) ? value : Buffer.from(value),
    ]);
    if (next.byteLength > 16 * 1024 * 1024) {
      limited = true;
      termination.terminate();
      return next.subarray(0, 16 * 1024 * 1024);
    }
    return next;
  };
  child.stdout.on("data", (chunk: Buffer) => (stdout = append(stdout, chunk)));
  child.stderr.on("data", (chunk: Buffer) => (stderr = append(stderr, chunk)));
  const stopListening = aborts(signal, termination.terminate);
  try {
    const code = await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (exitCode) => resolve(exitCode ?? 128));
    });
    if (isAborted(signal)) throw fail("Cancelled", "command cancelled");
    if (limited)
      throw fail("ResourceLimited", "command output exceeded 16 MiB");
    return {
      code,
      stdout: stdout.toString("utf8"),
      stderr: stderr.toString("utf8"),
    };
  } finally {
    stopListening();
    termination.clear();
  }
};

const git = async (
  config: RuntimeConfig,
  cwd: string,
  args: readonly string[],
  signal?: AbortSignal,
  raw = false,
) => {
  const result = await command(config.git, args, cwd, signal);
  if (result.code !== 0)
    throw fail(
      "GitFailure",
      `git ${args[0] ?? "command"} failed: ${
        result.stderr.trim() || result.stdout.trim()
      }`,
    );
  return raw ? result.stdout : result.stdout.trim();
};

export const normalizeRemote = async (remote: string) => {
  if (remote.includes("\0") || remote.trim() !== remote || remote.length === 0)
    throw fail("InvalidPath", "repository remote is not canonical");
  if (Path.isAbsolute(remote) || remote.startsWith("."))
    return await realpath(Path.resolve(remote));
  const url = new URL(remote);
  if (!["https:", "ssh:", "file:"].includes(url.protocol))
    throw fail("InvalidPath", `unsupported Git URL scheme ${url.protocol}`);
  if (url.username !== "" || url.password !== "" || url.search || url.hash)
    throw fail(
      "InvalidPath",
      "Git URL credentials, queries, and fragments are forbidden",
    );
  if (url.protocol === "file:") return await realpath(url.pathname);
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/(?:\.git)?\/+$/u, "");
  return url.toString();
};

export interface InvestigationManifest {
  readonly schemaVersion: 1;
  readonly investigationId: InvestigationId;
  readonly normalizedRemote: string;
  readonly requestedRevision: string;
  readonly resolvedCommit: FullGitCommit;
  readonly baseKey: Sha256Digest;
  readonly branch: string;
  readonly toolchainDigest: Sha256Digest;
  readonly createdAt: string;
  readonly finalizedAt?: string;
  readonly finalSnapshot?: FullGitCommit;
}

type Binding = Pick<
  InvestigationManifest,
  "schemaVersion" | "investigationId" | "baseKey"
>;

export interface MountedWorkspace {
  readonly mountPath: string;
  readonly repositoryPath: string;
  readonly artifactsPath: string;
  readonly manifest: InvestigationManifest;
}

const decodeMountField = (value: string): string =>
  value.replace(/\\([0-7]{3})/gu, (_, octal: string) =>
    String.fromCharCode(Number.parseInt(octal, 8)),
  );

const mountedSource = async (mountPath: string) => {
  const text = await readFile("/proc/self/mountinfo", "utf8");
  for (const line of text.split("\n")) {
    const [before, after] = line.split(" - ");
    if (before === undefined || after === undefined) continue;
    const left = before.split(" ");
    const right = after.split(" ");
    if (decodeMountField(left[4] ?? "") === mountPath)
      return decodeMountField(right[1] ?? "");
  }
  return undefined;
};

const wait = async (milliseconds: number, signal?: AbortSignal) => {
  if (isAborted(signal))
    throw fail("Cancelled", "mount wait cancelled before sleeping");
  try {
    await delay(milliseconds, undefined, { signal });
  } catch (cause) {
    if (isAborted(signal)) throw fail("Cancelled", "mount wait cancelled");
    throw cause;
  }
};

const jsonLine = (value: unknown) => `${canonicalJson(value)}\n`;
const materialized = (manifest: InvestigationManifest) => ({
  investigationId: manifest.investigationId,
  requestedRevision: manifest.requestedRevision,
  resolvedCommit: manifest.resolvedCommit,
  branch: manifest.branch,
  manifest,
});

export class WorkspaceStore {
  constructor(readonly config: RuntimeConfig) {}

  private basePath = (key: Sha256Digest) =>
    Path.join(this.config.home, "bases", key);
  private capsulePath = (id: InvestigationId) =>
    Path.join(this.config.home, "capsules", `${id}.db`);
  private bindingPath = (id: InvestigationId) =>
    Path.join(this.config.home, "bindings", `${id}.json`);

  private git(
    cwd: string,
    args: readonly string[],
    signal?: AbortSignal,
    raw = false,
  ) {
    return git(this.config, cwd, args, signal, raw);
  }

  async initialize() {
    await ensureRuntimeDirectories(this.config);
  }

  private async resolveCommit(
    clone: string,
    revision: string,
    signal?: AbortSignal,
  ) {
    for (const candidate of [
      `${revision}^{commit}`,
      `origin/${revision}^{commit}`,
    ]) {
      const result = await command(
        this.config.git,
        ["rev-parse", "--verify", candidate],
        clone,
        signal,
      );
      const value = result.stdout.trim();
      if (result.code === 0 && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value)) {
        return value as FullGitCommit;
      }
    }
    throw fail(
      "GitFailure",
      `revision does not resolve to a commit: ${revision}`,
    );
  }

  private async validateBase(
    baseKey: Sha256Digest,
    expectedCommit?: FullGitCommit,
  ) {
    const base = this.basePath(baseKey);
    const metadata = await readJson<{
      readonly baseKey: Sha256Digest;
      readonly resolvedCommit: FullGitCommit;
    }>(Path.join(base, "base-manifest.json"));
    if (
      metadata.baseKey !== baseKey ||
      (expectedCommit !== undefined &&
        metadata.resolvedCommit !== expectedCommit)
    )
      throw fail(
        "IdentityConflict",
        "immutable base manifest does not match binding",
      );
    const repository = Path.join(base, "repo");
    const [head, dirty] = await Promise.all([
      this.git(repository, ["rev-parse", "HEAD"]),
      this.git(repository, ["status", "--porcelain", "--untracked-files=all"]),
    ]);
    if (head !== metadata.resolvedCommit || dirty !== "")
      throw fail("IdentityConflict", "immutable base Git state changed");
    return base;
  }

  private async publishBase(
    preparedRoot: string,
    normalizedRemote: string,
    requestedRevision: string,
    resolvedCommit: FullGitCommit,
    signal?: AbortSignal,
  ) {
    const baseKey = sha256(
      canonicalJson({
        materializationPolicyVersion: 1,
        normalizedRemote,
        resolvedCommit,
        submodules: "unsupported",
      }),
    );
    const destination = this.basePath(baseKey);
    return await withOsLock(
      this.config,
      `base-${baseKey}`,
      signal,
      async () => {
        if (await fileExists(destination)) {
          await rm(preparedRoot, { recursive: true, force: true });
          await this.validateBase(baseKey, resolvedCommit);
          return baseKey;
        }
        await writeNew(
          Path.join(preparedRoot, "base-manifest.json"),
          jsonLine({
            schemaVersion: 1,
            baseKey,
            normalizedRemote,
            requestedRevision,
            resolvedCommit,
          }),
        );
        await rename(preparedRoot, destination);
        await chmod(destination, 0o555);
        return baseKey;
      },
    );
  }

  private async assertCapsuleFile(source: string, invalid: string) {
    const metadata = await lstat(source);
    if (!metadata.isFile() || metadata.isSymbolicLink())
      throw fail("AgentFsFailure", invalid);
  }

  private async moveCapsuleFile(source: string, destination: string) {
    await chmod(source, 0o600);
    await rename(source, destination);
  }

  private async createCapsule(
    id: InvestigationId,
    basePath: string,
    signal?: AbortSignal,
  ) {
    await using temporary = await mkdtempDisposable(
      Path.join(this.config.home, "scratch", `agentfs-${id}-`),
    );
    const result = await command(
      this.config.agentFs,
      ["init", "--base", basePath, id],
      temporary.path,
      signal,
    );
    if (result.code !== 0)
      throw fail(
        "AgentFsFailure",
        `AgentFS init failed: ${result.stderr.trim() || result.stdout.trim()}`,
      );
    const source = Path.join(temporary.path, ".agentfs", `${id}.db`);
    const destination = this.capsulePath(id);
    await this.assertCapsuleFile(
      source,
      "AgentFS did not create one regular capsule",
    );
    for (const suffix of ["-wal", "-shm"] as const) {
      const companion = `${source}${suffix}`;
      if (!(await fileExists(companion))) continue;
      await this.assertCapsuleFile(
        companion,
        `AgentFS created an invalid SQLite ${suffix} companion`,
      );
      await this.moveCapsuleFile(companion, `${destination}${suffix}`);
    }
    // Publish main last so WAL/SHM companions cannot trail the logical DB.
    await this.moveCapsuleFile(source, destination);
  }

  async materialize(
    input: {
      readonly remote: string;
      readonly revision: string;
      readonly investigationId?: InvestigationId;
    },
    signal?: AbortSignal,
  ) {
    await this.initialize();
    const { remote, revision } = input;
    const id = input.investigationId ?? allocateInvestigationId();
    return await withOsLock(
      this.config,
      `materialize-${id}`,
      signal,
      async () => {
        if (await fileExists(this.bindingPath(id))) {
          const existing = await this.readManifest(id, signal);
          const normalized = await normalizeRemote(remote);
          if (
            existing.normalizedRemote !== normalized ||
            existing.requestedRevision !== revision
          )
            throw fail(
              "IdentityConflict",
              "investigation is bound to another repository",
            );
          return materialized(existing);
        }

        const normalizedRemote = await normalizeRemote(remote);
        await using temporary = await mkdtempDisposable(
          Path.join(this.config.home, "scratch", `base-${id}-`),
        );
        const preparing = temporary.path;
        const root = Path.join(preparing, "root");
        const repository = Path.join(root, "repo");
        await mkdir(Path.join(root, "artifacts"), {
          recursive: true,
          mode: 0o700,
        });
        await this.git(
          preparing,
          ["clone", "--no-checkout", normalizedRemote, repository],
          signal,
        );
        const resolvedCommit = await this.resolveCommit(
          repository,
          revision,
          signal,
        );
        const tree = await this.git(
          repository,
          ["ls-tree", "-r", resolvedCommit],
          signal,
        );
        if (tree.split("\n").some((line) => line.startsWith("160000 ")))
          throw fail("GitlinkUnsupported", "submodules are unsupported in V0");
        await this.git(
          repository,
          ["checkout", "--detach", resolvedCommit],
          signal,
        );
        const baseKey = await this.publishBase(
          root,
          normalizedRemote,
          revision,
          resolvedCommit,
          signal,
        );
        await this.createCapsule(id, this.basePath(baseKey), signal);
        const branch = `attune/${id}`;
        const manifest: InvestigationManifest = {
          schemaVersion: 1,
          investigationId: id,
          normalizedRemote,
          requestedRevision: revision,
          resolvedCommit,
          baseKey,
          branch,
          toolchainDigest: this.config.toolchainDigest,
          createdAt: new Date().toISOString(),
        };
        await writeNew(
          this.bindingPath(id),
          jsonLine({
            schemaVersion: 1,
            investigationId: id,
            baseKey,
          }),
        );
        await this.withMount(
          id,
          signal,
          async ({ repositoryPath, artifactsPath }) => {
            await this.git(
              repositoryPath,
              ["checkout", "-B", branch, resolvedCommit],
              signal,
            );
            await writeNew(
              Path.join(artifactsPath, "investigation.json"),
              jsonLine(manifest),
            );
          },
          false,
        );
        return materialized(manifest);
      },
    );
  }

  async binding(id: InvestigationId) {
    try {
      const binding = await readJson<Binding>(this.bindingPath(id));
      if (binding.investigationId !== id) throw new Error("identity mismatch");
      await this.validateBase(binding.baseKey);
      return binding;
    } catch (cause) {
      if (isNodeError(cause, "ENOENT"))
        throw fail("UnknownInvestigation", `unknown investigation ${id}`);
      throw cause;
    }
  }

  async withMount<A>(
    id: InvestigationId,
    signal: AbortSignal | undefined,
    use: (workspace: MountedWorkspace) => Promise<A>,
    requireManifest = true,
  ) {
    return await withOsLock(this.config, `mount-${id}`, signal, async () => {
      const binding = await this.binding(id);
      const capsule = await realpath(this.capsulePath(id));
      const mountPath = Path.join(this.config.home, "mounts", id);
      await mkdir(mountPath, { recursive: true, mode: 0o700 });
      const existing = await mountedSource(mountPath);
      if (existing !== undefined) {
        if (existing !== `agentfs:${capsule}`)
          throw fail("AgentFsFailure", "foreign filesystem owns mount path");
        await command(
          this.config.fusermount,
          ["-u", mountPath],
          this.config.home,
        );
      }
      if (isAborted(signal))
        throw fail("Cancelled", "mount cancelled before spawn");
      const mount = spawn(
        this.config.agentFs,
        ["mount", "--foreground", capsule, mountPath],
        {
          cwd: Path.join(this.config.home, "mounts"),
          env: {
            HOME: Path.join(this.config.home, "mounts"),
            LANG: "C",
            LC_ALL: "C",
            PATH: `${Path.dirname(this.config.fusermount)}:/usr/bin:/bin`,
            TMPDIR: Path.join(this.config.home, "mounts"),
          },
          shell: false,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let output = "";
      const collect = (chunk: Buffer) =>
        (output = `${output}${chunk.toString("utf8")}`.slice(-16_384));
      mount.stdout.on("data", collect);
      mount.stderr.on("data", collect);
      let mountError: unknown;
      mount.once("error", (cause) => (mountError = cause));
      const termination = terminator(mount);
      const stopListening = aborts(signal, termination.terminate);
      try {
        const deadline = Date.now() + 15_000;
        while ((await mountedSource(mountPath)) !== `agentfs:${capsule}`) {
          if (mountError !== undefined) throw mountError;
          if (mount.exitCode !== null || mount.signalCode !== null)
            throw fail(
              "AgentFsFailure",
              `AgentFS mount exited early: ${output}`,
            );
          if (Date.now() > deadline)
            throw fail(
              "AgentFsFailure",
              `AgentFS mount readiness timed out: ${output}`,
            );
          await wait(50, signal);
        }
        const repositoryPath = contained(await realpath(mountPath), "repo");
        const artifactsPath = contained(await realpath(mountPath), "artifacts");
        const namespaceDeadline = Date.now() + 15_000;
        const isDirectory = async (path: string) => {
          try {
            if ((await stat(path)).isDirectory()) return true;
            throw fail(
              "AgentFsFailure",
              "mounted namespace is not a directory",
            );
          } catch (cause) {
            if (isNodeError(cause, "ENOENT")) return false;
            throw cause;
          }
        };
        while (
          !(
            await Promise.all([repositoryPath, artifactsPath].map(isDirectory))
          ).every(Boolean)
        ) {
          if (Date.now() > namespaceDeadline)
            throw fail(
              "AgentFsFailure",
              "mounted namespaces did not become ready",
            );
          await wait(50, signal);
        }
        const manifestPath = Path.join(artifactsPath, "investigation.json");
        const manifest = requireManifest
          ? await readJson<InvestigationManifest>(manifestPath)
          : ({
              investigationId: id,
              baseKey: binding.baseKey,
            } as InvestigationManifest);
        if (
          manifest.investigationId !== id ||
          manifest.baseKey !== binding.baseKey
        )
          throw fail(
            "IdentityConflict",
            "capsule manifest does not match binding",
          );
        if (isAborted(signal))
          throw fail("Cancelled", "mount cancelled before workspace use");
        // The abort signal governs mount acquisition. Once `use` begins, its
        // native Promise must drain against a stable mount before final
        // unmounting in this scope's `finally`.
        stopListening();
        return await use({
          mountPath,
          repositoryPath,
          artifactsPath,
          manifest,
        });
      } finally {
        stopListening();
        const unmount = async () => {
          if ((await mountedSource(mountPath)) === undefined) return;
          await command(
            this.config.fusermount,
            ["-u", mountPath],
            this.config.home,
          ).catch(() => undefined);
        };
        await unmount();
        termination.terminate();
        if (mount.exitCode === null && mount.signalCode === null)
          await once(mount, "close").catch(() => undefined);
        termination.clear();
        await unmount();
      }
    });
  }

  async readManifest(id: InvestigationId, signal?: AbortSignal) {
    return await this.withMount(id, signal, async ({ manifest }) => manifest);
  }

  async head(repositoryPath: string, signal?: AbortSignal) {
    return (await this.git(
      repositoryPath,
      ["rev-parse", "HEAD"],
      signal,
    )) as FullGitCommit;
  }

  async dirty(repositoryPath: string, signal?: AbortSignal) {
    return (
      (await this.git(
        repositoryPath,
        ["status", "--porcelain", "--untracked-files=all"],
        signal,
      )) !== ""
    );
  }

  private async assertHead(
    repositoryPath: string,
    expected: FullGitCommit,
    signal?: AbortSignal,
  ) {
    const observed = await this.head(repositoryPath, signal);
    if (observed !== expected)
      throw fail(
        "StaleSnapshot",
        "repository HEAD does not match expected snapshot",
        { expected, observed },
      );
  }

  async assertExactClean(
    repositoryPath: string,
    expected: FullGitCommit,
    signal?: AbortSignal,
  ) {
    await this.assertHead(repositoryPath, expected, signal);
    if (await this.dirty(repositoryPath, signal))
      throw fail("DirtyRepository", "repository working tree must be clean");
  }

  async checkpoint(
    repositoryPath: string,
    expected: FullGitCommit,
    policy: "require-clean" | "commit",
    message: string | undefined,
    signal?: AbortSignal,
  ) {
    await this.assertHead(repositoryPath, expected, signal);
    const dirty = await this.dirty(repositoryPath, signal);
    if (dirty && policy === "require-clean")
      throw fail("DirtyRepository", "checkpoint requires a clean repository");
    if (dirty) {
      await this.git(repositoryPath, ["add", "-A"], signal);
      await this.git(
        repositoryPath,
        [
          "-c",
          "user.name=Attune",
          "-c",
          "user.email=attune@localhost",
          "commit",
          "-m",
          message ?? "Attune checkpoint",
        ],
        signal,
      );
    }
    return {
      snapshotId: await this.head(repositoryPath, signal),
      createdCommit: dirty,
    };
  }

  async isolatedCheckout(
    repositoryPath: string,
    commit: FullGitCommit,
    signal?: AbortSignal,
  ) {
    const scratch = Path.join(this.config.home, "scratch");
    await mkdir(scratch, { recursive: true, mode: 0o700 });
    const root = await mkdtemp(Path.join(scratch, "checkout-"));
    const repository = Path.join(root, "repo");
    try {
      await this.git(
        root,
        ["clone", "--no-local", "--no-checkout", repositoryPath, repository],
        signal,
      );
      await this.git(repository, ["checkout", "--detach", commit], signal);
      return { root, repository };
    } catch (cause) {
      await rm(root, { recursive: true, force: true });
      throw cause;
    }
  }

  async replaceManifest(
    workspace: MountedWorkspace,
    manifest: InvestigationManifest,
  ) {
    await writeAtomic(
      Path.join(workspace.artifactsPath, "investigation.json"),
      jsonLine(manifest),
    );
  }

  async gitOutput(
    repository: string,
    args: readonly string[],
    signal?: AbortSignal,
  ) {
    return await this.git(repository, args, signal);
  }

  async gitRaw(
    repository: string,
    args: readonly string[],
    signal?: AbortSignal,
  ) {
    return await this.git(repository, args, signal, true);
  }

  async newFilePatch(repository: string, path: string, signal?: AbortSignal) {
    const result = await command(
      this.config.git,
      [
        "diff",
        "--binary",
        "--no-ext-diff",
        "--no-index",
        "--",
        "/dev/null",
        path,
      ],
      repository,
      signal,
    );
    if (result.code !== 0 && result.code !== 1)
      throw fail(
        "GitFailure",
        `git diff failed: ${result.stderr.trim() || result.stdout.trim()}`,
      );
    return result.stdout;
  }

  async isIgnored(repository: string, path: string, signal?: AbortSignal) {
    const result = await command(
      this.config.git,
      ["check-ignore", "--quiet", "--", path],
      repository,
      signal,
    );
    if (result.code === 0) return true;
    if (result.code === 1) return false;
    throw fail(
      "GitFailure",
      `git check-ignore failed: ${
        result.stderr.trim() || result.stdout.trim()
      }`,
    );
  }
}
