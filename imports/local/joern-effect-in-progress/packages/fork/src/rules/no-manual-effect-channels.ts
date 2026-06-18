/**
 * Ban manual `Effect.Effect<A, E, R>` type annotations.
 *
 * Let return types infer from the Effect/Layer you return.
 *
 * Source: biome-effect-linting-rules/no-manual-effect-channels
 */
import { Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

export const noManualEffectChannels = Rule.define({
  name: "no-manual-effect-channels",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Avoid manual Effect.Effect<A, E, R> annotations. Let types infer from the returned Effect.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      TSTypeReference: (node) => {
        if (!("typeName" in node) || node.typeName == null) return Effect.void;
        const typeName = node.typeName;

        // Effect.Effect<...> or Layer.Layer<...>
        if (typeName["type"] === "TSQualifiedName" && "left" in typeName && "right" in typeName) {
          const left = field(typeName, "left");
          const right = field(typeName, "right");
          if (
            isAstRecord(left) &&
            left["type"] === "Identifier" &&
            (left["name"] === "Effect" || left["name"] === "Layer") &&
            isAstRecord(right) &&
            right["type"] === "Identifier" &&
            (right["name"] === "Effect" || right["name"] === "Layer")
          ) {
            // Only flag if explicit type parameters are provided
            const typeParameters = field(node, "typeParameters");
            const params = isAstRecord(typeParameters) ? field(typeParameters, "params") : undefined;
            if (
              Array.isArray(params) &&
              params.length > 0
            ) {
              return ctx.report(
                Diagnostic.make({
                  node,
                  message:
                    "Avoid manual Effect/Layer channel annotations. Let types infer from the returned value.",
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
