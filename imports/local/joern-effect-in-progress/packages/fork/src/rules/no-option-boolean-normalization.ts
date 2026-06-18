/**
 * Ban `Option.match(x, { onSome: (v) => v === true, onNone: () => false })`.
 *
 * Normalize at the schema boundary instead.
 *
 * Source: biome-effect-linting-rules/no-option-boolean-normalization
 */
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

export const noOptionBooleanNormalization = Rule.define({
  name: "no-option-boolean-normalization",
  meta: Rule.meta({
    type: "suggestion",
    description: "Avoid Option.match for boolean normalization. Normalize at schema boundary.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        if (!AST.isCallOf(node, "Option", "match")) return Effect.void;

        if (!("arguments" in node) || !Array.isArray(node.arguments) || node.arguments.length < 2)
          return Effect.void;

        const opts = node.arguments[1];
        if (opts == null || typeof opts !== "object" || !("type" in opts)) return Effect.void;
        if (
          opts.type !== "ObjectExpression" ||
          !("properties" in opts) ||
          !Array.isArray(opts.properties)
        )
          return Effect.void;

        let hasTripleEqualTrue = false;
        let hasReturnFalse = false;

        for (const prop of opts.properties) {
          if (
            prop == null ||
            typeof prop !== "object" ||
            !("type" in prop) ||
            prop.type !== "Property"
          )
            continue;
          const key = field(prop, "key");
          const value = field(prop, "value");

          if (!isAstRecord(key) || !isAstRecord(value)) continue;

          // onSome: (v) => v === true
          if (
            key["type"] === "Identifier" &&
            key["name"] === "onSome" &&
            value["type"] === "ArrowFunctionExpression" &&
            "body" in value
          ) {
            const body = field(value, "body");
            if (
              isAstRecord(body) &&
              body["type"] === "BinaryExpression" &&
              body["operator"] === "===" &&
              "right" in body
            ) {
              const right = field(body, "right");
              if (isAstRecord(right) && right["type"] === "Literal" && right["value"] === true) {
                hasTripleEqualTrue = true;
              }
            }
          }

          // onNone: () => false
          if (
            key["type"] === "Identifier" &&
            key["name"] === "onNone" &&
            value["type"] === "ArrowFunctionExpression" &&
            "body" in value
          ) {
            const body = field(value, "body");
            if (isAstRecord(body) && body["type"] === "Literal" && body["value"] === false) {
              hasReturnFalse = true;
            }
          }
        }

        if (hasTripleEqualTrue && hasReturnFalse) {
          return ctx.report(
            Diagnostic.make({
              node,
              message:
                "Avoid Option.match for boolean normalization. Normalize at schema boundary instead.",
            }),
          );
        }
        return Effect.void;
      },
    };
  },
});
