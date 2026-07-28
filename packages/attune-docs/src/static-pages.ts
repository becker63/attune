import { readdir, readFile, stat } from "node:fs/promises";
import * as Path from "node:path";

import { canonicalJson, digest } from "./canonical.ts";

export interface StaticPage {
  readonly slug: string;
  readonly title: string;
  readonly markdown: string;
}

type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | { readonly [key: string]: Json };

const record = (value: Json): Readonly<Record<string, Json>> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Static publication JSON must be an object.");
  }
  return value as Readonly<Record<string, Json>>;
};

const stringField = (value: Json | undefined, name: string): string => {
  if (typeof value !== "string")
    throw new Error(`Static publication field ${name} must be a string.`);
  return value;
};

const publicDigest = (
  value: Readonly<Record<string, Json>>,
  field: string,
): string => {
  const copy = { ...value };
  delete copy[field];
  return `sha256:${digest(canonicalJson(copy))}`;
};

const closedPublication = (
  publication: Readonly<Record<string, Json>>,
): void => {
  const expected = new Set([
    "schema_version",
    "experiment_id",
    "manifest_digest",
    "report_digest",
    "evidence_digest",
    "approval_digest",
    "activegraph_publication_address",
    "exporter_version",
    "prior_revision",
    "publication_digest",
  ]);
  const unknown = Object.keys(publication).filter((key) => !expected.has(key));
  if (unknown.length > 0)
    throw new Error(
      `Static publication has unknown fields: ${unknown.join(", ")}`,
    );
};

/** Verify a closed Python bundle without interpreting research semantics. */
export const discoverStaticPages = async (
  root: string,
): Promise<readonly StaticPage[]> => {
  try {
    await stat(root);
  } catch (cause) {
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "ENOENT"
    )
      return [];
    throw cause;
  }
  const pages: StaticPage[] = [];
  for (const entry of await readdir(root)) {
    const directory = Path.join(root, entry);
    if (!(await stat(directory)).isDirectory()) continue;
    const publicationText = await readFile(
      Path.join(directory, "publication.json"),
      "utf8",
    );
    const manifestText = await readFile(
      Path.join(directory, "manifest.json"),
      "utf8",
    );
    const reportText = await readFile(
      Path.join(directory, "report.json"),
      "utf8",
    );
    const approvalText = await readFile(
      Path.join(directory, "approval.json"),
      "utf8",
    );
    const markdown = await readFile(Path.join(directory, "index.md"), "utf8");
    const publication = record(JSON.parse(publicationText) as Json);
    const manifest = record(JSON.parse(manifestText) as Json);
    const report = record(JSON.parse(reportText) as Json);
    const approval = record(JSON.parse(approvalText) as Json);
    closedPublication(publication);
    const manifestDigest = stringField(
      publication.manifest_digest,
      "manifest_digest",
    );
    const reportDigest = stringField(
      publication.report_digest,
      "report_digest",
    );
    const approvalDigest = stringField(
      publication.approval_digest,
      "approval_digest",
    );
    if (publicDigest(manifest, "manifest_digest") !== manifestDigest)
      throw new Error(`${entry}: manifest digest mismatch`);
    if (publicDigest(report, "report_digest") !== reportDigest)
      throw new Error(`${entry}: report digest mismatch`);
    if (publicDigest(approval, "approval_digest") !== approvalDigest)
      throw new Error(`${entry}: approval digest mismatch`);
    if (
      approval.manifest_digest !== manifestDigest ||
      approval.report_digest !== reportDigest
    ) {
      throw new Error(`${entry}: approval does not bind publication inputs`);
    }
    pages.push({
      slug: entry,
      title: stringField(report.title, "report.title"),
      markdown,
    });
  }
  return pages.sort((left, right) => left.slug.localeCompare(right.slug));
};
