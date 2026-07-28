/**
 * Stable docs-local import for the private TypeScript 5 Twoslash toolchain.
 *
 * Keeping this one-line seam lets the renderer remain unaware of the
 * compatibility package and prevents Twoslash peers from resolving against the
 * repository's TypeScript 7 compiler.
 */
export {
  twoslashRichStylePath,
  twoslashTransformer,
  twoslashTypeScriptVersion,
} from "@attune/twoslash";
