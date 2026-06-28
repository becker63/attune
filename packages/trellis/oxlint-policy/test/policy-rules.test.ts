import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import * as Option from "effect/Option";
import * as Testing from "effect-oxlint/testing";
import { RecipeRecordView } from "@attune/framework-protocol";
import { FrameworkOxlintPolicyRecipes } from "../src/recipes.js";
import {
  generatedArtifactOwnedByRecipe,
  generatedArtifactOwnershipMessage,
  managedRecipeRequiresSubstrate,
  managedRecipeSubstrateMessage,
  noHandAuthoredArchitectureShapes,
  noPrivateLedger,
  noRawPgOutsideRuntime,
  noPublicScriptWorkflow,
  noRawNodeApis,
  noRawProcessEnv,
  privateLedgerMessage,
  publicScriptWorkflowMessage,
  publicScriptWorkflowMigrationDebtMessage,
  recipeOwnedNxTarget,
  recipeOwnedNxTargetMessage,
  rawPostgresBoundaryMessage,
} from "../src/index.js";

const messages = (result: ReturnType<typeof Testing.runRule>) =>
  Testing.messages(result).map((message) => Option.getOrNull(message));

const repoRoot = resolve(
  new URL("../../../../", import.meta.url).pathname,
);

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(repoRoot, path), "utf8")) as unknown;

const asRecord = (value: unknown): Record<string, unknown> => {
  expect(value).toEqual(expect.any(Object));
  return value as Record<string, unknown>;
};

describe("effect-oxlint-policy recipes", () => {
  test("declares oxlint policy recipes from the package recipe module", () => {
    const records = FrameworkOxlintPolicyRecipes.map((recipe) =>
      RecipeRecordView.fromRecipe(recipe),
    );

    expect(records.map((record) => record.recipeId)).toEqual([
      "effect-oxlint-policy.plugin-entrypoint",
      "effect-oxlint-policy.policy-pack",
      "effect-oxlint-policy.raw-env-rule",
      "effect-oxlint-policy.raw-node-api-rule",
      "effect-oxlint-policy.architecture-shape-rule",
      "effect-oxlint-policy.script-workflow-rule",
      "effect-oxlint-policy.nx-target-ownership-rule",
      "effect-oxlint-policy.private-ledger-rule",
      "effect-oxlint-policy.managed-recipe-substrate-rule",
      "effect-oxlint-policy.generated-artifact-ownership-rule",
      "effect-oxlint-policy.raw-postgres-boundary-rule",
    ]);
    expect(records.every((record) => record.sourcePath === "packages/trellis/oxlint-policy/src/recipes.ts")).toBe(true);
  });

  test("wires the policy pack through config and stable Nx targets", () => {
    const config = asRecord(readJson(
      "packages/trellis/oxlint-policy/config/effect-oxlint-policy.json",
    ));
    expect(asRecord(config.rules)).toMatchObject({
      "attune/no-public-script-workflow": "warn",
      "attune/recipe-owned-nx-target": "warn",
      "attune/no-private-ledger": "warn",
      "attune/managed-recipe-requires-substrate": "warn",
      "attune/generated-artifact-owned-by-recipe": "warn",
      "attune/no-raw-pg-outside-runtime": "warn",
    });

    const policyProject = asRecord(readJson(
      "packages/trellis/oxlint-policy/project.json",
    ));
    const policyTarget = asRecord(asRecord(policyProject.targets).policy);
    expect(asRecord(asRecord(policyTarget.metadata).attune)).toMatchObject({
      recipeId: "effect-oxlint-policy.policy-pack",
      surface: "check",
      tier: "public",
    });
    expect(asRecord(policyTarget.options)).toMatchObject({
      action: "check",
      tool: "architecture",
      toolId: "effect-oxlint-policy",
    });

    const workspaceProject = asRecord(readJson("project.json"));
    const policyFastTargets =
      asRecord(asRecord(asRecord(workspaceProject.targets)["policy-fast"]).options)
        .parameters as { readonly targets?: readonly string[] };
    expect(policyFastTargets.targets).toContain("effect-oxlint-policy:policy");
  });
});

