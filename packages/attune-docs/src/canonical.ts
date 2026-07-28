import { createHash } from "node:crypto";

import type { ApiManifest, SourceLocation } from "./model.ts";

export const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
};

export const digest = (value: string | Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");

export const digestValue = (value: unknown): string =>
  digest(canonicalJson(value));

const ISO_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/u;

/** Strict RFC 3339 profile shared by approvals and public trace validation. */
export const isIsoTimestamp = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = ISO_TIMESTAMP.exec(value);
  if (match === null) return false;
  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] =
    match;
  if (
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    (offsetHour !== undefined && Number(offsetHour) > 23) ||
    (offsetMinute !== undefined && Number(offsetMinute) > 59)
  ) {
    return false;
  }
  const date = `${year}-${month}-${day}`;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(Date.parse(value)) &&
    !Number.isNaN(parsedDate.valueOf()) &&
    parsedDate.toISOString().slice(0, 10) === date
  );
};

const semanticSourceLocation = ({
  path,
  line,
  endLine,
}: SourceLocation): Omit<SourceLocation, "url"> => ({ path, line, endLine });

/**
 * Content digest for the mechanical API manifest.
 *
 * Git refs and source-link URLs are presentation coordinates, so they cannot
 * participate in review identity: the same checked source published from a
 * later commit would otherwise invalidate an approval. The source-byte digest,
 * declaration spans, compiler versions, symbols, facts, and diagnostics remain
 * part of this value.
 */
export const apiManifestDigest = (manifest: ApiManifest): string =>
  digestValue({
    schemaVersion: manifest.schemaVersion,
    package: manifest.package,
    source: { digest: manifest.source.digest },
    generator: manifest.generator,
    symbols: manifest.symbols.map((symbol) => ({
      ...symbol,
      source: semanticSourceLocation(symbol.source),
      members: symbol.members.map((member) => ({
        ...member,
        source: semanticSourceLocation(member.source),
      })),
    })),
    diagnostics: manifest.diagnostics,
  });

export const prettyJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;
