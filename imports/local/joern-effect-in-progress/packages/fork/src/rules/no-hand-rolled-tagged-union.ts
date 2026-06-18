/**
 * Ban inline hand-rolled `_tag` discriminated unions.
 *
 * Use Schema.TaggedUnion / Schema.TaggedStruct / Schema.TaggedErrorClass so
 * constructors, encode/decode, and tag discrimination share one schema source.
 */
import type { ESTree } from "effect-oxlint";
import { Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { nodeArrayField, nodeField, stringField } from "./_ast-record.js";

const getPropertyKeyName = (node: ESTree.Node): string | undefined => {
  if (node.type === "Identifier" || node.type === "Literal") {
    return stringField(node, "name") ?? stringField(node, "value");
  }
  return undefined;
};

const isPascalCaseTag = (value: string): boolean => {
  if (value.length === 0) return false;
  const first = value.charAt(0);
  return first === first.toUpperCase() && first !== first.toLowerCase();
};

const isReportableTagLiteral = (member: ESTree.Node): boolean => {
  if (member.type !== "TSPropertySignature") return false;
  const key = nodeField(member, "key");
  if (key === undefined || getPropertyKeyName(key) !== "_tag") return false;

  const annotation = nodeField(member, "typeAnnotation");
  const inner = annotation === undefined ? undefined : nodeField(annotation, "typeAnnotation");
  if (inner?.type !== "TSLiteralType") return false;

  const literal = nodeField(inner, "literal");
  if (literal === undefined) return false;
  if (literal.type !== "Literal") return false;

  const value = stringField(literal, "value");
  return value !== undefined && isPascalCaseTag(value);
};

const literalHasTag = (node: ESTree.Node): boolean => {
  if (node.type !== "TSTypeLiteral") return false;
  const members = nodeArrayField(node, "members");
  return members !== undefined && members.some(isReportableTagLiteral);
};

export const noHandRolledTaggedUnion = Rule.define({
  name: "no-hand-rolled-tagged-union",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Use Schema.TaggedUnion, Schema.TaggedStruct, or Schema.TaggedErrorClass instead of inline _tag union literals.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      TSUnionType: (node: ESTree.Node) => {
        const types = nodeArrayField(node, "types");
        if (types === undefined || types.length < 2) return Effect.void;

        let tagged = 0;
        for (const type of types) {
          if (literalHasTag(type)) tagged += 1;
          if (tagged >= 2) {
            return ctx.report(
              Diagnostic.make({
                node,
                message:
                  "Hand-rolled `_tag` discriminated union. Use Schema.TaggedUnion, Schema.TaggedStruct, or Schema.TaggedErrorClass instead.",
              }),
            );
          }
        }

        return Effect.void;
      },
    };
  },
});
