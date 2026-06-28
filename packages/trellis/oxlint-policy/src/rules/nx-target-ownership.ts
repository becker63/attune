import * as Effect from "effect/Effect";
import { Diagnostic, Rule, RuleContext, type ESTree } from "effect-oxlint";

export const recipeOwnedNxTargetMessage =
  "Public Nx target is not owned by a Recipe/ManagedRecipe projection. Add recipe metadata or derive this target from the ProjectionRegistry.";

const conventionalPublicTargetNames = new Set([
  "check",
  "repair",
  "generate",
  "check-generated",
  "fuzz",
  "proof",
  "plan",
  "apply",
  "destroy",
  "migrate",
  "validate-sql",
  "generate-types",
]);

type JsonRecord = Record<string, unknown>;

interface TargetFinding {
  readonly targetName: string;
  readonly inferredRecipeId?: string;
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const recordValue = (record: JsonRecord, key: string): JsonRecord | undefined => {
  const value = record[key];
  return isRecord(value) ? value : undefined;
};

const projectJsonPattern = /(?:^|\/)project\.json$/;

const isProjectJsonFile = (filename: string): boolean =>
  projectJsonPattern.test(filename.replaceAll("\\", "/"));

const parseJson = (sourceText: string): JsonRecord | undefined => {
  try {
    const parsed = JSON.parse(sourceText) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const projectNameFromFilename = (filename: string): string | undefined => {
  const normalized = filename.replaceAll("\\", "/");
  const parent = normalized.split("/").at(-2);
  return parent === undefined || parent === "." ? undefined : parent;
};

const attuneMetadata = (target: JsonRecord): JsonRecord | undefined =>
  recordValue(recordValue(target, "metadata") ?? {}, "attune");

const targetOptions = (target: JsonRecord): JsonRecord | undefined =>
  recordValue(target, "options");

const targetParameters = (target: JsonRecord): JsonRecord | undefined => {
  const options = targetOptions(target);
  return options === undefined ? undefined : recordValue(options, "parameters");
};

const hasRecipeOrProjectionOwner = (target: JsonRecord): boolean => {
  const metadata = attuneMetadata(target);
  const options = targetOptions(target);
  const parameters = targetParameters(target);
  return (
    stringValue(metadata?.recipeId) !== undefined ||
    stringValue(metadata?.projectionId) !== undefined ||
    stringValue(options?.recipeId) !== undefined ||
    stringValue(options?.projectionId) !== undefined ||
    stringValue(parameters?.recipeId) !== undefined ||
    stringValue(parameters?.projectionId) !== undefined ||
    stringValue(parameters?.["attune.recipeId"]) !== undefined
  );
};

const publicParentTarget = (target: JsonRecord): string | undefined => {
  const metadata = attuneMetadata(target);
  return (
    stringValue(metadata?.publicParent) ??
    stringValue(metadata?.publicParentTarget) ??
    stringValue(metadata?.parentTarget)
  );
};

const isRecipeInvocationExecutor = (target: JsonRecord): boolean => {
  const executor = stringValue(target.executor);
  const parameters = targetParameters(target);
  return (
    executor?.includes("recipe") === true &&
    stringValue(parameters?.recipeId) !== undefined
  );
};

const isPublicTarget = (targetName: string, target: JsonRecord): boolean => {
  const metadata = attuneMetadata(target);
  return (
    conventionalPublicTargetNames.has(targetName) ||
    metadata?.tier === "public" ||
    metadata?.surface === "public"
  );
};

const isInternalTargetWithPublicParent = (
  targetName: string,
  target: JsonRecord,
  targets: JsonRecord,
): boolean => {
  const metadata = attuneMetadata(target);
  if (metadata?.tier !== "internal") return false;
  const explicitParent = publicParentTarget(target);
  if (explicitParent !== undefined) return isRecord(targets[explicitParent]);
  return targetName.startsWith("attune:repair-") && isRecord(targets.repair);
};

const recipeTargetEntries = (
  options: ReadonlyArray<unknown>,
): ReadonlyArray<JsonRecord> => {
  const first = options[0];
  if (!isRecord(first)) return [];
  const explicit = first.recipeTargets ?? first.recipes;
  return Array.isArray(explicit) ? explicit.filter(isRecord) : [];
};

const inferUniqueRecipeId = (
  options: ReadonlyArray<unknown>,
  projectName: string | undefined,
  targetName: string,
): string | undefined => {
  const names = new Set([
    targetName,
    ...(projectName === undefined ? [] : [`${projectName}:${targetName}`]),
  ]);
  const matches = recipeTargetEntries(options)
    .filter((entry) => {
      const target = stringValue(entry.nxTarget) ?? stringValue(entry.target);
      return target !== undefined && names.has(target);
    })
    .map((entry) => stringValue(entry.recipeId))
    .filter((recipeId): recipeId is string => recipeId !== undefined);

  return new Set(matches).size === 1 ? matches[0] : undefined;
};

const findingsForProjectJson = (
  projectJson: JsonRecord,
  options: ReadonlyArray<unknown>,
  filename: string,
): ReadonlyArray<TargetFinding> => {
  const targets = recordValue(projectJson, "targets");
  if (targets === undefined) return [];
  const projectName =
    stringValue(projectJson.name) ?? projectNameFromFilename(filename);
  return Object.entries(targets).flatMap(([targetName, target]) => {
    if (!isRecord(target)) return [];
    if (isInternalTargetWithPublicParent(targetName, target, targets)) return [];
    if (!isPublicTarget(targetName, target)) return [];
    if (hasRecipeOrProjectionOwner(target) || isRecipeInvocationExecutor(target)) {
      return [];
    }
    const inferredRecipeId = inferUniqueRecipeId(options, projectName, targetName);
    return [{
      targetName,
      ...(inferredRecipeId === undefined ? {} : { inferredRecipeId }),
    }];
  });
};

const diagnosticForFinding = (
  node: ESTree.Node,
  finding: TargetFinding,
) =>
  Diagnostic.make({
    node,
    message:
      finding.inferredRecipeId === undefined
        ? recipeOwnedNxTargetMessage
        : `${recipeOwnedNxTargetMessage} Unique recipe owner can be inferred: ${finding.inferredRecipeId}.`,
    data: {
      targetName: finding.targetName,
      ...(finding.inferredRecipeId === undefined
        ? {}
        : { inferredRecipeId: finding.inferredRecipeId }),
    },
  });

export const recipeOwnedNxTarget = Rule.define({
  name: "recipe-owned-nx-target",
  meta: Rule.meta({
    type: "problem",
    description:
      "Require public Nx workflow targets to be recipe-owned or projection-owned.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      Program: (node: ESTree.Node) => {
        if (!isProjectJsonFile(ctx.filename)) return Effect.void;
        const projectJson = parseJson(ctx.sourceCode.text);
        if (projectJson === undefined) return Effect.void;
        const findings = findingsForProjectJson(
          projectJson,
          ctx.options,
          ctx.filename,
        );
        return Effect.forEach(
          findings,
          (finding) => ctx.report(diagnosticForFinding(node, finding)),
        ).pipe(Effect.asVoid);
      },
    };
  },
});
