#!/usr/bin/env node
import {
  checkGeneratorShapeConformance,
  formatGeneratorShapeConformanceResult,
} from "./generator-shape-conformance.js"

const workspaceRoot = process.argv[2] ?? process.cwd()
const result = checkGeneratorShapeConformance({ workspaceRoot })
console.log(formatGeneratorShapeConformanceResult(result))
process.exitCode = result.exitCode
