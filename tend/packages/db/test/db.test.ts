import { describe, expect, it } from "vitest"
import {
  TendDbRecipes,
  readTendControlMigration,
  tendEventInsertContract,
  tendKanelConfig,
  tendSafeQlConfig,
  validateTendControlMigration,
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
  })

  it("describes Kanel, Kysely, SafeQL, and event insertion contracts", () => {
    expect(tendKanelConfig()).toMatchObject({
      connectionEnv: "DATABASE_URL",
      outputPath: ".attune/cache/generated/tend/db/kanel",
    })
    expect(tendSafeQlConfig().checkedStatements[0]).toContain("INSERT INTO tend_event.event")
    expect(tendEventInsertContract().parameters).toContain("receiptId")
    expect(TendDbRecipes[0]?.id).toBe("tend-db.control-spine")
  })
})
