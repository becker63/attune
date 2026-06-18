import { Schema } from "effect"
import { vi } from "vitest"

import { cpg, prop, raw } from "joern-effect"

vi.setConfig({ testTimeout: 30_000 })

describe("query builder", () => {
  it("emits readable CPGQL for selected properties", () => {
    const query = cpg.method
      .name("handleRequest")
      .call.name(/exec|spawn|eval/u)
      .select({
        code: prop.code,
        file: prop.filename,
        line: prop.lineNumber,
        method: prop.methodFullName,
      })

    expect(query.cpgql).toMatchInlineSnapshot(`
      "cpg.method.name("handleRequest").call.name("exec|spawn|eval")
        .map(n => Map(
          "code" -> n.code,
          "file" -> n.filename,
          "line" -> n.lineNumber,
          "method" -> n.methodFullName
        ))
        .toJson"
    `)
    expect(query.debug).toBeDefined()
  })

  it("escapes Scala strings", () => {
    const query = cpg.call.name('a "quoted" \\ name').select({ code: prop.code })
    expect(query.cpgql).toContain('.name("a \\"quoted\\" \\\\ name")')
  })

  it("keeps raw CPGQL as an escape hatch", () => {
    const query = raw("cpg.method.toJson", Schema.Array(Schema.Unknown))
    expect(query.cpgql).toBe("cpg.method.toJson")
  })

  it("emits generated schema traversal and property filter sugar", () => {
    const query = cpg.typeDecl
      .fullName(/com\.example\..*/u)
      .member.name("password")
      .lineNumber(42)
      .dedup.take(10)
      .select({ code: prop.code })

    expect(query.cpgql).toContain("cpg.typeDecl")
    expect(query.cpgql).toContain('.fullName("com\\\\.example\\\\..*")')
    expect(query.cpgql).toContain(".member")
    expect(query.cpgql).toContain('.name("password")')
    expect(query.cpgql).toContain(".lineNumber(42)")
    expect(query.cpgql).toContain(".dedup.take(10)")
  })
})
