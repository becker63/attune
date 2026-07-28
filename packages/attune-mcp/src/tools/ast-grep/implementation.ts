/**
 * Native ast-grep execution owned by the ast-grep domain module.
 */

import { readFile, rm } from "node:fs/promises";
import * as Path from "node:path";

import { Effect } from "effect";
import { parse as parseYaml } from "yaml";

import type {
  AstGrepRunInput,
  AstGrepRunResult,
  RepositoryRelativePath,
} from "../../contract/schemas.js";
import {
  type InvocationContext,
  InvocationEngine,
} from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";
import { contained, fail, type RuntimeConfig } from "../../platform/core.js";
import {
  requireSuccessfulProcess,
  retainProcessEvidence,
} from "../../platform/native-process.js";
import { runProcess } from "../../platform/process.js";

const retainAstGrepInputs = async (
  context: InvocationContext,
  workspaces: WorkspaceStore,
  repository: string,
  configPath: RepositoryRelativePath,
  rulePaths: readonly RepositoryRelativePath[],
): Promise<void> => {
  const selected = new Set<string>([configPath, ...rulePaths]);
  const configBytes = await readFile(contained(repository, configPath));
  const document = parseYaml(configBytes.toString("utf8")) as {
    readonly testConfigs?: readonly { readonly testDir?: unknown }[];
  };
  for (const entry of document.testConfigs ?? []) {
    if (typeof entry.testDir !== "string") continue;
    const relative = Path.posix.normalize(
      Path.posix.join(Path.posix.dirname(configPath), entry.testDir),
    );
    contained(repository, relative);
    const tracked = await workspaces.gitRaw(
      repository,
      ["ls-files", "-z", "--", relative],
      context.signal,
    );
    for (const path of tracked.split("\0").filter(Boolean)) selected.add(path);
  }
  for (const path of [...selected].sort()) {
    await context.writeArtifact(
      `inputs/${path}`,
      await readFile(contained(repository, path)),
    );
  }
};

const findingsCount = (text: string): number => {
  let count = 0;
  for (const line of text.split("\n").filter(Boolean)) {
    JSON.parse(line);
    count += 1;
  }
  return count;
};

/** Tests, scans, or applies repository-native ast-grep rules. */
export const astGrepRun = (
  engine: InvocationEngine,
  config: RuntimeConfig,
  workspaces: WorkspaceStore,
  input: AstGrepRunInput,
): Effect.Effect<AstGrepRunResult, ReturnType<typeof fail>> =>
  engine.execute({
    name: "ast_grep_run",
    input,
    run: async (context) => {
      await workspaces.assertExactClean(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      context.setSnapshot(input.expectedSnapshot);
      const checkout = await workspaces.isolatedCheckout(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      try {
        await retainAstGrepInputs(
          context,
          workspaces,
          checkout.repository,
          input.configPath,
          input.rulePaths,
        );
        const common = [
          "--config",
          input.configPath,
          "--color",
          "never",
        ] as const;
        const args =
          input.mode === "test"
            ? ["test", ...common]
            : input.mode === "scan"
              ? ["scan", ...common, "--json=stream", "--threads", "1", "."]
              : ["scan", ...common, "--threads", "1", "--update-all", "."];
        const result = await runProcess(
          config,
          {
            command: config.astGrep,
            args,
            cwd: checkout.repository,
            artifactDirectory: context.directory,
            timeoutMilliseconds: input.timeoutMilliseconds,
          },
          context.signal,
        );
        await retainProcessEvidence(context, result);
        requireSuccessfulProcess(result);
        let findingCount: number | undefined;
        if (input.mode === "scan") {
          const findings = await readFile(
            Path.join(context.directory, "stdout.txt"),
          );
          await context.writeArtifact("findings.jsonl", findings);
          findingCount = findingsCount(findings.toString("utf8"));
        }
        const changedRaw = await workspaces.gitRaw(
          checkout.repository,
          ["diff", "--name-only", "-z"],
          context.signal,
        );
        const changedFiles = changedRaw
          .split("\0")
          .filter(Boolean) as RepositoryRelativePath[];
        if (input.mode === "apply" && changedFiles.length > 0) {
          const patch = await workspaces.gitRaw(
            checkout.repository,
            ["diff", "--binary", "--no-ext-diff"],
            context.signal,
          );
          const patchPath = await context.writeArtifact("patch.diff", patch);
          await workspaces.assertExactClean(
            context.workspace.repositoryPath,
            input.expectedSnapshot,
            context.signal,
          );
          await workspaces.gitOutput(
            context.workspace.repositoryPath,
            ["apply", "--binary", patchPath],
            context.signal,
          );
        }
        return {
          snapshotId: input.expectedSnapshot,
          value: {
            snapshotId: input.expectedSnapshot,
            mode: input.mode,
            ...(findingCount === undefined ? {} : { findingCount }),
            changedFiles,
          },
        };
      } finally {
        await rm(checkout.root, { recursive: true, force: true });
      }
    },
  });
