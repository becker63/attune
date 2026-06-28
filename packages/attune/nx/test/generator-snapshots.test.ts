import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import discoveryEventGenerator from "../src/generators/discovery-event/generator.js"
import effectServiceGenerator from "../src/generators/effect-service/generator.js"
import type { GeneratorTree } from "../src/internal/tree.js"

class MemoryTree implements GeneratorTree {
  readonly files = new Map<string, string>()

  exists(path: string): boolean {
    return (
      this.files.has(path) ||
      [...this.files.keys()].some((file) => file.startsWith(`${path}/`))
    )
  }

  read(path: string, _encoding: "utf-8"): string | null {
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
      .sort()
  }
}

interface FileDigest {
  readonly path: string
  readonly sha256: string
  readonly lineCount: number
  readonly firstLine: string
}

const snapshotFiles = (tree: MemoryTree): Record<string, string> =>
  Object.fromEntries([...tree.files.entries()].sort(([left], [right]) => left.localeCompare(right)))

const fileDigests = (tree: MemoryTree): readonly FileDigest[] =>
  [...tree.files.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => ({
      path,
      sha256: createHash("sha256").update(content).digest("hex"),
      lineCount: content.split("\n").length - 1,
      firstLine: content.split("\n")[0] ?? "",
    }))

const runEffectServiceSnapshot = (): MemoryTree => {
  const tree = new MemoryTree()

  effectServiceGenerator(tree, {
    name: "Decision Runner",
    directory: "packages/decision-core/src/effect/services",
    project: "decision-core",
    generatorVersion: "0.0.0-snapshot",
    generatorRevision: "snapshot-revision",
    openspecChangeId: "arbor-recipe-substrate-migration",
  })

  return tree
}

const runDiscoveryEventSnapshot = (): MemoryTree => {
  const tree = new MemoryTree()

  discoveryEventGenerator(tree, {
    name: "Evidence Recorded",
    directory: "packages/attune/discovery/src/discovery/events",
    eventType: "discovery.evidence.recorded",
    viewKey: "discovery.evidence",
  })

  return tree
}

const phase2SnapshotSurfaces = [
  {
    generator: "@attune/nx:project-facts",
    assertion: "snapshots src/attune.package.ts, program fact registration, and symbol registry checks",
  },
  {
    generator: "@attune/nx:atom-view",
    assertion: "snapshots Reactivity keys, base atoms, derived atoms, and runtime edge registration",
  },
  {
    generator: "@attune/nx:project-facts",
    assertion: "snapshots generated Schema-coded program harness, symbol registry, and observation plan",
  },
  {
    generator: "@attune/nx:project-facts",
    assertion: "snapshots worker-compatible FastCheck observation modules and diagnostic rule metadata",
  },
  {
    generator: "@attune/nx:sync-project-artifacts",
    assertion: "snapshots recipe receipt materialization outputs once the sync generator exists",
  },
] as const

