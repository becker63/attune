import { Schema } from "effect";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = Schema.Json;

export type JsonObject = Schema.JsonObject;

export const JsonValue: Schema.Codec<JsonValue> = Schema.Json;

export const JsonObject: Schema.Codec<JsonObject> = Schema.Record(
  Schema.String,
  JsonValue,
);