describe("no-raw-pg-outside-runtime", () => {
  const productFilename =
    "/workspace/attune/packages/attune/cocoindex-effect/src/db.ts";

  test("rejects product-package Postgres imports", () => {
    const result = Testing.runRule(
      noRawPgOutsideRuntime,
      "ImportDeclaration",
      Testing.importDecl("pg"),
      { filename: productFilename },
    );

    expect(messages(result)).toEqual([rawPostgresBoundaryMessage]);
  });

  test("rejects product-package Postgres client construction", () => {
    const result = Testing.runRule(
      noRawPgOutsideRuntime,
      "NewExpression",
      {
        type: "NewExpression",
        callee: Testing.id("Pool"),
        arguments: [],
      } as never,
      { filename: productFilename },
    );

    expect(messages(result)).toEqual([rawPostgresBoundaryMessage]);
  });

  test("rejects product-package manual database URLs", () => {
    const result = Testing.runRule(
      noRawPgOutsideRuntime,
      "MemberExpression",
      Testing.chainedMemberExpr("process", "env", "DATABASE_URL"),
      { filename: productFilename },
    );

    expect(messages(result)).toEqual([rawPostgresBoundaryMessage]);
  });

  test("allows raw Postgres in the Postgres receipt store adapter", () => {
    const result = Testing.runRule(
      noRawPgOutsideRuntime,
      "ImportDeclaration",
      Testing.importDecl("pg"),
      {
        filename:
          "/workspace/attune/packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts",
      },
    );

    expect(result).toHaveLength(0);
  });

  test("allows raw Postgres in runtime DB tests", () => {
    const result = Testing.runRule(
      noRawPgOutsideRuntime,
      "NewExpression",
      {
        type: "NewExpression",
        callee: Testing.id("Client"),
        arguments: [],
      } as never,
      {
        filename:
          "/workspace/attune/packages/trellis/runtime/test/postgres-receipt-store.test.ts",
      },
    );

    expect(result).toHaveLength(0);
  });
});

describe("generated-artifact-owned-by-recipe", () => {
  const program = { type: "Program", body: [], sourceType: "module" } as never;

  const runGeneratedArtifact = (
    filename: string,
    input: {
      readonly sourceText?: string
      readonly options?: ReadonlyArray<unknown>
    } = {},
  ) =>
    Testing.runRule(generatedArtifactOwnedByRecipe, "Program", program, {
      filename,
      sourceText: input.sourceText ?? "",
      options: input.options ?? [],
    });

  test("rejects unowned generated files", () => {
    const result = runGeneratedArtifact(
      "/workspace/attune/packages/attune/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts",
    );

    expect(messages(result)).toEqual([generatedArtifactOwnershipMessage]);
  });

  test("accepts ownership through recipe allowedFiles", () => {
    const result = runGeneratedArtifact(
      "/workspace/attune/packages/attune/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts",
      {
        options: [{
          knownRecipeIds: ["cocoindex-effect.sync-mcp-tools"],
          recipes: [{
            recipeId: "cocoindex-effect.sync-mcp-tools",
            allowedFiles: [
              "packages/attune/cocoindex-effect/src/cocoindex/tools/**",
            ],
          }],
        }],
      },
    );

    expect(result).toHaveLength(0);
  });

  test("accepts projection-owned generated files", () => {
    const result = runGeneratedArtifact(
      "/workspace/attune/packages/attune/nx/src/executors/generated/executor.ts",
      {
        options: [{
          projectionOwnedFiles: [{
            projectionId: "framework.projection.nx-executor-wrapper",
            files: ["packages/attune/nx/src/executors/generated/**"],
          }],
        }],
      },
    );

    expect(result).toHaveLength(0);
  });

  test("accepts generated ownership manifests", () => {
    const path =
      "packages/canopy/platform-alchemy-k8s/src/resources/ResourceRegistry.generated.ts";
    const result = runGeneratedArtifact(`/workspace/attune/${path}`, {
      options: [{
        knownRecipeIds: ["platform-alchemy-k8s.crd-type-generation"],
        generatedOwnershipManifest: {
          [path]: { recipeId: "platform-alchemy-k8s.crd-type-generation" },
        },
      }],
    });

    expect(result).toHaveLength(0);
  });

  test("accepts generated headers that resolve to known recipes", () => {
    const result = runGeneratedArtifact(
      "/workspace/attune/packages/attune/cocoindex-effect/src/generated/cocoindex-code-mcp.ts",
      {
        sourceText:
          "// @generated by recipe cocoindex-effect.emit-mcp-schema\nexport const schema = {}",
        options: [{
          knownRecipeIds: ["cocoindex-effect.emit-mcp-schema"],
        }],
      },
    );

    expect(result).toHaveLength(0);
  });
});