describe("attune-nx generator snapshots", () => {
  it("captures deterministic effect-service output without artifact-ownership provenance", () => {
    const first = runEffectServiceSnapshot()
    const second = runEffectServiceSnapshot()

    expect(snapshotFiles(first)).toEqual(snapshotFiles(second))
    expect(fileDigests(first)).toMatchInlineSnapshot(`
      [
        {
          "firstLine": "import { Effect, Schema } from "effect"",
          "lineCount": 42,
          "path": "packages/decision-core/src/effect/services/decision-runner.ts",
          "sha256": "ac299f13d6f12f861aed07605fedc2e94ce303c159b6dd3809fd4dd95cd28d33",
        },
        {
          "firstLine": "export * from "./decision-runner.js"",
          "lineCount": 1,
          "path": "packages/decision-core/src/effect/services/index.ts",
          "sha256": "9851aa46181b14696bf8768188e2908726c93b83a728965feaa15a83d08389f2",
        },
      ]
    `)
    expect(first.files.has("packages/decision-core/attune.artifact-ownership.json")).toBe(false)
    expect(first.files.has("attune.artifact-ownership.index.json")).toBe(false)
  })

  it("captures deterministic discovery-event output", () => {
    const first = runDiscoveryEventSnapshot()
    const second = runDiscoveryEventSnapshot()

    expect(snapshotFiles(first)).toEqual(snapshotFiles(second))
    expect(fileDigests(first)).toMatchInlineSnapshot(`
      [
        {
          "firstLine": "import { Effect, Schema } from "effect"",
          "lineCount": 49,
          "path": "packages/attune/discovery/src/discovery/events/evidence-recorded.ts",
          "sha256": "64dc7487c6b0b644cc46045aa022d61046d86e880da17c289129161c08b84e9c",
        },
        {
          "firstLine": "export * from "./evidence-recorded.js"",
          "lineCount": 1,
          "path": "packages/attune/discovery/src/discovery/events/index.ts",
          "sha256": "236d05217eec7fb64f9d26e1dd29aa322940fc6ef639191b665eb6f68ca6f7a8",
        },
      ]
    `)
    expect(first.files.get("packages/attune/discovery/src/discovery/events/evidence-recorded.ts"))
      .toMatchInlineSnapshot(`
        "import { Effect, Schema } from "effect"

        /**
         * Generated by @attune/nx:discovery-event.
         * Ownership: raw EventLog writes stay behind DiscoveryEvents/facade boundaries.
         * Ownership: projection handlers mutate durable read models and announce Reactivity
         * ViewKeys for durable facts, not UI components.
         */
        export const EvidenceRecordedEvent = Schema.Struct({
          type: Schema.Literal("discovery.evidence.recorded"),
          discoveryId: Schema.String,
          occurredAt: Schema.DateFromSelf,
        })
        export type EvidenceRecordedEvent = Schema.Schema.Type<typeof EvidenceRecordedEvent>

        export const evidenceRecordedViewKey = "discovery.evidence" as const

        export interface EvidenceRecordedProjectionStore {
          readonly recordEvidenceRecorded: (event: EvidenceRecordedEvent) => Effect.Effect<void>
        }

        export interface EvidenceRecordedReactivitySink {
          readonly announce: (key: typeof evidenceRecordedViewKey) => Effect.Effect<void>
        }

        export const appendEvidenceRecorded = (
          discoveryEvents: {
            readonly append: (event: EvidenceRecordedEvent) => Effect.Effect<void>
          },
          event: EvidenceRecordedEvent,
        ): Effect.Effect<void> =>
          // Keep world-changing EventLog writes inside DiscoveryEventsLive/facade code.
          discoveryEvents.append(event)

        export const projectEvidenceRecorded = (
          store: EvidenceRecordedProjectionStore,
          reactivity: EvidenceRecordedReactivitySink,
          event: EvidenceRecordedEvent,
        ): Effect.Effect<void> =>
          // Persistence tables belong behind this Effect service/read-model boundary.
          Effect.zipRight(store.recordEvidenceRecorded(event), reactivity.announce(evidenceRecordedViewKey))

        export const evidenceRecordedReplayFixture = [
          {
            type: "discovery.evidence.recorded",
            discoveryId: "fixture-discovery",
            occurredAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ] satisfies ReadonlyArray<EvidenceRecordedEvent>
        "
      `)
  })

  it("names the Phase 2 snapshot surfaces for generator materialization", () => {
    expect(phase2SnapshotSurfaces).toMatchInlineSnapshot(`
      [
        {
          "assertion": "snapshots src/attune.package.ts, program fact registration, and symbol registry checks",
          "generator": "@attune/nx:project-facts",
        },
        {
          "assertion": "snapshots Reactivity keys, base atoms, derived atoms, and runtime edge registration",
          "generator": "@attune/nx:atom-view",
        },
        {
          "assertion": "snapshots generated Schema-coded program harness, symbol registry, and observation plan",
          "generator": "@attune/nx:project-facts",
        },
        {
          "assertion": "snapshots worker-compatible FastCheck observation modules and diagnostic rule metadata",
          "generator": "@attune/nx:project-facts",
        },
        {
          "assertion": "snapshots recipe receipt materialization outputs once the sync generator exists",
          "generator": "@attune/nx:sync-project-artifacts",
        },
      ]
    `)
  })
})
