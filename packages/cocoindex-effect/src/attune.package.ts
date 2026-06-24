import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "cocoindex.index-freshness.changed",
    "cocoindex.search-request.changed",
    "cocoindex.search-result.changed",
    "cocoindex.normalized-anchors.changed",
    "cocoindex.anchor-lookup.changed",
    "cocoindex.repository-tool-status.changed",
    "cocoindex.mcp-tool-registry.changed",
    "cocoindex.command-lifecycle.changed",
  ],
  atoms: [
    "indexStatusAtom",
    "searchRequestAtom",
    "searchResultAtom",
    "normalizedAnchorsAtom",
    "anchorLookupAtom",
    "repositoryToolStatusAtom",
    "mcpToolRegistryAtom",
    "commandLifecycleAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "cocoindex-effect",
  kind: "semantic-recall-service",
  symbols: [
    {
      id: "ensure-indexed",
      kind: "command",
      name: "Ensure CocoIndex index freshness",
    },
    {
      id: "search-anchors",
      kind: "query",
      name: "Search CocoIndex anchors",
    },
    {
      id: "search-similar-anchors",
      kind: "query",
      name: "Search similar CocoIndex anchors",
    },
    {
      id: "get-anchor",
      kind: "query",
      name: "Get CocoIndex anchor",
    },
    {
      id: "fixture-client-query",
      kind: "query",
      name: "Fixture CocoIndex client query",
    },
    {
      id: "normalize-raw-hits",
      kind: "codec",
      name: "Normalize raw CocoIndex hits",
    },
    {
      id: "decode-mcp-search-result",
      kind: "codec",
      name: "Decode CocoIndex MCP search result",
    },
    {
      id: "repository-session",
      kind: "command",
      name: "Repository intelligence session",
    },
    {
      id: "repository-intelligence-query",
      kind: "query",
      name: "Repository intelligence query",
    },
    {
      id: "repository-tool-status-view",
      kind: "query",
      name: "Repository tool status view",
    },
    {
      id: "command-lifecycle",
      kind: "command",
      name: "CocoIndex command lifecycle",
    },
    {
      id: "mcp-lifecycle",
      kind: "command",
      name: "CocoIndex MCP lifecycle",
    },
    {
      id: "emit-mcp-schema",
      kind: "generator",
      name: "Emit CocoIndex MCP schema",
    },
    {
      id: "sync-mcp-tool-registry",
      kind: "generator",
      name: "Sync CocoIndex MCP tool registry",
    },
  ],
  edges: [
    ...ProjectRuntimeRoots.reactivityKeys.map((id) => ({
      id,
      kind: "reactivity-key" as const,
    })),
    ...ProjectRuntimeRoots.atoms.map((id) => ({
      id,
      kind: "atom" as const,
    })),
  ],
} as const)
