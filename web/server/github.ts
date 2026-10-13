import { cacheLife, cacheTag } from "next/cache";
import { createHash, randomUUID } from "node:crypto";
import type { Repository } from "../studio/types";
import {
  publicFile,
  LIMITS,
  excluded,
  repositoryName,
  boundedBytes,
} from "./source";

export type FileIdentity = { path: string; blob: string; bytes: number };
export type Inventory = Omit<Repository, "files"> & {
  files: FileIdentity[];
  observationId: string;
};
const sha = (value: string) => /^[a-f0-9]{40}$/.test(value);
async function api(name: string, suffix = "", limit = 1024 * 1024) {
  const bytes = await boundedBytes(
    `https://api.github.com/repos/${name}${suffix}`,
    limit,
  );
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
export async function repositoryHead(requested: string) {
  "use cache: remote";
  cacheLife({ stale: 60, revalidate: 300, expire: 600 });
  cacheTag("studio-github-head");
  const info = await api(requested);
  if (
    info.private ||
    repositoryName(`https://github.com/${info.full_name}`) !== info.full_name
  )
    throw new Error("Only public repositories are supported.");
  const commit = await api(
    info.full_name,
    `/commits/${encodeURIComponent(info.default_branch)}`,
  );
  if (!sha(commit.sha))
    throw new Error("GitHub did not return an immutable revision.");
  return { name: info.full_name as string, revision: commit.sha as string };
}
export async function inventory(
  name: string,
  revision: string,
): Promise<Inventory> {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 604800, expire: 2592000 });
  cacheTag("studio-github-inventory-v1");
  // Unauthenticated GitHub responses cannot grant access to private repositories.
  const commit = await api(name, `/commits/${revision}`);
  if (commit.sha !== revision || !sha(commit.commit?.tree?.sha))
    throw new Error("Invalid commit identity.");
  const tree = await api(
    name,
    `/git/trees/${commit.commit.tree.sha}?recursive=1`,
    LIMITS.treeBytes,
  );
  if (!Array.isArray(tree.tree)) throw new Error("Invalid GitHub tree.");
  const result: Inventory = {
    name,
    revision,
    origin: `https://github.com/${name}`,
    files: [],
    excluded: [],
    truncated: tree.truncated === true,
    treeCount: 0,
    observationId: randomUUID(),
  };
  const secondary = (path: string) =>
    /(^|\/)(__tests__|tests?|fixtures?|benchmarks?|examples?)(\/|$)|\.(test|spec)\./i.test(
      path,
    )
      ? 1
      : 0;
  let bytes = 0;
  for (const item of tree.tree.sort(
    (a: any, b: any) =>
      secondary(a.path) - secondary(b.path) ||
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  )) {
    if (item.type === "tree") continue;
    result.treeCount++;
    let reason = excluded(item.path, item.mode, item.size);
    if (!sha(item.sha)) reason = "invalid blob identity";
    if (
      !reason &&
      (result.files.length >= LIMITS.files ||
        bytes + item.size > LIMITS.sourceBytes)
    )
      reason = "repository source limit";
    if (reason) result.excluded.push({ path: item.path, reason });
    else {
      bytes += item.size;
      result.files.push({ path: item.path, blob: item.sha, bytes: item.size });
    }
  }
  if (Buffer.byteLength(JSON.stringify(result)) > 1024 * 1024)
    throw new Error("Source inventory exceeds the transport limit.");
  return result;
}
export async function sourceBlob(
  name: string,
  revision: string,
  file: FileIdentity,
) {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 604800, expire: 2592000 });
  cacheTag("studio-github-source-v1");
  const bytes = await boundedBytes(
    `https://raw.githubusercontent.com/${name}/${revision}/${file.path.split("/").map(encodeURIComponent).join("/")}`,
    Math.min(LIMITS.fileBytes, file.bytes + 1),
  );
  const blob = createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
  if (blob !== file.blob || bytes.length !== file.bytes)
    throw new Error("Git blob identity mismatch.");
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (source.includes("\0")) throw new Error("Binary source.");
  return {
    source,
    blob,
    digest: createHash("sha256").update(bytes).digest("hex"),
    observationId: randomUUID(),
  };
}
export async function verifiedSource(file: ReturnType<typeof publicFile>) {
  const tree = await inventory(file.repository, file.revision);
  const identity = tree.files.find((item) => item.path === file.path);
  if (!identity)
    throw new Error("File is outside the admitted public inventory.");
  return sourceBlob(file.repository, file.revision, identity);
}
