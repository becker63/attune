import { Context, Effect, Layer, Schema } from "effect"
import { CounterexampleStore } from "./counterexamples.js"
import type { CounterexampleCandidate } from "../domain/model.js"
import {
  SemanticProjectSeed,
  type SemanticProjectSeed as SemanticProjectSeedType,
} from "../domain/model.js"

const decodeSeeds = (
  seeds: readonly SemanticProjectSeedType[],
): readonly SemanticProjectSeedType[] =>
  Schema.decodeUnknownSync(Schema.Array(SemanticProjectSeed))(seeds)

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 80) || "counterexample"

const extensionFor = (syntaxFlavor: CounterexampleCandidate["syntaxFlavor"]): string =>
  syntaxFlavor

const counterexampleSeedId = (
  candidate: CounterexampleCandidate,
  index: number,
): string => {
  const fingerprint = candidate.query?.fingerprint
  return [
    "semantic-promoted-counterexample",
    slug(candidate.seedId),
    fingerprint === undefined ? `${index + 1}` : slug(fingerprint),
  ].join("-")
}

export const semanticProjectSeedFromCounterexampleCandidate = (
  candidate: CounterexampleCandidate,
  index = 0,
): SemanticProjectSeedType | undefined => {
  if (candidate.source.trim().length === 0) {
    return undefined
  }

  const id = counterexampleSeedId(candidate, index)
  const path = `src/${slug(candidate.seedId)}.${extensionFor(candidate.syntaxFlavor)}`
  return Schema.decodeUnknownSync(SemanticProjectSeed)({
    entrypoint: path,
    files: [
      {
        path,
        role: "entrypoint",
        source: candidate.source,
        syntaxFlavor: candidate.syntaxFlavor,
        tags: [
          "counterexample",
          candidate.failureClass,
          ...candidate.mutators.map((mutator) => mutator.kind),
        ],
      },
    ],
    id,
    origin: "promoted-counterexample",
    tags: [
      "promoted-counterexample",
      candidate.failureClass,
      candidate.syntaxFlavor,
      ...candidate.mutators.map((mutator) => mutator.kind),
    ],
    title: candidate.title ?? `Semantic promoted ${candidate.failureClass} counterexample`,
  })
}

