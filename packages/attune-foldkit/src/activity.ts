import type {
  ActivityFilter,
  ActivityItem,
  AttuneRoute,
  FoldkitDocument,
  FoldkitMdxBlock,
  FoldkitMdxComponentName,
  FoldkitMdxProp,
  FoldkitMdxPropValue,
  FoldkitPage,
  WorkThread,
  WorkThreadStatus,
} from "./schema.js"

export const activityFixtureItems: ReadonlyArray<ActivityItem> = [
  {
    id: "activity-20260619-mdx",
    threadId: "foldkit-mdx",
    occurredAt: "2026-06-19T04:45:00.000Z",
    severity: "success",
    kind: "work",
    title: "FoldKit MDX product surface drafted",
    summary:
      "The product UI treats MDX as the constrained agent DSL and FoldKit as the renderer.",
    body:
      "The fixture is grounded in the v0 product pages, the imported FoldKit app, and the FoldKit package source.",
    risk: "low",
    requiresHuman: false,
    agent: "Codex",
    refs: [
      {
        kind: "spec",
        label: "semantic-workbench",
        href: "openspec/changes/add-attuned-semantic-workbench",
      },
      {
        kind: "linear",
        label: "SEA-204",
        href: "https://linear.app/searchbench/issue/SEA-204",
      },
    ],
    tags: ["foldkit-mdx", "openspec"],
    sourceMode: "fixture",
  },
  {
    id: "activity-20260619-linear",
    threadId: "foldkit-mdx",
    occurredAt: "2026-06-19T04:47:30.000Z",
    severity: "success",
    kind: "linear",
    title: "Workbench milestone and implementation issues created",
    summary:
      "SEA-204 through SEA-209 track the one-week FoldKit product UI slice.",
    body:
      "The work is split into spec, compiler, Nx package, visual route migration, and live integration.",
    risk: "low",
    requiresHuman: false,
    agent: "Codex",
    refs: [
      {
        kind: "linear",
        label: "FoldKit Workbench UI",
        href: "https://linear.app/searchbench/project/attune-post-infra-product-rollout-0c43acd6de83",
      },
    ],
    tags: ["linear", "planning"],
    sourceMode: "fixture",
  },
  {
    id: "activity-20260619-fuzzer",
    threadId: "joern-fuzzer-workbench",
    occurredAt: "2026-06-19T04:24:48.000Z",
    severity: "warning",
    kind: "fuzzer",
    title: "Fuzzer workbench remains an agent tool",
    summary:
      "The autonomous workstation plan keeps joern-effect fuzzing bounded for agents and human-gated for long burns.",
    body:
      "Agents can run smoke/workbench jobs, summarize Axiom evidence, and open follow-up issues without launching unattended campaigns.",
    risk: "medium",
    requiresHuman: false,
    agent: "Codex",
    refs: [
      {
        kind: "linear",
        label: "SEA-201",
        href: "https://linear.app/searchbench/issue/SEA-201",
      },
    ],
    tags: ["fuzzer", "axiom", "agent-workbench"],
    sourceMode: "fixture",
  },
  {
    id: "activity-20260619-safety",
    threadId: "autonomous-workstation",
    occurredAt: "2026-06-19T04:24:51.000Z",
    severity: "safety",
    kind: "safety",
    title: "Codex app-server startup remains human-reviewed",
    summary:
      "The startup task is documented but not installed automatically; loopback binding and token handling require review.",
    body:
      "This protects the local workstation while preserving a future route to an Attune orchestrator.",
    risk: "safety-critical",
    requiresHuman: true,
    agent: "Codex",
    refs: [
      {
        kind: "linear",
        label: "SEA-203",
        href: "https://linear.app/searchbench/issue/SEA-203",
      },
    ],
    tags: ["safety", "codex-app-server"],
    sourceMode: "fixture",
  },
  {
    id: "activity-20260619-live",
    threadId: "live-integration",
    occurredAt: "2026-06-19T04:47:19.000Z",
    severity: "blocked",
    kind: "agent",
    title: "Live Linear/Codex/Git integration queued",
    summary:
      "Fixture-mode Workbench lands first, then live projection work starts from SEA-209.",
    body:
      "The UI should show fixture-derived versus live-derived items and degrade to fixture history if connectors fail.",
    risk: "medium",
    requiresHuman: false,
    agent: "Codex",
    refs: [
      {
        kind: "linear",
        label: "SEA-209",
        href: "https://linear.app/searchbench/issue/SEA-209",
      },
    ],
    tags: ["live-integration", "linear", "git"],
    sourceMode: "fixture",
  },
]

