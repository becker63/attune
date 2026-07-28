/**
 * Stable docs-local import for the private TypeScript 5 Twoslash toolchain.
 *
 * Keeping this seam lets the renderer remain unaware of the compatibility
 * package and prevents Twoslash peers from resolving against the repository's
 * TypeScript 7 compiler.
 */
import {
  createTwoslashSession as createBoundarySession,
  type TwoslashSession,
  type TwoslashSessionOptions,
} from "@attune/twoslash";

const declarationPackages = {
  "attune-mcp": "packages/attune-mcp/dist/index.d.mts",
  effect: "packages/attune-mcp/node_modules/effect/dist/index.d.ts",
  "effect/unstable/ai":
    "packages/attune-mcp/node_modules/effect/dist/unstable/ai/index.d.ts",
} as const;

/**
 * Resolve public examples against the declaration bundle already audited by
 * the docs build. The bundle remains a single file-backed package project
 * rather than being duplicated into each Twoslash virtual program.
 */
export const createTwoslashSession = (
  options: TwoslashSessionOptions,
): TwoslashSession =>
  createBoundarySession({
    ...options,
    declarationPackages: {
      ...declarationPackages,
      ...options.declarationPackages,
    },
  });

export {
  twoslashRichStylePath,
  twoslashTransformer,
  twoslashTypeScriptVersion,
  type TwoslashIdentifierLink,
} from "@attune/twoslash";
export type { TwoslashSession, TwoslashSessionOptions };
