import { cacheLife, cacheTag } from "next/cache";
import { extractWithGrit } from "./extraction";
import { verifiedSource } from "./github";
import { SOURCES } from "../studio/fixture";
import type { publicFile } from "./source";

export async function extractedFile(
  extractor: string,
  file: ReturnType<typeof publicFile> | { fixture: string; digest: string },
) {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: 604800, expire: 2592000 });
  cacheTag("studio-grit", `grit:${extractor}`);
  // Compact locators avoid oversized remote-cache keys. A new commit has a new
  // namespace; batch membership never participates. Source is always verified.
  const path = "fixture" in file ? file.fixture : file.path;
  const source =
    "fixture" in file
      ? SOURCES.find(([name]) => name === path)?.[1]
      : (await verifiedSource(file)).source;
  if (source === undefined) throw new Error("Unknown authored fixture.");
  const result = await extractWithGrit(path, source);
  if (Buffer.byteLength(JSON.stringify(result)) > 2 * 1024 * 1024)
    throw new Error("Grit observations exceed the transport limit.");
  return { ...result, extractor };
}
