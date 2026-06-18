/**
 * Ban nested `pipe()` calls — `pipe(pipe(...), ...)` or `.pipe(...).pipe(...)`.
 *
 * Flatten into a single pipeline.
 *
 * Sources: biome-effect-linting-rules/no-pipe-ladder, language-service/unnecessaryPipeChain
 */
import type { ESTree } from "effect-oxlint";
import { Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstNode, isAstRecord } from "./_ast-record.js";

const isPipeCall = (node: ESTree.Node): boolean => {
  if (node.type === "CallExpression" && "callee" in node) {
    const callee = field(node, "callee");
    if (isAstRecord(callee) && "type" in callee) {
      // pipe(...)
      if (callee["type"] === "Identifier" && "name" in callee && callee["name"] === "pipe") {
        return true;
      }
      // x.pipe(...)
      if (
        callee["type"] === "MemberExpression" &&
        "property" in callee &&
        isAstRecord(callee["property"]) &&
        callee["property"]["type"] === "Identifier" &&
        callee["property"]["name"] === "pipe"
      ) {
        return true;
      }
    }
  }
  return false;
};

export const noNestedPipe = Rule.define({
  name: "no-nested-pipe",
  meta: Rule.meta({
    type: "suggestion",
    description: "Avoid nested pipe() calls. Flatten into a single pipeline.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        if (!isPipeCall(node)) return Effect.void;

        // Check if any argument is itself a pipe call
        if ("arguments" in node && Array.isArray(node.arguments)) {
          for (const arg of node.arguments) {
            if (
              isAstNode(arg) &&
              isPipeCall(arg)
            ) {
              return ctx.report(
                Diagnostic.make({
                  node: arg,
                  message: "Nested pipe() detected. Flatten into a single pipeline.",
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
