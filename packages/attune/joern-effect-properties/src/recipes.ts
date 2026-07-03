import { defineRecipePackage } from "@attune/framework-protocol"

import { JoernFuzzerSourceSurfaceRecipes } from "./index-recipes.js"
import {
  FuzzerCliInvocationRecipe,
  WorkerFuzzerRecipe,
} from "./fuzz/cli/FuzzerCli.js"
import {
  PropertyValidationWorkerRecipe,
  PropertyVitestCliInvocationRecipe,
} from "./fuzz/cli/PropertyVitestCli.js"
import { FuzzerRuntimeRecipes } from "./fuzz/cli/run.js"
import { FuzzerResourceLifecycleRecipes } from "./fuzz/config/resources.js"
import { SemanticCaseRecipe } from "./fuzz/domain/model.js"
import { JoernEffectPropertiesTestRecipes } from "./test-recipes.js"
import { JoernFuzzerToolchainRecipes } from "./toolchain-recipes.js"
import { JoernEffectPropertiesAttunePropertyLocalRecipes } from "./attuneProperty.js"
import { JoernEffectPropertiesCoverageSearchLocalRecipes } from "./coverageSearch.js"
import { JoernEffectPropertiesEventsLocalRecipes } from "./events.js"
import { JoernEffectPropertiesFuzzConfigPresetsLocalRecipes } from "./fuzz/config/presets.js"
import { JoernEffectPropertiesFuzzConfigRuntimeLocalRecipes } from "./fuzz/config/runtime.js"
import { JoernEffectPropertiesFuzzDomainErrorsLocalRecipes } from "./fuzz/domain/errors.js"
import { JoernEffectPropertiesFuzzDomainIdsLocalRecipes } from "./fuzz/domain/ids.js"
import { JoernEffectPropertiesFuzzDomainProjectLocalRecipes } from "./fuzz/domain/project.js"
import { JoernEffectPropertiesFuzzIndexLocalRecipes } from "./fuzz/index.js"
import { JoernEffectPropertiesFuzzPipelineRunnerLocalRecipes } from "./fuzz/pipeline/runner.js"
import { JoernEffectPropertiesFuzzPipelineStageLocalRecipes } from "./fuzz/pipeline/stage.js"
import { JoernEffectPropertiesFuzzPipelineStagesLocalRecipes } from "./fuzz/pipeline/stages.js"
import { JoernEffectPropertiesFuzzServicesAdmissionLocalRecipes } from "./fuzz/services/admission.js"
import { JoernEffectPropertiesFuzzServicesCorpusLocalRecipes } from "./fuzz/services/corpus.js"
import { JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipes } from "./fuzz/services/counterexamples.js"
import { JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipes } from "./fuzz/services/eventPayloads.js"
import { JoernEffectPropertiesFuzzServicesExpectationsLocalRecipes } from "./fuzz/services/expectations.js"
import { JoernEffectPropertiesFuzzServicesMutatorLocalRecipes } from "./fuzz/services/mutator.js"
import { JoernEffectPropertiesFuzzServicesOracleLocalRecipes } from "./fuzz/services/oracle.js"
import { JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipes } from "./fuzz/services/queryFeedback.js"
import { JoernEffectPropertiesFuzzServicesTelemetryLocalRecipes } from "./fuzz/services/telemetry.js"
import { JoernEffectPropertiesFuzzServicesWorkspacePoolLocalRecipes } from "./fuzz/services/workspacePool.js"
import { JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipes } from "./fuzz/templates/admissions.js"
import { JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipes } from "./fuzz/templates/feedback.js"
import { JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipes } from "./fuzz/templates/mutations.js"
import { JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipes } from "./fuzz/templates/projects.js"
import { JoernEffectPropertiesFuzzTemplatesQueriesLocalRecipes } from "./fuzz/templates/queries.js"
import { JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipes } from "./fuzz/templates/workloads.js"
import { JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipes } from "./fuzz/templates/workspaces.js"
import { JoernEffectPropertiesPackageBoundaryPropertyLocalRecipes } from "./packageBoundaryProperty.js"
import { JoernEffectPropertiesRecipeContractsLocalRecipes } from "./recipe-contracts.js"
import { JoernEffectPropertiesSourceSinkPipelineLocalRecipes } from "./SourceSinkPipeline.js"
import { JoernEffectPropertiesTempLocalRecipes } from "./temp.js"
import { JoernEffectPropertiesWorkerPropertyLocalRecipes } from "./workerProperty.js"


