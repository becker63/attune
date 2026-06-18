/**
 * Ban `Effect.catchAll(e => Effect.fail(f(e)))` — use `Effect.mapError(f)`.
 *
 * Source: language-service/catchAllToMapError
 */
import type { ESTree } from "effect-oxlint";
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { nodeArrayField, nodeField } from "./_ast-record.js";

const catchNames = new Set(["catchAll", "catchAllCause"]);

/**
 * Check if a node is `Effect.fail(...)` or `Effect.failCause(...)`.
 */
const isEffectFailCall = (node: ESTree.Node): boolean => {
  if (node.type !== "CallExpression") return false;
  const call = node;
  return (
    Option.isSome(AST.matchCallOf(call, "Effect", "fail")) ||
    Option.isSome(AST.matchCallOf(call, "Effect", "failCause"))
  );
};

/**
 * Check if a function body is a single `Effect.fail(...)` expression.
 * Handles: `(e) => Effect.fail(f(e))` and `(e) => { return Effect.fail(f(e)) }`
 */
const bodyIsEffectFail = (fn: ESTree.Node): boolean => {
  const bodyNode = nodeField(fn, "body");
  if (bodyNode === undefined) return false;
  // Arrow with expression body: (e) => Effect.fail(f(e))
  if (bodyNode.type !== "BlockStatement") {
    return isEffectFailCall(bodyNode);
  }
  // Block body with single return: (e) => { return Effect.fail(f(e)) }
  const stmts = nodeArrayField(bodyNode, "body");
  if (stmts?.length !== 1) return false;
  const stmt = stmts[0];
  if (stmt === undefined) return false;
  if (stmt.type !== "ReturnStatement") return false;
  const arg = nodeField(stmt, "argument");
  return arg !== undefined && isEffectFailCall(arg);
};

export const noCatchAllToMapError = Rule.define({
  name: "no-catch-all-to-map-error",
  meta: Rule.meta({
    type: "suggestion",
    description: "Use Effect.mapError instead of Effect.catchAll(e => Effect.fail(f(e))).",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        const call = node;
        if (call.callee.type !== "MemberExpression") return Effect.void;
        const names = Option.getOrUndefined(AST.memberNames(call.callee));
        if (names === undefined) return Effect.void;
        const [obj, prop] = names;
        if (obj !== "Effect" && obj !== "_") return Effect.void;
        if (!catchNames.has(prop)) return Effect.void;

        // The callback is the last argument
        const args = call.arguments;
        if (args.length === 0) return Effect.void;
        const callback = args[args.length - 1];
        if (callback === undefined) return Effect.void;
        if (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression") {
          return Effect.void;
        }

        if (bodyIsEffectFail(callback)) {
          const replacement = prop === "catchAllCause" ? "mapErrorCause" : "mapError";
          return ctx.report(
            Diagnostic.make({
              node,
              message: `Use Effect.${replacement} instead of Effect.${prop}(e => Effect.fail(...)).`,
            }),
          );
        }
        return Effect.void;
      },
    };
  },
});
