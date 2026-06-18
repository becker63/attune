import { Schema } from "effect"
import { definePhaseContract } from "@attune/fork"
import { AttuneEventEnvelope } from "@attune/eventing"

export const GeneratedRepoFile = Schema.Struct({
  path: Schema.String,
  contents: Schema.String,
})

export const GeneratedRepoSpec = Schema.Struct({
  files: Schema.Array(GeneratedRepoFile),
})

export const SourceSinkScenarioContract = Schema.Struct({
  expected: Schema.String,
  id: Schema.String,
  repo: GeneratedRepoSpec,
})

export const SourceSinkObservationContract = Schema.Struct({
  scenarioId: Schema.String,
  summary: Schema.String,
})

export const bridgePhaseContract = definePhaseContract({
  phase: "bridge",
  schemas: {
    AttuneEventEnvelope,
    GeneratedRepoFile,
    GeneratedRepoSpec,
    SourceSinkObservationContract,
    SourceSinkScenarioContract,
  },
  laws: [
    { name: "schema.decode-encode-roundtrip", kind: "schema", subject: "SourceSinkScenarioContract" },
    { name: "edge-outputs-decode-through-bridge", kind: "adapter", subject: "SourceSinkObservationContract" },
  ],
  forbidden: ["node:fs", "process.env", "Effect.runPromise"],
})

export default bridgePhaseContract
