export type VariableId = `v${number}`
export type BindingPhase = "remote" | "flow" | "materialized" | "derived" | "evidence"

export type BoundLike = {
  readonly variable: string
  readonly bindingName: string
  readonly cpgqlName: string
  readonly phase: BindingPhase
}

export type BindingAst = {
  readonly _tag: "RemoteTraversalBinding" | "RemoteFlowBinding" | "MaterializedGraphBinding" | "GraphPassBinding"
  readonly variable: VariableId
  readonly name: string
  readonly cpgqlName: string
  readonly phase: BindingPhase
  readonly cpgql?: string
  readonly root?: VariableId
  readonly source?: VariableId
  readonly sink?: VariableId
  readonly relation?: "reachableBy" | "reachableByFlows"
  readonly filters?: readonly FlowFilterAst[]
  readonly includes?: readonly GraphIncludeAst[]
}

export type FlowFilterAst = {
  readonly _tag: "Where" | "WhereNot"
  readonly cpgql: string
}

export type GraphIncludeAst = {
  readonly _tag: "Path" | "Traversal" | "Nearest" | "Missing"
  readonly cpgql?: string
  readonly variable?: string
  readonly cpgqlName?: string
  readonly phase?: BindingPhase
}
