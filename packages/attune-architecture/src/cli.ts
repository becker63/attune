#!/usr/bin/env node
import { formatDiagnostics, scanWorkspace } from "./index.js"

const workspaceRoot = process.argv[2] ?? process.cwd()
const result = scanWorkspace({ workspaceRoot })
if (result.diagnostics.length > 0) console.log(formatDiagnostics(result.diagnostics))
process.exitCode = result.exitCode
