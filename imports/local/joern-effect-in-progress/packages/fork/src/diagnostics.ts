import { createHash } from "node:crypto"
import { Schema } from "effect"
import type { AttuneEvent, EventBase } from "./events.js"
import { makeEvent } from "./events.js"

export class ForkDiagnostic extends Schema.Class<ForkDiagnostic>("ForkDiagnostic")({
  column: Schema.NullOr(Schema.Number),
  file: Schema.String,
  fingerprint: Schema.String,
  invariant: Schema.optional(Schema.String),
  line: Schema.NullOr(Schema.Number),
  message: Schema.String,
  phase: Schema.String,
  raw: Schema.String,
  ruleId: Schema.String,
  severity: Schema.Union([
    Schema.Literal("error"),
    Schema.Literal("warning"),
    Schema.Literal("info"),
  ]),
  zone: Schema.String,
}) {}

export type ForkDiagnosticType = Schema.Schema.Type<typeof ForkDiagnostic>

const diagnosticLine = /^(?<file>[^:\n]+):(?:(?<line>\d+):(?<column>\d+):)? (?<severity>error|warning)(?: (?<rule>[^:]+))?: (?<message>.*)$/u

export const diagnosticFingerprint = (
  input: Pick<ForkDiagnosticType, "file" | "line" | "column" | "ruleId" | "message">,
): string =>
  createHash("sha256")
    .update(
      [
        input.file,
        input.line ?? "",
        input.column ?? "",
        input.ruleId,
        input.message,
      ].join("|"),
    )
    .digest("hex")
    .slice(0, 16)

export const parseOxlintDiagnostics = (
  text: string,
  input: Readonly<{
    readonly phase: string
    readonly zone: string
    readonly invariant?: string
  }>,
): readonly ForkDiagnosticType[] =>
  text
    .split("\n")
    .flatMap((line) => {
      const match = diagnosticLine.exec(line)
      if (match?.groups === undefined) {return []}
      const groups = match.groups
      const severity: "error" | "warning" =
        groups["severity"] === "warning" ? "warning" : "error"
      const diagnostic = {
        column: groups["column"] === undefined ? null : Number(groups["column"]),
        file: groups["file"] ?? "",
        line: groups["line"] === undefined ? null : Number(groups["line"]),
        message: groups["message"] ?? line,
        phase: input.phase,
        raw: line,
        ruleId: groups["rule"] ?? "unknown",
        severity,
        zone: input.zone,
        ...(input.invariant === undefined ? {} : { invariant: input.invariant }),
      }
      return [
        new ForkDiagnostic({
          ...diagnostic,
          fingerprint: diagnosticFingerprint(diagnostic),
        }),
      ]
    })

export const diagnosticEvent = (
  base: EventBase,
  diagnostic: ForkDiagnosticType,
): AttuneEvent =>
  makeEvent(base, {
    eventType: "fork.diagnostic",
    payload: {
      column: diagnostic.column,
      file: diagnostic.file,
      fingerprint: diagnostic.fingerprint,
      ...(diagnostic.invariant === undefined ? {} : { invariant: diagnostic.invariant }),
      line: diagnostic.line,
      message: diagnostic.message,
      phase: diagnostic.phase,
      raw: diagnostic.raw,
      ruleId: diagnostic.ruleId,
      severity: diagnostic.severity,
      zone: diagnostic.zone,
    },
    source: "fork",
  })

export const withDiagnosticZone = (
  diagnostic: ForkDiagnosticType,
  input: Readonly<{ readonly phase: string; readonly zone: string }>,
): ForkDiagnosticType =>
  new ForkDiagnostic({
    ...diagnostic,
    fingerprint: diagnosticFingerprint(diagnostic),
    phase: input.phase,
    zone: input.zone,
  })

export const ruleEvaluatedEvent = (
  base: EventBase,
  input: Readonly<{
    readonly ruleId: string
    readonly matched: boolean
    readonly file?: string
  }>,
): AttuneEvent =>
  makeEvent(base, {
    eventType: input.matched ? "fork.rule_match" : "fork.rule_evaluated",
    payload: input,
    source: "fork",
  })
