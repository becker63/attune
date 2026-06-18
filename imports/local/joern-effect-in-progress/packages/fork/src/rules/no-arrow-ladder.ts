/**
 * Ban nested IIFE chains — `((x) => ((y) => ...)(arg2))(arg1)`.
 *
 * Use named const bindings + flat pipeline.
 *
 * Source: biome-effect-linting-rules/no-arrow-ladder
 */
import { Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

const isIife = (node: unknown): boolean => {
  if (!isAstRecord(node) || node["type"] !== "CallExpression") return false;
  const callee = field(node, "callee");
  return isAstRecord(callee) && (callee["type"] === "ArrowFunctionExpression" || callee["type"] === "FunctionExpression");
};

const containsIife = (node: unknown): boolean => {
  if (!isAstRecord(node)) return false;
  if (isIife(node)) return true;
  if ("body" in node) {
    if (Array.isArray(node["body"])) {
      for (const child of node["body"]) {
        if (containsIife(child)) return true;
      }
    } else if (containsIife(node["body"])) return true;
  }
  if ("argument" in node && containsIife(node["argument"])) return true;
  if ("arguments" in node && Array.isArray(node["arguments"])) {
    for (const arg of node["arguments"]) {
      if (containsIife(arg)) return true;
    }
  }
  if ("expression" in node && containsIife(node["expression"])) return true;
  return false;
};

export const noArrowLadder = Rule.define({
  name: "no-arrow-ladder",
  meta: Rule.meta({
    type: "suggestion",
    description: "Avoid nested IIFE chains. Use named const bindings + flat pipeline.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        if (!isIife(node)) return Effect.void;

        // Check if the body of the IIFE itself contains another IIFE
        const callee = field(node, "callee");
        if (isAstRecord(callee) && "body" in callee && containsIife(callee["body"])) {
          return ctx.report(
            Diagnostic.make({
              node,
              message: "Nested IIFE chain detected. Use named const bindings + flat pipeline.",
            }),
          );
        }
        return Effect.void;
      },
    };
  },
});
