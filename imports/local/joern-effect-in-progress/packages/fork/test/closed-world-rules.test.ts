import { describe, expect, test } from "vitest";
import * as Testing from "effect-oxlint/testing";
import {
  capabilityEnforcement,
  effectBoundary,
  noClasses,
  noExplicitAny,
  noGlobalAccess,
  noInterfaces,
  noModuleSideEffects,
  noMutation,
  noMutableCollections,
  noPromise,
  noRawEnvVars,
  noRuntimeExecution,
  noTypeAssertions,
  noUnknown,
  noUnsafeEscapeHatches,
  onlyAllowedImports,
} from "../src/rules/index.js";

describe("closed-world rules", () => {
  test("onlyAllowedImports reports imports outside configured packages", () => {
    const result = Testing.runRule(
      onlyAllowedImports,
      "ImportDeclaration",
      Testing.importDecl("fs-extra"),
    );

    Testing.expectDiagnostics(result, [
      {
        message:
          'Import from "fs-extra" is outside the closed world. Add a capability wrapper or an explicit allowedPackages entry.',
      },
    ]);
  });

  test("onlyAllowedImports accepts relative imports and configured packages", () => {
    const relative = Testing.runRule(
      onlyAllowedImports,
      "ImportDeclaration",
      Testing.importDecl("../runtime/env.js"),
    );
    const configured = Testing.runRule(
      onlyAllowedImports,
      "ImportDeclaration",
      Testing.importDecl("effect/Effect"),
      { options: [{ allowedPackages: ["effect/*"] }] },
    );

    Testing.expectNoDiagnostics(relative);
    Testing.expectNoDiagnostics(configured);
  });

  test("global and capability rules report unwrapped platform APIs", () => {
    const global = Testing.runRule(noGlobalAccess, "Identifier", Testing.id("fetch"));
    const capability = Testing.runRule(
      capabilityEnforcement,
      "Identifier",
      Testing.id("console"),
    );

    expect(global.length).toBe(1);
    expect(capability.length).toBe(1);
  });

  test("noPromise reports async, new Promise, and Promise helpers", () => {
    const asyncFn = Testing.arrowFn(Testing.id("value"));
    Object.assign(asyncFn, { async: true });
    const newPromise = Testing.newExpr("Promise");
    const promiseAll = Testing.memberExpr("Promise", "all");

    expect(Testing.runRule(noPromise, "ArrowFunctionExpression", asyncFn).length).toBe(1);
    expect(Testing.runRule(noPromise, "NewExpression", newPromise).length).toBe(1);
    expect(Testing.runRule(noPromise, "MemberExpression", promiseAll).length).toBe(1);
  });

  test("noMutation reports mutable syntax", () => {
    expect(
      Testing.runRule(noMutation, "VariableDeclaration", {
        type: "VariableDeclaration",
        kind: "let",
        declarations: [],
      }).length,
    ).toBe(1);
    expect(
      Testing.runRule(noMutation, "AssignmentExpression", {
        type: "AssignmentExpression",
        operator: "=",
        left: Testing.id("x"),
        right: Testing.id("y"),
      }).length,
    ).toBe(1);
  });

  test("noRawEnvVars reports configured process.env reads", () => {
    const result = Testing.runRule(
      noRawEnvVars,
      "MemberExpression",
      {
        type: "MemberExpression",
        object: Testing.memberExpr("process", "env"),
        property: Testing.id("JOERN_HOME"),
        computed: false,
      },
      { options: [{ envVars: ["JOERN_HOME"] }] },
    );

    expect(result.length).toBe(1);
  });

  test("schema-modeling rules reject interfaces, classes, and unknown", () => {
    expect(Testing.runRule(noInterfaces, "TSInterfaceDeclaration", Testing.interfaceDecl("Config")).length).toBe(1);
    expect(Testing.runRule(noClasses, "ClassDeclaration", Testing.classDecl("Config")).length).toBe(1);
    expect(Testing.runRule(noUnknown, "TSUnknownKeyword", { type: "TSUnknownKeyword" }).length).toBe(1);
    expect(Testing.runRule(noExplicitAny, "TSAnyKeyword", { type: "TSAnyKeyword" }).length).toBe(1);
  });

  test("noClasses accepts explicit Effect modeling classes", () => {
    const modeledCall = (object: string, property: string) => ({
      type: "CallExpression",
      callee: Testing.callOfMember(object, property, [Testing.id("Tag")]),
      arguments: [Testing.id("fields")],
    });
    const modeledSuperClasses = [
      modeledCall("Schema", "Class"),
      modeledCall("Data", "TaggedError"),
      modeledCall("Context", "Tag"),
    ];

    for (const superClass of modeledSuperClasses) {
      const declaration = Testing.classDecl("Modeled", { superClass });
      expect(Testing.runRule(noClasses, "ClassDeclaration", declaration).length).toBe(0);
    }
  });

  test("noTypeAssertions reports assertion escape hatches", () => {
    expect(
      Testing.runRule(
        noTypeAssertions,
        "TSAsExpression",
        Testing.tsAsExpr("TSTypeReference"),
      ).length,
    ).toBe(1);
    expect(
      Testing.runRule(noTypeAssertions, "TSNonNullExpression", {
        type: "TSNonNullExpression",
        expression: Testing.id("value"),
      }).length,
    ).toBe(1);
  });

  test("noRuntimeExecution reports runtime runners", () => {
    expect(
      Testing.runRule(
        noRuntimeExecution,
        "CallExpression",
        Testing.callOfMember("Effect", "runPromise", [Testing.id("program")]),
      ).length,
    ).toBe(1);
    expect(
      Testing.runRule(
        noRuntimeExecution,
        "CallExpression",
        Testing.callOfMember("Runtime", "runFork", [Testing.id("runtime")]),
      ).length,
    ).toBe(1);
  });

  test("noUnsafeEscapeHatches reports unsafe names and members", () => {
    expect(Testing.runRule(noUnsafeEscapeHatches, "Identifier", Testing.id("unsafeRun")).length).toBe(1);
    expect(
      Testing.runRule(
        noUnsafeEscapeHatches,
        "MemberExpression",
        Testing.memberExpr("Effect", "runUnsafe"),
      ).length,
    ).toBe(1);
  });

  test("noMutableCollections reports mutating collection methods", () => {
    expect(
      Testing.runRule(
        noMutableCollections,
        "CallExpression",
        Testing.callOfMember("items", "push", [Testing.id("item")]),
      ).length,
    ).toBe(1);
  });

  test("noModuleSideEffects reports import-time expression statements", () => {
    const expression = {
      type: "ExpressionStatement",
      expression: Testing.callExpr("main"),
      parent: { type: "Program" },
    };

    expect(Testing.runRule(noModuleSideEffects, "ExpressionStatement", expression).length).toBe(1);
  });

  test("effectBoundary reports exported functions without Effect return annotations", () => {
    const fn = {
      type: "FunctionDeclaration",
      id: Testing.id("load"),
      params: [],
      body: Testing.blockStmt([]),
      generator: false,
      async: false,
      returnType: null,
      parent: { type: "ExportNamedDeclaration" },
    };

    expect(Testing.runRule(effectBoundary, "FunctionDeclaration", fn).length).toBe(1);
  });
});
