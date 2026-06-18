/**
 * Ban `new Error()` inside Effect catch handlers.
 *
 * Catches: `.catchAll(e => new Error(...))`, `.catch(e => new Error(...))`
 * Use Schema.TaggedErrorClass or Data.TaggedError instead.
 *
 * Source: language-service/globalErrorInEffectCatch
 */
import type { ESTree } from "effect-oxlint";
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { nodeArrayField, nodeField } from "./_ast-record.js";

const nativeErrors = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
]);

const catchMethods = new Set([
  "catch",
  "catchAll",
  "catchAllCause",
  "catchIf",
  "catchCauseIf",
  "catchTag",
  "catchTags",
  "catchDefect",
]);

const isNativeErrorNew = (node: ESTree.Node): boolean => {
  if (node.type !== "NewExpression") return false;
  const callee = nodeField(node, "callee");
  if (callee === undefined) return false;
  return (
    callee.type === "Identifier" && "name" in callee && nativeErrors.has(callee.name)
  );
};

/**
 * Check if a function body returns `new Error(...)`.
 */
const bodyReturnsNativeError = (fn: ESTree.Node): boolean => {
  const body = nodeField(fn, "body");
  if (body === undefined) return false;
  // Arrow expression body: (e) => new Error(...)
  if (body.type !== "BlockStatement") {
    return isNativeErrorNew(body);
  }
  // Block body: (e) => { return new Error(...) }
  const stmts = nodeArrayField(body, "body");
  if (stmts?.length !== 1) return false;
  const stmt = stmts[0];
  if (stmt === undefined) return false;
  if (stmt.type !== "ReturnStatement") return false;
  const arg = nodeField(stmt, "argument");
  return arg !== undefined && isNativeErrorNew(arg);
};

export const noGlobalErrorInCatch = Rule.define({
  name: "no-global-error-in-catch",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Avoid native Error in Effect catch handlers. Use Schema.TaggedErrorClass or Data.TaggedError.",
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
        if (obj !== "Effect") return Effect.void;
        if (!catchMethods.has(prop)) return Effect.void;

        // The callback is the last argument
        const args = call.arguments;
        if (args.length === 0) return Effect.void;
        const callback = args[args.length - 1];
        if (callback === undefined) return Effect.void;
        if (callback.type !== "ArrowFunctionExpression" && callback.type !== "FunctionExpression") {
          return Effect.void;
        }

        if (bodyReturnsNativeError(callback)) {
          return ctx.report(
            Diagnostic.make({
              node: callback,
              message:
                "Avoid native Error in Effect catch handler. Use Schema.TaggedErrorClass or Data.TaggedError.",
            }),
          );
        }
        return Effect.void;
      },
    };
  },
});
