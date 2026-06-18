/**
 * Ban `new Promise()`. Context-aware messaging.
 *
 * Inside Effect.gen/fn: "Use Effect.tryPromise or Effect.async"
 * Outside: "Use Effect.tryPromise or wrap with Effect.fn"
 *
 * Source: language-service/newPromise
 */
import { Diagnostic, Rule, Visitor, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import * as Ref from "effect/Ref";

import { makeEffectContextTracker } from "./_effect-context.js";
import { nodeField } from "./_ast-record.js";

export const noNewPromise = Rule.define({
  name: "no-new-promise",
  meta: Rule.meta({
    type: "suggestion",
    description: "Avoid new Promise(). Use Effect.async or Effect.tryPromise.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const [depth, tracker] = yield* makeEffectContextTracker;

    return Visitor.merge(tracker, {
      NewExpression: (node) =>
        Effect.flatMap(Ref.get(depth), (d) => {
          const callee = nodeField(node, "callee");
          if (
            callee !== undefined &&
            "type" in callee &&
            callee.type === "Identifier" &&
            "name" in callee &&
            callee.name === "Promise"
          ) {
            return ctx.report(
              Diagnostic.make({
                node,
                message:
                  d > 0
                    ? "Avoid new Promise() inside Effect.gen/fn. Use Effect.async for callback APIs, Effect.tryPromise for existing promises, or Effect.promise for infallible promises."
                    : "Avoid new Promise(). Use Effect.async for callback APIs, Effect.tryPromise for existing promises — wrap this function with Effect.fn.",
              }),
            );
          }
          return Effect.void;
        }),
    });
  },
});
