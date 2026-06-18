/**
 * Ban `Effect.provide(layer)` used inline inside Effect.gen/fn.
 *
 * Provide layers at the boundary, not deep in generators.
 *
 * Source: biome-effect-linting-rules/no-inline-runtime-provide
 */
import { AST, Diagnostic, Rule, Visitor, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Ref from "effect/Ref";

import { makeEffectContextTracker } from "./_effect-context.js";

export const noInlineProvide = Rule.define({
  name: "no-inline-provide",
  meta: Rule.meta({
    type: "suggestion",
    description: "Avoid Effect.provide inside Effect.gen/fn. Provide layers at the boundary.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const [depth, tracker] = yield* makeEffectContextTracker;

    return Visitor.merge(tracker, {
      CallExpression: (node) =>
        Effect.flatMap(Ref.get(depth), (d) => {
          if (d <= 0) return Effect.void;
          if (node.type !== "CallExpression") return Effect.void;
          if (!AST.isCallOf(node, "Effect", "provide")) return Effect.void;

          return ctx.report(
            Diagnostic.make({
              node,
              message: "Avoid Effect.provide inside Effect.gen/fn. Provide layers at the boundary.",
            }),
          );
        }),
    });
  },
});
