import { rm } from "node:fs/promises";

import { Effect } from "effect";

import type { AttuneToolFailure, MaudeRunInput, MaudeRunResult } from "../../contract/schemas.js";
import { InvocationEngine } from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";
import { fail, type RuntimeConfig } from "../../platform/core.js";
import { requireSuccessfulProcess, retainProcessEvidence } from "../../platform/native-process.js";
import { runProcess } from "../../platform/process.js";

/**
 * Runs exact Maude source and commands against an isolated snapshot. @remarks Authored inputs and process
 * evidence are retained before diagnostics become terminal failure. @param engine - Invocation engine that
 * records terminal evidence. @param config - Runtime and Maude configuration. @param workspaces - Store that
 * owns the isolated checkout. @param input - Module, commands, snapshot, and timeout. @returns Bounded output
 * and process status.
 *
 * @failure {@link AttuneToolFailure} - Correct the Maude program or native process boundary before retrying.
 */
export const maudeRun = (
  engine: InvocationEngine,
  config: RuntimeConfig,
  workspaces: WorkspaceStore,
  input: MaudeRunInput,
): Effect.Effect<MaudeRunResult, AttuneToolFailure> =>
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
      const modulePath = await context.writeArtifact("module.maude", input.moduleSource);
      const commandsPath = await context.writeArtifact("commands.maude", input.commands);
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
            ...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
            stdoutTail: result.stdoutTail,
            stderrTail: result.stderrTail,
          },
        };
      } finally {
        await rm(checkout.root, { recursive: true, force: true });
      }
    },
  });