export const deriveThreads = (
  items: ReadonlyArray<ActivityItem>,
): ReadonlyArray<WorkThread> => {
  const grouped = new Map<string, Array<ActivityItem>>()
  for (const item of items) {
    const next = grouped.get(item.threadId) ?? []
    next.push(item)
    grouped.set(item.threadId, next)
  }

  return [...grouped.entries()]
    .map(([id, threadItems]) => {
      const sorted = [...threadItems].sort((a, b) =>
        b.occurredAt.localeCompare(a.occurredAt),
      )
      const latest = sorted[0]!

      return {
        id,
        title: titleFromThreadId(id),
        status: deriveThreadStatus(sorted),
        requiresHuman: sorted.some((item) => item.requiresHuman),
        lastOccurredAt: latest.occurredAt,
        items: sorted,
      }
    })
    .sort((a, b) => b.lastOccurredAt.localeCompare(a.lastOccurredAt))
}

export const filterActivityItems = (
  items: ReadonlyArray<ActivityItem>,
  filter: ActivityFilter,
): ReadonlyArray<ActivityItem> => {
  if (filter === "all") {
    return [...items]
  }
  if (filter === "review") {
    return items.filter((item) => item.requiresHuman)
  }
  if (filter === "safety") {
    return items.filter((item) => item.severity === "safety")
  }
  return items.filter((item) => item.severity === "failure")
}

export const activitySummaryCounts = (items: ReadonlyArray<ActivityItem>) => ({
  total: items.length,
  review: items.filter((item) => item.requiresHuman).length,
  safety: items.filter((item) => item.severity === "safety").length,
  failed: items.filter((item) => item.severity === "failure").length,
})

export const workbenchMdx = `---
route: workbench
title: Workbench
description: Atom-derived fixture workbench.
---

<PageHeader eyebrow="Workbench" title="Server atoms derive meaning; FoldKit steers the lens" subtitle="FoldKit reads an atom-derived snapshot." />

<StatStrip items={["3 events", "1 snapshot", "0 failures", "1 review"]} />

<ActivityList source="fixture-current-rollout" />

<ActionBar primary="Promote rule" command="promote" secondary="View findings" secondaryRoute="findings" />
`

export const compileFoldkitMdx = (
  source: string,
  sourcePath: string,
): FoldkitPage => {
  const { frontmatter, body } = readFrontmatter(source)
  const route = routeFromFrontmatter(frontmatter.route)
  const title = frontmatter.title ?? "Untitled"
  const description = frontmatter.description ?? ""
  const document: FoldkitDocument = {
    id: sourcePath,
    sourcePath,
    frontmatter: {
      route,
      title,
      description,
    },
    blocks: parseBlocks(body),
    references: [],
    componentRegistryVersion: "attune-foldkit-mdx.v0",
  }

  return {
    id: sourcePath,
    route,
    title,
    description,
    document,
  }
}

const titleFromThreadId = (id: string): string =>
  id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const deriveThreadStatus = (
  items: ReadonlyArray<ActivityItem>,
): WorkThreadStatus => {
  if (items.some((item) => item.severity === "failure")) {
    return "failed"
  }
  if (items.some((item) => item.severity === "blocked")) {
    return "blocked"
  }
  if (items.some((item) => item.requiresHuman)) {
    return "needs-review"
  }
  if (items.some((item) => item.severity === "success")) {
    return "completed"
  }
  return "active"
}

const readFrontmatter = (
  source: string,
): {
  readonly frontmatter: Readonly<Record<string, string>>
  readonly body: string
} => {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/)
  if (match === null) {
    return { frontmatter: {}, body: source }
  }

  const entries = match[1]!
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .flatMap((line) => {
      const separator = line.indexOf(":")
      if (separator < 0) {
        return []
      }
      const key = line.slice(0, separator).trim()
      const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "")
      return [[key, value] as const]
    })

  return {
    frontmatter: Object.fromEntries(entries),
    body: source.slice(match[0].length),
  }
}

