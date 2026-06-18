/**
 * Ban redundant `_tag` in `Schema.TaggedStruct("Foo", { _tag: Schema.Literal("Foo") })`.
 *
 * `TaggedStruct` already provides `_tag` automatically.
 *
 * Source: language-service/redundantSchemaTagIdentifier
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

export const noRedundantSchemaTagIdentifier = Rule.define({
  name: "no-redundant-schema-tag-identifier",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Redundant _tag in TaggedStruct. TaggedStruct already provides _tag automatically.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        const call = node;
        if (Option.isNone(AST.matchCallOf(call, "Schema", "TaggedStruct"))) return Effect.void;

        // TaggedStruct("tag", { fields })
        const args = call.arguments;
        if (args.length < 2) return Effect.void;
        const fieldsArg = args[1];
        if (fieldsArg === undefined) return Effect.void;
        if (fieldsArg.type !== "ObjectExpression") return Effect.void;

        const props = nodeArrayField(fieldsArg, "properties");
        if (props === undefined) return Effect.void;

        for (const prop of props) {
          if (prop.type !== "Property") continue;
          const key = nodeField(prop, "key");
          if (key === undefined) continue;
          if (isTagKey(key)) {
            return ctx.report(
              Diagnostic.make({
                node: prop,
                message:
                  "Redundant _tag property. Schema.TaggedStruct already provides _tag automatically.",
              }),
            );
          }
        }

        return Effect.void;
      },
    };
  },
});
