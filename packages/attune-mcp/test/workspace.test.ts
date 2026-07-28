import { execFileSync } from "node:child_process";
import {
  access,
  chmod,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import * as Path from "node:path";

import type {
  FullGitCommit,
  InvestigationId,
} from "../src/contract/schemas.js";
import {
  normalizeRemote,
  WorkspaceStore,
  type InvestigationManifest,
  type MountedWorkspace,
} from "../src/investigation/workspace.js";
import {
  fixtureRuntimeConfig,
  readJson,
  withTemporaryDirectory,
} from "./fixtures.js";

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
      await cp(
        Path.join(this.config.home, "bases", binding.baseKey, "repo"),
        repositoryPath,
        { recursive: true },
      );
    }
    await mkdir(artifactsPath, { recursive: true });
    const manifest = requireManifest
      ? await readJson<InvestigationManifest>(
          Path.join(artifactsPath, "investigation.json"),
        )
      : ({
          investigationId: id,
          baseKey: binding.baseKey,
        } as InvestigationManifest);
    return await use({
      mountPath,
      repositoryPath,
      artifactsPath,
      manifest,
    });
  }
}

const createRepository = async (
  root: string,
  name: string,
  contents: string,
): Promise<string> => {
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

const blockingAgentFs = async (
  root: string,
): Promise<{
  readonly executable: string;
  readonly entered: string;
  readonly release: string;
}> => {
  const executable = Path.join(root, "fake-agentfs.mjs");
  const entered = Path.join(root, "agentfs-entered");
  const release = Path.join(root, "agentfs-release");
  await writeFile(
    executable,
    [
      "#!/usr/bin/env node",
      'import { existsSync, mkdirSync, writeFileSync } from "node:fs";',
      'import { dirname, join } from "node:path";',
      'import { fileURLToPath } from "node:url";',
      "const root = dirname(fileURLToPath(import.meta.url));",
      'if (process.argv[2] !== "init") process.exit(64);',
      "const id = process.argv.at(-1);",
      'mkdirSync(join(process.cwd(), ".agentfs"), { recursive: true });',
      'writeFileSync(join(process.cwd(), ".agentfs", id + ".db"), "capsule\\n");',
      'writeFileSync(join(root, "agentfs-entered"), id + "\\n");',
      'while (!existsSync(join(root, "agentfs-release"))) {',
      "  await new Promise((resolve) => setTimeout(resolve, 10));",
      "}",
    ].join("\n"),
  );
  await chmod(executable, 0o755);
  return { executable, entered, release };
};

const waitForFile = async (path: string): Promise<void> => {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      await access(path);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  throw new Error(`timed out waiting for ${path}`);
};

const makePublishedBasesRemovable = async (home: string): Promise<void> => {
  try {
    for (const entry of await readdir(Path.join(home, "bases"))) {
      await chmod(Path.join(home, "bases", entry), 0o700);
    }
  } catch {
    // A failed materialization may not have published the bases directory.
  }
};

const expectPublishedIdentity = async (
  home: string,
  investigationId: InvestigationId,
  baseKey: string,
): Promise<void> => {
  for (const [directory, entry] of [
    ["capsules", `${investigationId}.db`],
    ["bindings", `${investigationId}.json`],
    ["bases", baseKey],
  ] as const) {
    expect(await readdir(Path.join(home, directory))).toEqual([entry]);
  }
};

describe("narrow real Git seam", () => {
  it("uses clean full commits for checkpoints and isolated analysis", async () => {
    await withTemporaryDirectory("attune-git-", async (root) => {
      const repository = await createRepository(root, "repository", "first\n");
      const first = git(repository, "rev-parse", "HEAD") as FullGitCommit;
      const store = new WorkspaceStore(config(root));

      expect(await normalizeRemote(repository)).toBe(
        await import("node:fs/promises").then(({ realpath }) =>
          realpath(repository),
        ),
      );
      expect(await store.head(repository)).toBe(first);
      expect(
        await store.checkpoint(repository, first, "require-clean", undefined),
      ).toEqual({ snapshotId: first, createdCommit: false });

      await Promise.all([
        writeFile(Path.join(repository, "value.txt"), "second\n"),
        writeFile(Path.join(repository, "new.txt"), "untracked\n"),
      ]);
      await expect(
        store.checkpoint(repository, first, "require-clean", undefined),
      ).rejects.toMatchObject({ code: "DirtyRepository" });
      const checkpoint = await store.checkpoint(
        repository,
        first,
        "commit",
        "checkpoint all non-ignored changes",
      );
      expect(checkpoint.createdCommit).toBe(true);
      expect(checkpoint.snapshotId).not.toBe(first);
      expect(await store.dirty(repository)).toBe(false);
      expect(
        git(repository, "show", "--format=", "--name-only", "HEAD"),
      ).toContain("new.txt");

      const isolated = await store.isolatedCheckout(repository, first);
      try {
        expect(
          await readFile(Path.join(isolated.repository, "value.txt"), "utf8"),
        ).toBe("first\n");
        expect(await store.head(isolated.repository)).toBe(first);
        expect(await store.dirty(isolated.repository)).toBe(false);
      } finally {
        await rm(isolated.root, { recursive: true, force: true });
      }
    });
  });

  it("rejects stale checkpoint expectations", async () => {
    await withTemporaryDirectory("attune-stale-", async (root) => {
      const repository = await createRepository(root, "repository", "a");
      await expect(
        new WorkspaceStore(config(root)).checkpoint(
          repository,
          "b".repeat(40) as FullGitCommit,
          "require-clean",
          undefined,
        ),
      ).rejects.toMatchObject({ code: "StaleSnapshot" });
    });
  });

  it("does not spawn a command for an already-aborted request", async () => {
    await withTemporaryDirectory("attune-pre-aborted-", async (root) => {
      const executable = Path.join(root, "observable-git.mjs");
      const marker = Path.join(root, "spawned");
      await writeFile(
        executable,
        [
          "#!/usr/bin/env node",
          'import { writeFileSync } from "node:fs";',
          `writeFileSync(${JSON.stringify(marker)}, "spawned\\n");`,
        ].join("\n"),
      );
      await chmod(executable, 0o755);
      const controller = new AbortController();
      controller.abort();
      await expect(
        new WorkspaceStore({
          ...config(root),
          git: executable,
        }).head(root, controller.signal),
      ).rejects.toMatchObject({ code: "Cancelled" });
      await expect(access(marker)).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("force-kills a command that ignores cancellation", async () => {
    await withTemporaryDirectory("attune-force-kill-", async (root) => {
      const executable = Path.join(root, "stubborn-git.mjs");
      const marker = Path.join(root, "spawned");
      await writeFile(
        executable,
        [
          "#!/usr/bin/env node",
          'import { writeFileSync } from "node:fs";',
          `writeFileSync(${JSON.stringify(marker)}, "spawned\\n");`,
          'process.on("SIGTERM", () => undefined);',
          "setInterval(() => undefined, 1_000);",
        ].join("\n"),
      );
      await chmod(executable, 0o755);
      const controller = new AbortController();
      const running = new WorkspaceStore({
        ...config(root),
        git: executable,
      }).head(root, controller.signal);
      await waitForFile(marker);
      controller.abort();
      await expect(running).rejects.toMatchObject({ code: "Cancelled" });
    });
  });
});

describe("materialization identity publication", () => {
  const investigationId = "01K33333333333333333333333" as InvestigationId;

  it("publishes one coherent identity for concurrent matching requests", async () => {
    await withTemporaryDirectory("attune-identity-same-", async (root) => {
      const home = Path.join(root, "runtime");
      await mkdir(home);
      try {
        const remote = await createRepository(root, "remote", "same\n");
        const agentFs = await blockingAgentFs(root);
        const store = new LocalMountWorkspaceStore({
          ...config(home),
          agentFs: agentFs.executable,
        });
        const input = {
          investigationId,
          remote,
          revision: "HEAD",
        } as const;

        const first = store.materialize(input);
        await waitForFile(agentFs.entered);
        let secondSettled = false;
        const second = store.materialize(input).finally(() => {
          secondSettled = true;
        });
        await new Promise((resolve) => setTimeout(resolve, 25));
        try {
          expect(secondSettled).toBe(false);
        } finally {
          await writeFile(agentFs.release, "release\n");
        }

        const [left, right] = await Promise.all([first, second]);
        expect(left).toEqual(right);
        const binding = await store.binding(investigationId);
        const baseManifest = await readJson<{
          readonly baseKey: string;
          readonly resolvedCommit: string;
        }>(Path.join(home, "bases", binding.baseKey, "base-manifest.json"));
        expect(baseManifest).toMatchObject({
          baseKey: binding.baseKey,
          resolvedCommit: left.resolvedCommit,
        });
        expect(left.manifest.baseKey).toBe(binding.baseKey);
        await expectPublishedIdentity(home, investigationId, binding.baseKey);
      } finally {
        await makePublishedBasesRemovable(home);
      }
    });
  });

  it("makes the first locked repository binding the deterministic winner", async () => {
    await withTemporaryDirectory("attune-identity-conflict-", async (root) => {
      const home = Path.join(root, "runtime");
      await mkdir(home);
      try {
        const [firstRemote, conflictingRemote] = await Promise.all([
          createRepository(root, "first-remote", "first\n"),
          createRepository(root, "conflicting-remote", "conflicting\n"),
        ]);
        const agentFs = await blockingAgentFs(root);
        const store = new LocalMountWorkspaceStore({
          ...config(home),
          agentFs: agentFs.executable,
        });

        const winner = store.materialize({
          investigationId,
          remote: firstRemote,
          revision: "HEAD",
        });
        await waitForFile(agentFs.entered);
        const loser = store.materialize({
          investigationId,
          remote: conflictingRemote,
          revision: "HEAD",
        });
        const loserOutcome = loser.then(
          (value) => ({ status: "succeeded" as const, value }),
          (cause: unknown) => ({ status: "failed" as const, cause }),
        );
        await writeFile(agentFs.release, "release\n");

        const published = await winner;
        expect(await loserOutcome).toMatchObject({
          status: "failed",
          cause: { code: "IdentityConflict" },
        });
        const binding = await store.binding(investigationId);
        expect(published.manifest).toMatchObject({
          investigationId,
          normalizedRemote: await normalizeRemote(firstRemote),
          baseKey: binding.baseKey,
        });
        await expectPublishedIdentity(home, investigationId, binding.baseKey);
      } finally {
        await makePublishedBasesRemovable(home);
      }
    });
  });
});
