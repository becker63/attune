import { Plugin } from "effect-oxlint";
import { noHandAuthoredArchitectureShapes } from "./rules/architecture-shapes.js";
import { generatedArtifactOwnedByRecipe } from "./rules/generated-artifact-ownership.js";
import { noPrivateLedger } from "./rules/ledger-boundary.js";
import { managedRecipeRequiresSubstrate } from "./rules/managed-recipe-substrate.js";
import { noRawNodeApis, noRawProcessEnv } from "./rules/node-boundary.js";
import { recipeOwnedNxTarget } from "./rules/nx-target-ownership.js";
import { noRawPgOutsideRuntime } from "./rules/postgres-boundary.js";
import { noPublicScriptWorkflow } from "./rules/script-workflow.js";

export default Plugin.define({
  name: "attune",
  specifier: "./packages/trellis/oxlint-policy/dist/index.js",
  rules: {
    "no-raw-process-env": noRawProcessEnv,
    "no-raw-node-apis": noRawNodeApis,
    "no-hand-authored-architecture-shapes": noHandAuthoredArchitectureShapes,
    "no-public-script-workflow": noPublicScriptWorkflow,
    "recipe-owned-nx-target": recipeOwnedNxTarget,
    "no-private-ledger": noPrivateLedger,
    "managed-recipe-requires-substrate": managedRecipeRequiresSubstrate,
    "generated-artifact-owned-by-recipe": generatedArtifactOwnedByRecipe,
    "no-raw-pg-outside-runtime": noRawPgOutsideRuntime,
  },
});
