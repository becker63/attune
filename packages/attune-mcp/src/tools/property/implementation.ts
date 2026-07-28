import { copyFile, readFile, rm } from "node:fs/promises";
import * as Path from "node:path";

import { Effect } from "effect";

import type {
  PropertyRunInput,
  PropertyRunResult,
} from "../../contract/schemas.js";
import { InvocationEngine } from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";
import {
  canonicalJson,
  fail,
  type RuntimeConfig,
} from "../../platform/core.js";
import {
  requireSuccessfulProcess,
  retainProcessEvidence,
} from "../../platform/native-process.js";
import { runProcess } from "../../platform/process.js";

/** Runs a bounded repository-local property against an isolated snapshot. */
export const propertyRun = (
  engine: InvocationEngine,
  config: RuntimeConfig,
  workspaces: WorkspaceStore,
  input: PropertyRunInput,
): Effect.Effect<PropertyRunResult, ReturnType<typeof fail>> =>
  engine.execute({
    name: "property_run",
    input,
    run: async (context) => {
      await workspaces.assertExactClean(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      context.setSnapshot(input.expectedSnapshot);
      await context.writeArtifact("property.ts", input.propertySource);
      const parametersPath = await context.writeArtifact(
        "parameters.json",
        `${canonicalJson(input.parameters)}\n`,
      );
      const checkout = await workspaces.isolatedCheckout(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      try {
        const executableProperty = Path.join(
          checkout.repository,
          ".attune-property.ts",
        );
        await copyFile(
          Path.join(context.directory, "property.ts"),
          executableProperty,
        );
        const result = await runProcess(
          config,
          {
            command: config.node,
            args: [
              config.propertyRunner,
              executableProperty,
              parametersPath,
              context.directory,
            ],
            cwd: checkout.repository,
            artifactDirectory: context.directory,
            timeoutMilliseconds: input.parameters.timeoutMilliseconds,
          },
          context.signal,
        );
        await retainProcessEvidence(context, result);
        for (const path of [
          "run-details.json",
          "report.txt",
          "counterexample.json",
        ]) {
          try {
            await readFile(Path.join(context.directory, path));
            context.retainArtifact(path);
          } catch {
            // counterexample.json is absent when the property passes.
          }
        }
        requireSuccessfulProcess(result);
        const details = JSON.parse(
          await readFile(
            Path.join(context.directory, "run-details.json"),
            "utf8",
          ),
        ) as {
          readonly failed: boolean;
          readonly seed?: number;
          readonly counterexamplePath?: string;
          readonly numRuns?: number;
          readonly numShrinks?: number;
        };
        return {
          snapshotId: input.expectedSnapshot,
          value: {
            snapshotId: input.expectedSnapshot,
            outcome: details.failed
              ? ("counterexample" as const)
              : ("no-counterexample" as const),
            ...(details.seed === undefined ? {} : { seed: details.seed }),
            ...(details.counterexamplePath === undefined
              ? {}
              : { counterexamplePath: details.counterexamplePath }),
            ...(details.numRuns === undefined
              ? {}
              : { numRuns: details.numRuns }),
            ...(details.numShrinks === undefined
              ? {}
              : { numShrinks: details.numShrinks }),
          },
        };
      } finally {
        await rm(checkout.root, { recursive: true, force: true });
      }
    },
  });
