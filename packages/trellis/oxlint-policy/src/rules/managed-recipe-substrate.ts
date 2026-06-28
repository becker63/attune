import { pipe } from "effect/Function";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { AST, Rule, RuleContext, type ESTree } from "effect-oxlint";
import { report } from "./helpers.js";

export const managedRecipeSubstrateMessage =
  "ManagedRecipe lacks lifecycle substrate/provenance. ManagedRecipe must either route through Alchemy or declare explicit lifecycle substrate, validation evidence, drift repair, observed state, and review gates.";

const managedRecipeFactoryNames = new Set([
  "defineManagedRecipe",
  "defineExternalSchemaManagedRecipe",
  "defineManagedExecutableRecipe",
]);

const requiredFields = [
  "id",
  "projectId",
  "title",
  "inputSchema",
  "outputSchema",
  "lifecycle",
  "resourceKind",
  "validationEvidence",
  "humanReviewRequired",
] as const;

const substrateFields = [
  "lifecycleSubstrates",
  "lifecycleSubstrate",
  "alchemyBridge",
  "alchemyProvider",
  "alchemyResource",
] as const;

const observationFields = [
  "observedState",
  "observationMetadata",
  "observationProjection",
  "observations",
] as const;

const repairFields = [
  "driftRepair",
  "noRepairRationale",
  "driftRepairRationale",
  "repairRationale",
] as const;

const calleeName = (callee: ESTree.Node): string | undefined => {
  if (callee.type === "Identifier") return callee.name;
  return pipe(
    AST.narrow(callee, "MemberExpression"),
    Option.flatMap(AST.memberPath),
    Option.map((path) => path.at(-1)),
    Option.getOrUndefined,
  );
};

const propertyName = (property: ESTree.Node): string | undefined => {
  if (property.type !== "Property") return undefined;
  const key = property.key;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return undefined;
};

const objectPropertyNames = (
  objectExpression: ESTree.ObjectExpression,
): ReadonlySet<string> =>
  new Set(
    objectExpression.properties
      .map((property) => propertyName(property as ESTree.Node))
      .filter((name): name is string => name !== undefined),
  );

const hasAnyField = (
  fieldNames: ReadonlySet<string>,
  candidates: readonly string[],
): boolean => candidates.some((candidate) => fieldNames.has(candidate));

const hasRequiredManagedRecipeSubstrate = (
  objectExpression: ESTree.ObjectExpression,
): boolean => {
  const fieldNames = objectPropertyNames(objectExpression);
  return (
    requiredFields.every((field) => fieldNames.has(field)) &&
    hasAnyField(fieldNames, substrateFields) &&
    hasAnyField(fieldNames, observationFields) &&
    hasAnyField(fieldNames, repairFields)
  );
};

const managedRecipeObjectArgument = (
  call: ESTree.CallExpression,
): ESTree.ObjectExpression | undefined => {
  const firstArgument = call.arguments[0];
  return firstArgument?.type === "ObjectExpression" ? firstArgument : undefined;
};

export const managedRecipeRequiresSubstrate = Rule.define({
  name: "managed-recipe-requires-substrate",
  meta: Rule.meta({
    type: "problem",
    description:
      "Require ManagedRecipe declarations to carry lifecycle substrate and provenance metadata.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node: ESTree.Node) => {
        const call = node as ESTree.CallExpression;
        const name = calleeName(call.callee);
        if (name === undefined || !managedRecipeFactoryNames.has(name)) {
          return Effect.void;
        }
        const objectArgument = managedRecipeObjectArgument(call);
        if (objectArgument === undefined) {
          return report(ctx, node, managedRecipeSubstrateMessage);
        }
        if (hasRequiredManagedRecipeSubstrate(objectArgument)) {
          return Effect.void;
        }
        return report(ctx, node, managedRecipeSubstrateMessage);
      },
    };
  },
});