const parseBlocks = (body: string): ReadonlyArray<FoldkitMdxBlock> => {
  const lines = body.split("\n")
  const blocks: Array<FoldkitMdxBlock> = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]!
    if (line.trim().length === 0) {
      index += 1
      continue
    }

    if (line.startsWith("```")) {
      const parsed = parseCodeBlock(lines, index)
      blocks.push(parsed.block)
      index = parsed.nextIndex
      continue
    }

    if (line.startsWith("#")) {
      blocks.push(parseHeadingBlock(line))
      index += 1
      continue
    }

    if (line.trim().startsWith("<")) {
      const parsed = parseComponentBlock(lines, index)
      const component = parseComponent(parsed.source)
      if (component !== undefined) {
        blocks.push(component)
      }
      index = parsed.nextIndex
      continue
    }

    const parsed = parseParagraphBlock(lines, index)
    blocks.push(parsed.block)
    index = parsed.nextIndex
  }

  return blocks
}

const parseCodeBlock = (
  lines: ReadonlyArray<string>,
  startIndex: number,
): { readonly block: FoldkitMdxBlock; readonly nextIndex: number } => {
  const language = lines[startIndex]!.slice(3).trim()
  const codeLines: Array<string> = []
  let index = startIndex + 1

  while (index < lines.length && !lines[index]!.startsWith("```")) {
    codeLines.push(lines[index]!)
    index += 1
  }

  return {
    block: { _tag: "Code", language, code: codeLines.join("\n") },
    nextIndex: index + 1,
  }
}

const parseHeadingBlock = (line: string): FoldkitMdxBlock => {
  const level = Math.min(line.match(/^#+/)?.[0].length ?? 1, 6)

  return {
    _tag: "Heading",
    level,
    text: line.slice(level).trim(),
  }
}

const parseComponentBlock = (
  lines: ReadonlyArray<string>,
  startIndex: number,
): { readonly source: string; readonly nextIndex: number } => {
  const componentLines = [lines[startIndex]!]
  let index = startIndex + 1

  while (
    index < lines.length &&
    !componentLines.join("\n").trim().endsWith("/>")
  ) {
    componentLines.push(lines[index]!)
    index += 1
  }

  return {
    source: componentLines.join("\n"),
    nextIndex: index,
  }
}

const parseParagraphBlock = (
  lines: ReadonlyArray<string>,
  startIndex: number,
): { readonly block: FoldkitMdxBlock; readonly nextIndex: number } => {
  const paragraphLines = [lines[startIndex]!.trim()]
  let index = startIndex + 1

  while (index < lines.length && lines[index]!.trim().length > 0) {
    paragraphLines.push(lines[index]!.trim())
    index += 1
  }

  return {
    block: { _tag: "Paragraph", text: paragraphLines.join(" ") },
    nextIndex: index,
  }
}

const parseComponent = (source: string): FoldkitMdxBlock | undefined => {
  const match = source.trim().match(/^<([A-Za-z][A-Za-z0-9]*)\s*([\s\S]*?)\/>$/)
  if (match === null) {
    return undefined
  }

  return {
    _tag: "Component",
    name: match[1]! as FoldkitMdxComponentName,
    props: parseProps(match[2] ?? ""),
    textChildren: [],
  }
}

const parseProps = (source: string): ReadonlyArray<FoldkitMdxProp> => {
  const props: Array<FoldkitMdxProp> = []
  const propPattern =
    /([A-Za-z][A-Za-z0-9_-]*)=(?:"([^"]*)"|'([^']*)'|\{([\s\S]*?)\})(?=\s+[A-Za-z][A-Za-z0-9_-]*=|\s*$)/g
  let match: RegExpExecArray | null

  while ((match = propPattern.exec(source)) !== null) {
    const rawValue = match[2] ?? match[3] ?? match[4] ?? ""
    props.push({
      name: match[1]!,
      value: parsePropValue(rawValue.trim()),
    })
  }

  return props
}

const parsePropValue = (raw: string): FoldkitMdxPropValue => {
  if (raw === "true") {
    return true
  }
  if (raw === "false") {
    return false
  }
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) {
    return Number(raw)
  }
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      return stringArrayFromJson(JSON.parse(raw))
    } catch {
      return raw
    }
  }
  return raw
}

const stringArrayFromJson = (value: unknown): ReadonlyArray<string> => {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is string => typeof item === "string")
}

const knownRoutes: ReadonlySet<string> = new Set([
  "discover",
  "workbench",
  "findings",
  "lineage",
  "exports",
  "settings",
])

const routeFromFrontmatter = (route: string | undefined): AttuneRoute =>
  route !== undefined && knownRoutes.has(route)
    ? (route as AttuneRoute)
    : "workbench"
