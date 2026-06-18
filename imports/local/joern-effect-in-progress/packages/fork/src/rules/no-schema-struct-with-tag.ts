/**
 * Ban `Schema.Struct({ _tag: Schema.Literal("Foo"), ... })`.
 * Use `Schema.TaggedStruct("Foo", { ... })` instead.
 *
 * Source: language-service/schemaStructWithTag
 */
import type { ESTree } from "effect-oxlint";
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { nodeArrayField, nodeField } from "./_ast-record.js";

const isTagKey = (key: ESTree.Node): boolean => {
  if (key.type === "Identifier" && "name" in key && key.name === "_tag") return true;
  if (key.type === "Literal" && "value" in key && key.value === "_tag") return true;
  return false;
};

export const noSchemaStructWithTag = Rule.define({
  name: "no-schema-struct-with-tag",
  meta: Rule.meta({
    type: "suggestion",
    description:
      'Use Schema.TaggedStruct("Tag", { ... }) instead of Schema.Struct({ _tag: Schema.Literal("Tag"), ... }).',
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        const call = node;
        if (Option.isNone(AST.matchCallOf(call, "Schema", "Struct"))) return Effect.void;

        const args = call.arguments;
        if (args.length !== 1) return Effect.void;
        const arg = args[0];
        if (arg === undefined) return Effect.void;
        if (arg.type !== "ObjectExpression") return Effect.void;

        const props = nodeArrayField(arg, "properties");
        if (props === undefined) return Effect.void;

        for (const prop of props) {
          if (prop.type !== "Property") continue;
          const key = nodeField(prop, "key");
          if (key === undefined) continue;
          if (!isTagKey(key)) continue;

          // Check value is Schema.Literal(...)
          const value = nodeField(prop, "value");
          if (value === undefined) continue;
          if (
            value.type === "CallExpression" &&
            Option.isSome(AST.matchCallOf(value, "Schema", "Literal"))
          ) {
            return ctx.report(
              Diagnostic.make({
                node,
                message:
                  'Use Schema.TaggedStruct("Tag", { ... }) instead of Schema.Struct({ _tag: Schema.Literal(...), ... }).',
              }),
            );
          }
        }

        return Effect.void;
      },
    };
  },
});