describe("managed-recipe-requires-substrate", () => {
  const managedRecipeCall = (
    factoryName: string,
    fields: readonly string[],
  ) => ({
    type: "CallExpression",
    callee: Testing.id(factoryName),
    arguments: [Testing.objectExpr(fields.map((key) => ({ key })))],
  } as never);

  const validManagedRecipeFields = [
    "id",
    "projectId",
    "title",
    "inputSchema",
    "outputSchema",
    "validationEvidence",
    "lifecycle",
    "resourceKind",
    "lifecycleSubstrates",
    "observedState",
    "driftRepair",
    "humanReviewRequired",
  ] as const;

  test("rejects decorative ManagedRecipe declarations", () => {
    const result = Testing.runRule(
      managedRecipeRequiresSubstrate,
      "CallExpression",
      managedRecipeCall("defineManagedRecipe", [
        "id",
        "projectId",
        "title",
        "inputSchema",
        "outputSchema",
        "lifecycle",
        "resourceKind",
      ]),
      {
        filename:
          "/workspace/attune/packages/demo/src/recipes.ts",
      },
    );

    expect(messages(result)).toEqual([managedRecipeSubstrateMessage]);
  });

  test("accepts valid ManagedRecipes using current protocol fields", () => {
    const result = Testing.runRule(
      managedRecipeRequiresSubstrate,
      "CallExpression",
      managedRecipeCall("defineExternalSchemaManagedRecipe", validManagedRecipeFields),
      {
        filename:
          "/workspace/attune/packages/canopy/platform-alchemy-k8s/src/recipes.ts",
      },
    );

    expect(result).toHaveLength(0);
  });

  test("accepts explicit Alchemy bridge metadata as lifecycle substrate", () => {
    const result = Testing.runRule(
      managedRecipeRequiresSubstrate,
      "CallExpression",
      managedRecipeCall("defineManagedExecutableRecipe", [
        "id",
        "projectId",
        "title",
        "inputSchema",
        "outputSchema",
        "validationEvidence",
        "lifecycle",
        "resourceKind",
        "alchemyBridge",
        "observationMetadata",
        "noRepairRationale",
        "humanReviewRequired",
      ]),
      {
        filename:
          "/workspace/attune/packages/trellis/runtime/src/LocalTimescaleRecipe.ts",
      },
    );

    expect(result).toHaveLength(0);
  });
});

