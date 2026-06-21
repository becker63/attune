#!/usr/bin/env node
import { Effect } from "effect"

import {
  ArchitectureLintFileSystem,
  formatFindings,
  makeNodeFileSystem,
  scanArchitecture,
} from "./index.js"

const root = process.cwd()

const program = scanArchitecture({ root }).pipe(
  Effect.provideService(ArchitectureLintFileSystem, makeNodeFileSystem()),
)

const main = async (): Promise<void> => {
  const report = await Effect.runPromise(program)

  if (report.findings.length > 0) {
    console.error(formatFindings(report))
    process.exitCode = 1
    return
  }

  console.log("Attune architecture lint passed")
}

void main()
