import { pipe } from "effect/Function";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import {
  AST,
  Diagnostic,
  Plugin,
  Rule,
  RuleContext,
  type ESTree,
} from "effect-oxlint";

const approvedAdapterPathFragments = [
  "/src/platform/",
  "/src/adapters/",
  "/src/adapter/",
  "/src/infrastructure/",
  "/src/runtime/",
  "/scripts/",
] as const;

const isApprovedAdapterFile = (filename: string): boolean =>
  approvedAdapterPathFragments.some((fragment) =>
    filename.includes(fragment),
  ) ||
  filename.endsWith(".config.ts") ||
  filename.endsWith(".config.mts") ||
  filename.endsWith("/vite.config.ts") ||
  filename.endsWith("/vitest.config.ts");

const report = (
  ctx: {
    readonly report: (
      diagnostic: ReturnType<typeof Diagnostic.make>,
    ) => Effect.Effect<void>;
  },
  node: ESTree.Node,
  message: string,
) => ctx.report(Diagnostic.make({ node, message }));

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
      ctx.filename.includes("/packages/attune-nx/") ||
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

export default Plugin.define({
  name: "attune",
  specifier: "./framework/oxlint-policy/dist/index.js",
  rules: {
    "no-raw-process-env": noRawProcessEnv,
    "no-raw-node-apis": noRawNodeApis,
    "no-hand-authored-architecture-shapes": noHandAuthoredArchitectureShapes,
  },
});
