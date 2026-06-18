/**
 * Ban wrapper functions that just alias an Effect.fn or pipe(Effect.fn(...)).
 *
 * Inline the pipeline at the call site or define a real domain function.
 *
 * Source: biome-effect-linting-rules/no-effect-wrapper-alias
 */
import { Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

const isEffectFnCall = (node: unknown): boolean => {
  if (!isAstRecord(node) || node["type"] !== "CallExpression") return false;
  const callee = field(node, "callee");
  if (!isAstRecord(callee) || callee["type"] !== "MemberExpression") return false;
  const obj = field(callee, "object");
  const prop = field(callee, "property");
  return (
    isAstRecord(obj) &&
    obj["type"] === "Identifier" &&
    obj["name"] === "Effect" &&
    isAstRecord(prop) &&
    prop["type"] === "Identifier" &&
    prop["name"] === "fn"
  );
};

const isPipeWrappingEffectFn = (node: unknown): boolean => {
  if (!isAstRecord(node) || node["type"] !== "CallExpression") return false;
  const callee = field(node, "callee");
  if (!isAstRecord(callee) || !(callee["type"] === "Identifier" && callee["name"] === "pipe")) return false;
  const args = field(node, "arguments");
  if (!Array.isArray(args) || args.length === 0) return false;
  return isEffectFnCall(args[0]);
};

export const noEffectWrapperAlias = Rule.define({
  name: "no-effect-wrapper-alias",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Avoid wrapper functions aliasing Effect.fn. Inline or define a real domain function.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      VariableDeclarator: (node) => {
        if (!("init" in node) || node.init == null) return Effect.void;
        const init = node.init;

        // const x = Effect.fn(...)
        if (isEffectFnCall(init)) {
          return ctx.report(
            Diagnostic.make({
              node,
              message:
                "Avoid aliasing Effect.fn. Inline the pipeline or define a real domain function.",
            }),
          );
        }

        // const x = pipe(Effect.fn(...), ...)
        if (isPipeWrappingEffectFn(init)) {
          return ctx.report(
            Diagnostic.make({
              node,
              message:
                "Avoid wrapping Effect.fn in pipe. Inline the pipeline or define a real domain function.",
            }),
          );
        }

        // const x = () => Effect.fn(...)  or  const x = () => pipe(Effect.fn(...))
        if (
          typeof init === "object" &&
          "type" in init &&
          (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") &&
          "body" in init
        ) {
          const body = init.body;
          if (isEffectFnCall(body) || isPipeWrappingEffectFn(body)) {
            return ctx.report(
              Diagnostic.make({
                node,
                message:
                  "Avoid wrapper function aliasing Effect.fn. Inline or define a real domain function.",
              }),
            );
          }
        }

        return Effect.void;
      },
    };
  },
});
