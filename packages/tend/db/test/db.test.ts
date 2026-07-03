import { describe, expect, it } from "vitest"
import { TendDbRecipes } from "../src/recipes.js"
import {
  readTendControlMigration,
  tendEventInsertContract,
  tendKanelConfig,
  tendRecipeSpineLinkRequirements,
  tendSafeQlConfig,
  validateTendControlMigration,
  validateTendRecipeSpineLinks,
} from "../src/index.js"

describe("@attune/tend-db", () => {
  it("declares the Tend TimescaleDB/Postgres control spine", () => {
    const sql = readTendControlMigration(new URL("../../../..", import.meta.url).pathname.replace(/\/$/, ""))
    expect(validateTendControlMigration(sql)).toEqual([])
    expect(sql).toContain("tend_core.session")
    expect(sql).toContain("tend_core.openrtk_action")
    expect(sql).toContain("CREATE EXTENSION IF NOT EXISTS timescaledb")
    expect(sql).toContain("create_hypertable")
    expect(sql).toContain("tend_event.token_metric")
    expect(sql).toContain("tend_outbox.wakeup")
    expect(validateTendRecipeSpineLinks(sql)).toEqual([])
    expect(tendRecipeSpineLinkRequirements.map((requirement) => requirement.relation)).toContain(
      "tend_event.command_output_sample",
    )
  })

  it("describes Kanel, Kysely, SafeQL, and event insertion contracts", () => {
    expect(tendKanelConfig()).toMatchObject({
      connectionEnv: "DATABASE_URL",
      outputPath: ".attune/cache/generated/tend/db/kanel",
    })
    expect(tendSafeQlConfig().checkedStatements[0]).toContain("INSERT INTO tend_event.event")
    expect(tendSafeQlConfig().checkedStatements.join("\n")).toContain("observation_id")
    expect(tendEventInsertContract().parameters).toContain("runId")
    expect(tendEventInsertContract().parameters).toContain("receiptId")
    expect(tendEventInsertContract().parameters).toContain("observationId")
    expect(TendDbRecipes.map((recipe) => recipe.id)).toEqual([
      "tend-db.control-spine",
      "tend-db.sql-validation-route",
      "tend-db.config-surface",
      "tend-db.test-suite",
    ])
    expect(TendDbRecipes.some((recipe) => recipe.sourcePath === "packages/tend/db/src/recipes.ts")).toBe(false)
  })
})
