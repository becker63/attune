/**
 * Ban `console.*` inside `Effect.sync(...)`.
 *
 * Use Effect.log* instead.
 *
 * Source: biome-effect-linting-rules/no-effect-sync-console
 */
import { AST, Diagnostic, Rule, RuleContext } from "effect-oxlint";
import * as Effect from "effect/Effect";
import { field, isAstRecord } from "./_ast-record.js";

const consoleMethods = new Set(["log", "warn", "error", "info", "debug", "trace"]);

const containsConsoleCall = (node: unknown): boolean => {
  if (!isAstRecord(node)) return false;
  if (
    node["type"] === "CallExpression" &&
    "callee" in node &&
    isAstRecord(node["callee"])
  ) {
    const callee = node["callee"];
    if (callee["type"] === "MemberExpression" && "object" in callee && "property" in callee) {
      const obj = field(callee, "object");
      const prop = field(callee, "property");
      if (
        isAstRecord(obj) &&
        obj["type"] === "Identifier" &&
        obj["name"] === "console" &&
        isAstRecord(prop) &&
        prop["type"] === "Identifier" &&
        typeof prop["name"] === "string" &&
        consoleMethods.has(prop["name"])
      ) {
        return true;
      }
    }
  }
  // Recurse into body/arguments
  if ("body" in node) {
    if (Array.isArray(node["body"])) {
      for (const child of node["body"]) {
        if (containsConsoleCall(child)) return true;
      }
    } else if (containsConsoleCall(node["body"])) return true;
  }
  if ("argument" in node && containsConsoleCall(node["argument"])) return true;
  if ("arguments" in node && Array.isArray(node["arguments"])) {
    for (const arg of node["arguments"]) {
      if (containsConsoleCall(arg)) return true;
    }
  }
  if ("expression" in node && containsConsoleCall(node["expression"])) return true;
  if ("expressions" in node && Array.isArray(node["expressions"])) {
    for (const expr of node["expressions"]) {
      if (containsConsoleCall(expr)) return true;
    }
  }
  return false;
};

export const noEffectSyncConsole = Rule.define({
  name: "no-effect-sync-console",
  meta: Rule.meta({
    type: "suggestion",
    description: "Avoid console.* inside Effect.sync. Use Effect.log* instead.",
  }),
  create: function* () {
    const ctx = yield* RuleContext;
    return {
      CallExpression: (node) => {
        if (!AST.isCallOf(node, "Effect", "sync")) return Effect.void;

        if ("arguments" in node && Array.isArray(node.arguments)) {
          for (const arg of node.arguments) {
            if (containsConsoleCall(arg)) {
              return ctx.report(
                Diagnostic.make({
                  node,
                  message:
                    "Avoid console.* inside Effect.sync. Use Effect.log, Effect.logWarning, etc.",
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