export const JoernEffectPropertiesLocalSourceRecipes = [
  ...JoernEffectPropertiesAttunePropertyLocalRecipes,
  ...JoernEffectPropertiesCoverageSearchLocalRecipes,
  ...JoernEffectPropertiesEventsLocalRecipes,
  ...JoernEffectPropertiesFuzzConfigPresetsLocalRecipes,
  ...JoernEffectPropertiesFuzzConfigRuntimeLocalRecipes,
  ...JoernEffectPropertiesFuzzDomainErrorsLocalRecipes,
  ...JoernEffectPropertiesFuzzDomainIdsLocalRecipes,
  ...JoernEffectPropertiesFuzzDomainProjectLocalRecipes,
  ...JoernEffectPropertiesFuzzIndexLocalRecipes,
  ...JoernEffectPropertiesFuzzPipelineRunnerLocalRecipes,
  ...JoernEffectPropertiesFuzzPipelineStageLocalRecipes,
  ...JoernEffectPropertiesFuzzPipelineStagesLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesAdmissionLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesCorpusLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesExpectationsLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesMutatorLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesOracleLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesTelemetryLocalRecipes,
  ...JoernEffectPropertiesFuzzServicesWorkspacePoolLocalRecipes,
  ...JoernEffectPropertiesFuzzTemplatesAdmissionsLocalRecipes,
  ...JoernEffectPropertiesFuzzTemplatesFeedbackLocalRecipes,
  ...JoernEffectPropertiesFuzzTemplatesMutationsLocalRecipes,
  ...JoernEffectPropertiesFuzzTemplatesProjectsLocalRecipes,
  ...JoernEffectPropertiesFuzzTemplatesQueriesLocalRecipes,
  ...JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipes,
  ...JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipes,
  ...JoernEffectPropertiesPackageBoundaryPropertyLocalRecipes,
  ...JoernEffectPropertiesRecipeContractsLocalRecipes,
  ...JoernEffectPropertiesSourceSinkPipelineLocalRecipes,
  ...JoernEffectPropertiesTempLocalRecipes,
  ...JoernEffectPropertiesWorkerPropertyLocalRecipes,
] as const

export const JoernFuzzerRecipes = [
  SemanticCaseRecipe,
  PropertyValidationWorkerRecipe,
  WorkerFuzzerRecipe,
] as const

