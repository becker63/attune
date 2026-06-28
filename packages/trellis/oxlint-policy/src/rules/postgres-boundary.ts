import { pipe } from "effect/Function";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { AST, Rule, RuleContext, type ESTree } from "effect-oxlint";
import { report } from "./helpers.js";

export const rawPostgresBoundaryMessage =
  "Raw Postgres access is outside the framework runtime DB boundary. Use RecipeReceiptStore/read-model services or add a typed runtime adapter.";

const rawPostgresImportSources = new Set(["pg", "postgres"]);
const rawPostgresConstructors = new Set(["Pool", "Client"]);
const unsafeSqlHelpers = new Set([
  "unsafe",
  "unsafeSql",
  "rawSql",
  "executeRaw",
]);

const normalizePath = (filename: string): string =>
  filename.replaceAll("\\", "/");

const isAllowedRuntimeDbBoundary = (filename: string): boolean => {
  const normalized = normalizePath(filename);
  return (
    normalized.endsWith("/packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts") ||
    normalized.endsWith("/packages/trellis/runtime/src/SqlRoute.ts") ||
    normalized.includes("/packages/trellis/runtime/test/")
  );
};

const isRawPostgresImportSource = (source: string): boolean =>
  rawPostgresImportSources.has(source);

const identifierName = (node: ESTree.Node): string | undefined =>
  node.type === "Identifier" ? node.name : undefined;

const isRawPostgresConstructor = (node: ESTree.Node): boolean =>
  pipe(
    AST.narrow(node, "NewExpression"),
    Option.map((newExpression) => identifierName(newExpression.callee)),
    Option.exists((name) => name !== undefined && rawPostgresConstructors.has(name)),
  );

const isUnsafeSqlCall = (node: ESTree.Node): boolean =>
  pipe(
    AST.narrow(node, "CallExpression"),
    Option.map((call) => call.callee),
    Option.flatMap((callee) => {
      if (callee.type === "Identifier") return Option.some(callee.name);
      return pipe(
        AST.narrow(callee, "MemberExpression"),
        Option.flatMap(AST.memberPath),
        Option.map((path) => path.at(-1) ?? ""),
      );
    }),
    Option.exists((name) => unsafeSqlHelpers.has(name)),
  );

const isManualDatabaseUrl = (node: ESTree.Node): boolean =>
  pipe(
    AST.narrow(node, "Literal"),
    Option.map((literal) => literal.value),
    Option.filter((value): value is string => typeof value === "string"),
    Option.exists(
      (value) =>
        value.startsWith("postgres://") ||
        value.startsWith("postgresql://") ||
        value === "DATABASE_URL",
    ),
  );

const isProcessDatabaseUrl = (node: ESTree.Node): boolean =>
  pipe(
    AST.narrow(node, "MemberExpression"),
    Option.flatMap(AST.memberPath),
    Option.exists(
      (path) =>
        path.length >= 3 &&
        path[0] === "process" &&
        path[1] === "env" &&
        path[2] === "DATABASE_URL",
    ),
  );

export const noRawPgOutsideRuntime = Rule.define({
  name: "no-raw-pg-outside-runtime",
  meta: Rule.meta({
    type: "problem",
    description:
      "Keep raw Postgres access inside the Trellis runtime DB adapter boundary.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    const allowed = isAllowedRuntimeDbBoundary(ctx.filename);
    return {
      ImportDeclaration: (node: ESTree.Node) => {
        if (allowed) return Effect.void;
        return pipe(
          AST.narrow(node, "ImportDeclaration"),
          Option.flatMap(AST.matchImport(isRawPostgresImportSource)),
          Option.match({
            onNone: () => Effect.void,
            onSome: () => report(ctx, node, rawPostgresBoundaryMessage),
          }),
        );
      },
      NewExpression: (node: ESTree.Node) => {
        if (allowed || !isRawPostgresConstructor(node)) return Effect.void;
        return report(ctx, node, rawPostgresBoundaryMessage);
      },
      CallExpression: (node: ESTree.Node) => {
        if (allowed || !isUnsafeSqlCall(node)) return Effect.void;
        return report(ctx, node, rawPostgresBoundaryMessage);
      },
      Literal: (node: ESTree.Node) => {
        if (allowed || !isManualDatabaseUrl(node)) return Effect.void;
        return report(ctx, node, rawPostgresBoundaryMessage);
      },
      MemberExpression: (node: ESTree.Node) => {
        if (allowed || !isProcessDatabaseUrl(node)) return Effect.void;
        return report(ctx, node, rawPostgresBoundaryMessage);
      },
    };
  },
});
