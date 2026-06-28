import { pipe } from "effect/Function";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { AST, Rule, RuleContext, type ESTree } from "effect-oxlint";
import { report } from "./helpers.js";

export const noHandAuthoredArchitectureShapes = Rule.define({
  name: "no-hand-authored-architecture-shapes",
  meta: Rule.meta({
    type: "suggestion",
    description:
      "Use @attune/nx generators for repeated TypeScript architecture shapes.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const allowed =
      ctx.filename.includes("/packages/attune/nx/") ||
      ctx.filename.includes("/test/fixtures/");
    return {
      ClassDeclaration: (node: ESTree.Node) => {
        if (allowed) return Effect.void;
        const classNode = node as ESTree.Node & {
          superClass?: ESTree.Node | null;
        };
        const superClass = classNode.superClass;
        if (superClass?.type !== "MemberExpression") return Effect.void;
        return pipe(
          AST.memberPath(superClass),
          Option.filter(
            (path) =>
              path.length === 2 &&
              path[0] === "Effect" &&
              path[1] === "Service",
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: () =>
              report(
                ctx,
                node,
                "Generate Effect service architecture shapes with @attune/nx instead of hand-authoring them.",
              ),
          }),
        );
      },
    };
  },
});
