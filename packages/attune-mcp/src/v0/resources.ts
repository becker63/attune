import { readFile, stat } from "node:fs/promises";
import * as Path from "node:path";

import { Context, Effect, Layer, Schema } from "effect";
import { McpSchema, McpServer } from "effect/unstable/ai";

import { InvestigationId, InvocationId, ToolName } from "./contracts.js";
import {
  containedRegularFile,
  fail,
  sha256,
  type RuntimeConfig,
} from "./core.js";
import { WorkspaceStore } from "./workspace.js";

const encode = (value: unknown): string =>
  `${JSON.stringify(value, undefined, 2)}\n`;
const invalid = (message: string) => new McpSchema.InvalidParams({ message });
const internal = (cause: unknown) =>
  new McpSchema.InternalError({
    message: cause instanceof Error ? cause.message : String(cause),
  });

const id = McpSchema.param("investigationId", InvestigationId);
const tool = McpSchema.param("tool", ToolName);
const invocation = McpSchema.param("invocationId", InvocationId);
const decodeInvestigationId = Schema.decodeUnknownSync(InvestigationId);
const decodeInvocationId = Schema.decodeUnknownSync(InvocationId);
const decodeToolName = Schema.decodeUnknownSync(ToolName);

export const makeResourceRegistration = (
  config: RuntimeConfig,
  workspaces: WorkspaceStore,
) => {
  const Metadata = McpServer.resource`attune://investigations/${id}`({
    name: "Attune investigation metadata",
    description: "Small mechanical identity and finalization metadata.",
    mimeType: "application/json",
    content: (_uri, investigationId) =>
      Effect.tryPromise({
        try: async (signal) =>
          encode(await workspaces.readManifest(investigationId, signal)),
        catch: internal,
      }),
  });

  const Receipt =
    McpServer.resource`attune://investigations/${id}/receipts/${tool}/${invocation}`(
      {
        name: "Attune terminal receipt",
        description: "One immutable invocation receipt addressed by exact key.",
        mimeType: "application/json",
        content: (_uri, investigationId, toolName, invocationId) =>
          Effect.tryPromise({
            try: async (signal) =>
              await workspaces.withMount(
                investigationId,
                signal,
                async ({ artifactsPath }) =>
                  await readFile(
                    Path.join(
                      artifactsPath,
                      toolName,
                      invocationId,
                      "receipt.json",
                    ),
                    "utf8",
                  ),
              ),
            catch: internal,
          }),
      },
    );

  const artifactPattern =
    /^attune:\/\/investigations\/([^/]+)\/artifacts\/([^/]+)\/([^/]+)\/(.+)$/u;
  const artifactContent = (
    uri: string,
  ): Effect.Effect<
    typeof McpSchema.ReadResourceResult.Type,
    McpSchema.InvalidParams | McpSchema.InternalError
  > => {
    const match = artifactPattern.exec(uri);
    if (match === null) return Effect.fail(invalid("invalid artifact URI"));
    const [investigationId, toolName, invocationId, path] = match.slice(1);
    if (
      investigationId === undefined ||
      toolName === undefined ||
      invocationId === undefined ||
      path === undefined ||
      path
        .split("/")
        .some((part) => part === "" || part === "." || part === "..")
    ) {
      return Effect.fail(invalid("invalid artifact parameters"));
    }
    return Effect.tryPromise({
      try: async (signal) => {
        const parsedId = decodeInvestigationId(investigationId);
        decodeToolName(toolName);
        decodeInvocationId(invocationId);
        const bytes = await workspaces.withMount(
          parsedId,
          signal,
          async ({ artifactsPath }) =>
            await readFile(
              await containedRegularFile(
                artifactsPath,
                `${toolName}/${invocationId}/${path}`,
              ),
            ),
        );
        const metadata = {
          uri,
          sha256: sha256(bytes),
          bytes: bytes.byteLength,
        };
        if (bytes.byteLength > config.inlineLimitBytes) {
          return {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: encode({
                  ...metadata,
                  failure: {
                    code: "ResourceTooLarge",
                    message: "artifact exceeds the inline resource budget",
                  },
                }),
              },
            ],
          };
        }
        const textLike =
          /\.(?:json|md|txt|log|diff|patch|maude|ts|ya?ml)$/u.test(path);
        return {
          contents: [
            textLike
              ? {
                  uri,
                  mimeType: "text/plain; charset=utf-8",
                  text: bytes.toString("utf8"),
                }
              : {
                  uri,
                  mimeType: "application/octet-stream",
                  blob: bytes,
                },
          ],
        };
      },
      catch: internal,
    });
  };

  const Artifact = Layer.effectDiscard(
    Effect.gen(function* () {
      const server = yield* McpServer.McpServer;
      yield* server.addResourceTemplate({
        annotations: Context.empty(),
        completions: {},
        handle: artifactContent,
        routerPath: "attune:://investigations/:0/artifacts/:1/:2/*",
        template: new McpSchema.ResourceTemplate({
          name: "Attune retained artifact",
          description: "One contained regular file; no listing or range API.",
          uriTemplate:
            "attune://investigations/{investigationId}/artifacts/{tool}/{invocationId}/{+path}",
        }),
      });
    }),
  );

  const Contracts = McpServer.resource({
    uri: "attune://contracts",
    name: "Attune frozen contracts",
    description: "Checked-in JSON Schema contract bundle and exact digest.",
    mimeType: "application/json",
    content: Effect.tryPromise({
      try: async () => {
        const [bundle, digest, bundleMetadata, digestMetadata] =
          await Promise.all([
            readFile(config.contractBundle, "utf8"),
            readFile(config.contractDigest, "utf8"),
            stat(config.contractBundle),
            stat(config.contractDigest),
          ]);
        if (!bundleMetadata.isFile() || !digestMetadata.isFile()) {
          throw fail(
            "ContractMismatch",
            "contract bundle and digest must be regular files",
          );
        }
        const computedDigest = sha256(bundle);
        if (digest.trim() !== computedDigest) {
          throw fail(
            "ContractMismatch",
            "contract digest does not match bytes",
            {
              expected: digest.trim(),
              observed: computedDigest,
            },
          );
        }
        const contract = JSON.parse(bundle) as unknown;
        return encode({
          sha256: computedDigest,
          contract,
        });
      },
      catch: internal,
    }),
  });

  return Layer.mergeAll(Metadata, Receipt, Artifact, Contracts);
};
