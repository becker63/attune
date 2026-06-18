import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  configForPreset,
  FuzzerLive,
  compileGeneratedDslPrograms,
  fuzzPipelineStages,
  fuzzPresetConfigs,
  projectTemplates,
  runFuzzer,
} from "../src/fuzz/index.js"

describe("joern-effect semantic fuzzer pipeline", () => {
  it("models the public pipeline as coarse stage data", () => {
    expect(fuzzPipelineStages.map((stage) => stage.id)).toEqual([
      "load-corpus",
      "plan-cases",
      "apply-mutations",
      "admit-projects",
      "allocate-workspace",
      "import-cpg",
      "plan-queries",
      "execute-queries",
      "collect-evidence",
      "emit-telemetry",
    ])
  })

  it("exposes explicit preset config data", () => {
    expect(fuzzPresetConfigs.smoke).toMatchObject({
      joernMode: "none",
      mode: "smoke",
    })
    expect(fuzzPresetConfigs.workbench.queryBudget).toBeGreaterThan(0)
    expect(fuzzPresetConfigs.nightly.batchCount).toBeGreaterThan(fuzzPresetConfigs.workbench.batchCount)
  })

  it("keeps the corpus project-shaped and includes JSX and TSX templates", () => {
    const files = projectTemplates.flatMap((project) => project.files)
    expect(projectTemplates.length).toBeGreaterThan(0)
    expect(files.some((file) => file.syntaxFlavor === "jsx")).toBeTruthy()
    expect(files.some((file) => file.syntaxFlavor === "tsx")).toBeTruthy()
  })

  it("reserves generated query budget for graphology templates", async () => {
    const programs = await Effect.runPromise(
      compileGeneratedDslPrograms([
        {
          caseId: "graph-budget-case",
          mutators: [],
          seed: {
            id: "graph-budget-seed",
            origin: "curated",
            source: "export const handler = () => sink(source())",
            syntaxFlavor: "ts",
            title: "Graph budget seed",
          },
          source: "export const handler = () => sink(source())",
          sourcePath: "src/handler.ts",
          syntaxFlavor: "ts",
        },
      ], { budget: 9 }),
    )

    expect(programs).toHaveLength(9)
    expect(programs.some((program) => program.kind !== "rows")).toBeTruthy()
  })

  it("runs the Effect fuzzer smoke pipeline and reports accepted/rejected case counts", async () => {
    const summary = await Effect.runPromise(
      runFuzzer(configForPreset("smoke", {
        caseCount: 12,
        seed: 20260617,
        target: "joern-effect-properties:fuzz:smoke",
      })).pipe(Effect.provide(FuzzerLive)),
    )

    expect(summary.cases).toBe(12)
    expect(summary.accepted + summary.rejected).toBe(12)
    expect(summary.accepted).toBeGreaterThan(0)
  })
})
