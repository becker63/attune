/**
 * Ban nested `Effect.flatMap` calls (flatMap ladder).
 *
 * Build context once with `Effect.all`/`Effect.map` and run a single flatMap.
 *
 * Source: biome-effect-linting-rules/no-flatmap-ladder
 */
import type { ESTree } from "effect-oxlint";
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { isAstNode, isAstRecord } from "./_ast-record.js";

const isEffectFlatMap = (node: ESTree.CallExpression): boolean =>
  AST.isCallOf(node, "Effect", "flatMap");

const containsEffectFlatMap = (node: unknown): boolean => {
  if (!isAstRecord(node)) return false;
  if (isAstNode(node) && node.type === "CallExpression") {
    if (isEffectFlatMap(node)) return true;
  }
  if ("arguments" in node && Array.isArray(node["arguments"])) {
    for (const arg of node["arguments"]) {
      if (containsEffectFlatMap(arg)) return true;
    }
  }
  if ("body" in node) return containsEffectFlatMap(node["body"]);
  return false;
};

export const noFlatmapLadder = Rule.define({
  name: "no-flatmap-ladder",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Avoid nested Effect.flatMap (flatMap ladder). Build context once with Effect.all and run a single flatMap.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        const ce = node;
        if (!isEffectFlatMap(ce)) return Effect.void;
        if (!("arguments" in ce) || !Array.isArray(ce.arguments)) return Effect.void;

        // Check if any argument's subtree contains another Effect.flatMap
        for (const arg of ce.arguments) {
          if (arg != null && typeof arg === "object" && "type" in arg) {
            if (arg.type === "CallExpression" && isEffectFlatMap(arg)) {
              return ctx.report(
                Diagnostic.make({
                  node,
                  message:
                    "Nested Effect.flatMap detected. Build context with Effect.all, then single flatMap.",
                }),
              );
            }
            // Check inside arrow/function body
            if (
              (arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression") &&
              "body" in arg &&
              containsEffectFlatMap(arg.body)
            ) {
              return ctx.report(
                Diagnostic.make({
                  node,
                  message:
                    "Nested Effect.flatMap detected. Build context with Effect.all, then single flatMap.",
                }),
              );
            }
          }
        }
        return Effect.void;
      },
    };
  },
});
