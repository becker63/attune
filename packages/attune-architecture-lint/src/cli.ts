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
  const errorCount = report.findings.filter((finding) => finding.severity === "error").length

  if (report.findings.length > 0) {
    console.error(formatFindings(report))
  }

  if (errorCount > 0) {
    process.exitCode = 1
    return
  }

  console.log(report.findings.length === 0 ? "Attune architecture lint passed" : "Attune architecture lint passed with warnings")
}

void main()
