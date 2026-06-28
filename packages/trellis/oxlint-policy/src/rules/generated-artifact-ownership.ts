import * as Effect from "effect/Effect";
import { Rule, RuleContext, type ESTree } from "effect-oxlint";
import { report } from "./helpers.js";

export const generatedArtifactOwnershipMessage =
  "Generated artifact has no recipe owner. Declare ownership through Recipe/ManagedRecipe metadata and ensure generation/freshness emits a receipt.";

type JsonRecord = Record<string, unknown>;

const generatedArtifactPathPattern =
  /(?:\.generated\.[cm]?[jt]sx?$|\/generated\/|\/ResourceRegistry\.generated\.ts$|\/ToolRegistry\.generated\.ts$)/u;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const stringArray = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const normalizedPath = (filename: string): string =>
  filename.replaceAll("\\", "/");

const repoRelativePath = (filename: string): string => {
  const normalized = normalizedPath(filename);
  const packagesIndex = normalized.indexOf("/packages/");
  if (packagesIndex >= 0) return normalized.slice(packagesIndex + 1);
  return normalized.startsWith("/") ? normalized.slice(1) : normalized;
};

const isGeneratedArtifactPath = (filename: string): boolean =>
  generatedArtifactPathPattern.test(normalizedPath(filename));

const knownRecipeIds = (options: ReadonlyArray<unknown>): ReadonlySet<string> => {
  const first = options[0];
  if (!isRecord(first)) return new Set();
  const explicit = new Set(stringArray(first.knownRecipeIds));
  for (const recipe of stringArray(first.recipeIds)) explicit.add(recipe);
  const recipes = Array.isArray(first.recipes) ? first.recipes.filter(isRecord) : [];
  for (const recipe of recipes) {
    const recipeId = stringValue(recipe.recipeId) ?? stringValue(recipe.id);
    if (recipeId !== undefined) explicit.add(recipeId);
  }
  return explicit;
};

const recipeIdIsKnown = (
  recipeId: string | undefined,
  known: ReadonlySet<string>,
): boolean =>
  recipeId !== undefined && (known.size === 0 || known.has(recipeId));

const escapeRegex = (value: string): string =>
  value.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");

const patternMatches = (pattern: string, filename: string): boolean => {
  const path = repoRelativePath(filename);
  const normalizedPattern = normalizedPath(pattern);
  if (normalizedPattern.endsWith("/**")) {
    return path.startsWith(normalizedPattern.slice(0, -3));
  }
  if (normalizedPattern.includes("*")) {
    const regex = new RegExp(
      `^${escapeRegex(normalizedPattern).replaceAll("\\*", ".*")}$`,
      "u",
    );
    return regex.test(path);
  }
  return path === normalizedPattern || normalizedPath(filename) === normalizedPattern;
};

const recipesWithAllowedFiles = (
  options: ReadonlyArray<unknown>,
): ReadonlyArray<JsonRecord> => {
  const first = options[0];
  if (!isRecord(first)) return [];
  return Array.isArray(first.recipes) ? first.recipes.filter(isRecord) : [];
};

const hasRecipeAllowedFileOwner = (
  filename: string,
  options: ReadonlyArray<unknown>,
  known: ReadonlySet<string>,
): boolean =>
  recipesWithAllowedFiles(options).some((recipe) => {
    const recipeId = stringValue(recipe.recipeId) ?? stringValue(recipe.id);
    if (!recipeIdIsKnown(recipeId, known)) return false;
    return [
      ...stringArray(recipe.allowedFiles),
      ...stringArray(recipe.outputs),
      ...stringArray(recipe.outputFiles),
    ].some((pattern) => patternMatches(pattern, filename));
  });

const projectionRecords = (
  options: ReadonlyArray<unknown>,
): ReadonlyArray<JsonRecord> => {
  const first = options[0];
  if (!isRecord(first)) return [];
  return [
    ...(Array.isArray(first.projections) ? first.projections.filter(isRecord) : []),
    ...(Array.isArray(first.projectionOwnedFiles)
      ? first.projectionOwnedFiles.filter(isRecord)
      : []),
  ];
};

const hasProjectionOwner = (
  filename: string,
  options: ReadonlyArray<unknown>,
): boolean =>
  projectionRecords(options).some((projection) =>
    [
      ...stringArray(projection.files),
      ...stringArray(projection.allowedFiles),
      ...stringArray(projection.outputs),
    ].some((pattern) => patternMatches(pattern, filename)),
  );

const manifestEntries = (
  options: ReadonlyArray<unknown>,
): ReadonlyArray<readonly [string, JsonRecord]> => {
  const first = options[0];
  if (!isRecord(first)) return [];
  const manifest = first.generatedOwnershipManifest ?? first.generatedOwnership;
  if (isRecord(manifest)) {
    return Object.entries(manifest).flatMap(([path, owner]) =>
      isRecord(owner) ? [[path, owner] as const] : [],
    );
  }
  if (Array.isArray(manifest)) {
    return manifest.filter(isRecord).flatMap((entry) => {
      const path = stringValue(entry.path) ?? stringValue(entry.file);
      return path === undefined ? [] : [[path, entry] as const];
    });
  }
  return [];
};

const hasManifestOwner = (
  filename: string,
  options: ReadonlyArray<unknown>,
  known: ReadonlySet<string>,
): boolean =>
  manifestEntries(options).some(([path, owner]) => {
    if (!patternMatches(path, filename)) return false;
    const recipeId = stringValue(owner.recipeId) ?? stringValue(owner.recipe);
    const projectionId =
      stringValue(owner.projectionId) ?? stringValue(owner.projection);
    return recipeIdIsKnown(recipeId, known) || projectionId !== undefined;
  });

const headerRecipeId = (sourceText: string): string | undefined =>
  /@generated\s+by\s+recipe\s+([A-Za-z0-9_.:-]+)/u.exec(sourceText)?.[1];

const hasGeneratedHeaderOwner = (
  sourceText: string,
  known: ReadonlySet<string>,
): boolean => recipeIdIsKnown(headerRecipeId(sourceText), known);

export const generatedArtifactOwnedByRecipe = Rule.define({
  name: "generated-artifact-owned-by-recipe",
  meta: Rule.meta({
    type: "problem",
    description:
      "Require generated artifacts to identify a recipe or projection owner.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      Program: (node: ESTree.Node) => {
        if (!isGeneratedArtifactPath(ctx.filename)) return Effect.void;
        const known = knownRecipeIds(ctx.options);
        if (hasGeneratedHeaderOwner(ctx.sourceCode.text, known)) return Effect.void;
        if (hasRecipeAllowedFileOwner(ctx.filename, ctx.options, known)) {
          return Effect.void;
        }
        if (hasProjectionOwner(ctx.filename, ctx.options)) return Effect.void;
        if (hasManifestOwner(ctx.filename, ctx.options, known)) return Effect.void;
        return report(ctx, node, generatedArtifactOwnershipMessage);
      },
    };
  },
});
