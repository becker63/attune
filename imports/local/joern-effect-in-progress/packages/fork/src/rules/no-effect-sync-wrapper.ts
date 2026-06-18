/**
 * Warn on `Effect.sync(() => someCall(...))` wrapping a plain function call.
 *
 * Consider whether the wrapped call truly needs to be in Effect.sync.
 *
 * Source: biome-effect-linting-rules/warn-effect-sync-wrapper
 */
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

export const noEffectSyncWrapper = Rule.define({
  name: "no-effect-sync-wrapper",
  meta: Rule.meta({
    type: "suggestion",
    description: "Effect.sync wrapping a plain call. Consider if Effect.sync is necessary.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        if (!AST.isCallOf(node, "Effect", "sync")) return Effect.void;

        if (!("arguments" in node) || !Array.isArray(node.arguments) || node.arguments.length < 1)
          return Effect.void;

        const arg = node.arguments[0];
        if (arg == null || typeof arg !== "object" || !("type" in arg)) return Effect.void;

        // () => someCall(...)
        if (arg.type === "ArrowFunctionExpression" && "body" in arg) {
          const body = arg.body;
          if (
            body != null &&
            typeof body === "object" &&
            "type" in body &&
            body.type === "CallExpression"
          ) {
            // Exclude console.* (handled by no-effect-sync-console)
            const callee = field(body, "callee");
            if (
              isAstRecord(callee) &&
              "type" in callee &&
              callee["type"] === "MemberExpression" &&
              "object" in callee &&
              isAstRecord(callee["object"]) &&
              "name" in callee["object"] &&
              callee["object"]["name"] === "console"
            ) {
              return Effect.void;
            }

            return ctx.report(
              Diagnostic.make({
                node,
                message:
                  "Effect.sync wrapping a plain function call. Consider if Effect.sync is necessary.",
              }),
            );
          }
        }
        return Effect.void;
      },
    };
  },
});
