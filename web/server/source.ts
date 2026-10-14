import { limitedBytes } from "./http";
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
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      `GitHub returned ${response.status}${response.status === 403 || response.status === 429 ? " (rate limit or access restriction)" : ""}.`,
    );
  return limitedBytes(response, limit);
}

export function publicFile(value: any) {
  if (
    !value ||
    typeof value.repository !== "string" ||
    typeof value.path !== "string" ||
    typeof value.revision !== "string" ||
    !/^[a-f0-9]{40}$/.test(value.revision)
  )
    throw new Error("Expected an immutable public file identity.");
  const repository = repositoryName(`https://github.com/${value.repository}`);
  if (repository !== value.repository || excluded(value.path, "100644", 0))
    throw new Error("Unsupported public source path.");
  return {
    repository,
    revision: value.revision as string,
    path: value.path as string,
  };
}
