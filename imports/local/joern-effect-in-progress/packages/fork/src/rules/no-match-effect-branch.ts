/**
 * Ban Match.when/orElse branches that contain multi-step Effect sequencing.
 *
 * Select the value in Match, then run one Effect pipeline outside.
 *
 * Source: biome-effect-linting-rules/no-match-effect-branch
 */
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

const sequencingMethods = new Set(["flatMap", "map", "andThen", "tap", "zipRight", "pipe"]);

const containsEffectSequencing = (node: unknown): boolean => {
  if (!isAstRecord(node)) return false;
  if (node["type"] === "CallExpression" && "callee" in node) {
    const callee = field(node, "callee");
    if (isAstRecord(callee) && callee["type"] === "MemberExpression") {
      const obj = field(callee, "object");
      const prop = field(callee, "property");
      if (
        isAstRecord(obj) &&
        obj["type"] === "Identifier" &&
        obj["name"] === "Effect" &&
        isAstRecord(prop) &&
        prop["type"] === "Identifier" &&
        typeof prop["name"] === "string" &&
        sequencingMethods.has(prop["name"])
      ) {
        return true;
      }
    }
    if ("arguments" in node && Array.isArray(node["arguments"])) {
      for (const arg of node["arguments"]) {
        if (containsEffectSequencing(arg)) return true;
      }
    }
  }
  if ("body" in node) {
    if (Array.isArray(node["body"])) {
      for (const child of node["body"]) {
        if (containsEffectSequencing(child)) return true;
      }
    } else if (containsEffectSequencing(node["body"])) return true;
  }
  if ("argument" in node && containsEffectSequencing(node["argument"])) return true;
  if ("expression" in node && containsEffectSequencing(node["expression"])) return true;
  return false;
};

export const noMatchEffectBranch = Rule.define({
  name: "no-match-effect-branch",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Avoid Effect sequencing inside Match branches. Select value in Match, run Effect outside.",
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

        // Check the callback argument for Effect sequencing
        const callbackIdx = isMatchWhen ? 1 : 0;
        const callback = node.arguments[callbackIdx];
        if (callback != null && containsEffectSequencing(callback)) {
          return ctx.report(
            Diagnostic.make({
              node,
              message:
                "Avoid Effect sequencing inside Match branches. Select value in Match, then run one Effect pipeline outside.",
            }),
          );
        }
        return Effect.void;
      },
    };
  },
});
