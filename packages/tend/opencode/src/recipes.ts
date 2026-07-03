import { defineRecipePackage } from "@attune/framework-protocol"

import { TendOpenCodeAttuneCliRecipes } from "./attune-cli.js"
import { BenchmarkProducerRecipes } from "./benchmark.js"
import { TendOpenCodeCommandRecipes } from "./cli-core.js"
import { TendOpenCodeToolsCliRecipes } from "./cli.js"
import {
  TendOpenCodeContractRecipes,
  TendOpenSpecPacketSidecarRecipes,
} from "./contracts.js"
import {
  TendOpenCodeSessionRecipes,
} from "./index.js"
import { TendOpenCodeMeasurementRecipes } from "./measurement.js"
import { TendPacketProtocolRecipes } from "./packet-links.js"
import { TendOpenCodeTestRecipes } from "./test-recipes.js"

const packageId = "tend-opencode"

export const TendOpenCodeRecipes = [
  ...TendOpenCodeContractRecipes,
  ...TendOpenCodeAttuneCliRecipes,
  ...TendOpenCodeToolsCliRecipes,
  ...TendOpenSpecPacketSidecarRecipes,
  ...TendPacketProtocolRecipes,
  ...TendOpenCodeSessionRecipes,
  ...TendOpenCodeCommandRecipes,
  ...TendOpenCodeMeasurementRecipes,
  ...BenchmarkProducerRecipes,
  ...TendOpenCodeTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenCodeRecipePackage = defineRecipePackage({
  packageId,
  kind: "agent-extension",
  title: "Tend OpenCode orchestration receipt recipes",
  sourceRoot: "packages/tend/opencode/src",
  recipes: TendOpenCodeRecipes,
  ownership: [
    {
      id: "opencode-invocation-and-observation",
      title: "CLI, command observation, session decoding, and policy projection source",
      files: [
        "packages/tend/opencode/src/attune-cli.ts",
        "packages/tend/opencode/src/cli-core.ts",
        "packages/tend/opencode/src/cli.ts",
        "packages/tend/opencode/src/contracts.ts",
        "packages/tend/opencode/src/index.ts",
        "packages/tend/opencode/src/packet-links.ts",
      ],
      recipeIds: [
        ...TendOpenCodeContractRecipes.map((recipe) => recipe.id),
        ...TendOpenCodeAttuneCliRecipes.map((recipe) => recipe.id),
        ...TendOpenCodeToolsCliRecipes.map((recipe) => recipe.id),
        ...TendOpenSpecPacketSidecarRecipes.map((recipe) => recipe.id),
        ...TendPacketProtocolRecipes.map((recipe) => recipe.id),
        ...TendOpenCodeSessionRecipes.map((recipe) => recipe.id),
        ...TendOpenCodeCommandRecipes.map((recipe) => recipe.id),
      ],
    },
    {
      id: "opencode-measurement-and-benchmark",
      title: "Measurement reports, benchmark projections, hidden judge, and telemetry",
      files: [
        "packages/tend/opencode/src/benchmark.ts",
        "packages/tend/opencode/src/measurement.ts",
        "reports/tend-opencode-codex-measurement/**",
      ],
      recipeIds: [
        ...TendOpenCodeMeasurementRecipes.map((recipe) => recipe.id),
        ...BenchmarkProducerRecipes.map((recipe) => recipe.id),
      ],
    },
    {
      id: "opencode-tests-docs-and-fixtures",
      title: "Tests, fixtures, OpenCode command docs, and plugin package configuration",
      files: [
        "packages/tend/opencode/test/**",
        "packages/tend/opencode/src/fixtures/**",
        "packages/tend/opencode/opencode-config/**",
        "packages/tend/opencode/vitest.config.ts",
      ],
      recipeIds: [
        ...TendOpenCodeTestRecipes.map((recipe) => recipe.id),
        ...TendOpenCodeCommandRecipes.map((recipe) => recipe.id),
      ],
    },
  ],
})
