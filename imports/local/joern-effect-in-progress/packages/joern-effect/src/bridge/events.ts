import {
  makeEvent,
  makeJsonFileEventSink,
  makeJsonlEventSink,
  makeNoopEventSink,
  makeRunId,
  type AttuneEvent,
  type EventBase,
  type EventSink,
} from "@attune/eventing"

export {
  makeEvent,
  makeJsonFileEventSink,
  makeJsonlEventSink,
  makeNoopEventSink,
  makeRunId,
  type AttuneEvent,
  type EventBase,
  type EventSink,
} from "@attune/eventing"

const joernEffectComponents = [
  {
    description: "Generated schemas, query builders, and immutable value contracts.",
    exports: ["packages/joern-effect/src/pure/index.ts"],
    invariants: ["pure-does-not-know-runtime"],
    name: "pure",
    owns: ["schema", "builder", "program-model"],
    targets: ["//packages/joern-effect:pure"],
    zones: [
      {
        description: "Generated Joern schema and traversal surface.",
        name: "generated",
        paths: ["packages/joern-effect/src/pure/generated/**"],
      },
      {
        description: "Descriptive traversal and query-plan construction.",
        name: "builder",
        paths: ["packages/joern-effect/src/pure/builder/**"],
      },
      {
        description: "Pure program and evidence value model.",
        name: "program",
        paths: ["packages/joern-effect/src/pure/program/**"],
      },
    ],
  },
  {
    description: "Typed event, schema, and adapter contracts between pure values and edges.",
    exports: ["packages/joern-effect/src/bridge/index.ts"],
    invariants: ["bridge-describes-boundaries-only"],
    name: "bridge",
    owns: ["events", "contracts"],
    targets: ["//packages/joern-effect:bridge"],
    zones: [
      {
        description: "Shared event helpers and phase registration events.",
        name: "events",
        paths: ["packages/joern-effect/src/bridge/**"],
      },
    ],
  },
  {
    description: "Generated source/sink pressure harness and properties.",
    exports: ["packages/joern-effect/harness/source-sink/src/index.ts"],
    invariants: ["harness-generates-evidence-without-io"],
    name: "harness",
    owns: ["properties", "fixtures"],
    targets: ["//packages/joern-effect/harness/source-sink:property"],
    zones: [
      {
        description: "Source/sink property runtime and generators.",
        name: "source-sink",
        paths: ["packages/joern-effect/harness/source-sink/**"],
      },
    ],
  },
  {
    description: "Joern, filesystem, process, and environment adapters.",
    exports: ["packages/joern-effect/src/edge/index.ts"],
    invariants: ["edge-impurity-is-contained"],
    name: "edge",
    owns: ["runtime", "process"],
    targets: ["//packages/joern-effect:edge"],
    zones: [
      {
        description: "Effect-scoped Joern and process runtime.",
        name: "runtime",
        paths: ["packages/joern-effect/src/edge/runtime/**"],
      },
    ],
  },
] as const

export const makeJoernEffectEvent = (
  base: Omit<EventBase, "project">,
  input: Readonly<{
    readonly eventType: string
    readonly source: "dsl" | "property" | "joern" | "decode" | "materialize" | "script"
    readonly payload?: Readonly<Record<string, unknown>>
  }>,
): AttuneEvent =>
  makeEvent(
    {
      ...base,
      pack: base.pack ?? "joern-effect",
      project: "joern-effect",
    },
    input,
  )

export const joernEffectComponentEvents = (
  base: Omit<EventBase, "project" | "pack" | "phase" | "zone">,
): readonly AttuneEvent[] =>
  joernEffectComponents.flatMap((component) => [
    makeJoernEffectEvent(
      {
        ...base,
        phase: component.name,
      },
      {
        eventType: "joern_effect.component_registered",
        payload: {
          description: component.description,
          exports: component.exports,
          invariants: component.invariants,
          owns: component.owns,
          targets: component.targets,
          zones: component.zones.map((zone) => zone.name),
        },
        source: "script",
      },
    ),
    ...component.zones.map((zone) =>
      makeJoernEffectEvent(
        {
          ...base,
          phase: component.name,
          zone: zone.name,
        },
        {
          eventType: "joern_effect.zone_registered",
          payload: {
            description: zone.description,
            paths: zone.paths,
          },
          source: "script",
        },
      ),
    ),
  ])
