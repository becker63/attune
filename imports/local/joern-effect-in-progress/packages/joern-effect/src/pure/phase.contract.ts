import { definePhaseContract } from "@attune/fork"
import { EvidenceEdge, EvidenceGraph, EvidenceNode, Finding } from "./program/Evidence.js"

export const purePhaseContract = definePhaseContract({
  phase: "pure",
  schemas: {
    EvidenceEdge,
    EvidenceGraph,
    EvidenceNode,
    Finding,
  },
  laws: [
    { name: "query-rendering-is-deterministic", kind: "algebra", subject: "Traversal" },
    { name: "evidence-fingerprint-is-stable", kind: "algebra", subject: "EvidenceGraph" },
  ],
  forbidden: ["node:fs", "node:child_process", "process.env", "Effect.runPromise"],
})

export default purePhaseContract
