import { Context } from "effect"

export type CpgProgramBuilderService = {
  readonly state: unknown
  readonly bindTraversal: (name: string, traversal: unknown) => unknown
  readonly bindFlow: (name: string, flow: unknown) => unknown
  readonly bindMaterializedGraph: (name: string, materialization: unknown) => unknown
  readonly bindGraphPath: (name: string, path: unknown) => unknown
  readonly bindGraphFact: (name: string, fact: unknown) => unknown
  readonly rows: (traversal: unknown, selection: unknown) => unknown
}

export class CpgProgramBuilder extends Context.Tag(
  "joern-effect/CpgProgramBuilder",
)<CpgProgramBuilder, CpgProgramBuilderService>() {}
