#!/usr/bin/env node
import { Effect } from "effect"
import { runForkPhase } from "./run.js"

const args = process.argv.slice(2)

const readOption = (name: string): string | undefined => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const command = args[0] === "fork" ? "fork" : "fork"
const phase = readOption("--phase") ?? "all"
const cwd = readOption("--cwd") ?? process.cwd()
const configPath = readOption("--config") ?? "fork.config.ts"
const target = readOption("--target")
const invariant = readOption("--invariant")
const eventsPath = readOption("--events-path")
const runId = readOption("--run-id")
const json = args.includes("--json")

if (command !== "fork") {
  console.error("Usage: attune fork --phase <phase>")
  process.exit(2)
}

Effect.runPromiseExit(
  runForkPhase({
    configPath,
    cwd,
    ...(eventsPath === undefined ? {} : { eventsPath }),
    phase,
    ...(runId === undefined ? {} : { runId }),
    ...(invariant === undefined ? {} : { invariant }),
    ...(target === undefined ? {} : { target }),
  }),
).then((exit) => {
  if (exit._tag === "Failure") {
    console.error(String(exit.cause))
    process.exit(2)
  }
  const summary = {
    diagnostics: exit.value.diagnostics.length,
    eventCount: exit.value.events.length,
    eventsPath: exit.value.eventsPath,
    exitCode: exit.value.exitCode,
    runId: exit.value.runId,
  }
  console.log(json ? JSON.stringify(summary) : JSON.stringify(summary, null, 2))
  process.exit(exit.value.exitCode)
})
