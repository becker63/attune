import { Schema } from "effect"

export const CocoIndexCodeMcpToolName = Schema.Literal("search")
export type CocoIndexCodeMcpToolName = typeof CocoIndexCodeMcpToolName.Type

export const CocoIndexMcpSearchInput = Schema.Struct({
  query: Schema.String,
  limit: Schema.optional(Schema.Number),
  offset: Schema.optional(Schema.Number),
  refresh_index: Schema.optional(Schema.Boolean),
  languages: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  paths: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
})
export type CocoIndexMcpSearchInput = typeof CocoIndexMcpSearchInput.Type

export const CocoIndexCodeChunkResult = Schema.Struct({
  file_path: Schema.String,
  language: Schema.String,
  content: Schema.String,
  start_line: Schema.Number,
  end_line: Schema.Number,
  score: Schema.Number,
})
export type CocoIndexCodeChunkResult = typeof CocoIndexCodeChunkResult.Type

export const CocoIndexMcpSearchResult = Schema.Struct({
  success: Schema.Boolean,
  results: Schema.Array(CocoIndexCodeChunkResult),
  total_returned: Schema.Number,
  offset: Schema.Number,
  message: Schema.optional(Schema.NullOr(Schema.String)),
})
export type CocoIndexMcpSearchResult = typeof CocoIndexMcpSearchResult.Type

export const CocoIndexCodeMcpGeneratedFrom = {
  repository: "https://github.com/cocoindex-io/cocoindex-code",
  command: "ccc mcp",
  tool: "search",
  inputSchema: {
  "type": "object",
  "properties": {
    "query": {
      "type": "string"
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 5
    },
    "offset": {
      "type": "integer",
      "minimum": 0,
      "default": 0
    },
    "refresh_index": {
      "type": "boolean",
      "default": true
    },
    "languages": {
      "anyOf": [
        {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        {
          "type": "null"
        }
      ],
      "default": null
    },
    "paths": {
      "anyOf": [
        {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        {
          "type": "null"
        }
      ],
      "default": null
    }
  },
  "required": [
    "query"
  ]
},
  sourceFiles: [
    "src/cocoindex_code/server.py",
    "src/cocoindex_code/protocol.py",
  ],
} as const