describe("no-private-ledger", () => {
  const program = { type: "Program", body: [], sourceType: "module" } as never;
  const runSource = (filename: string, sourceText: string) =>
    Testing.runRule(noPrivateLedger, "Program", program, {
      filename,
      sourceText,
    });

  test("rejects unlinked store-like declarations", () => {
    const result = runSource(
      "/workspace/attune/packages/demo/src/PackageRunStore.ts",
      "export class PackageRunStore { append(event: unknown) { return event } }",
    );

    expect(messages(result)).toEqual([privateLedgerMessage]);
  });

  test("accepts legitimate shared-port stores", () => {
    const result = runSource(
      "/workspace/attune/packages/trellis/runtime/src/InMemoryRecipeReceiptStore.ts",
      "import type { RecipeReceiptStore } from './RecipeReceiptStore.js'\nexport class InMemoryRecipeReceiptStore implements RecipeReceiptStore {}",
    );

    expect(result).toHaveLength(0);
  });

  test("accepts fixture-only stores", () => {
    const result = runSource(
      "/workspace/attune/packages/demo/test/fixtures/SessionStore.ts",
      "export class FixtureSessionStore { readonly fixtureOnly = true }",
    );

    expect(result).toHaveLength(0);
  });

  test("rejects Tend ledger-like code without spine linkage", () => {
    const result = runSource(
      "/workspace/attune/packages/tend/opencode/src/TendSessionStore.ts",
      "export class TendSessionStore { append(command: unknown) { return command } }",
    );

    expect(messages(result)).toEqual([privateLedgerMessage]);
  });

  test("accepts Tend stores linked to recipe spine identity", () => {
    const result = runSource(
      "/workspace/attune/packages/tend/opencode/src/TendSessionStore.ts",
      "export class TendSessionStore { append(row: { recipeId: string; observationId: string }) { return row } }",
    );

    expect(result).toHaveLength(0);
  });
});

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

describe("no-public-script-workflow", () => {
  const generationStageFilename =
    "/workspace/attune/packages/trellis/runtime/scripts/generationStage.ts";

  test("rejects stage switch scripts", () => {
    const result = Testing.runRule(
      noPublicScriptWorkflow,
      "SwitchStatement",
      {
        type: "SwitchStatement",
        discriminant: Testing.id("stage"),
        cases: [],
      } as never,
      { filename: generationStageFilename },
    );

    expect(messages(result)).toEqual([publicScriptWorkflowMessage]);
  });

  test("rejects child-process orchestration in package scripts", () => {
    const result = Testing.runRule(
      noPublicScriptWorkflow,
      "ImportDeclaration",
      Testing.importDecl("node:child_process"),
      { filename: generationStageFilename },
    );

    expect(messages(result)).toEqual([publicScriptWorkflowMessage]);
  });

  test("rejects direct child process calls in package scripts", () => {
    const result = Testing.runRule(
      noPublicScriptWorkflow,
      "CallExpression",
      Testing.callOfMember("childProcess", "spawnSync"),
      { filename: generationStageFilename },
    );

    expect(messages(result)).toEqual([publicScriptWorkflowMessage]);
  });

  test("rejects DB lifecycle environment parsing in package scripts", () => {
    const result = Testing.runRule(
      noPublicScriptWorkflow,
      "MemberExpression",
      Testing.chainedMemberExpr("process", "env", "DATABASE_URL"),
      { filename: generationStageFilename },
    );

    expect(messages(result)).toEqual([publicScriptWorkflowMessage]);
  });

  test("classifies typed CLI pass-throughs separately from workflow logic", () => {
    const result = Testing.runRuleMulti(
      noPublicScriptWorkflow,
      [
        ["ImportDeclaration", Testing.importDecl("../src/internal/db/LocalTimescaleCli.js")],
        ["MemberExpression", Testing.chainedMemberExpr("process", "argv")],
        ["CallExpression", Testing.callOfMember("localTimescaleCli", "run")],
      ],
      { filename: generationStageFilename },
    );

    expect(result).toHaveLength(0);
  });

  test("ignores workflow-looking code outside package scripts", () => {
    const result = Testing.runRule(
      noPublicScriptWorkflow,
      "ImportDeclaration",
      Testing.importDecl("node:child_process"),
      {
        filename:
          "/workspace/attune/packages/trellis/runtime/src/internal/db/LocalTimescaleCli.ts",
      },
    );

    expect(result).toHaveLength(0);
  });

  test("reports temporary migration debt only with owner and TODO evidence", () => {
    const result = Testing.runRule(
      noPublicScriptWorkflow,
      "SwitchStatement",
      {
        type: "SwitchStatement",
        discriminant: Testing.id("stage"),
        cases: [],
      } as never,
      {
        filename: generationStageFilename,
        options: [{ allowTemporaryMigrationDebt: true }],
        sourceText:
          "// TODO: migrate script workflow; recipe: trellis.local-timescale\n",
      },
    );

    expect(messages(result)).toEqual([
      publicScriptWorkflowMigrationDebtMessage,
    ]);
  });
});

