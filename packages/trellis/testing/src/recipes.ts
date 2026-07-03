import { defineRecipePackage } from "@attune/framework-protocol"

import { FrameworkTestingAtomGraphObserverRecipes } from "./atom-graph-observer.js"
import { FrameworkTestingCoverageGuidedRerunRecipes } from "./coverage-guided-fuzzer.js"
import { FrameworkTestingFastCheckRecipes } from "./fastcheck.js"
import { FrameworkTestingObservationProducerRecipes } from "./observation-producer.js"
import { FrameworkTestingProgramHarnessRecipes } from "./program-harness.js"
import {
  FrameworkTestingPackageKind,
  FrameworkTestingProjectId,
  FrameworkTestingRecipeContractRecipes,
  FrameworkTestingSourceRoot,
} from "./recipe-contracts.js"
import { FrameworkTestingReplayMetadataRecipes } from "./replay-metadata.js"
import { FrameworkTestingSymbolMapRecipes } from "./symbol-map.js"
import { FrameworkTestingTestRecipes } from "./test-recipes.js"
import { FrameworkTestingWorkerReplayMetadataRecipes } from "./worker-metadata.js"

export const FrameworkTestingRecipes = [
  ...FrameworkTestingRecipeContractRecipes,
  ...FrameworkTestingAtomGraphObserverRecipes,
  ...FrameworkTestingCoverageGuidedRerunRecipes,
  ...FrameworkTestingFastCheckRecipes,
  ...FrameworkTestingObservationProducerRecipes,
  ...FrameworkTestingProgramHarnessRecipes,
  ...FrameworkTestingReplayMetadataRecipes,
  ...FrameworkTestingSymbolMapRecipes,
  ...FrameworkTestingWorkerReplayMetadataRecipes,
  ...FrameworkTestingTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkTestingRecipePackage = defineRecipePackage({
  packageId: FrameworkTestingProjectId,
  kind: FrameworkTestingPackageKind,
  title: "Trellis framework testing and observation recipes",
  sourceRoot: FrameworkTestingSourceRoot,
  recipes: FrameworkTestingRecipes,
  ownership: [
    {
      id: "testing-recipe-contracts",
      title: "Shared testing recipe contract schemas",
      files: ["packages/trellis/testing/src/recipe-contracts.ts"],
      recipeIds: FrameworkTestingRecipeContractRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-package-barrel",
      title: "Framework testing package barrel",
      files: ["packages/trellis/testing/src/index.ts"],
      recipeIds: FrameworkTestingRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-atom-graph-observer",
      title: "Atom graph observation helpers",
      files: ["packages/trellis/testing/src/atom-graph-observer.ts"],
      recipeIds: FrameworkTestingAtomGraphObserverRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-coverage-guided-rerun",
      title: "Coverage-guided property rerun helpers",
      files: ["packages/trellis/testing/src/coverage-guided-fuzzer.ts"],
      recipeIds: FrameworkTestingCoverageGuidedRerunRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-fastcheck-property-evidence",
      title: "FastCheck property evidence helpers",
      files: ["packages/trellis/testing/src/fastcheck.ts"],
      recipeIds: FrameworkTestingFastCheckRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-observation-producer",
      title: "Observation producer helpers",
      files: ["packages/trellis/testing/src/observation-producer.ts"],
      recipeIds: FrameworkTestingObservationProducerRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-program-harness",
      title: "Program harness observation helpers",
      files: ["packages/trellis/testing/src/program-harness.ts"],
      recipeIds: FrameworkTestingProgramHarnessRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-replay-metadata",
      title: "Replay and counterexample metadata helpers",
      files: ["packages/trellis/testing/src/replay-metadata.ts"],
      recipeIds: FrameworkTestingReplayMetadataRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-symbol-map",
      title: "Exact symbol map coverage helpers",
      files: ["packages/trellis/testing/src/symbol-map.ts"],
      recipeIds: FrameworkTestingSymbolMapRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-worker-replay-metadata",
      title: "Worker replay metadata helpers",
      files: ["packages/trellis/testing/src/worker-metadata.ts"],
      recipeIds: FrameworkTestingWorkerReplayMetadataRecipes.map((recipe) => recipe.id),
    },
    {
      id: "testing-test-suite",
      title: "Framework testing package tests",
      files: [
        "packages/trellis/testing/src/test-recipes.ts",
        "packages/trellis/testing/test/**",
        "packages/trellis/testing/vitest.config.ts",
      ],
      recipeIds: FrameworkTestingTestRecipes.map((recipe) => recipe.id),
    },
  ],
})