export const JoernEffectPropertiesRecipes = [
  ...JoernFuzzerSourceSurfaceRecipes,
  ...JoernEffectPropertiesLocalSourceRecipes,
  ...FuzzerRuntimeRecipes,
  ...FuzzerResourceLifecycleRecipes,
  FuzzerCliInvocationRecipe,
  PropertyVitestCliInvocationRecipe,
  ...JoernEffectPropertiesTestRecipes,
  ...JoernFuzzerToolchainRecipes,
  ...JoernFuzzerRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesRecipePackage = defineRecipePackage({
  packageId: "joern-effect-properties",
  kind: "property-proof-runtime",
  title: "Joern Effect property and fuzzing recipes",
  sourceRoot: "packages/attune/joern-effect-properties/src",
  recipes: JoernEffectPropertiesRecipes,
  ownership: [
    {
      id: "property-proof-source-surface",
      title: "Public barrels, package recipe catalog, and source-surface contracts",
      files: [
        "packages/attune/joern-effect-properties/src/index.ts",
        "packages/attune/joern-effect-properties/src/index-recipes.ts",
        "packages/attune/joern-effect-properties/src/recipe-contracts.ts",
        "packages/attune/joern-effect-properties/src/fuzz/index.ts",
        "packages/attune/joern-effect-properties/vitest.config.ts",
      ],
      recipeIds: JoernFuzzerSourceSurfaceRecipes.map((recipe) => recipe.id),
    },
    {
      id: "semantic-case-domain-model",
      title: "Semantic fuzzer case schemas and case projection",
      files: ["packages/attune/joern-effect-properties/src/fuzz/domain/model.ts"],
      recipeIds: [SemanticCaseRecipe.id],
    },
    {
      id: "fuzzer-runtime-layer",
      title: "Effect Layer-backed fuzzer runtime",
      files: ["packages/attune/joern-effect-properties/src/fuzz/cli/run.ts"],
      recipeIds: FuzzerRuntimeRecipes.map((recipe) => recipe.id),
    },
    {
      id: "fuzzer-resource-lifecycle",
      title: "Managed fuzzer resource configuration lifecycle",
      files: ["packages/attune/joern-effect-properties/src/fuzz/config/resources.ts"],
      recipeIds: FuzzerResourceLifecycleRecipes.map((recipe) => recipe.id),
    },
    {
      id: "fuzzer-cli-and-worker",
      title: "Fuzzer CLI invocation and managed worker evidence pipeline",
      files: [
        "packages/attune/joern-effect-properties/src/fuzz/cli/FuzzerCli.ts",
        "packages/attune/joern-effect-properties/project.json",
      ],
      recipeIds: [
        FuzzerCliInvocationRecipe.id,
        WorkerFuzzerRecipe.id,
      ],
    },
    {
      id: "property-vitest-worker",
      title: "Property Vitest invocation and validation worker",
      files: [
        "packages/attune/joern-effect-properties/src/fuzz/cli/PropertyVitestCli.ts",
        "packages/attune/joern-effect-properties/project.json",
      ],
      recipeIds: [
        PropertyVitestCliInvocationRecipe.id,
        PropertyValidationWorkerRecipe.id,
      ],
    },
    {
      id: "property-proof-implementation",
      title: "Property proof implementation modules reached by recipe handlers",
      files: [
        "packages/attune/joern-effect-properties/src/attuneProperty.ts",
        "packages/attune/joern-effect-properties/src/coverageSearch.ts",
        "packages/attune/joern-effect-properties/src/events.ts",
        "packages/attune/joern-effect-properties/src/fuzz/config/presets.ts",
        "packages/attune/joern-effect-properties/src/fuzz/config/runtime.ts",
        "packages/attune/joern-effect-properties/src/fuzz/domain/**",
        "packages/attune/joern-effect-properties/src/fuzz/pipeline/**",
        "packages/attune/joern-effect-properties/src/fuzz/services/**",
        "packages/attune/joern-effect-properties/src/fuzz/templates/**",
        "packages/attune/joern-effect-properties/src/packageBoundaryProperty.ts",
        "packages/attune/joern-effect-properties/src/SourceSinkPipeline.ts",
        "packages/attune/joern-effect-properties/src/temp.ts",
        "packages/attune/joern-effect-properties/src/workerProperty.ts",
      ],
      recipeIds: [
        ...JoernFuzzerSourceSurfaceRecipes,
        ...JoernEffectPropertiesLocalSourceRecipes,
        ...FuzzerRuntimeRecipes,
        ...JoernFuzzerRecipes,
      ].map((recipe) => recipe.id),
    },
    {
      id: "property-proof-tests",
      title: "Joern property, fuzzer, and worker tests",
      files: ["packages/attune/joern-effect-properties/test/**"],
      recipeIds: JoernEffectPropertiesTestRecipes.map((recipe) => recipe.id),
    },
    {
      id: "property-proof-nix-toolchain",
      title: "Joern property fuzzer Nix and Arion runtime files",
      files: ["packages/attune/joern-effect-properties/nix/**"],
      recipeIds: JoernFuzzerToolchainRecipes.map((recipe) => recipe.id),
    },
  ],
})
