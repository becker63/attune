import { defineRecipePackage } from "@attune/framework-protocol"

import { JoernEdgeRuntimeRecipes } from "./edge/index.js"
import {
  JoernGenerationCliInvocationRecipe,
  JoernGenerationSurfaceRecipes,
} from "./internal/generation/JoernGenerationCli.js"
import { JoernReadmeRenderRecipes } from "./internal/generation/JoernReadme.js"
import { JoernTemplateExecutorRecipes } from "./joern/joern-template-executor.js"
import { DangerousCallObservationRecipes } from "./joern/templates/dangerous-call.js"
import { JoernSchemaExtractionRecipes } from "./pure/codegen/extractSchema.js"
import { JoernCodegenRecipes } from "./pure/codegen/generate.js"
import { JoernSourceSurfaceRecipes } from "./index-recipes.js"
import { JoernTestRecipes } from "./test-recipes.js"
import { JoernEffectEdgeIndexLocalRecipes } from "./edge/index.js"
import { JoernEffectJoernIndexLocalRecipes } from "./joern/index.js"
import { JoernEffectJoernTemplatesIndexLocalRecipes } from "./joern/templates/index.js"
import { JoernEffectPureBuilderPropertyLocalRecipes } from "./pure/builder/property.js"
import { JoernEffectPureBuilderRawLocalRecipes } from "./pure/builder/raw.js"
import { JoernEffectPureBuilderSelectLocalRecipes } from "./pure/builder/select.js"
import { JoernEffectPureBuilderTraversalLocalRecipes } from "./pure/builder/traversal.js"
import { JoernEffectPureBuilderTraversalAstLocalRecipes } from "./pure/builder/traversalAst.js"
import { JoernEffectPureCodegenEmitGeneratedLocalRecipes } from "./pure/codegen/emitGenerated.js"
import { JoernEffectPureCodegenNormalizeSchemaLocalRecipes } from "./pure/codegen/normalizeSchema.js"
import { JoernEffectPureCodegenTypesLocalRecipes } from "./pure/codegen/types.js"
import { JoernEffectPureIndexLocalRecipes } from "./pure/index.js"
import { JoernEffectPureProgramCpgProgramLocalRecipes } from "./pure/program/CpgProgram.js"
import { JoernEffectPureProgramCpgProgramBuilderLocalRecipes } from "./pure/program/CpgProgramBuilder.js"
import { JoernEffectPureProgramEvidenceLocalRecipes } from "./pure/program/Evidence.js"
import { JoernEffectPureProgramModelLocalRecipes } from "./pure/program/model.js"


export const JoernEffectLocalSourceRecipes = [
  ...JoernEffectEdgeIndexLocalRecipes,
  ...JoernEffectJoernIndexLocalRecipes,
  ...JoernEffectJoernTemplatesIndexLocalRecipes,
  ...JoernEffectPureBuilderPropertyLocalRecipes,
  ...JoernEffectPureBuilderRawLocalRecipes,
  ...JoernEffectPureBuilderSelectLocalRecipes,
  ...JoernEffectPureBuilderTraversalLocalRecipes,
  ...JoernEffectPureBuilderTraversalAstLocalRecipes,
  ...JoernEffectPureCodegenEmitGeneratedLocalRecipes,
  ...JoernEffectPureCodegenNormalizeSchemaLocalRecipes,
  ...JoernEffectPureCodegenTypesLocalRecipes,
  ...JoernEffectPureIndexLocalRecipes,
  ...JoernEffectPureProgramCpgProgramLocalRecipes,
  ...JoernEffectPureProgramCpgProgramBuilderLocalRecipes,
  ...JoernEffectPureProgramEvidenceLocalRecipes,
  ...JoernEffectPureProgramModelLocalRecipes,
] as const

export const JoernProofRecipes = [
  ...JoernEdgeRuntimeRecipes,
  ...JoernSchemaExtractionRecipes,
  ...JoernCodegenRecipes,
  ...JoernReadmeRenderRecipes,
  ...JoernSourceSurfaceRecipes,
  JoernGenerationCliInvocationRecipe,
  ...JoernTestRecipes,
  ...JoernGenerationSurfaceRecipes,
  ...JoernTemplateExecutorRecipes,
  ...DangerousCallObservationRecipes,
] as const

export const JoernEffectPackageRecipes = [
  ...JoernProofRecipes,
  ...JoernEffectLocalSourceRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectRecipePackage = defineRecipePackage({
  packageId: "joern-effect",
  kind: "joern-runtime-and-dsl",
  title: "Joern Effect runtime, generated binding, proof, and observation recipes",
  sourceRoot: "packages/attune/joern-effect/src",
  recipes: JoernEffectPackageRecipes,
  ownership: [
    {
      id: "joern-runtime-source-surface",
      title: "Joern runtime, public barrels, and test ownership",
      files: [
        "packages/attune/joern-effect/src/index.ts",
        "packages/attune/joern-effect/src/index-recipes.ts",
        "packages/attune/joern-effect/src/edge/index.ts",
        "packages/attune/joern-effect/src/joern/index.ts",
        "packages/attune/joern-effect/src/pure/index.ts",
        "packages/attune/joern-effect/src/test-recipes.ts",
        "packages/attune/joern-effect/test/**",
        "packages/attune/joern-effect/vitest.config.ts",
      ],
      recipeIds: [
        ...JoernSourceSurfaceRecipes,
        ...JoernEffectLocalSourceRecipes,
        ...JoernTestRecipes,
      ].map((recipe) => recipe.id),
    },
    {
      id: "joern-edge-runtime",
      title: "Joern Effect runtime and managed server/client resources",
      files: ["packages/attune/joern-effect/src/edge/**"],
      recipeIds: JoernEdgeRuntimeRecipes.map((recipe) => recipe.id),
    },
    {
      id: "joern-generation-pipeline",
      title: "Joern schema, generated binding, and README projection pipeline",
      files: [
        "packages/attune/joern-effect/schema/**",
        "packages/attune/joern-effect/src/internal/generation/**",
        "packages/attune/joern-effect/src/pure/codegen/**",
        "packages/attune/joern-effect/src/pure/generated/**",
        "packages/attune/joern-effect/src/internal/generated/**",
        "packages/attune/joern-effect/src/generated/**",
        "packages/attune/joern-effect/README.md",
        "packages/attune/joern-effect/project.json",
      ],
      recipeIds: [
        ...JoernSchemaExtractionRecipes,
        ...JoernCodegenRecipes,
        ...JoernReadmeRenderRecipes,
        JoernGenerationCliInvocationRecipe,
        ...JoernGenerationSurfaceRecipes,
      ].map((recipe) => recipe.id),
    },
    {
      id: "joern-pure-dsl-and-examples",
      title: "Joern pure DSL, program model, and example source surfaces",
      files: [
        "packages/attune/joern-effect/examples/**",
        "packages/attune/joern-effect/src/pure/builder/**",
        "packages/attune/joern-effect/src/pure/program/**",
      ],
      recipeIds: JoernSourceSurfaceRecipes.map((recipe) => recipe.id),
    },
    {
      id: "joern-proof-template-pipeline",
      title: "Joern proof template rendering and observation packet projection",
      files: [
        "packages/attune/joern-effect/src/joern/**",
      ],
      recipeIds: [
        ...JoernTemplateExecutorRecipes,
        ...DangerousCallObservationRecipes,
      ].map((recipe) => recipe.id),
    },
  ],
})
