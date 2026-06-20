import type {
  DispatchFilter,
  DispatchItem,
  DispatchMdxDocument,
  DispatchMdxPage,
  DispatchRoute,
  FoldkitMdxBlock,
  FoldkitMdxComponentName,
  FoldkitMdxProp,
  FoldkitMdxPropValue,
  WorkThread,
  WorkThreadStatus,
} from "@attune/dispatch-schema"
import { buildFixtureWorkbenchSnapshot } from "@attune/attuned-discovery"

export const dispatchSemanticWorkbenchSnapshot = buildFixtureWorkbenchSnapshot()

export const dispatchFixtureItems: ReadonlyArray<DispatchItem> = [
  {
    id: "dispatch-20260619-spec",
    threadId: "dispatch-foldkit-mdx",
    occurredAt: "2026-06-19T04:45:00.000Z",
    severity: "success",
    kind: "work",
    title: "FoldKit MDX migration spec drafted",
    summary:
      "The Dispatch frontend plan now treats MDX as the constrained agent DSL and FoldKit as the renderer.",
    body:
      "The spec is grounded in the v0 React mockup, the imported FoldKit app, and the FoldKit package source.",
    risk: "low",
    requiresHuman: false,
    agent: "Codex",
    refs: [
      {
        kind: "spec",
        label: "add-dispatch-foldkit-frontend",
        href: "openspec/changes/add-dispatch-foldkit-frontend",
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
    id: "dispatch-20260619-linear",
    threadId: "dispatch-foldkit-mdx",
    occurredAt: "2026-06-19T04:47:30.000Z",
    severity: "success",
    kind: "linear",
    title: "Linear milestone and implementation issues created",
    summary:
      "SEA-204 through SEA-209 track the one-week Dispatch FoldKit MDX frontend slice.",
    body:
      "The work is split into spec, compiler, Nx packages, visual route migration, Dispatch feeds, and live integration.",
    risk: "low",
    requiresHuman: false,
    agent: "Codex",
    refs: [
      {
        kind: "linear",
        label: "Dispatch FoldKit MDX Frontend",
        href: "https://linear.app/searchbench/project/attune-post-infra-product-rollout-0c43acd6de83",
      },
    ],
    tags: ["linear", "planning"],
    sourceMode: "fixture",
  },
  {
    id: "dispatch-20260619-fuzzer",
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
    id: "dispatch-20260619-safety",
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
    id: "dispatch-20260619-live",
    threadId: "dispatch-live-integration",
    occurredAt: "2026-06-19T04:47:19.000Z",
    severity: "blocked",
    kind: "agent",
    title: "Live Linear/Codex/Git integration queued",
    summary:
      "Fixture-mode Dispatch lands first, then live projection work starts from SEA-209.",
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
  items: ReadonlyArray<DispatchItem>,
): ReadonlyArray<WorkThread> => {
  const grouped = new Map<string, Array<DispatchItem>>()
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

export const filterDispatchItems = (
  items: ReadonlyArray<DispatchItem>,
  filter: DispatchFilter,
): ReadonlyArray<DispatchItem> => {
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

export const dispatchSummaryCounts = (items: ReadonlyArray<DispatchItem>) => ({
  total: items.length,
  review: items.filter((item) => item.requiresHuman).length,
  safety: items.filter((item) => item.severity === "safety").length,
  failed: items.filter((item) => item.severity === "failure").length,
})

export const dispatchWorkbenchMdx = `---
route: dispatch
title: Attune Dispatch
description: A calm event river for autonomous Attune work.
---

<PageHeader eyebrow="Dispatch" title="Attune Dispatch" subtitle="A phone-friendly river of agent work, validation, safety gates, and human actions." />

<StatStrip items={["5 items", "1 human action", "1 safety gate", "0 failures"]} />

<DispatchRiver source="fixture-current-rollout" />

<ActionBar note="Linear remains the ledger. Dispatch is the readable monitoring surface." actions={["Open review feed", "Open safety feed"]} />
`

export const compileFoldkitMdx = (
  source: string,
  sourcePath: string,
): DispatchMdxPage => {
  const { frontmatter, body } = readFrontmatter(source)
  const route = routeFromFrontmatter(frontmatter.route)
  const title = frontmatter.title ?? "Untitled"
  const description = frontmatter.description ?? ""
  const document: DispatchMdxDocument = {
    id: sourcePath,
    sourcePath,
    frontmatter: {
      route,
      title,
      description,
    },
    blocks: parseBlocks(body),
    references: [],
    componentRegistryVersion: "dispatch-foldkit-mdx.v0",
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
  items: ReadonlyArray<DispatchItem>,
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
  "dispatch",
  "thread",
  "digest-today",
  "digest-week",
  "safety",
  "discover",
  "workbench",
  "findings",
  "lineage",
  "exports",
  "settings",
])

const routeFromFrontmatter = (route: string | undefined): DispatchRoute =>
  route !== undefined && knownRoutes.has(route)
    ? (route as DispatchRoute)
    : "dispatch"

export const renderDispatchJsonFeed = (
  items: ReadonlyArray<DispatchItem>,
): string =>
  JSON.stringify(
    {
      version: "https://jsonfeed.org/version/1.1",
      title: "Attune Dispatch",
      home_page_url: "/dispatch",
      feed_url: "/feeds/dispatch.json",
      items: items.map((item) => ({
        id: item.id,
        url: item.refs[0]?.href ?? `/dispatch/threads/${item.threadId}`,
        title: item.title,
        summary: item.summary,
        content_text: item.body,
        date_published: item.occurredAt,
        tags: item.tags,
      })),
    },
    null,
    2,
  )

export const renderDispatchRssFeed = (
  items: ReadonlyArray<DispatchItem>,
): string => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Attune Dispatch</title>
    <link>/dispatch</link>
    <description>A calm event river for autonomous Attune work.</description>
${items.map(renderRssItem).join("\n")}
  </channel>
</rss>
`

export const renderDispatchAtomFeed = (
  items: ReadonlyArray<DispatchItem>,
): string => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Attune Dispatch</title>
  <id>attune-dispatch</id>
  <updated>${escapeXml(items[0]?.occurredAt ?? new Date(0).toISOString())}</updated>
${items.map(renderAtomEntry).join("\n")}
</feed>
`

export const selectReviewFeedItems = (
  items: ReadonlyArray<DispatchItem>,
): ReadonlyArray<DispatchItem> => items.filter((item) => item.requiresHuman)

export const selectSafetyFeedItems = (
  items: ReadonlyArray<DispatchItem>,
): ReadonlyArray<DispatchItem> =>
  items.filter((item) => item.severity === "safety")

export const selectFailureFeedItems = (
  items: ReadonlyArray<DispatchItem>,
): ReadonlyArray<DispatchItem> =>
  items.filter((item) => item.severity === "failure")

const renderRssItem = (item: DispatchItem): string => `    <item>
      <guid>${escapeXml(item.id)}</guid>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.refs[0]?.href ?? `/dispatch/threads/${item.threadId}`)}</link>
      <description>${escapeXml(item.summary)}</description>
      <pubDate>${escapeXml(new Date(item.occurredAt).toUTCString())}</pubDate>
    </item>`

const renderAtomEntry = (item: DispatchItem): string => `  <entry>
    <id>${escapeXml(item.id)}</id>
    <title>${escapeXml(item.title)}</title>
    <updated>${escapeXml(item.occurredAt)}</updated>
    <summary>${escapeXml(item.summary)}</summary>
    <link href="${escapeXml(item.refs[0]?.href ?? `/dispatch/threads/${item.threadId}`)}" />
  </entry>`

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
