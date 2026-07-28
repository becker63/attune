import { createHash } from "node:crypto";

import type { ApiManifest } from "./model.ts";

export const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
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

export const apiManifestDigest = (manifest: ApiManifest): string =>
  digestValue(manifest);

export const prettyJson = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`;
