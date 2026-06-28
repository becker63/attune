import * as Effect from "effect/Effect";
import { Diagnostic, type ESTree } from "effect-oxlint";

const approvedAdapterPathFragments = [
  "/src/platform/",
  "/src/adapters/",
  "/src/adapter/",
  "/src/infrastructure/",
  "/src/runtime/",
  "/scripts/",
] as const;

export const isApprovedAdapterFile = (filename: string): boolean =>
  approvedAdapterPathFragments.some((fragment) =>
    filename.includes(fragment),
  ) ||
  filename.endsWith(".config.ts") ||
  filename.endsWith(".config.mts") ||
  filename.endsWith("/vite.config.ts") ||
  filename.endsWith("/vitest.config.ts");

export const report = (
  ctx: {
    readonly report: (
      diagnostic: ReturnType<typeof Diagnostic.make>,
    ) => Effect.Effect<void>;
  },
  node: ESTree.Node,
  message: string,
) => ctx.report(Diagnostic.make({ node, message }));
