import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import {
  CocoIndexClient,
  CocoIndexClientFixture,
  normalizeCocoIndexHits,
  type AnchorCard,
} from "../src/index.js"

const runId = "run-local-001"
const repoSnapshotId = "repo-snapshot-001"

const fixtureAnchors: ReadonlyArray<AnchorCard> = [
  {
    anchorId: "anchor-http-source",
    runId,
    title: "HTTP request body source",
    vocabulary: ["typescript", "source", "request", "body", "handler"],
    score: 0.91,
    excerpt: "export function handler(req) { return req.body.command }",
    locations: [{ path: "src/routes/run.ts", startLine: 10, endLine: 13 }],
  },
  {
    anchorId: "anchor-spawn-sink",
    runId,
    title: "child_process spawn sink",
    vocabulary: ["typescript", "sink", "spawn", "child_process"],
    score: 0.88,
    excerpt: "spawn(command, args)",
    locations: [{ path: "src/shell/run.ts", startLine: 22, endLine: 22 }],
  },
  {
    anchorId: "anchor-react-cleanup",
    runId,
    title: "React effect cleanup",
    vocabulary: ["typescript", "react", "cleanup", "effect"],
    score: 0.67,
    excerpt: "return () => subscription.dispose()",
    locations: [{ path: "src/ui/useFeed.ts", startLine: 41, endLine: 44 }],
  },
]

describe("cocoindex-effect", () => {
  it("normalizes raw CocoIndex hits into stable AnchorCards", () => {
    const anchors = normalizeCocoIndexHits(
      [
        {
          path: "src/shell/run.ts",
          startLine: 22,
          language: "typescript",
          kind: "sink",
          score: 1.4,
          code: "spawn(command, args)",
        },
      ],
      {
        repoSnapshotId,
        runId,
        query: "find process execution sinks",
        topK: 5,
      },
    )

    expect(anchors).toHaveLength(1)
    expect(anchors[0]?.anchorId).toMatch(/^anchor-/)
    expect(anchors[0]?.score).toBe(1)
    expect(anchors[0]?.vocabulary).toContain("sink")
    expect(anchors[0]?.locations[0]?.path).toBe("src/shell/run.ts")
  })

  it("provides deterministic fixture recall through the Effect service", async () => {
    const program = Effect.gen(function* recallAnchors() {
      const cocoindex = yield* CocoIndexClient
      yield* cocoindex.ensureIndexed({
        repoSnapshotId,
        repoPath: "/workspace/attune",
      })
      return yield* cocoindex.searchAnchors({
        repoSnapshotId,
        runId,
        query: "request body source",
        topK: 2,
        filters: {
          pathPrefix: "src/routes",
          language: "typescript",
        },
      })
    })

    const anchors = await Effect.runPromise(
      program.pipe(
        Effect.provide(CocoIndexClientFixture({ anchors: fixtureAnchors })),
      ),
    )

    expect(anchors.map((anchor) => anchor.anchorId)).toEqual([
      "anchor-http-source",
    ])
  })

  it("retrieves similar anchors by shared vocabulary", async () => {
    const program = Effect.gen(function* searchSimilarAnchors() {
      const cocoindex = yield* CocoIndexClient
      return yield* cocoindex.searchSimilarAnchors({
        repoSnapshotId,
        runId,
        anchorId: "anchor-http-source",
        topK: 1,
      })
    })

    const anchors = await Effect.runPromise(
      program.pipe(
        Effect.provide(CocoIndexClientFixture({ anchors: fixtureAnchors })),
      ),
    )

    expect(anchors[0]?.anchorId).toBe("anchor-spawn-sink")
  })

  it("fails explicitly when an anchor is missing", async () => {
    const program = Effect.gen(function* getMissingAnchor() {
      const cocoindex = yield* CocoIndexClient
      return yield* cocoindex.getAnchor({
        repoSnapshotId,
        runId,
        anchorId: "missing",
      })
    })

    await expect(
      Effect.runPromise(
        program.pipe(
          Effect.provide(CocoIndexClientFixture({ anchors: fixtureAnchors })),
        ),
      ),
    ).rejects.toMatchObject({ _tag: "CocoIndexAnchorNotFound" })
  })
})
