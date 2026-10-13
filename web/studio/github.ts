import { digest, key, read, write } from "./cache";
import type { FileProgress, Repository, Source } from "./types";
export const LIMITS = {
  files: 120,
  fileBytes: 128 * 1024,
  sourceBytes: 5 * 1024 * 1024,
  treeBytes: 8 * 1024 * 1024,
};
export function repositoryName(input: string) {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Use a public https://github.com/owner/repository URL.");
  const match = /^\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/.exec(
    url.pathname,
  );
  if (!match || match.slice(1).some((p) => p === "." || p === ".."))
    throw new Error("Use the repository URL, without a branch or file path.");
  return `${match[1]}/${match[2]}`;
}
export function excluded(
  path: string,
  mode: string,
  size: number,
): string | null {
  if (mode !== "100644" && mode !== "100755") return "symlink or submodule";
  if (
    path.length > 512 ||
    path.startsWith("/") ||
    path.split("/").some((p) => !p || p === "." || p === "..")
  )
    return "invalid path";
  if (
    /(^|\/)(node_modules|vendor|vendors|dist|build|coverage|\.git|\.next|third_party|third-party|generated)(\/|$)/i.test(
      path,
    )
  )
    return "dependency or generated directory";
  if (/\.(min|bundle)\.[cm]?js$|\.d\.[cm]?ts$/i.test(path))
    return "generated bundle or declaration";
  if (!/\.(?:[cm]?[jt]s|[jt]sx)$/i.test(path)) return "unsupported language";
  if (!Number.isSafeInteger(size) || size < 0 || size > LIMITS.fileBytes)
    return "file size limit";
  return null;
}
export async function boundedBytes(
  url: string,
  limit: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const response = await fetch(url, {
    signal: signal ?? AbortSignal.timeout(30000),
    credentials: "omit",
  });
  if (!response.ok)
    throw new Error(
      `GitHub returned ${response.status}${response.status === 403 || response.status === 429 ? " (rate limit or access restriction)" : ""}.`,
    );
  // Content-Length can describe compressed transport bytes (including gzip
  // overhead on tiny files). Bound the decoded stream we actually consume.
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body.");
  const chunks: Uint8Array[] = [];
  let count = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      count += value.length;
      if (count > limit) throw new Error("Download exceeds the byte limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(count);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function acquire(
  input: string,
  progress: (text: string, files?: FileProgress) => void,
): Promise<Repository> {
  const started = performance.now();
  const requested = repositoryName(input);
  let fetchedBytes = 0,
    apiRequests = 0,
    rawRequests = 0,
    sourceHits = 0;
  async function api(path: string, limit = 1024 * 1024) {
    apiRequests++;
    const bytes = await boundedBytes(
      `https://api.github.com/repos/${path}`,
      limit,
    );
    fetchedBytes += bytes.length;
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }
  progress("Resolving the public repository and exact revision…");
  const info = await api(requested);
  if (info.private || !/^[\w.-]+\/[\w.-]+$/.test(info.full_name))
    throw new Error("Only public GitHub repositories are supported.");
  const name: string = info.full_name;
  const commit = await api(
    `${name}/commits/${encodeURIComponent(info.default_branch)}`,
  );
  const revision: string = commit.sha;
  if (
    !/^[a-f0-9]{40}$/.test(revision) ||
    !/^[a-f0-9]{40}$/.test(commit.commit?.tree?.sha)
  )
    throw new Error("GitHub did not return an immutable revision.");
  const inventoryKey = await key("inventory-v2", [
    name,
    revision,
    "source-before-tests",
    LIMITS,
  ]);
  const saved = await read<Repository>(inventoryKey);
  if (saved)
    return {
      ...saved,
      fetchedBytes,
      apiRequests,
      rawRequests: 0,
      sourceHits: saved.files.length,
      acquisitionMs: performance.now() - started,
    };
  const tree = await api(
    `${name}/git/trees/${commit.commit.tree.sha}?recursive=1`,
    LIMITS.treeBytes,
  );
  if (!Array.isArray(tree.tree))
    throw new Error("GitHub returned an invalid source tree.");
  const omissions: Repository["excluded"] = [],
    selected: { path: string; sha: string; size: number }[] = [];
  let declaredBytes = 0;
  // A bounded inventory must not fill with alphabetically early test suites
  // before reaching the implementation a visitor is asking about.
  const secondary = (path: string) =>
    /(^|\/)(__tests__|tests?|fixtures?|benchmarks?|examples?)(\/|$)|\.(test|spec)\./i.test(
      path,
    )
      ? 1
      : 0;
  for (const item of tree.tree.sort(
    (a: { path: string }, b: { path: string }) =>
      secondary(a.path) - secondary(b.path) ||
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
  )) {
    if (item.type === "tree") continue;
    const reason = excluded(item.path, item.mode, item.size);
    if (reason) {
      omissions.push({ path: item.path, reason });
      continue;
    }
    if (
      selected.length >= LIMITS.files ||
      declaredBytes + item.size > LIMITS.sourceBytes
    ) {
      omissions.push({ path: item.path, reason: "repository source limit" });
      continue;
    }
    declaredBytes += item.size;
    selected.push(item);
  }
  const files: Source[] = [];
  let next = 0,
    done = 0;
  progress("Reading source…", {
    phase: "Source",
    completed: 0,
    total: selected.length,
  });
  // Four raw CDN downloads at once. Source downloads do not consume one REST call per file.
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < selected.length) {
        const item = selected[next++];
        try {
          const sourceKey = await key("source-v1", [item.sha]);
          let file = await read<Omit<Source, "path">>(sourceKey);
          if (!file) {
            rawRequests++;
            const bytes = await boundedBytes(
              `https://raw.githubusercontent.com/${name}/${revision}/${item.path.split("/").map(encodeURIComponent).join("/")}`,
              Math.min(LIMITS.fileBytes, item.size + 1),
            );
            fetchedBytes += bytes.length;
            const header = new TextEncoder().encode(`blob ${bytes.length}\0`),
              gitBytes = new Uint8Array(header.length + bytes.length);
            gitBytes.set(header);
            gitBytes.set(bytes, header.length);
            if ((await digest(gitBytes, "SHA-1")) !== item.sha)
              throw new Error("Git blob identity mismatch.");
            const source = new TextDecoder("utf-8", { fatal: true }).decode(
              bytes,
            );
            if (source.includes("\0")) throw new Error("Binary source.");
            file = { source, digest: await digest(bytes), blob: item.sha };
            await write(sourceKey, file);
          } else sourceHits++;
          files.push({ path: item.path, ...file });
        } catch (error) {
          omissions.push({
            path: item.path,
            reason:
              error instanceof Error
                ? error.message
                : "Source acquisition failed",
          });
        }
        progress(`Checked ${++done} / ${selected.length} source files…`, {
          phase: "Source",
          completed: done,
          total: selected.length,
        });
      }
    }),
  );
  files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const repository: Repository = {
    name,
    revision,
    origin: `https://github.com/${name}`,
    files,
    excluded: omissions,
    truncated: tree.truncated === true,
    treeCount: tree.tree.filter((x: { type: string }) => x.type !== "tree")
      .length,
    fetchedBytes,
    apiRequests,
    rawRequests,
    sourceHits,
    acquisitionMs: performance.now() - started,
  };
  if (!tree.truncated && files.length === selected.length)
    await write(inventoryKey, repository);
  return repository;
}
