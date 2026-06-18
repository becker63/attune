import { spawnSync } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import { Effect } from "effect"
import { findPhase, loadForkConfig } from "./config.js"
import type { ForkPhase } from "./config.js"
import {
  diagnosticEvent,
  parseOxlintDiagnostics,
  ruleEvaluatedEvent,
  withDiagnosticZone,
} from "./diagnostics.js"
import type { ForkDiagnosticType } from "./diagnostics.js"
import {
  makeEvent,
  makeJsonlEventSink,
  makeRunId,
  type AttuneEvent,
  type EventBase,
} from "./events.js"

export type ForkRunOptions = Readonly<{
  readonly cwd: string
  readonly configPath: string
  readonly phase: string
  readonly target?: string
  readonly invariant?: string
  readonly eventsPath?: string
  readonly runId?: string
}>

export type ForkRunResult = Readonly<{
  readonly runId: string
  readonly exitCode: number
  readonly diagnostics: readonly ForkDiagnosticType[]
  readonly events: readonly AttuneEvent[]
  readonly eventsPath?: string
}>

const commandForPhase = (phase: ForkPhase): readonly string[] => [
  "pnpm",
  "exec",
  "oxlint",
  "--type-aware",
  "--type-check",
  ...(phase.oxlintArgs ?? []),
  ...phase.targets,
]

