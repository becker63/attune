import { Context, Effect, Layer } from "effect"
import { parseSync } from "oxc-parser"
import type { FuzzCase } from "../domain/model.js"
import type {
  SemanticAdmissionResult,
  SemanticCase,
  SemanticFile,
  SemanticFileAdmissionResult,
} from "../domain/model.js"
import { deriveExpectationsForFile } from "./expectations.js"

export const admitSemanticFile = (file: SemanticFile): SemanticFileAdmissionResult => {
  const parsed = parseSync(file.path, file.source, { sourceType: "module" })
  const diagnostics = parsed.errors.map((error) => String(error.message ?? error))
  return {
    accepted: diagnostics.length === 0,
    diagnostics,
    path: file.path,
    sourceBytes: Buffer.byteLength(file.source),
    syntaxFlavor: file.syntaxFlavor,
  }
}

export const semanticCaseToFuzzCases = (semanticCase: SemanticCase): readonly FuzzCase[] =>
  semanticCase.project.files.map((file, fileIndex) => ({
    caseId: `${semanticCase.caseId}-${fileIndex}-${file.path.replace(/[^A-Za-z0-9_-]+/gu, "_")}`,
    expectations: deriveExpectationsForFile(file),
    mutators: semanticCase.mutations.map((step) => ({
      kind: "source-sink-injection",
      value: `${step.kind}:${step.targetFile}`,
    })),
    ...(semanticCase.replay === undefined ? {} : { replay: semanticCase.replay }),
    seed: {
      id: semanticCase.project.id,
      origin: semanticCase.project.origin === "promoted-counterexample" ? "promoted-counterexample" : "curated",
      source: file.source,
      syntaxFlavor: file.syntaxFlavor,
      title: semanticCase.project.title,
    },
    source: file.source,
    sourcePath: file.path,
    syntaxFlavor: file.syntaxFlavor,
  }))

export interface SemanticAdmitterService {
  readonly admit: (semanticCase: SemanticCase) => Effect.Effect<SemanticAdmissionResult>
  readonly toFuzzCases: (semanticCase: SemanticCase) => Effect.Effect<readonly FuzzCase[]>
}

export class SemanticAdmitter extends Context.Tag(
  "attune/joern-effect-properties/fuzz/SemanticAdmitter",
)<SemanticAdmitter, SemanticAdmitterService>() {}

export const makeSemanticAdmitter = (): SemanticAdmitterService => ({
  admit: (semanticCase) => Effect.sync(() => {
    const files = semanticCase.project.files.map(admitSemanticFile)
    const diagnostics = files.flatMap((file) =>
      file.diagnostics.map((diagnostic) => `${file.path}: ${diagnostic}`)
    )
    return {
      accepted: files.every((file) => file.accepted),
      caseId: semanticCase.caseId,
      diagnostics,
      files,
      projectId: semanticCase.project.id,
    }
  }),
  toFuzzCases: (semanticCase) => Effect.sync(() => semanticCaseToFuzzCases(semanticCase)),
})

export const SemanticAdmitterLive: Layer.Layer<SemanticAdmitter> = Layer.succeed(
  SemanticAdmitter,
  makeSemanticAdmitter(),
)

export const admitProjectFile = admitSemanticFile
export const projectCaseToFileCases = semanticCaseToFuzzCases
export type ProjectAdmitterService = SemanticAdmitterService
export const ProjectAdmitter = SemanticAdmitter
export const makeProjectAdmitter = makeSemanticAdmitter
export const ProjectAdmitterLive = SemanticAdmitterLive
