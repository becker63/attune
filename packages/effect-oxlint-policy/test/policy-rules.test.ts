import { describe, expect, test } from "vitest";
import * as Option from "effect/Option";
import * as Testing from "effect-oxlint/testing";
import {
  noHandAuthoredArchitectureShapes,
  noRawNodeApis,
  noRawProcessEnv,
} from "../src/index.js";

const messages = (result: ReturnType<typeof Testing.runRule>) =>
  Testing.messages(result).map((message) => Option.getOrNull(message));

describe("no-raw-process-env", () => {
  test("rejects raw process.env outside adapters", () => {
    const result = Testing.runRule(
      noRawProcessEnv,
      "MemberExpression",
      Testing.chainedMemberExpr("process", "env", "DATABASE_URL"),
      { filename: "/workspace/attune/packages/demo/src/index.ts" },
    );

    expect(messages(result)).toEqual([
      "Use an approved Effect Platform environment adapter instead of raw process.env.",
    ]);
  });

  test("accepts raw process.env in platform adapters", () => {
    const result = Testing.runRule(
      noRawProcessEnv,
      "MemberExpression",
      Testing.chainedMemberExpr("process", "env", "DATABASE_URL"),
      { filename: "/workspace/attune/packages/demo/src/platform/env.ts" },
    );

    expect(result).toHaveLength(0);
  });
});

describe("no-raw-node-apis", () => {
  test("rejects raw Node filesystem imports outside adapters", () => {
    const result = Testing.runRule(
      noRawNodeApis,
      "ImportDeclaration",
      Testing.importDecl("node:fs"),
      { filename: "/workspace/attune/packages/demo/src/domain.ts" },
    );

    expect(messages(result)).toEqual([
      "Import Node filesystem/process modules only from approved Effect Platform adapter modules.",
    ]);
  });

  test("accepts raw Node filesystem imports in adapters", () => {
    const result = Testing.runRule(
      noRawNodeApis,
      "ImportDeclaration",
      Testing.importDecl("node:fs/promises"),
      {
        filename: "/workspace/attune/packages/demo/src/adapters/file-system.ts",
      },
    );

    expect(result).toHaveLength(0);
  });

  test("rejects raw process API calls outside adapters", () => {
    const result = Testing.runRule(
      noRawNodeApis,
      "CallExpression",
      Testing.callOfMember("process", "cwd"),
      { filename: "/workspace/attune/packages/demo/src/domain.ts" },
    );

    expect(messages(result)).toEqual([
      "Call Node process APIs only through an approved Effect Platform adapter.",
    ]);
  });
});

describe("no-hand-authored-architecture-shapes", () => {
  test("rejects hand-authored Effect.Service classes outside generators", () => {
    const result = Testing.runRule(
      noHandAuthoredArchitectureShapes,
      "ClassDeclaration",
      {
        type: "ClassDeclaration",
        id: Testing.id("Demo"),
        superClass: Testing.memberExpr("Effect", "Service"),
        body: { type: "ClassBody", body: [] },
      } as never,
      { filename: "/workspace/attune/packages/demo/src/demo-service.ts" },
    );

    expect(messages(result)).toEqual([
      "Generate Effect service architecture shapes with @attune/nx instead of hand-authoring them.",
    ]);
  });

  test("accepts Effect.Service classes in the Nx generator package", () => {
    const result = Testing.runRule(
      noHandAuthoredArchitectureShapes,
      "ClassDeclaration",
      {
        type: "ClassDeclaration",
        id: Testing.id("Demo"),
        superClass: Testing.memberExpr("Effect", "Service"),
        body: { type: "ClassBody", body: [] },
      } as never,
      {
        filename:
          "/workspace/attune/packages/attune-nx/src/generators/effect-service/files/service.ts",
      },
    );

    expect(result).toHaveLength(0);
  });
});
