import { Schema } from "effect"

import {
  DangerousCallEvidence,
  dangerousCallTemplate,
  joernTemplates,
} from "joern-effect"

describe("generated Joern templates", () => {
  it("participate in the generated template registry", () => {
    expect(joernTemplates.map((template) => template.id)).toEqual([
      "dangerous-call",
    ])
    expect(joernTemplates[0]).toBe(dangerousCallTemplate)
  })

  it("decode generated evidence and render a deterministic shell", () => {
    const decodeEvidence = Schema.decodeUnknownSync(DangerousCallEvidence)

    expect(decodeEvidence({
      rows: [{ key: "callee", value: "child_process.exec" }],
      templateId: "dangerous-call",
    })).toStrictEqual({
      rows: [{ key: "callee", value: "child_process.exec" }],
      templateId: "dangerous-call",
    })

    expect(dangerousCallTemplate.render({})).toBe([
      "// TODO: render known Joern CPGQL for dangerous-call",
      "cpg",
    ].join("\n"))
  })
})
