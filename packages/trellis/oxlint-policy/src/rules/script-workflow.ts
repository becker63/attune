import { pipe } from "effect/Function";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { AST, Rule, RuleContext, type ESTree } from "effect-oxlint";
import { report } from "./helpers.js";

export const publicScriptWorkflowMessage =
  "Script contains workflow logic. Move behavior under src/internal/* and expose it through a Recipe or ManagedRecipe projection. Migrated package scripts must be removed rather than kept as pass-through shims.";

export const publicScriptWorkflowMigrationDebtMessage =
  "Temporary script workflow migration debt must reference an owning recipe or repair and a removal TODO before it can remain allowlisted.";

const packageScriptFilePattern =
  /(?:^|\/)packages\/(?:[^/]+\/)+scripts\/.+\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;

const workflowImportSources = new Set([
  "child_process",
  "node:child_process",
  "fs",
  "fs/promises",
  "node:fs",
  "node:fs/promises",
]);

const childProcessMethods = new Set([
  "exec",
  "execFile",
  "execFileSync",
  "execSync",
  "spawn",
  "spawnSync",
]);

const hasTemporaryDebtMarker = (sourceText: string): boolean => {
  if (!/\bTODO\b/i.test(sourceText)) return false;
  return /\b(?:recipe|repair)\s*[:=]\s*[\w.-]+/i.test(sourceText);
};

const isPackageLocalScriptFile = (filename: string): boolean =>
  packageScriptFilePattern.test(filename.replaceAll("\\", "/"));

const isWorkflowImportSource = (source: string): boolean =>
  workflowImportSources.has(source);

const isTemporaryMigrationDebtAllowed = (
  options: ReadonlyArray<unknown>,
): boolean => {
  const first = options[0];
  return (
    typeof first === "object" &&
    first !== null &&
    "allowTemporaryMigrationDebt" in first &&
    (first as { readonly allowTemporaryMigrationDebt?: unknown })
      .allowTemporaryMigrationDebt === true
  );
};

const shouldReportMigrationDebt = (
  ctx: RuleContext["Service"],
): boolean =>
  isTemporaryMigrationDebtAllowed(ctx.options) &&
  hasTemporaryDebtMarker(ctx.sourceCode.text);

const reportScriptWorkflow = (
  ctx: RuleContext["Service"],
  node: ESTree.Node,
) =>
  report(
    ctx,
    node,
    shouldReportMigrationDebt(ctx)
      ? publicScriptWorkflowMigrationDebtMessage
      : publicScriptWorkflowMessage,
  );

const isChildProcessCallPath = (path: ReadonlyArray<string>): boolean =>
  path.length >= 1 && childProcessMethods.has(path[path.length - 1] ?? "");

const isArgvDispatchCallPath = (path: ReadonlyArray<string>): boolean =>
  path.length >= 3 &&
  path[0] === "process" &&
  path[1] === "argv" &&
  ["at", "slice", "splice"].includes(path[2] ?? "");

const isWorkflowCall = (call: ESTree.CallExpression): boolean => {
  if (call.callee.type === "Identifier") {
    return childProcessMethods.has(call.callee.name);
  }
  return pipe(
    AST.narrow(call.callee, "MemberExpression"),
    Option.flatMap(AST.memberPath),
    Option.exists(
      (path) => isChildProcessCallPath(path) || isArgvDispatchCallPath(path),
    ),
  );
};

export const noPublicScriptWorkflow = Rule.define({
  name: "no-public-script-workflow",
  meta: Rule.meta({
    type: "problem",
    description:
      "Reject package-local scripts that contain workflow behavior before no-compat validation removes the live script surface.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const applies = isPackageLocalScriptFile(ctx.filename);
    return {
      ImportDeclaration: (node: ESTree.Node) => {
        if (!applies) return Effect.void;
        return pipe(
          AST.narrow(node, "ImportDeclaration"),
          Option.flatMap(AST.matchImport(isWorkflowImportSource)),
          Option.match({
            onNone: () => Effect.void,
            onSome: () => reportScriptWorkflow(ctx, node),
          }),
        );
      },
      SwitchStatement: (node: ESTree.Node) => {
        if (!applies) return Effect.void;
        return reportScriptWorkflow(ctx, node);
      },
      CallExpression: (node: ESTree.Node) => {
        if (!applies) return Effect.void;
        return pipe(
          AST.narrow(node, "CallExpression"),
          Option.filter(isWorkflowCall),
          Option.match({
            onNone: () => Effect.void,
            onSome: () => reportScriptWorkflow(ctx, node),
          }),
        );
      },
      MemberExpression: (node: ESTree.Node) => {
        if (!applies) return Effect.void;
        return pipe(
          AST.narrow(node, "MemberExpression"),
          Option.flatMap(AST.memberPath),
          Option.filter(
            (path) =>
              path.length >= 2 && path[0] === "process" && path[1] === "env",
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: () => reportScriptWorkflow(ctx, node),
          }),
        );
      },
    };
  },
});
