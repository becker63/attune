import { Effect, Schema } from "effect"
import { vi } from "vitest"

import { JoernDecodeError, makeJoernClient, raw } from "joern-effect"
import type { JoernTransport } from "joern-effect"

vi.setConfig({ testTimeout: 30_000 })

const transport = (body: string): JoernTransport => ({
  execute: () => Effect.succeed(body),
  importCode: () => Effect.void,
  ready: () => Effect.succeed(true),
})

describe("runtime decode", () => {
  it("decodes query JSON with the query schema", () => {
    const joern = makeJoernClient("http://127.0.0.1:1", transport(`[{"x":1}]`))
    return Effect.runPromise(
      joern
        .query(raw("cpg.x.toJson", Schema.Array(Schema.Struct({ x: Schema.Number }))))
        .pipe(Effect.tap((result) => Effect.sync(() => expect(result).toStrictEqual([{ x: 1 }])))),
    )
  })

  it("fails invalid JSON as JoernDecodeError", () => {
    const joern = makeJoernClient("http://127.0.0.1:1", transport(`not-json`))
    return Effect.runPromise(
      Effect
        .exit(joern.query(raw("cpg.x.toJson", Schema.Array(Schema.Unknown))))
        .pipe(Effect.tap((result) => Effect.sync(() => expect(String(result)).toContain(JoernDecodeError.name)))),
    )
  })
})
