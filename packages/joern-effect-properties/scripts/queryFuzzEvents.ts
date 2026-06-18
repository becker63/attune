import { loadAxiomConfig, makeAxiomClient } from "../src/events.js"

const limit = Number.parseInt(process.argv[2] ?? "20", 10)
const eventName = process.argv[3] ?? "attune.fuzz."
const config = loadAxiomConfig()

if (config === undefined) {
  console.log(JSON.stringify({ _tag: "AxiomUnavailable" }, null, 2))
  process.exit(0)
}

const apl = `['${config.dataset}'] | where ['service.name'] == 'joern-effect-properties' | where ['attributes.event.name'] startswith '${eventName}' | sort by _time desc | limit ${limit}`
const result = await makeAxiomClient(config).query(apl, { format: "legacy" })
console.log(JSON.stringify(result.matches?.map((match) => match.data) ?? [], null, 2))
