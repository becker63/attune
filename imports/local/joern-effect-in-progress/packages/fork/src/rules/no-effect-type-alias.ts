/**
 * Ban `type X = Effect.Effect<...>` type aliases.
 *
 * Keep Effect types on service methods or inline at call site.
 *
 * Source: biome-effect-linting-rules/no-effect-type-alias
 */
import { Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

const containsEffectType = (node: unknown): boolean => {
  if (!isAstRecord(node)) return false;
  // TSTypeReference with Effect.Effect
  if (
    node["type"] === "TSTypeReference" &&
    "typeName" in node &&
    isAstRecord(node["typeName"])
  ) {
    const typeName = node["typeName"];
    if (typeName["type"] === "TSQualifiedName" && "left" in typeName && "right" in typeName) {
      const left = field(typeName, "left");
      const right = field(typeName, "right");
      if (
        isAstRecord(left) &&
        left["type"] === "Identifier" &&
        left["name"] === "Effect" &&
        isAstRecord(right) &&
        right["type"] === "Identifier" &&
        right["name"] === "Effect"
      ) {
        return true;
      }
    }
  }
  // Recurse into typeAnnotation, typeParameters
  if ("typeAnnotation" in node && containsEffectType(node["typeAnnotation"])) return true;
  if (
    "typeParameters" in node &&
    isAstRecord(node["typeParameters"])
  ) {
    const tp = node["typeParameters"];
    if ("params" in tp && Array.isArray(tp["params"])) {
      for (const p of tp["params"]) {
        if (containsEffectType(p)) return true;
      }
    }
  }
  return false;
};

export const noEffectTypeAlias = Rule.define({
  name: "no-effect-type-alias",
  meta: Rule.meta({
    type: "suggestion",
    description: "Avoid Effect type aliases. Keep Effect types on service methods or inline.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      TSTypeAliasDeclaration: (node) => {
        if ("typeAnnotation" in node && containsEffectType(node.typeAnnotation)) {
          return ctx.report(
            Diagnostic.make({
              node,
              message:
                "Avoid type alias wrapping Effect.Effect. Let Effect types flow from service methods.",
            }),
          );
        }
        return Effect.void;
      },
    };
  },
});