export const curatedSemanticProjectSeeds: readonly SemanticProjectSeedType[] = decodeSeeds([
  {
    entrypoint: "src/handler.js",
    files: [
      {
        path: "src/handler.js",
        role: "entrypoint",
        syntaxFlavor: "js",
        tags: ["js", "source-sink-flow"],
        source:
          "export function handler(input) {\n  const command = input.body.command\n  return sink(command)\n}\nfunction sink(value) { return value }\n",
      },
    ],
    id: "semantic-curated-js-source-sink",
    origin: "curated",
    tags: ["js", "source-sink-flow"],
    title: "JavaScript source to sink flow",
  },
  {
    entrypoint: "src/decode.ts",
    files: [
      {
        path: "src/decode.ts",
        role: "entrypoint",
        syntaxFlavor: "ts",
        tags: ["ts", "generic-decode", "source-sink-flow"],
        source:
          "declare function sink(value: unknown): unknown\nfunction decode<T>(value: T): T { return value }\nexport function handler(input: { readonly body: { readonly command?: string } }) {\n  const command = decode(input.body.command)\n  return sink(command)\n}\n",
      },
    ],
    id: "semantic-curated-ts-generic-decode",
    origin: "curated",
    tags: ["ts", "generic-decode", "source-sink-flow"],
    title: "TypeScript generic decode before sink",
  },
  {
    entrypoint: "src/view.jsx",
    files: [
      {
        path: "src/view.jsx",
        role: "component",
        syntaxFlavor: "jsx",
        tags: ["jsx", "jsx-prop-flow", "source-sink-flow"],
        source:
          "function sink(value) { return value }\nfunction View(props) { return <span>{props.value}</span> }\nexport function handler(input) {\n  const rendered = <View value={input.body.command} />\n  return sink(rendered.props.value)\n}\n",
      },
    ],
    id: "semantic-curated-jsx-prop-flow",
    origin: "curated",
    tags: ["jsx", "jsx-prop-flow", "source-sink-flow"],
    title: "JSX prop flow to sink",
  },
  {
    entrypoint: "src/view.tsx",
    files: [
      {
        path: "src/view.tsx",
        role: "component",
        syntaxFlavor: "tsx",
        tags: ["tsx", "jsx-prop-flow", "source-sink-flow"],
        source:
          "declare function sink(value: unknown): unknown\ntype ViewProps = { readonly value: unknown }\nfunction View(props: ViewProps) { return <span>{props.value}</span> }\nexport function handler(input: { readonly body: { readonly command: string } }) {\n  const rendered = <View value={input.body.command} />\n  return sink(rendered.props.value)\n}\n",
      },
    ],
    id: "semantic-curated-tsx-component-flow",
    origin: "curated",
    tags: ["tsx", "jsx-prop-flow", "source-sink-flow"],
    title: "TSX component prop flow",
  },
  {
    entrypoint: "src/index.ts",
    files: [
      {
        path: "src/index.ts",
        role: "entrypoint",
        syntaxFlavor: "ts",
        tags: ["ts", "modules", "import-export"],
        source:
          "import { normalizeCommand } from './normalize'\nexport { normalizeCommand }\nexport function handler(input: { readonly body: { readonly command: string } }) {\n  return normalizeCommand(input.body.command)\n}\n",
      },
      {
        path: "src/normalize.ts",
        role: "module",
        syntaxFlavor: "ts",
        tags: ["ts", "modules", "import-export"],
        source:
          "export const normalizeCommand = (command: string): string => command.trim().toLowerCase()\nexport default normalizeCommand\n",
      },
    ],
    id: "semantic-curated-ts-modules-import-export",
    origin: "curated",
    tags: ["ts", "modules", "import-export"],
    title: "TypeScript module import/export project",
  },
  {
    entrypoint: "src/async-flow.ts",
    files: [
      {
        path: "src/async-flow.ts",
        role: "entrypoint",
        syntaxFlavor: "ts",
        tags: ["ts", "async-flow", "source-sink-flow"],
        source:
          "declare function sink(value: unknown): unknown\nasync function loadCommand(input: { readonly body: { readonly command: string } }): Promise<string> {\n  return await Promise.resolve(input.body.command)\n}\nexport async function handler(input: { readonly body: { readonly command: string } }) {\n  const command = await loadCommand(input)\n  return sink(command)\n}\n",
      },
    ],
    id: "semantic-curated-ts-async-flow",
    origin: "curated",
    tags: ["ts", "async-flow", "source-sink-flow"],
    title: "TypeScript async source flow",
  },
  {
    entrypoint: "src/controller.ts",
    files: [
      {
        path: "src/controller.ts",
        role: "entrypoint",
        syntaxFlavor: "ts",
        tags: ["ts", "class-method", "source-sink-flow"],
        source:
          "declare function sink(value: unknown): unknown\nclass Controller {\n  handle(command: string): unknown {\n    return sink(command)\n  }\n}\nexport function handler(input: { readonly body: { readonly command: string } }) {\n  return new Controller().handle(input.body.command)\n}\n",
      },
    ],
    id: "semantic-curated-ts-class-method",
    origin: "curated",
    tags: ["ts", "class-method", "source-sink-flow"],
    title: "TypeScript class method flow",
  },
  {
    entrypoint: "src/destructure.js",
    files: [
      {
        path: "src/destructure.js",
        role: "entrypoint",
        syntaxFlavor: "js",
        tags: ["js", "object-destructuring", "source-sink-flow"],
        source:
          "function sink(value) { return value }\nexport function handler({ body: { command } }) {\n  const payload = { command, seen: true }\n  return sink(payload.command)\n}\n",
      },
    ],
    id: "semantic-curated-js-object-destructuring",
    origin: "curated",
    tags: ["js", "object-destructuring", "source-sink-flow"],
    title: "JavaScript object destructuring flow",
  },
])

export interface SemanticCorpusStoreService {
  readonly list: Effect.Effect<readonly SemanticProjectSeedType[]>
}

export class SemanticCorpusStore extends Context.Tag(
  "attune/joern-effect-properties/fuzz/SemanticCorpusStore",
)<SemanticCorpusStore, SemanticCorpusStoreService>() {}

export const makeInMemorySemanticCorpusStore = (
  seeds: readonly SemanticProjectSeedType[] = curatedSemanticProjectSeeds,
  promotedSeeds: Effect.Effect<readonly SemanticProjectSeedType[]> = Effect.succeed([]),
): SemanticCorpusStoreService => ({
  list: Effect.map(promotedSeeds, (promoted) => decodeSeeds([...seeds, ...promoted])),
})

export const SemanticCorpusStoreLive: Layer.Layer<SemanticCorpusStore> = Layer.succeed(
  SemanticCorpusStore,
  makeInMemorySemanticCorpusStore(),
)

export const SemanticCorpusStoreWithCounterexamplesLive: Layer.Layer<
  SemanticCorpusStore,
  never,
  CounterexampleStore
> = Layer.effect(
  SemanticCorpusStore,
  CounterexampleStore.pipe(
    Effect.map((counterexamples) =>
      makeInMemorySemanticCorpusStore(
        curatedSemanticProjectSeeds,
        Effect.map(counterexamples.list, (candidates) =>
          candidates.flatMap((candidate, index) => {
            const seed = semanticProjectSeedFromCounterexampleCandidate(candidate, index)
            return seed === undefined ? [] : [seed]
          })
        ),
      )
    ),
  ),
)

export type ProjectCorpusStoreService = SemanticCorpusStoreService
export const projectTemplateFromCounterexampleCandidate = semanticProjectSeedFromCounterexampleCandidate
export const ProjectCorpusStore = SemanticCorpusStore
export const makeInMemoryProjectCorpusStore = makeInMemorySemanticCorpusStore
export const ProjectCorpusStoreLive = SemanticCorpusStoreLive
export const ProjectCorpusStoreWithCounterexamplesLive = SemanticCorpusStoreWithCounterexamplesLive
