/**
 * Ban `Match.when(true/false, () => Effect.void)` and `Match.orElse(() => Effect.void)`.
 *
 * Remove the no-op branch or restructure.
 *
 * Source: biome-effect-linting-rules/no-match-void-branch
 */
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

const isEffectVoid = (node: unknown): boolean => {
  if (!isAstRecord(node) || node["type"] !== "MemberExpression") return false;
  const obj = field(node, "object");
  const prop = field(node, "property");
  return (
    isAstRecord(obj) &&
    obj["type"] === "Identifier" &&
    obj["name"] === "Effect" &&
    isAstRecord(prop) &&
    prop["type"] === "Identifier" &&
    prop["name"] === "void"
  );
};

const isVoidCallback = (node: unknown): boolean => {
  if (!isAstRecord(node)) return false;
  if (node["type"] !== "ArrowFunctionExpression" && node["type"] !== "FunctionExpression") return false;
  if (!("body" in node)) return false;
  return isEffectVoid(node["body"]);
};

export const noMatchVoidBranch = Rule.define({
  name: "no-match-void-branch",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Avoid no-op Match branches returning Effect.void. Remove the branch or restructure.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        const ce = node;
        const isMatchWhen = AST.isCallOf(ce, "Match", "when");
        const isMatchOrElse = AST.isCallOf(ce, "Match", "orElse");

        if (!isMatchWhen && !isMatchOrElse) return Effect.void;

        if (!("arguments" in node) || !Array.isArray(node.arguments)) return Effect.void;

        if (isMatchOrElse && node.arguments.length >= 1 && isVoidCallback(node.arguments[0])) {
          return ctx.report(
            Diagnostic.make({
              node,
              message:
                "Match.orElse returning Effect.void is a no-op. Remove the branch or restructure.",
            }),
          );
        }

        if (isMatchWhen && node.arguments.length >= 2 && isVoidCallback(node.arguments[1])) {
          return ctx.report(
            Diagnostic.make({
              node,
              message:
                "Match.when branch returning Effect.void is a no-op. Remove the branch or restructure.",
            }),
          );
        }

        return Effect.void;
      },
    };
  },
});
