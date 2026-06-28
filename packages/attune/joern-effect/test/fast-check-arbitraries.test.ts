import { Schema } from "effect"
import fc from "fast-check"

import * as publicApi from "joern-effect"
import { prop } from "joern-effect"
import {
  generatedPropertyArbitraries,
  generatedPropertyArbitraryFor,
  generatedPropertyArbitraryMetadata,
} from "../src/internal/generated/fast-check-arbitraries.js"

describe("generated FastCheck arbitrary helpers", () => {
  it("are generated from Joern property metadata without becoming public SDK", () => {
    const metadataNames = Object.keys(generatedPropertyArbitraryMetadata)
    expect(metadataNames).toEqual(Object.keys(prop))
    expect("generatedPropertyArbitraries" in publicApi).toBe(false)
    expect("generatedPropertyArbitraryFor" in publicApi).toBe(false)
  })

  it("sample values conform to the matching generated Effect Schema", () => {
    const names = ["code", "lineNumber", "filename"] as const

    for (const name of names) {
      const arbitrary = generatedPropertyArbitraryFor(name)
      const samples = fc.sample(arbitrary, 5)

      expect(generatedPropertyArbitraries[name]).toBe(arbitrary)
      const decode = Schema.decodeUnknownSync(prop[name].schema as Schema.Schema<unknown>)
      for (const sample of samples) {
        expect(() => decode(sample)).not.toThrow()
      }
    }
  })
})
