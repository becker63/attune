export { raw } from "./builder/raw.js"
export { property, type Property } from "./builder/property.js"
export {
  BoundFlow,
  BoundTraversal,
  FlowTraversal,
  MaterializationBuilder,
} from "./builder/traversal.js"
export {
  CpgProgram,
  CpgProgramDefinition,
  GraphWeights,
  type CompiledCpgProgram,
} from "./program/CpgProgram.js"
export { CpgProgramBuilder } from "./program/CpgProgramBuilder.js"
export type { BindingAst, BoundLike, VariableId } from "./program/model.js"
export {
  CpgGraph,
  EdgeKind,
  EvidenceEdge,
  EvidenceGraph,
  EvidenceNode,
  Finding,
  GraphFact,
  GraphAnalysisError,
  GraphMaterializationError,
  NodeKind,
  ProtocolDeviation,
} from "./program/Evidence.js"
export { cpg } from "./generated/cpg.js"
export { nodes } from "./generated/nodes.js"
export { prop } from "./generated/prop.js"
export { generatedSchema } from "./generated/schema.js"
export { traversalPropertyFilters, traversalStepNames } from "./generated/traversal.js"
export type { TraversalSegment } from "./builder/traversal.js"
