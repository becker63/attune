import { rm } from "node:fs/promises";

import { Effect } from "effect";

import type { MaudeRunInput, MaudeRunResult } from "../../contract/schemas.js";
import { InvocationEngine } from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";
import { fail, type RuntimeConfig } from "../../platform/core.js";
import {
  requireSuccessfulProcess,
  retainProcessEvidence,
} from "../../platform/native-process.js";
import { runProcess } from "../../platform/process.js";

/** Runs exact Maude source and commands against an isolated snapshot. */
export const maudeRun = (
  engine: InvocationEngine,
  config: RuntimeConfig,
  workspaces: WorkspaceStore,
  input: MaudeRunInput,
): Effect.Effect<MaudeRunResult, ReturnType<typeof fail>> =>
  engine.execute({
    name: "maude_run",
    input,
    run: async (context) => {
      await workspaces.assertExactClean(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      context.setSnapshot(input.expectedSnapshot);
      const modulePath = await context.writeArtifact(
        "module.maude",
        input.moduleSource,
      );
      const commandsPath = await context.writeArtifact(
        "commands.maude",
        input.commands,
      );
      const checkout = await workspaces.isolatedCheckout(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      try {
        const result = await runProcess(
          config,
          {
            command: config.maude,
            args: [
              "-no-banner",
              "-no-advise",
              "-no-ansi-color",
              "-no-wrap",
              "-no-tecla",
              "-batch",
              modulePath,
              commandsPath,
            ],
            cwd: checkout.repository,
            artifactDirectory: context.directory,
            timeoutMilliseconds: input.timeoutMilliseconds,
          },
          context.signal,
        );
        await retainProcessEvidence(context, result);
        requireSuccessfulProcess(result);
        if (/^Error:/mu.test(`${result.stdoutTail}\n${result.stderrTail}`)) {
          throw fail("ParseFailure", "Maude reported an error diagnostic");
        }
        return {
          snapshotId: input.expectedSnapshot,
          value: {
            snapshotId: input.expectedSnapshot,
            ...(result.exitCode === undefined
              ? {}
              : { exitCode: result.exitCode }),
            stdoutTail: result.stdoutTail,
            stderrTail: result.stderrTail,
          },
        };
      } finally {
        await rm(checkout.root, { recursive: true, force: true });
      }
    },
  });
