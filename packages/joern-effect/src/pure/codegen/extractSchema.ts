import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { promisify } from "node:util"
import { Effect } from "effect"
import { EnvVars, readEnv } from "../../edge/runtime/env.js"
import { JoernSchemaExtractionError } from "../../edge/runtime/errors.js"
import type { RawSchema } from "./types.js"

const execFileAsync = promisify(execFile)

const parseRawSchema = (text: string): RawSchema => JSON.parse(text)

const readSchemaFile = (
  schemaPath: string,
): Effect.Effect<RawSchema, JoernSchemaExtractionError> =>
  Effect.tryPromise({
    catch: (cause) =>
      new JoernSchemaExtractionError({
        cause,
        inputMode: "JOERN_CPG_SCHEMA_JSON",
        message: "Failed to read JOERN_CPG_SCHEMA_JSON",
        schemaPath,
      }),
    try: () => readFile(schemaPath, "utf8").then(parseRawSchema),
  })

const readCodePropertyGraphSchema = (
  cpgDir: string,
): Effect.Effect<RawSchema, JoernSchemaExtractionError> =>
  Effect.tryPromise({
    catch: (cause) =>
      new JoernSchemaExtractionError({
        cause,
        inputMode: "CODEPROPERTYGRAPH_DIR",
        message: "Failed to run CODEPROPERTYGRAPH_DIR/schema2json.sh",
        schemaPath: cpgDir,
      }),
    try: () =>
      execFileAsync(join(cpgDir, "schema2json.sh"), { cwd: cpgDir }).then(
        ({ stdout }) => parseRawSchema(stdout),
      ),
  })

export const extractSchema = (
  defaultSchemaPath?: string,
): Effect.Effect<RawSchema, JoernSchemaExtractionError> => {
  const schemaPath = readEnv(EnvVars.JoernCpgSchemaJson)
  if (schemaPath) {
    return readSchemaFile(schemaPath)
  }

  const cpgDir = readEnv(EnvVars.CodePropertyGraphDir)
  if (cpgDir) {
    return readCodePropertyGraphSchema(cpgDir)
  }

  if (defaultSchemaPath) {
    return readSchemaFile(defaultSchemaPath)
  }

  return Effect.fail(
    new JoernSchemaExtractionError({
      message:
        "No Joern CPG schema input provided. Set JOERN_CPG_SCHEMA_JSON=/path/to/schema.json or CODEPROPERTYGRAPH_DIR=/path/to/codepropertygraph.",
    }),
  )
}
