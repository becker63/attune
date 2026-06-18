import { definePhaseContract } from "@attune/fork"
import { SourceSinkScenario } from "./SourceSinkPipeline.js"

export const sourceSinkHarnessContract = definePhaseContract({
  phase: "harness",
  schemas: {
    SourceSinkScenario,
  },
  laws: [
    { name: "scenario-generators-produce-valid-bridge-values", kind: "harness", subject: "SourceSinkScenario" },
    { name: "shrinking-preserves-validity", kind: "harness", subject: "SourceSinkScenario" },
  ],
  forbidden: ["node:fs in harness TypeScript", "process.env in harness TypeScript", "Joern process calls"],
})

export default sourceSinkHarnessContract
