import { Schema } from "effect";

/**
 * Scalar values admitted by the JSON boundary.
 *
 * @remarks
 *   Containers are represented by `JsonValue` and `JsonObject`; this alias is
 *   useful when a boundary must explicitly reject arrays and objects.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Recursive JSON value decoded by Effect Schema.
 *
 * @remarks
 *   This is the common transport domain for untyped Joern response fields.
 */
export type JsonValue = Schema.Json;

/**
 * String-keyed JSON object used for Joern records.
 *
 * @remarks
 *   Joern selection rows decode through this object boundary before a more
 *   specific query schema validates their fields.
 */
export type JsonObject = Schema.JsonObject;

export const JsonValue: Schema.Codec<JsonValue> = Schema.Json;

export const JsonObject: Schema.Codec<JsonObject> = Schema.Record(
  Schema.String,
  JsonValue,
);
