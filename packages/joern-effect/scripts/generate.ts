import { Effect } from "effect"
import { generate } from "../src/pure/codegen/generate.js"

Effect.runPromise(generate()).catch((error) => {
  console.error(error)
  process.exit(1)
})
