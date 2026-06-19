import { describe, expect, it } from "vitest"

import discoveryEventGenerator from "../src/generators/discovery-event/generator.js"
import effectServiceGenerator from "../src/generators/effect-service/generator.js"
import type { GeneratorTree } from "../src/internal/tree.js"

class MemoryTree implements GeneratorTree {
  readonly files = new Map<string, string>()

  exists(path: string): boolean {
    return this.files.has(path) || [...this.files.keys()].some((file) => file.startsWith(`${path}/`))
  }

  read(path: string): string | null {
    return this.files.get(path) ?? null
  }

  write(path: string, content: string): void {
    this.files.set(path, content)
  }

  children(path: string): string[] {
    const prefix = `${path}/`
    return [...this.files.keys()]
      .filter((file) => file.startsWith(prefix))
      .map((file) => file.slice(prefix.length))
      .filter((file) => !file.includes("/"))
  }
}

describe("attune-nx generators", () => {
  it("generates DiscoveryEvents facade and projection ownership comments", () => {
    const tree = new MemoryTree()

    discoveryEventGenerator(tree, {
      name: "Evidence Recorded",
      eventType: "discovery.evidence.recorded",
      viewKey: "discovery.evidence",
    })

    const source = tree.files.get("src/discovery/events/evidence-recorded.ts") ?? ""
    expect(source).toContain("raw EventLog writes stay behind DiscoveryEvents/facade boundaries")
    expect(source).toContain("export const EvidenceRecordedEvent = Schema.Struct")
    expect(source).toContain("export const appendEvidenceRecorded")
    expect(source).toContain("export const projectEvidenceRecorded")
    expect(source).toContain("Drizzle tables belong behind this persistence/read-model boundary")
    expect(source).toContain("export const evidenceRecordedViewKey = \"discovery.evidence\" as const")
    expect(tree.files.get("src/discovery/events/index.ts")).toContain('export * from "./evidence-recorded.js"')
  })

  it("generates Effect service boundary ownership comments", () => {
    const tree = new MemoryTree()

    effectServiceGenerator(tree, { name: "Decision Runner" })

    const source = tree.files.get("src/effect/services/decision-runner.ts") ?? ""
    expect(source).toContain("world-changing effects live in Effect services, not atoms")
    expect(source).toContain("export class DecisionRunner extends Context.Tag")
  })
})