describe("recipe-owned-nx-target", () => {
  const program = { type: "Program", body: [], sourceType: "module" } as never;
  const projectJsonFilename =
    "/workspace/attune/packages/demo/widget/project.json";

  const runProjectJson = (
    source: unknown,
    options: ReadonlyArray<unknown> = [],
  ) =>
    Testing.runRule(recipeOwnedNxTarget, "Program", program, {
      filename: projectJsonFilename,
      options,
      sourceText: JSON.stringify(source),
    });

  test("rejects orphan public workflow targets", () => {
    const result = runProjectJson({
      name: "demo-widget",
      targets: {
        check: {
          executor: "@attune/nx:toolchain",
          options: { tool: "workspace", action: "check" },
        },
      },
    });

    expect(messages(result)).toEqual([recipeOwnedNxTargetMessage]);
    expect(result[0]?.diagnostic.data).toEqual({ targetName: "check" });
  });

  test("accepts recipe-owned public targets", () => {
    const result = runProjectJson({
      name: "demo-widget",
      targets: {
        generate: {
          executor: "@attune/nx:toolchain",
          metadata: {
            attune: {
              tier: "public",
              recipeId: "demo-widget.generated-bindings",
            },
          },
        },
      },
    });

    expect(result).toHaveLength(0);
  });

  test("accepts projection-owned public targets", () => {
    const result = runProjectJson({
      name: "demo-widget",
      targets: {
        check: {
          executor: "@attune/nx:toolchain",
          metadata: {
            attune: {
              tier: "public",
              projectionId: "framework.projection.nx-target",
            },
          },
        },
      },
    });

    expect(result).toHaveLength(0);
  });

  test("accepts internal repair targets with a public parent", () => {
    const result = runProjectJson({
      name: "demo-widget",
      targets: {
        repair: {
          executor: "@attune/nx:toolchain",
          metadata: {
            attune: { tier: "public", recipeId: "demo-widget.repair" },
          },
        },
        "attune:repair-symbol-registry": {
          executor: "@attune/nx:toolchain",
          metadata: {
            attune: { tier: "internal", surface: "repair" },
          },
        },
      },
    });

    expect(result).toHaveLength(0);
  });

  test("marks unique recipe owner inference as autofix-eligible evidence", () => {
    const result = runProjectJson(
      {
        name: "demo-widget",
        targets: {
          generate: {
            executor: "@attune/nx:toolchain",
            options: { tool: "typescript", action: "generate" },
          },
        },
      },
      [{
        recipeTargets: [{
          recipeId: "demo-widget.generated-bindings",
          nxTarget: "demo-widget:generate",
        }],
      }],
    );

    expect(messages(result)).toEqual([
      `${recipeOwnedNxTargetMessage} Unique recipe owner can be inferred: demo-widget.generated-bindings.`,
    ]);
    expect(result[0]?.diagnostic.data).toEqual({
      inferredRecipeId: "demo-widget.generated-bindings",
      targetName: "generate",
    });
  });

  test("does not infer an owner when matching recipes are ambiguous", () => {
    const result = runProjectJson(
      {
        name: "demo-widget",
        targets: {
          generate: {
            executor: "@attune/nx:toolchain",
            options: { tool: "typescript", action: "generate" },
          },
        },
      },
      [{
        recipeTargets: [
          { recipeId: "demo-widget.first", nxTarget: "demo-widget:generate" },
          { recipeId: "demo-widget.second", nxTarget: "demo-widget:generate" },
        ],
      }],
    );

    expect(messages(result)).toEqual([recipeOwnedNxTargetMessage]);
    expect(result[0]?.diagnostic.data).toEqual({ targetName: "generate" });
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
          "/workspace/attune/packages/attune/nx/src/generators/effect-service/files/service.ts",
      },
    );

    expect(result).toHaveLength(0);
  });
});
