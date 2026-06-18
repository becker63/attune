/**
 * Ban dynamic module loading.
 *
 * Dynamic import/require paths hide dependency edges from static analysis and
 * compiled-binary bundling. Use static imports unless the call site opts out
 * with an adjacent `effect/no-dynamic-imports: allow <reason>` comment.
 */
import type { ESTree, OxlintComment } from "effect-oxlint";
import { Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { lineField, nodeField, stringField } from "./_ast-record.js";

const allowPattern = /\beffect\/no-dynamic-imports:\s*allow\s+\S/;

const hasAllowComment = (node: ESTree.Node, comments: ReadonlyArray<OxlintComment>): boolean => {
  const startLine = lineField(node, "start");
  if (startLine === undefined) return false;
  return comments.some((comment) => {
    const endLine = lineField(comment, "end");
    if (endLine === undefined) return false;
    if (endLine !== startLine - 1 && endLine !== startLine) return false;
    return allowPattern.test(comment.value);
  });
};

const createRequireAliasName = (node: ESTree.Node): string | undefined => {
  if (node.type !== "VariableDeclarator") return undefined;
  const id = nodeField(node, "id");
  const init = nodeField(node, "init");
  if (id?.type !== "Identifier" || init?.type !== "CallExpression") return undefined;
  const callee = nodeField(init, "callee");
  if (callee?.type !== "Identifier" || stringField(callee, "name") !== "createRequire")
    return undefined;
  return stringField(id, "name");
};

const classifyDynamicLoadCall = (
  callee: ESTree.Node | undefined,
  createRequireAliases: ReadonlySet<string>,
): string | undefined => {
  if (callee === undefined) return undefined;
  if (callee.type === "Identifier") {
    const name = stringField(callee, "name");
    if (name === "require") return "`require(...)` is forbidden. Use a top-level static import.";
    if (name !== undefined && createRequireAliases.has(name))
      return "`createRequire(...)` aliases are forbidden. Use a top-level static import.";
  }
  if (callee.type === "MemberExpression") {
    const object = nodeField(callee, "object");
    const property = nodeField(callee, "property");
    if (
      object?.type === "Identifier" &&
      stringField(object, "name") === "module" &&
      property?.type === "Identifier" &&
      stringField(property, "name") === "require"
    ) {
      return "`module.require(...)` is forbidden. Use a top-level static import.";
    }
  }
  if (callee.type === "CallExpression") {
    const inner = nodeField(callee, "callee");
    if (inner?.type === "Identifier" && stringField(inner, "name") === "createRequire") {
      return "`createRequire(...)(...)` is forbidden. Use a top-level static import.";
    }
  }
  return undefined;
};

export const noDynamicImports = Rule.define({
  name: "no-dynamic-imports",
  meta: Rule.meta({
    type: "problem",
    description: "Avoid dynamic import/require. Use top-level static imports.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const createRequireAliases = new Set<string>();
    const reportUnlessAllowed = (node: ESTree.Node, message: string) =>
      hasAllowComment(node, ctx.sourceCode.getAllComments())
        ? Effect.void
        : ctx.report(Diagnostic.make({ node, message }));

    return {
      VariableDeclarator: (node: ESTree.Node) => {
        const alias = createRequireAliasName(node);
        if (alias === undefined) return Effect.void;
        createRequireAliases.add(alias);
        return reportUnlessAllowed(
          node,
          "`createRequire(...)` is forbidden. Use a top-level static import.",
        );
      },
      ImportExpression: (node: ESTree.Node) =>
        reportUnlessAllowed(
          node,
          "Dynamic `import(...)` is forbidden. Use a top-level static import.",
        ),
      CallExpression: (node: ESTree.Node) => {
        const message = classifyDynamicLoadCall(nodeField(node, "callee"), createRequireAliases);
        return message === undefined ? Effect.void : reportUnlessAllowed(node, message);
      },
    };
  },
});
