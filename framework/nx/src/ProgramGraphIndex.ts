import {
  createProjectGraphAsync,
  readCachedProjectGraph,
  type ProjectGraph,
  type ProjectGraphDependency,
  type ProjectGraphProjectNode,
} from "nx/src/devkit-exports"
import { hashProtocolValue } from "@attune/framework-protocol"
import {
  programIndexJson,
  type ProgramIndexApi,
  type ProgramIndexEdge,
  type ProgramIndexProject,
  type ProgramIndexTarget,
} from "@attune/framework-sqlite"
import { Effect } from "effect"

export interface NxProgramGraphIndexRows {
  readonly projects: readonly ProgramIndexProject[]
  readonly targets: readonly ProgramIndexTarget[]
  readonly edges: readonly ProgramIndexEdge[]
}

export interface LoadNxProgramGraphOptions {
  readonly preferCached?: boolean
}

export interface NxProgramGraphMaterializationOptions extends LoadNxProgramGraphOptions {
  readonly now?: string
}

export const loadNxProgramGraph = async (
  options: LoadNxProgramGraphOptions = {},
): Promise<ProjectGraph> => {
  if (options.preferCached === true) {
    try {
      return readCachedProjectGraph()
    } catch {
      return createProjectGraphAsync({ exitOnError: false })
    }
  }

  return createProjectGraphAsync({ exitOnError: false })
}

export const nxProjectGraphToProgramIndexRows = (
  graph: ProjectGraph,
  now = new Date().toISOString(),
): NxProgramGraphIndexRows => {
  const nodes = Object.entries(graph.nodes)
  const projects = nodes.map(([projectId, node]) => projectRow(projectId, node, now))
  const targets = nodes.flatMap(([projectId, node]) => targetRows(projectId, node))
  const edges = Object.values(graph.dependencies ?? {})
    .flat()
    .map(projectDependencyEdge)

  return {
    projects: projects.sort((left, right) => left.id.localeCompare(right.id)),
    targets: targets.sort((left, right) =>
      `${left.projectId}:${left.name}`.localeCompare(`${right.projectId}:${right.name}`)
    ),
    edges: edges.sort((left, right) => left.id.localeCompare(right.id)),
  }
}

export const ingestNxProjectGraphRows = (
  index: ProgramIndexApi,
  rows: NxProgramGraphIndexRows,
): Effect.Effect<void, unknown> =>
  Effect.gen(function* ingestRows() {
    yield* index.putProjects(rows.projects)
    yield* index.putTargets(rows.targets)
    yield* index.putEdges(rows.edges)
  })

export const materializeNxProjectGraphIntoProgramIndex = (
  index: ProgramIndexApi,
  options: NxProgramGraphMaterializationOptions = {},
): Effect.Effect<NxProgramGraphIndexRows, unknown> =>
  Effect.tryPromise({
    try: () => loadNxProgramGraph(options),
    catch: (cause) => cause,
  }).pipe(
    Effect.map((graph) => nxProjectGraphToProgramIndexRows(graph, options.now)),
    Effect.tap((rows) => ingestNxProjectGraphRows(index, rows)),
  )

const projectRow = (
  projectId: string,
  node: ProjectGraphProjectNode,
  now: string,
): ProgramIndexProject => {
  const data = node.data
  return {
    id: projectId,
    root: data.root,
    ...(data.sourceRoot === undefined ? {} : { sourceRoot: data.sourceRoot }),
    ...(data.projectType === undefined ? {} : { projectType: data.projectType }),
    hash: hashProtocolValue({
      projectId,
      root: data.root,
      sourceRoot: data.sourceRoot,
      projectType: data.projectType,
      targets: data.targets ?? {},
    }),
    updatedAt: now,
  }
}

const targetRows = (
  projectId: string,
  node: ProjectGraphProjectNode,
): readonly ProgramIndexTarget[] =>
  Object.entries(node.data.targets ?? {}).map(([name, target]) => ({
    projectId,
    name,
    ...(target.executor === undefined ? {} : { executor: target.executor }),
    optionsJson: programIndexJson(target.options ?? {}),
    configurationsJson: programIndexJson(target.configurations ?? {}),
  }))

const projectDependencyEdge = (
  dependency: ProjectGraphDependency,
): ProgramIndexEdge => ({
  id: hashProtocolValue({
    source: "nx-project-graph",
    from: dependency.source,
    to: dependency.target,
    type: dependency.type,
  }),
  fromSymbolId: `project:${dependency.source}`,
  toSymbolId: `project:${dependency.target}`,
  kind: `project-dependency:${dependency.type ?? "unknown"}`,
  source: "nx-project-graph",
})
