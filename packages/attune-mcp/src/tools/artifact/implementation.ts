import { copyFile, lstat, mkdir, readFile, realpath } from "node:fs/promises";
import * as Path from "node:path";

import { Effect } from "effect";

import type {
  ArtifactPromoteInput,
  ArtifactPromoteResult,
  ArtifactReference,
  AttuneToolFailure,
} from "../../contract/schemas.js";
import { InvocationEngine } from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";
import { containedRegularFile, fail, sha256 } from "../../platform/core.js";

/**
 * Decodes one investigation-owned artifact URI. @param investigationId - Investigation that must own the
 * artifact. @param uri - Canonical retained-artifact URI. @returns The tool, invocation, and relative
 * artifact path.
 */
const parseArtifactUri = (
  investigationId: string,
  uri: string,
): {
  readonly tool: string;
  readonly invocationId: string;
  readonly path: string;
} => {
  const prefix = `attune://investigations/${investigationId}/artifacts/`;
  if (!uri.startsWith(prefix)) {
    throw fail("PromotionRejected", "artifact belongs to another investigation");
  }
  const [tool, invocationId, ...parts] = uri.slice(prefix.length).split("/");
  if (
    tool === undefined ||
    invocationId === undefined ||
    parts.length === 0 ||
    parts.some((part) => part === "" || part === "." || part === "..")
  ) {
    throw fail("InvalidPath", "artifact URI is not canonical", { path: uri });
  }
  return { tool, invocationId, path: parts.join("/") };
};

/**
 * Promotes verified retained bytes into a safe repository-relative path.
 *
 * @remarks
 *   Promotion rechecks receipt evidence, containment, ignore rules, and current authority before copying.
 * @param engine - Invocation engine that records terminal evidence. @param workspaces - Store that validates
 *   and updates the repository. @param input - Artifact identity, expected snapshot, and destination.
 * @returns The resulting snapshot and promotion evidence.
 * @failure {@link AttuneToolFailure} - Repair artifact evidence or the destination boundary before retrying.
 */
export const artifactPromote = (
  engine: InvocationEngine,
  workspaces: WorkspaceStore,
  input: ArtifactPromoteInput,
): Effect.Effect<ArtifactPromoteResult, AttuneToolFailure> =>
  engine.execute({
    name: "artifact_promote",
    input,
    run: async (context) => {
      await workspaces.assertExactClean(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      context.setSnapshot(input.expectedSnapshot);
      const source = parseArtifactUri(input.investigationId, input.artifactUri);
      let sourcePath: string;
      let sourceReceipt: {
        readonly artifacts?: readonly ArtifactReference[];
      };
      try {
        sourcePath = await containedRegularFile(
          context.workspace.artifactsPath,
          `${source.tool}/${source.invocationId}/${source.path}`,
        );
        sourceReceipt = JSON.parse(
          await readFile(
            Path.join(context.workspace.artifactsPath, source.tool, source.invocationId, "receipt.json"),
            "utf8",
          ),
        ) as { readonly artifacts?: readonly ArtifactReference[] };
      } catch (cause) {
        if (cause instanceof Error && "_tag" in cause && cause._tag === "AttuneToolFailure") {
          throw cause;
        }
        throw fail("ArtifactMissing", "artifact or its terminal receipt is unavailable");
      }
      const retained = sourceReceipt.artifacts?.find((artifact) => artifact.uri === input.artifactUri);
      const sourceBytes = await readFile(sourcePath);
      if (
        retained === undefined ||
        retained.bytes !== sourceBytes.byteLength ||
        retained.sha256 !== sha256(sourceBytes)
      ) {
        throw fail("ArtifactChanged", "artifact bytes do not match their terminal receipt");
      }
      if (input.destinationPath.split("/").some((part) => part === ".git")) {
        throw fail("PromotionRejected", "promotion cannot target .git");
      }
      if (
        await workspaces.isIgnored(context.workspace.repositoryPath, input.destinationPath, context.signal)
      ) {
        throw fail("PromotionRejected", "promotion destination is Git-ignored");
      }
      const destination = Path.resolve(context.workspace.repositoryPath, input.destinationPath);
      if (!destination.startsWith(`${context.workspace.repositoryPath}${Path.sep}`)) {
        throw fail("InvalidPath", "promotion destination escapes repository");
      }
      await mkdir(Path.dirname(destination), {
        mode: 0o700,
        recursive: true,
      });
      const parent = await realpath(Path.dirname(destination));
      if (
        !parent.startsWith(`${context.workspace.repositoryPath}${Path.sep}`) &&
        parent !== context.workspace.repositoryPath
      ) {
        throw fail("InvalidPath", "promotion parent escapes repository");
      }
      try {
        if ((await lstat(destination)).isSymbolicLink()) {
          throw fail("PromotionRejected", "promotion destination is a symlink");
        }
      } catch (cause) {
        if (!(cause instanceof Error && "code" in cause && cause.code === "ENOENT")) {
          throw cause;
        }
      }
      let changed = true;
      let existed = true;
      try {
        changed = !sourceBytes.equals(await readFile(destination));
      } catch (cause) {
        if (!(cause instanceof Error && "code" in cause && cause.code === "ENOENT")) {
          throw cause;
        }
        existed = false;
      }
      await workspaces.assertExactClean(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      if (changed) await copyFile(sourcePath, destination);
      const patch =
        changed && !existed
          ? await workspaces.newFilePatch(
              context.workspace.repositoryPath,
              input.destinationPath,
              context.signal,
            )
          : await workspaces.gitRaw(
              context.workspace.repositoryPath,
              ["diff", "--binary", "--no-ext-diff"],
              context.signal,
            );
      await context.writeArtifact("promotion.patch", patch);
      return {
        snapshotId: input.expectedSnapshot,
        value: {
          beforeSnapshot: input.expectedSnapshot,
          destinationPath: input.destinationPath,
          workingTreeChanged: changed,
        },
      };
    },
  });
