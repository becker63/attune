import { Schema } from "effect"

export type JsonPrimitive = string | number | boolean | null

export type JsonObject = {
  readonly [key: string]: JsonValue
}

export type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject

export const JsonValue: Schema.Schema<JsonValue> = Schema.suspend(() =>
  Schema.Union(
    Schema.String,
    Schema.Number,
    Schema.Boolean,
    Schema.Null,
    Schema.Array(JsonValue),
    Schema.Record({ key: Schema.String, value: JsonValue }),
  ),
)

export const JsonObject: Schema.Schema<JsonObject> = Schema.Record({
  key: Schema.String,
  value: JsonValue,
})
