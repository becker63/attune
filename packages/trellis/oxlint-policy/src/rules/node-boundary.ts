import { pipe } from "effect/Function";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { AST, Rule, RuleContext, type ESTree } from "effect-oxlint";
import { isApprovedAdapterFile, report } from "./helpers.js";

export const noRawProcessEnv = Rule.define({
  name: "no-raw-process-env",
  meta: Rule.meta({
    type: "problem",
    description:
      "Read environment through an approved Effect Platform adapter instead of process.env.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const allowed = isApprovedAdapterFile(ctx.filename);
    return {
      MemberExpression: (node: ESTree.Node) => {
        if (allowed) return Effect.void;
        return pipe(
          AST.narrow(node, "MemberExpression"),
          Option.flatMap(AST.memberPath),
          Option.filter(
            (path) =>
              path.length >= 2 && path[0] === "process" && path[1] === "env",
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: () =>
              report(
                ctx,
                node,
                "Use an approved Effect Platform environment adapter instead of raw process.env.",
              ),
          }),
        );
      },
    };
  },
});

const rawNodeModuleSources = new Set([
  "fs",
  "fs/promises",
  "node:fs",
  "node:fs/promises",
  "child_process",
  "node:child_process",
  "process",
  "node:process",
]);

const isRawNodeModuleSource = (source: string) =>
  rawNodeModuleSources.has(source);

const nodeGlobalObjects = ["process"] as const;
const nodeProcessMethods = ["cwd", "exit", "kill", "chdir"] as const;

export const noRawNodeApis = Rule.define({
  name: "no-raw-node-apis",
  meta: Rule.meta({
    type: "problem",
    description:
      "Use approved Effect Platform adapters instead of raw Node filesystem or process APIs.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const allowed = isApprovedAdapterFile(ctx.filename);
    return {
      ImportDeclaration: (node: ESTree.Node) => {
        if (allowed) return Effect.void;
        return pipe(
          AST.narrow(node, "ImportDeclaration"),
          Option.flatMap(AST.matchImport(isRawNodeModuleSource)),
          Option.match({
            onNone: () => Effect.void,
            onSome: () =>
              report(
                ctx,
                node,
                "Import Node filesystem/process modules only from approved Effect Platform adapter modules.",
              ),
          }),
        );
      },
      CallExpression: (node: ESTree.Node) => {
        if (allowed) return Effect.void;
        return pipe(
          AST.narrow(node, "CallExpression"),
          Option.flatMap((call) => AST.narrow(call.callee, "MemberExpression")),
          Option.flatMap(AST.memberPath),
          Option.filter(
            (path) =>
              path.length >= 2 &&
              nodeGlobalObjects.includes(path[0] as never) &&
              nodeProcessMethods.includes(path[1] as never),
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: () =>
              report(
                ctx,
                node,
                "Call Node process APIs only through an approved Effect Platform adapter.",
              ),
          }),
        );
      },
    };
  },
});
