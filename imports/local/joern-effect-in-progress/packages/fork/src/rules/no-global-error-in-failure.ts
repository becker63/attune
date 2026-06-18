/**
 * Ban `new Error()` inside `Effect.fail()`.
 *
 * Use Schema.TaggedErrorClass or Data.TaggedError instead.
 *
 * Source: language-service/globalErrorInEffectFailure
 */
import type { ESTree } from "effect-oxlint";
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { nodeField } from "./_ast-record.js";

const nativeErrors = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "URIError",
  "EvalError",
]);

const isNativeErrorNew = (node: ESTree.Node): boolean => {
  if (node.type !== "NewExpression") return false;
  const callee = nodeField(node, "callee");
  if (callee === undefined) return false;
  return (
    callee.type === "Identifier" && "name" in callee && nativeErrors.has(callee.name)
  );
};

export const noGlobalErrorInFailure = Rule.define({
  name: "no-global-error-in-failure",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Avoid native Error in Effect.fail(). Use Schema.TaggedErrorClass or Data.TaggedError.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        const call = node;
        if (
          Option.isNone(AST.matchCallOf(call, "Effect", "fail")) &&
          Option.isNone(AST.matchCallOf(call, "Effect", "failSync")) &&
          Option.isNone(AST.matchCallOf(call, "Effect", "failCause"))
        ) {
          return Effect.void;
        }

        const args = call.arguments;
        if (args.length === 0) return Effect.void;

        // Check direct arg: Effect.fail(new Error(...))
        const arg = args[args.length - 1];
        if (arg === undefined) return Effect.void;
        if (isNativeErrorNew(arg)) {
          return ctx.report(
            Diagnostic.make({
              node: arg,
              message:
                "Avoid native Error in Effect.fail(). Use Schema.TaggedErrorClass or Data.TaggedError.",
            }),
          );
        }

        // Check arrow body: Effect.failSync(() => new Error(...))
        if (arg.type === "ArrowFunctionExpression") {
          const body = nodeField(arg, "body");
          if (body === undefined) return Effect.void;
          if (body.type !== "BlockStatement" && isNativeErrorNew(body)) {
            return ctx.report(
              Diagnostic.make({
                node: arg,
                message:
                  "Avoid native Error in Effect.failSync(). Use Schema.TaggedErrorClass or Data.TaggedError.",
              }),
            );
          }
        }

        return Effect.void;
      },
    };
  },
});