const runCommand = (
  cwd: string,
  command: readonly string[],
): Readonly<{ readonly stdout: string; readonly stderr: string; readonly exitCode: number }> => {
  const [executable, ...args] = command
  const child = spawnSync(executable ?? "", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  return {
    exitCode: child.status ?? 1,
    stderr: child.stderr,
    stdout: child.stdout,
  }
}

const countBy = (values: readonly string[]): Readonly<Record<string, number>> =>
  values.reduce<Readonly<Record<string, number>>>(
    (accumulator, value) => ({
      ...accumulator,
      [value]: (accumulator[value] ?? 0) + 1,
    }),
    {},
  )

const allowedByPhase = (
  phase: ForkPhase,
  diagnostic: ForkDiagnosticType,
): boolean =>
  (phase.minimumSeverity === "error" && diagnostic.severity !== "error") ||
  (phase.allowedRules ?? []).includes(diagnostic.ruleId)

const normalizePath = (path: string): string => path.replaceAll("\\", "/")

const patternMatches = (pattern: string, file: string): boolean => {
  const normalizedPattern = normalizePath(pattern)
  const normalizedFile = normalizePath(file)
  if (normalizedPattern.endsWith("/**")) {
    return normalizedFile.startsWith(normalizedPattern.slice(0, -3))
  }
  if (normalizedPattern.endsWith("/*")) {
    const prefix = normalizedPattern.slice(0, -1)
    const rest = normalizedFile.slice(prefix.length)
    return normalizedFile.startsWith(prefix) && !rest.includes("/")
  }
  return normalizedFile === normalizedPattern || normalizedFile.startsWith(`${normalizedPattern}/`)
}

const zoneForFile = (phase: ForkPhase, file: string): string =>
  phase.zones?.find((zone) =>
    zone.paths.some((pattern) => patternMatches(pattern, file)),
  )?.name ?? phase.zone

const listTargetFiles = (cwd: string, target: string): readonly string[] => {
  if (!existsSync(`${cwd}/${target}`)) {
    return []
  }
  const stat = statSync(`${cwd}/${target}`)
  if (stat.isFile()) {
    return [normalizePath(target)]
  }
  const rg = spawnSync("rg", ["--files", target], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  if (rg.status !== 0) {
    return []
  }
  return rg.stdout
    .split("\n")
    .map((file) => normalizePath(file.trim()))
    .filter((file) => file.length > 0)
}

const phaseFiles = (cwd: string, phase: ForkPhase): readonly string[] =>
  [...new Set(phase.targets.flatMap((target) => listTargetFiles(cwd, target)))]
    .toSorted()

const phaseStarted = (base: EventBase, phase: ForkPhase): AttuneEvent =>
  makeEvent(base, {
    eventType: "fork.phase_started",
    payload: {
      description: phase.description,
      phase: phase.name,
      targets: phase.targets,
      zone: phase.zone,
    },
    source: "fork",
  })

const fileClassifiedEvents = (
  base: EventBase,
  phase: ForkPhase,
  files: readonly string[],
): readonly AttuneEvent[] =>
  files.map((file) =>
    makeEvent(base, {
      eventType: "fork.file_classified",
      payload: {
        file,
        phase: phase.name,
        zone: zoneForFile(phase, file),
      },
      source: "fork",
    }),
  )

const phaseSummaryEvent = (
  base: EventBase,
  input: Readonly<{
    readonly diagnostics: readonly ForkDiagnosticType[]
    readonly suppressed: readonly ForkDiagnosticType[]
    readonly command: readonly string[]
    readonly exitCode: number
  }>,
): AttuneEvent =>
  makeEvent(base, {
    eventType: "fork.phase_summary",
    payload: {
      byRule: countBy(input.diagnostics.map((diagnostic) => diagnostic.ruleId)),
      bySeverity: countBy(input.diagnostics.map((diagnostic) => diagnostic.severity)),
      byZone: countBy(input.diagnostics.map((diagnostic) => diagnostic.zone)),
      command: input.command,
      diagnostics: input.diagnostics.length,
      exitCode: input.exitCode,
      suppressed: input.suppressed.length,
    },
    source: "fork",
  })

const phaseCompleted = (
  base: EventBase,
  input: Readonly<{ readonly diagnostics: readonly ForkDiagnosticType[]; readonly exitCode: number }>,
): AttuneEvent =>
  makeEvent(base, {
    eventType: "fork.phase_completed",
    payload: {
      diagnostics: input.diagnostics.length,
      exitCode: input.exitCode,
      ok: input.exitCode === 0 && input.diagnostics.length === 0,
    },
    source: "fork",
  })

const emitEvents = (
  eventsPath: string | undefined,
  events: readonly AttuneEvent[],
): Effect.Effect<void, Error> =>
  eventsPath === undefined || eventsPath.trim() === ""
    ? Effect.void
    : makeJsonlEventSink(eventsPath)
      .emitMany(events)
      .pipe(Effect.mapError((error) => new Error(String(error))))

export const runForkPhase = (
  options: ForkRunOptions,
): Effect.Effect<ForkRunResult, Error> =>
  Effect.gen(function* runForkPhase() {
    const config = yield* loadForkConfig(options.configPath)
    const phase = findPhase(config, options.phase)
    if (phase === undefined) {
      return yield* Effect.fail(new Error(`Unknown Fork phase: ${options.phase}`))
    }
    const invariant = options.invariant ?? phase.invariants[0]
    const runId = options.runId ?? makeRunId(config.project, phase.name)
    const target = options.target ?? `${config.project}:fork:${phase.name}`
    const base: EventBase = {
      pack: config.pack,
      phase: phase.name,
      project: config.project,
      runId,
      target,
      zone: phase.zone,
      ...(invariant === undefined ? {} : { invariant }),
    }
    const command = commandForPhase(phase)
    const classifiedFiles = phaseFiles(options.cwd, phase)
    const raw = runCommand(options.cwd, command)
    const parsed = parseOxlintDiagnostics(`${raw.stdout}\n${raw.stderr}`, {
      phase: phase.name,
      zone: phase.zone,
      ...(invariant === undefined ? {} : { invariant }),
    }).map((diagnostic) =>
      withDiagnosticZone(diagnostic, {
        phase: phase.name,
        zone: zoneForFile(phase, diagnostic.file),
      }),
    )
    const diagnostics = parsed.filter((diagnostic) => !allowedByPhase(phase, diagnostic))
    const suppressed = parsed.filter((diagnostic) => allowedByPhase(phase, diagnostic))
    const finalExitCode = diagnostics.length === 0 ? 0 : 1
    const events = [
      phaseStarted(base, phase),
      ...fileClassifiedEvents(base, phase, classifiedFiles),
      ...parsed.map((diagnostic) =>
        ruleEvaluatedEvent(base, {
          file: diagnostic.file,
          matched: true,
          ruleId: diagnostic.ruleId,
        }),
      ),
      ...diagnostics.map((diagnostic) => diagnosticEvent(base, diagnostic)),
      phaseSummaryEvent(base, { command, diagnostics, exitCode: raw.exitCode, suppressed }),
      phaseCompleted(base, { diagnostics, exitCode: finalExitCode }),
    ]
    yield* emitEvents(options.eventsPath, events)
    return {
      diagnostics,
      events,
      ...(options.eventsPath === undefined ? {} : { eventsPath: options.eventsPath }),
      exitCode: finalExitCode,
      runId,
    }
  })
