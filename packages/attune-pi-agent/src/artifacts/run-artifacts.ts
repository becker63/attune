import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

export interface RunArtifactSet {
  readonly specJson?: string
  readonly planMarkdown?: string
  readonly statusMarkdown?: string
  readonly eventsJsonl?: string
  readonly evidenceMatrixMarkdown?: string
  readonly validationMarkdown?: string
  readonly mutationReportMarkdown?: string
  readonly propertyReportMarkdown?: string
  readonly snapshotReportMarkdown?: string
  readonly finalReviewMarkdown?: string
  readonly summaryMarkdown?: string
}

export const runArtifactFileNames = {
  specJson: "spec.json",
  planMarkdown: "plan.md",
  statusMarkdown: "status.md",
  eventsJsonl: "events.jsonl",
  evidenceMatrixMarkdown: "evidence-matrix.md",
  validationMarkdown: "validation.md",
  mutationReportMarkdown: "mutation-report.md",
  propertyReportMarkdown: "property-report.md",
  snapshotReportMarkdown: "snapshot-report.md",
  finalReviewMarkdown: "final-review.md",
  summaryMarkdown: "summary.md",
} as const satisfies Record<keyof RunArtifactSet, string>

export const runArtifactDirectory = (
  runId: string,
  root = ".attune-runs",
): string => {
  assertSafeRunId(runId)
  return path.join(root, runId)
}

export const writeRunArtifacts = async (
  runId: string,
  artifacts: RunArtifactSet,
  root = ".attune-runs",
): Promise<string> => {
  const directory = runArtifactDirectory(runId, root)
  await mkdir(directory, { recursive: true })

  for (const [key, fileName] of Object.entries(runArtifactFileNames) as ReadonlyArray<
    [keyof RunArtifactSet, string]
  >) {
    const content = artifacts[key]
    if (content !== undefined) {
      await writeFile(path.join(directory, fileName), ensureTrailingNewline(content), "utf8")
    }
  }

  return directory
}

export const readRunArtifact = async (
  runId: string,
  key: keyof RunArtifactSet,
  root = ".attune-runs",
): Promise<string> =>
  readFile(path.join(runArtifactDirectory(runId, root), runArtifactFileNames[key]), "utf8")

const assertSafeRunId = (runId: string): void => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(runId)) {
    throw new Error(`Unsafe run id: ${runId}`)
  }
}

const ensureTrailingNewline = (value: string): string =>
  value.endsWith("\n") ? value : `${value}\n`
