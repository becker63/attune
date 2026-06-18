import { definePhaseContract } from "@attune/fork"
import { JoernDecodeError, JoernError } from "./runtime/errors.js"

export const edgePhaseContract = definePhaseContract({
  phase: "edge",
  schemas: {
    JoernDecodeError,
    JoernError,
  },
  laws: [
    { name: "edge-impurity-is-contained", kind: "adapter", subject: "Joern" },
    { name: "runtime-failures-are-typed", kind: "adapter", subject: "JoernError" },
  ],
  forbidden: ["raw ChildProcess export", "untyped JSON upward"],
})

export default edgePhaseContract
