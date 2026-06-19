import { queryRecentPropertyEvents } from "../src/events.js"

const limit = Number.parseInt(process.argv[2] ?? "20", 10)
console.log(JSON.stringify(await queryRecentPropertyEvents(limit), null, 2))
