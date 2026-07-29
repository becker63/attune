import { execFileSync } from "node:child_process";
import { access, chmod, cp, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import * as Path from "node:path";

import type { FullGitCommit, InvestigationId } from "../src/contract/schemas.js";
import {
  normalizeRemote,
  WorkspaceStore,
  type InvestigationManifest,
  type MountedWorkspace,
} from "../src/investigation/workspace.js";
import { runBufferedCommand } from "../src/platform/process.js";
import { fixtureRuntimeConfig, readJson, withTemporaryDirectory } from "./fixtures.js";

const git = (cwd: string, ...args: string[]): string =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();

const config = fixtureRuntimeConfig;

class LocalMountWorkspaceStore extends WorkspaceStore {
  override async withMount<A>(
    id: InvestigationId,
    _signal: AbortSignal | undefined,
    use: (workspace: MountedWorkspace) => Promise<A>,
    requireManifest = true,
  ): Promise<A> {
    const binding = await this.binding(id);
    const mountPath = Path.join(this.config.home, "test-mounts", id);
    const repositoryPath = Path.join(mountPath, "repo");
    const artifactsPath = Path.join(mountPath, "artifacts");
    try {
      await access(repositoryPath);
    } catch {
      await mkdir(mountPath, { recursive: true });
      await cp(Path.join(this.config.home, "bases", binding.baseKey, "repo"), repositoryPath, {
        recursive: true,
      });
    }
    await mkdir(artifactsPath, { recursive: true });
    const manifest = requireManifest
      ? await readJson<InvestigationManifest>(Path.join(artifactsPath, "investigation.json"))
      : (binding as InvestigationManifest);
    return await use({
      mountPath,
      repositoryPath,
      artifactsPath,
      manifest,
    });
  }
}

const createRepository = async (root: string, name: string, contents: string) => {
  const repository = Path.join(root, name);
  await mkdir(repository, { recursive: true });
  git(repository, "init", "-q");
  git(repository, "config", "user.name", "Fixture");
  git(repository, "config", "user.email", "fixture@example.invalid");
  await writeFile(Path.join(repository, "value.txt"), contents);
  git(repository, "add", "value.txt");
  git(repository, "commit", "-qm", name);
  return repository;
};

const blockingAgentFs = async (root: string) => {
  const executable = Path.join(root, "fake-agentfs.mjs");
  const entered = Path.join(root, "agentfs-entered");
  const release = Path.join(root, "agentfs-release");
  await writeFile(
    executable,
    [
      `#!${process.execPath}`,
      'import { existsSync, mkdirSync, writeFileSync } from "node:fs";',
      'import { join } from "node:path";',
      'if (process.argv[2] !== "init") process.exit(64);',
      "const id = process.argv.at(-1);",
      'mkdirSync(join(process.cwd(), ".agentfs"), { recursive: true });',
      'writeFileSync(join(process.cwd(), ".agentfs", id + ".db"), "capsule\\n");',
      `writeFileSync(${JSON.stringify(entered)}, id + "\\n");`,
      `while (!existsSync(${JSON.stringify(release)})) {`,
      "  await new Promise((resolve) => setTimeout(resolve, 10));",
      "}",
    ].join("\n"),
  );
  await chmod(executable, 0o755);
  return { executable, entered, release };
};

const waitForFile = (path: string) => vi.waitFor(() => access(path), { interval: 10, timeout: 2_000 });

describe("narrow real Git seam", () => {
  it("uses clean full commits for checkpoints and isolated analysis", async () => {
    await withTemporaryDirectory("attune-git-", async (root) => {
      const repository = await createRepository(root, "repository", "first\n");
      const first = git(repository, "rev-parse", "HEAD") as FullGitCommit;
      const store = new WorkspaceStore(config(root));

      expect(await normalizeRemote(repository)).toBe(await realpath(repository));
      expect(await store.head(repository)).toBe(first);
      await expect(
        store.checkpoint(repository, "b".repeat(40) as FullGitCommit, "require-clean", undefined),
      ).rejects.toMatchObject({ code: "StaleSnapshot" });
      expect(await store.checkpoint(repository, first, "require-clean", undefined)).toEqual({
        snapshotId: first,
        createdCommit: false,
      });

      await Promise.all([
        writeFile(Path.join(repository, "value.txt"), "second\n"),
        writeFile(Path.join(repository, "new.txt"), "untracked\n"),
      ]);
      await expect(store.checkpoint(repository, first, "require-clean", undefined)).rejects.toMatchObject({
        code: "DirtyRepository",
      });
      const checkpoint = await store.checkpoint(
        repository,
        first,
        "commit",
        "checkpoint all non-ignored changes",
      );
      expect(checkpoint.createdCommit).toBe(true);
      expect(checkpoint.snapshotId).not.toBe(first);
      expect(await store.dirty(repository)).toBe(false);
      expect(git(repository, "show", "--format=", "--name-only", "HEAD")).toContain("new.txt");

      const isolated = await store.isolatedCheckout(repository, first);
      expect(await readFile(Path.join(isolated.repository, "value.txt"), "utf8")).toBe("first\n");
      expect(await store.head(isolated.repository)).toBe(first);
      expect(await store.dirty(isolated.repository)).toBe(false);
    });
  });

  it("cancels commands before spawn and force-kills after spawn", async () => {
    await withTemporaryDirectory("attune-cancel-command-", async (root) => {
      const preAborted = new AbortController();
      preAborted.abort();
      await expect(
        runBufferedCommand(Path.join(root, "must-not-be-spawned"), [], root, preAborted.signal),
      ).rejects.toMatchObject({ code: "Cancelled" });

      const marker = Path.join(root, "spawned");
      const controller = new AbortController();
      const running = runBufferedCommand(
        process.execPath,
        [
          "-e",
          [
            'import { writeFileSync } from "node:fs";',
            `writeFileSync(${JSON.stringify(marker)}, "spawned\\n");`,
            'process.on("SIGTERM", () => undefined);',
            "setInterval(() => undefined, 1_000);",
          ].join("\n"),
        ],
        root,
        controller.signal,
      );
      await waitForFile(marker);
      controller.abort();
      await expect(running).rejects.toMatchObject({ code: "Cancelled" });
    });
  });
});

describe("materialization identity publication", () => {
  const investigationId = "01K33333333333333333333333" as InvestigationId;

  it.each([
    ["matching", "same", "remote", "same\n", false],
    ["conflicting", "conflict", "first-remote", "first\n", true],
  ] as const)(
    "serializes concurrent %s identity requests",
    async (_kind, fixture, repositoryName, contents, conflicts) => {
      await withTemporaryDirectory(`attune-identity-${fixture}-`, async (root) => {
        const home = Path.join(root, "runtime");
        try {
          const repository = (name: string, value: string) => createRepository(root, name, value);
          const firstRemote = await repository(repositoryName, contents);
          const contenderRemote = conflicts
            ? await repository("conflicting-remote", "conflicting\n")
            : firstRemote;
          const agentFs = await blockingAgentFs(root);
          const store = new LocalMountWorkspaceStore({
            ...config(home),
            agentFs: agentFs.executable,
          });
          const materialize = (remote: string) =>
            store.materialize({ investigationId, remote, revision: "HEAD" });
          const winner = materialize(firstRemote);
          await waitForFile(agentFs.entered);
          let contenderSettled = false;
          const contender = materialize(contenderRemote)
            .then(
              (value) => ({ status: "succeeded" as const, value }),
              (cause: unknown) => ({ status: "failed" as const, cause }),
            )
            .finally(() => {
              contenderSettled = true;
            });
          await new Promise((resolve) => setTimeout(resolve, 25));
          try {
            expect(contenderSettled).toBe(false);
          } finally {
            await writeFile(agentFs.release, "release\n");
          }

          const [published, outcome] = await Promise.all([winner, contender]);
          const identityConflict = expect.objectContaining({
            code: "IdentityConflict",
          });
          expect(outcome).toEqual(
            conflicts
              ? { status: "failed", cause: identityConflict }
              : { status: "succeeded", value: published },
          );
          const binding = await store.binding(investigationId);
          const baseManifest = await readJson(
            Path.join(home, "bases", binding.baseKey, "base-manifest.json"),
          );
          expect(baseManifest).toMatchObject({
            baseKey: binding.baseKey,
            resolvedCommit: published.resolvedCommit,
          });
          expect(published.manifest).toMatchObject({
            investigationId,
            normalizedRemote: await normalizeRemote(firstRemote),
            baseKey: binding.baseKey,
          });
          for (const [directory, entry] of [
            ["capsules", `${investigationId}.db`],
            ["bindings", `${investigationId}.json`],
            ["bases", binding.baseKey],
          ] as const)
            expect(await readdir(Path.join(home, directory))).toEqual([entry]);
        } finally {
          const bases = Path.join(home, "bases");
          for (const entry of await readdir(bases).catch(() => []))
            await chmod(Path.join(bases, entry), 0o700);
        }
      });
    },
  );
});
