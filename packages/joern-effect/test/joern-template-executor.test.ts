import { describe, expect, it } from "vitest"
import { Effect, Exit } from "effect"

import {
  JoernTemplateBindingError,
  JoernTemplateExecutor,
  JoernTemplateExecutorLive,
  JoernTemplateNotFoundError,
} from "../src/joern/joern-template-executor.js"
import { dangerousCallTemplate, joernTemplates } from "../src/joern/templates/index.js"

describe("JoernTemplateExecutor", () => {
  it("renders a known template through the service boundary", async () => {
    const result = await Effect.runPromise(
      JoernTemplateExecutor.execute({
        templateId: "dangerous-call",
        bindings: {},
      }).pipe(Effect.provide(JoernTemplateExecutorLive)),
    )

    expect(joernTemplates.map((template) => template.id)).toContain("dangerous-call")
    expect(result).toMatchObject({
      templateId: dangerousCallTemplate.id,
      rendered: true,
      cpgql: dangerousCallTemplate.render({}),
    })
    expect(result.evidenceKind).toBe("finding")
  })

  it("fails with a typed error when templateId is unknown", async () => {
    const result = Effect.runPromiseExit(
      JoernTemplateExecutor.execute({ templateId: "missing-template", bindings: {} }).pipe(
        Effect.provide(JoernTemplateExecutorLive),
      ),
    )

    const exit = await result
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(exit.cause._tag).toBe("Fail")
      if (exit.cause._tag === "Fail") {
        expect(exit.cause.error).toBeInstanceOf(JoernTemplateNotFoundError)
        expect(exit.cause.error).toMatchObject({
          _tag: "JoernTemplateNotFoundError",
          templateId: "missing-template",
        })
      } else {
        throw new Error("Expected a typed fail for unknown template")
      }
    }
  })

  it("returns a binding error when bindings do not match template schema", async () => {
    const result = Effect.runPromiseExit(
      JoernTemplateExecutor.execute({
        templateId: "dangerous-call",
        bindings: "not-an-object",
      }).pipe(Effect.provide(JoernTemplateExecutorLive)),
    )

    const exit = await result
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(exit.cause._tag).toBe("Fail")
      if (exit.cause._tag === "Fail") {
        expect(exit.cause.error).toBeInstanceOf(JoernTemplateBindingError)
        expect(exit.cause.error).toMatchObject({
          _tag: "JoernTemplateBindingError",
          templateId: "dangerous-call",
        })
      } else {
        throw new Error("Expected a typed fail for binding schema mismatch")
      }
    }
  })

  it("is accessible from the generated layer-backed service API", async () => {
    const program = JoernTemplateExecutor.run({ templateId: "dangerous-call", bindings: {} })

    const result = await Effect.runPromise(program.pipe(Effect.provide(JoernTemplateExecutorLive)))

    expect(result.templateId).toBe("dangerous-call")
    expect(result.rendered).toBe(true)
  })
})
