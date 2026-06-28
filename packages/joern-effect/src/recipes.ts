import { defineExternalSchemaRecipe } from "@attune/framework-protocol"
import { Schema } from "effect"

import {
  JoernTemplateExecutorRunInput,
  JoernTemplateExecutorRunOutput,
} from "./joern/joern-template-executor.js"
import { DangerousCallEvidence } from "./joern/templates/dangerous-call.js"

export const JoernObservationPacket = Schema.Struct({
  templateId: Schema.String,
  evidence: DangerousCallEvidence,
  receiptId: Schema.optional(Schema.String),
})
export type JoernObservationPacket = typeof JoernObservationPacket.Type

export const JoernCodegenInput = Schema.Struct({
  schemaPath: Schema.String,
  joernVersion: Schema.String,
  codepropertygraphVersion: Schema.String,
})
export type JoernCodegenInput = typeof JoernCodegenInput.Type

export const JoernGeneratedArtifactSet = Schema.Struct({
  generatorTarget: Schema.String,
  sourceSchema: Schema.String,
  generatedFiles: Schema.Array(Schema.String),
})
export type JoernGeneratedArtifactSet = typeof JoernGeneratedArtifactSet.Type

export const JoernProofRecipes = [
  defineExternalSchemaRecipe({
    id: "joern-effect.extract-cpg-schema",
    projectId: "joern-effect",
    title: "Extract Joern CPG schema from the Nix-built Joern toolchain",
    inputSchema: JoernCodegenInput,
    outputSchema: JoernGeneratedArtifactSet,
    nxTarget: "joern-effect:extract-cpg-schema",
    sourcePath: "packages/joern-effect/src/recipes.ts",
    allowedFiles: [
      "packages/joern-effect/scripts/**",
      "packages/joern-effect/schema/**",
      "packages/joern-effect/project.json",
      "flake.nix",
    ],
    validationEvidence: ["joern-effect:check-generated", "joern-effect:test"],
  }),
  defineExternalSchemaRecipe({
    id: "joern-effect.generated-schema-modules",
    projectId: "joern-effect",
    title: "Generate Joern schema, node, property, and traversal modules",
    inputSchema: JoernCodegenInput,
    outputSchema: JoernGeneratedArtifactSet,
    dependencies: [{ recipeId: "joern-effect.extract-cpg-schema" }],
    nxTarget: "joern-effect:emit-generated",
    sourcePath: "packages/joern-effect/src/recipes.ts",
    allowedFiles: [
      "packages/joern-effect/src/pure/codegen/**",
      "packages/joern-effect/src/pure/generated/**",
      "packages/joern-effect/schema/**",
    ],
    validationEvidence: ["joern-effect:check-generated", "joern-effect:test"],
  }),
  defineExternalSchemaRecipe({
    id: "joern-effect.generated-template-registry",
    projectId: "joern-effect",
    title: "Generate Joern proof template registry",
    inputSchema: JoernCodegenInput,
    outputSchema: JoernGeneratedArtifactSet,
    dependencies: [{ recipeId: "joern-effect.generated-schema-modules" }],
    nxTarget: "joern-effect:emit-template-registry",
    sourcePath: "packages/joern-effect/src/recipes.ts",
    allowedFiles: [
      "packages/joern-effect/src/joern/templates/**",
      "packages/attune-nx/src/generators/sync-joern-templates/**",
    ],
    validationEvidence: ["joern-effect:check-generated", "joern-effect:test", "attune-nx:test"],
  }),
  defineExternalSchemaRecipe({
    id: "joern-effect.generated-template-bindings",
    projectId: "joern-effect",
    title: "Generate Joern template binding and evidence modules",
    inputSchema: JoernCodegenInput,
    outputSchema: JoernGeneratedArtifactSet,
    dependencies: [{ recipeId: "joern-effect.generated-template-registry" }],
    nxTarget: "joern-effect:emit-template-bindings",
    sourcePath: "packages/joern-effect/src/recipes.ts",
    allowedFiles: [
      "packages/joern-effect/src/generated/**",
      "packages/joern-effect/src/joern/templates/**",
    ],
    validationEvidence: ["joern-effect:check-generated", "joern-effect:test"],
  }),
  defineExternalSchemaRecipe({
    id: "joern-effect.generated-fast-check-arbitraries",
    projectId: "joern-effect",
    title: "Generate FastCheck arbitraries from Joern Effect schemas",
    inputSchema: JoernCodegenInput,
    outputSchema: JoernGeneratedArtifactSet,
    dependencies: [{ recipeId: "joern-effect.generated-schema-modules" }],
    nxTarget: "joern-effect:emit-fast-check-arbitraries",
    sourcePath: "packages/joern-effect/src/recipes.ts",
    allowedFiles: [
      "packages/joern-effect/src/internal/generated/**",
      "packages/joern-effect/src/pure/codegen/**",
    ],
    validationEvidence: ["joern-effect:check-generated", "joern-effect:test"],
  }),
  defineExternalSchemaRecipe({
    id: "joern-effect.generated-surface-check",
    projectId: "joern-effect",
    title: "Validate generated Joern schema, DSL, templates, arbitraries, and README",
    inputSchema: JoernCodegenInput,
    outputSchema: JoernGeneratedArtifactSet,
    dependencies: [
      { recipeId: "joern-effect.generated-template-bindings" },
      { recipeId: "joern-effect.generated-fast-check-arbitraries" },
    ],
    nxTarget: "joern-effect:check-generated",
    sourcePath: "packages/joern-effect/src/recipes.ts",
    allowedFiles: [
      "packages/joern-effect/src/pure/generated/**",
      "packages/joern-effect/src/internal/generated/**",
      "packages/joern-effect/src/generated/**",
      "packages/joern-effect/src/joern/templates/**",
      "packages/joern-effect/README.md",
    ],
    validationEvidence: ["joern-effect:check-generated", "joern-effect:test"],
  }),
  defineExternalSchemaRecipe({
    id: "joern-effect.proof-template",
    projectId: "joern-effect",
    title: "Render bounded Joern proof template",
    inputSchema: JoernTemplateExecutorRunInput,
    outputSchema: JoernTemplateExecutorRunOutput,
    dependencies: [
      { recipeId: "joern-effect.generated-surface-check" },
      { recipeId: "joern-effect.generated-template-registry" },
    ],
    nxTarget: "joern-effect:test",
    sourcePath: "packages/joern-effect/src/recipes.ts",
    allowedFiles: ["packages/joern-effect/src/**"],
    validationEvidence: ["joern-effect:test"],
  }),
  defineExternalSchemaRecipe({
    id: "joern-effect.observation-packet",
    projectId: "joern-effect",
    title: "Normalize Joern proof output into observation packet",
    inputSchema: DangerousCallEvidence,
    outputSchema: JoernObservationPacket,
    dependencies: [{ recipeId: "joern-effect.proof-template" }],
    nxTarget: "joern-effect:test",
    sourcePath: "packages/joern-effect/src/recipes.ts",
    allowedFiles: ["packages/joern-effect/src/**"],
    validationEvidence: ["joern-effect:test"],
  }),
] as const
