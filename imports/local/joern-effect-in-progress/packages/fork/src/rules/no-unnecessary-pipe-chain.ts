/**
 * Ban `x.pipe(f).pipe(g)` — merge into `x.pipe(f, g)`.
 *
 * Source: language-service/unnecessaryPipeChain
 */
import type { ESTree } from "effect-oxlint";
import { Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstNode, isAstRecord } from "./_ast-record.js";

const isMethodPipe = (node: ESTree.Node): boolean => {
  if (node.type !== "CallExpression") return false;
  const callee = field(node, "callee");
  if (!isAstRecord(callee) || !("type" in callee)) return false;
  if (callee["type"] !== "MemberExpression") return false;
  const prop = field(callee, "property");
  if (!isAstRecord(prop) || !("type" in prop)) return false;
  return prop["type"] === "Identifier" && "name" in prop && prop["name"] === "pipe";
};

export const noUnnecessaryPipeChain = Rule.define({
  name: "no-unnecessary-pipe-chain",
  meta: Rule.meta({
    type: "suggestion",
    description: "Avoid chaining .pipe().pipe(). Merge into a single .pipe() call.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        if (!isMethodPipe(node)) return Effect.void;
        const callee = field(node, "callee");
        const obj = isAstRecord(callee) ? field(callee, "object") : undefined;
        if (isAstNode(obj) && isMethodPipe(obj)) {
          return ctx.report(
            Diagnostic.make({
              node,
              message: "Unnecessary .pipe() chain. Merge into a single .pipe() call.",
            }),
          );
        }
        return Effect.void;
      },
    };
  },
});
