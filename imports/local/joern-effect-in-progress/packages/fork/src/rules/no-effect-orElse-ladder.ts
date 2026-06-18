/**
 * Ban `Effect.orElse` wrapping chains with sequencing combinators.
 *
 * Move error handling to a single terminal decision after the pipeline.
 *
 * Source: biome-effect-linting-rules/no-effect-orElse-ladder
 */
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

const sequencingCombinators = ["flatMap", "zipRight", "as", "tap", "andThen"];

const containsSequencing = (node: unknown): boolean => {
  if (!isAstRecord(node)) return false;
  if (node["type"] === "CallExpression" && "callee" in node) {
    const callee = field(node, "callee");
    if (
      isAstRecord(callee) &&
      callee["type"] === "MemberExpression" &&
      "object" in callee &&
      "property" in callee
    ) {
      const obj = field(callee, "object");
      const prop = field(callee, "property");
      if (
        isAstRecord(obj) &&
        obj["type"] === "Identifier" &&
        obj["name"] === "Effect" &&
        isAstRecord(prop) &&
        prop["type"] === "Identifier" &&
        typeof prop["name"] === "string" &&
        sequencingCombinators.includes(prop["name"])
      ) {
        return true;
      }
    }
    if ("arguments" in node && Array.isArray(node["arguments"])) {
      for (const arg of node["arguments"]) {
        if (containsSequencing(arg)) return true;
      }
    }
  }
  if ("body" in node) return containsSequencing(node["body"]);
  return false;
};

export const noEffectOrElseLadder = Rule.define({
  name: "no-effect-orElse-ladder",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Avoid Effect.orElse wrapping sequencing chains. Handle errors at a single terminal decision.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        if (!AST.isCallOf(node, "Effect", "orElse")) return Effect.void;

        if ("arguments" in node && Array.isArray(node.arguments)) {
          for (const arg of node.arguments) {
            if (containsSequencing(arg)) {
              return ctx.report(
                Diagnostic.make({
                  node,
                  message:
                    "Effect.orElse wrapping sequencing chain. Move error handling to a terminal decision after the pipeline.",
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
