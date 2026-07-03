import {
  CocoIndexMcpSearchInput,
  CocoIndexMcpSearchResult,
} from "../../generated/cocoindex-code-mcp.js"

export const SearchInput = CocoIndexMcpSearchInput
export type SearchInput = typeof SearchInput.Type

export const SearchResult = CocoIndexMcpSearchResult
export type SearchResult = typeof SearchResult.Type

export const searchTool = {
  name: "search",
  input: SearchInput,
  result: SearchResult,
} as const
